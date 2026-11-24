import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building,
  GraduationCap,
  FileCheck,
  Lock,
  Unlock,
  Sparkles,
  Plus,
  Search,
  Layers,
  Award,
  UploadCloud,
  FileSpreadsheet,
  Printer,
  Edit3,
  Trash2,
  Filter,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ChevronRight,
  Download,
  FileText,
  Sliders,
  Check,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  DepartmentCode,
  ExamAnswerKey,
  ExamCategory,
  QuestionKey,
  UserSession
} from '../types';
import { DEPARTMENT_LIST, DepartmentMeta } from '../data/departmentsData';
import { DEPARTMENT_SUBJECTS, STANDARD_EXAM_SCHEMAS, DepartmentSubject } from '../data/departmentSubjectsData';
import {
  generateAnswerKeyDocx,
  generateBlankTemplateDocx,
  triggerFileDownload
} from '../utils/wordDocumentService';

interface DepartmentAnswerKeySubPageProps {
  departmentCode: DepartmentCode;
  answerKeys: ExamAnswerKey[];
  onBackToOverview: () => void;
  onSelectDepartment: (deptCode: DepartmentCode) => void;
  onEditKey: (key: ExamAnswerKey) => void;
  onCreateNewKey: (category: ExamCategory, subjectCode?: string, subjectName?: string, semester?: number) => void;
  onUpdateKey: (updatedKey: ExamAnswerKey) => void;
  onDeleteKey?: (keyId: string) => void;
  onOpenQuestionPaperUpload: (category?: ExamCategory) => void;
  onOpenTemplateUpload: (category?: ExamCategory) => void;
  onPrintOfficialPdf: (key: ExamAnswerKey) => void;
  session?: UserSession;
}

export const DepartmentAnswerKeySubPage: React.FC<DepartmentAnswerKeySubPageProps> = ({
  departmentCode,
  answerKeys,
  onBackToOverview,
  onSelectDepartment,
  onEditKey,
  onCreateNewKey,
  onUpdateKey,
  onDeleteKey,
  onOpenQuestionPaperUpload,
  onOpenTemplateUpload,
  onPrintOfficialPdf,
  session
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ExamCategory>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSet, setSelectedSet] = useState<'ALL' | 'Set A' | 'Set B' | 'Set C' | 'Set D'>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<'ALL' | number>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [isQuickSubjectOpen, setIsQuickSubjectOpen] = useState(false);

  const currentDeptMeta = DEPARTMENT_LIST.find((d) => d.code === departmentCode) || DEPARTMENT_LIST[1];
  const departmentSyllabus = DEPARTMENT_SUBJECTS[departmentCode] || [];

  // Filter keys for this department
  const deptKeys = answerKeys.filter((k) => k.department === departmentCode);

  const filteredKeys = deptKeys.filter((k) => {
    if (selectedCategory !== 'ALL' && k.examCategory !== selectedCategory) {
      if (!k.examCategory && selectedCategory !== 'Internal') return false;
    }
    if (selectedSet !== 'ALL' && k.setCode !== selectedSet) return false;
    if (selectedSemester !== 'ALL' && k.semester !== selectedSemester) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchSub = k.subjectCode.toLowerCase().includes(q) || k.subjectName.toLowerCase().includes(q);
      const matchTitle = (k.examTitle || '').toLowerCase().includes(q);
      if (!matchSub && !matchTitle) return false;
    }
    return true;
  });

  const internalCount = deptKeys.filter((k) => k.examCategory === 'Internal').length;
  const modelCount = deptKeys.filter((k) => k.examCategory === 'Model' || !k.examCategory).length;
  const semesterCount = deptKeys.filter((k) => k.examCategory === 'Semester').length;
  const lockedCount = deptKeys.filter((k) => k.isLocked).length;

  const handleToggleLock = (key: ExamAnswerKey) => {
    const updated = { ...key, isLocked: !key.isLocked };
    onUpdateKey(updated);
  };

  const handleDuplicateKey = (key: ExamAnswerKey) => {
    const nextSet: 'Set A' | 'Set B' | 'Set C' | 'Set D' =
      key.setCode === 'Set A' ? 'Set B' : key.setCode === 'Set B' ? 'Set C' : 'Set D';
    const cloned: ExamAnswerKey = {
      ...key,
      id: `KEY-${key.subjectCode}-${key.examCategory || 'EXAM'}-${nextSet.replace(' ', '')}-${Date.now().toString().slice(-4)}`,
      setCode: nextSet,
      isLocked: false,
      createdDate: new Date().toISOString().split('T')[0],
      approvedBy: `Draft BOS Review (${departmentCode})`
    };
    onUpdateKey(cloned);
    confetti({ particleCount: 40, spread: 60 });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Top Breadcrumbs & 13 Department Switcher Pills */}
      {(!session || session.isAdmin) ? (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <button
                onClick={onBackToOverview}
                className="hover:text-[#781717] flex items-center gap-1 font-bold cursor-pointer transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-[#781717]" />
                <span>All 13 Departments</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[#781717] font-black px-2 py-0.5 rounded-lg bg-[#781717]/10">
                {departmentCode} Sub-Portal
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-800 font-bold">Answer Keys & Scheme of Valuation</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">Switch Branch:</span>
              <select
                value={departmentCode}
                onChange={(e) => onSelectDepartment(e.target.value as DepartmentCode)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-[#781717] focus:outline-hidden cursor-pointer"
              >
                {DEPARTMENT_LIST.map((dept) => (
                  <option key={dept.code} value={dept.code}>
                    {dept.code} - {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Branch Navigation Pills Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 scrollbar-thin">
            {DEPARTMENT_LIST.map((dept) => {
              const isActive = dept.code === departmentCode;
              const deptKeyCount = answerKeys.filter((k) => k.department === dept.code).length;
              return (
                <button
                  key={dept.code}
                  onClick={() => onSelectDepartment(dept.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#781717] text-white shadow-xs scale-102'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <span>{dept.code}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {deptKeyCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
            <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-black flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              Department Confidential Scope: {departmentCode}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-bold">Autonomous Answer Keys & Rubrics</span>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
            Restricted View • Other Department Records Shielded
          </span>
        </div>
      )}

      {/* 2. Department Sub-Page Hero Banner */}
      <div className="bg-gradient-to-r from-[#781717] via-red-900 to-[#5a1111] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="px-3 py-1 rounded-xl bg-amber-400/20 text-amber-300 font-black text-xs border border-amber-400/30">
                Department of {currentDeptMeta.code}
              </span>
              <span className="text-xs text-rose-200 font-semibold uppercase tracking-wider">
                Autonomous Scheme of Valuation Suite
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {currentDeptMeta.name}
            </h1>
            <p className="text-xs sm:text-sm text-rose-100/90 font-medium mt-1 leading-relaxed">
              {currentDeptMeta.description}
            </p>

            {/* Micro Badges */}
            <div className="flex items-center gap-3 mt-3 text-xs text-rose-200 font-semibold flex-wrap">
              <span className="flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-lg">
                <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
                Regulation: R-2021 Autonomous CBCS
              </span>
              <span className="flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-lg">
                <BookOpen className="w-3.5 h-3.5 text-sky-300" />
                {departmentSyllabus.length} Core Curriculum Subjects
              </span>
            </div>
          </div>

          {/* Action Center Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={async () => {
                try {
                  const blob = await generateBlankTemplateDocx(
                    departmentCode,
                    selectedCategory === 'ALL' ? 'Model' : selectedCategory
                  );
                  triggerFileDownload(
                    blob,
                    `VSBEC_${departmentCode}_${selectedCategory === 'ALL' ? 'Model' : selectedCategory}_Word_Template.docx`
                  );
                } catch (e: any) {
                  alert(`Error generating Word template: ${e.message}`);
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              title="Download Microsoft Word (.docx) Answer Key Template"
            >
              <FileText className="w-4 h-4 text-blue-200" />
              <span>Word Template (.docx)</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenQuestionPaperUpload(selectedCategory === 'ALL' ? 'Model' : selectedCategory)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              title="Upload Question Paper PDF/DOCX for AI Key Extraction"
            >
              <UploadCloud className="w-4 h-4 text-slate-950" />
              <span>Upload Paper</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenTemplateUpload(selectedCategory === 'ALL' ? 'Model' : selectedCategory)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shadow-xs transition-all cursor-pointer"
              title="Standardized Template Format Configurator & Uploader"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Load Template</span>
            </button>

            <button
              type="button"
              onClick={() => onCreateNewKey(selectedCategory === 'ALL' ? 'Model' : selectedCategory)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#781717] font-black text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#781717]" />
              <span>New Key</span>
            </button>
          </div>
        </div>

        {/* Exam Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-rose-800/60 relative z-10 text-xs">
          <button
            onClick={() => setSelectedCategory('Internal')}
            className={`p-3 rounded-2xl text-left transition-all cursor-pointer ${
              selectedCategory === 'Internal' ? 'bg-white/20 border-2 border-amber-400' : 'bg-black/20 hover:bg-black/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase">Internal Tests (50M)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200">IAT 1-3</span>
            </div>
            <p className="text-xl font-black text-white mt-1">{internalCount} Keys</p>
          </button>

          <button
            onClick={() => setSelectedCategory('Model')}
            className={`p-3 rounded-2xl text-left transition-all cursor-pointer ${
              selectedCategory === 'Model' ? 'bg-white/20 border-2 border-sky-400' : 'bg-black/20 hover:bg-black/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-300 uppercase">Model Exams (100M)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-400/20 text-sky-200">Pre-Sem</span>
            </div>
            <p className="text-xl font-black text-white mt-1">{modelCount} Keys</p>
          </button>

          <button
            onClick={() => setSelectedCategory('Semester')}
            className={`p-3 rounded-2xl text-left transition-all cursor-pointer ${
              selectedCategory === 'Semester' ? 'bg-white/20 border-2 border-purple-400' : 'bg-black/20 hover:bg-black/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-300 uppercase">Semester ESE (100M)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-400/20 text-purple-200">COE Final</span>
            </div>
            <p className="text-xl font-black text-white mt-1">{semesterCount} Keys</p>
          </button>

          <div className="p-3 rounded-2xl bg-black/20 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-300 uppercase">COE Certified</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-200">Verified</span>
            </div>
            <p className="text-xl font-black text-white mt-1">
              {lockedCount} / {deptKeys.length} Locked
            </p>
          </div>
        </div>
      </div>

      {/* 3. Fast Exam Key Creation & Department Curriculum Subjects Strip */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#781717]" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              {departmentCode} Core Curriculum Quick Key Generator
            </h3>
          </div>
          <button
            onClick={() => setIsQuickSubjectOpen(!isQuickSubjectOpen)}
            className="text-xs font-bold text-[#781717] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{isQuickSubjectOpen ? 'Hide Courses' : 'Browse Courses'}</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isQuickSubjectOpen ? 'rotate-90' : ''}`} />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-3">
          Instant-create official VSBEC answer keys pre-mapped with Bloom&apos;s Taxonomy (K1-K6), Course Outcomes (CO1-CO6), and step-by-step valuation rubrics for official syllabus subjects:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {departmentSyllabus.slice(0, isQuickSubjectOpen ? undefined : 4).map((sub) => (
            <div
              key={sub.code}
              className="p-3 rounded-xl bg-slate-50 hover:bg-red-50/50 border border-slate-200 hover:border-[#781717]/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-[#781717]">{sub.code}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    Sem {sub.semester}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{sub.name}</h4>
              </div>

              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-200/60">
                <button
                  onClick={() => onCreateNewKey('Internal', sub.code, sub.name, sub.semester)}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold text-center transition-colors cursor-pointer"
                  title="Create 50 Marks Internal Key"
                >
                  + IAT (50M)
                </button>
                <button
                  onClick={() => onCreateNewKey('Model', sub.code, sub.name, sub.semester)}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 text-[10px] font-bold text-center transition-colors cursor-pointer"
                  title="Create 100 Marks Model Exam Key"
                >
                  + Model
                </button>
                <button
                  onClick={() => onCreateNewKey('Semester', sub.code, sub.name, sub.semester)}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 text-[10px] font-bold text-center transition-colors cursor-pointer"
                  title="Create 100 Marks Semester ESE Key"
                >
                  + ESE
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Filter Toolbar & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { id: 'ALL', label: 'All Exams', count: deptKeys.length },
              { id: 'Internal', label: 'Internal (IAT 1-3)', count: internalCount },
              { id: 'Model', label: 'Model Exam (100M)', count: modelCount },
              { id: 'Semester', label: 'Autonomous ESE', count: semesterCount }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-[#781717] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedCategory === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search, Semester & Set Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search code, subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#781717]/20"
            />
          </div>

          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>
                Sem {sem}
              </option>
            ))}
          </select>

          <select
            value={selectedSet}
            onChange={(e) => setSelectedSet(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
          >
            <option value="ALL">All Sets</option>
            <option value="Set A">Set A</option>
            <option value="Set B">Set B</option>
            <option value="Set C">Set C</option>
            <option value="Set D">Set D</option>
          </select>
        </div>
      </div>

      {/* 5. Answer Key List & Card Grid */}
      {filteredKeys.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 text-amber-700">
            <Building className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-800">
            No Answer Keys for {currentDeptMeta.name}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            No answer key matches your current filters ({selectedCategory}, {selectedSet}). You can upload a question paper for automatic OCR rubric parsing, use the standardized template configurator, or create an exam key manually.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onOpenQuestionPaperUpload(selectedCategory === 'ALL' ? 'Model' : selectedCategory)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Question Paper</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenTemplateUpload(selectedCategory === 'ALL' ? 'Model' : selectedCategory)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Use Standard Template</span>
            </button>
            <button
              type="button"
              onClick={() => onCreateNewKey(selectedCategory === 'ALL' ? 'Model' : selectedCategory)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#781717] hover:bg-[#5a1111] text-white font-bold text-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Answer Key</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKeys.map((key) => {
            const isInternal = key.examCategory === 'Internal';
            const isModel = key.examCategory === 'Model' || !key.examCategory;
            const isSemester = key.examCategory === 'Semester';

            const k1K2Count = key.questions.filter((q) => q.cognitiveLevel?.startsWith('K1') || q.cognitiveLevel?.startsWith('K2')).length;
            const k3K4Count = key.questions.filter((q) => q.cognitiveLevel?.startsWith('K3') || q.cognitiveLevel?.startsWith('K4')).length;
            const k5K6Count = key.questions.filter((q) => q.cognitiveLevel?.startsWith('K5') || q.cognitiveLevel?.startsWith('K6')).length;

            return (
              <div
                key={key.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-[#781717] transition-all shadow-xs hover:shadow-md flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          isInternal
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : isSemester
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-sky-100 text-sky-900 border border-sky-200'
                        }`}
                      >
                        {key.examCategory || 'Model'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200">
                        {key.setCode || 'Set A'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-[#781717] text-[10px] font-bold">
                        {key.maximumMarks}M
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleLock(key)}
                      className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                        key.isLocked
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200'
                      }`}
                      title={key.isLocked ? 'Certified & Locked by COE (Click to unlock)' : 'Draft Mode (Click to lock)'}
                    >
                      {key.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Subject info */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-black text-[#781717]">{key.subjectCode}</span>
                    <span className="text-[11px] font-bold text-slate-400">Semester {key.semester}</span>
                    <span className="text-[10px] font-semibold text-slate-400 ml-auto">{key.duration || '3.0 Hrs'}</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mt-0.5 line-clamp-2">
                    {key.subjectName}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1">
                    {key.examTitle || `${key.examCategory || 'Autonomous'} Examination`}
                  </p>

                  {/* Blooms Taxonomy Level Distribution */}
                  <div className="mt-3.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>Bloom&apos;s Level Spread</span>
                      <span className="text-[#781717]">{key.questions.length} Questions</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900" title="Remember & Understand">
                        K1-K2: {k1K2Count}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-900" title="Apply & Analyze">
                        K3-K4: {k3K4Count}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900" title="Evaluate & Create">
                        K5-K6: {k5K6Count}
                      </span>
                    </div>
                  </div>

                  {/* Attached Question Paper / Solution Pages Pill */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{key.uploadedPageSolutions?.length || 1} Solution Pages</span>
                    </span>
                    {key.uploadedQuestionPaperName && (
                      <span className="truncate max-w-[140px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                        Paper Attached
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const blob = await generateAnswerKeyDocx(key);
                          triggerFileDownload(
                            blob,
                            `VSBEC_${key.department}_${key.subjectCode}_${key.examCategory || 'Model'}_${key.setCode || 'SetA'}_AnswerKey.docx`
                          );
                        } catch (e: any) {
                          alert(`Error exporting Word Document: ${e.message}`);
                        }
                      }}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-all cursor-pointer"
                      title="Download Answer Key as Microsoft Word (.docx)"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPrintOfficialPdf(key)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                      title="Print Official COE Valuation Sheet"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateKey(key)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                      title="Duplicate to next Set (e.g. Set B)"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {onDeleteKey && (
                      <button
                        type="button"
                        onClick={() => onDeleteKey(key.id)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                        title="Delete Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditKey(key)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#781717] hover:bg-[#5a1111] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Customize Rubric</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
