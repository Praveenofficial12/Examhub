import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Layers,
  FileCheck,
  ArrowRight,
  Info,
  Sliders,
  Settings,
  HelpCircle,
  Eye,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Table,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DepartmentCode, ExamAnswerKey, ExamCategory, QuestionKey, StepRubric } from '../types';
import { DEPARTMENT_SUBJECTS, STANDARD_EXAM_SCHEMAS, StandardExamSchema } from '../data/departmentSubjectsData';
import {
  generateBlankTemplateDocx,
  parseAnswerKeyFromWord,
  generateAnswerKeyDocx,
  triggerFileDownload
} from '../utils/wordDocumentService';

interface AnswerKeyTemplateUploadModalProps {
  isOpen: boolean;
  departmentCode?: DepartmentCode;
  initialCategory?: ExamCategory;
  departments: { code: DepartmentCode; name: string }[];
  onClose: () => void;
  onApplyTemplate: (appliedKey: ExamAnswerKey) => void;
}

export const AnswerKeyTemplateUploadModal: React.FC<AnswerKeyTemplateUploadModalProps> = ({
  isOpen,
  departmentCode = 'CSE',
  initialCategory = 'Model',
  departments,
  onClose,
  onApplyTemplate
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration Tabs: 'configurator' | 'upload' | 'presets'
  const [activeTab, setActiveTab] = useState<'configurator' | 'upload' | 'presets'>('configurator');

  // Exam Configuration States
  const [selectedDept, setSelectedDept] = useState<DepartmentCode>(departmentCode);
  const [examCategory, setExamCategory] = useState<ExamCategory>(initialCategory);
  const [subjectCode, setSubjectCode] = useState(departmentCode === 'CSE' ? 'CS3401' : `${departmentCode}3401`);
  const [subjectName, setSubjectName] = useState('Core Discipline Theory & Analysis');
  const [semester, setSemester] = useState<number>(5);
  const [regulation, setRegulation] = useState('R-2021 Autonomous');
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [setCode, setSetCode] = useState<'Set A' | 'Set B' | 'Set C' | 'Set D'>('Set A');

  // Granular Structure Configurations
  const [partACount, setPartACount] = useState<number>(examCategory === 'Internal' ? 5 : 10);
  const [partAMarksEach, setPartAMarksEach] = useState<number>(2);
  const [partBCount, setPartBCount] = useState<number>(examCategory === 'Internal' ? 2 : 5);
  const [partBMarksEach, setPartBMarksEach] = useState<number>(13);
  const [partCCount, setPartCCount] = useState<number>(1);
  const [partCMarksEach, setPartCMarksEach] = useState<number>(examCategory === 'Internal' ? 14 : 15);

  // Rubric step templates
  const [step1Label, setStep1Label] = useState('System Schematics / Definition / Formula');
  const [step1Weight, setStep1Weight] = useState(3);
  const [step2Label, setStep2Label] = useState('Mathematical Derivation / Algorithm / Implementation');
  const [step2Weight, setStep2Weight] = useState(6);
  const [step3Label, setStep3Label] = useState('Evaluation / Result Validation / Output Analysis');
  const [step3Weight, setStep3Weight] = useState(4);

  // Upload parser states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<QuestionKey[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSuccessMessage, setValidationSuccessMessage] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  if (!isOpen) return null;

  // Sync section defaults when examCategory changes
  const handleCategoryChange = (cat: ExamCategory) => {
    setExamCategory(cat);
    const standard = STANDARD_EXAM_SCHEMAS[cat];
    if (standard) {
      setPartACount(standard.parts.partA.count);
      setPartAMarksEach(standard.parts.partA.marksEach);
      setPartBCount(standard.parts.partB.count);
      setPartBMarksEach(standard.parts.partB.marksEach);
      setPartCCount(standard.parts.partC.count);
      setPartCMarksEach(standard.parts.partC.marksEach);
    }
  };

  const calculatedTotalMarks =
    partACount * partAMarksEach + partBCount * partBMarksEach + partCCount * partCMarksEach;

  // Generate standardized QuestionKey array from current configuration
  const generateQuestionsFromConfig = (): QuestionKey[] => {
    const questions: QuestionKey[] = [];
    let qIdx = 1;

    // Part A
    for (let i = 1; i <= partACount; i++) {
      questions.push({
        questionNo: qIdx,
        part: 'Part A',
        subDivision: `${i}`,
        questionText: `Standard concept definition, principle or formula for Unit ${((i - 1) % 5) + 1}.`,
        topic: `Core Foundations - Unit ${((i - 1) % 5) + 1}`,
        keyOption: 'Descriptive',
        positiveMarks: partAMarksEach,
        negativeMarks: 0,
        cognitiveLevel: i <= partACount / 2 ? 'K1 - Remember' : 'K2 - Understand',
        mappedSyllabusUnit: `Unit ${((i - 1) % 5) + 1}: Foundations`,
        courseOutcome: `CO${((i - 1) % 5) + 1}` as any,
        status: 'Active',
        expectedAnswer: 'Clear technical statement, formula expression, and engineering units.',
        rubricBreakdown: [
          { stepNo: 1, description: 'Principle / Definition statement', marks: 1 },
          { stepNo: 2, description: 'Formula / Units / Diagram', marks: 1 }
        ],
        pageNo: 1
      });
      qIdx++;
    }

    // Part B (Either/Or descriptive)
    const basePartBNo = examCategory === 'Internal' ? 6 : 11;
    for (let i = 1; i <= partBCount; i++) {
      const qNum = basePartBNo + (i - 1);
      questions.push({
        questionNo: qIdx,
        part: 'Part B',
        subDivision: `${qNum}(a)`,
        questionText: `Comprehensive theoretical derivation, architectural formulation, and step-wise system analysis.`,
        topic: `Advanced Analysis - Unit ${i}`,
        keyOption: 'Descriptive',
        positiveMarks: partBMarksEach,
        negativeMarks: 0,
        cognitiveLevel: i % 2 === 1 ? 'K3 - Apply' : 'K4 - Analyze',
        mappedSyllabusUnit: `Unit ${i}: Specialized Systems`,
        courseOutcome: `CO${i}` as any,
        status: 'Active',
        expectedAnswer: 'Complete structured derivation, block diagrams, step-by-step proofs, and final interpretation.',
        rubricBreakdown: [
          { stepNo: 1, description: step1Label, marks: step1Weight },
          { stepNo: 2, description: step2Label, marks: step2Weight },
          { stepNo: 3, description: step3Label, marks: step3Weight }
        ],
        pageNo: Math.min(4, Math.floor((i - 1) / 2) + 2)
      });
      qIdx++;
    }

    // Part C (Case study / application)
    if (partCCount > 0) {
      const qNum = examCategory === 'Internal' ? 8 : 16;
      questions.push({
        questionNo: qIdx,
        part: 'Part C',
        subDivision: `${qNum}`,
        questionText: `Engineering application case study, design optimization, and comprehensive evaluation.`,
        topic: 'Integrated Case Study & System Design',
        keyOption: 'Descriptive',
        positiveMarks: partCMarksEach,
        negativeMarks: 0,
        cognitiveLevel: 'K5 - Evaluate',
        mappedSyllabusUnit: 'Unit V: Emerging Trends & Design',
        courseOutcome: 'CO5',
        status: 'Active',
        expectedAnswer: 'Problem statement formulation, architectural system blueprint, performance benchmarking, and design trade-offs.',
        rubricBreakdown: [
          { stepNo: 1, description: 'Problem formulation & conceptual architecture', marks: Math.floor(partCMarksEach * 0.3) },
          { stepNo: 2, description: 'Design implementation, algorithms & workflow', marks: Math.floor(partCMarksEach * 0.4) },
          { stepNo: 3, description: 'Results validation, trade-offs & conclusion', marks: partCMarksEach - Math.floor(partCMarksEach * 0.3) - Math.floor(partCMarksEach * 0.4) }
        ],
        pageNo: 5
      });
    }

    return questions;
  };

  // Download Standardized CSV Template
  const handleDownloadCsvTemplate = () => {
    const questions = generateQuestionsFromConfig();
    const headers = [
      'QuestionNo',
      'Part',
      'SubDivision',
      'Topic',
      'CognitiveLevel',
      'CourseOutcome',
      'PositiveMarks',
      'NegativeMarks',
      'KeyOption',
      'ExpectedAnswer',
      'Step1_Description',
      'Step1_Marks',
      'Step2_Description',
      'Step2_Marks',
      'Step3_Description',
      'Step3_Marks',
      'PageNo'
    ];

    const rows = questions.map((q) => [
      q.questionNo,
      `"${q.part || 'Part A'}"`,
      `"${q.subDivision || ''}"`,
      `"${q.topic || ''}"`,
      `"${q.cognitiveLevel || 'K1 - Remember'}"`,
      `"${q.courseOutcome || 'CO1'}"`,
      q.positiveMarks,
      q.negativeMarks || 0,
      `"${q.keyOption || 'Descriptive'}"`,
      `"${(q.expectedAnswer || '').replace(/"/g, '""')}"`,
      `"${q.rubricBreakdown?.[0]?.description || ''}"`,
      q.rubricBreakdown?.[0]?.marks || 0,
      `"${q.rubricBreakdown?.[1]?.description || ''}"`,
      q.rubricBreakdown?.[1]?.marks || 0,
      `"${q.rubricBreakdown?.[2]?.description || ''}"`,
      q.rubricBreakdown?.[2]?.marks || 0,
      q.pageNo || 1
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VSBEC_${selectedDept}_${examCategory}_Standard_Rubric_Template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Standardized JSON Template
  const handleDownloadJsonTemplate = () => {
    const questions = generateQuestionsFromConfig();
    const templateData = {
      institution: 'V.S.B. Engineering College, Karur (Autonomous)',
      office: 'Office of the Controller of Examinations',
      department: selectedDept,
      examCategory,
      subjectCode,
      subjectName,
      regulation,
      semester,
      academicYear,
      maximumMarks: calculatedTotalMarks,
      totalQuestions: questions.length,
      sectionSummary: {
        partA: `${partACount} Questions x ${partAMarksEach}M = ${partACount * partAMarksEach}M`,
        partB: `${partBCount} Questions x ${partBMarksEach}M = ${partBCount * partBMarksEach}M`,
        partC: `${partCCount} Questions x ${partCMarksEach}M = ${partCCount * partCMarksEach}M`
      },
      questions
    };

    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VSBEC_${selectedDept}_${examCategory}_AnswerKey_Schema.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Standardized Word Document Template (.docx)
  const handleDownloadWordTemplate = async () => {
    try {
      const docxBlob = await generateBlankTemplateDocx(
        selectedDept,
        examCategory,
        subjectCode,
        subjectName
      );
      triggerFileDownload(
        docxBlob,
        `VSBEC_${selectedDept}_${examCategory}_AnswerKey_Template.docx`
      );
    } catch (err: any) {
      alert(`Error generating Word document: ${err.message}`);
    }
  };

  // Parse Uploaded Word (.docx), CSV, or JSON file
  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setIsParsing(true);
    setValidationErrors([]);
    setValidationSuccessMessage(null);

    // If Word Document (.docx or .doc)
    if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      try {
        const result = await parseAnswerKeyFromWord(file);
        if (result.success && result.questions.length > 0) {
          setParsedQuestions(result.questions);
          if (result.metadata.subjectCode) setSubjectCode(result.metadata.subjectCode);
          if (result.metadata.subjectName) setSubjectName(result.metadata.subjectName);
          if (result.metadata.examCategory) setExamCategory(result.metadata.examCategory);
          const totalSum = result.questions.reduce((sum, q) => sum + q.positiveMarks, 0);
          setValidationSuccessMessage(
            `Successfully parsed ${result.questions.length} questions (${totalSum} total marks) from Word Document (.docx).`
          );
        } else {
          setValidationErrors(
            result.errors.length > 0
              ? result.errors
              : ['Could not extract question rows from Word document. Please ensure standard tabular format.']
          );
        }
      } catch (err: any) {
        setValidationErrors([`Word document parse error: ${err.message || 'Corrupted file'}`]);
      } finally {
        setIsParsing(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(text);
          if (json.questions && Array.isArray(json.questions)) {
            setParsedQuestions(json.questions);
            if (json.subjectCode) setSubjectCode(json.subjectCode);
            if (json.subjectName) setSubjectName(json.subjectName);
            if (json.examCategory) setExamCategory(json.examCategory);
            setValidationSuccessMessage(
              `Successfully validated ${json.questions.length} questions from JSON schema.`
            );
          } else {
            setValidationErrors(['Invalid JSON structure: "questions" array not found.']);
          }
        } else {
          // CSV Parser
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length <= 1) {
            setValidationErrors(['CSV file is empty or missing data rows.']);
            setIsParsing(false);
            return;
          }

          const parsed: QuestionKey[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
            if (cols.length >= 7) {
              const qNo = parseInt(cols[0]) || i;
              const part = (cols[1] as any) || (qNo <= 10 ? 'Part A' : 'Part B');
              const subDiv = cols[2] || `${qNo}`;
              const topic = cols[3] || 'Technical Formulation';
              const cognitive = (cols[4] as any) || 'K2 - Understand';
              const co = (cols[5] as any) || 'CO1';
              const posMarks = parseFloat(cols[6]) || (part === 'Part A' ? 2 : 13);
              const negMarks = parseFloat(cols[7]) || 0;
              const keyOpt = (cols[8] as any) || 'Descriptive';
              const expAns = cols[9] || 'Standard derivation / answer key.';

              const rubrics: StepRubric[] = [];
              if (cols[10] && cols[11]) {
                rubrics.push({ stepNo: 1, description: cols[10], marks: parseFloat(cols[11]) || 0 });
              }
              if (cols[12] && cols[13]) {
                rubrics.push({ stepNo: 2, description: cols[12], marks: parseFloat(cols[13]) || 0 });
              }
              if (cols[14] && cols[15]) {
                rubrics.push({ stepNo: 3, description: cols[14], marks: parseFloat(cols[15]) || 0 });
              }

              parsed.push({
                questionNo: qNo,
                part,
                subDivision: subDiv,
                topic,
                cognitiveLevel: cognitive,
                courseOutcome: co,
                mappedSyllabusUnit: `Unit ${((qNo - 1) % 5) + 1}: Core Foundations`,
                positiveMarks: posMarks,
                negativeMarks: negMarks,
                keyOption: keyOpt,
                expectedAnswer: expAns,
                rubricBreakdown: rubrics.length > 0 ? rubrics : undefined,
                status: 'Active',
                pageNo: parseInt(cols[16]) || 1
              });
            }
          }

          if (parsed.length > 0) {
            setParsedQuestions(parsed);
            const totalSum = parsed.reduce((sum, q) => sum + q.positiveMarks, 0);
            setValidationSuccessMessage(
              `Successfully parsed ${parsed.length} questions (${totalSum} total marks) from CSV.`
            );
          } else {
            setValidationErrors(['Could not parse questions from CSV. Please verify column structure.']);
          }
        }
      } catch (err: any) {
        setValidationErrors([`File parse error: ${err.message || 'Malformed file structure'}`]);
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setValidationErrors(['Failed to read the uploaded file.']);
      setIsParsing(false);
    };

    reader.readAsText(file);
  };

  // Submit and create the new ExamAnswerKey
  const handleApplyConfiguredKey = () => {
    const finalQuestions = parsedQuestions.length > 0 ? parsedQuestions : generateQuestionsFromConfig();
    const totalMarks = finalQuestions.reduce((acc, q) => acc + q.positiveMarks, 0);

    const newKey: ExamAnswerKey = {
      id: `KEY-${subjectCode}-${examCategory.toUpperCase()}-${Date.now().toString().slice(-4)}`,
      subjectCode,
      subjectName,
      regulation,
      semester,
      department: selectedDept,
      examCategory,
      examTitle:
        examCategory === 'Internal'
          ? 'Internal Assessment Test (Standardized Schema)'
          : examCategory === 'Model'
          ? 'Autonomous Pre-Semester Model Examination (Standardized)'
          : 'Autonomous End Semester Examination (Standardized ESE)',
      academicYear,
      examDate: new Date().toISOString().split('T')[0],
      duration: examCategory === 'Internal' ? '1.5 Hours' : '3.0 Hours',
      setCode,
      totalQuestions: finalQuestions.length,
      maximumMarks: totalMarks,
      createdDate: new Date().toISOString().split('T')[0],
      approvedBy: `BOS Committee & COE (${selectedDept})`,
      isLocked: false,
      uploadedTemplateName: uploadedFile?.name || `VSBEC_${examCategory}_Standard_Schema.xlsx`,
      questions: finalQuestions,
      uploadedPageSolutions: [
        {
          page: 1,
          fileName: `${subjectCode}_Page1_PartA_Solutions.pdf`,
          fileSize: '420 KB',
          timestamp: 'Just now',
          notes: 'Standardized Scheme Page 1'
        },
        {
          page: 2,
          fileName: `${subjectCode}_Page2_PartB_Solutions.pdf`,
          fileSize: '750 KB',
          timestamp: 'Just now',
          notes: 'Standardized Scheme Page 2'
        }
      ]
    };

    onApplyTemplate(newKey);
    confetti({ particleCount: 70, spread: 80 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#781717] via-red-900 to-[#5a1111] px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20">
              <Sliders className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold text-[10px] uppercase tracking-wider">
                  COE Standardized Utility
                </span>
                <span className="text-xs text-rose-200 font-semibold">• {selectedDept} Department</span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                Answer Key Format Configurator & Template Utility
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('configurator')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'configurator'
                ? 'border-[#781717] text-[#781717]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Format & Schema Configurator</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-[#781717] text-[#781717]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Structured File (CSV/JSON/XLSX)</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'border-[#781717] text-[#781717]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>VSBEC Autonomous Presets</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: FORMAT & SCHEMA CONFIGURATOR */}
          {activeTab === 'configurator' && (
            <div className="space-y-6">
              {/* 1. Target Examination Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Examination Type & Standard Architecture
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        type: 'Internal',
                        title: 'Internal Assessment (IAT)',
                        marks: '50 Marks • 1.5 Hrs',
                        desc: 'Part A (5x2M) + Part B (2x13M) + Part C (1x14M)',
                        color: 'amber'
                      },
                      {
                        type: 'Model',
                        title: 'Pre-Semester Model Exam',
                        marks: '100 Marks • 3.0 Hrs',
                        desc: 'Part A (10x2M) + Part B (5x13M) + Part C (1x15M)',
                        color: 'sky'
                      },
                      {
                        type: 'Semester',
                        title: 'Autonomous End Semester (ESE)',
                        marks: '100 Marks • 3.0 Hrs',
                        desc: 'Part A (10x2M) + Part B (5x13M) + Part C (1x15M)',
                        color: 'purple'
                      }
                    ] as const
                  ).map((item) => {
                    const isSelected = examCategory === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleCategoryChange(item.type)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#781717] bg-red-50/50 ring-2 ring-[#781717]/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-black text-slate-900">{item.title}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#781717]" />}
                          </div>
                          <span className="text-[11px] font-bold text-[#781717]">{item.marks}</span>
                          <p className="text-[11px] text-slate-500 mt-1">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Department, Subject & Set Configuration */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value as DepartmentCode)}
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-hidden"
                  >
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subject Code</label>
                  <input
                    type="text"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-hidden"
                    placeholder="e.g. CS3401"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-hidden"
                    placeholder="e.g. Algorithms & Data Structures"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Set Code</label>
                  <select
                    value={setCode}
                    onChange={(e) => setSetCode(e.target.value as any)}
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="Set A">Set A</option>
                    <option value="Set B">Set B</option>
                    <option value="Set C">Set C</option>
                    <option value="Set D">Set D</option>
                  </select>
                </div>
              </div>

              {/* 3. Granular Part Breakdown & Marks Weighting */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Examination Sections & Marks Configuration
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-bold">Total Scheme Marks:</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-[#781717] text-white">
                      {calculatedTotalMarks} Marks
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Part A */}
                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-2">
                    <div className="flex items-center justify-between font-black text-amber-900">
                      <span>Part A (Short Questions)</span>
                      <span className="text-[11px] font-bold bg-amber-200/60 px-1.5 py-0.5 rounded">
                        {partACount * partAMarksEach}M
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-amber-800 font-bold block">No. of Qs</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={partACount}
                          onChange={(e) => setPartACount(parseInt(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white rounded-lg border border-amber-200 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-amber-800 font-bold block">Marks Each</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={partAMarksEach}
                          onChange={(e) => setPartAMarksEach(parseInt(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white rounded-lg border border-amber-200 font-bold"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-700">Bloom&apos;s Level: K1 (Remember) & K2 (Understand)</p>
                  </div>

                  {/* Part B */}
                  <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-200/70 space-y-2">
                    <div className="flex items-center justify-between font-black text-sky-900">
                      <span>Part B (Descriptive Either/Or)</span>
                      <span className="text-[11px] font-bold bg-sky-200/60 px-1.5 py-0.5 rounded">
                        {partBCount * partBMarksEach}M
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-sky-800 font-bold block">No. of Qs</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={partBCount}
                          onChange={(e) => setPartBCount(parseInt(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white rounded-lg border border-sky-200 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-sky-800 font-bold block">Marks Each</label>
                        <input
                          type="number"
                          min="5"
                          max="20"
                          value={partBMarksEach}
                          onChange={(e) => setPartBMarksEach(parseInt(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white rounded-lg border border-sky-200 font-bold"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-sky-700">Bloom&apos;s Level: K3 (Apply) & K4 (Analyze)</p>
                  </div>

                  {/* Part C */}
                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/70 space-y-2">
                    <div className="flex items-center justify-between font-black text-purple-900">
                      <span>Part C (Case Study / Design)</span>
                      <span className="text-[11px] font-bold bg-purple-200/60 px-1.5 py-0.5 rounded">
                        {partCCount * partCMarksEach}M
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-purple-800 font-bold block">No. of Qs</label>
                        <input
                          type="number"
                          min="0"
                          max="2"
                          value={partCCount}
                          onChange={(e) => setPartCCount(parseInt(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white rounded-lg border border-purple-200 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-purple-800 font-bold block">Marks Each</label>
                        <input
                          type="number"
                          min="10"
                          max="20"
                          value={partCMarksEach}
                          onChange={(e) => setPartCMarksEach(parseInt(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white rounded-lg border border-purple-200 font-bold"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-purple-700">Bloom&apos;s Level: K5 (Evaluate) & K6 (Create)</p>
                  </div>
                </div>
              </div>

              {/* 4. Part B Step Rubric Standard Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">
                    Step-by-Step Marking Rubric Template (for Part B {partBMarksEach}M Questions)
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    Sum: {step1Weight + step2Weight + step3Weight} / {partBMarksEach} Marks
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Step 1: Introduction</span>
                    <input
                      type="text"
                      value={step1Label}
                      onChange={(e) => setStep1Label(e.target.value)}
                      className="w-full p-1 bg-slate-50 rounded border border-slate-200 text-xs font-medium"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">Mark Weight:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={step1Weight}
                        onChange={(e) => setStep1Weight(parseInt(e.target.value) || 0)}
                        className="w-14 p-1 bg-slate-50 rounded border border-slate-200 text-xs font-bold text-right"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Step 2: Core Derivation/Logic</span>
                    <input
                      type="text"
                      value={step2Label}
                      onChange={(e) => setStep2Label(e.target.value)}
                      className="w-full p-1 bg-slate-50 rounded border border-slate-200 text-xs font-medium"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">Mark Weight:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={step2Weight}
                        onChange={(e) => setStep2Weight(parseInt(e.target.value) || 0)}
                        className="w-14 p-1 bg-slate-50 rounded border border-slate-200 text-xs font-bold text-right"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Step 3: Result & Validation</span>
                    <input
                      type="text"
                      value={step3Label}
                      onChange={(e) => setStep3Label(e.target.value)}
                      className="w-full p-1 bg-slate-50 rounded border border-slate-200 text-xs font-medium"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">Mark Weight:</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={step3Weight}
                        onChange={(e) => setStep3Weight(parseInt(e.target.value) || 0)}
                        className="w-14 p-1 bg-slate-50 rounded border border-slate-200 text-xs font-bold text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Action Footer: Download Templates or Generate Directly */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadWordTemplate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-black text-xs border border-blue-200 transition-colors cursor-pointer shadow-xs"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Download Word Template (.docx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV Template</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJsonTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON Schema</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleApplyConfiguredKey}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#781717] hover:bg-[#5a1111] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Key from this Configuration</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD STRUCTURED FILE (WORD .DOCX / CSV / JSON) */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                }}
                className="border-2 border-dashed border-slate-300 hover:border-[#781717] bg-slate-50/50 hover:bg-red-50/20 rounded-3xl p-8 text-center transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc,.csv,.json,.xlsx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-800">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-black text-slate-900">
                  Upload Word Document (.docx) or Answer Key File
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Drag and drop your official Microsoft <strong>Word (.docx)</strong> answer key, <strong>CSV</strong>, or <strong>JSON</strong> file here, or click to browse. The parser will automatically map question text, marks, and rubrics.
                </p>
                <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold">
                  <span>📄 Microsoft Word .docx Supported (Autonomous R-2021)</span>
                </div>
              </div>

              {/* Status & Validation feedback */}
              {validationSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{validationSuccessMessage}</span>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>File Validation Errors:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Parsed Questions Preview Table */}
              {parsedQuestions.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-[#781717]" />
                      <span className="text-xs font-bold text-slate-800">
                        Parsed Schema Preview ({parsedQuestions.length} Questions)
                      </span>
                    </div>
                    <span className="text-xs font-black text-[#781717]">
                      Total Marks: {parsedQuestions.reduce((sum, q) => sum + q.positiveMarks, 0)}M
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="p-2.5">Q#</th>
                          <th className="p-2.5">Part</th>
                          <th className="p-2.5">Topic / Concept</th>
                          <th className="p-2.5">Blooms</th>
                          <th className="p-2.5">CO</th>
                          <th className="p-2.5">Marks</th>
                          <th className="p-2.5">Rubrics</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {parsedQuestions.map((q) => (
                          <tr key={q.questionNo} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-[#781717]">{q.subDivision || q.questionNo}</td>
                            <td className="p-2.5 font-bold">{q.part}</td>
                            <td className="p-2.5 truncate max-w-xs">{q.topic}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold">
                                {q.cognitiveLevel}
                              </span>
                            </td>
                            <td className="p-2.5 font-bold text-purple-700">{q.courseOutcome || 'CO1'}</td>
                            <td className="p-2.5 font-black">{q.positiveMarks}M</td>
                            <td className="p-2.5 text-[11px] text-slate-500">
                              {q.rubricBreakdown ? `${q.rubricBreakdown.length} steps` : 'Direct'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Button */}
              {parsedQuestions.length > 0 && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleApplyConfiguredKey}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#781717] hover:bg-[#5a1111] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Apply & Register Answer Key ({parsedQuestions.length} Qs)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VSBEC AUTONOMOUS PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Choose from pre-certified institutional templates mapped to the official Anna University / Autonomous R-2021 CBCS guidelines for instant deployment:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#781717] transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                      IAT 1-3 Standard (50M)
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">1.5 Hours</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Internal Assessment Test Blueprint
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    5 Short Qs (10M) + 2 Analytical Either/Or Qs (26M) + 1 Case Study (14M). Standard 2-Page scheme.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleCategoryChange('Internal');
                      setActiveTab('configurator');
                    }}
                    className="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Load IAT Scheme
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#781717] transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-sky-900 bg-sky-100 px-2 py-0.5 rounded">
                      Model / ESE Standard (100M)
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">3.0 Hours</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Autonomous 100 Marks Comprehensive Blueprint
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    10 Compulsory Short Qs (20M) + 5 Either/Or Qs (65M) + 1 Case Study (15M). Standard 4-Page scheme.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      handleCategoryChange('Model');
                      setActiveTab('configurator');
                    }}
                    className="w-full py-2 bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Load 100M Scheme
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
