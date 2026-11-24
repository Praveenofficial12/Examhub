import * as XLSX from 'xlsx';
import {
  AnswerSheet,
  DepartmentCode,
  EvaluatedQuestionScore,
  ExamAnswerKey
} from '../types';

export interface LiveExcelMarkRow {
  sheetId: string;
  sno: number;
  registerNo: string;
  studentName: string;
  subjectCode: string;
  subjectName: string;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  q5: number | null;
  q6Choice: 'a' | 'b' | '';
  q6: number | null;
  q7Choice: 'a' | 'b' | '';
  q7: number | null;
  q8Choice: 'a' | 'b' | '';
  q8: number | null;
  attendedQuestions: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  grade: 'O' | 'A+' | 'A' | 'B+' | 'B' | 'RA' | 'AB';
  resultStatus: 'PASS' | 'RA' | 'AB';
  confidenceScore: number;
  status: 'mapped' | 'pending' | 'conflict';
  scannedAt: string;
  isDuplicate?: boolean;
  validationError?: string;
}

export function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

export function clampMark(value: number | null | undefined, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return roundHalf(Math.min(max, Math.max(0, num)));
}

export function computeCbcsFromMarks(
  marks: number,
  maxMarks: number = 50
): {
  grade: 'O' | 'A+' | 'A' | 'B+' | 'B' | 'RA';
  resultStatus: 'PASS' | 'RA';
  percentage: number;
} {
  const safeMax = Math.max(1, maxMarks || 50);
  const pct = Math.min(100, Math.max(0, Math.round((marks / safeMax) * 1000) / 10));
  if (pct >= 91) return { grade: 'O', resultStatus: 'PASS', percentage: pct };
  if (pct >= 81) return { grade: 'A+', resultStatus: 'PASS', percentage: pct };
  if (pct >= 71) return { grade: 'A', resultStatus: 'PASS', percentage: pct };
  if (pct >= 60) return { grade: 'B+', resultStatus: 'PASS', percentage: pct };
  return { grade: 'RA', resultStatus: 'RA', percentage: pct };
}

/**
 * Canonical VSBEC Internal Evaluation Question Scheme (Total 50 Marks):
 * - Questions 1-5: 2 marks each
 * - Question 6(a) or 6(b): 8 marks (either-or, never double counted)
 * - Question 7(a) or 7(b): 16 marks (either-or, never double counted)
 * - Question 8(a) or 8(b): 16 marks (either-or, never double counted)
 */
export const CANONICAL_QUESTION_SLOTS: Array<{
  questionNo: number;
  subDivision: string;
  part: 'Part A' | 'Part B' | 'Part C';
  maxMarks: number;
  eitherOrGroup?: '6' | '7' | '8';
  questionChoice?: 'a' | 'b';
  defaultPrompt: string;
}> = [
  { questionNo: 1, subDivision: '1', part: 'Part A', maxMarks: 2, defaultPrompt: 'Part A — Question 1 (2 Marks)' },
  { questionNo: 2, subDivision: '2', part: 'Part A', maxMarks: 2, defaultPrompt: 'Part A — Question 2 (2 Marks)' },
  { questionNo: 3, subDivision: '3', part: 'Part A', maxMarks: 2, defaultPrompt: 'Part A — Question 3 (2 Marks)' },
  { questionNo: 4, subDivision: '4', part: 'Part A', maxMarks: 2, defaultPrompt: 'Part A — Question 4 (2 Marks)' },
  { questionNo: 5, subDivision: '5', part: 'Part A', maxMarks: 2, defaultPrompt: 'Part A — Question 5 (2 Marks)' },
  { questionNo: 6, subDivision: '6a)', part: 'Part B', maxMarks: 8, eitherOrGroup: '6', questionChoice: 'a', defaultPrompt: 'Part B — Question 6(a) [Either 6a or 6b] (8 Marks)' },
  { questionNo: 7, subDivision: '6b)', part: 'Part B', maxMarks: 8, eitherOrGroup: '6', questionChoice: 'b', defaultPrompt: 'Part B — Question 6(b) [Either 6a or 6b] (8 Marks)' },
  { questionNo: 8, subDivision: '7a)', part: 'Part C', maxMarks: 16, eitherOrGroup: '7', questionChoice: 'a', defaultPrompt: 'Part C — Question 7(a) [Either 7a or 7b] (16 Marks)' },
  { questionNo: 9, subDivision: '7b)', part: 'Part C', maxMarks: 16, eitherOrGroup: '7', questionChoice: 'b', defaultPrompt: 'Part C — Question 7(b) [Either 7a or 7b] (16 Marks)' },
  { questionNo: 10, subDivision: '8a)', part: 'Part C', maxMarks: 16, eitherOrGroup: '8', questionChoice: 'a', defaultPrompt: 'Part C — Question 8(a) [Either 8a or 8b] (16 Marks)' },
  { questionNo: 11, subDivision: '8b)', part: 'Part C', maxMarks: 16, eitherOrGroup: '8', questionChoice: 'b', defaultPrompt: 'Part C — Question 8(b) [Either 8a or 8b] (16 Marks)' }
];

function matchSlotFromEval(
  list: EvaluatedQuestionScore[],
  subDivTarget: string,
  fallbackQNo?: number
): EvaluatedQuestionScore | undefined {
  const norm = subDivTarget.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bySub = list.find(
    (q) => String(q.subDivision || '').toLowerCase().replace(/[^a-z0-9]/g, '') === norm
  );
  if (bySub) return bySub;
  if (fallbackQNo !== undefined) {
    return list.find((q) => {
      const s = String(q.subDivision || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return Number(q.questionNo) === fallbackQNo && (!s || s === String(fallbackQNo));
    });
  }
  return undefined;
}

/**
 * Enforces either-or exclusivity across 6(a)/6(b), 7(a)/7(b), 8(a)/8(b) and caps marks per slot.
 */
export function enforceCanonicalMarkingScheme(
  rawEvaluations: EvaluatedQuestionScore[],
  answerKey?: ExamAnswerKey | null
): EvaluatedQuestionScore[] {
  const mapped: EvaluatedQuestionScore[] = CANONICAL_QUESTION_SLOTS.map((slot) => {
    const keyQ = answerKey?.questions?.find((kq) => {
      const subNorm = String(kq.subDivision || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const slotNorm = slot.subDivision.toLowerCase().replace(/[^a-z0-9]/g, '');
      return subNorm === slotNorm || (!slot.eitherOrGroup && Number(kq.questionNo) === slot.questionNo);
    });
    const matched = matchSlotFromEval(
      rawEvaluations,
      slot.subDivision,
      !slot.eitherOrGroup ? slot.questionNo : undefined
    );

    const attempted = Boolean(matched?.attempted);
    const marksAwarded = attempted ? clampMark(matched?.marksAwarded, slot.maxMarks) : 0;

    return {
      questionNo: slot.questionNo,
      subDivision: slot.subDivision,
      part: slot.part,
      questionChoice: slot.questionChoice,
      eitherOrGroup: slot.eitherOrGroup,
      questionText: String(
        matched?.questionText || keyQ?.questionText || keyQ?.topic || slot.defaultPrompt
      ),
      attempted,
      extractedStudentAnswer: attempted
        ? String(matched?.extractedStudentAnswer || 'Attempted on script')
        : 'Not attempted',
      marksAwarded,
      maxMarks: slot.maxMarks,
      feedback: String(
        matched?.feedback ||
          (attempted ? 'Awarded per marking scheme' : 'Not attempted (0 marks)')
      ),
      confidence: matched?.confidence ?? 92
    };
  });

  // Enforce Either-Or exclusivity on groups 6, 7, 8 (no double counting!)
  (['6', '7', '8'] as const).forEach((grp) => {
    const idxA = mapped.findIndex((m) => m.eitherOrGroup === grp && m.questionChoice === 'a');
    const idxB = mapped.findIndex((m) => m.eitherOrGroup === grp && m.questionChoice === 'b');
    if (idxA < 0 || idxB < 0) return;

    const a = mapped[idxA];
    const b = mapped[idxB];
    if (a.attempted && b.attempted) {
      // Retain whichever earned higher marks (ties keep 'a') and zero the other choice
      if (b.marksAwarded > a.marksAwarded) {
        mapped[idxA] = {
          ...a,
          attempted: false,
          marksAwarded: 0,
          feedback: `Zeroed (Either-Or Q.${grp} rule — ${grp}b counted)`
        };
      } else {
        mapped[idxB] = {
          ...b,
          attempted: false,
          marksAwarded: 0,
          feedback: `Zeroed (Either-Or Q.${grp} rule — ${grp}a counted)`
        };
      }
    }
  });

  return mapped;
}

export function buildAttendedQuestionsSummary(evals: EvaluatedQuestionScore[]): string {
  const tags: string[] = [];
  evals.forEach((q) => {
    if (!q.attempted) return;
    const label = String(q.subDivision || q.questionNo).replace(/\)/g, '');
    if (label && !tags.includes(label)) tags.push(label);
  });
  return tags.join(', ') || 'None';
}

export function answerSheetToLiveExcelRow(
  sheet: AnswerSheet,
  sno: number,
  isDuplicate: boolean = false
): LiveExcelMarkRow {
  const evals = enforceCanonicalMarkingScheme(sheet.questionEvaluations || []);
  const getPartA = (qNo: number) => {
    const item = evals.find((e) => !e.eitherOrGroup && e.questionNo === qNo);
    return item && item.attempted ? item.marksAwarded : null;
  };
  const getEitherOr = (grp: '6' | '7' | '8'): { choice: 'a' | 'b' | ''; marks: number | null } => {
    const a = evals.find((e) => e.eitherOrGroup === grp && e.questionChoice === 'a');
    const b = evals.find((e) => e.eitherOrGroup === grp && e.questionChoice === 'b');
    if (a?.attempted) return { choice: 'a', marks: a.marksAwarded };
    if (b?.attempted) return { choice: 'b', marks: b.marksAwarded };
    return { choice: '', marks: null };
  };

  const q1 = getPartA(1);
  const q2 = getPartA(2);
  const q3 = getPartA(3);
  const q4 = getPartA(4);
  const q5 = getPartA(5);
  const g6 = getEitherOr('6');
  const g7 = getEitherOr('7');
  const g8 = getEitherOr('8');

  const computedTotal =
    (q1 ?? 0) +
    (q2 ?? 0) +
    (q3 ?? 0) +
    (q4 ?? 0) +
    (q5 ?? 0) +
    (g6.marks ?? 0) +
    (g7.marks ?? 0) +
    (g8.marks ?? 0);

  const maxMarks = sheet.maxMarks || 50;
  const hasPerQuestion = evals.some((e) => e.attempted);
  const totalMarks = roundHalf(
    Math.min(
      maxMarks,
      hasPerQuestion ? computedTotal : Number(sheet.marksObtained ?? 0)
    )
  );
  const cbcs = computeCbcsFromMarks(totalMarks, maxMarks);

  return {
    sheetId: sheet.id,
    sno,
    registerNo: sheet.registerNo,
    studentName: sheet.studentName,
    subjectCode: sheet.subjectCode,
    subjectName: sheet.subjectName,
    q1,
    q2,
    q3,
    q4,
    q5,
    q6Choice: g6.choice,
    q6: g6.marks,
    q7Choice: g7.choice,
    q7: g7.marks,
    q8Choice: g8.choice,
    q8: g8.marks,
    attendedQuestions: hasPerQuestion ? buildAttendedQuestionsSummary(evals) : 'Recorded',
    totalMarks,
    maxMarks,
    percentage: cbcs.percentage,
    grade: cbcs.grade,
    resultStatus: cbcs.resultStatus,
    confidenceScore: sheet.confidenceScore,
    status: sheet.status,
    scannedAt: sheet.scannedAt,
    isDuplicate
  };
}

export function recomputeLiveExcelRow(row: LiveExcelMarkRow): LiveExcelMarkRow {
  const q1 = row.q1 === null ? null : clampMark(row.q1, 2);
  const q2 = row.q2 === null ? null : clampMark(row.q2, 2);
  const q3 = row.q3 === null ? null : clampMark(row.q3, 2);
  const q4 = row.q4 === null ? null : clampMark(row.q4, 2);
  const q5 = row.q5 === null ? null : clampMark(row.q5, 2);

  const q6Choice = row.q6Choice || (row.q6 !== null ? 'a' : '');
  const q6 = q6Choice ? clampMark(row.q6 ?? 0, 8) : null;

  const q7Choice = row.q7Choice || (row.q7 !== null ? 'a' : '');
  const q7 = q7Choice ? clampMark(row.q7 ?? 0, 16) : null;

  const q8Choice = row.q8Choice || (row.q8 !== null ? 'a' : '');
  const q8 = q8Choice ? clampMark(row.q8 ?? 0, 16) : null;

  const attended: string[] = [];
  if (q1 !== null) attended.push('1');
  if (q2 !== null) attended.push('2');
  if (q3 !== null) attended.push('3');
  if (q4 !== null) attended.push('4');
  if (q5 !== null) attended.push('5');
  if (q6 !== null && q6Choice) attended.push(`6${q6Choice}`);
  if (q7 !== null && q7Choice) attended.push(`7${q7Choice}`);
  if (q8 !== null && q8Choice) attended.push(`8${q8Choice}`);

  const totalMarks = roundHalf(
    Math.min(
      50,
      (q1 ?? 0) +
        (q2 ?? 0) +
        (q3 ?? 0) +
        (q4 ?? 0) +
        (q5 ?? 0) +
        (q6 ?? 0) +
        (q7 ?? 0) +
        (q8 ?? 0)
    )
  );
  const cbcs = computeCbcsFromMarks(totalMarks, row.maxMarks || 50);

  return {
    ...row,
    q1,
    q2,
    q3,
    q4,
    q5,
    q6Choice,
    q6,
    q7Choice,
    q7,
    q8Choice,
    q8,
    attendedQuestions: attended.join(', ') || 'None',
    totalMarks,
    percentage: cbcs.percentage,
    grade: cbcs.grade,
    resultStatus: cbcs.resultStatus
  };
}

export function liveExcelRowToAnswerSheet(
  row: LiveExcelMarkRow,
  existing?: AnswerSheet
): AnswerSheet {
  const clean = recomputeLiveExcelRow(row);
  const prevEvals = existing?.questionEvaluations || [];

  const buildEvals = (): EvaluatedQuestionScore[] => {
    const raw: EvaluatedQuestionScore[] = [];
    const partAMap: Array<[number, number | null]> = [
      [1, clean.q1],
      [2, clean.q2],
      [3, clean.q3],
      [4, clean.q4],
      [5, clean.q5]
    ];
    partAMap.forEach(([qNo, val]) => {
      const prev = prevEvals.find((e) => !e.eitherOrGroup && e.questionNo === qNo);
      raw.push({
        questionNo: qNo,
        subDivision: String(qNo),
        part: 'Part A',
        questionText: prev?.questionText || `Part A — Question ${qNo} (2 Marks)`,
        attempted: val !== null,
        extractedStudentAnswer: val !== null ? (prev?.extractedStudentAnswer || 'Verified in Live Excel') : 'Not attempted',
        marksAwarded: val ?? 0,
        maxMarks: 2,
        feedback: prev?.feedback || (val !== null ? 'Verified in Excel sheet' : 'Not attempted')
      });
    });

    const eitherPairs: Array<{ grp: '6' | '7' | '8'; part: 'Part B' | 'Part C'; max: number; choice: 'a' | 'b' | ''; marks: number | null }> = [
      { grp: '6', part: 'Part B', max: 8, choice: clean.q6Choice, marks: clean.q6 },
      { grp: '7', part: 'Part C', max: 16, choice: clean.q7Choice, marks: clean.q7 },
      { grp: '8', part: 'Part C', max: 16, choice: clean.q8Choice, marks: clean.q8 }
    ];

    eitherPairs.forEach((p) => {
      (['a', 'b'] as const).forEach((ch) => {
        const sub = `${p.grp}${ch})`;
        const isPicked = p.choice === ch && p.marks !== null;
        const prev = prevEvals.find(
          (e) => String(e.subDivision || '').toLowerCase().replace(/[^a-z0-9]/g, '') === `${p.grp}${ch}`
        );
        raw.push({
          questionNo: prev?.questionNo || 0,
          subDivision: sub,
          part: p.part,
          eitherOrGroup: p.grp,
          questionChoice: ch,
          questionText: prev?.questionText || `${p.part} — Question ${p.grp}(${ch}) (${p.max} Marks)`,
          attempted: isPicked,
          extractedStudentAnswer: isPicked ? (prev?.extractedStudentAnswer || 'Verified in Live Excel') : 'Not attempted',
          marksAwarded: isPicked ? (p.marks ?? 0) : 0,
          maxMarks: p.max,
          feedback: prev?.feedback || (isPicked ? 'Verified in Excel sheet' : 'Not attempted')
        });
      });
    });

    return enforceCanonicalMarkingScheme(raw);
  };

  return {
    id: existing?.id || clean.sheetId || `AS-XLS-${clean.registerNo}`,
    barcode: existing?.barcode || `VSB-${clean.subjectCode}-${clean.registerNo}`,
    dummyNumber: existing?.dummyNumber || `DM-${clean.registerNo.slice(-4)}`,
    packetNumber: existing?.packetNumber || 'PKT-LIVE-XLS',
    registerNo: clean.registerNo,
    studentName: clean.studentName,
    department: (existing?.department || 'AI&DS') as DepartmentCode,
    semester: existing?.semester || 5,
    subjectCode: clean.subjectCode,
    subjectName: clean.subjectName,
    examDate: existing?.examDate || new Date().toISOString().slice(0, 10),
    session: existing?.session || 'FN',
    totalPagesScanned: existing?.totalPagesScanned || 1,
    status: clean.status,
    confidenceScore: clean.confidenceScore || 100,
    scannedAt: clean.scannedAt || new Date().toISOString().replace('T', ' ').slice(0, 19),
    evaluatorId: existing?.evaluatorId || 'LIVE-EXCEL-EDITOR',
    verifiedBy: existing?.verifiedBy || 'Verified via Live Excel',
    marksObtained: clean.totalMarks,
    maxMarks: clean.maxMarks || 50,
    percentage: clean.percentage,
    grade: clean.grade,
    resultStatus: clean.resultStatus,
    questionEvaluations: buildEvals(),
    capturedImageDataUrl: existing?.capturedImageDataUrl,
    ocrExtractedText: existing?.ocrExtractedText,
    captureSource: existing?.captureSource
  };
}

export function exportLiveExcelWorkbook(rows: LiveExcelMarkRow[], subjectCode: string = 'MARKS') {
  const sheetData = rows.map((r, idx) => ({
    S_No: idx + 1,
    Register_No: r.registerNo,
    Student_Name: r.studentName,
    Subject_Code: r.subjectCode,
    Attended_Questions: r.attendedQuestions,
    'Q1 (2M)': r.q1 ?? '',
    'Q2 (2M)': r.q2 ?? '',
    'Q3 (2M)': r.q3 ?? '',
    'Q4 (2M)': r.q4 ?? '',
    'Q5 (2M)': r.q5 ?? '',
    'Q6 Option': r.q6Choice ? `6${r.q6Choice}` : '-',
    'Q6 (8M)': r.q6 ?? '',
    'Q7 Option': r.q7Choice ? `7${r.q7Choice}` : '-',
    'Q7 (16M)': r.q7 ?? '',
    'Q8 Option': r.q8Choice ? `8${r.q8Choice}` : '-',
    'Q8 (16M)': r.q8 ?? '',
    'Total Marks (/50)': r.totalMarks,
    'Percentage (%)': r.percentage,
    Grade: r.grade,
    Result: r.resultStatus
  }));

  const ws = XLSX.utils.json_to_sheet(sheetData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 24 },
    { wch: 13 },
    { wch: 22 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 9 },
    { wch: 11 },
    { wch: 10 },
    { wch: 11 },
    { wch: 10 },
    { wch: 11 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 8 },
    { wch: 10 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Evaluated_Marks');
  const cleanSub = (subjectCode || 'ALL').replace(/[^a-zA-Z0-9_-]/g, '');
  XLSX.writeFile(wb, `VSBEC_Live_Evaluated_Marks_${cleanSub}.xlsx`);
}

export async function parseImportedLiveExcelWorkbook(
  file: File,
  defaultSubjectCode: string,
  defaultSubjectName: string
): Promise<{ success: boolean; rows: LiveExcelMarkRow[]; error?: string }> {
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) return { success: false, rows: [], error: 'Excel workbook contains no worksheets.' };

    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[firstSheet], { defval: '' });
    const parsedNum = (val: any): number | null => {
      if (val === '' || val === null || val === undefined) return null;
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    };
    const parseChoice = (val: any): 'a' | 'b' | '' => {
      const s = String(val || '').toLowerCase();
      if (s.includes('a')) return 'a';
      if (s.includes('b')) return 'b';
      return '';
    };

    const rows: LiveExcelMarkRow[] = rawRows
      .filter((r) => String(r.Register_No || r['Register No'] || '').trim().length >= 4)
      .map((r, idx) => {
        const regNo = String(r.Register_No || r['Register No'] || '').trim();
        const name = String(r.Student_Name || r['Student Name'] || `Candidate ${regNo}`).trim();
        const q1 = parsedNum(r['Q1 (2M)'] ?? r.Q1);
        const q2 = parsedNum(r['Q2 (2M)'] ?? r.Q2);
        const q3 = parsedNum(r['Q3 (2M)'] ?? r.Q3);
        const q4 = parsedNum(r['Q4 (2M)'] ?? r.Q4);
        const q5 = parsedNum(r['Q5 (2M)'] ?? r.Q5);
        const q6 = parsedNum(r['Q6 (8M)'] ?? r.Q6);
        const q7 = parsedNum(r['Q7 (16M)'] ?? r.Q7);
        const q8 = parsedNum(r['Q8 (16M)'] ?? r.Q8);
        const q6Choice = parseChoice(r['Q6 Option'] ?? r.Q6_Option) || (q6 !== null ? 'a' : '');
        const q7Choice = parseChoice(r['Q7 Option'] ?? r.Q7_Option) || (q7 !== null ? 'a' : '');
        const q8Choice = parseChoice(r['Q8 Option'] ?? r.Q8_Option) || (q8 !== null ? 'a' : '');

        return recomputeLiveExcelRow({
          sheetId: `AS-IMP-${regNo}-${Date.now()}-${idx}`,
          sno: idx + 1,
          registerNo: regNo,
          studentName: name,
          subjectCode: String(r.Subject_Code || defaultSubjectCode).trim(),
          subjectName: defaultSubjectName,
          q1,
          q2,
          q3,
          q4,
          q5,
          q6Choice,
          q6,
          q7Choice,
          q7,
          q8Choice,
          q8,
          attendedQuestions: '',
          totalMarks: 0,
          maxMarks: 50,
          percentage: 0,
          grade: 'RA',
          resultStatus: 'RA',
          confidenceScore: 100,
          status: 'mapped',
          scannedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
        });
      });

    if (rows.length === 0) {
      return { success: false, rows: [], error: 'No valid student rows with Register_No were found.' };
    }
    return { success: true, rows };
  } catch (err: any) {
    return { success: false, rows: [], error: err?.message || 'Failed to parse Excel workbook.' };
  }
}
