import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  Packer,
  VerticalAlign
} from 'docx';
import mammoth from 'mammoth';
import { ExamAnswerKey, QuestionKey, StepRubric, DepartmentCode, ExamCategory } from '../types';

/**
 * Downloads a Blob as a file in the browser.
 */
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(linkWrapper(anchor));
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function linkWrapper(el: HTMLElement) {
  return el;
}

/**
 * Helper to build standard DOCX header & metadata paragraphs for VSBEC
 */
function createInstitutionHeader(answerKey: ExamAnswerKey): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'V.S.B. ENGINEERING COLLEGE, KARUR',
          bold: true,
          size: 30, // 15pt
          color: '781717',
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: '(An Autonomous Institution • Approved by AICTE, New Delhi • Affiliated to Anna University, Chennai)',
          italics: true,
          size: 18,
          color: '475569',
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'OFFICE OF THE CONTROLLER OF EXAMINATIONS',
          bold: true,
          size: 22,
          color: '1E293B',
          font: 'Calibri'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `OFFICIAL VALUATION ANSWER KEY & SCHEME OF EVALUATION`,
          bold: true,
          size: 24,
          underline: {},
          color: '781717',
          font: 'Calibri'
        })
      ]
    })
  ];

  return paragraphs;
}

/**
 * Creates Metadata Info Table in DOCX
 */
function createExamDetailsTable(answerKey: ExamAnswerKey): Table {
  const borderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  };

  const borderSingle = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderSingle,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Department:', bold: true, size: 19 })] })]
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      answerKey.department === 'AI&DS'
                        ? 'Artificial Intelligence & Data Science'
                        : `${answerKey.department} Engineering`,
                    size: 19,
                    bold: true
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Exam / Type:', bold: true, size: 19 })] })]
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: `${answerKey.examCategory || 'Autonomous'} Exam`, bold: true, color: '781717', size: 19 })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Subject Code & Title:', bold: true, size: 19 })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${answerKey.subjectCode} - ${answerKey.subjectName}`, bold: true, size: 19 })] })]
          }),
          new TableCell({
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Regulation & Sem:', bold: true, size: 19 })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${answerKey.regulation} • Sem 0${answerKey.semester}`, size: 19 })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Academic Year:', bold: true, size: 19 })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${answerKey.academicYear || '2025-2026'}`, size: 19 })] })]
          }),
          new TableCell({
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
            children: [new Paragraph({ children: [new TextRun({ text: 'Max Marks & Duration:', bold: true, size: 19 })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${answerKey.maximumMarks} Marks • ${answerKey.duration || '3.0 Hours'}`, bold: true, size: 19 })] })]
          })
        ]
      })
    ]
  });
}

/**
 * Builds standard Part Tables for DOCX
 */
function createPartTable(
  partTitle: string,
  questions: QuestionKey[],
  isDetailedRubric: boolean = false
): Table {
  const borderSingle = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' }
  };

  const headerCells = isDetailedRubric
    ? [
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: '781717', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Q.No', bold: true, color: 'FFFFFF', size: 18 })] })]
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: '781717', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Question / Topic & CO Mapping', bold: true, color: 'FFFFFF', size: 18 })] })]
        }),
        new TableCell({
          width: { size: 36, type: WidthType.PERCENTAGE },
          shading: { fill: '781717', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Expected Key Answer / Derivation / Architecture', bold: true, color: 'FFFFFF', size: 18 })] })]
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: { fill: '781717', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Step-wise Valuation Rubrics', bold: true, color: 'FFFFFF', size: 18 })] })]
        }),
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: '781717', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Marks', bold: true, color: 'FFFFFF', size: 18 })] })]
        })
      ]
    : [
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: '781717', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Q.No', bold: true, color: 'FFFFFF', size: 18 })] })]
        }),
        new TableCell({
          width: { size: 32, type: WidthType.PERCENTAGE },
          shading: { fill: '781717', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Question Description', bold: true, color: 'FFFFFF', size: 18 })] })]
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { fill: '781717', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ children: [new TextRun({ text: 'Answer Key & Technical Core Points', bold: true, color: 'FFFFFF', size: 18 })] })]
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: '781717', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CO / Bloom', bold: true, color: 'FFFFFF', size: 18 })] })]
        }),
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: '781717', type: ShadingType.CLEAR, color: 'auto' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Marks', bold: true, color: 'FFFFFF', size: 18 })] })]
        })
      ];

  const dataRows: TableRow[] = questions.map((q, idx) => {
    const isEven = idx % 2 === 0;
    const bgFill = isEven ? 'FFFFFF' : 'F8FAFC';

    if (isDetailedRubric) {
      const rubricParagraphs: Paragraph[] = (q.rubricBreakdown && q.rubricBreakdown.length > 0)
        ? q.rubricBreakdown.map(
            (r) =>
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: `• ${r.description}: `, size: 16 }),
                  new TextRun({ text: `${r.marks}M`, bold: true, color: '781717', size: 16 })
                ]
              })
          )
        : [
            new Paragraph({
              children: [
                new TextRun({ text: `• Derivation / Concept: ${Math.ceil(q.positiveMarks * 0.6)}M\n• Diagram / Result: ${q.positiveMarks - Math.ceil(q.positiveMarks * 0.6)}M`, size: 16 })
              ]
            })
          ];

      return new TableRow({
        children: [
          new TableCell({
            shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${q.subDivision || q.questionNo}`, bold: true, color: '781717', size: 19 })]
              })
            ]
          }),
          new TableCell({
            shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: q.questionText || q.topic, bold: true, size: 18 })]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `[${q.courseOutcome || 'CO1'} • ${q.cognitiveLevel || 'K3 - Apply'}]`, italics: true, color: '475569', size: 16 })
                ]
              })
            ]
          }),
          new TableCell({
            shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({
                children: [new TextRun({ text: q.expectedAnswer || 'Standard analytical derivation, system block diagrams, algorithm steps, and final mathematical validation.', size: 18 })]
              })
            ]
          }),
          new TableCell({
            shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
            children: rubricParagraphs
          }),
          new TableCell({
            shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${q.positiveMarks}M`, bold: true, size: 19 })]
              })
            ]
          })
        ]
      });
    } else {
      return new TableRow({
        children: [
          new TableCell({
            shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${q.subDivision || q.questionNo}`, bold: true, color: '781717', size: 19 })]
              })
            ]
          }),
          new TableCell({
            shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({
                children: [new TextRun({ text: q.questionText || q.topic, bold: true, size: 18 })]
              })
            ]
          }),
          new TableCell({
            shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({
                children: [new TextRun({ text: q.expectedAnswer || 'Clear technical definition, governing formula equation, and engineering units.', size: 18 })]
              })
            ]
          }),
          new TableCell({
            shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${q.courseOutcome || 'CO1'}\n${q.cognitiveLevel?.slice(0, 2) || 'K2'}`, bold: true, color: '475569', size: 16 })]
              })
            ]
          }),
          new TableCell({
            shading: { fill: bgFill, type: ShadingType.CLEAR, color: 'auto' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${q.positiveMarks}M`, bold: true, size: 19 })]
              })
            ]
          })
        ]
      });
    }
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderSingle,
    rows: [new TableRow({ children: headerCells }), ...dataRows]
  });
}

/**
 * Generates an official Microsoft Word Document (.docx) Blob from an ExamAnswerKey
 */
export async function generateAnswerKeyDocx(answerKey: ExamAnswerKey): Promise<Blob> {
  const partAQuestions = answerKey.questions.filter((q) => (q.part || 'Part A') === 'Part A');
  const partBQuestions = answerKey.questions.filter((q) => q.part === 'Part B');
  const partCQuestions = answerKey.questions.filter((q) => q.part === 'Part C');

  const partATotal = partAQuestions.reduce((s, q) => s + q.positiveMarks, 0);
  const partBTotal = partBQuestions.reduce((s, q) => s + q.positiveMarks, 0);
  const partCTotal = partCQuestions.reduce((s, q) => s + q.positiveMarks, 0);

  const sectionsChildren: (Paragraph | Table)[] = [
    ...createInstitutionHeader(answerKey),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    createExamDetailsTable(answerKey),
    new Paragraph({ spacing: { after: 160 }, children: [] })
  ];

  // Part A Section
  if (partAQuestions.length > 0) {
    sectionsChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({
            text: `PART - A (Short Answer Questions • ${partAQuestions.length} × 2 Marks = ${partATotal} Marks)`,
            bold: true,
            color: '781717',
            size: 20
          })
        ]
      }),
      createPartTable('Part A', partAQuestions, false),
      new Paragraph({ spacing: { after: 160 }, children: [] })
    );
  }

  // Part B Section
  if (partBQuestions.length > 0) {
    sectionsChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({
            text: `PART - B (Descriptive & Analytical Either/Or Questions • ${partBQuestions.length} Questions = ${partBTotal} Marks)`,
            bold: true,
            color: '781717',
            size: 20
          })
        ]
      }),
      createPartTable('Part B', partBQuestions, true),
      new Paragraph({ spacing: { after: 160 }, children: [] })
    );
  }

  // Part C Section
  if (partCQuestions.length > 0) {
    sectionsChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({
            text: `PART - C (Comprehensive Case Study / System Design • ${partCQuestions.length} Question = ${partCTotal} Marks)`,
            bold: true,
            color: '781717',
            size: 20
          })
        ]
      }),
      createPartTable('Part C', partCQuestions, true),
      new Paragraph({ spacing: { after: 200 }, children: [] })
    );
  }

  // Valuation Instructions
  sectionsChildren.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 120, after: 60 },
      children: [
        new TextRun({
          text: 'General Instructions for Evaluators:',
          bold: true,
          size: 18,
          color: '1E293B'
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: '1. Strict adherence to step rubrics specified in this scheme is mandatory for all Autonomous valuation packets.',
          size: 17
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: '2. Proportionate marks must be awarded for relevant circuit diagrams, equations, mathematical steps, and derivations even if the final result has slight computational variations.',
          size: 17
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: '3. Any alternative correct scientific methods/algorithms proposed by students must be awarded full credit.',
          size: 17
        })
      ]
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 Portrait DXA
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720
            }
          }
        },
        children: sectionsChildren
      }
    ]
  });

  return await Packer.toBlob(doc);
}

/**
 * Generates a Blank Formatted Word Document Template (.docx) for faculty to prepare and fill in
 */
export async function generateBlankTemplateDocx(
  dept: DepartmentCode = 'CSE',
  category: ExamCategory = 'Model',
  subjectCode: string = 'CS3401',
  subjectName: string = 'Core Engineering Discipline'
): Promise<Blob> {
  const isInternal = category === 'Internal';
  const partACount = isInternal ? 5 : 10;
  const partBCount = isInternal ? 2 : 5;
  const partCCount = 1;

  const mockQuestions: QuestionKey[] = [];
  let qIdx = 1;

  for (let i = 1; i <= partACount; i++) {
    mockQuestions.push({
      questionNo: qIdx,
      part: 'Part A',
      subDivision: `${i}`,
      questionText: `[Type Question ${i} Text Here...]`,
      topic: `Unit ${((i - 1) % 5) + 1} Foundation Concept`,
      keyOption: 'Descriptive',
      positiveMarks: 2,
      negativeMarks: 0,
      cognitiveLevel: i <= partACount / 2 ? 'K1 - Remember' : 'K2 - Understand',
      mappedSyllabusUnit: `Unit ${((i - 1) % 5) + 1}`,
      courseOutcome: `CO${((i - 1) % 5) + 1}` as any,
      status: 'Active',
      expectedAnswer: `[Type standard definition, formula, or key concept for Q${i} here...]`,
      pageNo: 1
    });
    qIdx++;
  }

  const basePartB = isInternal ? 6 : 11;
  for (let i = 1; i <= partBCount; i++) {
    const qNum = basePartB + (i - 1);
    mockQuestions.push({
      questionNo: qIdx,
      part: 'Part B',
      subDivision: `${qNum}(a)`,
      questionText: `[Type Part B Question ${qNum}(a) Analytical / Derivation Problem Here...]`,
      topic: `Unit ${i} Core Technical System`,
      keyOption: 'Descriptive',
      positiveMarks: 13,
      negativeMarks: 0,
      cognitiveLevel: 'K3 - Apply',
      mappedSyllabusUnit: `Unit ${i}`,
      courseOutcome: `CO${i}` as any,
      status: 'Active',
      expectedAnswer: `[Type complete mathematical derivation, circuit diagram description, and solution here...]`,
      rubricBreakdown: [
        { stepNo: 1, description: 'Principle / Diagram / Formula', marks: 3 },
        { stepNo: 2, description: 'Step-by-step Mathematical Derivation / Algorithm', marks: 6 },
        { stepNo: 3, description: 'Result evaluation & Discussion', marks: 4 }
      ],
      pageNo: 2
    });
    qIdx++;
  }

  const basePartC = isInternal ? 8 : 16;
  mockQuestions.push({
    questionNo: qIdx,
    part: 'Part C',
    subDivision: `${basePartC}`,
    questionText: `[Type Part C Comprehensive Case Study / System Design Problem Here...]`,
    topic: 'Integrated Case Study',
    keyOption: 'Descriptive',
    positiveMarks: isInternal ? 14 : 15,
    negativeMarks: 0,
    cognitiveLevel: 'K5 - Evaluate',
    mappedSyllabusUnit: 'Unit V',
    courseOutcome: 'CO5',
    status: 'Active',
    expectedAnswer: `[Type complete case study solution, design parameters, and conclusions here...]`,
    rubricBreakdown: [
      { stepNo: 1, description: 'Problem formulation & System architecture', marks: 5 },
      { stepNo: 2, description: 'Implementation details & calculations', marks: 6 },
      { stepNo: 3, description: 'Performance analysis & results', marks: isInternal ? 3 : 4 }
    ],
    pageNo: 3
  });

  const templateKey: ExamAnswerKey = {
    id: `TEMPLATE-${subjectCode}-${category.toUpperCase()}`,
    subjectCode,
    subjectName,
    regulation: 'R-2021 Autonomous (CBCS)',
    semester: 5,
    department: dept,
    examCategory: category,
    academicYear: '2025-2026',
    duration: isInternal ? '1.5 Hours' : '3.0 Hours',
    setCode: 'Set A',
    totalQuestions: mockQuestions.length,
    maximumMarks: isInternal ? 50 : 100,
    createdDate: new Date().toISOString().split('T')[0],
    approvedBy: 'HOD / BOS Chairperson',
    isLocked: false,
    questions: mockQuestions
  };

  return await generateAnswerKeyDocx(templateKey);
}

/**
 * Parses an uploaded Word Document (.docx) using mammoth and regex tables extraction
 */
export async function parseAnswerKeyFromWord(file: File): Promise<{
  success: boolean;
  questions: QuestionKey[];
  metadata: Partial<ExamAnswerKey>;
  rawHtml?: string;
  errors: string[];
}> {
  const errors: string[] = [];
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const rawHtml = result.value;
    const messages = result.messages;

    const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
    const fullText = rawTextResult.value;

    const metadata: Partial<ExamAnswerKey> = {
      uploadedTemplateName: file.name
    };

    // Extract metadata from text
    const subCodeMatch = fullText.match(/([A-Z]{2,4}\d{4})/i);
    if (subCodeMatch) metadata.subjectCode = subCodeMatch[1].toUpperCase();

    const regMatch = fullText.match(/(R-?\s*20\d{2})/i);
    if (regMatch) metadata.regulation = regMatch[1].toUpperCase();

    if (fullText.includes('Internal') || fullText.includes('IAT')) {
      metadata.examCategory = 'Internal';
    } else if (fullText.includes('Model')) {
      metadata.examCategory = 'Model';
    } else if (fullText.includes('End Semester') || fullText.includes('ESE')) {
      metadata.examCategory = 'Semester';
    }

    // Parse HTML tables for structured question rows
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const tables = doc.querySelectorAll('table');

    const parsedQuestions: QuestionKey[] = [];
    let currentQNo = 1;

    tables.forEach((table, tableIdx) => {
      const rows = table.querySelectorAll('tr');
      if (rows.length <= 1) return;

      rows.forEach((row, rowIdx) => {
        // Skip header row
        if (rowIdx === 0) return;
        const cells = Array.from(row.querySelectorAll('td, th')).map((c) => (c.textContent || '').trim());
        if (cells.length < 3) return;

        // Try to identify row format
        const firstCol = cells[0];
        const isHeaderLike = firstCol.toLowerCase().includes('q.no') || firstCol.toLowerCase().includes('question');
        if (isHeaderLike) return;

        const qNumParsed = parseInt(firstCol.replace(/\D/g, '')) || currentQNo;
        const subDivision = firstCol || `${currentQNo}`;
        const questionText = cells[1] || `Question ${subDivision}`;
        const expectedAnswer = cells[2] || 'Standard derivation / answer key.';
        
        let marks = 2;
        let cognitiveLevel: any = 'K2 - Understand';
        let courseOutcome: any = 'CO1';
        let rubrics: StepRubric[] = [];

        // Check if there are 5 columns (Part B/C format with step rubrics or CO)
        if (cells.length >= 5) {
          const rubricOrCoCol = cells[3];
          const lastMarksCol = cells[cells.length - 1];
          marks = parseFloat(lastMarksCol.replace(/[^\d.]/g, '')) || (qNumParsed > 10 ? 13 : 2);

          if (rubricOrCoCol.includes('CO')) {
            const coMatch = rubricOrCoCol.match(/CO[1-6]/i);
            if (coMatch) courseOutcome = coMatch[0].toUpperCase();
          }

          if (rubricOrCoCol.includes('K')) {
            const kMatch = rubricOrCoCol.match(/K[1-6]/i);
            if (kMatch) {
              const kCode = kMatch[0].toUpperCase();
              if (kCode === 'K1') cognitiveLevel = 'K1 - Remember';
              else if (kCode === 'K2') cognitiveLevel = 'K2 - Understand';
              else if (kCode === 'K3') cognitiveLevel = 'K3 - Apply';
              else if (kCode === 'K4') cognitiveLevel = 'K4 - Analyze';
              else if (kCode === 'K5') cognitiveLevel = 'K5 - Evaluate';
              else if (kCode === 'K6') cognitiveLevel = 'K6 - Create';
            }
          }

          // Parse bulleted rubrics if present in column 3
          if (cells.length >= 4 && cells[3].includes('•') || cells[3].includes(':')) {
            const lines = cells[3].split(/[\n•]/).filter((l) => l.trim().length > 0);
            lines.forEach((line, sIdx) => {
              const markMatch = line.match(/(\d+(?:\.\d+)?)\s*M/i);
              const stepMark = markMatch ? parseFloat(markMatch[1]) : 2;
              rubrics.push({
                stepNo: sIdx + 1,
                description: line.replace(/(\d+(?:\.\d+)?)\s*M/i, '').replace(/[:\-]/, '').trim(),
                marks: stepMark
              });
            });
          }
        } else if (cells.length >= 4) {
          const marksCandidate = parseFloat(cells[cells.length - 1].replace(/[^\d.]/g, ''));
          if (!isNaN(marksCandidate)) marks = marksCandidate;
        }

        const part = marks <= 2 ? 'Part A' : marks >= 14 ? 'Part C' : 'Part B';

        parsedQuestions.push({
          questionNo: currentQNo,
          part,
          subDivision,
          questionText,
          topic: questionText.slice(0, 45) || `Core Concept Q${currentQNo}`,
          cognitiveLevel,
          courseOutcome,
          mappedSyllabusUnit: `Unit ${((currentQNo - 1) % 5) + 1}`,
          positiveMarks: marks,
          negativeMarks: 0,
          keyOption: 'Descriptive',
          expectedAnswer,
          rubricBreakdown: rubrics.length > 0 ? rubrics : undefined,
          status: 'Active',
          pageNo: Math.min(4, Math.floor((currentQNo - 1) / 3) + 1)
        });

        currentQNo++;
      });
    });

    // Fallback: If no tables were detected, parse paragraphs and numbered lines
    if (parsedQuestions.length === 0) {
      const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      let pQNo = 1;

      lines.forEach((line) => {
        const questionMatch = line.match(/^(\d{1,2}|Q\d{1,2}|[0-9]{1,2}\([a-z]\))\s*[\.\:\-\)]\s*(.+)/i);
        if (questionMatch) {
          const subDiv = questionMatch[1];
          const text = questionMatch[2];
          const isPartB = pQNo > 10;
          parsedQuestions.push({
            questionNo: pQNo,
            part: isPartB ? 'Part B' : 'Part A',
            subDivision: subDiv,
            questionText: text,
            topic: text.slice(0, 40),
            cognitiveLevel: isPartB ? 'K3 - Apply' : 'K2 - Understand',
            courseOutcome: `CO${((pQNo - 1) % 5) + 1}` as any,
            mappedSyllabusUnit: `Unit ${((pQNo - 1) % 5) + 1}`,
            positiveMarks: isPartB ? 13 : 2,
            negativeMarks: 0,
            keyOption: 'Descriptive',
            expectedAnswer: 'Answer key extracted from Word document.',
            status: 'Active',
            pageNo: 1
          });
          pQNo++;
        }
      });
    }

    if (parsedQuestions.length === 0) {
      errors.push('No structured question rows or numbered questions could be identified in the uploaded Word document.');
      return { success: false, questions: [], metadata, rawHtml, errors };
    }

    return {
      success: true,
      questions: parsedQuestions,
      metadata,
      rawHtml,
      errors
    };
  } catch (err: any) {
    errors.push(`Word document parsing failed: ${err.message || 'Corrupted or unsupported format'}`);
    return {
      success: false,
      questions: [],
      metadata: {},
      errors
    };
  }
}
