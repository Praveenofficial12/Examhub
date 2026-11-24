import React from 'react';
import {
  Building,
  GraduationCap,
  FileCheck,
  Lock,
  Unlock,
  Sparkles,
  ChevronRight,
  Plus,
  Search,
  Layers,
  Award,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { DepartmentCode, ExamAnswerKey, ExamCategory, DepartmentCustomization } from '../types';
import { DEPARTMENT_LIST } from '../data/departmentsData';

interface AnswerKeyDepartmentGridProps {
  departments?: { code: DepartmentCode; name: string; alias: string; description: string }[];
  answerKeys: ExamAnswerKey[];
  departmentConfigs?: Record<string, DepartmentCustomization>;
  selectedCategory?: 'ALL' | ExamCategory;
  onSelectDepartment: (deptCode: DepartmentCode) => void;
  onUploadQuestionPaper?: (deptCode?: DepartmentCode) => void;
  onUploadTemplate?: (deptCode?: DepartmentCode) => void;
  onCreateNewKey?: (deptCode?: DepartmentCode) => void;
}

export const AnswerKeyDepartmentGrid: React.FC<AnswerKeyDepartmentGridProps> = ({
  departments = DEPARTMENT_LIST,
  answerKeys,
  departmentConfigs = {},
  selectedCategory = 'ALL',
  onSelectDepartment,
  onUploadQuestionPaper,
  onUploadTemplate,
  onCreateNewKey
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredDepts = departments.filter((d) => {
    const q = searchQuery.toLowerCase();
    const config = departmentConfigs[d.code];
    return (
      d.code.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      (config?.hodName && config.hodName.toLowerCase().includes(q))
    );
  });

  const totalKeys = answerKeys.length;
  const internalCount = answerKeys.filter((k) => k.examCategory === 'Internal').length;
  const modelCount = answerKeys.filter((k) => k.examCategory === 'Model').length;
  const semesterCount = answerKeys.filter((k) => k.examCategory === 'Semester' || !k.examCategory).length;
  const lockedCount = answerKeys.filter((k) => k.isLocked).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#781717] via-red-900 to-[#5a1111] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-black tracking-wider uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Autonomous Examination Directorate • Answer Key & Evaluation Rubric Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Department-Wise Answer Key & Rubric Management
          </h1>
          <p className="text-xs sm:text-sm text-rose-100/90 mt-2 font-medium leading-relaxed">
            Configure, upload, and customize answer keys for <strong>Internal Assessments (IAT 1-3)</strong>,{' '}
            <strong>Model Examinations</strong>, and <strong>Autonomous End-Semester Examinations (ESE)</strong> across all 13 engineering divisions with Question Paper OCR extraction and Page Solution Templates.
          </p>
        </div>

        {/* Global Key Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-rose-800/60 relative z-10">
          <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] font-bold text-rose-200 uppercase block">Total Answer Keys</span>
            <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalKeys} Configured</p>
          </div>
          <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] font-bold text-rose-200 uppercase block">Internal (IAT 1-3)</span>
            <p className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{internalCount} Keys</p>
          </div>
          <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] font-bold text-rose-200 uppercase block">Model Exams</span>
            <p className="text-xl sm:text-2xl font-black text-sky-300 mt-0.5">{modelCount} Keys</p>
          </div>
          <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] font-bold text-rose-200 uppercase block">Semester (ESE)</span>
            <p className="text-xl sm:text-2xl font-black text-purple-300 mt-0.5">{semesterCount} Keys</p>
          </div>
          <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] font-bold text-rose-200 uppercase block">COE Locked & Valid</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">{lockedCount} Locked</p>
          </div>
        </div>
      </div>

      {/* Action Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search department code, full name, or HOD..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#781717]/20 focus:border-[#781717] font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onUploadQuestionPaper()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Question Paper & Make Key</span>
          </button>

          <button
            onClick={() => onUploadTemplate()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer border border-slate-300/80"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Upload / Download Template</span>
          </button>

          <button
            onClick={() => onCreateNewKey()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#781717] hover:bg-[#5a1111] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Answer Key</span>
          </button>
        </div>
      </div>

      {/* 13 Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredDepts.map((dept) => {
          const config = departmentConfigs[dept.code];
          const deptKeys = answerKeys.filter((k) => {
            const matchesDept = k.department === dept.code;
            if (!matchesDept) return false;
            if (selectedCategory === 'ALL') return true;
            return k.examCategory === selectedCategory;
          });

          const deptInternal = answerKeys.filter((k) => k.department === dept.code && k.examCategory === 'Internal').length;
          const deptModel = answerKeys.filter((k) => k.department === dept.code && k.examCategory === 'Model').length;
          const deptSemester = answerKeys.filter((k) => k.department === dept.code && (k.examCategory === 'Semester' || !k.examCategory)).length;
          const deptLocked = deptKeys.filter((k) => k.isLocked).length;

          return (
            <div
              key={dept.code}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent rounded-bl-full pointer-events-none" />

              <div>
                {/* Department Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-xl bg-[#781717]/10 text-[#781717] font-black text-xs sm:text-sm tracking-wide">
                    {dept.code}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{deptKeys.length} {deptKeys.length === 1 ? 'Key' : 'Keys'}</span>
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#781717] transition-colors leading-snug">
                  {dept.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {config?.degreeTitle || `B.E. / B.Tech ${dept.name}`}
                </p>

                {/* HOD & BOS */}
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">HOD:</span>
                    <span className="font-semibold text-slate-700">{config?.hodName || 'Dr. Department HOD'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Regulation:</span>
                    <span className="font-bold text-emerald-700">R-2021 Autonomous</span>
                  </div>
                </div>

                {/* Exam Breakdown Badges */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                  <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-2 text-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Internal</span>
                    <span className="text-sm font-black text-amber-900">{deptInternal}</span>
                  </div>
                  <div className="bg-sky-50/70 border border-sky-200/60 rounded-xl p-2 text-center">
                    <span className="text-[10px] font-bold text-sky-800 uppercase block">Model</span>
                    <span className="text-sm font-black text-sky-900">{deptModel}</span>
                  </div>
                  <div className="bg-purple-50/70 border border-purple-200/60 rounded-xl p-2 text-center">
                    <span className="text-[10px] font-bold text-purple-800 uppercase block">Semester</span>
                    <span className="text-sm font-black text-purple-900">{deptSemester}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => onSelectDepartment(dept.code)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#781717] hover:bg-[#5a1111] text-white text-xs font-bold transition-all shadow-xs group-hover:shadow cursor-pointer"
                >
                  <span>Open {dept.code} Portal</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onUploadQuestionPaper(dept.code)}
                  title="Upload Question Paper for this Department"
                  className="p-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 transition-all cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
