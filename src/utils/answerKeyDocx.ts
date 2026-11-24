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
  TableLayoutType,
  ShadingType
} from 'docx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import { ExamAnswerKey, QuestionKey } from '../types';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface ParsedAnswerBlock {
  type: 'heading' | 'bullet' | 'subbullet' | 'diagram' | 'code' | 'paragraph';
  text: string;
}

/**
 * Strictly groups questions by explicit q.part first so variable-mark Part C questions (e.g. 10M, 14M, 15M, 16M)
 * stay inside PART-C accurately.
 */
export function splitQuestionsByPart(questions: QuestionKey[]): {
  partA: QuestionKey[];
  partB: QuestionKey[];
  partC: QuestionKey[];
} {
  const partA: QuestionKey[] = [];
  const partB: QuestionKey[] = [];
  const partC: QuestionKey[] = [];

  questions.forEach((q) => {
    if (q.part === 'Part A') partA.push(q);
    else if (q.part === 'Part B') partB.push(q);
    else if (q.part === 'Part C') partC.push(q);
    else if (q.positiveMarks <= 3) partA.push(q);
    else if (q.positiveMarks >= 14) partC.push(q);
    else partB.push(q);
  });

  return { partA, partB, partC };
}

/**
 * Estimates printable A4 pages for a single question or whole answer key (~360 words/page with headings & bullets).
 */
export function estimateQuestionPages(q: QuestionKey): number {
  const words = String(q.expectedAnswer || '').trim().split(/\s+/).filter(Boolean).length;
  if (words <= 15) return 0.12;
  const lineBreaks = (String(q.expectedAnswer || '').match(/\n/g) || []).length;
  return Math.max(0.15, Number(((words + lineBreaks * 4) / 360).toFixed(1)));
}

export function estimateAnswerKeyTotalPages(key: ExamAnswerKey): number {
  if (key.questions.length === 0) return 1;
  const sum = key.questions.reduce((acc, q) => acc + estimateQuestionPages(q), 0);
  return Math.max(1, Math.ceil(sum + 0.45));
}

function isDiagramLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return (
    /[┌┐└┘├┤┬┴┼═║╔╗╚╝▼▲◄►]/.test(t) ||
    /──▶|<──|\+--{2,}|-{3,}>|<--+|-+->/.test(t) ||
    (/^\|.+\|$/.test(t) && t.length <= 72) ||
    /^\s*[│|↓↑]\s*$/.test(t)
  );
}

function classifyCodeOrDiagram(langHint: string, content: string): 'diagram' | 'code' {
  const hint = langHint.toLowerCase();
  if (
    hint.includes('diagram') ||
    hint.includes('flow') ||
    hint.includes('ascii') ||
    hint.includes('arch') ||
    hint.includes('mermaid')
  ) {
    return 'diagram';
  }
  const lines = content.split(/\r?\n/);
  if (lines.some((l) => isDiagramLine(l))) {
    return 'diagram';
  }
  return 'code';
}

/**
 * Splits structured expectedAnswer text into cleanly typed blocks:
 * numbered bold subheadings, bullet points, sub-bullets, technical diagrams/flowcharts, code blocks, and points.
 */
export function parseAnswerTextToBlocks(rawAnswer: string): ParsedAnswerBlock[] {
  const normalized = String(rawAnswer || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^#{1,4}\s+/gm, '');

  const lines = normalized.split(/\r?\n/);
  const blocks: ParsedAnswerBlock[] = [];
  let inCodeFence = false;
  let fenceLang = '';
  let codeBuffer: string[] = [];
  let diagramBuffer: string[] = [];

  const flushDiagramBuffer = () => {
    if (diagramBuffer.length > 0) {
      blocks.push({ type: 'diagram', text: diagramBuffer.join('\n') });
      diagramBuffer = [];
    }
  };

  lines.forEach((rawLine) => {
    const trimmed = rawLine.trim();

    // Detect fenced blocks ```diagram ... ``` or ```python ... ```
    if (/^```/.test(trimmed)) {
      flushDiagramBuffer();
      if (!inCodeFence) {
        inCodeFence = true;
        fenceLang = trimmed.replace(/^```/, '').trim();
        codeBuffer = [];
      } else {
        inCodeFence = false;
        if (codeBuffer.length > 0) {
          const joined = codeBuffer.join('\n');
          blocks.push({ type: classifyCodeOrDiagram(fenceLang, joined), text: joined });
        }
        fenceLang = '';
        codeBuffer = [];
      }
      return;
    }

    if (inCodeFence) {
      codeBuffer.push(rawLine);
      return;
    }

    // Collect un-fenced ASCII flowchart/diagram runs cleanly
    if (isDiagramLine(rawLine)) {
      diagramBuffer.push(rawLine.replace(/\s+$/, ''));
      return;
    } else if (diagramBuffer.length > 0 && !trimmed) {
      // Blank line inside or ending a diagram block closes it cleanly
      flushDiagramBuffer();
      return;
    } else {
      flushDiagramBuffer();
    }

    if (!trimmed) return;

    // Level-2 sub-bullets (indented with >= 2 spaces or starts with "o " / "◦ ")
    if (/^\s{2,}[-*•o◦]\s+/.test(rawLine) || /^[o◦]\s+/.test(trimmed)) {
      blocks.push({
        type: 'subbullet',
        text: trimmed.replace(/^[o◦\-*•]\s+/, '').trim()
      });
      return;
    }

    // Level-1 bullet points (- , * , • )
    if (/^[-*•]\s+/.test(trimmed)) {
      blocks.push({
        type: 'bullet',
        text: trimmed.replace(/^[-*•]\s+/, '').trim()
      });
      return;
    }

    // Numbered section heading / subheading inside an answer (e.g. "1. Understanding the Dataset", "Step 1: ...")
    if (
      /^(\d{1,2}\.\s+[^\n]{2,95}|Step\s+\d+\s*[:.-]\s*[^\n]{2,95})$/i.test(trimmed) &&
      trimmed.length <= 105 &&
      !/\.\s+[A-Z]/.test(trimmed.replace(/^\d{1,2}\.\s+/, ''))
    ) {
      blocks.push({
        type: 'heading',
        text: trimmed
      });
      return;
    }

    // Auto-convert dense plain paragraph sentences into point-type bullets so answers are always point-structured
    const sentences = trimmed
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (sentences.length >= 2) {
      sentences.forEach((s) => blocks.push({ type: 'bullet', text: s }));
    } else {
      blocks.push({
        type: 'bullet',
        text: trimmed
      });
    }
  });

  flushDiagramBuffer();
  if (inCodeFence && codeBuffer.length > 0) {
    const joined = codeBuffer.join('\n');
    blocks.push({ type: classifyCodeOrDiagram(fenceLang, joined), text: joined });
  }

  return blocks;
}

/**
 * Formats expectedAnswer into clean point-wise HTML with bold subheadings,
 * two-level bullets, and framed technical Flowcharts/Diagrams fitting A4 Portrait width.
 */
function renderAnswerBlocksHtml(rawAnswer: string): string {
  const blocks = parseAnswerTextToBlocks(rawAnswer);
  if (blocks.length === 0) {
    return `<p style="margin: 6px 0 8px 28px; text-indent: -14px; text-align: justify; line-height: 1.5; font-size: 14px;">•&nbsp;&nbsp;[Enter point-wise answer key here...]</p>`;
  }

  return blocks
    .map((b) => {
      if (b.type === 'heading') {
        return `<p style="margin: 12px 0 5px 0; font-weight: bold; font-size: 14.5px; color: #000000; line-height: 1.38; page-break-after: avoid; break-after: avoid;">${escapeHtml(b.text)}</p>`;
      }
      if (b.type === 'diagram') {
        return `<div data-ak-diagram-box="true" style="margin: 8px 0 10px 24px; border: 1.2px solid #334155; background: #f8fafc; padding: 8px 10px; border-radius: 3px; page-break-inside: avoid; break-inside: avoid;"><div style="font-family: Arial, sans-serif; font-size: 10.5px; font-weight: bold; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">Flowchart / Architecture Diagram</div><pre data-ak-diagram="true" style="margin: 0; font-family: 'Courier New', Consolas, monospace; font-size: 11.5px; line-height: 1.32; color: #0f172a; white-space: pre; overflow-x: auto;">${escapeHtml(b.text)}</pre></div>`;
      }
      if (b.type === 'bullet') {
        const colonIdx = b.text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 50) {
          const lead = b.text.slice(0, colonIdx + 1);
          const rest = b.text.slice(colonIdx + 1);
          return `<p style="margin: 3.5px 0 3.5px 32px; text-indent: -14px; text-align: justify; line-height: 1.5; font-size: 14px; color: #000000;"><span style="font-weight: bold;">•&nbsp;&nbsp;${escapeHtml(lead)}</span>${escapeHtml(rest)}</p>`;
        }
        return `<p style="margin: 3.5px 0 3.5px 32px; text-indent: -14px; text-align: justify; line-height: 1.5; font-size: 14px; color: #000000;">•&nbsp;&nbsp;${escapeHtml(b.text)}</p>`;
      }
      if (b.type === 'subbullet') {
        const colonIdx = b.text.indexOf(':');
        if (colonIdx > 0 && colonIdx < 45) {
          const lead = b.text.slice(0, colonIdx + 1);
          const rest = b.text.slice(colonIdx + 1);
          return `<p style="margin: 2.5px 0 2.5px 60px; text-indent: -14px; text-align: justify; line-height: 1.46; font-size: 13.5px; color: #000000;"><span style="font-weight: bold;">◦&nbsp;&nbsp;${escapeHtml(lead)}</span>${escapeHtml(rest)}</p>`;
        }
        return `<p style="margin: 2.5px 0 2.5px 60px; text-indent: -14px; text-align: justify; line-height: 1.46; font-size: 13.5px; color: #000000;">◦&nbsp;&nbsp;${escapeHtml(b.text)}</p>`;
      }
      if (b.type === 'code') {
        return `<pre style="margin: 6px 0 8px 36px; padding: 7px 10px; font-family: 'Courier New', Consolas, monospace; font-size: 12px; line-height: 1.38; color: #0f172a; background: #f8fafc; border-left: 2.5px solid #475569; white-space: pre-wrap; page-break-inside: avoid; break-inside: avoid;">${escapeHtml(b.text)}</pre>`;
      }
      return `<p style="margin: 3.5px 0 3.5px 32px; text-indent: -14px; text-align: justify; line-height: 1.5; font-size: 14px; color: #000000;">•&nbsp;&nbsp;${escapeHtml(b.text)}</p>`;
    })
    .join('');
}

function formatQuestionHeading(q: QuestionKey, idx: number): string {
  const rawSub = String(q.subDivision || q.questionNo || idx + 1).trim();
  const formattedSub = /[\.\)]$/.test(rawSub)
    ? rawSub
    : /[a-c]$/i.test(rawSub)
    ? `${rawSub})`
    : `${rawSub}.`;
  return `${formattedSub} ${q.questionText || q.topic}`;
}

function buildPartHtmlBlock(
  partLabel: string,
  questions: QuestionKey[],
  isBlank: boolean
): string {
  if (questions.length === 0) return '';
  const itemsHtml = questions
    .map((q, idx) => {
      const heading = isBlank
        ? `${q.subDivision || idx + 1}. ________________________________________________________________`
        : formatQuestionHeading(q, idx);
      const ansHtml = isBlank
        ? `<p style="margin: 8px 0 18px 32px; color: #64748b; font-size: 13.5px; line-height: 1.8;">_____________________________________________________________________________________<br/>_____________________________________________________________________________________</p>`
        : renderAnswerBlocksHtml(q.expectedAnswer || '');

      return `
        <div data-ak-question="${q.questionNo}" style="margin-bottom: 18px;">
          <p style="margin: 12px 0 6px 0; font-weight: bold; font-size: 15px; color: #000000; line-height: 1.42; page-break-after: avoid; break-after: avoid;">
            <span>${escapeHtml(heading)}</span>
            <span style="font-size: 12px; font-weight: normal; color: #475569; margin-left: 8px;">[${q.positiveMarks} Marks]</span>
          </p>
          ${ansHtml}
        </div>
      `;
    })
    .join('');

  return `
    <div style="margin-top: 16px;">
      <p style="text-align: center; font-weight: bold; font-style: italic; text-decoration: underline; font-size: 15.5px; letter-spacing: 0.4px; margin: 16px 0 12px 0; color: #000000; page-break-after: avoid; break-after: avoid;">
        ${escapeHtml(partLabel)}
      </p>
      ${itemsHtml}
    </div>
  `;
}

/**
 * Builds clean official VSBEC Answer Key HTML matching the uploaded Internal Test - III Answer Key PDF template
 */
export function buildDefaultAnswerKeyHtml(key: ExamAnswerKey): string {
  const isBlank = key.includeValues === false;
  const { partA, partB, partC } = splitQuestionsByPart(key.questions);

  const semType = key.semesterType || (key.semester % 2 === 0 ? 'EVEN' : 'ODD');
  const examHeading = (
    key.examTypeLabel ||
    key.examTitle ||
    (key.examCategory === 'Internal'
      ? 'INTERNAL TEST - III'
      : key.examCategory === 'Model'
      ? 'MODEL EXAMINATION'
      : 'END SEMESTER EXAMINATION')
  ).toUpperCase();

  const regulationText = key.regulation || '2023 Regulations';
  const progLabel =
    key.programmeName ||
    `B.TECH AI&DS${key.classYear ? ` (Year ${key.classYear}${key.section ? ` - Section ${key.section}` : ''})` : ''}`;

  const dateFormatted = key.examDate || new Date().toISOString().slice(0, 10);
  const durationLabel = key.duration || (key.examCategory === 'Internal' ? '100 MINS' : '3 HOURS');

  return `
    <div data-vsbec-ak-doc="true" style="font-family: 'Times New Roman', Times, Georgia, serif; color: #000000; display: block; padding: 6px 10px;">
      <div style="text-align: center; line-height: 1.45;">
        <div style="font-size: 17px; font-weight: bold; letter-spacing: 0.3px;">V.S.B. ENGINEERING COLLEGE, KARUR</div>
        <div style="font-size: 15px; font-weight: bold;">(An Autonomous Institution)</div>
        <div style="font-size: 15.5px; font-weight: bold; margin-top: 2px;">${isBlank ? '__________________________' : escapeHtml(examHeading)}</div>
        <div style="font-size: 14.5px; font-weight: bold;">(${escapeHtml(regulationText)})</div>
        <div style="font-size: 14.5px; font-weight: bold;">Academic Year: ${isBlank ? '____________' : escapeHtml(key.academicYear || '2025-2026')} (${escapeHtml(semType)} SEMESTER)</div>
        <div style="font-size: 15.5px; font-weight: bold; margin-top: 4px; letter-spacing: 0.5px;">ANSWER KEY</div>
      </div>

      <div style="margin-top: 14px; font-size: 14px; font-weight: bold; line-height: 1.55;">
        <div>Name Of The Programme(s): ${isBlank ? '_______________________' : escapeHtml(progLabel)}</div>
        <div>Course Code &amp; Course Title: ${isBlank ? '____________________________________________' : `${escapeHtml(key.subjectCode)} ${escapeHtml(key.subjectName.toUpperCase())}`}</div>
        <div>Faculty / Key Prepared By: ${isBlank ? '____________________________' : escapeHtml(key.handledBy || key.ownerStaffName || 'Course Faculty')}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 12px; font-size: 13.5px; font-weight: bold; text-align: center;">
        <tr>
          <td style="width: 25%; padding: 3px 4px;">
            <div>SEMESTER</div>
            <div>${isBlank ? '___' : escapeHtml(String(key.semester))}</div>
          </td>
          <td style="width: 25%; padding: 3px 4px;">
            <div>DATE</div>
            <div>${isBlank ? '__________' : escapeHtml(dateFormatted)}</div>
          </td>
          <td style="width: 25%; padding: 3px 4px;">
            <div>DURATION</div>
            <div>${isBlank ? '________' : escapeHtml(durationLabel.toUpperCase())}</div>
          </td>
          <td style="width: 25%; padding: 3px 4px;">
            <div>MAX MARK</div>
            <div>${isBlank ? '___' : escapeHtml(String(key.maximumMarks))}</div>
          </td>
        </tr>
      </table>

      <div style="border-top: 1px solid #000000; margin-bottom: 10px;"></div>

      ${buildPartHtmlBlock('PART-A', partA.length > 0 || !isBlank ? partA : [
        { questionNo: 1, part: 'Part A', subDivision: '1', topic: '', keyOption: 'Descriptive', positiveMarks: 2, negativeMarks: 0, cognitiveLevel: 'K1 - Remember', mappedSyllabusUnit: '', status: 'Active' },
        { questionNo: 2, part: 'Part A', subDivision: '2', topic: '', keyOption: 'Descriptive', positiveMarks: 2, negativeMarks: 0, cognitiveLevel: 'K1 - Remember', mappedSyllabusUnit: '', status: 'Active' },
        { questionNo: 3, part: 'Part A', subDivision: '3', topic: '', keyOption: 'Descriptive', positiveMarks: 2, negativeMarks: 0, cognitiveLevel: 'K1 - Remember', mappedSyllabusUnit: '', status: 'Active' }
      ], isBlank)}
      ${buildPartHtmlBlock('PART-B', partB.length > 0 || !isBlank ? partB : [
        { questionNo: 6, part: 'Part B', subDivision: '6a)', topic: '', keyOption: 'Descriptive', positiveMarks: 8, negativeMarks: 0, cognitiveLevel: 'K3 - Apply', mappedSyllabusUnit: '', status: 'Active' },
        { questionNo: 7, part: 'Part B', subDivision: '6b)', topic: '', keyOption: 'Descriptive', positiveMarks: 8, negativeMarks: 0, cognitiveLevel: 'K3 - Apply', mappedSyllabusUnit: '', status: 'Active' }
      ], isBlank)}
      ${buildPartHtmlBlock('PART-C', partC, isBlank)}
    </div>
  `;
}

/**
 * Builds Editable Word HTML choosing either Custom Uploaded Template (with smart token replacement)
 * or Official Default VSBEC Answer Key Template.
 */
export function buildEditableAnswerKeyWordHtml(key: ExamAnswerKey): string {
  const isBlank = key.includeValues === false;

  if (key.templateMode === 'custom' && key.customTemplateHtml) {
    const { partA, partB, partC } = splitQuestionsByPart(key.questions);

    const partAHtml = buildPartHtmlBlock('PART-A', partA, isBlank);
    const partBHtml = buildPartHtmlBlock('PART-B', partB, isBlank);
    const partCHtml = buildPartHtmlBlock('PART-C', partC, isBlank);
    const fullBodyHtml = `${partAHtml}${partBHtml}${partCHtml}`;

    const semType = key.semesterType || (key.semester % 2 === 0 ? 'EVEN' : 'ODD');
    const examHeading = (key.examTypeLabel || key.examTitle || `${key.examCategory || 'Autonomous'} Examination`).toUpperCase();

    const replacements: Record<string, string> = {
      '{{COLLEGE_NAME}}': 'V.S.B. ENGINEERING COLLEGE, KARUR',
      '{{DEPARTMENT}}': 'Department of Artificial Intelligence & Data Science',
      '{{EXAM_TITLE}}': escapeHtml(examHeading),
      '{{EXAM_TYPE}}': escapeHtml(examHeading),
      '{{REGULATION}}': escapeHtml(key.regulation || '2023 Regulations'),
      '{{ACADEMIC_YEAR}}': escapeHtml(key.academicYear || '2025-2026'),
      '{{SEMESTER_TYPE}}': escapeHtml(semType),
      '{{PROGRAMME}}': escapeHtml(key.programmeName || 'B.TECH AI&DS'),
      '{{SUBJECT_CODE}}': escapeHtml(key.subjectCode),
      '{{SUBJECT_NAME}}': escapeHtml(key.subjectName),
      '{{SEMESTER}}': String(key.semester),
      '{{YEAR}}': escapeHtml(key.classYear || 'III'),
      '{{SECTION}}': escapeHtml(key.section || 'A'),
      '{{DATE}}': escapeHtml(key.examDate || ''),
      '{{DURATION}}': escapeHtml(key.duration || '100 MINS'),
      '{{MAX_MARKS}}': String(key.maximumMarks),
      '{{SET_CODE}}': escapeHtml(key.setCode),
      '{{FACULTY_NAME}}': escapeHtml(key.handledBy || key.ownerStaffName || 'Course Faculty')
    };

    let custom = `<div data-vsbec-ak-doc="true" style="font-family: 'Times New Roman', Times, serif; color: #000000; padding: 6px 10px;">${key.customTemplateHtml}</div>`;
    Object.entries(replacements).forEach(([token, val]) => {
      custom = custom.split(token).join(val);
    });

    if (custom.includes('{{PART_A_CONTENT}}')) {
      custom = custom.split('{{PART_A_CONTENT}}').join(partAHtml);
    }
    if (custom.includes('{{PART_B_CONTENT}}')) {
      custom = custom.split('{{PART_B_CONTENT}}').join(partBHtml);
    }
    if (custom.includes('{{PART_C_CONTENT}}')) {
      custom = custom.split('{{PART_C_CONTENT}}').join(partCHtml);
    }
    if (custom.includes('{{ANSWER_KEY_BODY}}')) {
      custom = custom.split('{{ANSWER_KEY_BODY}}').join(fullBodyHtml);
    } else if (
      !key.customTemplateHtml.includes('{{PART_A_CONTENT}}') &&
      !key.customTemplateHtml.includes('{{PART_B_CONTENT}}')
    ) {
      custom += fullBodyHtml;
    }

    return custom;
  }

  return buildDefaultAnswerKeyHtml(key);
}

/**
 * Parses an uploaded Custom Answer Key Word Template (.docx, .html, .txt)
 */
export async function parseCustomAnswerKeyTemplateFile(file: File): Promise<{
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
        error: 'Please upload a .docx, .html, or .txt template file.'
      };
    }

    const matches = (rawText + ' ' + html).match(/\{\{[A-Z0-9_]+\}\}/g) || [];
    return {
      success: true,
      html,
      rawText,
      placeholders: Array.from(new Set(matches))
    };
  } catch (err: any) {
    return {
      success: false,
      html: '',
      rawText: '',
      placeholders: [],
      error: err?.message || 'Failed to parse template file.'
    };
  }
}

/**
 * Generates Sample Custom Answer Key Template (.docx) with {{PLACEHOLDER}} tokens
 */
export async function generateSampleCustomAnswerKeyTemplateDocx(): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 720, right: 720, bottom: 850, left: 720 }
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: '{{COLLEGE_NAME}}', bold: true, size: 28, font: 'Times New Roman' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: '(An Autonomous Institution)', bold: true, size: 22, font: 'Times New Roman' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: '{{EXAM_TITLE}}', bold: true, size: 24, font: 'Times New Roman' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [new TextRun({ text: '({{REGULATION}})', bold: true, size: 22, font: 'Times New Roman' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: 'Academic Year: {{ACADEMIC_YEAR}} ({{SEMESTER_TYPE}} SEMESTER)',
                bold: true,
                size: 22,
                font: 'Times New Roman'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: 'ANSWER KEY', bold: true, size: 24, font: 'Times New Roman' })]
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'Name Of The Programme(s): {{PROGRAMME}}', bold: true, size: 22, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Course Code & Course Title: {{SUBJECT_CODE}} {{SUBJECT_NAME}}',
                bold: true,
                size: 22,
                font: 'Times New Roman'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'SEMESTER: {{SEMESTER}}     DATE: {{DATE}}     DURATION: {{DURATION}}     MAX MARK: {{MAX_MARKS}}',
                bold: true,
                size: 20,
                font: 'Times New Roman'
              })
            ]
          }),
          new Paragraph({
            spacing: { before: 120, after: 100 },
            children: [new TextRun({ text: '{{ANSWER_KEY_BODY}}', size: 22, font: 'Times New Roman' })]
          })
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}

/**
 * Extracts clean styled blocks from edited/custom HTML when exporting a Custom Word Template.
 */
function extractCustomHtmlBlocks(html: string): ParsedAnswerBlock[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes = Array.from(doc.body.querySelectorAll('h1, h2, h3, h4, p, li, td'));
    const blocks: ParsedAnswerBlock[] = [];
    nodes.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'p' && el.closest('li')) return;
      if (tag === 'td' && el.querySelector('h1, h2, h3, h4, p, li')) return;
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt) return;
      if (tag.startsWith('h')) {
        blocks.push({ type: 'heading', text: txt });
      } else if (tag === 'li' || txt.startsWith('• ')) {
        blocks.push({ type: 'bullet', text: txt.replace(/^•\s*/, '') });
      } else {
        blocks.push({ type: 'paragraph', text: txt });
      }
    });
    return blocks;
  } catch {
    return [];
  }
}

/**
 * Generates an aligned Microsoft Word (.docx) Answer Key matching the official VSBEC PDF format.
 * Respects Custom Template layouts and manual live Word edits when present.
 */
export async function generateFormattedAnswerKeyDocx(key: ExamAnswerKey): Promise<Blob> {
  const isBlank = key.includeValues === false;
  const semType = key.semesterType || (key.semester % 2 === 0 ? 'EVEN' : 'ODD');
  const examHeading = (
    key.examTypeLabel ||
    key.examTitle ||
    (key.examCategory === 'Internal'
      ? 'INTERNAL TEST - III'
      : key.examCategory === 'Model'
      ? 'MODEL EXAMINATION'
      : 'END SEMESTER EXAMINATION')
  ).toUpperCase();

  const progLabel =
    key.programmeName ||
    `B.TECH AI&DS${key.classYear ? ` (Year ${key.classYear}${key.section ? ` - Section ${key.section}` : ''})` : ''}`;
  const durationLabel = key.duration || (key.examCategory === 'Internal' ? '100 MINS' : '3 HOURS');

  const borderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  };

  // Fixed width metadata strip (10466 DXA total printable width on A4 with 720 DXA margins)
  const metaTable = new Table({
    width: { size: 10466, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: [2400, 2766, 2700, 2600],
    borders: borderNone,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 20 },
                children: [new TextRun({ text: 'SEMESTER', bold: true, size: 21, font: 'Times New Roman' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: isBlank ? '___' : String(key.semester), bold: true, size: 21, font: 'Times New Roman' })]
              })
            ]
          }),
          new TableCell({
            width: { size: 2766, type: WidthType.DXA },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 20 },
                children: [new TextRun({ text: 'DATE', bold: true, size: 21, font: 'Times New Roman' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: isBlank ? '__________' : (key.examDate || ''), bold: true, size: 21, font: 'Times New Roman' })]
              })
            ]
          }),
          new TableCell({
            width: { size: 2700, type: WidthType.DXA },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 20 },
                children: [new TextRun({ text: 'DURATION', bold: true, size: 21, font: 'Times New Roman' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: isBlank ? '________' : durationLabel.toUpperCase(), bold: true, size: 21, font: 'Times New Roman' })]
              })
            ]
          }),
          new TableCell({
            width: { size: 2600, type: WidthType.DXA },
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 20 },
                children: [new TextRun({ text: 'MAX MARK', bold: true, size: 21, font: 'Times New Roman' })]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: isBlank ? '___' : String(key.maximumMarks), bold: true, size: 21, font: 'Times New Roman' })]
              })
            ]
          })
        ]
      })
    ]
  });

  const isCustomMode = Boolean(key.templateMode === 'custom' && key.customTemplateHtml);
  const children: (Paragraph | Table)[] = isCustomMode
    ? []
    : [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: 'V.S.B. ENGINEERING COLLEGE, KARUR', bold: true, size: 26, font: 'Times New Roman' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: '(An Autonomous Institution)', bold: true, size: 23, font: 'Times New Roman' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: isBlank ? '__________________________' : examHeading,
              bold: true,
              size: 24,
              font: 'Times New Roman'
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: `(${key.regulation || '2023 Regulations'})`, bold: true, size: 22, font: 'Times New Roman' })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: `Academic Year: ${isBlank ? '____________' : (key.academicYear || '2025-2026')} (${semType} SEMESTER)`,
              bold: true,
              size: 22,
              font: 'Times New Roman'
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 140 },
          children: [new TextRun({ text: 'ANSWER KEY', bold: true, size: 24, font: 'Times New Roman' })]
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: `Name Of The Programme(s): ${isBlank ? '_______________________' : progLabel}`,
              bold: true,
              size: 22,
              font: 'Times New Roman'
            })
          ]
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: `Course Code & Course Title: ${isBlank ? '____________________________________________' : `${key.subjectCode} ${key.subjectName.toUpperCase()}`}`,
              bold: true,
              size: 22,
              font: 'Times New Roman'
            })
          ]
        }),
        new Paragraph({
          spacing: { after: 90 },
          children: [
            new TextRun({
              text: `Faculty / Key Prepared By: ${isBlank ? '____________________________' : (key.handledBy || key.ownerStaffName || 'Course Faculty')}`,
              bold: true,
              size: 21,
              font: 'Times New Roman'
            })
          ]
        }),
        metaTable,
        new Paragraph({
          spacing: { before: 60, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
          children: []
        })
      ];

  // If live Word edits exist & are non-default, parse paragraphs directly if custom edited text
  const appendPart = (label: string, qs: QuestionKey[]) => {
    if (qs.length === 0) return;
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 120 },
        children: [
          new TextRun({
            text: label,
            bold: true,
            italics: true,
            underline: {},
            size: 24,
            font: 'Times New Roman'
          })
        ]
      })
    );

    qs.forEach((q, idx) => {
      const qTitle = isBlank
        ? `${q.subDivision || idx + 1}. ___________________________________________________________________ [${q.positiveMarks} Marks]`
        : `${formatQuestionHeading(q, idx)}   [${q.positiveMarks} Marks]`;

      children.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          keepNext: true,
          children: [new TextRun({ text: qTitle, bold: true, size: 22, font: 'Times New Roman' })]
        })
      );

      if (isBlank) {
        children.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { after: 160, line: 340 },
            children: [
              new TextRun({
                text: '___________________________________________________________________________________',
                size: 21,
                color: '64748B',
                font: 'Times New Roman'
              })
            ]
          })
        );
        return;
      }

      const blocks = parseAnswerTextToBlocks(q.expectedAnswer || '');
      blocks.forEach((b) => {
        if (b.type === 'heading') {
          children.push(
            new Paragraph({
              spacing: { before: 140, after: 50 },
              keepNext: true,
              children: [new TextRun({ text: b.text, bold: true, size: 23, font: 'Times New Roman' })]
            })
          );
        } else if (b.type === 'diagram') {
          const diagramParas = [
            new Paragraph({
              spacing: { before: 20, after: 40 },
              children: [
                new TextRun({
                  text: 'FLOWCHART / ARCHITECTURE DIAGRAM',
                  bold: true,
                  size: 16,
                  color: '334155',
                  font: 'Calibri'
                })
              ]
            }),
            ...b.text
              .split(/\r?\n/)
              .flatMap((rawLine) => {
                const line = rawLine || ' ';
                if (line.length <= 70) return [line];
                return [line.slice(0, 70), line.slice(70, 140)];
              })
              .map(
                (dLine) =>
                  new Paragraph({
                    spacing: { after: 15, line: 220 },
                    children: [new TextRun({ text: dLine, size: 17, font: 'Courier New', color: '0F172A' })]
                  })
              )
          ];
          children.push(
            new Table({
              width: { size: 9746, type: WidthType.DXA },
              indent: { size: 360, type: WidthType.DXA },
              layout: TableLayoutType.FIXED,
              columnWidths: [9746],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
                left: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
                right: { style: BorderStyle.SINGLE, size: 6, color: '334155' }
              },
              rows: [
                new TableRow({
                  cantSplit: true,
                  children: [
                    new TableCell({
                      width: { size: 9746, type: WidthType.DXA },
                      shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
                      margins: { top: 90, bottom: 90, left: 140, right: 140 },
                      children: diagramParas
                    })
                  ]
                })
              ]
            }),
            new Paragraph({ spacing: { after: 60 }, children: [] })
          );
        } else if (b.type === 'bullet') {
          const colonIdx = b.text.indexOf(':');
          const runs: TextRun[] =
            colonIdx > 0 && colonIdx < 50
              ? [
                  new TextRun({ text: `•  ${b.text.slice(0, colonIdx + 1)}`, bold: true, size: 22, font: 'Times New Roman' }),
                  new TextRun({ text: b.text.slice(colonIdx + 1), size: 22, font: 'Times New Roman' })
                ]
              : [new TextRun({ text: `•  ${b.text}`, size: 22, font: 'Times New Roman' })];

          children.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { left: 540, hanging: 220 },
              spacing: { after: 60, line: 276 },
              children: runs
            })
          );
        } else if (b.type === 'subbullet') {
          const colonIdx = b.text.indexOf(':');
          const runs: TextRun[] =
            colonIdx > 0 && colonIdx < 45
              ? [
                  new TextRun({ text: `o  ${b.text.slice(0, colonIdx + 1)}`, bold: true, size: 21, font: 'Times New Roman' }),
                  new TextRun({ text: b.text.slice(colonIdx + 1), size: 21, font: 'Times New Roman' })
                ]
              : [new TextRun({ text: `o  ${b.text}`, size: 21, font: 'Times New Roman' })];
          children.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { left: 900, hanging: 220 },
              spacing: { after: 50, line: 270 },
              children: runs
            })
          );
        } else if (b.type === 'code') {
          b.text.split(/\r?\n/).forEach((codeLine) => {
            children.push(
              new Paragraph({
                indent: { left: 540 },
                spacing: { after: 20, line: 240 },
                children: [new TextRun({ text: codeLine || ' ', size: 19, font: 'Courier New' })]
              })
            );
          });
        } else {
          children.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { left: 540, hanging: 220 },
              spacing: { after: 60, line: 276 },
              children: [new TextRun({ text: `•  ${b.text}`, size: 22, font: 'Times New Roman' })]
            })
          );
        }
      });
    });
  };

  if (key.templateMode === 'custom' && key.customTemplateHtml) {
    const renderedCustomHtml = key.editedWordHtml || buildEditableAnswerKeyWordHtml(key);
    const customBlocks = extractCustomHtmlBlocks(renderedCustomHtml);
    if (customBlocks.length > 0) {
      customBlocks.forEach((b) => {
        if (b.type === 'heading') {
          children.push(
            new Paragraph({
              spacing: { before: 140, after: 60 },
              keepNext: true,
              children: [new TextRun({ text: b.text, bold: true, size: 24, font: 'Times New Roman' })]
            })
          );
        } else if (b.type === 'bullet') {
          children.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { left: 720, hanging: 240 },
              spacing: { after: 65, line: 288 },
              children: [new TextRun({ text: `•  ${b.text}`, size: 23, font: 'Times New Roman' })]
            })
          );
        } else {
          children.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 80, line: 288 },
              children: [new TextRun({ text: b.text, size: 23, font: 'Times New Roman' })]
            })
          );
        }
      });
    } else {
      const { partA, partB, partC } = splitQuestionsByPart(key.questions);
      appendPart('PART-A', partA);
      appendPart('PART-B', partB);
      appendPart('PART-C', partC);
    }
  } else {
    const { partA, partB, partC } = splitQuestionsByPart(key.questions);
    appendPart('PART-A', partA);
    appendPart('PART-B', partB);
    appendPart('PART-C', partC);
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 Portrait in DXA
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children
      }
    ]
  });

  return await Packer.toBlob(doc);
}

function sanitizePdfText(input: string): string {
  return String(input || '')
    .replace(/[┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬]/g, '+')
    .replace(/[─═]/g, '-')
    .replace(/[│║]/g, '|')
    .replace(/[▶►→]/g, '>')
    .replace(/[◄←]/g, '<')
    .replace(/[▼↓]/g, 'v')
    .replace(/[▲↑]/g, '^')
    .replace(/[◦○]/g, 'o')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/×/g, 'x')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/≈/g, '~=')
    .replace(/θ/g, 'theta')
    .replace(/σ/g, 'sigma')
    .replace(/α/g, 'alpha')
    .replace(/β/g, 'beta')
    .replace(/λ/g, 'lambda')
    .replace(/μ/g, 'mu')
    .replace(/Σ/g, 'Sum')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF•]/g, ' ');
}

/**
 * Generates an aligned Vector PDF (.pdf) using jsPDF matching A4 Portrait Answer Key layout without page footers
 */
export function generateAnswerKeyVectorPdf(key: ExamAnswerKey): Blob {
  const isBlank = key.includeValues === false;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2; // 180mm
  const bottomMargin = 15;

  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - bottomMargin) {
      pdf.addPage();
      y = 16;
    }
  };

  const semType = key.semesterType || (key.semester % 2 === 0 ? 'EVEN' : 'ODD');
  const examHeading = sanitizePdfText(
    key.examTypeLabel ||
      key.examTitle ||
      (key.examCategory === 'Internal'
        ? 'INTERNAL TEST - III'
        : key.examCategory === 'Model'
        ? 'MODEL EXAMINATION'
        : 'END SEMESTER EXAMINATION')
  ).toUpperCase();

  const progLabel = sanitizePdfText(
    key.programmeName ||
      `B.TECH AI&DS${key.classYear ? ` (Year ${key.classYear}${key.section ? ` - Section ${key.section}` : ''})` : ''}`
  );
  const durationLabel = sanitizePdfText(
    key.duration || (key.examCategory === 'Internal' ? '100 MINS' : '3 HOURS')
  );

  if (key.templateMode === 'custom' && key.customTemplateHtml) {
    const renderedCustomHtml = key.editedWordHtml || buildEditableAnswerKeyWordHtml(key);
    const customBlocks = extractCustomHtmlBlocks(renderedCustomHtml);
    if (customBlocks.length > 0) {
      customBlocks.forEach((b) => {
        if (b.type === 'heading') {
          pdf.setFont('times', 'bold');
          pdf.setFontSize(11.5);
          const lines = pdf.splitTextToSize(sanitizePdfText(b.text), contentWidth);
          ensureSpace(lines.length * 5.2 + 4);
          pdf.text(lines, marginX, y);
          y += lines.length * 5.2 + 2;
        } else if (b.type === 'bullet') {
          pdf.setFont('times', 'normal');
          pdf.setFontSize(10.3);
          const lines = pdf.splitTextToSize(sanitizePdfText(`•  ${b.text}`), contentWidth - 8);
          ensureSpace(lines.length * 4.7 + 2);
          pdf.text(lines, marginX + 6, y);
          y += lines.length * 4.7 + 1.6;
        } else {
          pdf.setFont('times', 'normal');
          pdf.setFontSize(10.5);
          const lines = pdf.splitTextToSize(sanitizePdfText(b.text), contentWidth);
          ensureSpace(lines.length * 4.8 + 2.5);
          pdf.text(lines, marginX, y);
          y += lines.length * 4.8 + 2;
        }
      });
      return pdf.output('blob');
    }
  }

  // Centered Header Block
  pdf.setFont('times', 'bold');
  pdf.setFontSize(13);
  pdf.text('V.S.B. ENGINEERING COLLEGE, KARUR', pageWidth / 2, y, { align: 'center' });
  y += 5.5;
  pdf.setFontSize(11.5);
  pdf.text('(An Autonomous Institution)', pageWidth / 2, y, { align: 'center' });
  y += 5.5;
  pdf.text(isBlank ? '__________________________' : examHeading, pageWidth / 2, y, { align: 'center' });
  y += 5.5;
  pdf.text(sanitizePdfText(`(${key.regulation || '2023 Regulations'})`), pageWidth / 2, y, { align: 'center' });
  y += 5.5;
  pdf.text(
    sanitizePdfText(
      `Academic Year: ${isBlank ? '____________' : (key.academicYear || '2025-2026')} (${semType} SEMESTER)`
    ),
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 6;
  pdf.setFontSize(12);
  pdf.text('ANSWER KEY', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Left Programme & Course Lines
  pdf.setFontSize(11);
  const progWrapped = pdf.splitTextToSize(
    `Name Of The Programme(s): ${isBlank ? '_______________________' : progLabel}`,
    contentWidth
  );
  pdf.text(progWrapped, marginX, y);
  y += progWrapped.length * 5.2 + 0.5;
  const courseLine = sanitizePdfText(
    `Course Code & Course Title: ${
      isBlank ? '_________________________________________' : `${key.subjectCode} ${key.subjectName.toUpperCase()}`
    }`
  );
  const wrappedCourse = pdf.splitTextToSize(courseLine, contentWidth);
  pdf.text(wrappedCourse, marginX, y);
  y += wrappedCourse.length * 5.2 + 1;
  pdf.text(
    sanitizePdfText(
      `Faculty / Key Prepared By: ${isBlank ? '____________________________' : (key.handledBy || key.ownerStaffName || 'Course Faculty')}`
    ),
    marginX,
    y
  );
  y += 5.5;

  // 4-Column Centered Metadata Bar
  pdf.setFontSize(10);
  const colPositions = [
    marginX + contentWidth * 0.12,
    marginX + contentWidth * 0.37,
    marginX + contentWidth * 0.63,
    marginX + contentWidth * 0.88
  ];
  pdf.text('SEMESTER', colPositions[0], y, { align: 'center' });
  pdf.text('DATE', colPositions[1], y, { align: 'center' });
  pdf.text('DURATION', colPositions[2], y, { align: 'center' });
  pdf.text('MAX MARK', colPositions[3], y, { align: 'center' });
  y += 4.5;
  pdf.text(isBlank ? '___' : String(key.semester), colPositions[0], y, { align: 'center' });
  pdf.text(isBlank ? '__________' : sanitizePdfText(key.examDate || ''), colPositions[1], y, { align: 'center' });
  pdf.text(isBlank ? '________' : durationLabel.toUpperCase(), colPositions[2], y, { align: 'center' });
  pdf.text(isBlank ? '___' : String(key.maximumMarks), colPositions[3], y, { align: 'center' });
  y += 4;
  pdf.setDrawColor(0);
  pdf.line(marginX, y, pageWidth - marginX, y);
  y += 7;

  const renderPart = (label: string, qs: QuestionKey[]) => {
    if (qs.length === 0) return;
    ensureSpace(16);
    pdf.setFont('times', 'bolditalic');
    pdf.setFontSize(11.5);
    pdf.text(label, pageWidth / 2, y, { align: 'center' });
    const textW = pdf.getTextWidth(label);
    pdf.line(pageWidth / 2 - textW / 2, y + 0.8, pageWidth / 2 + textW / 2, y + 0.8);
    y += 7.5;

    qs.forEach((q, idx) => {
      const qHeader = sanitizePdfText(
        isBlank
          ? `${q.subDivision || idx + 1}. _____________________________________________________ [${q.positiveMarks}M]`
          : `${formatQuestionHeading(q, idx)}   [${q.positiveMarks} Marks]`
      );

      pdf.setFont('times', 'bold');
      pdf.setFontSize(10.8);
      const qLines = pdf.splitTextToSize(qHeader, contentWidth);
      ensureSpace(qLines.length * 5 + 10);
      pdf.text(qLines, marginX, y);
      y += qLines.length * 4.8 + 2.5;

      if (isBlank) {
        pdf.setFont('times', 'normal');
        pdf.setFontSize(10.5);
        pdf.text('____________________________________________________________________________', marginX + 6, y);
        y += 8;
        pdf.text('____________________________________________________________________________', marginX + 6, y);
        y += 10;
        return;
      }

      const blocks = parseAnswerTextToBlocks(q.expectedAnswer || '');
      blocks.forEach((b) => {
        if (b.type === 'heading') {
          pdf.setFont('times', 'bold');
          pdf.setFontSize(11);
          const hLines = pdf.splitTextToSize(sanitizePdfText(b.text), contentWidth);
          ensureSpace(hLines.length * 5 + 4);
          pdf.text(hLines, marginX, y);
          y += hLines.length * 5 + 1.8;
        } else if (b.type === 'diagram') {
          const cleanLines = b.text
            .split(/\r?\n/)
            .map((l) => sanitizePdfText(l))
            .flatMap((l) => (l.length > 78 ? [l.slice(0, 78), l.slice(78, 156)] : [l || ' ']));
          const neededHeight = cleanLines.length * 3.8 + 8;
          const maxBoxFit = pageHeight - bottomMargin - 20;

          if (neededHeight <= maxBoxFit) {
            ensureSpace(neededHeight + 4);
            pdf.setFillColor(248, 250, 252);
            pdf.setDrawColor(51, 65, 85);
            pdf.rect(marginX + 4, y - 3, contentWidth - 4, neededHeight, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            pdf.setTextColor(51, 65, 85);
            pdf.text('FLOWCHART / ARCHITECTURE DIAGRAM', marginX + 7, y + 1);
            pdf.setTextColor(0, 0, 0);
            y += 5;
            pdf.setFont('courier', 'normal');
            pdf.setFontSize(7.8);
            cleanLines.forEach((dLine) => {
              pdf.text(dLine, marginX + 7, y);
              y += 3.8;
            });
            y += 4;
          } else {
            // Safely paginate oversized diagram blocks with closed borders per page
            let cursor = 0;
            while (cursor < cleanLines.length) {
              const availRows = Math.max(4, Math.floor((pageHeight - bottomMargin - y - 10) / 3.8));
              if (availRows < 5) {
                pdf.addPage();
                y = 16;
                continue;
              }
              const chunk = cleanLines.slice(cursor, cursor + availRows);
              const segH = chunk.length * 3.8 + 8;
              pdf.setFillColor(248, 250, 252);
              pdf.setDrawColor(51, 65, 85);
              pdf.rect(marginX + 4, y - 3, contentWidth - 4, segH, 'FD');
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(7.5);
              pdf.setTextColor(51, 65, 85);
              pdf.text(
                cursor === 0 ? 'FLOWCHART / ARCHITECTURE DIAGRAM' : 'FLOWCHART / ARCHITECTURE DIAGRAM (CONT.)',
                marginX + 7,
                y + 1
              );
              pdf.setTextColor(0, 0, 0);
              y += 5;
              pdf.setFont('courier', 'normal');
              pdf.setFontSize(7.8);
              chunk.forEach((dLine) => {
                pdf.text(dLine, marginX + 7, y);
                y += 3.8;
              });
              y += 4;
              cursor += chunk.length;
              if (cursor < cleanLines.length) {
                pdf.addPage();
                y = 16;
              }
            }
          }
        } else if (b.type === 'bullet') {
          pdf.setFont('times', 'normal');
          pdf.setFontSize(10.5);
          const bLines = pdf.splitTextToSize(sanitizePdfText(`•  ${b.text}`), contentWidth - 8);
          ensureSpace(bLines.length * 4.7 + 2);
          pdf.text(bLines, marginX + 6, y);
          y += bLines.length * 4.7 + 1.5;
        } else if (b.type === 'subbullet') {
          pdf.setFont('times', 'normal');
          pdf.setFontSize(10);
          const sbLines = pdf.splitTextToSize(sanitizePdfText(`o  ${b.text}`), contentWidth - 14);
          ensureSpace(sbLines.length * 4.5 + 1.5);
          pdf.text(sbLines, marginX + 12, y);
          y += sbLines.length * 4.5 + 1.3;
        } else if (b.type === 'code') {
          pdf.setFont('courier', 'normal');
          pdf.setFontSize(8.8);
          b.text.split(/\r?\n/).forEach((cLine) => {
            const wrappedCode = pdf.splitTextToSize(sanitizePdfText(cLine || ' '), contentWidth - 14);
            ensureSpace(wrappedCode.length * 4 + 1.5);
            pdf.text(wrappedCode, marginX + 8, y);
            y += wrappedCode.length * 4;
          });
          y += 2;
        } else {
          pdf.setFont('times', 'normal');
          pdf.setFontSize(10.5);
          const pLines = pdf.splitTextToSize(sanitizePdfText(`•  ${b.text}`), contentWidth - 8);
          ensureSpace(pLines.length * 4.7 + 2);
          pdf.text(pLines, marginX + 6, y);
          y += pLines.length * 4.7 + 1.5;
        }
      });

      y += 3;
    });
  };

  const { partA, partB, partC } = splitQuestionsByPart(key.questions);

  renderPart('PART-A', partA);
  renderPart('PART-B', partB);
  renderPart('PART-C', partC);

  return pdf.output('blob');
}

/**
 * Parses edited text lines from Live Word ContentEditable back into an updated ExamAnswerKey's question answers
 * when users directly edit text inside the Word paper canvas.
 */
export function syncEditedAnswerKeyHtml(
  editedHtml: string,
  baseKey: ExamAnswerKey
): ExamAnswerKey {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(editedHtml, 'text/html');
    const qNodes = doc.querySelectorAll('[data-ak-question]');
    if (qNodes.length === 0) {
      return {
        ...baseKey,
        editedWordHtml: editedHtml,
        updatedAt: new Date().toISOString()
      };
    }

    const updatedQuestions = [...baseKey.questions];
    qNodes.forEach((node) => {
      const qNoAttr = parseInt(node.getAttribute('data-ak-question') || '0', 10);
      const qIdx = updatedQuestions.findIndex((q) => q.questionNo === qNoAttr);
      if (qIdx < 0) return;

      const paras = Array.from(node.querySelectorAll('p, pre'));
      let nextQuestionText = updatedQuestions[qIdx].questionText;
      if (paras.length >= 1) {
        const headingSpans = paras[0].querySelectorAll('span');
        const rawHeadingText = (headingSpans.length > 0 ? headingSpans[0].textContent : paras[0].textContent) || '';
        const cleanedHeading = rawHeadingText
          .replace(/\[\s*\d+\s*Marks?\s*\]$/i, '')
          .replace(/^\s*\d{1,2}\s*\(?[a-c]?\)?[\.\)]?\s*/i, '')
          .trim();
        if (cleanedHeading && !/^_+/.test(cleanedHeading)) {
          nextQuestionText = cleanedHeading;
        }
      }

      if (paras.length >= 2) {
        const answerBlocks = paras
          .slice(1)
          .map((el) => {
            if (el.tagName.toLowerCase() === 'pre') {
              const codeTxt = (el.textContent || '').trim();
              if (!codeTxt) return '';
              const isDiag = el.getAttribute('data-ak-diagram') === 'true';
              return isDiag ? `\`\`\`diagram\n${codeTxt}\n\`\`\`` : `\`\`\`\n${codeTxt}\n\`\`\``;
            }
            const txt = (el.textContent || '').replace(/\u00A0/g, ' ').trim();
            if (!txt) return '';
            if (/^•\s*/.test(txt)) return `- ${txt.replace(/^•\s*/, '').trim()}`;
            if (/^◦\s*/.test(txt)) return `  - ${txt.replace(/^◦\s*/, '').trim()}`;
            return txt;
          })
          .filter(Boolean);
        if (answerBlocks.length > 0) {
          updatedQuestions[qIdx] = {
            ...updatedQuestions[qIdx],
            questionText: nextQuestionText,
            expectedAnswer: answerBlocks.join('\n')
          };
          return;
        }
      }

      updatedQuestions[qIdx] = {
        ...updatedQuestions[qIdx],
        questionText: nextQuestionText
      };
    });

    return {
      ...baseKey,
      includeValues: true,
      questions: updatedQuestions,
      editedWordHtml: editedHtml,
      updatedAt: new Date().toISOString()
    };
  } catch {
    return {
      ...baseKey,
      editedWordHtml: editedHtml,
      updatedAt: new Date().toISOString()
    };
  }
}
