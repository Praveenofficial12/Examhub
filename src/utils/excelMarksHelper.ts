import * as XLSX from 'xlsx';
import { StudentProfile, MarkRecord, SubjectScore, StudentTestMark, TestWindowConfig } from '../types';

/**
 * Anna University Autonomous R-2021 CBCS Grade Calculation
 */
export function calculateGrade(totalMarks: number): {
  grade: 'O' | 'A+' | 'A' | 'B+' | 'B' | 'RA';
  gradePoints: number;
  result: 'PASS' | 'RA';
} {
  const rounded = Math.round(totalMarks);
  if (rounded >= 91) return { grade: 'O', gradePoints: 10, result: 'PASS' };
  if (rounded >= 81) return { grade: 'A+', gradePoints: 9, result: 'PASS' };
  if (rounded >= 71) return { grade: 'A', gradePoints: 8, result: 'PASS' };
  if (rounded >= 60) return { grade: 'B+', gradePoints: 7, result: 'PASS' };
  return { grade: 'RA', gradePoints: 0, result: 'RA' };
}

/**
 * Generate and download an Excel template for a specific test and class
 */
export function downloadTestMarkExcelTemplate({
  students,
  year,
  section,
  test,
  subjectCode = 'AD6301',
  subjectName = 'Autonomous Core Course'
}: {
  students: StudentProfile[];
  year: string;
  section: string;
  test: TestWindowConfig;
  subjectCode?: string;
  subjectName?: string;
}) {
  const rows = students.map((s, idx) => ({
    'S_No': idx + 1,
    'Register_No': s.registerNo,
    'Roll_No': s.rollNo,
    'Student_Name': s.name,
    'Department': s.department,
    'Year': s.year,
    'Section': s.section,
    'Test_Name': test.testName,
    'Subject_Code': subjectCode,
    'Subject_Name': subjectName,
    'Marks_Obtained': '', // Blank for staff to fill
    'Max_Marks': test.maxMarks,
    'Attendance_Percentage': s.attendancePercentage || 95,
    'Remarks': ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 15 }, // Register_No
    { wch: 12 }, // Roll_No
    { wch: 25 }, // Student_Name
    { wch: 10 }, // Dept
    { wch: 6 },  // Year
    { wch: 8 },  // Section
    { wch: 35 }, // Test_Name
    { wch: 12 }, // Sub Code
    { wch: 30 }, // Sub Name
    { wch: 16 }, // Marks_Obtained
    { wch: 12 }, // Max_Marks
    { wch: 14 }, // Attendance
    { wch: 20 }  // Remarks
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks_Entry');

  const sanitizedTest = test.testName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `VSBEC_Mark_Template_Year_${year}_Class_${section}_${sanitizedTest}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Generate and download an official semester Mark Statement Excel template
 */
export function downloadMarkStatementTemplate({
  students,
  year,
  section
}: {
  students: StudentProfile[];
  year: string;
  section: string;
}) {
  const rows = students.map((s, idx) => {
    const deptPrefix = s.department === 'AI&DS' ? 'AD' : s.department === 'CSE' ? 'CS' : s.department === 'ECE' ? 'EC' : 'GE';
    const sem = s.semester || (year === 'I' ? 2 : year === 'II' ? 4 : year === 'III' ? 6 : 8);

    return {
      'S_No': idx + 1,
      'Register_No': s.registerNo,
      'Roll_No': s.rollNo,
      'Student_Name': s.name,
      'Department': s.department,
      'Year': s.year,
      'Section': s.section,
      'Semester': sem,
      'Subject_1_Code': `${deptPrefix}${sem}301`,
      'Subject_1_Internal_40': 35,
      'Subject_1_External_60': 52,
      'Subject_2_Code': `${deptPrefix}${sem}302`,
      'Subject_2_Internal_40': 34,
      'Subject_2_External_60': 48,
      'Subject_3_Code': `${deptPrefix}${sem}303`,
      'Subject_3_Internal_40': 36,
      'Subject_3_External_60': 50,
      'Subject_4_Code': `${deptPrefix}${sem}304`,
      'Subject_4_Internal_40': 32,
      'Subject_4_External_60': 45,
      'Subject_5_Code': `${deptPrefix}${sem}305`,
      'Subject_5_Internal_40': 38,
      'Subject_5_External_60': 54
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mark_Statement');

  const filename = `VSBEC_Mark_Statement_Template_Year_${year}_Class_${section}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Parse an uploaded Excel file for Test Marks
 */
export async function parseTestMarkExcelFile(file: File): Promise<{
  success: boolean;
  records: Array<{
    registerNo: string;
    rollNo?: string;
    studentName: string;
    department?: string;
    year?: string;
    section?: string;
    testName?: string;
    subjectCode: string;
    subjectName: string;
    marksObtained: number;
    maxMarks: number;
    remarks?: string;
  }>;
  errors: string[];
}> {
  const errors: string[] = [];
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, records: [], errors: ['Excel file does not contain any sheets.'] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      return { success: false, records: [], errors: ['No data rows found in the uploaded Excel sheet.'] };
    }

    const parsed: Array<any> = [];

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      // Register No
      const reg = String(row['Register_No'] || row['Register_Number'] || row['RegisterNo'] || row['RegNo'] || '').trim();
      if (!reg) {
        // Skip completely empty rows
        return;
      }

      const name = String(row['Student_Name'] || row['StudentName'] || row['Name'] || '').trim();
      const roll = String(row['Roll_No'] || row['RollNo'] || '').trim();
      const subCode = String(row['Subject_Code'] || row['SubjectCode'] || row['CourseCode'] || 'AD6301').trim();
      const subName = String(row['Subject_Name'] || row['SubjectName'] || row['CourseName'] || 'Autonomous Core Subject').trim();
      
      const rawMarks = row['Marks_Obtained'] !== undefined && row['Marks_Obtained'] !== '' 
        ? row['Marks_Obtained'] 
        : row['Marks'] !== undefined && row['Marks'] !== '' 
        ? row['Marks'] 
        : row['Score'];

      const maxMarks = Number(row['Max_Marks'] || row['MaxMarks'] || 50);
      const marksObtained = Number(rawMarks);

      if (isNaN(marksObtained)) {
        errors.push(`Row ${rowNum} (${name || reg}): Invalid marks value "${rawMarks}".`);
        return;
      }

      if (marksObtained < 0 || marksObtained > maxMarks) {
        errors.push(`Row ${rowNum} (${name || reg}): Marks ${marksObtained} exceeds maximum marks of ${maxMarks}.`);
      }

      parsed.push({
        registerNo: reg,
        rollNo: roll,
        studentName: name,
        department: String(row['Department'] || row['Dept'] || '').trim(),
        year: String(row['Year'] || '').trim(),
        section: String(row['Section'] || '').trim(),
        testName: String(row['Test_Name'] || row['TestName'] || '').trim(),
        subjectCode: subCode,
        subjectName: subName,
        marksObtained: Math.min(Math.max(0, marksObtained), maxMarks),
        maxMarks: maxMarks,
        remarks: String(row['Remarks'] || '').trim()
      });
    });

    return {
      success: errors.length === 0,
      records: parsed,
      errors
    };
  } catch (err: any) {
    return {
      success: false,
      records: [],
      errors: [err?.message || 'Failed to read Excel workbook.']
    };
  }
}

/**
 * Parse an uploaded Excel file for Semester Mark Statements
 */
export async function parseMarkStatementExcelFile(file: File): Promise<{
  success: boolean;
  records: Array<{
    registerNo: string;
    rollNo?: string;
    studentName: string;
    department?: string;
    year?: string;
    section?: string;
    semester?: number;
    subjects: SubjectScore[];
  }>;
  errors: string[];
}> {
  const errors: string[] = [];
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, records: [], errors: ['Excel file does not contain any sheets.'] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      return { success: false, records: [], errors: ['No student rows found in the uploaded Excel sheet.'] };
    }

    const parsed: Array<any> = [];

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const reg = String(row['Register_No'] || row['Register_Number'] || row['RegisterNo'] || '').trim();
      if (!reg) return;

      const name = String(row['Student_Name'] || row['StudentName'] || row['Name'] || '').trim();
      const roll = String(row['Roll_No'] || row['RollNo'] || '').trim();
      const dept = String(row['Department'] || '').trim();
      const year = String(row['Year'] || '').trim();
      const section = String(row['Section'] || '').trim();
      const semester = Number(row['Semester'] || 6);

      const subjects: SubjectScore[] = [];

      // Check subjects 1 to 8
      for (let i = 1; i <= 8; i++) {
        const code = row[`Subject_${i}_Code`] || row[`Sub_${i}_Code`];
        if (code && String(code).trim()) {
          const internal = Number(row[`Subject_${i}_Internal_40`] ?? row[`Sub_${i}_Internal`] ?? 35);
          const external = Number(row[`Subject_${i}_External_60`] ?? row[`Sub_${i}_External`] ?? 50);
          const total = Math.min(100, Math.max(0, internal + external));
          const { grade, gradePoints, result } = calculateGrade(total);

          subjects.push({
            subjectCode: String(code).trim(),
            subjectName: String(row[`Subject_${i}_Name`] || `Core Autonomous Paper ${i}`),
            credits: Number(row[`Subject_${i}_Credits`] || (i <= 4 ? 4 : 3)),
            internalMarks: internal,
            semesterMarks: external,
            totalMarks: total,
            grade,
            gradePoints,
            result
          });
        }
      }

      if (subjects.length === 0) {
        errors.push(`Row ${rowNum} (${name || reg}): No valid subjects or marks found.`);
        return;
      }

      parsed.push({
        registerNo: reg,
        rollNo: roll,
        studentName: name,
        department: dept,
        year,
        section,
        semester,
        subjects
      });
    });

    return {
      success: errors.length === 0,
      records: parsed,
      errors
    };
  } catch (err: any) {
    return {
      success: false,
      records: [],
      errors: [err?.message || 'Failed to parse mark statement Excel.']
    };
  }
}
