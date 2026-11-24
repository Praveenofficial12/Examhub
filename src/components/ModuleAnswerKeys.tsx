import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import mammoth from 'mammoth';
import {
  KeyRound,
  Plus,
  Lock,
  Unlock,
  Sparkles,
  CheckCircle2,
  FileCheck,
  Search,
  X,
  Layers,
  UploadCloud,
  Printer,
  Edit3,
  Trash2,
  ArrowLeft,
  FileText,
  Download,
  Zap,
  Eye,
  CheckCheck,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Save,
  RefreshCw,
  FileUp,
  BookmarkCheck,
  ClipboardList,
  Users,
  Bot,
  Send,
  Wand2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ExamAnswerKey,
  QuestionKey,
  DepartmentCode,
  ExamCategory,
  UserSession,
  TeacherAllocation,
  StaffAccount,
  SavedCustomTemplate,
  KeyOption
} from '../types';
import { DEPARTMENT_SUBJECTS } from '../data/departmentSubjectsData';
import { AnswerKeyPrintablePdfModal } from './AnswerKeyPrintablePdfModal';
import { triggerFileDownload } from '../utils/wordDocumentService';
import { printHtmlDocument } from '../utils/printService';
import {
  buildEditableAnswerKeyWordHtml,
  parseCustomAnswerKeyTemplateFile,
  generateSampleCustomAnswerKeyTemplateDocx,
  generateFormattedAnswerKeyDocx,
  generateAnswerKeyVectorPdf,
  syncEditedAnswerKeyHtml,
  estimateQuestionPages,
  estimateAnswerKeyTotalPages
} from '../utils/answerKeyDocx';
import {
  getActiveStaffWorkspace,
  loadAnswerKeyTemplatesForStaff,
  saveAnswerKeyTemplatesForStaff
} from '../utils/staffAuthService';

interface ModuleAnswerKeysProps {
  answerKeys: ExamAnswerKey[];
  onUpdateAnswerKey: (updatedKey: ExamAnswerKey) => void;
  onAddAnswerKey?: (newKey: ExamAnswerKey) => void;
  onDeleteAnswerKey?: (keyId: string) => void;
  session?: UserSession;
  teacherAllocations?: TeacherAllocation[];
  staffAccounts?: StaffAccount[];
}

export interface ExamTypePreset {
  id: string;
  label: string;
  examCategory: ExamCategory;
  defaultMaxMarks: number;
  defaultDuration: string;
}

const EXAM_TYPE_PRESETS: ExamTypePreset[] = [
  { id: 'internal-1', label: 'INTERNAL TEST - I', examCategory: 'Internal', defaultMaxMarks: 50, defaultDuration: '100 MINS' },
  { id: 'internal-2', label: 'INTERNAL TEST - II', examCategory: 'Internal', defaultMaxMarks: 50, defaultDuration: '100 MINS' },
  { id: 'internal-3', label: 'INTERNAL TEST - III', examCategory: 'Internal', defaultMaxMarks: 50, defaultDuration: '100 MINS' },
  { id: 'cia', label: 'CONTINUOUS INTERNAL ASSESSMENT (CIA)', examCategory: 'Internal', defaultMaxMarks: 50, defaultDuration: '1.5 HOURS' },
  { id: 'unit-test', label: 'UNIT TEST / ASSESSMENT', examCategory: 'Internal', defaultMaxMarks: 25, defaultDuration: '45 MINS' },
  { id: 'model', label: 'MODEL EXAMINATION', examCategory: 'Model', defaultMaxMarks: 100, defaultDuration: '3 HOURS' },
  { id: 'semester', label: 'END SEMESTER EXAMINATION', examCategory: 'Semester', defaultMaxMarks: 100, defaultDuration: '3 HOURS' },
  { id: 'lab-viva', label: 'LABORATORY / VIVA VOCE', examCategory: 'Semester', defaultMaxMarks: 100, defaultDuration: '3 HOURS' }
];

function countWords(text?: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getTargetWordRangeForMarks(marks: number): string {
  if (marks <= 3) return '55–85 words (4–6 lines)';
  if (marks <= 6) return '280–380 words (~0.8 Page)';
  if (marks <= 10) return '520–720 words (~1 to 1.5 Pages)';
  if (marks <= 14) return '760–980 words (~1.6 to 2.1 Pages)';
  return '1,050–1,400+ words (~2 to 2.5+ Pages)';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      const idx = res.indexOf(',');
      resolve(idx >= 0 ? res.slice(idx + 1) : res);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export const ModuleAnswerKeys: React.FC<ModuleAnswerKeysProps> = ({
  answerKeys,
  onUpdateAnswerKey,
  onAddAnswerKey,
  onDeleteAnswerKey,
  session,
  teacherAllocations = [],
  staffAccounts = []
}) => {
  // Active Staff Workspace Isolation
  const staffWorkspace = getActiveStaffWorkspace(session, staffAccounts);
  const activeStaffId = staffWorkspace.staffId;
  const activeStaffName = staffWorkspace.staffName;
  const isStaffScoped = staffWorkspace.isScoped;
  const isAdminGlobal = Boolean(session?.isAdmin && !isStaffScoped);

  // View State: 'hub' (directory + launchpad) vs 'studio' (AI solver + Live Word Editor + Rubrics)
  const [pageMode, setPageMode] = useState<'hub' | 'studio'>('hub');
  const [studioTab, setStudioTab] = useState<'word-studio' | 'rubrics' | 'tracker'>('word-studio');

  // Academic & Class Context Filters
  const [selectedYear, setSelectedYear] = useState<'I' | 'II' | 'III' | 'IV'>('III');
  const [selectedSemester, setSelectedSemester] = useState<number>(5);
  const [selectedSection, setSelectedSection] = useState<'A' | 'B' | 'C' | 'D' | 'ALL'>('A');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('AD3501');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('Deep Neural Networks & Architectures');
  const [selectedExamPresetId, setSelectedExamPresetId] = useState<string>('internal-3');

  // Admin can assign/create answer keys on behalf of any staff member
  const [selectedStaffOwnerId, setSelectedStaffOwnerId] = useState<string>(
    activeStaffId || staffAccounts[0]?.staffId || ''
  );

  // Hub Directory Filters
  const [hubYearFilter, setHubYearFilter] = useState<'ALL' | 'I' | 'II' | 'III' | 'IV'>('ALL');
  const [hubExamFilter, setHubExamFilter] = useState<'ALL' | ExamCategory>('ALL');
  const [hubStaffFilter, setHubStaffFilter] = useState<string>('ALL');
  const [hubSearch, setHubSearch] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Status Toast Banner
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'info' | 'warning'; text: string } | null>(null);
  const showBanner = (type: 'success' | 'info' | 'warning', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => setStatusBanner(null), 5000);
  };

  // Curricular Subjects List for Selected Semester
  const semesterSubjects = useMemo(() => {
    const fromSyllabus = (DEPARTMENT_SUBJECTS['AI&DS'] || []).filter(
      (s) => s.semester === selectedSemester
    );
    const fromAlloc = teacherAllocations
      .filter((a) => a.department === 'AI&DS' && (a.semester === selectedSemester || a.classYear === selectedYear))
      .map((a) => ({ code: a.subjectCode, name: a.subjectName }));
    const map = new Map<string, { code: string; name: string }>();
    fromSyllabus.forEach((s) => map.set(s.code, { code: s.code, name: s.name }));
    fromAlloc.forEach((a) => map.set(a.code, { code: a.code, name: a.name }));
    const list = Array.from(map.values());
    return list.length > 0
      ? list
      : [{ code: 'AD3501', name: 'Deep Neural Networks & Architectures' }];
  }, [selectedSemester, selectedYear, teacherAllocations]);

  useEffect(() => {
    if (semesterSubjects.length > 0 && !semesterSubjects.some((s) => s.code === selectedSubjectCode)) {
      setSelectedSubjectCode(semesterSubjects[0].code);
      setSelectedSubjectName(semesterSubjects[0].name);
    }
  }, [selectedSemester, semesterSubjects]);

  const handleYearChange = (y: 'I' | 'II' | 'III' | 'IV') => {
    setSelectedYear(y);
    if (y === 'I') setSelectedSemester(1);
    else if (y === 'II') setSelectedSemester(3);
    else if (y === 'III') setSelectedSemester(5);
    else setSelectedSemester(7);
  };

  const handleSemesterChange = (sem: number) => {
    setSelectedSemester(sem);
    if (sem <= 2) setSelectedYear('I');
    else if (sem <= 4) setSelectedYear('II');
    else if (sem <= 6) setSelectedYear('III');
    else setSelectedYear('IV');
  };

  // Staff Isolation Filter on Repository Keys
  const scopedAnswerKeys = useMemo(() => {
    return answerKeys.filter((k) => {
      if (k.department !== 'AI&DS') return false;
      if (activeStaffId && k.ownerStaffId && k.ownerStaffId !== activeStaffId) return false;
      return true;
    });
  }, [answerKeys, activeStaffId]);

  const filteredHubKeys = useMemo(() => {
    const q = hubSearch.trim().toLowerCase();
    return scopedAnswerKeys.filter((k) => {
      if (hubYearFilter !== 'ALL' && (k.classYear || (k.semester <= 2 ? 'I' : k.semester <= 4 ? 'II' : k.semester <= 6 ? 'III' : 'IV')) !== hubYearFilter) {
        return false;
      }
      if (hubExamFilter !== 'ALL' && k.examCategory !== hubExamFilter) return false;
      if (isAdminGlobal && hubStaffFilter !== 'ALL' && k.ownerStaffId !== hubStaffFilter) return false;
      if (q) {
        const hay = `${k.subjectCode} ${k.subjectName} ${k.examTypeLabel || ''} ${k.examTitle || ''} ${k.handledBy || ''} ${k.setCode}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scopedAnswerKeys, hubYearFilter, hubExamFilter, hubStaffFilter, hubSearch, isAdminGlobal]);

  // Custom Templates per Staff ID
  const loadedStaffIdRef = useRef<string | null>(activeStaffId);
  const [savedCustomTemplates, setSavedCustomTemplates] = useState<SavedCustomTemplate[]>(() =>
    loadAnswerKeyTemplatesForStaff(activeStaffId)
  );

  useEffect(() => {
    if (loadedStaffIdRef.current === activeStaffId) {
      saveAnswerKeyTemplatesForStaff(activeStaffId, savedCustomTemplates);
    }
  }, [savedCustomTemplates]);

  useEffect(() => {
    const freshTpls = loadAnswerKeyTemplatesForStaff(activeStaffId);
    loadedStaffIdRef.current = activeStaffId;
    setSavedCustomTemplates(freshTpls);
    setConfirmDeleteId(null);
    if (activeStaffId) setSelectedStaffOwnerId(activeStaffId);
  }, [activeStaffId]);

  // Helper to resolve Owner Name
  const resolveFacultyName = (staffId?: string): string => {
    if (activeStaffName && (!staffId || staffId === activeStaffId)) return activeStaffName;
    const foundStaff = staffAccounts.find((s) => s.staffId === staffId);
    if (foundStaff) return foundStaff.staffName;
    const alloc = teacherAllocations.find(
      (a) => a.department === 'AI&DS' && a.subjectCode === selectedSubjectCode
    );
    return alloc?.teacherName || session?.fullName || 'Course Faculty';
  };

  // Build Default Working Answer Key Document
  const createWorkingKeyTemplate = (opts?: {
    presetId?: string;
    year?: 'I' | 'II' | 'III' | 'IV';
    semester?: number;
    section?: 'A' | 'B' | 'C' | 'D' | 'ALL';
    subjectCode?: string;
    subjectName?: string;
    includeValues?: boolean;
  }): ExamAnswerKey => {
    const preset = EXAM_TYPE_PRESETS.find((p) => p.id === (opts?.presetId || selectedExamPresetId)) || EXAM_TYPE_PRESETS[2];
    const yr = opts?.year || selectedYear;
    const sem = opts?.semester || selectedSemester;
    const sec = opts?.section || selectedSection;
    const subCode = opts?.subjectCode || selectedSubjectCode;
    const subName = opts?.subjectName || selectedSubjectName;
    const targetStaffId = activeStaffId || selectedStaffOwnerId || undefined;
    const targetStaffName = resolveFacultyName(targetStaffId);

    return {
      id: `KEY-${subCode}-${preset.id.toUpperCase()}-${Date.now().toString().slice(-4)}`,
      subjectCode: subCode,
      subjectName: subName,
      regulation: '2023 Regulations',
      semester: sem,
      semesterType: sem % 2 === 0 ? 'EVEN' : 'ODD',
      department: 'AI&DS',
      programmeName: `B.TECH AI&DS (Year ${yr} - Section ${sec})`,
      examCategory: preset.examCategory,
      examTitle: preset.label,
      examTypeLabel: preset.label,
      academicYear: '2025-2026',
      examDate: new Date().toISOString().slice(0, 10),
      duration: preset.defaultDuration,
      setCode: 'Set A',
      totalQuestions: 0,
      maximumMarks: preset.defaultMaxMarks,
      createdDate: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
      approvedBy: `${targetStaffName} • Approved by HOD AI&DS`,
      isLocked: false,
      questions: [],
      classYear: yr,
      section: sec,
      handledBy: targetStaffName,
      ownerStaffId: targetStaffId,
      ownerStaffName: targetStaffName,
      templateMode: 'default',
      includeValues: opts?.includeValues ?? false
    };
  };

  // Studio Working Document State
  const [workingKey, setWorkingKey] = useState<ExamAnswerKey>(() => createWorkingKeyTemplate());
  const [wordHtml, setWordHtml] = useState<string>(() => buildEditableAnswerKeyWordHtml(workingKey));
  const [isWordEditing, setIsWordEditing] = useState<boolean>(true);
  const [editorHasManualEdits, setEditorHasManualEdits] = useState<boolean>(false);
  const wordEditorRef = useRef<HTMLDivElement>(null);

  // Custom Template Upload State
  const [customTemplateError, setCustomTemplateError] = useState<string>('');
  const [isDraggingTemplate, setIsDraggingTemplate] = useState<boolean>(false);
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  // AI Question Paper Upload & Solve State
  const [qpFileName, setQpFileName] = useState<string>('');
  const [qpMimeType, setQpMimeType] = useState<string>('');
  const [qpBase64Data, setQpBase64Data] = useState<string>('');
  const [qpRawText, setQpRawText] = useState<string>('');
  const [answerDepthMode, setAnswerDepthMode] = useState<'mark-proportional' | 'concise' | 'exhaustive'>('mark-proportional');
  const [isSolvingAi, setIsSolvingAi] = useState<boolean>(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string>('');
  const [regeneratingQNo, setRegeneratingQNo] = useState<number | null>(null);
  const qpFileInputRef = useRef<HTMLInputElement>(null);

  // AI Answer Key Support Assistant State
  const [supportTargetQNo, setSupportTargetQNo] = useState<'all' | number>('all');
  const [supportPrompt, setSupportPrompt] = useState<string>('');
  const [isRunningSupport, setIsRunningSupport] = useState<boolean>(false);
  const [supportMessages, setSupportMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; text: string; provider?: string }>
  >([]);

  // Printable Official PDF Modal State
  const [pdfModalKey, setPdfModalKey] = useState<ExamAnswerKey | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Sync contentEditable DOM cleanly when wordHtml programmatically rebuilds
  useEffect(() => {
    if (wordEditorRef.current && pageMode === 'studio' && studioTab === 'word-studio') {
      if (wordEditorRef.current.innerHTML !== wordHtml) {
        wordEditorRef.current.innerHTML = wordHtml;
      }
    }
  }, [wordHtml, pageMode, studioTab]);

  const rebuildWordPreview = (nextKey: ExamAnswerKey, toastText?: string) => {
    const cleanKey = { ...nextKey, updatedAt: new Date().toISOString() };
    setWorkingKey(cleanKey);
    const html = buildEditableAnswerKeyWordHtml(cleanKey);
    setWordHtml(html);
    setEditorHasManualEdits(false);
    if (wordEditorRef.current) {
      wordEditorRef.current.innerHTML = html;
    }
    if (toastText) showBanner('success', toastText);
  };

  // Capture any live manual typing edits made directly in the Word canvas
  const captureSyncedKey = (): ExamAnswerKey => {
    const currentHtml = wordEditorRef.current ? wordEditorRef.current.innerHTML : wordHtml;
    const synced = editorHasManualEdits
      ? syncEditedAnswerKeyHtml(currentHtml, workingKey)
      : { ...workingKey, editedWordHtml: currentHtml };
    return {
      ...synced,
      ownerStaffId: activeStaffId || synced.ownerStaffId || selectedStaffOwnerId,
      ownerStaffName: activeStaffName || synced.ownerStaffName || synced.handledBy
    };
  };

  // Open existing key in Studio (Word Editor or Rubric Editor)
  const handleOpenKeyInStudio = (key: ExamAnswerKey, tab: 'word-studio' | 'rubrics' = 'word-studio') => {
    const hydrated: ExamAnswerKey = {
      ...key,
      includeValues: key.questions.length > 0,
      templateMode: key.templateMode || 'default',
      examTypeLabel: key.examTypeLabel || key.examTitle || 'INTERNAL TEST - III',
      semesterType: key.semesterType || (key.semester % 2 === 0 ? 'EVEN' : 'ODD')
    };
    setWorkingKey(hydrated);
    const html = hydrated.editedWordHtml || buildEditableAnswerKeyWordHtml(hydrated);
    setWordHtml(html);
    setEditorHasManualEdits(false);
    setSelectedSemester(hydrated.semester);
    setSelectedYear(hydrated.classYear || (hydrated.semester <= 2 ? 'I' : hydrated.semester <= 4 ? 'II' : hydrated.semester <= 6 ? 'III' : 'IV'));
    setSelectedSection((hydrated.section as any) || 'A');
    setSelectedSubjectCode(hydrated.subjectCode);
    setSelectedSubjectName(hydrated.subjectName);
    if (hydrated.ownerStaffId) {
      setSelectedStaffOwnerId(hydrated.ownerStaffId);
    }
    setStudioTab(tab);
    setPageMode('studio');
  };

  // Start a new Answer Key in Studio
  const handleCreateNewAnswerKey = (opts?: {
    presetId?: string;
    year?: 'I' | 'II' | 'III' | 'IV';
    semester?: number;
    section?: 'A' | 'B' | 'C' | 'D';
    subjectCode?: string;
    subjectName?: string;
  }) => {
    const fresh = createWorkingKeyTemplate({
      presetId: opts?.presetId,
      year: opts?.year,
      semester: opts?.semester,
      section: opts?.section,
      subjectCode: opts?.subjectCode,
      subjectName: opts?.subjectName,
      includeValues: false
    });
    if (opts?.year) setSelectedYear(opts.year);
    if (opts?.semester) setSelectedSemester(opts.semester);
    if (opts?.section) setSelectedSection(opts.section);
    if (opts?.subjectCode) setSelectedSubjectCode(opts.subjectCode);
    if (opts?.subjectName) setSelectedSubjectName(opts.subjectName);
    setQpRawText('');
    setQpFileName('');
    setQpBase64Data('');
    setQpMimeType('');
    rebuildWordPreview(fresh);
    setStudioTab('word-studio');
    setPageMode('studio');
  };

  // Handle Uploaded Question Paper File (PDF, Image, DOCX, TXT)
  const handleQpFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showBanner('warning', `File "${file.name}" exceeds 10 MB limit. Please upload a smaller PDF/image or paste the questions.`);
      e.target.value = '';
      return;
    }
    setQpFileName(file.name);
    const ext = file.name.toLowerCase().split('.').pop() || '';

    try {
      if (ext === 'docx') {
        const buf = await file.arrayBuffer();
        const extracted = await mammoth.extractRawText({ arrayBuffer: buf });
        setQpRawText(extracted.value || '');
        setQpBase64Data('');
        setQpMimeType('');
        showBanner('success', `Extracted text from Word Question Paper "${file.name}". Ready for fast parallel AI Answer Generation!`);
      } else if (ext === 'pdf' || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        const b64 = await fileToBase64(file);
        setQpBase64Data(b64);
        setQpMimeType(file.type || (ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`));
        setQpRawText(`[Uploaded ${ext.toUpperCase()} Question Paper: ${file.name} — Gemini AI will read questions directly from this file.]`);
        showBanner('success', `Loaded ${ext.toUpperCase()} Question Paper "${file.name}" for fast parallel Gemini AI extraction.`);
      } else {
        const txt = await file.text();
        setQpRawText(txt.slice(0, 12000));
        setQpBase64Data('');
        setQpMimeType('');
        showBanner('success', `Loaded text Question Paper "${file.name}".`);
      }
    } catch (err: any) {
      showBanner('warning', `Could not read file "${file.name}": ${err?.message || 'Unknown error'}`);
    } finally {
      e.target.value = '';
    }
  };

  // Normalize API question list strictly respecting Part A / B / C and exact detected marks
  const mapSolverQuestions = (rawQuestions: any[]): QuestionKey[] => {
    return rawQuestions.map((q: any, idx: number) => {
      const explicitMarks = Number(q.positiveMarks);
      const resolvedPart: 'Part A' | 'Part B' | 'Part C' =
        q.part === 'Part A' || q.part === 'Part B' || q.part === 'Part C'
          ? q.part
          : explicitMarks >= 14
          ? 'Part C'
          : explicitMarks > 0 && explicitMarks <= 3
          ? 'Part A'
          : 'Part B';

      const marks =
        explicitMarks > 0
          ? explicitMarks
          : resolvedPart === 'Part A'
          ? 2
          : resolvedPart === 'Part C'
          ? 16
          : 8;

      return {
        questionNo: Number(q.questionNo) || idx + 1,
        part: resolvedPart,
        subDivision: String(q.subDivision || q.questionNo || idx + 1),
        questionText: String(q.questionText || q.topic || `Question ${idx + 1}`),
        topic: String(q.topic || `${workingKey.subjectName} Concept`),
        keyOption: 'Descriptive' as KeyOption,
        positiveMarks: marks,
        negativeMarks: 0,
        cognitiveLevel:
          q.cognitiveLevel ||
          (resolvedPart === 'Part A' ? 'K2 - Understand' : resolvedPart === 'Part C' ? 'K5 - Evaluate' : 'K4 - Analyze'),
        mappedSyllabusUnit: `Unit ${(idx % 5) + 1}`,
        courseOutcome: (q.courseOutcome || `CO${(idx % 5) + 1}`) as any,
        status: 'Active',
        expectedAnswer: String(q.expectedAnswer || ''),
        rubricBreakdown:
          Array.isArray(q.rubricBreakdown) && q.rubricBreakdown.length > 0
            ? q.rubricBreakdown
            : [
                { stepNo: 1, description: 'Concept / Core Formulation', marks: Math.ceil(marks * 0.5) },
                { stepNo: 2, description: 'Steps / Explanation / Verification', marks: Math.max(1, marks - Math.ceil(marks * 0.5)) }
              ]
      };
    });
  };

  // Generate Mark-Sized Answers using Fast Parallel Streaming Server-Side Gemini AI
  const handleGenerateAnswersWithAi = async () => {
    if (!qpRawText.trim() && !qpBase64Data) {
      showBanner('warning', 'Please upload a Question Paper (PDF/DOCX/Image/TXT) or paste/load sample questions first.');
      return;
    }

    setIsSolvingAi(true);
    setAiStatusMessage('Extracting questions & launching parallel AI batch solvers...');

    const payload = {
      subjectCode: workingKey.subjectCode,
      subjectName: workingKey.subjectName,
      semester: workingKey.semester,
      examCategory: workingKey.examCategory || 'Internal',
      examTitle: workingKey.examTypeLabel || workingKey.examTitle,
      regulation: workingKey.regulation,
      maxMarks: workingKey.maximumMarks,
      answerDepthMode,
      questionPaperText: qpRawText,
      mimeType: qpMimeType || undefined,
      fileData: qpBase64Data || undefined
    };

    try {
      const response = await fetch('/api/ai/solve-question-paper-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Solver HTTP ${response.status}`);
      }

      let finalQuestions: QuestionKey[] = [];
      let finalProvider = 'gemini_ai';
      let quotaNotice: string | undefined;
      let currentSnapshotDoc: ExamAnswerKey = workingKey;

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          try {
            const evt = JSON.parse(trimmed);
            if (evt.message) {
              setAiStatusMessage(String(evt.message));
            }
            if (evt.quotaNotice) {
              quotaNotice = String(evt.quotaNotice);
            }
            if (Array.isArray(evt.questions) && evt.questions.length > 0) {
              finalQuestions = mapSolverQuestions(evt.questions);
              if (evt.provider) finalProvider = evt.provider;
              currentSnapshotDoc = {
                ...workingKey,
                includeValues: true,
                questions: finalQuestions,
                totalQuestions: finalQuestions.length,
                uploadedQuestionPaperName: qpFileName || workingKey.uploadedQuestionPaperName || `${workingKey.subjectCode}_QP`,
                editedWordHtml: undefined,
                updatedAt: new Date().toISOString()
              };
              rebuildWordPreview(currentSnapshotDoc);
            }
          } catch {
            // Skip partial chunk lines safely
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          lines.forEach(processLine);
        }
        if (buffer.trim()) {
          processLine(buffer);
        }
      } else {
        // Fallback if stream body isn't supported in browser environment
        const fallbackRes = await fetch('/api/ai/solve-question-paper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await fallbackRes.json();
        if (!fallbackRes.ok || !Array.isArray(data.questions)) {
          throw new Error(data.error || 'AI solver returned an invalid response.');
        }
        finalQuestions = mapSolverQuestions(data.questions);
        finalProvider = data.provider || 'gemini_ai';
        if (data.quotaNotice) quotaNotice = String(data.quotaNotice);
        currentSnapshotDoc = {
          ...workingKey,
          includeValues: true,
          questions: finalQuestions,
          totalQuestions: finalQuestions.length,
          uploadedQuestionPaperName: qpFileName || workingKey.uploadedQuestionPaperName || `${workingKey.subjectCode}_QP`,
          editedWordHtml: undefined,
          updatedAt: new Date().toISOString()
        };
        rebuildWordPreview(currentSnapshotDoc);
      }

      if (finalQuestions.length === 0) {
        throw new Error('No questions could be extracted from the provided paper.');
      }

      const estPages = estimateAnswerKeyTotalPages(currentSnapshotDoc);
      showBanner(
        quotaNotice ? 'warning' : 'success',
        quotaNotice
          ? `Generated ${finalQuestions.length} mark-sized answers (~${estPages} A4 pages). ${quotaNotice}`
          : `Generated ${finalQuestions.length} mark-sized answers (~${estPages} A4 pages via ${finalProvider === 'gemini_ai' ? 'Fast Parallel Gemini AI' : 'Autonomous Syllabus Engine'}) directly inside your Word template!`
      );
      confetti({ particleCount: 55, spread: 70 });
    } catch (err: any) {
      showBanner('warning', `AI Answer Generation encountered an issue: ${err?.message || 'Try again'}`);
    } finally {
      setIsSolvingAi(false);
      setAiStatusMessage('');
    }
  };

  // Regenerate Single Question's Answer Proportionally to Its Marks
  const handleRegenerateSingleQuestion = async (qItem: QuestionKey) => {
    setRegeneratingQNo(qItem.questionNo);
    try {
      const promptLine = `${qItem.part || 'Part B'}\n${qItem.subDivision || qItem.questionNo}) ${qItem.questionText || qItem.topic} [${qItem.positiveMarks} Marks]`;
      const res = await fetch('/api/ai/solve-question-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectCode: workingKey.subjectCode,
          subjectName: workingKey.subjectName,
          semester: workingKey.semester,
          examCategory: workingKey.examCategory || 'Internal',
          examTitle: workingKey.examTypeLabel || workingKey.examTitle,
          regulation: workingKey.regulation,
          maxMarks: workingKey.maximumMarks,
          answerDepthMode,
          questionPaperText: promptLine
        })
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.questions) && data.questions[0]) {
        const refreshed = data.questions[0];
        const nextQuestions = workingKey.questions.map((q) =>
          q.questionNo === qItem.questionNo
            ? {
                ...q,
                expectedAnswer: String(refreshed.expectedAnswer || q.expectedAnswer),
                rubricBreakdown: refreshed.rubricBreakdown || q.rubricBreakdown
              }
            : q
        );
        rebuildWordPreview(
          { ...workingKey, questions: nextQuestions, includeValues: true },
          `Regenerated ${qItem.positiveMarks}-mark answer (~${estimateQuestionPages({ ...qItem, expectedAnswer: String(refreshed.expectedAnswer || qItem.expectedAnswer) })} pages) for Q.${qItem.subDivision || qItem.questionNo}!`
        );
      }
    } catch (err: any) {
      showBanner('warning', `Failed regenerating Q.${qItem.questionNo}: ${err?.message}`);
    } finally {
      setRegeneratingQNo(null);
    }
  };

  // Interactive AI Answer Key Generation Support Assistant
  const handleRunAiSupport = async (
    actionType: 'fix-all' | 'add-diagrams' | 'verify-rubrics' | 'expand-answers' | 'custom',
    customInstructionOverride?: string
  ) => {
    const instruction = (customInstructionOverride ?? supportPrompt).trim();
    if (actionType === 'custom' && !instruction) {
      showBanner('warning', 'Enter an instruction or click one of the AI Support actions.');
      return;
    }

    const captured = captureSyncedKey();
    if (captured.questions.length === 0) {
      if (qpRawText.trim() || qpBase64Data) {
        setSupportMessages((prev) => [
          ...prev,
          {
            id: `sup-u-${Date.now()}`,
            role: 'user',
            text: 'No solved questions yet — solving the uploaded question paper first.'
          }
        ]);
        await handleGenerateAnswersWithAi();
        return;
      }
      setSupportMessages((prev) => [
        ...prev,
        {
          id: `sup-a-${Date.now()}`,
          role: 'assistant',
          text: 'Upload a Question Paper (PDF/DOCX/Image/Text) or paste questions below, then run AI Support to solve, diagram, and verify every question.'
        }
      ]);
      showBanner('info', 'Upload or paste a Question Paper first so AI Support can solve or refine it.');
      return;
    }

    const actionLabels: Record<typeof actionType, string> = {
      'fix-all': 'Fix, clarify & complete all answers cleanly with point-wise subheadings',
      'add-diagrams': 'Add crisp ASCII flowcharts & architecture diagrams where helpful',
      'verify-rubrics': 'Verify & balance mark-split rubrics for every question',
      'expand-answers': 'Expand answers proportionally to exact A4 mark-size targets (2M / 8M / 16M)',
      custom: instruction
    };

    const userText =
      supportTargetQNo === 'all'
        ? actionLabels[actionType]
        : `[Q.${supportTargetQNo}] ${actionLabels[actionType]}`;

    setSupportMessages((prev) => [
      ...prev.slice(-5),
      { id: `sup-u-${Date.now()}`, role: 'user', text: userText }
    ]);
    if (actionType === 'custom') setSupportPrompt('');
    setIsRunningSupport(true);

    try {
      const res = await fetch('/api/ai/answer-key-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectCode: captured.subjectCode,
          subjectName: captured.subjectName,
          semester: captured.semester,
          regulation: captured.regulation,
          examTitle: captured.examTypeLabel || captured.examTitle,
          actionType,
          targetQuestionNo: supportTargetQNo,
          instruction,
          questions: captured.questions
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Support HTTP ${res.status}`);
      }

      if (Array.isArray(data.updatedQuestions) && data.updatedQuestions.length > 0) {
        const normalized = mapSolverQuestions(data.updatedQuestions);
        rebuildWordPreview(
          {
            ...captured,
            includeValues: true,
            questions: normalized,
            totalQuestions: normalized.length,
            editedWordHtml: undefined
          },
          `AI Answer Key Support updated ${normalized.length} questions inside the Live Word Sheet.`
        );
      }

      setSupportMessages((prev) => [
        ...prev.slice(-5),
        {
          id: `sup-a-${Date.now()}`,
          role: 'assistant',
          text: String(data.assistantReply || 'Answer key verified and updated inside the Live Word Sheet.'),
          provider: data.provider || 'gemini_ai'
        }
      ]);
    } catch (err: any) {
      setSupportMessages((prev) => [
        ...prev.slice(-5),
        {
          id: `sup-a-${Date.now()}`,
          role: 'assistant',
          text: `Support request issue: ${err?.message || 'Please retry'}`
        }
      ]);
      showBanner('warning', `AI Support error: ${err?.message || 'Try again'}`);
    } finally {
      setIsRunningSupport(false);
    }
  };

  // Custom Template Upload Processing
  const processCustomTemplateFile = async (file: File) => {
    setCustomTemplateError('');
    const parsed = await parseCustomAnswerKeyTemplateFile(file);
    if (!parsed.success) {
      setCustomTemplateError(parsed.error || 'Could not parse template file.');
      return;
    }

    const entry: SavedCustomTemplate = {
      id: `AKTPL-${Date.now()}`,
      name: file.name,
      html: parsed.html,
      placeholders: parsed.placeholders,
      uploadedAt: new Date().toLocaleString('en-IN'),
      ownerStaffId: activeStaffId || undefined,
      ownerStaffName: activeStaffName || session?.fullName || undefined,
      category: 'answer-key'
    };

    setSavedCustomTemplates((prev) => [entry, ...prev.filter((t) => t.name !== file.name)]);
    rebuildWordPreview(
      {
        ...workingKey,
        templateMode: 'custom',
        customTemplateName: file.name,
        uploadedTemplateName: file.name,
        customTemplateHtml: parsed.html
      },
      `Custom Word Template "${file.name}" applied inside Live Word Editor!`
    );
    confetti({ particleCount: 35, spread: 55 });
  };

  const handleUploadCustomTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processCustomTemplateFile(file);
    e.target.value = '';
  };

  const handleDownloadSampleCustomTemplate = async () => {
    const blob = await generateSampleCustomAnswerKeyTemplateDocx();
    triggerFileDownload(blob, 'VSBEC_Blank_Answer_Key_Template.docx');
    showBanner('success', 'Downloaded Blank Answer Key Word Template (.docx).');
  };

  // Rich Text Word Toolbar Commands
  const execWordFormat = (command: string, value?: string) => {
    if (wordEditorRef.current) {
      wordEditorRef.current.focus();
      document.execCommand(command, false, value);
      setWordHtml(wordEditorRef.current.innerHTML);
      setEditorHasManualEdits(true);
    }
  };

  const handleInsertAnswerSubheading = () => {
    if (wordEditorRef.current) {
      wordEditorRef.current.focus();
      const node = document.createElement('p');
      node.style.margin = '10px 0 4px 12px';
      node.style.fontWeight = 'bold';
      node.style.fontSize = '13.5px';
      node.textContent = '1. New Key Section Heading (Click to edit)';
      wordEditorRef.current.appendChild(node);
      setWordHtml(wordEditorRef.current.innerHTML);
      setEditorHasManualEdits(true);
    }
  };

  // Save / Finalize Answer Key into Staff/Department Repository
  const handleSaveAnswerKey = (lockFinal: boolean = false) => {
    const captured = captureSyncedKey();
    const finalDoc: ExamAnswerKey = {
      ...captured,
      totalQuestions: captured.questions.length,
      isLocked: lockFinal ? true : captured.isLocked,
      updatedAt: new Date().toISOString()
    };

    setWorkingKey(finalDoc);
    setWordHtml(finalDoc.editedWordHtml || buildEditableAnswerKeyWordHtml(finalDoc));
    setEditorHasManualEdits(false);

    const exists = answerKeys.some((k) => k.id === finalDoc.id);
    if (exists) {
      onUpdateAnswerKey(finalDoc);
    } else if (onAddAnswerKey) {
      onAddAnswerKey(finalDoc);
    } else {
      onUpdateAnswerKey(finalDoc);
    }

    confetti({ particleCount: lockFinal ? 65 : 35, spread: 70 });
    showBanner(
      'success',
      lockFinal
        ? `Approved & Finalized Answer Key for ${finalDoc.subjectCode} (${finalDoc.examTypeLabel}) under ${finalDoc.handledBy}!`
        : `Saved Answer Key draft for ${finalDoc.subjectCode} (${finalDoc.examTypeLabel}).`
    );
  };

  // Download Aligned Word (.docx)
  const handleDownloadWordDocx = async (target?: ExamAnswerKey) => {
    const docToExport = target || captureSyncedKey();
    if (!target) {
      setWorkingKey(docToExport);
    }
    const blob = await generateFormattedAnswerKeyDocx(docToExport);
    const cleanSub = (docToExport.subjectCode || 'AnswerKey').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName =
      docToExport.includeValues === false && docToExport.questions.length === 0
        ? 'VSBEC_Official_Blank_Answer_Key_Template.docx'
        : `VSBEC_${cleanSub}_Sem0${docToExport.semester}_${(docToExport.examTypeLabel || docToExport.examCategory || 'Exam').replace(/[^a-zA-Z0-9]+/g, '_')}_AnswerKey.docx`;
    triggerFileDownload(blob, fileName);
    confetti({ particleCount: 40, spread: 55 });
    showBanner('success', `Downloaded aligned Word (.docx): ${fileName}`);
  };

  // Download Aligned Vector PDF (.pdf)
  const handleDownloadPdf = (target?: ExamAnswerKey) => {
    const docToExport = target || captureSyncedKey();
    if (!target) {
      setWorkingKey(docToExport);
    }
    const blob = generateAnswerKeyVectorPdf(docToExport);
    const cleanSub = (docToExport.subjectCode || 'AnswerKey').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName =
      docToExport.includeValues === false && docToExport.questions.length === 0
        ? 'VSBEC_Official_Blank_Answer_Key_Template.pdf'
        : `VSBEC_${cleanSub}_Sem0${docToExport.semester}_${(docToExport.examTypeLabel || docToExport.examCategory || 'Exam').replace(/[^a-zA-Z0-9]+/g, '_')}_AnswerKey.pdf`;
    triggerFileDownload(blob, fileName);
    confetti({ particleCount: 35, spread: 55 });
    showBanner('success', `Downloaded aligned PDF: ${fileName}`);
  };

  // Download Blank Template directly from Hub
  const handleDownloadBlankTemplateDocx = async () => {
    const blank = createWorkingKeyTemplate({ includeValues: false });
    const blob = await generateFormattedAnswerKeyDocx(blank);
    triggerFileDownload(blob, 'VSBEC_Official_Blank_Answer_Key_Template.docx');
    showBanner('success', 'Downloaded Blank Official VSBEC Answer Key Template (.docx).');
  };

  const handleDownloadBlankTemplatePdf = () => {
    const blank = createWorkingKeyTemplate({ includeValues: false });
    const blob = generateAnswerKeyVectorPdf(blank);
    triggerFileDownload(blob, 'VSBEC_Official_Blank_Answer_Key_Template.pdf');
    showBanner('success', 'Downloaded Blank Official VSBEC Answer Key Template (.pdf).');
  };

  // Direct Website Printout (Isolated A4 Print Iframe)
  const handleDirectPrint = () => {
    const captured = captureSyncedKey();
    const htmlToPrint =
      wordEditorRef.current?.innerHTML ||
      captured.editedWordHtml ||
      buildEditableAnswerKeyWordHtml(captured);
    const title = `VSBEC Answer Key - ${captured.subjectCode} (${captured.examTypeLabel || captured.examTitle})`;
    printHtmlDocument(title, htmlToPrint);
  };

  // Structured Question Editing inside Tab 2
  const handleUpdateQuestionField = (qNo: number, patch: Partial<QuestionKey>) => {
    const nextQs = workingKey.questions.map((q) => (q.questionNo === qNo ? { ...q, ...patch } : q));
    const nextMax = nextQs.reduce((s, q) => s + (Number(q.positiveMarks) || 0), 0);
    rebuildWordPreview({
      ...workingKey,
      questions: nextQs,
      totalQuestions: nextQs.length,
      maximumMarks: workingKey.maximumMarks || nextMax
    });
  };

  const handleAddManualQuestion = (part: 'Part A' | 'Part B' | 'Part C') => {
    const nextNo = workingKey.questions.length + 1;
    const defaultMarks = part === 'Part A' ? 2 : part === 'Part B' ? 8 : 16;
    const newQ: QuestionKey = {
      questionNo: nextNo,
      part,
      subDivision: part === 'Part A' ? `${nextNo}` : `${nextNo}a)`,
      questionText: `Enter ${part} question ${nextNo} text here...`,
      topic: `${workingKey.subjectName} Topic`,
      keyOption: 'Descriptive',
      positiveMarks: defaultMarks,
      negativeMarks: 0,
      cognitiveLevel: part === 'Part A' ? 'K2 - Understand' : 'K4 - Analyze',
      mappedSyllabusUnit: `Unit ${(nextNo % 5) + 1}`,
      courseOutcome: `CO${((nextNo - 1) % 5) + 1}` as any,
      status: 'Active',
      expectedAnswer:
        part === 'Part A'
          ? '1. Core Concept & Key Points\n- Definition: Enter concise 2-mark definition here.\n- Key Feature: Mention operational principle or significance.'
          : '1. Main Concept Overview\n- Enter key formulation and steps here.\n\n2. Workflow Flowchart / Architecture\n```diagram\n+-------------+     +---------------+     +-------------+\n| Input Stage | --> | Process Logic | --> | Output Data |\n+-------------+     +---------------+     +-------------+\n```\n\n3. Detailed Methodology\n- Elaborate algorithmic steps proportional to marks.',
      rubricBreakdown: [
        { stepNo: 1, description: 'Concept / Steps', marks: Math.ceil(defaultMarks * 0.5) },
        { stepNo: 2, description: 'Verification / Summary', marks: Math.max(1, defaultMarks - Math.ceil(defaultMarks * 0.5)) }
      ]
    };
    rebuildWordPreview(
      {
        ...workingKey,
        includeValues: true,
        questions: [...workingKey.questions, newQ],
        totalQuestions: workingKey.questions.length + 1
      },
      `Added Q.${newQ.subDivision} (${part}, ${defaultMarks}M).`
    );
  };

  const handleDeleteQuestionItem = (qNo: number) => {
    const nextQs = workingKey.questions
      .filter((q) => q.questionNo !== qNo)
      .map((q, i) => ({ ...q, questionNo: i + 1 }));
    rebuildWordPreview({
      ...workingKey,
      questions: nextQs,
      totalQuestions: nextQs.length
    });
  };

  // Hub Analytics
  const hubMetrics = useMemo(() => {
    const lockedCount = scopedAnswerKeys.filter((k) => k.isLocked).length;
    const classesCovered = new Set(
      scopedAnswerKeys.map((k) => `Yr ${k.classYear || 'III'}-${k.section || 'A'}`)
    );
    const examTypesCovered = new Set(
      scopedAnswerKeys.map((k) => k.examTypeLabel || k.examCategory || 'Internal')
    );
    return {
      total: scopedAnswerKeys.length,
      locked: lockedCount,
      drafts: scopedAnswerKeys.length - lockedCount,
      classesCount: classesCovered.size,
      examTypesCount: examTypesCovered.size,
      templatesCount: 1 + savedCustomTemplates.length
    };
  }, [scopedAnswerKeys, savedCustomTemplates]);

  return (
    <div className="space-y-5 pb-4 print-reset-layout">
      {/* Status Toast Banner */}
      <AnimatePresence>
        {statusBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold shadow-sm no-print ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : statusBanner.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-blue-50 border-blue-300 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusBanner.text}</span>
            </div>
            <button onClick={() => setStatusBanner(null)} className="p-1 hover:bg-black/5 rounded-lg cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MODE 1: ANSWER KEY GENERATION HUB (MIRRORS MARK STATEMENT CENTER)
         ===================================================================== */}
      {pageMode === 'hub' && (
        <div className="space-y-6 no-print">
          {/* 1. Hero Header Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-[#781717] text-amber-300 shadow-md shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {isStaffScoped && activeStaffName
                      ? `${activeStaffName} — Answer Key Generation Center`
                      : 'Answer Key Generation Center — AI&DS Department'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider">
                    AI Question Solver • Word &amp; PDF
                  </span>
                  {isStaffScoped && activeStaffId ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black font-mono">
                      🔒 Private Vault: {activeStaffId}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-black">
                      👑 All Staffs &amp; All Exams View
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                  {isStaffScoped
                    ? `Isolated Answer Key workspace for ${activeStaffName} (${activeStaffId}). Upload any Question Paper (PDF/DOCX/Image/Text), generate mark-weighted answers with AI inside Default or Custom Word Templates, live-edit in Word layout, and export perfectly aligned .DOCX or .PDF.`
                    : 'Generate AI-powered mark-size answers from uploaded Question Papers across all faculty staffs, all classes (Years I–IV, Sections A–D), and all exam types (Internal I/II/III, CIA, Unit Test, Model & End Semester).'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleCreateNewAnswerKey()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-black text-xs shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>+ Generate New Answer Key (AI Studio)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadBlankTemplateDocx}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#781717]" />
                <span>Blank Template (.docx)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadBlankTemplatePdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-rose-700" />
                <span>Blank Template (.pdf)</span>
              </button>
            </div>
          </div>

          {/* 2. Four Summary Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Generated Answer Keys</span>
                <BookmarkCheck className="w-4 h-4 text-[#781717]" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">{hubMetrics.total}</div>
              <div className="text-[11px] text-slate-600 mt-1">
                <span className="font-bold text-emerald-700">{hubMetrics.locked} Finalized</span> •{' '}
                <span className="font-bold text-amber-700">{hubMetrics.drafts} Editable Drafts</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Classes &amp; Exam Types</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-700 font-mono">
                {hubMetrics.classesCount} / {hubMetrics.examTypesCount}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Supports Internal I/II/III, Model &amp; Semester
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Active Staff Members</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {isStaffScoped ? 1 : Math.max(staffAccounts.length, 6)}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                {isStaffScoped ? `Scoped: ${activeStaffId}` : 'Per-Staff Isolated Storage Enabled'}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Word Templates Saved</span>
                <ClipboardList className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {hubMetrics.templatesCount}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Official VSBEC Layout + {savedCustomTemplates.length} Custom .DOCX
              </div>
            </div>
          </div>

          {/* 3. Quick Generator Launchpad by Class, Subject & Exam Type */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#781717]" />
                  <span>Quick Launch: Select Class, Subject &amp; Exam Type</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure class &amp; exam type below and jump straight into AI Question Paper upload &amp; Live Word Answer Key Studio.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 cursor-pointer"
                >
                  <option value="I">Year I (Sem 1–2)</option>
                  <option value="II">Year II (Sem 3–4)</option>
                  <option value="III">Year III (Sem 5–6)</option>
                  <option value="IV">Year IV (Sem 7–8)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => handleSemesterChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-[#781717] cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester 0{s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Class Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 cursor-pointer"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                  <option value="ALL">All Sections</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Exam Type</label>
                <select
                  value={selectedExamPresetId}
                  onChange={(e) => setSelectedExamPresetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 cursor-pointer"
                >
                  {EXAM_TYPE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.defaultMaxMarks}M)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subject</label>
                <select
                  value={selectedSubjectCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedSubjectCode(code);
                    const f = semesterSubjects.find((s) => s.code === code);
                    if (f) setSelectedSubjectName(f.name);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 cursor-pointer"
                >
                  {semesterSubjects.map((sub) => (
                    <option key={sub.code} value={sub.code}>
                      {sub.code} — {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-700">
                Ready for <strong className="text-[#781717]">{selectedSubjectCode} • {selectedSubjectName}</strong> — Year {selectedYear} / Sem 0{selectedSemester} / Sec {selectedSection} • Staff:{' '}
                <strong className="text-slate-900">{resolveFacultyName(selectedStaffOwnerId)}</strong>
              </div>
              <button
                type="button"
                onClick={() => handleCreateNewAnswerKey()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-black text-xs cursor-pointer shadow-xs shrink-0"
              >
                <UploadCloud className="w-4 h-4 text-amber-300" />
                <span>Upload Question Paper &amp; Open Studio</span>
              </button>
            </div>
          </div>

          {/* 4. Generated Answer Keys Repository Table / Grid */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#781717]" />
                    <span>Generated Answer Keys Repository ({filteredHubKeys.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Open any answer key in the Live Word Editor, adjust step rubrics, print, or download aligned .DOCX and .PDF copies.
                  </p>
                </div>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdminGlobal ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3`}>
                <select
                  value={hubYearFilter}
                  onChange={(e) => setHubYearFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="ALL">All Academic Years (I–IV)</option>
                  <option value="I">Year I</option>
                  <option value="II">Year II</option>
                  <option value="III">Year III</option>
                  <option value="IV">Year IV</option>
                </select>

                <select
                  value={hubExamFilter}
                  onChange={(e) => setHubExamFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="ALL">All Exam Types</option>
                  <option value="Internal">Internal Tests / CIA / Unit</option>
                  <option value="Model">Model Examinations</option>
                  <option value="Semester">End Semester / Practical</option>
                </select>

                {isAdminGlobal && (
                  <select
                    value={hubStaffFilter}
                    onChange={(e) => setHubStaffFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="ALL">All Faculty Staffs ({staffAccounts.length})</option>
                    {staffAccounts.map((st) => (
                      <option key={st.staffId} value={st.staffId}>
                        {st.staffId} — {st.staffName}
                      </option>
                    ))}
                  </select>
                )}

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={hubSearch}
                    onChange={(e) => setHubSearch(e.target.value)}
                    placeholder="Search subject, exam, faculty..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {filteredHubKeys.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div className="text-sm font-black text-slate-800">
                  No Answer Keys Found for Active Filter
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click &ldquo;+ Generate New Answer Key (AI Studio)&rdquo; above to upload a Question Paper and generate a complete Word &amp; PDF Answer Key.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {filteredHubKeys.map((key) => {
                  const isConfirmingDel = confirmDeleteId === key.id;
                  return (
                    <div
                      key={key.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-[#781717]/40 transition-all flex flex-col justify-between space-y-4 shadow-xs"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 truncate">
                            {key.examTypeLabel || key.examCategory || 'Exam'} • {key.setCode}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              key.isLocked
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {key.isLocked ? '🔒 Approved' : '● Draft'}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-slate-900 leading-snug">
                            {key.subjectCode} — {key.subjectName}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                            Yr {key.classYear || 'III'} • Sem 0{key.semester} • Sec {key.section || 'A'}
                          </p>
                        </div>

                        <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-200/70">
                          <div className="flex items-center justify-between">
                            <span>Questions / Marks:</span>
                            <strong className="text-slate-900">{key.questions.length} Qs • {key.maximumMarks} Marks</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Faculty / Owner:</span>
                            <strong className="truncate max-w-[165px]">
                              {key.handledBy || key.ownerStaffName || 'Faculty'}
                            </strong>
                          </div>
                          {key.uploadedTemplateName && (
                            <div className="flex items-center justify-between">
                              <span>Template:</span>
                              <span className="font-mono text-[10px] text-indigo-700 truncate max-w-[155px]">
                                {key.uploadedTemplateName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenKeyInStudio(key, 'word-studio')}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white text-xs font-black cursor-pointer shadow-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                            <span>Live Word Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenKeyInStudio(key, 'rubrics')}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5 text-amber-300" />
                            <span>Q&amp;A Rubrics</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadWordDocx(key)}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>.DOCX</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(key)}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>.PDF</span>
                          </button>

                          {!isConfirmingDel ? (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(key.id)}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 text-xs font-bold cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onDeleteAnswerKey) onDeleteAnswerKey(key.id);
                                  setConfirmDeleteId(null);
                                  showBanner('info', `Removed Answer Key for ${key.subjectCode}.`);
                                }}
                                className="flex-1 py-1.5 rounded-lg bg-rose-700 text-white text-[10px] font-black cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODE 2: ANSWER KEY GENERATION & LIVE WORD STUDIO
         ===================================================================== */}
      {pageMode === 'studio' && (
        <div className="space-y-5">
          {/* Top Studio Header Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setPageMode('hub')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Answer Key Hub</span>
              </button>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-slate-900">
                    {workingKey.subjectCode} — {workingKey.subjectName}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-black">
                    {workingKey.examTypeLabel || workingKey.examTitle}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                    Yr {workingKey.classYear || selectedYear} • Sem 0{workingKey.semester} • Sec {workingKey.section || selectedSection}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Faculty: <strong>{workingKey.handledBy || resolveFacultyName()}</strong> • {workingKey.questions.length} Questions • {workingKey.maximumMarks} Max Marks •{' '}
                  <strong className="text-[#781717]">~{estimateAnswerKeyTotalPages(workingKey)} A4 Pages</strong>
                </p>
              </div>
            </div>

            {/* Studio Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setStudioTab('word-studio')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  studioTab === 'word-studio'
                    ? 'bg-[#781717] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                AI Solver &amp; Live Word Studio
              </button>
              <button
                type="button"
                onClick={() => setStudioTab('rubrics')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  studioTab === 'rubrics'
                    ? 'bg-[#781717] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Q&amp;A &amp; Mark Size Editor ({workingKey.questions.length})
              </button>
              <button
                type="button"
                onClick={() => setStudioTab('tracker')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  studioTab === 'tracker'
                    ? 'bg-[#781717] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Exam &amp; Staff Ledger
              </button>
            </div>
          </div>

          {/* -----------------------------------------------------------
              TAB A: AI QUESTION PAPER UPLOADER + TEMPLATE + LIVE WORD SHEET
             ----------------------------------------------------------- */}
          {studioTab === 'word-studio' && (
            <div className="space-y-5">
              {/* TOP CONTROL DECK: AI QP Solver + AI Support Assistant + Template & Class Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start no-print">
                {/* LEFT COLUMN: 1. Upload & Solve + 2. AI Answer Key Generation Support */}
                <div className="min-w-0 space-y-4">
                <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-[#781717]/25 shadow-sm space-y-3.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-[#781717] text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
                        AI
                      </span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wide truncate">
                        Upload Question Paper &amp; Solve
                      </span>
                    </div>
                  </div>

                  <input
                    ref={qpFileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,image/*"
                    onChange={handleQpFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => qpFileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#781717] bg-slate-50 hover:bg-red-50/40 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <UploadCloud className="w-4 h-4 text-[#781717] shrink-0" />
                    <span className="truncate">
                      {qpFileName ? `QP Loaded: ${qpFileName}` : 'Upload Question Paper (PDF / DOCX / Img / TXT)'}
                    </span>
                  </button>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Question Paper Questions / Extract
                    </label>
                    <textarea
                      rows={5}
                      value={qpRawText}
                      onChange={(e) => setQpRawText(e.target.value)}
                      placeholder="Paste questions here (e.g. Part-A 1..5, Part-B 6a/6b.. or upload PDF/DOCX above)..."
                      className="w-full min-w-0 p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      AI Answer Size Scaling Mode
                    </label>
                    <select
                      value={answerDepthMode}
                      onChange={(e) => setAnswerDepthMode(e.target.value as any)}
                      className="w-full min-w-0 max-w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="mark-proportional">Mark-Proportional (2M Short • 8M ~1–1.5 Pg • 16M ~2–2.5+ Pg)</option>
                      <option value="concise">Concise Exam Key Points</option>
                      <option value="exhaustive">Exhaustive Full-Length Derivation &amp; Code</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={isSolvingAi}
                    onClick={handleGenerateAnswersWithAi}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#781717] to-red-800 hover:from-[#5e1111] hover:to-red-900 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSolvingAi ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>AI Generating Mark-Sized Key...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Generate Mark-Sized Answers in Template</span>
                      </>
                    )}
                  </button>
                  {aiStatusMessage && (
                    <p className="text-[11px] text-amber-800 font-bold text-center">
                      {aiStatusMessage}
                    </p>
                  )}
                </div>

                {/* 2. AI Answer Key Generation Support & QA Assistant (Fills Left Column Cleanly) */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-amber-300 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide block truncate">
                          AI Answer Key Generation Support
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          Fix missing Qs, add flowcharts, expand A4 length &amp; verify rubrics
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold shrink-0">
                      {workingKey.questions.length} Qs
                    </span>
                  </div>

                  {/* Scope Selector */}
                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Target Question Scope
                    </label>
                    <select
                      value={supportTargetQNo === 'all' ? 'all' : String(supportTargetQNo)}
                      onChange={(e) =>
                        setSupportTargetQNo(e.target.value === 'all' ? 'all' : Number(e.target.value))
                      }
                      className="w-full min-w-0 max-w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="all">
                        All Questions ({workingKey.questions.length} Total • Full Answer Key)
                      </option>
                      {workingKey.questions.map((q) => (
                        <option key={q.questionNo} value={String(q.questionNo)}>
                          Q.{q.subDivision || q.questionNo} ({q.part || 'Part B'}, {q.positiveMarks}M) — {(q.questionText || q.topic).slice(0, 48)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4 Quick AI Support Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isRunningSupport || isSolvingAi}
                      onClick={() => handleRunAiSupport('fix-all')}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-bold cursor-pointer disabled:opacity-60"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-[#781717] shrink-0" />
                      <span className="truncate">Fix &amp; Complete Qs</span>
                    </button>
                    <button
                      type="button"
                      disabled={isRunningSupport || isSolvingAi}
                      onClick={() => handleRunAiSupport('add-diagrams')}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold cursor-pointer disabled:opacity-60"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                      <span className="truncate">Add Flowcharts</span>
                    </button>
                    <button
                      type="button"
                      disabled={isRunningSupport || isSolvingAi}
                      onClick={() => handleRunAiSupport('expand-answers')}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold cursor-pointer disabled:opacity-60"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate">Expand A4 Size</span>
                    </button>
                    <button
                      type="button"
                      disabled={isRunningSupport || isSolvingAi}
                      onClick={() => handleRunAiSupport('verify-rubrics')}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold cursor-pointer disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                      <span className="truncate">Verify Rubrics</span>
                    </button>
                  </div>

                  {/* Custom AI Support Prompt Bar */}
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="text"
                      value={supportPrompt}
                      onChange={(e) => setSupportPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isRunningSupport) {
                          e.preventDefault();
                          handleRunAiSupport('custom');
                        }
                      }}
                      placeholder="Ask AI Support (e.g., Add worked numerical example to Q.6a)..."
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      disabled={isRunningSupport || isSolvingAi}
                      onClick={() => handleRunAiSupport('custom')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-black cursor-pointer disabled:opacity-60 shrink-0"
                    >
                      {isRunningSupport ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{isRunningSupport ? 'Working' : 'Apply'}</span>
                    </button>
                  </div>

                  {/* Concise AI Support History Log */}
                  {supportMessages.length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1 border-t border-slate-100">
                      {supportMessages.slice(-4).map((msg) => (
                        <div
                          key={msg.id}
                          className={`px-2.5 py-2 rounded-xl text-[11px] leading-snug ${
                            msg.role === 'user'
                              ? 'bg-slate-100 text-slate-800 font-semibold'
                              : 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-70">
                              {msg.role === 'user' ? 'Faculty Request' : 'AI Support'}
                            </span>
                            {msg.provider && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-white/80 rounded border border-emerald-300">
                                {msg.provider === 'gemini_ai' ? 'Gemini AI' : 'Local Engine'}
                              </span>
                            )}
                          </div>
                          <p>{msg.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </div>

                {/* RIGHT COLUMN IN TOP DECK: Template Selection + Metadata Controls */}
                <div className="min-w-0 space-y-4">
                {/* 2. Template Selection & Custom Template Uploader */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Answer Key Template Style
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadSampleCustomTemplate}
                      className="text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Blank .DOCX Template
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        rebuildWordPreview(
                          { ...workingKey, templateMode: 'default', customTemplateName: undefined },
                          'Switched to Official VSBEC Answer Key Default Template.'
                        )
                      }
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-black border cursor-pointer ${
                        workingKey.templateMode !== 'custom'
                          ? 'bg-[#781717] text-white border-[#781717]'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Default Official Template
                    </button>
                    <button
                      type="button"
                      onClick={() => templateFileInputRef.current?.click()}
                      className={`py-2 px-2.5 rounded-xl text-[11px] font-black border cursor-pointer ${
                        workingKey.templateMode === 'custom'
                          ? 'bg-indigo-700 text-white border-indigo-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Upload Custom .DOCX
                    </button>
                  </div>

                  <input
                    ref={templateFileInputRef}
                    type="file"
                    accept=".docx,.html,.htm,.txt"
                    onChange={handleUploadCustomTemplate}
                    className="hidden"
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingTemplate(true);
                    }}
                    onDragLeave={() => setIsDraggingTemplate(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setIsDraggingTemplate(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) await processCustomTemplateFile(file);
                    }}
                    onClick={() => templateFileInputRef.current?.click()}
                    className={`p-3 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                      isDraggingTemplate
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                    }`}
                  >
                    <FileUp className="w-4 h-4 mx-auto text-slate-500 mb-1" />
                    <div className="text-[11px] font-bold text-slate-700 truncate">
                      {workingKey.templateMode === 'custom' && workingKey.customTemplateName
                        ? `Active Custom: ${workingKey.customTemplateName}`
                        : 'Drag & drop .DOCX / .HTML / .TXT template here'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Tokens: {'{{EXAM_TITLE}}'}, {'{{SUBJECT_CODE}}'}, {'{{ANSWER_KEY_BODY}}'}
                    </div>
                  </div>

                  {customTemplateError && (
                    <p className="text-[11px] font-bold text-rose-700">{customTemplateError}</p>
                  )}

                  {savedCustomTemplates.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        My Saved Templates ({savedCustomTemplates.length})
                      </span>
                      <div className="max-h-28 overflow-y-auto space-y-1">
                        {savedCustomTemplates.map((tpl) => (
                          <div
                            key={tpl.id}
                            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                rebuildWordPreview(
                                  {
                                    ...workingKey,
                                    templateMode: 'custom',
                                    customTemplateName: tpl.name,
                                    customTemplateHtml: tpl.html
                                  },
                                  `Applied saved template "${tpl.name}".`
                                )
                              }
                              className="font-bold text-slate-800 hover:text-[#781717] truncate flex-1 text-left cursor-pointer"
                            >
                              {tpl.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSavedCustomTemplates((prev) => prev.filter((x) => x.id !== tpl.id))}
                              className="text-slate-400 hover:text-rose-700 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blank vs Filled Toggle */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => rebuildWordPreview({ ...workingKey, includeValues: false })}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-black border cursor-pointer ${
                        workingKey.includeValues === false
                          ? 'bg-slate-900 text-amber-300 border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Blank Template
                    </button>
                    <button
                      type="button"
                      onClick={() => rebuildWordPreview({ ...workingKey, includeValues: true })}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-black border cursor-pointer ${
                        workingKey.includeValues !== false
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Filled Answer Key
                    </button>
                  </div>
                </div>

                {/* 3. Header Metadata Controls (All Staffs, All Classes, All Exams) */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3 text-xs min-w-0">
                  <div className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Exam, Class &amp; Staff Details
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Exam Type / Heading
                    </label>
                    <select
                      value={
                        EXAM_TYPE_PRESETS.find((p) => p.label === (workingKey.examTypeLabel || workingKey.examTitle))?.id ||
                        'custom'
                      }
                      onChange={(e) => {
                        const preset = EXAM_TYPE_PRESETS.find((p) => p.id === e.target.value);
                        if (preset) {
                          rebuildWordPreview({
                            ...workingKey,
                            examCategory: preset.examCategory,
                            examTitle: preset.label,
                            examTypeLabel: preset.label,
                            maximumMarks: preset.defaultMaxMarks,
                            duration: preset.defaultDuration
                          });
                        }
                      }}
                      className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 cursor-pointer"
                    >
                      {EXAM_TYPE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                      <option value="custom">Custom Exam Title</option>
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Custom Exam Banner Title
                    </label>
                    <input
                      type="text"
                      value={workingKey.examTypeLabel || workingKey.examTitle || ''}
                      onChange={(e) =>
                        rebuildWordPreview({ ...workingKey, examTypeLabel: e.target.value, examTitle: e.target.value })
                      }
                      className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Year</label>
                      <select
                        value={workingKey.classYear || selectedYear}
                        onChange={(e) => {
                          const yr = e.target.value as 'I' | 'II' | 'III' | 'IV';
                          rebuildWordPreview({
                            ...workingKey,
                            classYear: yr,
                            programmeName: `B.TECH AI&DS (Year ${yr} - Section ${workingKey.section || 'A'})`
                          });
                        }}
                        className="w-full min-w-0 px-2 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                      >
                        <option value="I">Year I</option>
                        <option value="II">Year II</option>
                        <option value="III">Year III</option>
                        <option value="IV">Year IV</option>
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sem</label>
                      <select
                        value={workingKey.semester}
                        onChange={(e) =>
                          rebuildWordPreview({ ...workingKey, semester: Number(e.target.value) })
                        }
                        className="w-full min-w-0 px-2 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                          <option key={s} value={s}>Sem {s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Section</label>
                      <select
                        value={workingKey.section || 'A'}
                        onChange={(e) => {
                          const sec = e.target.value as any;
                          rebuildWordPreview({
                            ...workingKey,
                            section: sec,
                            programmeName: `B.TECH AI&DS (Year ${workingKey.classYear || selectedYear} - Section ${sec})`
                          });
                        }}
                        className="w-full min-w-0 px-2 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                      >
                        <option value="A">Sec A</option>
                        <option value="B">Sec B</option>
                        <option value="C">Sec C</option>
                        <option value="D">Sec D</option>
                        <option value="ALL">ALL</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subject Code</label>
                      <input
                        type="text"
                        value={workingKey.subjectCode}
                        onChange={(e) =>
                          rebuildWordPreview({ ...workingKey, subjectCode: e.target.value.toUpperCase() })
                        }
                        className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Regulation</label>
                      <input
                        type="text"
                        value={workingKey.regulation}
                        onChange={(e) =>
                          rebuildWordPreview({ ...workingKey, regulation: e.target.value })
                        }
                        className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Course Title</label>
                    <input
                      type="text"
                      value={workingKey.subjectName}
                      onChange={(e) =>
                        rebuildWordPreview({ ...workingKey, subjectName: e.target.value })
                      }
                      className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max Mark</label>
                      <input
                        type="number"
                        min={5}
                        max={200}
                        value={workingKey.maximumMarks}
                        onChange={(e) =>
                          rebuildWordPreview({ ...workingKey, maximumMarks: Number(e.target.value) || 50 })
                        }
                        className="w-full min-w-0 px-2.5 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Duration</label>
                      <input
                        type="text"
                        value={workingKey.duration || ''}
                        onChange={(e) =>
                          rebuildWordPreview({ ...workingKey, duration: e.target.value })
                        }
                        className="w-full min-w-0 px-2.5 py-2 rounded-xl border border-slate-300 font-bold"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Exam Date</label>
                      <input
                        type="date"
                        value={workingKey.examDate || ''}
                        onChange={(e) =>
                          rebuildWordPreview({ ...workingKey, examDate: e.target.value })
                        }
                        className="w-full min-w-0 px-2 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Year</label>
                      <input
                        type="text"
                        value={workingKey.academicYear || ''}
                        onChange={(e) =>
                          rebuildWordPreview({ ...workingKey, academicYear: e.target.value })
                        }
                        className="w-full min-w-0 px-2.5 py-2 rounded-xl border border-slate-300 font-bold"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Session</label>
                      <select
                        value={workingKey.semesterType || 'ODD'}
                        onChange={(e) =>
                          rebuildWordPreview({ ...workingKey, semesterType: e.target.value as any })
                        }
                        className="w-full min-w-0 px-2.5 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                      >
                        <option value="ODD">ODD SEMESTER</option>
                        <option value="EVEN">EVEN SEMESTER</option>
                      </select>
                    </div>
                  </div>

                  {/* Staff Selector (Locked for Staff Login, Selectable for COE Admin) */}
                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Prepared By / Faculty Name
                    </label>
                    {isAdminGlobal && staffAccounts.length > 0 ? (
                      <select
                        value={workingKey.ownerStaffId || selectedStaffOwnerId}
                        onChange={(e) => {
                          const st = staffAccounts.find((a) => a.staffId === e.target.value);
                          setSelectedStaffOwnerId(e.target.value);
                          rebuildWordPreview({
                            ...workingKey,
                            ownerStaffId: st?.staffId,
                            ownerStaffName: st?.staffName,
                            handledBy: st?.staffName || workingKey.handledBy
                          });
                        }}
                        className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 cursor-pointer"
                      >
                        {staffAccounts.map((st) => (
                          <option key={st.staffId} value={st.staffId}>
                            {st.staffName} ({st.staffId})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={workingKey.handledBy || ''}
                        onChange={(e) =>
                          rebuildWordPreview({ ...workingKey, handledBy: e.target.value })
                        }
                        className="w-full min-w-0 px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                      />
                    )}
                  </div>
                </div>
                </div>
              </div>

              {/* FULL-WIDTH PANEL: Rich Interactive A4 Portrait Live Word Paper Sheet */}
              <div className="space-y-3">
                {/* Word Formatting Toolbar */}
                <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 no-print">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsWordEditing(!isWordEditing)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                        isWordEditing
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {isWordEditing ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{isWordEditing ? 'Live Word Editing: ON' : 'Read-Only Preview'}</span>
                    </button>

                    <div className="w-px h-5 bg-slate-200 mx-1" />

                    <button type="button" onClick={() => execWordFormat('bold')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer" title="Bold">
                      <Bold className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => execWordFormat('italic')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer" title="Italic">
                      <Italic className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => execWordFormat('underline')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer" title="Underline">
                      <Underline className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-slate-200 mx-1" />

                    <button type="button" onClick={() => execWordFormat('justifyLeft')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer" title="Align Left">
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => execWordFormat('justifyCenter')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer" title="Align Center">
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => execWordFormat('justifyRight')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer" title="Align Right">
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => execWordFormat('insertUnorderedList')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer" title="Bullet List">
                      <List className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-slate-200 mx-1" />

                    <button
                      type="button"
                      onClick={handleInsertAnswerSubheading}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Subheading</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      rebuildWordPreview(
                        { ...workingKey, editedWordHtml: undefined },
                        'Word Answer Key layout regenerated cleanly from structured Q&A.'
                      )
                    }
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Reset Layout
                  </button>
                </div>

                {/* Live Word Paper Sheet (Exact A4 Portrait Container: 210mm x 297mm) */}
                <div className="w-full min-w-0 bg-slate-200/70 p-2 sm:p-5 rounded-3xl border border-slate-300 overflow-x-auto print-sheet-wrapper">
                  <div
                    ref={wordEditorRef}
                    contentEditable={isWordEditing}
                    suppressContentEditableWarning
                    onInput={(e) => {
                      setWordHtml(e.currentTarget.innerHTML);
                      setEditorHasManualEdits(true);
                    }}
                    className={`a4-page-sheet bg-white p-5 sm:p-9 shadow-xl rounded-sm border transition-all print-sheet-page ${
                      isWordEditing
                        ? 'border-indigo-300 ring-2 ring-indigo-500/20 focus:outline-none'
                        : 'border-slate-300'
                    }`}
                  />
                </div>

                {/* Document Export & Save Action Bar */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-900">Ready:</span> Edit directly in the Word paper above, then download aligned <code className="font-mono text-[#781717]">.docx</code> / <code className="font-mono text-rose-700">.pdf</code> or print.
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveAnswerKey(false)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-amber-300" />
                      <span>Save Draft</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDirectPrint}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadWordDocx()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-bold text-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-300" />
                      <span>Download .DOCX</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAnswerKey(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Finalize Key</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------
              TAB B: QUESTION-BY-QUESTION & MARK-SIZE EDITOR
             ----------------------------------------------------------- */}
          {studioTab === 'rubrics' && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Question-Wise Mark Size Answer &amp; Rubric Editor
                  </h3>
                  <p className="text-xs text-slate-500">
                    Adjust individual question marks, edit expected solutions, or regenerate any question&rsquo;s answer with Gemini AI to fit its mark weight. Changes sync immediately into the Live Word Sheet.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddManualQuestion('Part A')}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    + Part A (2M)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddManualQuestion('Part B')}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    + Part B (8M)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddManualQuestion('Part C')}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    + Part C (16M)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudioTab('word-studio')}
                    className="px-4 py-2 rounded-xl bg-[#781717] text-white text-xs font-black cursor-pointer"
                  >
                    View Live Word Sheet →
                  </button>
                </div>
              </div>

              {workingKey.questions.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                  <p className="text-sm font-bold text-slate-700">
                    No questions generated yet. Upload a Question Paper in AI Solver &amp; Live Word Studio or click &ldquo;+ Part A / Part B&rdquo; above.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workingKey.questions.map((q) => {
                    const wordsCount = countWords(q.expectedAnswer);
                    const estPages = estimateQuestionPages(q);
                    const targetGuide = getTargetWordRangeForMarks(q.positiveMarks);
                    const isRegen = regeneratingQNo === q.questionNo;

                    return (
                      <div
                        key={q.questionNo}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg bg-[#781717] text-amber-300 font-mono text-xs font-black">
                              Q.{q.subDivision || q.questionNo}
                            </span>
                            <select
                              value={q.part || 'Part A'}
                              onChange={(e) => handleUpdateQuestionField(q.questionNo, { part: e.target.value as any })}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                            >
                              <option value="Part A">Part A</option>
                              <option value="Part B">Part B</option>
                              <option value="Part C">Part C</option>
                            </select>
                            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs">
                              <span className="text-slate-500 font-bold">Marks:</span>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={q.positiveMarks}
                                onChange={(e) =>
                                  handleUpdateQuestionField(q.questionNo, {
                                    positiveMarks: Number(e.target.value) || 2
                                  })
                                }
                                className="w-12 font-mono font-black text-center text-[#781717]"
                              />
                            </div>
                            <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-bold">
                              Current: {wordsCount} words (~{estPages} {estPages === 1 ? 'Page' : 'Pages'}) • Target: {targetGuide}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isRegen}
                              onClick={() => handleRegenerateSingleQuestion(q)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isRegen ? 'animate-spin' : ''}`} />
                              <span>{isRegen ? 'Generating...' : 'AI Mark-Size Answer'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestionItem(q.questionNo)}
                              className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 cursor-pointer"
                              title="Remove question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Question Text
                          </label>
                          <input
                            type="text"
                            value={q.questionText || ''}
                            onChange={(e) =>
                              handleUpdateQuestionField(q.questionNo, { questionText: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Model Answer (Proportional to {q.positiveMarks} Marks — use numbered headers &ldquo;1. Title&rdquo; &amp; &ldquo;- bullet&rdquo; lines)
                          </label>
                          <textarea
                            rows={q.positiveMarks <= 3 ? 4 : 8}
                            value={q.expectedAnswer || ''}
                            onChange={(e) =>
                              handleUpdateQuestionField(q.questionNo, {
                                expectedAnswer: e.target.value
                              })
                            }
                            className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* -----------------------------------------------------------
              TAB C: EXAM & STAFF ANSWER KEY TRACKER
             ----------------------------------------------------------- */}
          {studioTab === 'tracker' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print">
              <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    All Registered Answer Keys ({scopedAnswerKeys.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Switch cleanly between saved Answer Keys for any class, exam type, or staff member
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPdfModalKey(captureSyncedKey());
                    setIsPdfModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Open Official Scheme Modal</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-mono text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Exam Type</th>
                      <th className="py-3 px-4">Faculty</th>
                      <th className="py-3 px-4 text-center">Qs / Marks</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scopedAnswerKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-[#781717] block">{k.subjectCode}</span>
                          <span className="text-[11px] text-slate-600">{k.subjectName}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-700">
                          Yr {k.classYear || 'III'} • Sem 0{k.semester} • Sec {k.section || 'A'}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {k.examTypeLabel || k.examCategory}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{k.handledBy || k.ownerStaffName || 'Faculty'}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {k.questions.length} / {k.maximumMarks}M
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              k.isLocked
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {k.isLocked ? 'Approved' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenKeyInStudio(k, 'word-studio')}
                              className="px-2.5 py-1 rounded-lg bg-[#781717] text-white font-bold text-[11px] cursor-pointer"
                            >
                              Open Word
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadWordDocx(k)}
                              className="px-2 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold text-[11px] cursor-pointer"
                            >
                              .DOCX
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(k)}
                              className="px-2 py-1 rounded-lg bg-rose-50 text-rose-800 font-bold text-[11px] cursor-pointer"
                            >
                              .PDF
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAnswerKey({ ...k, isLocked: !k.isLocked })
                              }
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                              title={k.isLocked ? 'Unlock Key' : 'Lock Key'}
                            >
                              {k.isLocked ? <Lock className="w-3.5 h-3.5 text-emerald-700" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official COE Printable PDF Modal */}
      <AnswerKeyPrintablePdfModal
        answerKey={pdfModalKey}
        isOpen={isPdfModalOpen}
        onClose={() => {
          setIsPdfModalOpen(false);
          setPdfModalKey(null);
        }}
      />
    </div>
  );
};
