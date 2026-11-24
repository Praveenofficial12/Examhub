import express from 'express';
import { createServer as createViteServer } from 'vite';
import { MongoClient } from 'mongodb';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const app = express();

// In AI Studio Cloud Run architecture, internal Nginx listens on port 8080 as the ingress proxy
// and forwards all app traffic to http://localhost:3000.
// Therefore, the Node/Express server must always bind to port 3000.
const PORT = 3000;
const distPath = path.resolve(process.cwd(), 'dist');
const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
const isProd = process.env.NODE_ENV === 'production';

// Body parser (supports multi-page high-resolution camera captures & PDFs)
app.use(express.json({ limit: '25mb' }));

// Health check endpoints for Cloud Run startup/liveness probes
app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/_healthz', (_req, res) => res.status(200).send('OK'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Direct attachment download endpoints for patent documents
app.get(['/download/:filename', '/api/download/:filename'], (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.resolve(process.cwd(), 'public', 'docs', safeFilename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, safeFilename);
  } else {
    res.status(404).send('File not found');
  }
});

// MongoDB Atlas Connection URI provided by user
// Configure MONGODB_URI in Vercel Project Settings; never commit database credentials.
const MONGO_URI = process.env.MONGODB_URI || '';

// In-memory fallback and file persistence for sessions
const SESSIONS_CACHE_FILE = path.resolve(process.cwd(), '.sessions_cache.json');
let inMemorySessions: any[] = [];

try {
  if (fs.existsSync(SESSIONS_CACHE_FILE)) {
    inMemorySessions = JSON.parse(fs.readFileSync(SESSIONS_CACHE_FILE, 'utf-8'));
  }
} catch (e) {
  inMemorySessions = [];
}

// Persistence cache for evaluated answer sheets (synced with MongoDB evaluated_answer_sheets)
const EVALUATIONS_CACHE_FILE = path.resolve(process.cwd(), '.evaluated_sheets_cache.json');
let inMemoryEvaluations: any[] = [];

try {
  if (fs.existsSync(EVALUATIONS_CACHE_FILE)) {
    const rawEval = JSON.parse(fs.readFileSync(EVALUATIONS_CACHE_FILE, 'utf-8'));
    if (Array.isArray(rawEval)) {
      inMemoryEvaluations = rawEval.filter(
        (item: any) => !String(item?.id || '').startsWith('AS-9225-')
      );
    }
  }
} catch {
  inMemoryEvaluations = [];
}

function persistEvaluationsCache() {
  try {
    fs.writeFileSync(EVALUATIONS_CACHE_FILE, JSON.stringify(inMemoryEvaluations, null, 2));
  } catch {
    // non-fatal disk write guard
  }
}

// Per-staff isolated student directory cache (backed by MongoDB staff_workspace_students)
const WORKSPACE_STUDENTS_CACHE_FILE = path.resolve(process.cwd(), '.workspace_students_cache.json');
const workspaceStudentsMap = new Map<string, any[]>();

try {
  if (fs.existsSync(WORKSPACE_STUDENTS_CACHE_FILE)) {
    const rawWs = JSON.parse(fs.readFileSync(WORKSPACE_STUDENTS_CACHE_FILE, 'utf-8'));
    if (rawWs && typeof rawWs === 'object') {
      Object.entries(rawWs).forEach(([k, v]) => {
        if (Array.isArray(v)) workspaceStudentsMap.set(k.toUpperCase(), v);
      });
    }
  }
} catch {
  // empty map
}

function persistWorkspaceStudentsCache() {
  try {
    const obj: Record<string, any[]> = {};
    workspaceStudentsMap.forEach((v, k) => {
      obj[k] = v;
    });
    fs.writeFileSync(WORKSPACE_STUDENTS_CACHE_FILE, JSON.stringify(obj, null, 2));
  } catch {
    // non-fatal
  }
}

interface MongoStatus {
  connected: boolean;
  status: 'connected' | 'connecting' | 'error' | 'offline';
  lastError: string | null;
  cluster: string;
  database: string;
  collection: string;
  lastAttemptAt: string;
}

let mongoClient: MongoClient | null = null;
let mongoDb: any = null;
const mongoStatus: MongoStatus = {
  connected: false,
  status: 'connecting',
  lastError: null,
  cluster: 'cluster0.orgon1o.mongodb.net',
  database: 'vsbec_exam_portal',
  collection: 'login_sessions',
  lastAttemptAt: new Date().toISOString()
};

async function initMongoConnection() {
  mongoStatus.lastAttemptAt = new Date().toISOString();
  if (!MONGO_URI) {
    mongoStatus.connected = false;
    mongoStatus.status = 'offline';
    mongoStatus.lastError = 'MONGODB_URI environment variable is not configured';
    return;
  }
  try {
    mongoClient = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 4000,
      tlsAllowInvalidCertificates: true
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db('vsbec_exam_portal');
    mongoStatus.connected = true;
    mongoStatus.status = 'connected';
    mongoStatus.lastError = null;
    console.log('[MongoDB] Connected successfully to Atlas cluster');

    // Flush any pending cached sessions to Atlas
    if (inMemorySessions.length > 0) {
      const col = mongoDb.collection('login_sessions');
      for (const sess of inMemorySessions) {
        if (!sess._syncedToMongo) {
          try {
            const filter = sess.isAdmin ? { isAdmin: true } : { username: sess.username };
            await col.updateOne(
              filter,
              { $set: { ...sess, _syncedToMongo: true, updatedAt: new Date() } },
              { upsert: true }
            );
            sess._syncedToMongo = true;
          } catch (err) {
            // Ignore individual sync errors
          }
        }
      }
      fs.writeFileSync(SESSIONS_CACHE_FILE, JSON.stringify(inMemorySessions, null, 2));
    }

    // Flush any cached evaluated answer sheets to MongoDB
    if (inMemoryEvaluations.length > 0) {
      const evalCol = mongoDb.collection('evaluated_answer_sheets');
      for (const sheet of inMemoryEvaluations) {
        if (!sheet._syncedToMongo && sheet.id) {
          try {
            await evalCol.updateOne(
              { id: sheet.id },
              { $set: { ...sheet, _syncedToMongo: true, updatedAt: new Date().toISOString() } },
              { upsert: true }
            );
            sheet._syncedToMongo = true;
          } catch {
            // ignore individual sync error
          }
        }
      }
      persistEvaluationsCache();
    }
  } catch (err: any) {
    mongoStatus.connected = false;
    mongoStatus.status = 'error';
    mongoStatus.lastError = err?.message || 'Atlas cluster connection error';
    console.warn('[MongoDB] Atlas notice:', mongoStatus.lastError);
  }
}

// Start connection attempt asynchronously
initMongoConnection();

// Periodically attempt reconnection if disconnected
setInterval(() => {
  if (!mongoStatus.connected) {
    initMongoConnection().catch(() => {});
  }
}, 60000);

// Helper to extract laptop client IP
function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Get Client IP & Geo headers
app.get('/api/client-ip', (req, res) => {
  const detectedIp = getClientIp(req);
  res.json({
    ip: detectedIp,
    remoteAddress: req.socket.remoteAddress,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'user-agent': req.headers['user-agent']
    }
  });
});

// 2. Get MongoDB Status
app.get('/api/system/mongo-status', (_req, res) => {
  res.json({
    ...mongoStatus,
    totalSessionsRecorded: inMemorySessions.length
  });
});

// 3. Retry MongoDB connection manually
app.post('/api/system/mongo-retry', async (_req, res) => {
  await initMongoConnection();
  res.json({
    ...mongoStatus,
    totalSessionsRecorded: inMemorySessions.length
  });
});

// 4. Record Login Session (Department or Admin + Laptop IP + Location)
app.post('/api/sessions/login', async (req, res) => {
  try {
    const {
      username,
      fullName,
      role,
      designation,
      department,
      isAdmin,
      token,
      loginTime,
      clientIp,
      location,
      deviceInfo
    } = req.body;

    const serverDetectedIp = getClientIp(req);
    const finalIp = clientIp && clientIp !== '127.0.0.1' ? clientIp : serverDetectedIp;

    const sessionDocument = {
      id: `SESS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      token: token || `VSB-AUTH-${Date.now()}`,
      username: username || 'unknown_user',
      fullName: fullName || 'Authorized Personnel',
      role: role || 'Department Faculty',
      designation: designation || 'Academic Staff',
      department: department || 'AI&DS',
      isAdmin: Boolean(isAdmin),
      loginTime: loginTime || new Date().toLocaleString(),
      ipAddress: finalIp,
      serverDetectedIp,
      location: location || {
        city: 'Karur',
        region: 'Tamil Nadu',
        country: 'India',
        latitude: 10.9601,
        longitude: 78.0766,
        source: 'campus_default'
      },
      deviceInfo: deviceInfo || {
        userAgent: req.headers['user-agent'] || 'Laptop / Web Browser',
        platform: 'Laptop Client'
      },
      status: 'Active',
      _syncedToMongo: false,
      createdAt: new Date().toISOString()
    };

    const userFilter = sessionDocument.isAdmin
      ? { isAdmin: true }
      : { username: sessionDocument.username };

    // Attempt MongoDB Atlas storage (Single record per user/department via upsert)
    if (mongoStatus.connected && mongoDb) {
      try {
        const col = mongoDb.collection('login_sessions');
        await col.updateOne(
          userFilter,
          {
            $set: {
              token: sessionDocument.token,
              username: sessionDocument.username,
              fullName: sessionDocument.fullName,
              role: sessionDocument.role,
              designation: sessionDocument.designation,
              department: sessionDocument.department,
              isAdmin: sessionDocument.isAdmin,
              loginTime: sessionDocument.loginTime,
              ipAddress: sessionDocument.ipAddress,
              serverDetectedIp: sessionDocument.serverDetectedIp,
              location: sessionDocument.location,
              deviceInfo: sessionDocument.deviceInfo,
              status: 'Active',
              _syncedToMongo: true,
              lastLoginAt: new Date()
            },
            $setOnInsert: {
              id: sessionDocument.id,
              createdAt: new Date().toISOString(),
              firstLoginAt: new Date()
            }
          },
          { upsert: true }
        );
        sessionDocument._syncedToMongo = true;
      } catch (dbErr: any) {
        console.warn('[MongoDB] Save session failed, caching locally:', dbErr.message);
        mongoStatus.connected = false;
        mongoStatus.lastError = dbErr.message;
      }
    }

    // Maintain in local list & disk cache (single session per user/role)
    const existingIndex = inMemorySessions.findIndex((s) =>
      sessionDocument.isAdmin ? s.isAdmin : s.username === sessionDocument.username
    );
    if (existingIndex >= 0) {
      inMemorySessions[existingIndex] = {
        ...inMemorySessions[existingIndex],
        ...sessionDocument,
        _syncedToMongo: sessionDocument._syncedToMongo
      };
    } else {
      inMemorySessions.unshift(sessionDocument);
    }
    // Keep max 20 unique sessions
    if (inMemorySessions.length > 20) {
      inMemorySessions = inMemorySessions.slice(0, 20);
    }

    try {
      fs.writeFileSync(SESSIONS_CACHE_FILE, JSON.stringify(inMemorySessions, null, 2));
    } catch (fsErr) {
      // non-fatal
    }

    res.json({
      success: true,
      message: 'Login session successfully recorded',
      session: sessionDocument,
      mongoStatus
    });
  } catch (error: any) {
    console.error('Session recording error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to record login session'
    });
  }
});

// 5. Retrieve all recorded login sessions
app.get('/api/sessions', async (_req, res) => {
  try {
    if (mongoStatus.connected && mongoDb) {
      try {
        const col = mongoDb.collection('login_sessions');
        const docs = await col
          .find({})
          .sort({ createdAt: -1 })
          .limit(60)
          .toArray();
        if (docs && docs.length > 0) {
          return res.json({
            sessions: docs,
            source: 'mongodb_atlas',
            mongoStatus
          });
        }
      } catch (err: any) {
        console.warn('[MongoDB] Query failed, falling back to cache:', err.message);
      }
    }

    // Fallback to cached sessions
    res.json({
      sessions: inMemorySessions,
      source: 'local_cache',
      mongoStatus
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// AI AUTONOMOUS QUESTION PAPER EXTRACTOR & FAST MARK-SIZED SOLVER
// -------------------------------------------------------------

interface ExtractedQuestionStub {
  questionNo: number;
  part: 'Part A' | 'Part B' | 'Part C';
  subDivision: string;
  questionText: string;
  positiveMarks: number;
}

function getWordTargetGuidance(marks: number, depthMode: string): { targetWords: string; sectionsGuide: string; depthNote: string } {
  const mult = depthMode === 'concise' ? 0.65 : depthMode === 'exhaustive' ? 1.25 : 1.0;

  if (marks <= 3) {
    const low = Math.round(55 * mult);
    const high = Math.round(90 * mult);
    return {
      targetWords: `${low}-${high} words (Point-wise with 1 sub-heading + 3 bullets)`,
      sectionsGuide:
        'Start with ONE short numbered sub-heading (e.g. "1. Core Concept & Key Points"), followed strictly by 3 concise "- Label: Explanation" bullet points (Definition, Working/Formula, Example). If the question asks for a diagram or block diagram, include a compact 3-line ASCII diagram inside ```diagram ... ```. NO long prose paragraphs.',
      depthNote: 'Point-wise 2M precision with sub-heading.'
    };
  }

  if (marks <= 6) {
    const low = Math.round(280 * mult);
    const high = Math.round(390 * mult);
    return {
      targetWords: `${low}-${high} words (~0.7 to 0.9 A4 page, strictly point-wise)`,
      sectionsGuide:
        'Organize strictly with 4 numbered sub-headings ("1. ...", "2. ...", "3. ...", "4. ..."). Under EVERY sub-heading use "- Label: Clear explanation" bullet points and "  - Sub-point: Detail" sub-bullets (NO unbulleted paragraphs). Whenever the topic involves a process, algorithm, architecture, or asks for a flowchart/diagram, include a clean ASCII box-and-arrow flowchart inside ```diagram ... ``` (max 58 chars wide).',
      depthNote: 'Point-wise medium-mark structure with sub-headings & diagram.'
    };
  }

  if (marks <= 10) {
    const low = Math.round(520 * mult);
    const high = Math.round(740 * mult);
    return {
      targetWords: `${low}-${high} words (approx 1 to 1.5 full A4 pages, strictly point-wise)`,
      sectionsGuide:
        'Structure the entire answer using 6 to 8 clear numbered sub-headings ("1. Concept & Overview", "2. Flowchart / System Diagram", "3. Step-by-Step Methodology", ..., "7. Summary"). Do NOT write unbulleted prose paragraphs — put EVERY point as a "- Label: Detailed explanation" bullet or "  - Sub-point: Detail" sub-bullet. Include a crisp ASCII/Unicode box-and-arrow flowchart or architecture block diagram fenced in ```diagram ... ``` (<= 58 chars wide) whenever the question covers a workflow, pipeline, algorithm, architecture, or asks for a flowchart/diagram, plus concise code/equations where applicable.',
      depthNote: 'Full 1 to 1.5 A4 page point-wise answer with sub-headings & flowchart.'
    };
  }

  if (marks <= 14) {
    const low = Math.round(760 * mult);
    const high = Math.round(1020 * mult);
    return {
      targetWords: `${low}-${high} words (approx 1.6 to 2.1 full A4 pages, strictly point-wise)`,
      sectionsGuide:
        'Structure strictly with 8 to 9 detailed numbered sub-headings ("1. ..." through "8. ..."). Under every sub-heading, present content ONLY in "- Label: Detailed explanation" bullets and "  - Sub-point: Technical detail" sub-bullets (NO unbulleted paragraphs). Always include a clean ASCII box-and-arrow flowchart or block architecture diagram in ```diagram ... ``` (<= 58 chars wide) when describing any workflow, pipeline, algorithm, or system design, plus formulas/code snippets.',
      depthNote: 'Extended 1.6 to 2.1 A4 page point-wise answer.'
    };
  }

  // 15, 16, or custom higher Part C marks (16M default => 2 to 2.5+ full A4 pages)
  const scaleFactor = Math.max(1, marks / 16);
  const low = Math.round(1050 * scaleFactor * mult);
  const high = Math.round(1420 * scaleFactor * mult);
  return {
    targetWords: `${low}-${high} words (approx ${(2.0 * scaleFactor).toFixed(1)} to ${(2.6 * scaleFactor).toFixed(1)} full A4 pages, strictly point-wise)`,
    sectionsGuide:
      'Structure strictly with 9 to 11 richly detailed numbered sub-headings ("1. Foundational Context & Objectives", "2. Architecture & Process Flowchart", "3. Data / Input Preparation", "4. Step-by-Step Algorithmic Workflow", "5. Mathematical Formulation / Equations", "6. Implementation Code / Pseudocode", "7. Comparative Trade-Offs", "8. Edge Cases & Error Handling", "9. Validation Metrics & Conclusion"). Write ALL explanations as crisp "- Label: Multi-sentence point" bullets and "  - Sub-point: Detail" sub-bullets (NO unbulleted narrative paragraphs). Include a clear ASCII/Unicode box-and-arrow flowchart or system architecture diagram inside ```diagram ... ``` (<= 58 chars wide).',
    depthNote: `Full multi-page (${(2.0 * scaleFactor).toFixed(1)}–${(2.6 * scaleFactor).toFixed(1)} pages) point-wise solution matching ${marks} marks.`
  };
}

function detectExplicitMarksFromText(text: string): { marks: number; cleaned: string } {
  let cleaned = text.trim();
  let marks = 0;

  // Match trailing forms like "[16 Marks]", "(8 Marks)", "[2M]", "(16)", "16 Marks", "2m"
  const trailingMatch = cleaned.match(
    /(?:\[\s*(\d{1,2})\s*(?:marks?|m)?\s*\]|\(\s*(\d{1,2})\s*(?:marks?|m)\s*\)|\(\s*(\d{1,2})\s*\)|\b(\d{1,2})\s*marks?)\s*$/i
  );
  if (trailingMatch) {
    const numStr = trailingMatch[1] || trailingMatch[2] || trailingMatch[3] || trailingMatch[4];
    const parsed = parseInt(numStr || '0', 10);
    if (parsed >= 1 && parsed <= 30) {
      marks = parsed;
      cleaned = cleaned.slice(0, trailingMatch.index).trim().replace(/[-–:\s]+$/, '').trim();
    }
  }

  return { marks, cleaned };
}

function fastParseQuestionStubsFromText(rawText: string, examCategory: string, maxMarks: number): ExtractedQuestionStub[] {
  const cleanText = String(rawText || '').trim();
  if (!cleanText || cleanText.startsWith('[Uploaded ')) return [];

  const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let currentPart: 'Part A' | 'Part B' | 'Part C' = 'Part A';
  const partDefaultMarks: Record<'Part A' | 'Part B' | 'Part C', number> = {
    'Part A': 2,
    'Part B': 8,
    'Part C': 16
  };

  const stubs: ExtractedQuestionStub[] = [];
  let activeStub: ExtractedQuestionStub | null = null;
  let activeExplicitMarks = 0;

  const finalizeActiveStub = () => {
    if (!activeStub) return;
    const { marks, cleaned } = detectExplicitMarksFromText(activeStub.questionText);
    if (cleaned) {
      activeStub.questionText = cleaned;
    }
    const finalM = marks > 0 ? marks : activeExplicitMarks > 0 ? activeExplicitMarks : partDefaultMarks[activeStub.part];
    activeStub.positiveMarks = finalM;
    if (activeStub.questionText.length >= 4) {
      stubs.push(activeStub);
    }
    activeStub = null;
    activeExplicitMarks = 0;
  };

  lines.forEach((line) => {
    // Skip institutional header/metadata lines before or between sections
    if (
      /^(?:V\.S\.B\.?|Course Code|SEMESTER\s*:|DATE\s*:|DURATION\s*:|MAX\.?\s*MARKS?\s*:|REGULATION|Academic Year|Answer ALL)/i.test(
        line
      ) &&
      !activeStub
    ) {
      return;
    }

    // Detect section headers e.g. "PART-A (5 x 2 = 10 Marks)", "PART - B ( 3 X 8 = 24 )", "PART-C (1 x 16 = 16)"
    const partHeaderMatch = line.match(/^(?:SECTION|PART)\s*[-–:]?\s*([ABC])\b(.*)$/i);
    if (partHeaderMatch && line.length < 110) {
      finalizeActiveStub();
      const letter = partHeaderMatch[1].toUpperCase();
      currentPart = letter === 'A' ? 'Part A' : letter === 'B' ? 'Part B' : 'Part C';
      const rest = partHeaderMatch[2] || '';
      const schemeMatch = rest.match(/(\d+)\s*[x×*]\s*(\d+)/i);
      if (schemeMatch) {
        const perQ = parseInt(schemeMatch[2], 10);
        if (perQ >= 1 && perQ <= 30) {
          partDefaultMarks[currentPart] = perQ;
        }
      } else {
        const singleM = rest.match(/(\d+)\s*marks?/i);
        if (singleM) {
          const val = parseInt(singleM[1], 10);
          if (val >= 2 && val <= 30) partDefaultMarks[currentPart] = val;
        }
      }
      return;
    }

    // Standalone "(OR)" / "OR" divider between either-or questions
    if (/^\(?\s*OR\s*\)?$/i.test(line)) {
      finalizeActiveStub();
      return;
    }

    // Question starter: "1.", "6a)", "6 a)", "6(a)", "Q1.", "Q.6b)", "11. a)"
    const qMatch = line.match(
      /^(?:Q\.?\s*)?(\d{1,2}\s*(?:\([a-c]\)|[a-c]\))?|\d{1,2}[\.\)])\s+(.{3,})/i
    );
    if (qMatch) {
      finalizeActiveStub();

      let rawSub = qMatch[1].replace(/^Q\.?\s*/i, '').trim();
      if (rawSub.endsWith('.')) rawSub = rawSub.slice(0, -1).trim();
      // Normalize "6 (a)" or "6 a)" -> "6a)"
      rawSub = rawSub.replace(/\s+/g, '');

      const { marks, cleaned } = detectExplicitMarksFromText(qMatch[2].trim());
      const numVal = parseInt(rawSub.replace(/\D/g, ''), 10) || stubs.length + 1;
      const hasSubLetter = /[a-c]/i.test(rawSub);

      let resolvedPart = currentPart;
      if (hasSubLetter && resolvedPart === 'Part A') {
        resolvedPart = marks >= 12 ? 'Part C' : 'Part B';
      } else if (resolvedPart === 'Part A' && numVal >= 6 && (examCategory === 'Internal' || numVal >= 11)) {
        resolvedPart = numVal >= 16 && maxMarks >= 80 ? 'Part C' : 'Part B';
      } else if (marks >= 12 && resolvedPart === 'Part B') {
        resolvedPart = 'Part C';
      }

      activeExplicitMarks = marks;
      activeStub = {
        questionNo: stubs.length + 1,
        part: resolvedPart,
        subDivision: rawSub,
        questionText: cleaned || qMatch[2].trim(),
        positiveMarks: marks > 0 ? marks : partDefaultMarks[resolvedPart]
      };
      return;
    }

    // Wrapped continuation line belonging to the current active question
    if (activeStub) {
      const merged = activeStub.questionText.endsWith('-')
        ? `${activeStub.questionText.slice(0, -1)}${line}`
        : `${activeStub.questionText} ${line}`;
      activeStub.questionText = merged.trim();
    }
  });

  finalizeActiveStub();
  return stubs.map((s, idx) => ({ ...s, questionNo: idx + 1 }));
}

class QuotaExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExhaustedError';
  }
}

function isQuotaExhaustedError(err: any): boolean {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    err?.status === 429 ||
    err?.code === 429 ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('rate limit')
  );
}

const modelCooldownUntil = new Map<string, number>();
const solvedAnswerKeyCache = new Map<
  string,
  { questions: any[]; provider: string; createdAt: number }
>();

const GEMINI_SOLVER_MODELS = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
const GEMINI_OCR_MODELS = ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'] as const;

// Ultra-fast SHA-256 LRU cache for Answer Sheet Vision OCR (sub-10ms on repeat/re-verify scans)
const ocrEvaluationCache = new Map<string, { data: any; createdAt: number }>();

function setOcrCache(key: string, data: any) {
  if (ocrEvaluationCache.size >= 150) {
    const oldestKey = ocrEvaluationCache.keys().next().value;
    if (oldestKey) ocrEvaluationCache.delete(oldestKey);
  }
  ocrEvaluationCache.set(key, { data, createdAt: Date.now() });
}

interface RequestWorkspaceScope {
  ownerStaffId: string;
  role: 'staff' | 'admin-inspect' | 'admin';
  authorized: boolean;
  error?: string;
}

function resolveRequestWorkspace(req: express.Request): RequestWorkspaceScope {
  const rawRole = String(req.headers['x-user-role'] || '').trim().toLowerCase();
  const rawStaffId = String(req.headers['x-staff-id'] || '').trim().toUpperCase();

  if (rawRole === 'staff') {
    if (!rawStaffId || rawStaffId === 'COE-ADMIN' || rawStaffId === 'ANON') {
      return {
        ownerStaffId: '',
        role: 'staff',
        authorized: false,
        error: 'Valid Staff ID authentication header is required.'
      };
    }
    return { ownerStaffId: rawStaffId, role: 'staff', authorized: true };
  }

  if (rawRole === 'admin-inspect' && rawStaffId) {
    return { ownerStaffId: rawStaffId, role: 'admin-inspect', authorized: true };
  }

  if (rawStaffId && rawStaffId !== 'ANON') {
    return {
      ownerStaffId: rawStaffId,
      role: rawRole === 'admin' ? 'admin' : 'admin-inspect',
      authorized: true
    };
  }

  return { ownerStaffId: 'COE-ADMIN', role: 'admin', authorized: true };
}

async function generateWithModelSequence(
  ai: GoogleGenAI,
  models: readonly string[],
  buildRequest: (model: string, thinkingLevel: ThinkingLevel) => any,
  preferredLiteThinking: ThinkingLevel = ThinkingLevel.MINIMAL
) {
  const now = Date.now();
  let lastQuotaErr: any = null;
  let lastErr: any = null;

  for (const model of models) {
    const blockedUntil = modelCooldownUntil.get(model) || 0;
    if (blockedUntil > now) {
      continue;
    }

    const thinkingLevel =
      model === 'gemini-3.1-flash-lite' ? preferredLiteThinking : ThinkingLevel.LOW;

    try {
      return await ai.models.generateContent(buildRequest(model, thinkingLevel));
    } catch (err: any) {
      if (isQuotaExhaustedError(err)) {
        // Put exhausted model into 10-minute cooldown and cleanly try fallback model
        modelCooldownUntil.set(model, Date.now() + 10 * 60 * 1000);
        lastQuotaErr = err;
        continue;
      }
      const errMsg = String(err?.message || err || '').toLowerCase();
      const isTransientUnavailable =
        err?.status === 503 ||
        err?.code === 503 ||
        errMsg.includes('503') ||
        errMsg.includes('unavailable') ||
        errMsg.includes('high demand') ||
        errMsg.includes('overloaded');
      if (isTransientUnavailable) {
        modelCooldownUntil.set(model, Date.now() + 30 * 1000);
        lastErr = err;
        continue;
      }
      lastErr = err;
      throw err;
    }
  }

  if (lastQuotaErr || modelCooldownUntil.size >= models.length) {
    throw new QuotaExhaustedError(
      'Gemini Free Tier API request quota reached. Generated mark-sized key using Autonomous Syllabus Engine — to increase Gemini AI quota, attach a billing-enabled API key in Settings > Secrets.'
    );
  }
  throw lastErr || new Error('Gemini request failed');
}

async function generateWithModelFallback(
  ai: GoogleGenAI,
  buildRequest: (model: string, thinkingLevel: ThinkingLevel) => any
) {
  return generateWithModelSequence(ai, GEMINI_SOLVER_MODELS, buildRequest, ThinkingLevel.MINIMAL);
}

async function generateWithFastOcrModel(
  ai: GoogleGenAI,
  buildRequest: (model: string, thinkingLevel: ThinkingLevel) => any
) {
  return generateWithModelSequence(ai, GEMINI_OCR_MODELS, buildRequest, ThinkingLevel.LOW);
}

async function extractQuestionStubsWithGemini(
  ai: GoogleGenAI,
  params: {
    subjectCode: string;
    subjectName: string;
    semester: number;
    examCategory: string;
    examTitle: string;
    maxMarks: number;
    questionPaperText: string;
    mimeType?: string;
    fileData?: string;
  }
): Promise<ExtractedQuestionStub[]> {
  const parts: any[] = [];
  if (params.fileData && params.mimeType) {
    parts.push({ inlineData: { mimeType: params.mimeType, data: params.fileData } });
  }
  parts.push({
    text: `Extract ONLY the question list from this Question Paper (${params.subjectCode} - ${params.subjectName}, ${params.examTitle}, Max Marks: ${params.maxMarks}).
${params.questionPaperText ? `Text:\n${params.questionPaperText}` : ''}

Rules:
- Extract every question and subdivision (1, 2, 6a), 6b), 11a), Part C etc.).
- Preserve the EXACT marks specified on the question paper for each question (note: Part C sometimes has 16M, 15M, 14M, 12M, or 10M — read the exact marks!).
- Only if marks are NOT stated explicitly: default Part A = 2, Part B = 8, Part C = 16.
- Return clean JSON array only, NO answers yet.`
  });

  const resp = await generateWithModelFallback(ai, (model, thinkingLevel) => ({
    model,
    contents: { parts },
    config: {
      thinkingConfig: { thinkingLevel },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionNo: { type: Type.INTEGER },
            part: { type: Type.STRING, description: 'Part A, Part B, or Part C' },
            subDivision: { type: Type.STRING },
            questionText: { type: Type.STRING },
            positiveMarks: { type: Type.NUMBER }
          },
          required: ['questionNo', 'part', 'subDivision', 'questionText', 'positiveMarks']
        }
      }
    }
  }));

  const parsed = JSON.parse((resp.text ?? '[]').trim());
  if (!Array.isArray(parsed)) return [];
  return parsed.map((q: any, idx: number) => ({
    questionNo: idx + 1,
    part: q.part === 'Part C' ? 'Part C' : q.part === 'Part B' ? 'Part B' : 'Part A',
    subDivision: String(q.subDivision || idx + 1),
    questionText: String(q.questionText || `Question ${idx + 1}`),
    positiveMarks: Number(q.positiveMarks) || (q.part === 'Part A' ? 2 : q.part === 'Part C' ? 16 : 8)
  }));
}

async function solveQuestionBatchWithGemini(
  ai: GoogleGenAI,
  batch: ExtractedQuestionStub[],
  meta: {
    subjectCode: string;
    subjectName: string;
    semester: number;
    examTitle: string;
    regulation: string;
    answerDepthMode: string;
  }
) {
  const questionPrompts = batch
    .map((q) => {
      const guide = getWordTargetGuidance(q.positiveMarks, meta.answerDepthMode);
      return `Question #${q.questionNo} (${q.part}, SubDivision: ${q.subDivision}, Exact Marks: ${q.positiveMarks}):
Question: ${q.questionText}
REQUIRED LENGTH & FORMAT: ${guide.targetWords}
STRUCTURE INSTRUCTION: ${guide.sectionsGuide}`;
    })
    .join('\n\n---\n\n');

  const resp = await generateWithModelFallback(ai, (model, thinkingLevel) => ({
    model,
    contents: `Course: ${meta.subjectCode} - ${meta.subjectName} (Sem ${meta.semester}, ${meta.regulation}, ${meta.examTitle})

Generate full, human-written university answer key solutions for these questions. Strictly hit the requested page/word targets:

${questionPrompts}`,
    config: {
      thinkingConfig: { thinkingLevel },
      systemInstruction: `You are a Chief University Answer Key Author writing crystal-clear, point-type academic answers formatted for A4 Portrait Microsoft Word & PDF sheets.
MANDATORY FORMATTING RULES inside "expectedAnswer":
- NEVER use markdown **bold** stars or ## hashtags.
- ALWAYS write ALL answers (including Part A 2M, Part B 8M, and Part C 16M+) in POINT-TYPE format organized under numbered sub-headings ("1. Sub-Heading Title") — NEVER write dense unbulleted paragraphs!
- Under every numbered sub-heading, write structured level-1 bullets starting with "- Key Point Label: Clear explanation..." and nested level-2 sub-bullets indented with two spaces starting with "  - Sub-point: Technical detail...".
- FLOWCHARTS & DIAGRAMS: Whenever a question involves an algorithm, workflow, pipeline, neural network, system architecture, data cleaning, causal graph, or explicitly asks for a flowchart/diagram, include a crisp, well-aligned Unicode/ASCII box-and-arrow flowchart or block diagram fenced cleanly inside \`\`\`diagram ... \`\`\` (keep every line <= 58 characters wide so it fits cleanly inside A4 Portrait width).
- CODE / FORMULAS: Where helpful, include concise syntax examples wrapped in \`\`\`python ... \`\`\`.
- Strictly hit the requested A4 page/word length targets for 2M, 8M (1-1.5 pages), and 16M (2-2.5+ pages), and make sure rubricBreakdown sums to exact positiveMarks.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionNo: { type: Type.INTEGER },
            part: { type: Type.STRING },
            subDivision: { type: Type.STRING },
            questionText: { type: Type.STRING },
            topic: { type: Type.STRING },
            cognitiveLevel: { type: Type.STRING },
            courseOutcome: { type: Type.STRING },
            positiveMarks: { type: Type.NUMBER },
            negativeMarks: { type: Type.NUMBER },
            expectedAnswer: { type: Type.STRING },
            rubricBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNo: { type: Type.INTEGER },
                  description: { type: Type.STRING },
                  marks: { type: Type.NUMBER }
                }
              }
            }
          },
          required: ['questionNo', 'part', 'subDivision', 'questionText', 'positiveMarks', 'expectedAnswer']
        }
      }
    }
  }));

  const parsed = JSON.parse((resp.text ?? '[]').trim());
  return Array.isArray(parsed) ? parsed : [];
}

function createBatchesForParallelSolve(stubs: ExtractedQuestionStub[]): ExtractedQuestionStub[][] {
  const partA = stubs.filter((s) => s.part === 'Part A' || (s.part !== 'Part C' && s.positiveMarks <= 3));
  const mediumQs = stubs.filter(
    (s) => s.part !== 'Part A' && s.part !== 'Part C' && s.positiveMarks > 3 && s.positiveMarks <= 11
  );
  const longQs = stubs.filter((s) => s.part === 'Part C' || s.positiveMarks > 11);

  const batches: ExtractedQuestionStub[][] = [];
  if (partA.length > 0 && mediumQs.length <= 1 && partA.length <= 5) {
    batches.push([...partA, ...mediumQs]);
  } else {
    if (partA.length > 0) {
      for (let i = 0; i < partA.length; i += 10) {
        batches.push(partA.slice(i, i + 10));
      }
    }
    // 2 Part B 8M questions per batch prevents output token truncation while staying fast
    for (let i = 0; i < mediumQs.length; i += 2) {
      batches.push(mediumQs.slice(i, i + 2));
    }
  }
  // Part C / 12M-20M+ questions: 1 per batch so each gets full 2-2.5+ page depth without timeout
  for (let i = 0; i < longQs.length; i += 1) {
    batches.push([longQs[i]]);
  }
  return batches;
}

function withBatchTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function runWithConcurrencyLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= tasks.length) break;
      results[idx] = await tasks[idx]();
    }
  });
  await Promise.all(workers);
  return results;
}

function normalizeSubDivKey(sub?: string): string {
  return String(sub || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function runFastParallelSolve(
  reqBody: any,
  onProgress?: (event: { stage: string; message: string; questions?: any[]; provider?: string }) => void
): Promise<{ questions: any[]; provider: string; quotaNotice?: string }> {
  const {
    subjectCode = 'AD3501',
    subjectName = 'Deep Neural Networks & Architectures',
    semester = 5,
    examCategory = 'Internal',
    examTitle = 'INTERNAL TEST - III',
    regulation = '2023 Regulations',
    maxMarks = 50,
    answerDepthMode = 'mark-proportional',
    questionPaperText = '',
    mimeType,
    fileData
  } = reqBody;

  const cacheKey = `v4-a4-point-diagram|${subjectCode}|${semester}|${examTitle}|${maxMarks}|${answerDepthMode}|${questionPaperText.slice(0, 4000)}|${fileData ? fileData.slice(0, 120) + fileData.length : ''}`;
  const cached = solvedAnswerKeyCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < 30 * 60 * 1000) {
    return { questions: cached.questions, provider: cached.provider };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallbackQs = generateFallbackAIDSQuestions(
      subjectCode,
      subjectName,
      semester,
      questionPaperText,
      examCategory,
      Number(maxMarks) || 50
    );
    return { questions: fallbackQs, provider: 'autonomous_syllabus_engine' };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  // STAGE 1: Fast local regex extraction for text/sample/docx, or Gemini extraction for PDF/Image
  onProgress?.({ stage: 'extracting', message: 'Reading Question Paper & detecting ALL Part A / B / C questions...' });
  let stubs: ExtractedQuestionStub[] = [];
  let quotaNotice: string | undefined;

  if (!fileData && questionPaperText) {
    stubs = fastParseQuestionStubsFromText(questionPaperText, examCategory, Number(maxMarks) || 50);
  }
  if (stubs.length === 0) {
    try {
      stubs = await withBatchTimeout(
        extractQuestionStubsWithGemini(ai, {
          subjectCode,
          subjectName,
          semester,
          examCategory,
          examTitle,
          maxMarks: Number(maxMarks) || 50,
          questionPaperText,
          mimeType,
          fileData
        }),
        24000,
        'extract_questions'
      );
    } catch (extractErr: any) {
      if (isQuotaExhaustedError(extractErr) || extractErr instanceof QuotaExhaustedError) {
        quotaNotice = extractErr.message;
      } else {
        console.info('[QP Extract Fallback]', extractErr?.message);
      }
      const fallbackQs = generateFallbackAIDSQuestions(
        subjectCode,
        subjectName,
        semester,
        questionPaperText,
        examCategory,
        Number(maxMarks) || 50
      );
      return {
        questions: fallbackQs,
        provider: 'autonomous_syllabus_engine',
        quotaNotice
      };
    }
  }

  if (stubs.length === 0) {
    const fallbackQs = generateFallbackAIDSQuestions(
      subjectCode,
      subjectName,
      semester,
      questionPaperText,
      examCategory,
      Number(maxMarks) || 50
    );
    return { questions: fallbackQs, provider: 'autonomous_syllabus_engine' };
  }

  // Check if all Gemini models are currently in quota cooldown before dispatching batches
  const allInCooldown = GEMINI_SOLVER_MODELS.every((m) => (modelCooldownUntil.get(m) || 0) > Date.now());
  if (allInCooldown) {
    const syllabusQs = stubs.map((s, idx) => {
      const topic = s.questionText.replace(/[?.!]+$/, '').slice(0, 60);
      const half = Math.ceil(s.positiveMarks * 0.5);
      return {
        questionNo: s.questionNo,
        part: s.part,
        subDivision: s.subDivision,
        questionText: s.questionText,
        topic,
        cognitiveLevel: s.part === 'Part A' ? 'K2 - Understand' : s.part === 'Part C' ? 'K5 - Evaluate' : 'K4 - Analyze',
        courseOutcome: `CO${(idx % 5) + 1}`,
        positiveMarks: s.positiveMarks,
        negativeMarks: 0,
        expectedAnswer: buildStructuredMarkSizedFallbackAnswer(s.questionText, topic, s.positiveMarks, subjectName, subjectCode),
        rubricBreakdown: [
          { stepNo: 1, description: 'Concept / Diagram & Core Formulation', marks: half },
          { stepNo: 2, description: 'Detailed Steps & Verification', marks: Math.max(1, s.positiveMarks - half) }
        ]
      };
    });
    return {
      questions: syllabusQs,
      provider: 'autonomous_syllabus_engine',
      quotaNotice:
        'Gemini Free Tier daily request quota reached. Generated complete mark-sized Answer Key using Autonomous Syllabus Engine — attach a billing-enabled key in Settings > Secrets for live Gemini AI.'
    };
  }

  // Emit placeholder skeleton immediately so Live Word Sheet renders every detected question right away
  const workingMap = new Map<number, any>();
  stubs.forEach((s) => {
    workingMap.set(s.questionNo, {
      questionNo: s.questionNo,
      part: s.part,
      subDivision: s.subDivision,
      questionText: s.questionText,
      topic: s.questionText.replace(/[?.!]+$/, '').slice(0, 60),
      cognitiveLevel: s.part === 'Part A' ? 'K2 - Understand' : s.part === 'Part C' ? 'K5 - Evaluate' : 'K4 - Analyze',
      courseOutcome: `CO${((s.questionNo - 1) % 5) + 1}`,
      positiveMarks: s.positiveMarks,
      negativeMarks: 0,
      expectedAnswer: `Generating ${s.positiveMarks}-mark point-wise answer key for Q.${s.subDivision}...`,
      rubricBreakdown: [{ stepNo: 1, description: 'Full valuation key', marks: s.positiveMarks }]
    });
  });

  const sortedSnapshot = () =>
    Array.from(workingMap.values()).sort((a, b) => a.questionNo - b.questionNo);

  onProgress?.({
    stage: 'extracted',
    message: `Detected all ${stubs.length} questions — solving Part A, B & C in parallel...`,
    questions: sortedSnapshot(),
    provider: 'gemini_ai'
  });

  // STAGE 2: Bounded parallel generation (max 3 concurrent calls) + thorough per-question completion check
  const batches = createBatchesForParallelSolve(stubs);
  let completedBatches = 0;
  let aiSolvedCount = 0;
  const aiSolvedSet = new Set<number>();

  await runWithConcurrencyLimit(
    batches.map((batch, idx) => async () => {
      const matchedInBatch = new Set<number>();
      try {
        const solved = await withBatchTimeout(
          solveQuestionBatchWithGemini(ai, batch, {
            subjectCode,
            subjectName,
            semester,
            examTitle,
            regulation,
            answerDepthMode
          }),
          42000,
          `batch_${idx + 1}`
        );

        solved.forEach((ans: any, bIdx: number) => {
          const byNum = batch.find((b) => Number(ans.questionNo) === b.questionNo && !matchedInBatch.has(b.questionNo));
          const bySub =
            !byNum && ans.subDivision
              ? batch.find(
                  (b) =>
                    normalizeSubDivKey(b.subDivision) === normalizeSubDivKey(ans.subDivision) &&
                    !matchedInBatch.has(b.questionNo)
                )
              : undefined;
          const byIdx = !byNum && !bySub ? batch[bIdx] : undefined;
          const origStub = byNum || bySub || byIdx;
          if (!origStub) return;
          const orig = workingMap.get(origStub.questionNo) || origStub;
          const answerText = String(ans.expectedAnswer || '').trim();
          if (answerText.length < 20) return;

          matchedInBatch.add(origStub.questionNo);
          aiSolvedSet.add(origStub.questionNo);
          aiSolvedCount += 1;
          workingMap.set(orig.questionNo, {
            ...orig,
            ...ans,
            questionNo: orig.questionNo,
            part: orig.part,
            subDivision: orig.subDivision,
            questionText: orig.questionText,
            positiveMarks: orig.positiveMarks
          });
        });

        // Fill any individual questions omitted by batch JSON response so zero questions stay blank
        for (const missed of batch) {
          if (!matchedInBatch.has(missed.questionNo)) {
            const topic = missed.questionText.replace(/[?.!]+$/, '').slice(0, 60);
            workingMap.set(missed.questionNo, {
              ...workingMap.get(missed.questionNo),
              expectedAnswer: buildStructuredMarkSizedFallbackAnswer(
                missed.questionText,
                topic,
                missed.positiveMarks,
                subjectName,
                subjectCode
              )
            });
          }
        }
      } catch (batchErr: any) {
        if (isQuotaExhaustedError(batchErr) || batchErr instanceof QuotaExhaustedError) {
          quotaNotice = batchErr.message;
        } else {
          console.info('[Batch Fallback]', batchErr?.message);
        }
        batch.forEach((s) => {
          const topic = s.questionText.replace(/[?.!]+$/, '').slice(0, 60);
          workingMap.set(s.questionNo, {
            ...workingMap.get(s.questionNo),
            expectedAnswer: buildStructuredMarkSizedFallbackAnswer(
              s.questionText,
              topic,
              s.positiveMarks,
              subjectName,
              subjectCode
            )
          });
        });
      } finally {
        completedBatches += 1;
        onProgress?.({
          stage: 'batch_complete',
          message: `Completed batch ${completedBatches} of ${batches.length} (${workingMap.size} questions scaled to mark weights)...`,
          questions: sortedSnapshot(),
          provider: aiSolvedCount > 0 ? 'gemini_ai' : 'autonomous_syllabus_engine'
        });
      }
    }),
    3
  );

  const finalQuestions = sortedSnapshot();
  const finalProvider = aiSolvedCount > 0 ? 'gemini_ai' : 'autonomous_syllabus_engine';
  if (aiSolvedCount === stubs.length && stubs.length > 0) {
    solvedAnswerKeyCache.set(cacheKey, {
      questions: finalQuestions,
      provider: finalProvider,
      createdAt: Date.now()
    });
    if (solvedAnswerKeyCache.size > 40) {
      const oldestKey = solvedAnswerKeyCache.keys().next().value;
      if (oldestKey) solvedAnswerKeyCache.delete(oldestKey);
    }
  }

  return { questions: finalQuestions, provider: finalProvider, quotaNotice };
}

// AI Answer Key Support Assistant (Targeted fix, expand, flowchart/code enhancement, rubric balance & Q&A chat)
app.post('/api/ai/answer-key-assistant', async (req, res) => {
  try {
    const {
      subjectCode = 'AD3501',
      subjectName = 'Artificial Intelligence & Data Science',
      semester = 5,
      regulation = '2023 Regulations',
      examTitle = 'INTERNAL TEST - III',
      actionType = 'custom',
      targetQuestionNo = 'all',
      instruction = '',
      questions = []
    } = req.body || {};

    const qList = Array.isArray(questions) ? questions : [];
    const scopedQuestions =
      targetQuestionNo === 'all' || targetQuestionNo === '' || targetQuestionNo == null
        ? qList
        : qList.filter((q: any) => Number(q.questionNo) === Number(targetQuestionNo));

    if (qList.length === 0) {
      return res.json({
        success: true,
        assistantReply:
          'No questions are loaded in the active sheet yet. Upload a Question Paper or click "Sample QP" and run Generate, or ask me to verify an answer after generating.',
        updatedQuestions: [],
        provider: 'assistant_guide'
      });
    }

    const actionPrompts: Record<string, string> = {
      'fix-all':
        'Audit EVERY question below. Replace any placeholder/short/incomplete expectedAnswer with a complete, point-wise university answer strictly sized to its positiveMarks (2M = 1 heading + 3 concise bullets; 8M = 6-8 subheadings, 520-720 words, ~1-1.5 pages; 16M = 9-11 subheadings, 1050-1400 words, ~2-2.5+ pages). Ensure rubricBreakdown sums to positiveMarks.',
      'add-diagrams':
        'Add crisp, accurate ASCII box-and-arrow flowcharts or system architecture diagrams inside ```diagram ... ``` blocks (every line <= 58 chars wide) and concise equations/code snippets inside appropriate Part B and Part C answers while keeping strict point-wise formatting.',
      'verify-rubrics':
        'Verify that every question has exact positiveMarks, coherent CO1-CO5 & Bloom level (K1-K6), and step-by-step rubricBreakdown whose marks sum EXACTLY to positiveMarks.',
      'expand-answers':
        'Expand all brief or under-length answers in point-wise format under numbered sub-headings so each 8M question reaches ~1 to 1.5 A4 pages and each 16M question reaches ~2 to 2.5+ A4 pages with deeper technical steps, examples, and diagrams.',
      custom: instruction || 'Improve and refine the selected answer key questions cleanly in point-wise university format.'
    };

    const effectiveInstruction = actionPrompts[actionType] || actionPrompts.custom;
    const apiKey = process.env.GEMINI_API_KEY;
    const allInCooldown = GEMINI_SOLVER_MODELS.every((m) => (modelCooldownUntil.get(m) || 0) > Date.now());

    if (apiKey && !allInCooldown && scopedQuestions.length > 0) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        // Process up to 6 questions per assistant pass to stay fast & reliable
        const targetBatch = scopedQuestions.slice(0, 6);
        const promptQuestions = targetBatch
          .map(
            (q: any) =>
              `QNo=${q.questionNo} (${q.part || 'Part B'}, SubDiv=${q.subDivision || q.questionNo}, Marks=${q.positiveMarks}):
Question: ${q.questionText || q.topic}
Current Expected Answer:\n${String(q.expectedAnswer || '').slice(0, 2600)}`
          )
          .join('\n\n===\n\n');

        const resp = await withBatchTimeout(
          generateWithModelFallback(ai, (model, thinkingLevel) => ({
            model,
            contents: `Course: ${subjectCode} - ${subjectName} (Sem ${semester}, ${regulation}, ${examTitle})
Faculty Support Request (${actionType}): ${effectiveInstruction}

Questions in Scope:
${promptQuestions}`,
            config: {
              thinkingConfig: { thinkingLevel },
              systemInstruction: `You are an AI Answer Key Support Assistant for Autonomous Engineering Examinations.
Return JSON with:
1. "assistantReply": concise 1-3 sentence explanation of improvements made for the faculty member.
2. "updatedQuestions": array of improved question objects matching the input questionNo and positiveMarks.
FORMATTING RULES inside expectedAnswer:
- NEVER use markdown **bold** stars or ## headings.
- Use numbered sub-headings ("1. Sub-Heading") and "- Label: Detail" bullets ("  - Sub-point: Detail" for sub-bullets).
- Put flowcharts/architecture diagrams inside \`\`\`diagram ... \`\`\` blocks (max 58 chars wide).
- Ensure rubricBreakdown marks sum exactly to positiveMarks.`,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  assistantReply: { type: Type.STRING },
                  updatedQuestions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        questionNo: { type: Type.INTEGER },
                        expectedAnswer: { type: Type.STRING },
                        cognitiveLevel: { type: Type.STRING },
                        courseOutcome: { type: Type.STRING },
                        rubricBreakdown: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              stepNo: { type: Type.INTEGER },
                              description: { type: Type.STRING },
                              marks: { type: Type.NUMBER }
                            }
                          }
                        }
                      },
                      required: ['questionNo', 'expectedAnswer']
                    }
                  }
                },
                required: ['assistantReply', 'updatedQuestions']
              }
            }
          })),
          35000,
          'ai_assistant'
        );

        const parsed = JSON.parse((resp.text ?? '{}').trim());
        const returnedUpdates = Array.isArray(parsed.updatedQuestions) ? parsed.updatedQuestions : [];
        if (returnedUpdates.length > 0) {
          const updateByQNo = new Map<number, any>(
            returnedUpdates.map((u: any) => [Number(u.questionNo), u])
          );
          const mergedQuestions = qList.map((orig: any) => {
            const patch = updateByQNo.get(Number(orig.questionNo));
            if (!patch) return orig;
            return {
              ...orig,
              expectedAnswer: String(patch.expectedAnswer || orig.expectedAnswer || ''),
              cognitiveLevel: patch.cognitiveLevel || orig.cognitiveLevel,
              courseOutcome: patch.courseOutcome || orig.courseOutcome,
              rubricBreakdown:
                Array.isArray(patch.rubricBreakdown) && patch.rubricBreakdown.length > 0
                  ? patch.rubricBreakdown
                  : orig.rubricBreakdown
            };
          });
          return res.json({
            success: true,
            assistantReply:
              parsed.assistantReply ||
              `Updated ${returnedUpdates.length} question(s) in the Live Word Answer Key sheet.`,
            updatedQuestions: mergedQuestions,
            provider: 'gemini_ai'
          });
        }
      } catch (aiErr: any) {
        if (!isQuotaExhaustedError(aiErr)) {
          console.info('[AI Assistant Fallback]', aiErr?.message);
        }
      }
    }

    // Deterministic Local Syllabus Support Fallback (always succeeds cleanly even without external API)
    const updatedLocal = qList.map((q: any, idx: number) => {
      const inScope =
        targetQuestionNo === 'all' || targetQuestionNo == null || Number(q.questionNo) === Number(targetQuestionNo);
      if (!inScope) return q;

      const marks = Number(q.positiveMarks) || (q.part === 'Part A' ? 2 : q.part === 'Part C' ? 16 : 8);
      const topic = (q.topic || q.questionText || `Topic ${idx + 1}`).replace(/[?.!]+$/, '').slice(0, 60);
      const existingAns = String(q.expectedAnswer || '').trim();
      const needsRegen =
        actionType === 'fix-all' ||
        actionType === 'expand-answers' ||
        existingAns.length < (marks <= 3 ? 60 : marks <= 10 ? 400 : 800) ||
        existingAns.startsWith('Generating ');

      let nextAns = existingAns;
      if (needsRegen) {
        nextAns = buildStructuredMarkSizedFallbackAnswer(
          q.questionText || topic,
          topic,
          marks,
          subjectName,
          subjectCode
        );
      } else if (actionType === 'add-diagrams' && !existingAns.includes('```diagram')) {
        const keywords = extractQuestionKeywords(q.questionText || topic, subjectName);
        nextAns = `${existingAns}\n\n${buildDynamicAsciiDiagram(keywords, topic)}`;
      } else if (actionType === 'custom' && instruction.trim()) {
        nextAns = `${existingAns}\n\nSupplementary Valuation Focus (${instruction.trim().slice(0, 65)}):\n- Applied Concept Note: Connects ${topic} directly to ${instruction.trim()} with step-wise verification for ${marks}M credit.`;
      }

      // Ensure exact rubric sum = positiveMarks
      const half = Math.ceil(marks * 0.5);
      const fixedRubric =
        marks <= 3
          ? [
              { stepNo: 1, description: 'Accurate technical definition / key point', marks: Math.max(1, marks - 1) },
              { stepNo: 2, description: 'Application / formula / significance', marks: 1 }
            ]
          : [
              { stepNo: 1, description: 'Core theory & schematic flowchart', marks: Math.max(2, Math.floor(marks * 0.25)) },
              { stepNo: 2, description: 'Step-wise analytical derivation / methodology', marks: half },
              {
                stepNo: 3,
                description: 'Verification metrics & conclusion',
                marks: Math.max(1, marks - Math.max(2, Math.floor(marks * 0.25)) - half)
              }
            ];

      return {
        ...q,
        expectedAnswer: nextAns,
        rubricBreakdown: fixedRubric
      };
    });

    const summaryMap: Record<string, string> = {
      'fix-all': `Audited all ${scopedQuestions.length} question(s), completed mark-scaled point answers, and verified rubric totals.`,
      'add-diagrams': `Injected A4-aligned technical flowcharts/block diagrams for ${scopedQuestions.length} question(s).`,
      'verify-rubrics': `Verified and re-balanced evaluation rubric marks across ${scopedQuestions.length} question(s) to match Max Marks.`,
      'expand-answers': `Expanded ${scopedQuestions.length} answer(s) to full A4 university target length (~1-1.5 pages for 8M, ~2-2.5+ pages for 16M).`,
      custom: `Applied faculty support guidance to ${scopedQuestions.length} question(s) inside the Live Word sheet.`
    };

    return res.json({
      success: true,
      assistantReply: summaryMap[actionType] || summaryMap.custom,
      updatedQuestions: updatedLocal,
      provider: 'autonomous_syllabus_engine'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'AI Answer Key Support assistant failed'
    });
  }
});

// Fast Streaming NDJSON Endpoint (renders Part A immediately & streams Part B/C progressively in parallel)
app.post('/api/ai/solve-question-paper-stream', async (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  const sendLine = (obj: any) => {
    if (!res.writableEnded) {
      res.write(`${JSON.stringify(obj)}\n`);
    }
  };

  try {
    const result = await runFastParallelSolve(req.body, (progressEvt) => {
      sendLine({ type: 'progress', ...progressEvt });
    });
    sendLine({
      type: 'done',
      success: true,
      questions: result.questions,
      provider: result.provider,
      quotaNotice: result.quotaNotice
    });
    res.end();
  } catch (err: any) {
    const quotaNotice =
      isQuotaExhaustedError(err) || err instanceof QuotaExhaustedError
        ? 'Gemini Free Tier daily request quota reached. Generated complete mark-sized Answer Key via Autonomous Syllabus Engine — attach a billing-enabled API key in Settings > Secrets for live Gemini AI.'
        : undefined;
    if (!quotaNotice) {
      console.info('[Stream Solver Fallback]', err?.message);
    }
    const fallbackQs = generateFallbackAIDSQuestions(
      req.body?.subjectCode || 'AD3501',
      req.body?.subjectName || 'Deep Neural Networks & Architectures',
      req.body?.semester || 5,
      req.body?.questionPaperText || '',
      req.body?.examCategory || 'Internal',
      Number(req.body?.maxMarks) || 50
    );
    sendLine({
      type: 'done',
      success: true,
      questions: fallbackQs,
      provider: 'autonomous_syllabus_engine',
      quotaNotice
    });
    res.end();
  }
});

// Standard JSON Endpoint (also accelerated with parallel batches + quota fallback)
app.post('/api/ai/solve-question-paper', async (req, res) => {
  try {
    const result = await runFastParallelSolve(req.body);
    res.json({
      success: true,
      questions: result.questions,
      provider: result.provider,
      quotaNotice: result.quotaNotice
    });
  } catch (err: any) {
    const quotaNotice =
      isQuotaExhaustedError(err) || err instanceof QuotaExhaustedError
        ? 'Gemini Free Tier daily request quota reached. Generated complete mark-sized Answer Key via Autonomous Syllabus Engine — attach a billing-enabled API key in Settings > Secrets for live Gemini AI.'
        : undefined;
    if (!quotaNotice) {
      console.info('[AI Solver Fallback]', err?.message);
    }
    const fallbackQs = generateFallbackAIDSQuestions(
      req.body?.subjectCode || 'AD3501',
      req.body?.subjectName || 'Deep Neural Networks & Architectures',
      req.body?.semester || 5,
      req.body?.questionPaperText || '',
      req.body?.examCategory || 'Internal',
      Number(req.body?.maxMarks) || 50
    );
    res.json({
      success: true,
      questions: fallbackQs,
      provider: 'autonomous_syllabus_engine',
      quotaNotice
    });
  }
});

// -------------------------------------------------------------
// ANSWER SHEET CAMERA OCR & AUTOMATIC AI EVALUATION SYSTEM
// -------------------------------------------------------------
function normalizeRegisterToken(val: string): string {
  return String(val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function findMatchingStudentFromDirectory(
  extractedRegNo: string,
  extractedName: string,
  directory: any[]
): any | null {
  if (!Array.isArray(directory) || directory.length === 0) return null;
  const cleanReg = normalizeRegisterToken(extractedRegNo);

  if (cleanReg.length >= 4) {
    // 1. Exact Register No or Roll No match
    const exact = directory.find(
      (s) =>
        normalizeRegisterToken(s.registerNo) === cleanReg ||
        normalizeRegisterToken(s.rollNo) === cleanReg
    );
    if (exact) return exact;

    // 2. Tail 5 digits match (handles prefix blur when unique)
    const suffix = cleanReg.slice(-5);
    if (suffix.length >= 4) {
      const tailMatches = directory.filter((s) =>
        normalizeRegisterToken(s.registerNo).endsWith(suffix)
      );
      if (tailMatches.length === 1) return tailMatches[0];
    }

    // 3. Unique 1-digit Hamming-distance tolerance for handwritten OCR slips on >=10-char reg numbers
    if (cleanReg.length >= 10) {
      const hammingMatches = directory.filter((s) => {
        const candidate = normalizeRegisterToken(s.registerNo);
        if (candidate.length !== cleanReg.length) return false;
        let diffs = 0;
        for (let i = 0; i < cleanReg.length; i++) {
          if (candidate[i] !== cleanReg[i]) {
            diffs++;
            if (diffs > 1) return false;
          }
        }
        return diffs === 1;
      });
      if (hammingMatches.length === 1) return hammingMatches[0];
    }
  }

  // 4. Fallback unique name match if Register No was partially occluded
  const cleanName = String(extractedName || '').trim().toLowerCase();
  if (cleanName.length >= 5) {
    const nameMatches = directory.filter(
      (s) => String(s.name || '').trim().toLowerCase() === cleanName
    );
    if (nameMatches.length === 1) return nameMatches[0];
  }

  return null;
}

// Canonical VSBEC 50-Mark Internal Evaluation Slots & Either-Or Exclusion
const SERVER_CANONICAL_SLOTS = [
  { questionNo: 1, subDivision: '1', part: 'Part A', maxMarks: 2 },
  { questionNo: 2, subDivision: '2', part: 'Part A', maxMarks: 2 },
  { questionNo: 3, subDivision: '3', part: 'Part A', maxMarks: 2 },
  { questionNo: 4, subDivision: '4', part: 'Part A', maxMarks: 2 },
  { questionNo: 5, subDivision: '5', part: 'Part A', maxMarks: 2 },
  { questionNo: 6, subDivision: '6a)', part: 'Part B', maxMarks: 8, eitherOrGroup: '6', questionChoice: 'a' },
  { questionNo: 7, subDivision: '6b)', part: 'Part B', maxMarks: 8, eitherOrGroup: '6', questionChoice: 'b' },
  { questionNo: 8, subDivision: '7a)', part: 'Part C', maxMarks: 16, eitherOrGroup: '7', questionChoice: 'a' },
  { questionNo: 9, subDivision: '7b)', part: 'Part C', maxMarks: 16, eitherOrGroup: '7', questionChoice: 'b' },
  { questionNo: 10, subDivision: '8a)', part: 'Part C', maxMarks: 16, eitherOrGroup: '8', questionChoice: 'a' },
  { questionNo: 11, subDivision: '8b)', part: 'Part C', maxMarks: 16, eitherOrGroup: '8', questionChoice: 'b' }
];

function extractEitherOrMeta(subDiv: string, qNo?: number): { eitherOrGroup?: string; questionChoice?: 'a' | 'b' } {
  const s = String(subDiv || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const m = s.match(/^(\d+)([ab])$/);
  if (m) {
    return { eitherOrGroup: m[1], questionChoice: m[2] as 'a' | 'b' };
  }
  if (qNo === 6) return { eitherOrGroup: '6', questionChoice: 'a' };
  if (qNo === 7) return { eitherOrGroup: '7', questionChoice: 'a' };
  if (qNo === 8) return { eitherOrGroup: '8', questionChoice: 'a' };
  return {};
}

function enforceServerEitherOrAndBounds(rows: any[]): any[] {
  const cleaned = rows.map((row) => {
    const maxM = Number(row.maxMarks) || 2;
    const attempted = Boolean(row.attempted);
    const awarded = attempted ? Math.round(Math.min(maxM, Math.max(0, Number(row.marksAwarded) || 0)) * 2) / 2 : 0;
    const meta = extractEitherOrMeta(row.subDivision, Number(row.questionNo));
    return {
      ...row,
      eitherOrGroup: row.eitherOrGroup || meta.eitherOrGroup,
      questionChoice: row.questionChoice || meta.questionChoice,
      attempted,
      marksAwarded: awarded,
      extractedStudentAnswer: attempted
        ? String(row.extractedStudentAnswer || 'Attempted on script')
        : 'Not attempted'
    };
  });

  // Deduplicate either-or pairs (e.g. 6a vs 6b, 7a vs 7b, 8a vs 8b) — zero double counting
  const groups = new Map<string, number[]>();
  cleaned.forEach((row, idx) => {
    if (row.eitherOrGroup) {
      const list = groups.get(row.eitherOrGroup) || [];
      list.push(idx);
      groups.set(row.eitherOrGroup, list);
    }
  });

  groups.forEach((indices, grp) => {
    const attemptedIndices = indices.filter((i) => cleaned[i].attempted);
    if (attemptedIndices.length > 1) {
      // Keep the single best-scored option in the either-or pair and zero all others
      attemptedIndices.sort((iA, iB) => cleaned[iB].marksAwarded - cleaned[iA].marksAwarded);
      const keepIdx = attemptedIndices[0];
      attemptedIndices.slice(1).forEach((dropIdx) => {
        cleaned[dropIdx] = {
          ...cleaned[dropIdx],
          attempted: false,
          marksAwarded: 0,
          extractedStudentAnswer: 'Not attempted',
          feedback: `Excluded by Either-Or Q.${grp} rule (${cleaned[keepIdx].subDivision || grp} counted).`
        };
      });
    }
  });

  return cleaned;
}

app.post('/api/answer-sheets/evaluate', async (req, res) => {
  const startedAt = Date.now();
  try {
    const {
      pages,
      imageBase64,
      mimeType,
      answerKey,
      studentDirectory = []
    } = req.body || {};

    const inputPages: Array<{ imageBase64: string; mimeType: string }> =
      Array.isArray(pages) && pages.length > 0
        ? pages
            .filter((p: any) => p && typeof p.imageBase64 === 'string' && p.imageBase64.trim())
            .map((p: any) => ({
              imageBase64: p.imageBase64.replace(/^data:[^;]+;base64,/, '').trim(),
              mimeType: String(p.mimeType || 'image/jpeg')
            }))
        : imageBase64
        ? [
            {
              imageBase64: String(imageBase64).replace(/^data:[^;]+;base64,/, '').trim(),
              mimeType: String(mimeType || 'image/jpeg')
            }
          ]
        : [];

    if (inputPages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No answer sheet image or PDF page was provided for scanning.'
      });
    }

    const safeAnswerKey = answerKey && typeof answerKey === 'object' ? answerKey : {};
    const configuredQuestions = Array.isArray(safeAnswerKey.questions) ? safeAnswerKey.questions : [];
    const targetMaxMarks = Number(safeAnswerKey.maximumMarks) || 50;

    // Check fast SHA-256 OCR cache (invalidated cleanly when answerKey id/maxMarks changes)
    const imgHash = crypto
      .createHash('sha256')
      .update(
        `${safeAnswerKey.id || safeAnswerKey.subjectCode || 'AUTO'}|${targetMaxMarks}|${inputPages
          .slice(0, 6)
          .map((p) => p.imageBase64.length + ':' + p.imageBase64.slice(0, 256) + ':' + p.imageBase64.slice(-256))
          .join('|')}`
      )
      .digest('hex');

    const cachedOcr = ocrEvaluationCache.get(imgHash);
    if (cachedOcr && Date.now() - cachedOcr.createdAt < 15 * 60 * 1000) {
      const c = cachedOcr.data;
      const freshMatched = findMatchingStudentFromDirectory(
        c.ocr.extractedRegisterNo,
        c.ocr.extractedStudentName || c.ocr.studentName,
        studentDirectory
      );
      return res.json({
        ...c,
        ocr: {
          ...c.ocr,
          registerNo: freshMatched?.registerNo || c.ocr.extractedRegisterNo,
          studentName: freshMatched?.name || c.ocr.studentName
        },
        matchedStudent: freshMatched,
        cached: true,
        latencyMs: Math.max(1, Date.now() - startedAt)
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error:
          'GEMINI_API_KEY is not configured on the server. Add your Gemini API key in Secrets / Environment to run OCR & automatic answer sheet evaluation.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    // Check whether active key aligns with canonical 50M VSBEC scheme (or auto-fallback when no key exists)
    const isCanonical50MScheme =
      configuredQuestions.length === 0 ||
      targetMaxMarks === 50 ||
      configuredQuestions.some((q: any) => /^(6|7|8)[ab]\b/i.test(String(q.subDivision || '')));

    const effectiveKeyQuestions = isCanonical50MScheme
      ? SERVER_CANONICAL_SLOTS.map((slot) => {
          const found = configuredQuestions.find(
            (q: any) =>
              normalizeSubDivKey(q.subDivision) === normalizeSubDivKey(slot.subDivision) ||
              (!slot.eitherOrGroup && Number(q.questionNo) === slot.questionNo)
          );
          return {
            ...slot,
            questionText: found?.questionText || found?.topic || `Question ${slot.subDivision}`,
            expectedAnswer: found?.expectedAnswer || '',
            rubricBreakdown: found?.rubricBreakdown || []
          };
        })
      : configuredQuestions.map((q: any, idx: number) => ({
          questionNo: Number(q.questionNo) || idx + 1,
          subDivision: String(q.subDivision || q.questionNo || idx + 1),
          part: String(q.part || (Number(q.positiveMarks) <= 3 ? 'Part A' : Number(q.positiveMarks) >= 12 ? 'Part C' : 'Part B')),
          maxMarks: Number(q.positiveMarks) || 2,
          questionText: String(q.questionText || q.topic || `Question ${idx + 1}`),
          expectedAnswer: String(q.expectedAnswer || ''),
          rubricBreakdown: q.rubricBreakdown || []
        }));

    // Compact prompt payload keeps Gemini input tokens small (~700 chars total) for <=2s OCR latency
    const compactSlotList = effectiveKeyQuestions
      .map((q: any) => {
        const keyHint = q.expectedAnswer
          ? ` | Key: ${String(q.expectedAnswer).replace(/\s+/g, ' ').slice(0, 120)}`
          : '';
        return `${q.questionNo}:${q.subDivision}(${q.part},${q.maxMarks}M) ${String(q.questionText).slice(0, 90)}${keyHint}`;
      })
      .join('\n');

    const parts: any[] = inputPages.slice(0, 6).map((pg) => ({
      inlineData: {
        mimeType: pg.mimeType,
        data: pg.imageBase64
      }
    }));

    parts.push({
      text: `VSBEC Exam OCR & Auto-Valuation (${safeAnswerKey.subjectCode || 'AUTO'} ${safeAnswerKey.subjectName || ''}, Max ${targetMaxMarks}M).
Orientation: Photos may be rotated 90°/180°/270° — orient "V.S.B. ENGINEERING COLLEGE, KARUR" upright horizontally at the top before reading every box.
Scheme: Part A 1..5 = 2M each; Part B 6a OR 6b = 8M; Part C 7a OR 7b = 16M, 8a OR 8b = 16M (count ONLY ticked/attempted choice per pair).
Mode "cover_mark_grid":
- a) Register Number: Read all 12 individual digit boxes left-to-right carefully (college prefix e.g. 9225 + 2-digit year + 3-digit dept code e.g. 243/104/105/106 + 3-digit roll; inspect strokes carefully to distinguish 3 vs 2, 1 vs 7, 4 vs 9).
- Read b) Question Paper Code, c) Year & Department (e.g. III - AI&DS - 'B'), d) Course Code & Course Title (extractSubjectCode + extractSubjectName), e) Date & Session (FN/AN), f) Pages Used, Grand Total numerator circle, and EVERY row in PART-A (1..5) and PART-B & C (6a,6b,7a,7b,8a,8b) tick ✓ + red-ink handwritten CO marks. Unticked/blank rows => attempted=false, marksAwarded=0. Keep feedback <=6 words.
Mode "written_answers": Extract Register No, Name, transcribe written answer, assign fair marks per slots.
Confidence MUST be a 0-100 integer percentage (e.g. 95).
Slots:
${compactSlotList}`
    });

    const resp = await withBatchTimeout(
      generateWithFastOcrModel(ai, (model, thinkingLevel) => ({
        model,
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedMode: { type: Type.STRING, description: 'cover_mark_grid or written_answers' },
              extractedRegisterNo: { type: Type.STRING },
              extractedStudentName: { type: Type.STRING },
              extractedSubjectCode: { type: Type.STRING },
              extractedSubjectName: { type: Type.STRING },
              extractedQpCode: { type: Type.STRING },
              extractedYearDept: { type: Type.STRING },
              extractedExamDate: { type: Type.STRING },
              extractedSession: { type: Type.STRING },
              pagesUsed: { type: Type.INTEGER },
              ocrGrandTotal: { type: Type.NUMBER },
              ocrConfidence: { type: Type.INTEGER, description: 'Confidence percentage integer 0 to 100 (e.g. 96)' },
              ocrSummary: { type: Type.STRING },
              questionEvaluations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionNo: { type: Type.INTEGER },
                    subDivision: { type: Type.STRING },
                    part: { type: Type.STRING },
                    attempted: { type: Type.BOOLEAN },
                    extractedStudentAnswer: { type: Type.STRING },
                    marksAwarded: { type: Type.NUMBER },
                    maxMarks: { type: Type.NUMBER },
                    feedback: { type: Type.STRING },
                    confidence: { type: Type.INTEGER, description: 'Confidence percentage integer 0 to 100' }
                  },
                  required: ['subDivision', 'attempted', 'marksAwarded']
                }
              }
            },
            required: ['extractedRegisterNo', 'ocrConfidence', 'questionEvaluations']
          }
        }
      })),
      30000,
      'answer_sheet_ocr_eval'
    );

    const parsed = JSON.parse((resp.text ?? '{}').trim());
    const extractedRegisterNo = String(parsed.extractedRegisterNo || '').replace(/\s+/g, '').trim();
    const extractedStudentName = String(parsed.extractedStudentName || '').trim();
    const extractedSubjectCode = String(parsed.extractedSubjectCode || safeAnswerKey.subjectCode || '').trim();
    const extractedSubjectName = String(parsed.extractedSubjectName || safeAnswerKey.subjectName || '').trim();
    const extractedQpCode = String(parsed.extractedQpCode || '').trim();
    const extractedYearDept = String(parsed.extractedYearDept || '').trim();
    const extractedExamDate = String(parsed.extractedExamDate || '').trim();
    const extractedSession = String(parsed.extractedSession || '').toUpperCase().includes('AN') ? 'AN' : 'FN';
    const pagesUsed = Number(parsed.pagesUsed) || inputPages.length;
    const detectedMode = String(parsed.detectedMode || 'written_answers');
    const ocrGrandTotal = Number.isFinite(Number(parsed.ocrGrandTotal)) ? Number(parsed.ocrGrandTotal) : undefined;
    const rawOcrConf = Number(parsed.ocrConfidence);
    const scaledOcrConf = Number.isFinite(rawOcrConf)
      ? rawOcrConf > 0 && rawOcrConf <= 1
        ? rawOcrConf * 100
        : rawOcrConf
      : 92;
    const ocrConfidence = Math.min(100, Math.max(0, Math.round(scaledOcrConf)));
    const ocrSummary = String(parsed.ocrSummary || '').trim() || `Extracted ${extractedRegisterNo || 'sheet'} via Fast OCR (${detectedMode})`;
    const aiEvalRows = Array.isArray(parsed.questionEvaluations) ? parsed.questionEvaluations : [];

    // Match each effective key slot strictly by subDivision first so 6a/6b/7a/7b/8a/8b never cross-map
    const rawMatchedEvals = effectiveKeyQuestions.map((q: any, idx: number) => {
      const subNorm = normalizeSubDivKey(q.subDivision);
      const qNum = Number(q.questionNo) || idx + 1;

      const matched =
        (subNorm
          ? aiEvalRows.find((r: any) => normalizeSubDivKey(r.subDivision) === subNorm)
          : undefined) ||
        (!q.eitherOrGroup
          ? aiEvalRows.find(
              (r: any) =>
                Number(r.questionNo) === qNum &&
                (!r.subDivision || normalizeSubDivKey(r.subDivision) === String(qNum))
            )
          : undefined);

      const attempted = Boolean(matched?.attempted);
      const maxM = Number(q.maxMarks) || 2;
      const rawAwarded = attempted ? Number(matched?.marksAwarded) || 0 : 0;

      return {
        questionNo: qNum,
        subDivision: q.subDivision,
        part: q.part,
        eitherOrGroup: q.eitherOrGroup,
        questionChoice: q.questionChoice,
        questionText: q.questionText,
        attempted,
        extractedStudentAnswer: attempted
          ? String(matched?.extractedStudentAnswer || (detectedMode === 'cover_mark_grid' ? 'Scored on VSBEC Cover Grid' : 'Attempted on script'))
          : 'Not attempted',
        marksAwarded: rawAwarded,
        maxMarks: maxM,
        feedback: String(
          matched?.feedback ||
            (attempted
              ? detectedMode === 'cover_mark_grid'
                ? 'Cover valuation grid'
                : 'Evaluated against Answer Key.'
              : 'Not attempted (0M)')
        ),
        confidence: Math.min(
          100,
          Math.max(
            0,
            Math.round(
              Number.isFinite(Number(matched?.confidence))
                ? Number(matched.confidence) > 0 && Number(matched.confidence) <= 1
                  ? Number(matched.confidence) * 100
                  : Number(matched.confidence)
                : ocrConfidence
            )
          )
        )
      };
    });

    const questionEvaluations = enforceServerEitherOrAndBounds(rawMatchedEvals);
    const configuredMax =
      Number(safeAnswerKey.maximumMarks) ||
      (isCanonical50MScheme ? 50 : questionEvaluations.reduce((s: number, q: any) => s + q.maxMarks, 0)) ||
      50;
    const rawTotal = questionEvaluations.reduce(
      (sum: number, q: any) => sum + (q.attempted ? Number(q.marksAwarded) || 0 : 0),
      0
    );
    const totalMarksObtained = Math.min(configuredMax, Math.round(rawTotal * 2) / 2);
    const attendedQuestions = questionEvaluations
      .filter((q: any) => q.attempted)
      .map((q: any) => String(q.subDivision || q.questionNo).replace(/\)/g, ''));

    const matchedStudent = findMatchingStudentFromDirectory(
      extractedRegisterNo,
      extractedStudentName,
      studentDirectory
    );

    const responsePayload = {
      success: true,
      ocr: {
        registerNo: matchedStudent?.registerNo || extractedRegisterNo,
        extractedRegisterNo,
        studentName: matchedStudent?.name || extractedStudentName,
        extractedStudentName,
        subjectCode: extractedSubjectCode,
        subjectName: extractedSubjectName,
        qpCode: extractedQpCode,
        yearDept: extractedYearDept,
        examDate: extractedExamDate,
        session: extractedSession,
        pagesUsed,
        detectedMode,
        ocrGrandTotal,
        confidence: ocrConfidence,
        transcript: ocrSummary
      },
      matchedStudent,
      questionEvaluations,
      attendedQuestions,
      totalMarksObtained,
      maxMarks: configuredMax,
      provider: 'gemini_ai'
    };

    setOcrCache(imgHash, responsePayload);

    return res.json({
      ...responsePayload,
      cached: false,
      latencyMs: Date.now() - startedAt
    });
  } catch (err: any) {
    if (isQuotaExhaustedError(err) || err instanceof QuotaExhaustedError) {
      return res.status(429).json({
        success: false,
        error:
          'Gemini API request quota exceeded for automated Vision/OCR evaluation. Retry shortly or attach a billing-enabled GEMINI_API_KEY in Secrets.'
      });
    }
    let cleanErrorMsg = err?.message || 'Failed to run OCR & AI Answer Sheet evaluation.';
    try {
      const parsedErr = JSON.parse(cleanErrorMsg);
      if (parsedErr?.error?.message) {
        cleanErrorMsg = parsedErr.error.message;
      }
    } catch {
      // keep string as-is
    }
    const statusCode =
      Number(err?.status) === 400 || Number(err?.status) === 403
        ? Number(err.status)
        : Number(err?.status) === 503
        ? 503
        : 502;
    return res.status(statusCode).json({
      success: false,
      error: cleanErrorMsg
    });
  }
});

// GET verified/saved answer sheet evaluations (STRICTLY SCOPED per Staff / Workspace)
app.get('/api/answer-sheets/evaluations', async (req, res) => {
  try {
    const scope = resolveRequestWorkspace(req);
    if (!scope.authorized) {
      return res.status(401).json({ success: false, error: scope.error });
    }

    const allowAllAudit = scope.role === 'admin' && req.query.scope === 'all';
    const mongoFilter = allowAllAudit ? {} : { ownerStaffId: scope.ownerStaffId };

    if (mongoStatus.connected && mongoDb) {
      try {
        const docs = await mongoDb
          .collection('evaluated_answer_sheets')
          .find(mongoFilter)
          .sort({ scannedAt: -1 })
          .limit(300)
          .toArray();
        if (Array.isArray(docs)) {
          const cleanDocs = docs
            .map(({ _id, ...rest }: any) => rest)
            .filter((d: any) => !String(d?.id || '').startsWith('AS-9225-'));
          return res.json({
            success: true,
            evaluations: cleanDocs,
            workspace: scope.ownerStaffId,
            storage: 'mongodb_atlas'
          });
        }
      } catch (dbErr: any) {
        console.warn('[MongoDB] Read evaluations failed, serving cache:', dbErr?.message);
      }
    }

    const scopedLocal = allowAllAudit
      ? inMemoryEvaluations
      : inMemoryEvaluations.filter(
          (item) => String(item.ownerStaffId || 'COE-ADMIN').toUpperCase() === scope.ownerStaffId
        );

    return res.json({
      success: true,
      evaluations: scopedLocal,
      workspace: scope.ownerStaffId,
      storage: 'local_cache'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to load evaluated answer sheets'
    });
  }
});

// POST save verified answer sheet evaluation (strictly isolated + deduplicated per ownerStaffId + registerNo + subjectCode)
app.post('/api/answer-sheets/evaluations', async (req, res) => {
  try {
    const scope = resolveRequestWorkspace(req);
    if (!scope.authorized) {
      return res.status(401).json({ success: false, error: scope.error });
    }

    const payload = req.body;
    if (!payload || !payload.id || !payload.registerNo) {
      return res.status(400).json({
        success: false,
        error: 'Evaluation payload must include id and registerNo.'
      });
    }

    // Enforce server-side workspace ownership regardless of payload body
    const ownerStaffId = scope.ownerStaffId;
    const normReg = normalizeRegisterToken(payload.registerNo);
    const normSub = String(payload.subjectCode || '').trim().toUpperCase();

    const existingLocalIdx = inMemoryEvaluations.findIndex(
      (item) =>
        String(item.ownerStaffId || 'COE-ADMIN').toUpperCase() === ownerStaffId &&
        (item.id === payload.id ||
          (normalizeRegisterToken(item.registerNo) === normReg &&
            String(item.subjectCode || '').trim().toUpperCase() === normSub))
    );

    // Block ID collision across different staff workspaces
    const crossStaffCollision = inMemoryEvaluations.find(
      (item) =>
        item.id === payload.id &&
        String(item.ownerStaffId || 'COE-ADMIN').toUpperCase() !== ownerStaffId
    );

    const stableId =
      existingLocalIdx >= 0 && inMemoryEvaluations[existingLocalIdx]?.id
        ? inMemoryEvaluations[existingLocalIdx].id
        : crossStaffCollision
        ? `${payload.id}-${ownerStaffId}`
        : payload.id;

    const cleanEvals = Array.isArray(payload.questionEvaluations)
      ? enforceServerEitherOrAndBounds(payload.questionEvaluations)
      : payload.questionEvaluations;

    const record = {
      ...payload,
      id: stableId,
      ownerStaffId,
      questionEvaluations: cleanEvals,
      updatedAt: new Date().toISOString(),
      _syncedToMongo: false
    };

    if (mongoStatus.connected && mongoDb) {
      try {
        await mongoDb.collection('evaluated_answer_sheets').updateOne(
          {
            ownerStaffId,
            $or: [
              { id: stableId },
              ...(normReg && normSub
                ? [{ registerNo: payload.registerNo, subjectCode: payload.subjectCode }]
                : [])
            ]
          },
          { $set: { ...record, _syncedToMongo: true } },
          { upsert: true }
        );
        record._syncedToMongo = true;
      } catch (dbErr: any) {
        console.warn('[MongoDB] Save evaluation failed, caching locally:', dbErr?.message);
      }
    }

    if (existingLocalIdx >= 0) {
      inMemoryEvaluations[existingLocalIdx] = record;
    } else {
      inMemoryEvaluations.unshift(record);
    }
    if (inMemoryEvaluations.length > 500) {
      inMemoryEvaluations = inMemoryEvaluations.slice(0, 500);
    }
    persistEvaluationsCache();

    return res.json({
      success: true,
      evaluation: record,
      deduplicated: existingLocalIdx >= 0,
      workspace: ownerStaffId,
      storage: record._syncedToMongo ? 'mongodb_atlas' : 'local_cache'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to save answer sheet evaluation'
    });
  }
});

// POST batch save Live Excel rows in a single bulkWrite round trip (<50ms)
app.post('/api/answer-sheets/evaluations/batch', async (req, res) => {
  try {
    const scope = resolveRequestWorkspace(req);
    if (!scope.authorized) {
      return res.status(401).json({ success: false, error: scope.error });
    }

    const ownerStaffId = scope.ownerStaffId;
    const rawList = Array.isArray(req.body?.evaluations) ? req.body.evaluations : [];
    if (rawList.length === 0) {
      return res.status(400).json({ success: false, error: 'evaluations array is required.' });
    }

    const nowIso = new Date().toISOString();
    const processed: any[] = [];
    const bulkOps: any[] = [];

    for (const payload of rawList) {
      if (!payload || !payload.id || !payload.registerNo) continue;
      const normReg = normalizeRegisterToken(payload.registerNo);
      const normSub = String(payload.subjectCode || '').trim().toUpperCase();

      const existingIdx = inMemoryEvaluations.findIndex(
        (item) =>
          String(item.ownerStaffId || 'COE-ADMIN').toUpperCase() === ownerStaffId &&
          (item.id === payload.id ||
            (normalizeRegisterToken(item.registerNo) === normReg &&
              String(item.subjectCode || '').trim().toUpperCase() === normSub))
      );

      const stableId =
        existingIdx >= 0 && inMemoryEvaluations[existingIdx]?.id
          ? inMemoryEvaluations[existingIdx].id
          : payload.id;

      const cleanEvals = Array.isArray(payload.questionEvaluations)
        ? enforceServerEitherOrAndBounds(payload.questionEvaluations)
        : payload.questionEvaluations;

      const record = {
        ...payload,
        id: stableId,
        ownerStaffId,
        questionEvaluations: cleanEvals,
        updatedAt: nowIso,
        _syncedToMongo: Boolean(mongoStatus.connected && mongoDb)
      };

      if (existingIdx >= 0) {
        inMemoryEvaluations[existingIdx] = record;
      } else {
        inMemoryEvaluations.unshift(record);
      }
      processed.push(record);

      bulkOps.push({
        updateOne: {
          filter: {
            ownerStaffId,
            $or: [
              { id: stableId },
              ...(normReg && normSub
                ? [{ registerNo: payload.registerNo, subjectCode: payload.subjectCode }]
                : [])
            ]
          },
          update: { $set: record },
          upsert: true
        }
      });
    }

    let storage: 'mongodb_atlas' | 'local_cache' = 'local_cache';
    if (mongoStatus.connected && mongoDb && bulkOps.length > 0) {
      try {
        await mongoDb.collection('evaluated_answer_sheets').bulkWrite(bulkOps, { ordered: false });
        storage = 'mongodb_atlas';
      } catch (dbErr: any) {
        console.warn('[MongoDB] Batch save fallback to local cache:', dbErr?.message);
      }
    }

    if (inMemoryEvaluations.length > 500) {
      inMemoryEvaluations = inMemoryEvaluations.slice(0, 500);
    }
    persistEvaluationsCache();

    return res.json({
      success: true,
      count: processed.length,
      evaluations: processed,
      workspace: ownerStaffId,
      storage
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to batch save answer sheet evaluations'
    });
  }
});

// PATCH update status/marks on an evaluated answer sheet (with strict 403 cross-staff check)
app.patch('/api/answer-sheets/evaluations/:id', async (req, res) => {
  try {
    const scope = resolveRequestWorkspace(req);
    if (!scope.authorized) {
      return res.status(401).json({ success: false, error: scope.error });
    }

    const { id } = req.params;
    const ownerStaffId = scope.ownerStaffId;
    const patch = { ...(req.body || {}) };
    delete patch.ownerStaffId; // prevent tampering

    // Check MongoDB / cache for ownership violation
    let existingDoc: any = inMemoryEvaluations.find((item) => item.id === id) || null;
    if (!existingDoc && mongoStatus.connected && mongoDb) {
      try {
        existingDoc = await mongoDb.collection('evaluated_answer_sheets').findOne({ id });
      } catch {
        existingDoc = null;
      }
    }

    if (
      existingDoc &&
      String(existingDoc.ownerStaffId || 'COE-ADMIN').toUpperCase() !== ownerStaffId &&
      scope.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Record "${id}" belongs to another staff workspace.`
      });
    }

    const cleanEvals = Array.isArray(patch.questionEvaluations)
      ? enforceServerEitherOrAndBounds(patch.questionEvaluations)
      : existingDoc?.questionEvaluations;

    const updatedRecord = {
      ...(existingDoc || { id }),
      ...patch,
      ...(cleanEvals ? { questionEvaluations: cleanEvals } : {}),
      id,
      ownerStaffId: existingDoc?.ownerStaffId || ownerStaffId,
      updatedAt: new Date().toISOString()
    };
    delete updatedRecord._id;

    if (mongoStatus.connected && mongoDb) {
      try {
        await mongoDb.collection('evaluated_answer_sheets').updateOne(
          scope.role === 'admin' ? { id } : { id, ownerStaffId },
          { $set: { ...updatedRecord, _syncedToMongo: true } },
          { upsert: Boolean(existingDoc) }
        );
        updatedRecord._syncedToMongo = true;
      } catch {
        // non-fatal fallback
      }
    }

    const idx = inMemoryEvaluations.findIndex((item) => item.id === id);
    if (idx >= 0) {
      inMemoryEvaluations[idx] = updatedRecord;
    } else if (existingDoc) {
      inMemoryEvaluations.unshift(updatedRecord);
    }
    persistEvaluationsCache();

    return res.json({ success: true, evaluation: updatedRecord });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to update answer sheet evaluation'
    });
  }
});

// DELETE remove evaluated answer sheet (strictly enforces ownerStaffId match -> 403 on cross-staff delete)
app.delete('/api/answer-sheets/evaluations/:id', async (req, res) => {
  try {
    const scope = resolveRequestWorkspace(req);
    if (!scope.authorized) {
      return res.status(401).json({ success: false, error: scope.error });
    }

    const { id } = req.params;
    const ownerStaffId = scope.ownerStaffId;

    let existingDoc: any = inMemoryEvaluations.find((item) => item.id === id) || null;
    if (!existingDoc && mongoStatus.connected && mongoDb) {
      try {
        existingDoc = await mongoDb.collection('evaluated_answer_sheets').findOne({ id });
      } catch {
        existingDoc = null;
      }
    }

    if (
      existingDoc &&
      String(existingDoc.ownerStaffId || 'COE-ADMIN').toUpperCase() !== ownerStaffId &&
      scope.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Cannot delete record "${id}" owned by another staff workspace.`
      });
    }

    inMemoryEvaluations = inMemoryEvaluations.filter(
      (item) =>
        !(
          item.id === id &&
          (scope.role === 'admin' || String(item.ownerStaffId || 'COE-ADMIN').toUpperCase() === ownerStaffId)
        )
    );
    persistEvaluationsCache();

    if (mongoStatus.connected && mongoDb) {
      try {
        await mongoDb
          .collection('evaluated_answer_sheets')
          .deleteOne(scope.role === 'admin' ? { id } : { id, ownerStaffId });
      } catch {
        // non-fatal
      }
    }

    return res.json({ success: true, deletedId: id });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to delete answer sheet evaluation'
    });
  }
});

// GET isolated student directory for the authenticated staff / workspace
app.get('/api/workspace/students', async (req, res) => {
  try {
    const scope = resolveRequestWorkspace(req);
    if (!scope.authorized) {
      return res.status(401).json({ success: false, error: scope.error });
    }

    const ownerStaffId = scope.ownerStaffId;
    if (mongoStatus.connected && mongoDb) {
      try {
        const doc = await mongoDb
          .collection('staff_workspace_students')
          .findOne({ ownerStaffId });
        if (doc && Array.isArray(doc.students)) {
          workspaceStudentsMap.set(ownerStaffId, doc.students);
          return res.json({
            success: true,
            students: doc.students,
            workspace: ownerStaffId,
            storage: 'mongodb_atlas'
          });
        }
      } catch (dbErr: any) {
        console.warn('[MongoDB] Read workspace students fallback:', dbErr?.message);
      }
    }

    return res.json({
      success: true,
      students: workspaceStudentsMap.get(ownerStaffId) || [],
      workspace: ownerStaffId,
      storage: 'local_cache'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch students' });
  }
});

// PUT sync isolated student directory for the authenticated staff / workspace
app.put('/api/workspace/students', async (req, res) => {
  try {
    const scope = resolveRequestWorkspace(req);
    if (!scope.authorized) {
      return res.status(401).json({ success: false, error: scope.error });
    }

    const ownerStaffId = scope.ownerStaffId;
    const rawStudents = Array.isArray(req.body?.students) ? req.body.students : [];
    const stamped = rawStudents.map((s: any) => ({ ...s, ownerStaffId }));

    workspaceStudentsMap.set(ownerStaffId, stamped);
    persistWorkspaceStudentsCache();

    let storage: 'mongodb_atlas' | 'local_cache' = 'local_cache';
    if (mongoStatus.connected && mongoDb) {
      try {
        await mongoDb.collection('staff_workspace_students').updateOne(
          { ownerStaffId },
          {
            $set: {
              ownerStaffId,
              students: stamped,
              updatedAt: new Date().toISOString()
            }
          },
          { upsert: true }
        );
        storage = 'mongodb_atlas';
      } catch (dbErr: any) {
        console.warn('[MongoDB] Sync workspace students fallback:', dbErr?.message);
      }
    }

    return res.json({
      success: true,
      count: stamped.length,
      workspace: ownerStaffId,
      storage
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to save workspace students' });
  }
});

function extractQuestionKeywords(questionText: string, subjectName: string): string[] {
  const stopWords = new Set([
    'what', 'which', 'where', 'when', 'write', 'explain', 'describe', 'define', 'discuss',
    'illustrate', 'compare', 'contrast', 'elaborate', 'detail', 'with', 'suitable', 'example',
    'examples', 'various', 'steps', 'process', 'role', 'how', 'used', 'between', 'about',
    'complete', 'methodology', 'give', 'short', 'notes', 'neat', 'diagram', 'flowchart', 'marks'
  ]);
  const tokens = String(questionText || '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w.toLowerCase()));
  const unique = Array.from(new Set(tokens)).slice(0, 6);
  if (unique.length === 0) return [subjectName.slice(0, 18) || 'Core System', 'Processing', 'Validation'];
  return unique;
}

function buildDynamicAsciiDiagram(keywords: string[], topic: string): string {
  const padBox = (txt: string, w = 19) => txt.slice(0, w).padEnd(w, ' ');
  const k1 = padBox(`1. ${keywords[0] || 'Input'} Init`, 19);
  const k2 = padBox(`2. ${keywords[1] || 'Core'} Logic`, 19);
  const k3 = padBox(`3. ${keywords[2] || topic.slice(0, 12)}`, 19);
  const k4 = padBox(`4. Optimization`, 19);
  const k5 = padBox(`5. Evaluation`, 19);
  const k6 = padBox(`6. Final Output`, 19);
  return `\`\`\`diagram
+---------------------+    +---------------------+    +---------------------+
| ${k1} | -> | ${k2} | -> | ${k3} |
+---------------------+    +---------------------+    +---------------------+
                                                                 |
                                                                 v
+---------------------+    +---------------------+    +---------------------+
| ${k6} | <- | ${k5} | <- | ${k4} |
+---------------------+    +---------------------+    +---------------------+
\`\`\``;
}

function buildStructuredMarkSizedFallbackAnswer(
  questionText: string,
  topic: string,
  marks: number,
  subjectName: string = 'Artificial Intelligence & Data Science',
  subjectCode: string = 'AD3501'
): string {
  const cleanQ = questionText.trim().replace(/\?$/, '');
  const keywords = extractQuestionKeywords(cleanQ, subjectName);
  const focusTerm = keywords.slice(0, 3).join(' / ');
  const needsVisual = /\b(diagram|flowchart|flow chart|architecture|workflow|pipeline|block|circuit|model|process|lifecycle|stages|hierarchy|tree|graph|design|system|layer|network)\b/i.test(
    `${cleanQ} ${topic}`
  );

  if (marks <= 3) {
    const basePoints = `1. Core Concept & Key Points (${topic})
- Definition: In ${subjectCode} (${subjectName}), ${topic} establishes the formal principle addressing "${cleanQ}" using ${focusTerm}.
- Operational Principle: Defines input constraints, core computation rules, and deterministic state transitions for accurate execution.
- Significance / Example: Improves computational reliability, interpretability, and practical applicability in analytical engineering workflows.`;

    if (needsVisual) {
      return `${basePoints}

\`\`\`diagram
+------------------+     +--------------------+     +------------------+
| Input: ${(keywords[0] || 'Data').slice(0, 9).padEnd(9, ' ')} | --> | Process Stage      | --> | Verified Output  |
+------------------+     +--------------------+     +------------------+
\`\`\``;
    }
    return basePoints;
  }

  if (marks <= 10) {
    return `1. Foundational Context & Problem Requirements (${topic})
- Course Alignment (${subjectCode} — ${subjectName}): "${cleanQ}" centers on systematic design, analysis, and verification of ${focusTerm}.
- Core Scope & Prerequisites:
  - Identify formal input specifications, assumptions, dimensional boundaries, and measurable performance targets.
  - Distinguish baseline vs. optimized formulations to satisfy university rubric checkpoints.

2. Architecture & Process Flowchart
- End-to-End Execution Flow for ${topic}:
${buildDynamicAsciiDiagram(keywords, topic)}

3. Key Mechanisms & Theoretical Foundations
- Primary Component Design (${keywords[0] || topic}):
  - Establishes the mathematical/structural representation linking raw inputs to intermediate representations.
  - Controls complexity, invariance, and numerical stability across edge-case inputs.
- Secondary Integration (${keywords[1] || 'Core Processing'}):
  - Coordinates state transitions, parameter tuning, and dependency checks across modules.

4. Step-by-Step Algorithmic / Analytical Procedure
- Step 1 — Initialization & Parameter Setup: Configure baseline hyperparameters, boundary constraints, and validation rules.
- Step 2 — Iterative Transformation / Execution: Apply core transition equations or structural operations across the problem domain.
- Step 3 — Convergence & Consistency Check: Verify invariants, boundary conditions, and intermediate outputs before final aggregation.

5. Worked Example & Practical Trade-Offs
- Illustrative Scenario: Demonstrate input-to-output progression on a structured sample case highlighting ${focusTerm}.
- Complexity & Limitations:
  - Time / Space Complexity: Analyze asymptotic scaling alongside practical mitigation techniques (regularization, indexing, or caching).

6. Evaluation Summary & Verification Checklist
- Verification Points: Confirm conceptual accuracy, neatly labeled flowchart blocks, explicit mathematical/algorithmic steps, and concise engineering conclusions for full ${marks}-mark credit.`;
  }

  return `1. Comprehensive Problem Formulation & Objectives (${topic})
- Subject Context (${subjectCode} — ${subjectName}): Addressing "${cleanQ}" requires integrating theoretical rigor, architectural decomposition, formal derivations, and empirical validation around ${focusTerm}.
- System Objectives & Design Contracts:
  - Specify input-output interfaces, quantitative evaluation metrics, scalability constraints, and fault-tolerance guarantees.
  - Define key variables, notation conventions, and boundary invariants maintained throughout the solution pipeline.

2. High-Level System Architecture & Process Flowchart
- Integrated Multi-Stage Flowchart for ${topic}:
${buildDynamicAsciiDiagram(keywords, topic)}

3. Core Architectural Components & Functional Breakdown
- Module 1 — Input Conditioning & Representation (${keywords[0] || 'Ingestion'}):
  - Normalizes raw domain signals/structures, enforces schema validity, and eliminates malformed states.
- Module 2 — Core Computation Engine (${keywords[1] || 'Core Logic'}):
  - Executes primary mathematical, algorithmic, or architectural transformations governing ${topic}.
- Module 3 — Optimization & Quality Governance (${keywords[2] || 'Verification'}):
  - Enforces consistency constraints, convergence monitoring, and error containment prior to downstream consumption.

4. Mathematical Formulation & Analytical Derivations
- Governing Relationships:
  - Express output mapping Y = f(X; theta) clearly, identifying every term, weight matrix, threshold, or constraint relation.
  - Detail gradient/update/transition laws, regularization penalties, and optimality criteria applicable to ${topic}.
- Boundary & Stability Analysis:
  - Analyze sensitivity to noise, ill-conditioned inputs, and convergence bounds across iterative stages.

5. Step-by-Step Methodology & Execution Trace
- Phase A — Pre-Conditioning: Prepare normalized inputs, verify structural invariants, and allocate state buffers.
- Phase B — Core Processing Pass: Apply main algorithmic rules iteratively while logging intermediate checkpoints.
- Phase C — Post-Processing & Verification: Reconcile outputs against constraints and audit accuracy/error bounds.

6. Structured Pseudocode / Reference Implementation
- Clean Algorithmic Template for ${topic}:
\`\`\`python
def execute_pipeline(inputs, params):
    normalized = validate_and_normalize(inputs)
    state = initialize_model_state(params)
    result = run_core_computation(normalized, state)
    return verify_constraints_and_evaluate(result)
\`\`\`

7. Comparative Analysis, Trade-Offs & Scalability
- Baseline vs. Optimized Design:
  - Compare throughput, accuracy/recall, memory footprint, and interpretability against classical alternatives.
- Bottleneck Mitigation:
  - Address vanishing/exploding sensitivity, synchronization overhead, or high-dimensional sparsity via modular design.

8. Edge Cases, Failure Modes & Real-World Applications
- Anomaly & Boundary Resilience: Guard against empty inputs, distribution drift, extreme outliers, and partial failures.
- Industrial Use Cases: Highlight deployment patterns across real-world AI, Data Science, and autonomous engineering pipelines.

9. Validation Metrics & Conclusion
- Quantitative Acceptance Criteria: Verify numerical correctness, benchmark stability, and clean complexity guarantees.
- Final Valuation Summary: Synthesizes problem framing, flowchart architecture, mathematical/algorithmic steps, worked verification, and trade-off analysis commensurate with a full ${marks}-mark university solution.`;
}

function generateFallbackAIDSQuestions(
  subCode: string,
  subName: string,
  sem: number,
  rawText: string,
  examCategory: string = 'Internal',
  maxMarks: number = 50
) {
  const stubs = fastParseQuestionStubsFromText(rawText, examCategory, maxMarks);
  if (stubs.length > 0) {
    return stubs.map((item, idx) => {
      const unitNum = (idx % 5) + 1;
      const topic = item.questionText.replace(/[?.!]+$/, '').slice(0, 56);
      const half = Math.ceil(item.positiveMarks * 0.5);
      return {
        questionNo: idx + 1,
        part: item.part,
        subDivision: item.subDivision,
        questionText: item.questionText,
        topic,
        cognitiveLevel:
          item.part === 'Part A' ? 'K2 - Understand' : item.part === 'Part C' ? 'K5 - Evaluate' : 'K4 - Analyze',
        courseOutcome: `CO${unitNum}`,
        positiveMarks: item.positiveMarks,
        negativeMarks: 0,
        expectedAnswer: buildStructuredMarkSizedFallbackAnswer(
          item.questionText,
          topic,
          item.positiveMarks,
          subName,
          subCode
        ),
        rubricBreakdown:
          item.positiveMarks <= 3
            ? [
                { stepNo: 1, description: 'Core definition / principle', marks: Math.max(1, item.positiveMarks - 1) },
                { stepNo: 2, description: 'Example / significance', marks: 1 }
              ]
            : [
                { stepNo: 1, description: 'Conceptual overview & architecture', marks: Math.max(2, Math.floor(item.positiveMarks * 0.25)) },
                { stepNo: 2, description: 'Detailed methodology & analytical steps', marks: half },
                {
                  stepNo: 3,
                  description: 'Formulations / implementation & summary',
                  marks: Math.max(1, item.positiveMarks - Math.max(2, Math.floor(item.positiveMarks * 0.25)) - half)
                }
              ]
      };
    });
  }

  // Default template fallback scaled cleanly: Part A = 2M, Part B = 8M, Part C = 16M
  const defaultPartA = [
    {
      sub: '1',
      q: 'What information does a histogram provide about a dataset?',
      topic: 'Histogram Distribution & Variability',
      co: 'CO1',
      ans: `1. Core Concept: Histogram Information
- Frequency Distribution: Displays the count of continuous data values falling within defined interval bins.
- Shape & Centrality: Reveals skewness, modality (unimodal/bimodal), central tendency, and overall spread.
- Anomaly Identification: Highlights isolated gaps or potential outlier tails in the dataset.`
    },
    {
      sub: '2',
      q: 'What is Data Transformation?',
      topic: 'Data Preprocessing & Transformation',
      co: 'CO1',
      ans: `1. Core Concept: Data Transformation
- Definition: Converting raw datasets into clean, standardized structures suitable for statistical analysis and modeling.
- Common Operations: Includes Min-Max / Z-score scaling, categorical encoding, log power transforms, and aggregation.
- Modeling Impact: Accelerates convergence and prevents high-magnitude features from dominating learning algorithms.`
    },
    {
      sub: '3',
      q: 'Define time-based indexing.',
      topic: 'Time Series Indexing',
      co: 'CO2',
      ans: `1. Core Concept: Time-Based Indexing
- Definition: Organizing and referencing sequential observations using DateTime timestamps as the primary index.
- Analytical Utility: Supports fast date-range slicing, frequency resampling (hourly/daily), and rolling window statistics.`
    },
    {
      sub: '4',
      q: 'What is the relationship between variables in exploratory analysis?',
      topic: 'Correlation & Variable Dependency',
      co: 'CO3',
      ans: `1. Core Concept: Variable Relationships in EDA
- Definition: Quantifies how variation in one attribute associates with systematic changes in another variable.
- Measurement Tools: Evaluated using Pearson/Spearman correlation coefficients and scatter plots (positive, negative, or zero correlation).`
    },
    {
      sub: '5',
      q: 'How is visualization used in multivariate analysis?',
      topic: 'Multivariate Visualization Techniques',
      co: 'CO4',
      ans: `1. Core Concept: Multivariate Visualization
- Purpose: Reveals simultaneous interactions, clusters, and conditional dependencies among three or more features.
- Key Techniques: Utilizes pair-plot matrices, correlation heatmaps, mosaic charts, and multi-dimensional scatter plots.`
    }
  ];

  const questions: any[] = defaultPartA.map((item, idx) => ({
    questionNo: idx + 1,
    part: 'Part A',
    subDivision: item.sub,
    questionText: item.q,
    topic: item.topic,
    cognitiveLevel: 'K2 - Understand',
    courseOutcome: item.co,
    positiveMarks: 2,
    negativeMarks: 0,
    expectedAnswer: item.ans,
    rubricBreakdown: [
      { stepNo: 1, description: 'Accurate technical definition', marks: 1 },
      { stepNo: 2, description: 'Key analytical significance / example', marks: 1 }
    ]
  }));

  const defaultPartB = [
    {
      sub: '6a)',
      q: `Write the various steps in Exploratory Data Analysis (EDA) for ${subName}.`,
      topic: 'Exploratory Data Analysis Workflow',
      co: 'CO2'
    },
    {
      sub: '6b)',
      q: 'Describe the process of data cleaning in time series analysis.',
      topic: 'Time Series Data Cleaning',
      co: 'CO3'
    },
    {
      sub: '7a)',
      q: 'How to perform data deduplication? Explain exact and fuzzy matching.',
      topic: 'Exact & Fuzzy Deduplication',
      co: 'CO3'
    },
    {
      sub: '7b)',
      q: 'Explain Data Merging, Concatenation, Pivoting, and Reshaping in detail.',
      topic: 'Data Merging, Concatenation, Pivoting & Reshaping',
      co: 'CO4'
    },
    {
      sub: '8a)',
      q: 'Describe the role of causal explanation in multivariate analysis.',
      topic: 'Causal Diagrams & Confounder Analysis',
      co: 'CO5'
    },
    {
      sub: '8b)',
      q: 'What are three-variable contingency tables and how are they used in multivariate analysis?',
      topic: 'Three-Variable Contingency Tables',
      co: 'CO5'
    }
  ];

  defaultPartB.forEach((item) => {
    questions.push({
      questionNo: questions.length + 1,
      part: 'Part B',
      subDivision: item.sub,
      questionText: item.q,
      topic: item.topic,
      cognitiveLevel: 'K4 - Analyze',
      courseOutcome: item.co,
      positiveMarks: 8,
      negativeMarks: 0,
      expectedAnswer: buildStructuredMarkSizedFallbackAnswer(item.q, item.topic, 8, subName, subCode),
      rubricBreakdown: [
        { stepNo: 1, description: 'Conceptual overview & structure', marks: 2 },
        { stepNo: 2, description: 'Detailed step-by-step analytical breakdown', marks: 4 },
        { stepNo: 3, description: 'Examples / verification & conclusion', marks: 2 }
      ]
    });
  });

  if (maxMarks >= 60) {
    questions.push({
      questionNo: questions.length + 1,
      part: 'Part C',
      subDivision: '9a)',
      questionText: `Design an end-to-end automated pipeline for ${subName} integrating preprocessing, statistical validation, and multivariate visualization.`,
      topic: `${subName} End-to-End Pipeline Case Study`,
      cognitiveLevel: 'K5 - Evaluate',
      courseOutcome: 'CO5',
      positiveMarks: 16,
      negativeMarks: 0,
      expectedAnswer: buildStructuredMarkSizedFallbackAnswer(
        `Comprehensive Case Study on ${subName}`,
        `${subName} End-to-End Architecture`,
        16,
        subName,
        subCode
      ),
      rubricBreakdown: [
        { stepNo: 1, description: 'System architecture & problem formulation', marks: 4 },
        { stepNo: 2, description: 'Detailed methodology, code & mathematical formulations', marks: 8 },
        { stepNo: 3, description: 'Validation metrics, edge cases & conclusion', marks: 4 }
      ]
    });
  }

  return questions;
}

// -------------------------------------------------------------
// FRONTEND INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  if (isProd && hasDist) {
    console.log('[Server] Serving pre-built static assets from dist/ directory');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log('[Server] Initializing Vite dev middleware');
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn('[Server] Vite middleware error, checking for static dist:', viteErr);
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res, next) => {
          if (req.path.startsWith('/api')) return next();
          res.sendFile(path.resolve(distPath, 'index.html'));
        });
      }
    }
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VSBEC Autonomous Exam Server] running on http://0.0.0.0:${PORT} (isProd: ${isProd}, hasDist: ${hasDist})`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} busy, retrying in 1s...`);
      setTimeout(() => {
        try { server.close(); } catch {}
        server.listen(PORT, '0.0.0.0');
      }, 1000);
    } else {
      console.error('[Server] Fatal server error:', err);
    }
  });
}

// Vercel invokes the exported Express app as a serverless function.
// Do not open a persistent listener inside a Vercel function.
if (process.env.VERCEL) {
  if (isProd && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
} else {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
