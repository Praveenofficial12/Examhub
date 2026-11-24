import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { AnswerSheet, StudentProfile, StudentTestMark } from '../types';

export interface RetestStudentEntry {
  id: string;
  registerNo: string;
  rollNo: string;
  studentName: string;
  department: string;
  year: string;
  semester: number;
  section: string;
  subjectCode: string;
  subjectName: string;
  examLabel: string;
  marksObtained: number;
  maxMarks: number;
  passMark: number;
  deficit: number;
  percentage: number;
  source: 'Answer Sheet Scan' | 'Mark Excel / Entry';
}

/**
 * Official Institutional Pass Rule:
 * - For Max Marks = 50 -> Pass Mark = 30 (below 30 requires Retest)
 * - For Max Marks = 100 -> Pass Mark = 60 (below 60 requires Retest)
 * - Proportional 60% rule for any custom max marks
 */
export function getPassMarkForMax(maxMarks: number): number {
  const safeMax = Number(maxMarks) || 50;
  if (safeMax === 50) return 30;
  if (safeMax === 100) return 60;
  return Math.round(safeMax * 0.6);
}

export function isRetestRequired(marksObtained: number, maxMarks: number): boolean {
  const passMark = getPassMarkForMax(maxMarks);
  const score = Number(marksObtained);
  if (!Number.isFinite(score)) return true;
  return score < passMark;
}

function normReg(val?: string): string {
  return String(val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function collectRetestStudentsFromAnswerSheets(
  sheets: AnswerSheet[],
  students: StudentProfile[] = []
): RetestStudentEntry[] {
  const list: RetestStudentEntry[] = [];
  const seen = new Set<string>();

  sheets.forEach((sh) => {
    const maxMarks = Number(sh.maxMarks) || 50;
    const marksObtained = Number(sh.marksObtained ?? 0);
    if (!isRetestRequired(marksObtained, maxMarks)) return;

    const regClean = normReg(sh.registerNo);
    const key = `${regClean}__${String(sh.subjectCode || '').toUpperCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    const matchedStu = students.find((st) => normReg(st.registerNo) === regClean);
    const passMark = getPassMarkForMax(maxMarks);
    const pct = Math.round((marksObtained / Math.max(1, maxMarks)) * 1000) / 10;

    list.push({
      id: sh.id,
      registerNo: sh.registerNo || 'UNMAPPED',
      rollNo: matchedStu?.rollNo || '-',
      studentName: matchedStu?.name || sh.studentName || 'Candidate',
      department: matchedStu?.department || sh.department || 'AI&DS',
      year: String(matchedStu?.year || sh.classYear || '-'),
      semester: Number(matchedStu?.semester || sh.semester || 0),
      section: matchedStu?.section || sh.section || '-',
      subjectCode: sh.subjectCode || '-',
      subjectName: sh.subjectName || 'Evaluated Course',
      examLabel: sh.session ? `${sh.examDate || ''} (${sh.session})`.trim() : sh.examDate || 'Valuation Scan',
      marksObtained,
      maxMarks,
      passMark,
      deficit: Math.max(0, Math.round((passMark - marksObtained) * 10) / 10),
      percentage: pct,
      source: 'Answer Sheet Scan'
    });
  });

  return list.sort((a, b) => a.marksObtained - b.marksObtained);
}

export function collectRetestStudentsFromTestMarks(
  marksList: StudentTestMark[],
  students: StudentProfile[] = []
): RetestStudentEntry[] {
  const list: RetestStudentEntry[] = [];
  const seen = new Set<string>();

  marksList.forEach((tm) => {
    const maxMarks = Number(tm.maxMarks) || 50;
    const marksObtained = Number(tm.marksObtained ?? 0);
    if (!isRetestRequired(marksObtained, maxMarks)) return;

    const regClean = normReg(tm.registerNo);
    const key = `${regClean}__${String(tm.subjectCode || '').toUpperCase()}__${String(tm.testId || '')}`;
    if (seen.has(key)) return;
    seen.add(key);

    const matchedStu = students.find((st) => normReg(st.registerNo) === regClean);
    const passMark = getPassMarkForMax(maxMarks);
    const pct = Math.round((marksObtained / Math.max(1, maxMarks)) * 1000) / 10;

    list.push({
      id: tm.id,
      registerNo: tm.registerNo,
      rollNo: tm.rollNo || matchedStu?.rollNo || '-',
      studentName: matchedStu?.name || tm.studentName || 'Candidate',
      department: tm.department || matchedStu?.department || 'AI&DS',
      year: String(tm.year || matchedStu?.year || '-'),
      semester: Number(matchedStu?.semester || 0),
      section: tm.section || matchedStu?.section || '-',
      subjectCode: tm.subjectCode || '-',
      subjectName: tm.subjectName || 'Autonomous Course',
      examLabel: tm.testName || 'Test / Excel Upload',
      marksObtained,
      maxMarks,
      passMark,
      deficit: Math.max(0, Math.round((passMark - marksObtained) * 10) / 10),
      percentage: pct,
      source: 'Mark Excel / Entry'
    });
  });

  return list.sort((a, b) => a.marksObtained - b.marksObtained);
}

export function exportRetestListToExcel(
  entries: RetestStudentEntry[],
  titleLabel: string = 'Retest_Attending_Students'
): void {
  if (entries.length === 0) return;

  const rows = entries.map((e, idx) => ({
    S_No: idx + 1,
    Register_No: e.registerNo,
    Roll_No: e.rollNo,
    Student_Name: e.studentName,
    Department: e.department,
    Year: e.year,
    Section: e.section,
    Subject_Code: e.subjectCode,
    Subject_Name: e.subjectName,
    Exam: e.examLabel,
    Marks_Obtained: e.marksObtained,
    Max_Marks: e.maxMarks,
    Pass_Mark_Required: e.passMark,
    Shortfall_Marks: e.deficit,
    Percentage: `${e.percentage}%`,
    Retest_Status: 'RETEST ATTENDING'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 12 },
    { wch: 24 },
    { wch: 10 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 28 },
    { wch: 22 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Retest_Students');
  const safeName = titleLabel.replace(/[^a-zA-Z0-9_-]+/g, '_');
  XLSX.writeFile(wb, `VSBEC_${safeName}_List.xlsx`);
}

export function exportRetestListToPdf(
  entries: RetestStudentEntry[],
  titleLabel: string = 'Retest Attending Students List'
): void {
  if (entries.length === 0) return;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const marginX = 12;
  let y = 14;

  pdf.setFont('times', 'bold');
  pdf.setFontSize(12);
  pdf.text('V.S.B. ENGINEERING COLLEGE, KARUR (AUTONOMOUS)', 105, y, { align: 'center' });
  y += 5;
  pdf.setFontSize(11);
  pdf.text(titleLabel.toUpperCase(), 105, y, { align: 'center' });
  y += 5;
  pdf.setFont('times', 'normal');
  pdf.setFontSize(9);
  pdf.text('Pass Criteria: >= 30 / 50 Marks (50M Exam)  |  >= 60 / 100 Marks (100M Exam)  |  Below Cutoff = Retest Attending', 105, y, { align: 'center' });
  y += 6;

  const colW = [10, 30, 48, 22, 24, 20, 16, 16]; // sum = 186mm
  const headers = ['S.No', 'Register No', 'Student Name', 'Class', 'Subject', 'Scored', 'Pass', 'Short'];

  const drawHeader = () => {
    let x = marginX;
    pdf.setFont('times', 'bold');
    pdf.setFontSize(8.5);
    headers.forEach((h, i) => {
      pdf.rect(x, y, colW[i], 7);
      pdf.text(h, x + colW[i] / 2, y + 4.7, { align: 'center' });
      x += colW[i];
    });
    y += 7;
  };

  drawHeader();

  pdf.setFont('times', 'normal');
  pdf.setFontSize(8.2);
  entries.forEach((e, idx) => {
    if (y > 276) {
      pdf.addPage();
      y = 14;
      drawHeader();
      pdf.setFont('times', 'normal');
      pdf.setFontSize(8.2);
    }
    let x = marginX;
    const rowH = 6.5;
    const vals = [
      String(idx + 1),
      e.registerNo,
      e.studentName.slice(0, 26),
      `${e.year}-${e.section}`,
      e.subjectCode,
      `${e.marksObtained}/${e.maxMarks}`,
      String(e.passMark),
      `-${e.deficit}`
    ];
    vals.forEach((v, i) => {
      pdf.rect(x, y, colW[i], rowH);
      pdf.text(v, i === 2 ? x + 1.5 : x + colW[i] / 2, y + 4.4, {
        align: i === 2 ? 'left' : 'center'
      });
      x += colW[i];
    });
    y += rowH;
  });

  const safeName = titleLabel.replace(/[^a-zA-Z0-9_-]+/g, '_');
  pdf.save(`VSBEC_${safeName}.pdf`);
}
