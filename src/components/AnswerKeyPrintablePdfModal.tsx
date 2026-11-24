import React, { useRef } from 'react';
import {
  Printer,
  Download,
  X,
  ShieldCheck,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { ExamAnswerKey } from '../types';
import { OfficialEmblem } from './OfficialEmblem';
import { splitQuestionsByPart, parseAnswerTextToBlocks } from '../utils/answerKeyDocx';
import { printHtmlDocument } from '../utils/printService';

interface AnswerKeyPrintablePdfModalProps {
  answerKey: ExamAnswerKey | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AnswerKeyPrintablePdfModal: React.FC<AnswerKeyPrintablePdfModalProps> = ({
  answerKey,
  isOpen,
  onClose
}) => {
  const printSheetRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !answerKey) return null;

  const handlePrint = () => {
    const html = printSheetRef.current?.innerHTML;
    if (html) {
      printHtmlDocument(`${answerKey.subjectCode || 'VSBEC'} Official Answer Key`, html);
    } else {
      window.print();
    }
  };

  const {
    partA: partAQuestions,
    partB: partBQuestions,
    partC: partCQuestions
  } = splitQuestionsByPart(answerKey.questions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-sm max-w-[210mm] w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden my-auto print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">
              Official Autonomous COE Answer Key & Valuation Scheme
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Scheme</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official A4 Printable Sheet Container */}
        <div
          ref={printSheetRef}
          className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-slate-900 min-h-[297mm] print:p-4 print:overflow-visible"
        >
          {/* Institutional Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center relative">
            <div className="flex items-center justify-center gap-4 mb-2">
              <OfficialEmblem size="lg" className="w-20 h-20 shrink-0" />
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#781717] uppercase">
                  V.S.B. ENGINEERING COLLEGE
                </h1>
                <p className="text-xs font-bold text-slate-700 tracking-wider">
                  (An Autonomous Institution • Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai)
                </p>
                <p className="text-xs font-semibold text-slate-600">
                  NH-67, Covai Road, Karudayampalayam, KARUR - 639 111, Tamil Nadu.
                </p>
                <h2 className="text-sm font-black text-slate-900 mt-2 uppercase tracking-widest bg-slate-100 py-0.5 rounded-sm inline-block px-4">
                  OFFICE OF THE CONTROLLER OF EXAMINATIONS
                </h2>
              </div>
            </div>

            <div className="mt-3 text-center">
              <h3 className="text-base font-black text-slate-900 uppercase underline decoration-2">
                OFFICIAL ANSWER KEY & EVALUATION SCHEME
              </h3>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                {answerKey.examTitle || `${answerKey.examCategory || 'Autonomous'} Examination`} • Academic Year: {answerKey.academicYear || '2025-2026'}
              </p>
            </div>
          </div>

          {/* Exam Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-b border-slate-300 text-xs mt-2">
            <div>
              <span className="text-slate-500 font-medium">Department:</span>
              <p className="font-bold text-slate-900">{answerKey.department}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Subject Code & Name:</span>
              <p className="font-bold text-slate-900">{answerKey.subjectCode} - {answerKey.subjectName}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Semester / Regulation:</span>
              <p className="font-bold text-slate-900">Sem {answerKey.semester} / {answerKey.regulation}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Set Code / Max Marks:</span>
              <p className="font-bold text-slate-900">{answerKey.setCode} / {answerKey.maximumMarks} Marks</p>
            </div>
          </div>

          {/* Question-wise Rubric Table */}
          <div className="mt-4 space-y-6">
            {/* Part A Table */}
            {partAQuestions.length > 0 && (
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider bg-slate-200 px-3 py-1 mb-1.5">
                  PART - A (Short Answer Questions • {partAQuestions.reduce((a, b) => a + b.positiveMarks, 0)} Marks)
                </h4>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-300 p-1.5 w-12 text-center">Q.No</th>
                      <th className="border border-slate-300 p-1.5">Expected Solution Key Points &amp; Sub-Headings</th>
                      <th className="border border-slate-300 p-1.5 w-16 text-center">Bloom</th>
                      <th className="border border-slate-300 p-1.5 w-14 text-center">CO</th>
                      <th className="border border-slate-300 p-1.5 w-16 text-center">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partAQuestions.map((q) => (
                      <tr key={q.questionNo}>
                        <td className="border border-slate-300 p-1.5 font-bold text-center align-top">{q.subDivision || q.questionNo}</td>
                        <td className="border border-slate-300 p-1.5">
                          <p className="font-semibold text-slate-900">{q.questionText || q.topic}</p>
                          <div className="mt-1 space-y-0.5 text-[11px] text-slate-700">
                            {parseAnswerTextToBlocks(q.expectedAnswer || '').map((b, bi) =>
                              b.type === 'heading' ? (
                                <p key={bi} className="font-bold text-slate-900 mt-1">{b.text}</p>
                              ) : b.type === 'diagram' || b.type === 'code' ? (
                                <pre key={bi} className="a4-diagram-box bg-slate-50 border border-slate-300 p-1.5 rounded-xs text-[10px] overflow-x-auto my-1">{b.text}</pre>
                              ) : (
                                <p key={bi} className={b.type === 'subbullet' ? 'pl-5' : 'pl-2'}>
                                  {b.type === 'subbullet' ? `◦ ${b.text}` : `• ${b.text}`}
                                </p>
                              )
                            )}
                          </div>
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center text-slate-600 align-top">{q.cognitiveLevel.split(' ')[0]}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-800 align-top">{q.courseOutcome || 'CO1'}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold align-top">{q.positiveMarks}M</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Part B Table */}
            {partBQuestions.length > 0 && (
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider bg-slate-200 px-3 py-1 mb-1.5">
                  PART - B (Point-Wise Descriptive &amp; Analytical Solutions • {partBQuestions.reduce((a, b) => a + b.positiveMarks, 0)} Marks)
                </h4>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-300 p-1.5 w-12 text-center">Q.No</th>
                      <th className="border border-slate-300 p-1.5">Sub-Headings, Point Answers, Diagrams &amp; Rubric</th>
                      <th className="border border-slate-300 p-1.5 w-16 text-center">Bloom</th>
                      <th className="border border-slate-300 p-1.5 w-14 text-center">CO</th>
                      <th className="border border-slate-300 p-1.5 w-16 text-center">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partBQuestions.map((q) => (
                      <tr key={q.questionNo}>
                        <td className="border border-slate-300 p-1.5 font-bold text-center align-top">{q.subDivision || q.questionNo}</td>
                        <td className="border border-slate-300 p-1.5">
                          <p className="font-bold text-slate-900">{q.questionText || q.topic}</p>
                          <div className="mt-1 space-y-0.5 text-[11px] text-slate-700">
                            {parseAnswerTextToBlocks(q.expectedAnswer || '').map((b, bi) =>
                              b.type === 'heading' ? (
                                <p key={bi} className="font-bold text-slate-900 mt-1.5">{b.text}</p>
                              ) : b.type === 'diagram' || b.type === 'code' ? (
                                <pre key={bi} className="a4-diagram-box bg-slate-50 border border-slate-400 p-2 rounded-xs text-[10px] overflow-x-auto my-1.5">{b.text}</pre>
                              ) : (
                                <p key={bi} className={b.type === 'subbullet' ? 'pl-5' : 'pl-2'}>
                                  {b.type === 'subbullet' ? `◦ ${b.text}` : `• ${b.text}`}
                                </p>
                              )
                            )}
                          </div>
                          {q.rubricBreakdown && q.rubricBreakdown.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-200 space-y-0.5">
                              {q.rubricBreakdown.map((s, idx) => (
                                <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                                  <span>• {s.description}</span>
                                  <span className="font-semibold">{s.marks}M</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center text-slate-600 align-top">{q.cognitiveLevel.split(' ')[0]}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-800 align-top">{q.courseOutcome || 'CO2'}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold align-top">{q.positiveMarks}M</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Part C Table */}
            {partCQuestions.length > 0 && (
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider bg-slate-200 px-3 py-1 mb-1.5">
                  PART - C (Comprehensive Point-Wise Design, Flowcharts &amp; Case Study • {partCQuestions.reduce((a, b) => a + b.positiveMarks, 0)} Marks)
                </h4>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border border-slate-300 p-1.5 w-12 text-center">Q.No</th>
                      <th className="border border-slate-300 p-1.5">Sub-Headings, Diagrams &amp; Evaluation Rubric</th>
                      <th className="border border-slate-300 p-1.5 w-16 text-center">Bloom</th>
                      <th className="border border-slate-300 p-1.5 w-14 text-center">CO</th>
                      <th className="border border-slate-300 p-1.5 w-16 text-center">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partCQuestions.map((q) => (
                      <tr key={q.questionNo}>
                        <td className="border border-slate-300 p-1.5 font-bold text-center align-top">{q.subDivision || q.questionNo}</td>
                        <td className="border border-slate-300 p-1.5">
                          <p className="font-bold text-slate-900">{q.questionText || q.topic}</p>
                          <div className="mt-1 space-y-0.5 text-[11px] text-slate-700">
                            {parseAnswerTextToBlocks(q.expectedAnswer || '').map((b, bi) =>
                              b.type === 'heading' ? (
                                <p key={bi} className="font-bold text-slate-900 mt-1.5">{b.text}</p>
                              ) : b.type === 'diagram' || b.type === 'code' ? (
                                <pre key={bi} className="a4-diagram-box bg-slate-50 border border-slate-400 p-2 rounded-xs text-[10px] overflow-x-auto my-1.5">{b.text}</pre>
                              ) : (
                                <p key={bi} className={b.type === 'subbullet' ? 'pl-5' : 'pl-2'}>
                                  {b.type === 'subbullet' ? `◦ ${b.text}` : `• ${b.text}`}
                                </p>
                              )
                            )}
                          </div>
                          {q.rubricBreakdown && q.rubricBreakdown.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-200 space-y-0.5">
                              {q.rubricBreakdown.map((s, idx) => (
                                <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                                  <span>• {s.description}</span>
                                  <span className="font-semibold">{s.marks}M</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center text-slate-600 align-top">{q.cognitiveLevel.split(' ')[0]}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-800 align-top">{q.courseOutcome || 'CO5'}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold align-top">{q.positiveMarks}M</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
