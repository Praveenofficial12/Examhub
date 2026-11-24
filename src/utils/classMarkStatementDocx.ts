import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
  VerticalAlign,
  TableLayoutType,
  Footer
} from 'docx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import { ClassMarkStatementDoc, ClassMarkStatementRow } from '../types';

export interface ClassStatementStats {
  total: number;
  appeared: number;
  passed: number;
  failed: number;
  absent: number;
  passPercentage: string;
  averageMark: string;
  highestMark: number;
  topperName: string;
  topperRegNo: string;
  gradeCounts: Record<string, number>;
}

const ROMAN_SEM_MAP: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII'
};

export function toRomanSemester(sem: number): string {
  return ROMAN_SEM_MAP[sem] || String(sem);
}

/**
 * Computes comprehensive summary metrics for a whole-class mark statement
 */
export function computeClassStatementStats(rows: ClassMarkStatementRow[]): ClassStatementStats {
  const total = rows.length;
  const absentRows = rows.filter((r) => r.result === 'AB');
  const appearedRows = rows.filter((r) => r.result !== 'AB');
  const passedRows = appearedRows.filter((r) => r.result === 'PASS');
  const failedRows = appearedRows.filter((r) => r.result === 'RA');

  const appeared = appearedRows.length;
  const passed = passedRows.length;
  const failed = failedRows.length;
  const absent = absentRows.length;
  const passPercentage = total > 0 ? ((passed / total) * 100).toFixed(2) : '0.00';

  const averageMark =
    appeared > 0
      ? (appearedRows.reduce((sum, r) => sum + (Number(r.totalMarks) || 0), 0) / appeared).toFixed(1)
      : '0.0';

  let highestMark = 0;
  let topperName = 'N/A';
  let topperRegNo = '-';

  appearedRows.forEach((r) => {
    if (r.totalMarks > highestMark) {
      highestMark = r.totalMarks;
      topperName = r.studentName;
      topperRegNo = r.registerNo;
    }
  });

  const gradeCounts: Record<string, number> = {
    O: 0,
    'A+': 0,
    A: 0,
    'B+': 0,
    B: 0,
    RA: 0,
    AB: 0
  };

  rows.forEach((r) => {
    const key = r.result === 'AB' ? 'AB' : r.grade || 'RA';
    gradeCounts[key] = (gradeCounts[key] || 0) + 1;
  });

  return {
    total,
    appeared,
    passed,
    failed,
    absent,
    passPercentage,
    averageMark,
    highestMark,
    topperName,
    topperRegNo,
    gradeCounts
  };
}

/**
 * Grade calculator helper consistent with Anna University R-2021 CBCS
 */
export function computeSubjectMarkGrade(
  totalMarks: number,
  maxMarks: number,
  isAbsent: boolean = false
): { grade: string; gradePoints: number; result: 'PASS' | 'RA' | 'AB' } {
  if (isAbsent) {
    return { grade: 'AB', gradePoints: 0, result: 'AB' };
  }
  const safeMax = maxMarks > 0 ? maxMarks : 100;
  const pct = Math.round((totalMarks / safeMax) * 100);
  if (pct >= 91) return { grade: 'O', gradePoints: 10, result: 'PASS' };
  if (pct >= 81) return { grade: 'A+', gradePoints: 9, result: 'PASS' };
  if (pct >= 71) return { grade: 'A', gradePoints: 8, result: 'PASS' };
  if (pct >= 60) return { grade: 'B+', gradePoints: 7, result: 'PASS' };
  return { grade: 'RA', gradePoints: 0, result: 'RA' };
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface SplitGridData {
  isBlank: boolean;
  totalGridRows: number;
  leftRows: (ClassMarkStatementRow | null)[];
  rightStudentRows: ClassMarkStatementRow[];
  summaryItems: { label: string; value: string }[];
}

export function buildFormAC09GridData(doc: ClassMarkStatementDoc): SplitGridData {
  const isBlank = doc.includeValues === false;

  if (isBlank) {
    const leftCount = 33;
    const rightCount = 27;
    const emptyLeft: (ClassMarkStatementRow | null)[] = Array.from({ length: leftCount }, () => null);
    const emptyRight: ClassMarkStatementRow[] = Array.from({ length: rightCount }, (_, idx) => ({
      sno: leftCount + idx + 1,
      registerNo: '',
      rollNo: '',
      studentName: '',
      internalMarks: 0,
      externalMarks: 0,
      totalMarks: 0,
      maxMarks: doc.maxMarks || 100,
      grade: '',
      gradePoints: 0,
      result: 'PASS',
      remarks: '',
      source: 'Draft / Editable'
    }));

    return {
      isBlank: true,
      totalGridRows: leftCount,
      leftRows: emptyLeft,
      rightStudentRows: emptyRight,
      summaryItems: [
        { label: 'No. of Students appeared', value: '' },
        { label: 'No. of Students absent', value: '' },
        { label: 'No. of Students passed', value: '' },
        { label: 'Avg. Marks', value: '' },
        { label: 'No. of Students failed', value: '' },
        { label: 'Pass (%)', value: '' }
      ]
    };
  }

  const rows = doc.rows;
  const stats = computeClassStatementStats(rows);
  const n = rows.length;
  const leftCount = n > 0 ? Math.max(6, Math.ceil((n + 6) / 2)) : 33;
  const leftStudents = rows.slice(0, leftCount);
  const rightStudents = rows.slice(leftCount);
  const totalGridRows = Math.max(leftStudents.length, rightStudents.length + 6);

  const leftRows: (ClassMarkStatementRow | null)[] = Array.from(
    { length: totalGridRows },
    (_, i) => leftStudents[i] || null
  );

  return {
    isBlank: false,
    totalGridRows,
    leftRows,
    rightStudentRows: rightStudents,
    summaryItems: [
      { label: 'No. of Students appeared', value: String(stats.appeared) },
      { label: 'No. of Students absent', value: String(stats.absent) },
      { label: 'No. of Students passed', value: String(stats.passed) },
      { label: 'Avg. Marks', value: String(stats.averageMark) },
      { label: 'No. of Students failed', value: String(stats.failed) },
      { label: 'Pass (%)', value: `${stats.passPercentage}%` }
    ]
  };
}

/**
 * Builds the standard single-list HTML table for Custom Templates using {{MARKS_TABLE}}
 */
export function buildMarksTableHtml(doc: ClassMarkStatementDoc): string {
  const isBlank = doc.includeValues === false;
  const displayRows: ClassMarkStatementRow[] = isBlank
    ? Array.from({ length: 20 }, (_, i) => ({
        sno: i + 1,
        registerNo: '',
        rollNo: '',
        studentName: '',
        internalMarks: 0,
        externalMarks: 0,
        totalMarks: 0,
        maxMarks: doc.maxMarks || 100,
        grade: '',
        gradePoints: 0,
        result: 'PASS',
        remarks: '',
        source: 'Draft / Editable'
      }))
    : doc.rows;

  const rowsHtml = displayRows
    .map(
      (r) => `
      <tr>
        <td style="border: 1px solid #000000; padding: 3px 5px; text-align: center;">${isBlank ? '' : r.sno}</td>
        <td style="border: 1px solid #000000; padding: 3px 6px; text-align: center;">${isBlank ? '' : escapeHtml(r.registerNo)}</td>
        <td style="border: 1px solid #000000; padding: 3px 6px;">${isBlank ? '' : escapeHtml(r.studentName)}</td>
        <td style="border: 1px solid #000000; padding: 3px 5px; text-align: center;">${
          isBlank ? '' : r.result === 'AB' ? 'A' : r.totalMarks
        }</td>
        <td style="border: 1px solid #000000; padding: 3px 5px; text-align: center;">${isBlank ? '' : escapeHtml(r.grade)}</td>
        <td style="border: 1px solid #000000; padding: 3px 5px; text-align: center;">${isBlank ? '' : escapeHtml(r.result)}</td>
      </tr>`
    )
    .join('');

  return `
    <table data-vsbec-marks-table="true" style="width: 100%; border-collapse: collapse; margin: 10px 0; font-family: 'Times New Roman', Times, serif; font-size: 11px; color: #000000;">
      <thead>
        <tr>
          <th style="border: 1px solid #000000; padding: 4px; text-align: center; width: 42px;">S. No.</th>
          <th style="border: 1px solid #000000; padding: 4px 6px; text-align: center;">Roll No. / Reg. No</th>
          <th style="border: 1px solid #000000; padding: 4px 6px; text-align: left;">Name of the Student</th>
          <th style="border: 1px solid #000000; padding: 4px 6px; text-align: center;">Marks Scored</th>
          <th style="border: 1px solid #000000; padding: 4px 6px; text-align: center;">Grade</th>
          <th style="border: 1px solid #000000; padding: 4px 6px; text-align: center;">Result</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
}

function buildSummaryBoxHtml(doc: ClassMarkStatementDoc, stats: ClassStatementStats): string {
  const isBlank = doc.includeValues === false;
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-family: 'Times New Roman', Times, serif; font-size: 11px; color: #000000;">
      <tr>
        <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold;">No. of Students appeared</td>
        <td style="border: 1px solid #000000; padding: 4px 6px; text-align: center;">${isBlank ? '' : stats.appeared}</td>
        <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold;">No. of Students absent</td>
        <td style="border: 1px solid #000000; padding: 4px 6px; text-align: center;">${isBlank ? '' : stats.absent}</td>
        <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold;">No. of Students passed</td>
        <td style="border: 1px solid #000000; padding: 4px 6px; text-align: center;">${isBlank ? '' : stats.passed}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold;">Avg. Marks</td>
        <td style="border: 1px solid #000000; padding: 4px 6px; text-align: center;">${isBlank ? '' : stats.averageMark}</td>
        <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold;">No. of Students failed</td>
        <td style="border: 1px solid #000000; padding: 4px 6px; text-align: center;">${isBlank ? '' : stats.failed}</td>
        <td style="border: 1px solid #000000; padding: 4px 6px; font-weight: bold;">Pass (%)</td>
        <td style="border: 1px solid #000000; padding: 4px 6px; text-align: center;">${isBlank ? '' : `${stats.passPercentage}%`}</td>
      </tr>
    </table>
  `;
}

/**
 * Builds the official Form No. AC 09 HTML sheet with:
 * 1) TWO SEPARATE side-by-side tables with clear space between Left Marks Scored and Right S. No.
 * 2) Clean bottom Valuer & HOD signature block (no horizontal footer divider line).
 */
export function buildFormAC09Html(doc: ClassMarkStatementDoc): string {
  const isBlank = doc.includeValues === false;
  const grid = buildFormAC09GridData(doc);
  const semType = doc.semesterType || (doc.semester % 2 === 0 ? 'EVEN' : 'ODD');
  const maxMarksVal = doc.maxMarks || doc.rows[0]?.maxMarks || 100;

  const acadLine = isBlank
    ? 'Academic Year: _____________________ (_________ Semester)'
    : `Academic Year: ${escapeHtml(doc.academicYear)} (${escapeHtml(semType)} Semester)`;

  const examLine = isBlank
    ? 'Marks Statement for _____________________________________'
    : `Marks Statement for ${escapeHtml(doc.examTitle)}`;

  const classLine = isBlank
    ? '_________________________________________'
    : `${escapeHtml(doc.year)} Year / ${toRomanSemester(doc.semester)} Semester / AI&amp;DS-${
        doc.section === 'ALL' ? '"ALL"' : `&ldquo;${escapeHtml(doc.section)}&rdquo;`
      }`;

  const maxMarksDisplay = isBlank ? '________' : String(maxMarksVal);

  const subjectLine = isBlank
    ? '__________________________________________________________________'
    : `${escapeHtml(doc.subjectCode)} ${escapeHtml(doc.subjectName)}`;

  const facultyLine = isBlank
    ? '__________________________________________________________________'
    : escapeHtml(doc.facultyName);

  // Left 4-Column Table Rows
  const leftBodyRows = Array.from({ length: grid.totalGridRows }, (_, idx) => {
    const left = grid.leftRows[idx];
    const hasLeftStudent = left !== null && !isBlank;
    return `
      <tr>
        <td style="border: 1px solid #000000; padding: 2.5px 3px; text-align: center; height: 21px;">${
          hasLeftStudent ? left.sno : ''
        }</td>
        <td style="border: 1px solid #000000; padding: 2.5px 3px; text-align: center; height: 21px; word-break: break-all;">${
          hasLeftStudent ? escapeHtml(left.registerNo) : ''
        }</td>
        <td style="border: 1px solid #000000; padding: 2.5px 4px; text-align: left; height: 21px; word-break: break-word;">${
          hasLeftStudent ? escapeHtml(left.studentName) : ''
        }</td>
        <td style="border: 1px solid #000000; padding: 2.5px 3px; text-align: center; height: 21px;">${
          hasLeftStudent ? (left.result === 'AB' ? 'A' : left.totalMarks) : ''
        }</td>
      </tr>
    `;
  }).join('');

  // Right 4-Column Table Rows (Students + 6 Summary Rows)
  const rightBodyRows = Array.from({ length: grid.totalGridRows }, (_, idx) => {
    if (idx < grid.rightStudentRows.length) {
      const right = grid.rightStudentRows[idx];
      const hasRightStudent = !isBlank && (Boolean(right.registerNo) || Boolean(right.studentName));
      return `
        <tr>
          <td style="border: 1px solid #000000; padding: 2.5px 3px; text-align: center; height: 21px;">${
            hasRightStudent ? right.sno : ''
          }</td>
          <td style="border: 1px solid #000000; padding: 2.5px 3px; text-align: center; height: 21px; word-break: break-all;">${
            hasRightStudent ? escapeHtml(right.registerNo) : ''
          }</td>
          <td style="border: 1px solid #000000; padding: 2.5px 4px; text-align: left; height: 21px; word-break: break-word;">${
            hasRightStudent ? escapeHtml(right.studentName) : ''
          }</td>
          <td style="border: 1px solid #000000; padding: 2.5px 3px; text-align: center; height: 21px;">${
            hasRightStudent ? (right.result === 'AB' ? 'A' : right.totalMarks) : ''
          }</td>
        </tr>
      `;
    } else if (idx < grid.rightStudentRows.length + 6) {
      const sumIdx = idx - grid.rightStudentRows.length;
      const sumItem = grid.summaryItems[sumIdx];
      return `
        <tr>
          <td data-summary-label="true" colspan="3" style="border: 1px solid #000000; padding: 2.5px 6px; text-align: left; font-weight: 700; height: 21px;">${escapeHtml(
            sumItem.label
          )}</td>
          <td data-summary-value="true" style="border: 1px solid #000000; padding: 2.5px 4px; text-align: center; font-weight: 400; height: 21px;">${escapeHtml(
            sumItem.value
          )}</td>
        </tr>
      `;
    }
    return `
      <tr>
        <td style="border: 1px solid #000000; padding: 2.5px 3px; height: 21px;"></td>
        <td style="border: 1px solid #000000; padding: 2.5px 4px; height: 21px;"></td>
        <td style="border: 1px solid #000000; padding: 2.5px 5px; height: 21px;"></td>
        <td style="border: 1px solid #000000; padding: 2.5px 3px; height: 21px;"></td>
      </tr>
    `;
  }).join('');

  return `
    <div data-form-template="AC09" style="width: 100%; box-sizing: border-box; font-family: 'Times New Roman', Times, serif; color: #000000; line-height: 1.25; font-size: 11px; min-height: 255mm; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="text-align: center; margin-bottom: 8px;">
          <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.2px;">V.S.B. ENGINEERING COLLEGE, KARUR</div>
          <div style="font-size: 12px; font-weight: 700;">(An Autonomous Institution)</div>
          <div style="font-size: 12px; font-weight: 700;">Department of Artificial Intelligence &amp; Data Science</div>
          <div data-ac09-field="academicYear" style="font-size: 12px; font-weight: 700;">${acadLine}</div>
          <div data-ac09-field="examTitle" style="font-size: 12.5px; font-weight: 700; text-decoration: underline; margin-top: 2px;">${examLine}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 11.5px;">
          <tr>
            <td data-ac09-field="classLine" style="padding: 1.5px 0; text-align: left; width: 72%;">
              <strong>Class:</strong> ${classLine}
            </td>
            <td data-ac09-field="maxMarks" style="padding: 1.5px 0; text-align: right; width: 28%;">
              <strong>Max. Marks:</strong> ${maxMarksDisplay}
            </td>
          </tr>
          <tr>
            <td data-ac09-field="subjectLine" colspan="2" style="padding: 1.5px 0; text-align: left;">
              <strong>Name of the Subject:</strong> ${subjectLine}
            </td>
          </tr>
          <tr>
            <td data-ac09-field="facultyLine" colspan="2" style="padding: 1.5px 0 6px 0; text-align: left;">
              <strong>Name of the Faculty Member:</strong> ${facultyLine}
            </td>
          </tr>
        </table>

        <!-- Two Separate Side-by-Side Tables with Explicit Space Between Left Marks Scored & Right S.No. -->
        <div style="display: flex; align-items: stretch; justify-content: space-between; gap: 14px; width: 100%;">
          <table data-vsbec-ac09-left="true" style="width: calc(50% - 7px); border-collapse: collapse; font-size: 10.5px; table-layout: fixed;">
            <thead>
              <tr>
                <th style="border: 1px solid #000000; padding: 3px 2px; text-align: center; font-weight: 700; width: 10%;">S. No.</th>
                <th style="border: 1px solid #000000; padding: 3px 3px; text-align: center; font-weight: 700; width: 29%;">Roll No. / Reg. No</th>
                <th style="border: 1px solid #000000; padding: 3px 4px; text-align: center; font-weight: 700; width: 44%;">Name of the Student</th>
                <th style="border: 1px solid #000000; padding: 3px 2px; text-align: center; font-weight: 700; width: 17%;">Marks Scored</th>
              </tr>
            </thead>
            <tbody>
              ${leftBodyRows}
            </tbody>
          </table>

          <table data-vsbec-ac09-right="true" style="width: calc(50% - 7px); border-collapse: collapse; font-size: 10.5px; table-layout: fixed;">
            <thead>
              <tr>
                <th style="border: 1px solid #000000; padding: 3px 2px; text-align: center; font-weight: 700; width: 10%;">S. No.</th>
                <th style="border: 1px solid #000000; padding: 3px 3px; text-align: center; font-weight: 700; width: 29%;">Roll No. / Reg. No</th>
                <th style="border: 1px solid #000000; padding: 3px 4px; text-align: center; font-weight: 700; width: 44%;">Name of the Student</th>
                <th style="border: 1px solid #000000; padding: 3px 2px; text-align: center; font-weight: 700; width: 17%;">Marks Scored</th>
              </tr>
            </thead>
            <tbody>
              ${rightBodyRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Official Bottom Signatures -->
      <div data-ac09-footer="true" style="margin-top: 20px; padding-top: 10px; width: 100%; font-family: 'Times New Roman', Times, serif; color: #000000; page-break-inside: avoid; break-inside: avoid;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4px;">
          <tr>
            <td style="width: 50%; text-align: left; padding: 14px 4px 2px 0; font-weight: 700; border: none;">
              Signature of the Valuer with Date
            </td>
            <td style="width: 50%; text-align: right; padding: 14px 0 2px 4px; font-weight: 700; border: none;">
              ${escapeHtml(doc.hodName || 'HOD')}
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
}

/**
 * Generates live editable HTML document representing either the Default Form No. AC 09 Template
 * (without values or populated with class records) or a Custom Uploaded Template.
 */
export function buildEditableWordHtml(doc: ClassMarkStatementDoc): string {
  const stats = computeClassStatementStats(doc.rows);
  const marksTableHtml = buildMarksTableHtml(doc);
  const summaryBoxHtml = buildSummaryBoxHtml(doc, stats);
  const isBlank = doc.includeValues === false;

  if (doc.templateMode === 'custom' && doc.customTemplateHtml) {
    let custom = doc.customTemplateHtml;
    const replacements: Record<string, string> = {
      '{{COLLEGE_NAME}}': 'V.S.B. ENGINEERING COLLEGE, KARUR (AUTONOMOUS)',
      '{{DEPARTMENT}}': 'Department of Artificial Intelligence & Data Science',
      '{{ACADEMIC_YEAR}}': isBlank ? '____________' : escapeHtml(doc.academicYear),
      '{{YEAR}}': isBlank ? '____' : `${escapeHtml(doc.year)} Year`,
      '{{SEMESTER}}': isBlank ? '____' : `${toRomanSemester(doc.semester)} Semester`,
      '{{SECTION}}': isBlank ? '____' : doc.section === 'ALL' ? 'All Sections' : `Section "${escapeHtml(doc.section)}"`,
      '{{SUBJECT_CODE}}': isBlank ? '________' : escapeHtml(doc.subjectCode),
      '{{SUBJECT_NAME}}': isBlank ? '________________________' : escapeHtml(doc.subjectName),
      '{{FACULTY_NAME}}': isBlank ? '________________________' : escapeHtml(doc.facultyName),
      '{{EXAM_TITLE}}': isBlank ? '________________________' : escapeHtml(doc.examTitle),
      '{{MAX_MARKS}}': isBlank ? '____' : String(doc.maxMarks || 100),
      '{{DATE}}': isBlank ? '__________' : escapeHtml(doc.examDate),
      '{{EXAM_DATE}}': isBlank ? '__________' : escapeHtml(doc.examDate),
      '{{REGULATION}}': escapeHtml(doc.regulation),
      '{{TOTAL_CANDIDATES}}': isBlank ? '' : String(stats.total),
      '{{APPEARED_COUNT}}': isBlank ? '' : String(stats.appeared),
      '{{ABSENT_COUNT}}': isBlank ? '' : String(stats.absent),
      '{{PASSED_COUNT}}': isBlank ? '' : String(stats.passed),
      '{{FAILED_COUNT}}': isBlank ? '' : String(stats.failed),
      '{{PASS_PERCENTAGE}}': isBlank ? '' : `${stats.passPercentage}%`,
      '{{CLASS_AVERAGE}}': isBlank ? '' : stats.averageMark,
      '{{HIGHEST_MARK}}': isBlank ? '' : String(stats.highestMark),
      '{{CLASS_TOPPER}}': isBlank ? '' : `${escapeHtml(stats.topperName)} (${escapeHtml(stats.topperRegNo)})`,
      '{{HOD_NAME}}': isBlank ? 'HOD' : escapeHtml(doc.hodName),
      '{{COE_NAME}}': escapeHtml(doc.coeName)
    };

    Object.entries(replacements).forEach(([token, val]) => {
      custom = custom.split(token).join(val);
    });

    if (custom.includes('{{MARKS_TABLE}}')) {
      custom = custom.split('{{MARKS_TABLE}}').join(marksTableHtml);
    } else if (
      !custom.includes('data-vsbec-ac09-left') &&
      !custom.includes('data-vsbec-ac09-table') &&
      !custom.includes('data-vsbec-marks-table')
    ) {
      custom += `
        <h3 style="margin-top: 14px; font-family: 'Times New Roman', serif; border-bottom: 1px solid #000; padding-bottom: 4px;">
          ${isBlank ? 'Marks Statement Table' : `${escapeHtml(doc.subjectCode)} — ${escapeHtml(doc.subjectName)}`}
        </h3>
        ${marksTableHtml}
      `;
    }

    if (custom.includes('{{CLASS_SUMMARY}}')) {
      custom = custom.split('{{CLASS_SUMMARY}}').join(summaryBoxHtml);
    } else if (!custom.includes('No. of Students appeared')) {
      custom += summaryBoxHtml;
    }

    const ac09FooterHtml = `
      <div data-ac09-footer="true" style="margin-top: 20px; padding-top: 10px; width: 100%; font-family: 'Times New Roman', Times, serif; color: #000000; page-break-inside: avoid; break-inside: avoid;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4px;">
          <tr>
            <td style="width: 50%; text-align: left; padding: 14px 4px 2px 0; font-weight: 700; border: none;">
              Signature of the Valuer with Date
            </td>
            <td style="width: 50%; text-align: right; padding: 14px 0 2px 4px; font-weight: 700; border: none;">
              ${escapeHtml(doc.hodName || 'HOD')}
            </td>
          </tr>
        </table>
      </div>
    `;

    if (custom.includes('{{FOOTER}}')) {
      custom = custom.split('{{FOOTER}}').join(ac09FooterHtml);
    } else if (!custom.includes('data-ac09-footer="true"')) {
      custom += ac09FooterHtml;
    }

    return custom;
  }

  return buildFormAC09Html(doc);
}

/**
 * Downloads Blank Form No. AC 09 Word Template (.docx) — NO values filled in.
 */
export async function generateBlankFormAC09Docx(): Promise<Blob> {
  const blankDoc: ClassMarkStatementDoc = {
    id: 'BLANK-AC09',
    department: 'AI&DS',
    academicYear: '',
    year: 'I',
    semester: 1,
    section: 'A',
    subjectCode: '',
    subjectName: '',
    facultyName: '',
    examTitle: '',
    examCategory: '',
    examDate: '',
    regulation: 'R-2021 Autonomous (CBCS)',
    maxMarks: 100,
    includeValues: false,
    templateMode: 'default',
    documentTitle: 'Marks Statement',
    documentSubtitle: '',
    headerNotes: '',
    footerNotes: '',
    preparedBy: '',
    hodName: 'HOD',
    coeName: 'COE',
    rows: [],
    status: 'Draft',
    updatedAt: new Date().toISOString()
  };

  return await generateClassMarkStatementDocx(blankDoc);
}

/**
 * Downloads a Sample Customizable Word Template (.docx) containing smart {{PLACEHOLDER}} tokens
 */
export async function generateSampleCustomClassTemplateDocx(): Promise<Blob> {
  const borderSingle = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
  };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 600, right: 600, bottom: 720, left: 600 }
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 30 },
            children: [
              new TextRun({ text: '{{COLLEGE_NAME}}', bold: true, size: 26, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 30 },
            children: [
              new TextRun({ text: '(An Autonomous Institution)', bold: true, size: 22, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 30 },
            children: [
              new TextRun({ text: '{{DEPARTMENT}}', bold: true, size: 22, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 30 },
            children: [
              new TextRun({ text: 'Academic Year: {{ACADEMIC_YEAR}}', bold: true, size: 22, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'Marks Statement for {{EXAM_TITLE}}',
                bold: true,
                size: 22,
                underline: {},
                font: 'Times New Roman'
              })
            ]
          }),
          new Table({
            width: { size: 10706, type: WidthType.DXA },
            layout: TableLayoutType.FIXED,
            columnWidths: [7200, 3506],
            borders: borderSingle,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 7200, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Class: {{YEAR}} / {{SEMESTER}} / {{SECTION}}', bold: true, size: 20, font: 'Times New Roman' })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 3506, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Max. Marks: {{MAX_MARKS}}', bold: true, size: 20, font: 'Times New Roman' })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 7200, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Name of the Subject: {{SUBJECT_CODE}} {{SUBJECT_NAME}}', size: 20, font: 'Times New Roman' })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 3506, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Name of the Faculty Member: {{FACULTY_NAME}}', size: 20, font: 'Times New Roman' })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          new Paragraph({
            spacing: { before: 140, after: 80 },
            children: [new TextRun({ text: '{{MARKS_TABLE}}', bold: true, size: 20, font: 'Times New Roman' })]
          }),
          new Paragraph({
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: '{{CLASS_SUMMARY}}', bold: true, size: 20, font: 'Times New Roman' })]
          })
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}

/**
 * Parses an uploaded custom template (.docx, .html, .htm, .txt) into clean editable HTML + placeholders
 */
export async function parseCustomClassTemplateFile(file: File): Promise<{
  success: boolean;
  html: string;
  rawText: string;
  placeholders: string[];
  error?: string;
}> {
  try {
    const ext = file.name.toLowerCase().split('.').pop() || '';
    let html = '';
    let rawText = '';

    if (ext === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const htmlRes = await mammoth.convertToHtml({ arrayBuffer });
      const textRes = await mammoth.extractRawText({ arrayBuffer });
      html = htmlRes.value || `<p>${escapeHtml(textRes.value)}</p>`;
      rawText = textRes.value;
    } else if (ext === 'html' || ext === 'htm') {
      rawText = await file.text();
      html = rawText;
    } else if (ext === 'txt') {
      rawText = await file.text();
      html = `<div style="font-family: 'Times New Roman', serif; white-space: pre-wrap;">${escapeHtml(rawText)}</div>`;
    } else {
      return {
        success: false,
        html: '',
        rawText: '',
        placeholders: [],
        error: 'Unsupported file format. Please upload a .docx, .html, or .txt template file.'
      };
    }

    const matches = (rawText + ' ' + html).match(/\{\{[A-Z0-9_]+\}\}/g) || [];
    const uniquePlaceholders = Array.from(new Set(matches));

    return {
      success: true,
      html,
      rawText,
      placeholders: uniquePlaceholders
    };
  } catch (err: any) {
    return {
      success: false,
      html: '',
      rawText: '',
      placeholders: [],
      error: err?.message || 'Failed to read custom template file'
    };
  }
}

/**
 * Synchronizes any manual edits made inside the HTML Word Editor back into rows array.
 * Supports BOTH separated Left & Right Form AC 09 tables, legacy 8-col Form AC 09 table, and custom single-list tables.
 */
export function syncEditedWordHtmlToRows(
  editedHtml: string,
  currentRows: ClassMarkStatementRow[],
  maxMarksDefault: number = 100
): ClassMarkStatementRow[] {
  try {
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(editedHtml, 'text/html');

    const parseFourColRow = (
      tds: Element[],
      fallbackIdx: number,
      outArr: ClassMarkStatementRow[]
    ) => {
      if (tds.length !== 4) return;
      const snoTxt = (tds[0].textContent || '').trim();
      const regTxt = (tds[1].textContent || '').trim();
      const nameTxt = (tds[2].textContent || '').trim();
      const markTxt = (tds[3].textContent || '').trim();

      if (regTxt || nameTxt || markTxt) {
        const isAb = markTxt.toUpperCase() === 'A' || markTxt.toUpperCase() === 'AB';
        const numMark = isAb ? 0 : parseFloat(markTxt) || 0;
        const existing = currentRows.find((r) => r.registerNo === regTxt) || currentRows[fallbackIdx];
        const mMax = existing?.maxMarks || maxMarksDefault;
        const computed = computeSubjectMarkGrade(numMark, mMax, isAb);

        outArr.push({
          sno: parseInt(snoTxt, 10) || outArr.length + 1,
          registerNo: regTxt,
          rollNo: existing?.rollNo || regTxt,
          studentName: nameTxt,
          internalMarks: numMark,
          externalMarks: 0,
          totalMarks: numMark,
          maxMarks: mMax,
          grade: computed.grade,
          gradePoints: computed.gradePoints,
          result: computed.result,
          remarks: existing?.remarks || '-',
          source: existing?.source || 'Draft / Editable'
        });
      }
    };

    // Case 1A: Separated Dual Form No. AC 09 Tables
    const leftTable = parsedDoc.querySelector('table[data-vsbec-ac09-left="true"]');
    const rightTable = parsedDoc.querySelector('table[data-vsbec-ac09-right="true"]');
    if (leftTable || rightTable) {
      const leftExtracted: ClassMarkStatementRow[] = [];
      const rightExtracted: ClassMarkStatementRow[] = [];

      if (leftTable) {
        Array.from(leftTable.querySelectorAll('tbody tr')).forEach((tr, rIdx) => {
          parseFourColRow(Array.from(tr.querySelectorAll('td')), rIdx, leftExtracted);
        });
      }
      if (rightTable) {
        Array.from(rightTable.querySelectorAll('tbody tr')).forEach((tr, rIdx) => {
          const tds = Array.from(tr.querySelectorAll('td'));
          if (tds.length === 4 && !tds[0].hasAttribute('data-summary-label')) {
            parseFourColRow(tds, leftExtracted.length + rIdx, rightExtracted);
          }
        });
      }

      const merged = [...leftExtracted, ...rightExtracted].map((row, idx) => ({
        ...row,
        sno: row.sno || idx + 1
      }));
      return merged.length > 0 ? merged : currentRows;
    }

    // Case 1B: Legacy combined 8-col Form AC 09 table
    const ac09Table = parsedDoc.querySelector('table[data-vsbec-ac09-table="true"]');
    if (ac09Table) {
      const trList = Array.from(ac09Table.querySelectorAll('tbody tr'));
      const leftExtracted: ClassMarkStatementRow[] = [];
      const rightExtracted: ClassMarkStatementRow[] = [];

      trList.forEach((tr, rIdx) => {
        const tds = Array.from(tr.querySelectorAll('td'));
        if (tds.length >= 4) {
          parseFourColRow(tds.slice(0, 4), rIdx, leftExtracted);
        }
        if (tds.length === 8) {
          parseFourColRow(tds.slice(4, 8), leftExtracted.length + rIdx, rightExtracted);
        }
      });

      const merged = [...leftExtracted, ...rightExtracted].map((row, idx) => ({
        ...row,
        sno: row.sno || idx + 1
      }));
      return merged.length > 0 ? merged : currentRows;
    }

    // Case 2: Standard single-list custom template table
    const table = parsedDoc.querySelector('table[data-vsbec-marks-table="true"]') || parsedDoc.querySelectorAll('table')[1];
    if (!table) return currentRows;

    const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
    if (bodyRows.length === 0) return currentRows;

    const updatedRows: ClassMarkStatementRow[] = [];

    bodyRows.forEach((tr, idx) => {
      const cells = Array.from(tr.querySelectorAll('td')).map((c) => (c.textContent || '').trim());
      if (cells.length < 4) return;

      const regTxt = cells[1] || '';
      const nameTxt = cells[2] || '';
      const markTxt = cells[3] || '';
      if (!regTxt && !nameTxt && !markTxt) return;

      const baseRow = currentRows[idx] || {
        sno: idx + 1,
        registerNo: '',
        rollNo: '',
        studentName: '',
        internalMarks: 0,
        externalMarks: 0,
        totalMarks: 0,
        maxMarks: maxMarksDefault,
        grade: 'RA',
        gradePoints: 0,
        result: 'RA' as const,
        remarks: '-',
        source: 'Draft / Editable' as const
      };

      const isAb = markTxt.toUpperCase() === 'A' || markTxt.toUpperCase() === 'AB';
      const numMark = isAb ? 0 : parseFloat(markTxt) || baseRow.totalMarks;
      const computed = computeSubjectMarkGrade(numMark, baseRow.maxMarks || maxMarksDefault, isAb);

      updatedRows.push({
        ...baseRow,
        sno: parseInt(cells[0], 10) || idx + 1,
        registerNo: regTxt || baseRow.registerNo,
        studentName: nameTxt || baseRow.studentName,
        totalMarks: numMark,
        grade: cells[4] || computed.grade,
        result: (cells[5] as 'PASS' | 'RA' | 'AB') || computed.result
      });
    });

    return updatedRows.length > 0 ? updatedRows : currentRows;
  } catch {
    return currentRows;
  }
}

/**
 * Generates an authentic Microsoft Word (.docx) document styled cleanly after Form No. AC 09
 * with FIXED DXA column widths (fixing alignment across Word / LibreOffice),
 * an explicit separated gap column between the two student tables,
 * and signatures + Form No. AC 09 pinned cleanly in the Word Footer area.
 */
export async function generateClassMarkStatementDocx(doc: ClassMarkStatementDoc): Promise<Blob> {
  const isBlank = doc.includeValues === false;
  const grid = buildFormAC09GridData(doc);
  const semType = doc.semesterType || (doc.semester % 2 === 0 ? 'EVEN' : 'ODD');
  const maxMarksVal = doc.maxMarks || doc.rows[0]?.maxMarks || 100;

  const singleBlack = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

  const borderBlack = {
    top: singleBlack,
    bottom: singleBlack,
    left: singleBlack,
    right: singleBlack
  };

  // Middle gap cell keeps left & right vertical edges so both adjacent tables remain cleanly closed,
  // while top & bottom are NONE so the white vertical gap cleanly separates both halves.
  const borderGapCell = {
    top: noBorder,
    bottom: noBorder,
    left: singleBlack,
    right: singleBlack
  };

  const borderNone = {
    top: noBorder,
    bottom: noBorder,
    left: noBorder,
    right: noBorder
  };

  const cellMargins = {
    top: 40,
    bottom: 40,
    left: 60,
    right: 60
  };

  const acadText = isBlank
    ? 'Academic Year: _____________________ (_________ Semester)'
    : `Academic Year: ${doc.academicYear} (${semType} Semester)`;

  const examText = isBlank
    ? 'Marks Statement for _____________________________________'
    : `Marks Statement for ${doc.examTitle}`;

  const classText = isBlank
    ? '_________________________________________'
    : `${doc.year} Year / ${toRomanSemester(doc.semester)} Semester / AI&DS-${
        doc.section === 'ALL' ? '"ALL"' : `"${doc.section}"`
      }`;

  const maxMarksText = isBlank ? '________' : String(maxMarksVal);
  const subjectText = isBlank
    ? '__________________________________________________________________'
    : `${doc.subjectCode} ${doc.subjectName}`;
  const facultyText = isBlank
    ? '__________________________________________________________________'
    : doc.facultyName;

  // Usable A4 width = 11906 - 560 - 560 = 10786 dxa
  const USABLE_WIDTH = 10786;

  // 9 columns: Left [540, 1520, 2380, 820] = 5260 + Gap [266] + Right [540, 1520, 2380, 820] = 5260 => Total 10786
  const colWidths = [540, 1520, 2380, 820, 266, 540, 1520, 2380, 820];

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 25 },
      children: [
        new TextRun({
          text: 'V.S.B. ENGINEERING COLLEGE, KARUR',
          bold: true,
          size: 24,
          font: 'Times New Roman',
          color: '000000'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 25 },
      children: [
        new TextRun({
          text: '(An Autonomous Institution)',
          bold: true,
          size: 21,
          font: 'Times New Roman',
          color: '000000'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 25 },
      children: [
        new TextRun({
          text: 'Department of Artificial Intelligence & Data Science',
          bold: true,
          size: 21,
          font: 'Times New Roman',
          color: '000000'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 25 },
      children: [
        new TextRun({
          text: acadText,
          bold: true,
          size: 21,
          font: 'Times New Roman',
          color: '000000'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 110 },
      children: [
        new TextRun({
          text: examText,
          bold: true,
          size: 22,
          underline: {},
          font: 'Times New Roman',
          color: '000000'
        })
      ]
    })
  ];

  // Metadata Table with FIXED DXA columnWidths
  children.push(
    new Table({
      width: { size: USABLE_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: [7686, 3100],
      borders: borderNone,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 7686, type: WidthType.DXA },
              borders: borderNone,
              children: [
                new Paragraph({
                  spacing: { after: 30 },
                  children: [
                    new TextRun({ text: 'Class: ', bold: true, size: 20, font: 'Times New Roman' }),
                    new TextRun({ text: classText, size: 20, font: 'Times New Roman' })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 3100, type: WidthType.DXA },
              borders: borderNone,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 30 },
                  children: [
                    new TextRun({ text: 'Max. Marks: ', bold: true, size: 20, font: 'Times New Roman' }),
                    new TextRun({ text: maxMarksText, size: 20, font: 'Times New Roman' })
                  ]
                })
              ]
            })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              columnSpan: 2,
              width: { size: USABLE_WIDTH, type: WidthType.DXA },
              borders: borderNone,
              children: [
                new Paragraph({
                  spacing: { after: 30 },
                  children: [
                    new TextRun({ text: 'Name of the Subject: ', bold: true, size: 20, font: 'Times New Roman' }),
                    new TextRun({ text: subjectText, size: 20, font: 'Times New Roman' })
                  ]
                })
              ]
            })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              columnSpan: 2,
              width: { size: USABLE_WIDTH, type: WidthType.DXA },
              borders: borderNone,
              children: [
                new Paragraph({
                  spacing: { after: 90 },
                  children: [
                    new TextRun({ text: 'Name of the Faculty Member: ', bold: true, size: 20, font: 'Times New Roman' }),
                    new TextRun({ text: facultyText, size: 20, font: 'Times New Roman' })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  );

  // 9-Column Fixed-Width Grid (Left 4 cols + Middle White Gap + Right 4 cols)
  const headerTitles = [
    'S. No.',
    'Roll No. / Reg. No',
    'Name of the Student',
    'Marks Scored',
    '',
    'S. No.',
    'Roll No. / Reg. No',
    'Name of the Student',
    'Marks Scored'
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headerTitles.map((title, idx) => {
      if (idx === 4) {
        return new TableCell({
          width: { size: colWidths[idx], type: WidthType.DXA },
          borders: borderGapCell,
          children: [new Paragraph({ children: [] })]
        });
      }
      return new TableCell({
        width: { size: colWidths[idx], type: WidthType.DXA },
        borders: borderBlack,
        margins: cellMargins,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 18,
                font: 'Times New Roman',
                color: '000000'
              })
            ]
          })
        ]
      });
    })
  });

  const dataTableRows: TableRow[] = Array.from({ length: grid.totalGridRows }, (_, idx) => {
    const left = grid.leftRows[idx];
    const hasLeft = left !== null && !isBlank;

    const rowCells: TableCell[] = [
      new TableCell({
        width: { size: colWidths[0], type: WidthType.DXA },
        borders: borderBlack,
        margins: cellMargins,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: hasLeft ? String(left.sno) : '', size: 17, font: 'Times New Roman' })]
          })
        ]
      }),
      new TableCell({
        width: { size: colWidths[1], type: WidthType.DXA },
        borders: borderBlack,
        margins: cellMargins,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: hasLeft ? left.registerNo : '', size: 17, font: 'Times New Roman' })]
          })
        ]
      }),
      new TableCell({
        width: { size: colWidths[2], type: WidthType.DXA },
        borders: borderBlack,
        margins: cellMargins,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: hasLeft ? left.studentName : '', size: 17, font: 'Times New Roman' })]
          })
        ]
      }),
      new TableCell({
        width: { size: colWidths[3], type: WidthType.DXA },
        borders: borderBlack,
        margins: cellMargins,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: hasLeft ? (left.result === 'AB' ? 'A' : String(left.totalMarks)) : '',
                size: 17,
                font: 'Times New Roman'
              })
            ]
          })
        ]
      }),
      // Separated Middle Gap Cell
      new TableCell({
        width: { size: colWidths[4], type: WidthType.DXA },
        borders: borderGapCell,
        children: [new Paragraph({ children: [] })]
      })
    ];

    if (idx < grid.rightStudentRows.length) {
      const right = grid.rightStudentRows[idx];
      const hasRight = !isBlank && (Boolean(right.registerNo) || Boolean(right.studentName));

      rowCells.push(
        new TableCell({
          width: { size: colWidths[5], type: WidthType.DXA },
          borders: borderBlack,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: hasRight ? String(right.sno) : '', size: 17, font: 'Times New Roman' })]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[6], type: WidthType.DXA },
          borders: borderBlack,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: hasRight ? right.registerNo : '', size: 17, font: 'Times New Roman' })]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[7], type: WidthType.DXA },
          borders: borderBlack,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: hasRight ? right.studentName : '', size: 17, font: 'Times New Roman' })]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[8], type: WidthType.DXA },
          borders: borderBlack,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: hasRight ? (right.result === 'AB' ? 'A' : String(right.totalMarks)) : '',
                  size: 17,
                  font: 'Times New Roman'
                })
              ]
            })
          ]
        })
      );
    } else if (idx < grid.rightStudentRows.length + 6) {
      const sumIdx = idx - grid.rightStudentRows.length;
      const sumItem = grid.summaryItems[sumIdx];

      rowCells.push(
        new TableCell({
          columnSpan: 3,
          width: { size: colWidths[5] + colWidths[6] + colWidths[7], type: WidthType.DXA },
          borders: borderBlack,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: sumItem.label, bold: true, size: 17, font: 'Times New Roman' })]
            })
          ]
        }),
        new TableCell({
          width: { size: colWidths[8], type: WidthType.DXA },
          borders: borderBlack,
          margins: cellMargins,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: sumItem.value, size: 17, font: 'Times New Roman' })]
            })
          ]
        })
      );
    } else {
      rowCells.push(
        new TableCell({ width: { size: colWidths[5], type: WidthType.DXA }, borders: borderBlack, margins: cellMargins, children: [new Paragraph({ children: [] })] }),
        new TableCell({ width: { size: colWidths[6], type: WidthType.DXA }, borders: borderBlack, margins: cellMargins, children: [new Paragraph({ children: [] })] }),
        new TableCell({ width: { size: colWidths[7], type: WidthType.DXA }, borders: borderBlack, margins: cellMargins, children: [new Paragraph({ children: [] })] }),
        new TableCell({ width: { size: colWidths[8], type: WidthType.DXA }, borders: borderBlack, margins: cellMargins, children: [new Paragraph({ children: [] })] })
      );
    }

    return new TableRow({ cantSplit: true, children: rowCells });
  });

  children.push(
    new Table({
      width: { size: USABLE_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: colWidths,
      borders: borderNone,
      rows: [headerRow, ...dataTableRows]
    })
  );

  const footerSignatureTable = new Table({
    width: { size: USABLE_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [5393, 5393],
    borders: borderNone,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 5393, type: WidthType.DXA },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 140, after: 60 },
                children: [
                  new TextRun({
                    text: 'Signature of the Valuer with Date',
                    bold: true,
                    size: 19,
                    font: 'Times New Roman',
                    color: '000000'
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 5393, type: WidthType.DXA },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 140, after: 60 },
                children: [
                  new TextRun({
                    text: doc.hodName || 'HOD',
                    bold: true,
                    size: 19,
                    font: 'Times New Roman',
                    color: '000000'
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  const wordDocument = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 Portrait
            margin: { top: 560, right: 560, bottom: 960, left: 560 }
          }
        },
        footers: {
          default: new Footer({
            children: [footerSignatureTable]
          })
        },
        children
      }
    ]
  });

  return await Packer.toBlob(wordDocument);
}

/**
 * Generates a crisp, print-ready vector A4 PDF matching Form No. AC 09
 * with separated Left & Right tables, dynamic text wrapping, and Footer anchored at page bottom.
 */
export function generateClassMarkStatementPdf(doc: ClassMarkStatementDoc): Blob {
  const isBlank = doc.includeValues === false;
  const grid = buildFormAC09GridData(doc);
  const semType = doc.semesterType || (doc.semester % 2 === 0 ? 'EVEN' : 'ODD');
  const maxMarksVal = doc.maxMarks || doc.rows[0]?.maxMarks || 100;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const marginX = 10;
  const usableW = 190; // 210 - 20
  const gapW = 6; // clean white gap between Left Marks Scored and Right S. No.
  const halfW = (usableW - gapW) / 2; // 92mm each half
  const colW = [9, 27, 42, 14]; // sums cleanly to 92mm

  let y = 12;

  // Header
  pdf.setFont('times', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  pdf.text('V.S.B. ENGINEERING COLLEGE, KARUR', 105, y, { align: 'center' });
  y += 4.5;
  pdf.setFontSize(10.5);
  pdf.text('(An Autonomous Institution)', 105, y, { align: 'center' });
  y += 4.5;
  pdf.text('Department of Artificial Intelligence & Data Science', 105, y, { align: 'center' });
  y += 4.5;

  const acadLine = isBlank
    ? 'Academic Year: _____________________ (_________ Semester)'
    : `Academic Year: ${doc.academicYear} (${semType} Semester)`;
  pdf.text(acadLine, 105, y, { align: 'center' });
  y += 5;

  const examLine = isBlank
    ? 'Marks Statement for _____________________________________'
    : `Marks Statement for ${doc.examTitle}`;
  pdf.setFontSize(11);
  pdf.text(examLine, 105, y, { align: 'center' });
  const titleW = pdf.getTextWidth(examLine);
  pdf.setLineWidth(0.35);
  pdf.line(105 - titleW / 2, y + 0.8, 105 + titleW / 2, y + 0.8);
  y += 6.5;

  // Metadata Rows
  pdf.setFontSize(10);
  const classVal = isBlank
    ? '_________________________________________'
    : `${doc.year} Year / ${toRomanSemester(doc.semester)} Semester / AI&DS-${
        doc.section === 'ALL' ? '"ALL"' : `"${doc.section}"`
      }`;
  const maxMarksStr = isBlank ? '________' : String(maxMarksVal);
  const subVal = isBlank
    ? '__________________________________________________________________'
    : `${doc.subjectCode} ${doc.subjectName}`;
  const facVal = isBlank
    ? '__________________________________________________________________'
    : doc.facultyName;

  pdf.setFont('times', 'bold');
  pdf.text('Class:', marginX, y);
  pdf.setFont('times', 'normal');
  pdf.text(classVal, marginX + 11.5, y);

  pdf.setFont('times', 'bold');
  pdf.text('Max. Marks:', 210 - marginX - 18, y, { align: 'right' });
  pdf.setFont('times', 'normal');
  pdf.text(maxMarksStr, 210 - marginX, y, { align: 'right' });
  y += 4.5;

  pdf.setFont('times', 'bold');
  pdf.text('Name of the Subject:', marginX, y);
  pdf.setFont('times', 'normal');
  pdf.text(subVal, marginX + 34, y);
  y += 4.5;

  pdf.setFont('times', 'bold');
  pdf.text('Name of the Faculty Member:', marginX, y);
  pdf.setFont('times', 'normal');
  pdf.text(facVal, marginX + 46, y);
  y += 4.5;

  const leftStartX = marginX;
  const rightStartX = marginX + halfW + gapW;

  const drawHalfHeader = (startX: number, topY: number, headerH: number) => {
    const titles = ['S.\nNo.', 'Roll No. /\nReg. No', 'Name of the Student', 'Marks\nScored'];
    let cx = startX;
    pdf.setFont('times', 'bold');
    pdf.setFontSize(8.5);
    titles.forEach((t, i) => {
      pdf.setLineWidth(0.25);
      pdf.rect(cx, topY, colW[i], headerH);
      const lines = t.split('\n');
      if (lines.length === 2) {
        pdf.text(lines[0], cx + colW[i] / 2, topY + headerH / 2 - 1.0, { align: 'center' });
        pdf.text(lines[1], cx + colW[i] / 2, topY + headerH / 2 + 2.4, { align: 'center' });
      } else {
        pdf.text(lines[0], cx + colW[i] / 2, topY + headerH / 2 + 1.0, { align: 'center' });
      }
      cx += colW[i];
    });
  };

  const headerH = 8.5;
  drawHalfHeader(leftStartX, y, headerH);
  drawHalfHeader(rightStartX, y, headerH);
  y += headerH;

  const drawAc09Footer = () => {
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('times', 'bold');
    pdf.setFontSize(9.5);
    pdf.text('Signature of the Valuer with Date', marginX, 278);
    pdf.text(doc.hodName || 'HOD', 210 - marginX, 278, { align: 'right' });
  };

  const maxYBeforePageEnd = 266;
  const baseRowH = grid.totalGridRows > 28 ? 5.3 : 6.0;

  for (let idx = 0; idx < grid.totalGridRows; idx++) {
    const left = grid.leftRows[idx];
    const hasLeft = left !== null && !isBlank;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(8.2);
    const leftNameLines = hasLeft ? pdf.splitTextToSize(left.studentName, colW[2] - 2) : [''];

    const isRightStudent = idx < grid.rightStudentRows.length;
    const isRightSummary = !isRightStudent && idx < grid.rightStudentRows.length + 6;
    const right = isRightStudent ? grid.rightStudentRows[idx] : null;
    const hasRight = Boolean(right && !isBlank && (right.registerNo || right.studentName));
    const rightNameLines =
      hasRight && right ? pdf.splitTextToSize(right.studentName, colW[2] - 2) : [''];

    const maxLines = Math.max(leftNameLines.length, rightNameLines.length, 1);
    const rowH = Math.max(baseRowH, maxLines * 3.6 + 2.0);

    if (y + rowH > maxYBeforePageEnd) {
      drawAc09Footer();
      pdf.addPage();
      y = 14;
      drawHalfHeader(leftStartX, y, headerH);
      drawHalfHeader(rightStartX, y, headerH);
      y += headerH;
    }

    // Draw Left Half Row
    let lx = leftStartX;
    pdf.setLineWidth(0.22);
    pdf.rect(lx, y, colW[0], rowH);
    if (hasLeft) pdf.text(String(left.sno), lx + colW[0] / 2, y + rowH / 2 + 1.1, { align: 'center' });
    lx += colW[0];

    pdf.rect(lx, y, colW[1], rowH);
    if (hasLeft) pdf.text(left.registerNo, lx + colW[1] / 2, y + rowH / 2 + 1.1, { align: 'center' });
    lx += colW[1];

    pdf.rect(lx, y, colW[2], rowH);
    if (hasLeft) {
      const startTextY = y + (rowH - (leftNameLines.length - 1) * 3.4) / 2 + 1.0;
      pdf.text(leftNameLines, lx + 1.2, startTextY);
    }
    lx += colW[2];

    pdf.rect(lx, y, colW[3], rowH);
    if (hasLeft) {
      const markStr = left.result === 'AB' ? 'A' : String(left.totalMarks);
      pdf.text(markStr, lx + colW[3] / 2, y + rowH / 2 + 1.1, { align: 'center' });
    }

    // Draw Right Half Row (with separated gap = gapW)
    let rx = rightStartX;
    if (isRightStudent) {
      pdf.rect(rx, y, colW[0], rowH);
      if (hasRight && right) pdf.text(String(right.sno), rx + colW[0] / 2, y + rowH / 2 + 1.1, { align: 'center' });
      rx += colW[0];

      pdf.rect(rx, y, colW[1], rowH);
      if (hasRight && right) pdf.text(right.registerNo, rx + colW[1] / 2, y + rowH / 2 + 1.1, { align: 'center' });
      rx += colW[1];

      pdf.rect(rx, y, colW[2], rowH);
      if (hasRight && right) {
        const startTextY = y + (rowH - (rightNameLines.length - 1) * 3.4) / 2 + 1.0;
        pdf.text(rightNameLines, rx + 1.2, startTextY);
      }
      rx += colW[2];

      pdf.rect(rx, y, colW[3], rowH);
      if (hasRight && right) {
        const markStr = right.result === 'AB' ? 'A' : String(right.totalMarks);
        pdf.text(markStr, rx + colW[3] / 2, y + rowH / 2 + 1.1, { align: 'center' });
      }
    } else if (isRightSummary) {
      const sumIdx = idx - grid.rightStudentRows.length;
      const sumItem = grid.summaryItems[sumIdx];
      const mergedW = colW[0] + colW[1] + colW[2];

      pdf.rect(rx, y, mergedW, rowH);
      pdf.setFont('times', 'bold');
      pdf.text(sumItem.label, rx + 1.5, y + rowH / 2 + 1.1);
      rx += mergedW;

      pdf.rect(rx, y, colW[3], rowH);
      pdf.setFont('times', 'normal');
      if (sumItem.value) {
        pdf.text(sumItem.value, rx + colW[3] / 2, y + rowH / 2 + 1.1, { align: 'center' });
      }
    } else {
      pdf.rect(rx, y, colW[0], rowH);
      rx += colW[0];
      pdf.rect(rx, y, colW[1], rowH);
      rx += colW[1];
      pdf.rect(rx, y, colW[2], rowH);
      rx += colW[2];
      pdf.rect(rx, y, colW[3], rowH);
    }

    y += rowH;
  }

  drawAc09Footer();

  return pdf.output('blob');
}
