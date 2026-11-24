import React, { useState } from 'react';
import {
  KeyRound,
  Plus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  FileCheck,
  Printer,
  Sparkles,
  Layers,
  UploadCloud,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  Save,
  ArrowLeft,
  X,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  DepartmentCode,
  ExamAnswerKey,
  ExamCategory,
  QuestionKey,
  KeyOption,
  StepRubric,
  UploadedPageSolution
} from '../types';
import {
  generateAnswerKeyDocx,
  triggerFileDownload
} from '../utils/wordDocumentService';

interface AnswerKeyMakerEditorProps {
  initialKey?: ExamAnswerKey;
  departmentCode: DepartmentCode;
  departments: { code: DepartmentCode; name: string }[];
  onSaveKey: (savedKey: ExamAnswerKey) => void;
  onBack: () => void;
  onOpenQuestionPaperUpload: () => void;
  onOpenTemplateUpload: () => void;
  onPrintOfficialPdf: (key: ExamAnswerKey) => void;
}

export const AnswerKeyMakerEditor: React.FC<AnswerKeyMakerEditorProps> = ({
  initialKey,
  departmentCode,
  departments,
  onSaveKey,
  onBack,
  onOpenQuestionPaperUpload,
  onOpenTemplateUpload,
  onPrintOfficialPdf
}) => {
  // Form State
  const [subjectCode, setSubjectCode] = useState(initialKey?.subjectCode || 'CS3391');
  const [subjectName, setSubjectName] = useState(initialKey?.subjectName || 'Object Oriented Programming with Java');
  const [regulation, setRegulation] = useState(initialKey?.regulation || 'R-2021 Autonomous');
  const [semester, setSemester] = useState<number>(initialKey?.semester || 5);
  const [department, setDepartment] = useState<DepartmentCode>(initialKey?.department || departmentCode);
  const [examCategory, setExamCategory] = useState<ExamCategory>(initialKey?.examCategory || 'Model');
  const [examTitle, setExamTitle] = useState(
    initialKey?.examTitle ||
      (initialKey?.examCategory === 'Internal'
        ? 'Internal Assessment Test - I (IAT-1)'
        : initialKey?.examCategory === 'Semester'
        ? 'Autonomous End-Semester Examination'
        : 'Autonomous Pre-Semester Model Examination')
  );
  const [academicYear, setAcademicYear] = useState(initialKey?.academicYear || '2025-2026');
  const [examDate, setExamDate] = useState(initialKey?.examDate || new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState(initialKey?.duration || (examCategory === 'Internal' ? '1.5 Hours' : '3.0 Hours'));
  const [setCode, setSetCode] = useState<'Set A' | 'Set B' | 'Set C' | 'Set D'>(initialKey?.setCode || 'Set A');
  const [isLocked, setIsLocked] = useState(initialKey?.isLocked || false);
  const [approvedBy, setApprovedBy] = useState(initialKey?.approvedBy || 'Prof. Subject Expert & BOS Committee');
  const [questions, setQuestions] = useState<QuestionKey[]>(initialKey?.questions || []);
  const [uploadedPageSolutions, setUploadedPageSolutions] = useState<UploadedPageSolution[]>(
    initialKey?.uploadedPageSolutions || []
  );

  const [activePartFilter, setActivePartFilter] = useState<'ALL' | 'Part A' | 'Part B' | 'Part C'>('ALL');
  const [expandedQNos, setExpandedQNos] = useState<Record<number, boolean>>({ 1: true, 6: true });
  const [newPageNumber, setNewPageNumber] = useState(1);
  const [newPageNotes, setNewPageNotes] = useState('');

  // Calculate live total marks
  const totalCalculatedMarks = questions.reduce((acc, q) => acc + (Number(q.positiveMarks) || 0), 0);
  const expectedMaxMarks = examCategory === 'Internal' ? 50 : 100;

  const toggleExpand = (qNo: number) => {
    setExpandedQNos((prev) => ({ ...prev, [qNo]: !prev[qNo] }));
  };

  const handleAddQuestion = (part: 'Part A' | 'Part B' | 'Part C' = 'Part A') => {
    const nextNo = questions.length + 1;
    const defaultMarks = part === 'Part A' ? 2 : part === 'Part B' ? 13 : 15;
    const defaultBlooms = part === 'Part A' ? 'K1 - Remember' : part === 'Part B' ? 'K3 - Apply' : 'K5 - Evaluate';

    const newQ: QuestionKey = {
      questionNo: nextNo,
      part,
      subDivision: `${nextNo}`,
      questionText: '',
      topic: `Question ${nextNo} Topic & Focus Area`,
      keyOption: 'Descriptive',
      positiveMarks: defaultMarks,
      negativeMarks: 0,
      cognitiveLevel: defaultBlooms as any,
      mappedSyllabusUnit: 'Unit I: Core Concepts',
      courseOutcome: 'CO1',
      status: 'Active',
      expectedAnswer: 'Expected solution outline, governing formulas, and diagrams.',
      rubricBreakdown: [
        { stepNo: 1, description: 'Core definition / formula / schematic', marks: Math.ceil(defaultMarks / 2) },
        { stepNo: 2, description: 'Step-by-step derivation / code / analysis', marks: Math.floor(defaultMarks / 2) }
      ]
    };

    setQuestions([...questions, newQ]);
    setExpandedQNos((prev) => ({ ...prev, [nextNo]: true }));
  };

  const handleUpdateQuestion = (index: number, field: keyof QuestionKey, val: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: val };
    setQuestions(updated);
  };

  const handleAddRubricStep = (qIndex: number) => {
    const updated = [...questions];
    const currentRubrics = updated[qIndex].rubricBreakdown || [];
    const nextStepNo = currentRubrics.length + 1;
    updated[qIndex].rubricBreakdown = [
      ...currentRubrics,
      { stepNo: nextStepNo, description: `Step ${nextStepNo} Rubric Criteria`, marks: 1 }
    ];
    setQuestions(updated);
  };

  const handleUpdateRubricStep = (qIndex: number, stepIndex: number, field: keyof StepRubric, val: any) => {
    const updated = [...questions];
    const currentRubrics = [...(updated[qIndex].rubricBreakdown || [])];
    currentRubrics[stepIndex] = { ...currentRubrics[stepIndex], [field]: val };
    updated[qIndex].rubricBreakdown = currentRubrics;
    setQuestions(updated);
  };

  const handleRemoveRubricStep = (qIndex: number, stepIndex: number) => {
    const updated = [...questions];
    const currentRubrics = (updated[qIndex].rubricBreakdown || []).filter((_, i) => i !== stepIndex);
    updated[qIndex].rubricBreakdown = currentRubrics;
    setQuestions(updated);
  };

  const handleDeleteQuestion = (qIndex: number) => {
    const updated = questions.filter((_, i) => i !== qIndex).map((q, idx) => ({ ...q, questionNo: idx + 1 }));
    setQuestions(updated);
  };

  const handleAwardBonus = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].status = 'Bonus';
    updated[qIndex].keyOption = 'Bonus';
    setQuestions(updated);
    confetti({ particleCount: 50, spread: 60 });
  };

  const handleUploadPageSolution = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newPage: UploadedPageSolution = {
        page: newPageNumber,
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        timestamp: 'Just now',
        notes: newPageNotes || `Page ${newPageNumber} Solution Scheme`
      };
      setUploadedPageSolutions([...uploadedPageSolutions, newPage]);
      setNewPageNumber(newPageNumber + 1);
      setNewPageNotes('');
    }
  };

  const handleRemovePageSolution = (index: number) => {
    setUploadedPageSolutions(uploadedPageSolutions.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const keyId = initialKey?.id || `KEY-${subjectCode}-${examCategory.toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const saved: ExamAnswerKey = {
      id: keyId,
      subjectCode,
      subjectName,
      regulation,
      semester,
      department,
      examCategory,
      examTitle,
      academicYear,
      examDate,
      duration,
      setCode,
      totalQuestions: questions.length,
      maximumMarks: totalCalculatedMarks,
      createdDate: initialKey?.createdDate || new Date().toISOString().split('T')[0],
      approvedBy,
      isLocked,
      questions,
      uploadedPageSolutions
    };

    onSaveKey(saved);
    confetti({ particleCount: 70, spread: 80 });
  };

  const filteredQuestions = questions.filter((q) => {
    if (activePartFilter === 'ALL') return true;
    return q.part === activePartFilter;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            title="Back to Department Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#781717]/10 text-[#781717] font-black text-xs">
                {department}
              </span>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                {examCategory} Examination Answer Key Maker
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
              {subjectCode} • {subjectName}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onOpenQuestionPaperUpload}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Question Paper</span>
          </button>

          <button
            type="button"
            onClick={onOpenTemplateUpload}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer border border-slate-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Load Template</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              const currentDraft: ExamAnswerKey = {
                id: initialKey?.id || `KEY-${subjectCode}`,
                subjectCode,
                subjectName,
                regulation,
                semester,
                department,
                examCategory,
                examTitle,
                academicYear,
                examDate,
                duration,
                setCode,
                totalQuestions: questions.length,
                maximumMarks: totalCalculatedMarks,
                createdDate: new Date().toISOString().split('T')[0],
                approvedBy,
                isLocked,
                questions,
                uploadedPageSolutions
              };
              try {
                const blob = await generateAnswerKeyDocx(currentDraft);
                triggerFileDownload(blob, `VSBEC_${department}_${subjectCode}_${examCategory}_AnswerKey.docx`);
              } catch (err: any) {
                alert(`Error creating Word Document: ${err.message}`);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-200" />
            <span>Download Word Document (.docx)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const currentDraft: ExamAnswerKey = {
                id: initialKey?.id || `KEY-${subjectCode}`,
                subjectCode,
                subjectName,
                regulation,
                semester,
                department,
                examCategory,
                examTitle,
                academicYear,
                examDate,
                duration,
                setCode,
                totalQuestions: questions.length,
                maximumMarks: totalCalculatedMarks,
                createdDate: new Date().toISOString().split('T')[0],
                approvedBy,
                isLocked,
                questions,
                uploadedPageSolutions
              };
              onPrintOfficialPdf(currentDraft);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official COE Scheme</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#781717] hover:bg-[#5a1111] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save & Certify Key</span>
          </button>
        </div>
      </div>

      {/* Meta Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Exam Properties Form */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Autonomous Examination Specifications
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLocked(!isLocked)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isLocked
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isLocked ? 'COE Certified & Locked' : 'Draft / Unlocked'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as DepartmentCode)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              >
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Exam Type</label>
              <select
                value={examCategory}
                onChange={(e) => {
                  const cat = e.target.value as ExamCategory;
                  setExamCategory(cat);
                  if (cat === 'Internal') {
                    setExamTitle('Internal Assessment Test - I (IAT-1)');
                    setDuration('1.5 Hours');
                  } else if (cat === 'Model') {
                    setExamTitle('Autonomous Pre-Semester Model Examination');
                    setDuration('3.0 Hours');
                  } else {
                    setExamTitle('Autonomous End-Semester Examination (ESE)');
                    setDuration('3.0 Hours');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              >
                <option value="Internal">Internal Assessment (IAT 1-3)</option>
                <option value="Model">Autonomous Model Examination</option>
                <option value="Semester">Autonomous End-Semester Examination (ESE)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Set Code</label>
              <select
                value={setCode}
                onChange={(e) => setSetCode(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              >
                <option value="Set A">Set A</option>
                <option value="Set B">Set B</option>
                <option value="Set C">Set C</option>
                <option value="Set D">Set D</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Subject Code</label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Subject Name</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Semester</label>
              <input
                type="number"
                min={1}
                max={8}
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Regulation</label>
              <input
                type="text"
                value={regulation}
                onChange={(e) => setRegulation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Exam Date</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Approved By</label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Column: Marks & Rubric Summary Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-md">
                Marks Audit
              </span>
              <span className="text-xs text-slate-300 font-bold">{questions.length} Questions</span>
            </div>

            <p className="text-xs text-slate-300 font-medium">Total Configured Marks</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white">{totalCalculatedMarks}</span>
              <span className="text-sm font-bold text-slate-400">/ {expectedMaxMarks} Max</span>
            </div>

            {/* Validation Pill */}
            <div className="mt-3">
              {totalCalculatedMarks === expectedMaxMarks ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Blueprint Marks Matched!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>
                    Diff: {totalCalculatedMarks > expectedMaxMarks ? `+${totalCalculatedMarks - expectedMaxMarks}` : `${totalCalculatedMarks - expectedMaxMarks}`}M
                  </span>
                </div>
              )}
            </div>

            {/* Parts distribution */}
            <div className="mt-4 pt-4 border-t border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Part A (Short 2M):</span>
                <span className="font-bold text-white">
                  {questions.filter((q) => q.part === 'Part A').reduce((a, b) => a + (Number(b.positiveMarks) || 0), 0)} Marks
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Part B (Analytical 13M):</span>
                <span className="font-bold text-white">
                  {questions.filter((q) => q.part === 'Part B').reduce((a, b) => a + (Number(b.positiveMarks) || 0), 0)} Marks
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Part C (Case Study 15M):</span>
                <span className="font-bold text-white">
                  {questions.filter((q) => q.part === 'Part C').reduce((a, b) => a + (Number(b.positiveMarks) || 0), 0)} Marks
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/80 text-[11px] text-slate-400 text-center">
            Office of COE • Regulation R-2021
          </div>
        </div>
      </div>

      {/* Page-by-Page Solution Attachments & Upload Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#781717]" />
              <span>Page-by-Page Solution Attachments & Handwritten Schemes</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Upload scanned handwritten solutions, step-marking breakdown sheets, and diagrams for each page of the question paper.
            </p>
          </div>

          {/* Quick upload button */}
          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer border border-slate-300/80 transition-all">
            <UploadCloud className="w-4 h-4 text-[#781717]" />
            <span>Upload Solution for Page {newPageNumber}</span>
            <input
              type="file"
              onChange={handleUploadPageSolution}
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              className="hidden"
            />
          </label>
        </div>

        {uploadedPageSolutions.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No page-specific solution files attached yet.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click the button above to upload PDF/JPG handwritten schemes for Page 1, Page 2, Page 3, etc.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {uploadedPageSolutions.map((sol, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between relative group hover:border-[#781717] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-[#781717]/10 text-[#781717] text-[10px] font-black uppercase">
                      Page {sol.page}
                    </span>
                    <button
                      onClick={() => handleRemovePageSolution(idx)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      title="Remove Attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-bold text-slate-800 text-xs truncate" title={sol.fileName}>
                    {sol.fileName}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{sol.notes || 'Solution Scheme'}</p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{sol.fileSize}</span>
                  <span className="text-emerald-700 font-bold">Verified</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Question Paper & Rubric Maker Suite */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Question-by-Question Solution & Rubric Scheme
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Define detailed answer rubrics, Bloom's cognitive taxonomy (K1-K6), and step-by-step mark distribution.
            </p>
          </div>

          {/* Part Filter Tabs & Add Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              {(['ALL', 'Part A', 'Part B', 'Part C'] as const).map((part) => (
                <button
                  key={part}
                  onClick={() => setActivePartFilter(part)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activePartFilter === part ? 'bg-white text-[#781717] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {part}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleAddQuestion('Part A')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Part A (2M)</span>
            </button>

            <button
              onClick={() => handleAddQuestion('Part B')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#781717] hover:bg-[#5a1111] text-white font-bold text-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Part B (13M)</span>
            </button>

            <button
              onClick={() => handleAddQuestion('Part C')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Part C (15M)</span>
            </button>
          </div>
        </div>

        {/* Questions Accordion List */}
        <div className="space-y-3">
          {filteredQuestions.map((q, qIndex) => {
            const isExpanded = !!expandedQNos[q.questionNo];

            return (
              <div
                key={q.questionNo}
                className={`rounded-2xl border transition-all ${
                  q.status === 'Bonus'
                    ? 'border-amber-400 bg-amber-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Accordion Summary Row */}
                <div
                  onClick={() => toggleExpand(q.questionNo)}
                  className="p-4 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-xl bg-[#781717]/10 text-[#781717] font-black text-xs flex items-center justify-center shrink-0">
                      {q.subDivision || q.questionNo}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {q.part || 'Part A'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                          {q.courseOutcome || 'CO1'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 text-[10px] font-bold">
                          {q.cognitiveLevel}
                        </span>
                        {q.status === 'Bonus' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black">
                            ★ BONUS AWARDED
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-1">
                        {q.topic || q.questionText || `Question ${q.questionNo}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs sm:text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {q.positiveMarks} Marks
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Expanded Question Details & Rubric Form */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 rounded-b-2xl">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Sub-Division / Tag
                        </label>
                        <input
                          type="text"
                          value={q.subDivision || `${q.questionNo}`}
                          onChange={(e) => handleUpdateQuestion(qIndex, 'subDivision', e.target.value)}
                          placeholder="e.g. 11(a) or 11(b)"
                          className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Part Allocation
                        </label>
                        <select
                          value={q.part || 'Part A'}
                          onChange={(e) => handleUpdateQuestion(qIndex, 'part', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold"
                        >
                          <option value="Part A">Part A (Short)</option>
                          <option value="Part B">Part B (Descriptive)</option>
                          <option value="Part C">Part C (Case Study)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Course Outcome
                        </label>
                        <select
                          value={q.courseOutcome || 'CO1'}
                          onChange={(e) => handleUpdateQuestion(qIndex, 'courseOutcome', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold"
                        >
                          <option value="CO1">CO1 - Course Outcome 1</option>
                          <option value="CO2">CO2 - Course Outcome 2</option>
                          <option value="CO3">CO3 - Course Outcome 3</option>
                          <option value="CO4">CO4 - Course Outcome 4</option>
                          <option value="CO5">CO5 - Course Outcome 5</option>
                          <option value="CO6">CO6 - Course Outcome 6</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Bloom's Level
                        </label>
                        <select
                          value={q.cognitiveLevel}
                          onChange={(e) => handleUpdateQuestion(qIndex, 'cognitiveLevel', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold"
                        >
                          <option value="K1 - Remember">K1 - Remember</option>
                          <option value="K2 - Understand">K2 - Understand</option>
                          <option value="K3 - Apply">K3 - Apply</option>
                          <option value="K4 - Analyze">K4 - Analyze</option>
                          <option value="K5 - Evaluate">K5 - Evaluate</option>
                          <option value="K6 - Create">K6 - Create</option>
                        </select>
                      </div>
                    </div>

                    {/* Question Statement */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Question Statement / Problem Definition
                      </label>
                      <textarea
                        rows={2}
                        value={q.questionText || ''}
                        onChange={(e) => handleUpdateQuestion(qIndex, 'questionText', e.target.value)}
                        placeholder="Enter the full question paper text as presented to students..."
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#781717]/20"
                      />
                    </div>

                    {/* Expected Solution Outline */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Expected Key Solution / Formulae / Diagram Schema
                      </label>
                      <textarea
                        rows={2}
                        value={q.expectedAnswer || ''}
                        onChange={(e) => handleUpdateQuestion(qIndex, 'expectedAnswer', e.target.value)}
                        placeholder="Detail the expected key points, mathematical proof steps, or code syntax required..."
                        className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#781717]/20"
                      />
                    </div>

                    {/* Step-by-Step Marking Rubric Sub-table */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Step-by-Step Marking Rubric
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddRubricStep(qIndex)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Rubric Step</span>
                        </button>
                      </div>

                      {q.rubricBreakdown && q.rubricBreakdown.length > 0 ? (
                        <div className="space-y-2">
                          {q.rubricBreakdown.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-400 w-12 shrink-0">
                                Step {sIdx + 1}:
                              </span>
                              <input
                                type="text"
                                value={step.description}
                                onChange={(e) =>
                                  handleUpdateRubricStep(qIndex, sIdx, 'description', e.target.value)
                                }
                                placeholder="Criteria (e.g. Block diagram 3M, Derivation 6M, Result 4M)"
                                className="flex-1 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium"
                              />
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="number"
                                  min={0}
                                  max={15}
                                  value={step.marks}
                                  onChange={(e) =>
                                    handleUpdateRubricStep(qIndex, sIdx, 'marks', Number(e.target.value))
                                  }
                                  className="w-14 px-2 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-center"
                                />
                                <span className="text-xs font-bold text-slate-600">Marks</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveRubricStep(qIndex, sIdx)}
                                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Remove Step"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          No step breakdown added. Positive marks will be allocated directly.
                        </p>
                      )}
                    </div>

                    {/* Question Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAwardBonus(qIndex)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Award Full Bonus Marks</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIndex)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Question</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
