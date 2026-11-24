import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle
} from 'docx';
import { ExamAnswerKey } from '../types';

/**
 * Generate official Anna University Autonomous R-2021 CBCS
 * Word (.docx) Answer Key Document for Department of AI&DS.
 */
export async function generateAnswerKeyDocx(key: ExamAnswerKey): Promise<Blob> {
  const borderStyle = {
    top: { style: BorderStyle.SINGLE, size: 1, color: '781717' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: '781717' },
    left: { style: BorderStyle.SINGLE, size: 1, color: '781717' },
    right: { style: BorderStyle.SINGLE, size: 1, color: '781717' }
  };

  const headerCells = [
    { text: 'Q.No', width: 8 },
    { text: 'Question Description & Sub-division', width: 28 },
    { text: 'Cognitive Level', width: 14 },
    { text: 'CO', width: 8 },
    { text: 'Key Answer / Derivation / Algorithm / Solution', width: 32 },
    { text: 'Marks Rubric', width: 10 }
  ];

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: headerCells.map(
      (cell) =>
        new TableCell({
          width: { size: cell.width, type: WidthType.PERCENTAGE },
          shading: { fill: '781717' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: cell.text,
                  bold: true,
                  color: 'FFFFFF',
                  size: 20, // 10pt
                  font: 'Arial'
                })
              ]
            })
          ]
        })
    )
  });

  // Rows for questions
  const questionRows = key.questions.map((q, idx) => {
    const isEven = idx % 2 === 0;
    const bgFill = isEven ? 'FFFFFF' : 'F9FBFD';

    const rubricLines = q.rubricBreakdown && q.rubricBreakdown.length > 0
      ? q.rubricBreakdown.map((r) => `${r.description}: ${r.marks}M`).join('; ')
      : `${q.positiveMarks} Mark(s)`;

    return new TableRow({
      children: [
        // Q.No
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: bgFill },
          borders: borderStyle,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `${q.questionNo}${q.subDivision ? q.subDivision : ''}`,
                  bold: true,
                  font: 'Arial',
                  size: 20
                })
              ]
            })
          ]
        }),
        // Question Text
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          shading: { fill: bgFill },
          borders: borderStyle,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: q.questionText || `Question ${q.questionNo} (${q.topic})`,
                  font: 'Arial',
                  size: 19
                })
              ]
            })
          ]
        }),
        // Cognitive Level
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          shading: { fill: bgFill },
          borders: borderStyle,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: q.cognitiveLevel || 'K3 - Apply',
                  bold: true,
                  font: 'Arial',
                  size: 18,
                  color: '781717'
                })
              ]
            })
          ]
        }),
        // Course Outcome
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: { fill: bgFill },
          borders: borderStyle,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: q.courseOutcome || 'CO1',
                  bold: true,
                  font: 'Arial',
                  size: 19
                })
              ]
            })
          ]
        }),
        // Expected Answer / Solution
        new TableCell({
          width: { size: 32, type: WidthType.PERCENTAGE },
          shading: { fill: bgFill },
          borders: borderStyle,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: q.expectedAnswer || 'Detailed solution and derivation provided in valuation scheme.',
                  font: 'Arial',
                  size: 19
                })
              ]
            })
          ]
        }),
        // Rubric / Marks
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { fill: bgFill },
          borders: borderStyle,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: rubricLines,
                  bold: true,
                  font: 'Arial',
                  size: 19,
                  color: '1E3A8A'
                })
              ]
            })
          ]
        })
      ]
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 Portrait DXA
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children: [
          // Institutional Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'V.S.B. ENGINEERING COLLEGE (AUTONOMOUS)',
                bold: true,
                size: 28, // 14pt
                font: 'Arial',
                color: '781717'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE',
                bold: true,
                size: 24, // 12pt
                font: 'Arial',
                color: '111827'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'OFFICE OF THE CONTROLLER OF EXAMINATIONS',
                size: 20,
                bold: true,
                font: 'Arial',
                color: '4B5563'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: `AUTONOMOUS ${String(key.examTitle || 'SEMESTER EXAMINATION').toUpperCase()} - ANSWER KEY & VALUATION SCHEME`,
                bold: true,
                size: 22,
                color: 'B45309', // Amber
                font: 'Arial'
              })
            ]
          }),

          // Exam Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F3F4F6' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Course Code & Title:', bold: true, size: 20, font: 'Arial' })] })]
                  }),
                  new TableCell({
                    width: { size: 40, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: `${key.subjectCode} - ${key.subjectName}`, bold: true, size: 20, font: 'Arial', color: '781717' })] })]
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F3F4F6' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Semester:', bold: true, size: 20, font: 'Arial' })] })]
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: `Semester ${key.semester || 5}`, size: 20, font: 'Arial' })] })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F3F4F6' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Question Paper Set:', bold: true, size: 20, font: 'Arial' })] })]
                  }),
                  new TableCell({
                    width: { size: 40, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: `${key.setCode || 'Set A'} (${key.regulation || 'Regulation R-2021 CBCS'})`, size: 20, font: 'Arial' })] })]
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F3F4F6' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Max Marks:', bold: true, size: 20, font: 'Arial' })] })]
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: `${key.maximumMarks || 100} Marks`, bold: true, size: 20, font: 'Arial' })] })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 25, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F3F4F6' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Course Instructor:', bold: true, size: 20, font: 'Arial' })] })]
                  }),
                  new TableCell({
                    width: { size: 40, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: key.approvedBy || 'Course Faculty', size: 20, font: 'Arial' })] })]
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    shading: { fill: 'F3F4F6' },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Date Prepared:', bold: true, size: 20, font: 'Arial' })] })]
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: key.createdDate || new Date().toISOString().slice(0, 10), size: 20, font: 'Arial' })] })]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { after: 200 }, children: [] }),

          // Scheme of Valuation Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [tableHeaderRow, ...questionRows]
          })
        ]
      }
    ]
  });

  return await Packer.toBlob(doc);
}

/**
 * Triggers browser download of the generated Word (.docx) Answer Key
 */
export function downloadDocxBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
