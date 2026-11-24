import React from 'react';
import {
  Building,
  GraduationCap,
  Users,
  Award,
  ChevronRight,
  Sparkles,
  Sliders,
  Lock,
  Unlock,
  CheckCircle2
} from 'lucide-react';
import { DepartmentCode, StudentProfile, DepartmentCustomization } from '../types';

interface DepartmentDirectoryGridProps {
  departments: { code: DepartmentCode; name: string; alias: string; description: string }[];
  students: StudentProfile[];
  departmentConfigs: Record<string, DepartmentCustomization>;
  unlockedDepts: Record<string, boolean>;
  onSelectDepartment: (deptCode: DepartmentCode) => void;
  onCustomizeDepartment: (deptCode: DepartmentCode) => void;
  onUnlockDepartment: (deptCode: DepartmentCode) => void;
}

export const DepartmentDirectoryGrid: React.FC<DepartmentDirectoryGridProps> = ({
  departments,
  students,
  departmentConfigs,
  unlockedDepts,
  onSelectDepartment,
  onCustomizeDepartment,
  onUnlockDepartment
}) => {
  return (
    <div className="space-y-6">
      {/* Directorate Header Banner */}
      <div className="bg-gradient-to-r from-[#781717] via-red-900 to-[#5a1111] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-black tracking-wider uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Autonomous Examination Directorate • 13 Engineering Divisions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Academic Department Registry & Student Control Hub
          </h1>
          <p className="text-xs sm:text-sm text-rose-100/90 mt-2 font-medium leading-relaxed">
            Manage academic batches, student enrollments, attendance percentages, CGPA progression,
            section divisions (A to F), and department customization across all 13 autonomous engineering departments.
          </p>
        </div>

        {/* Global Overview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-rose-800/60 relative z-10">
          <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-bold text-rose-200 uppercase block">Total Departments</span>
            <p className="text-2xl font-black text-white mt-0.5">13 Divisions</p>
          </div>
          <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-bold text-rose-200 uppercase block">Total Candidates</span>
            <p className="text-2xl font-black text-amber-300 mt-0.5">{students.length} Enrolled</p>
          </div>
          <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-bold text-rose-200 uppercase block">Academic Years</span>
            <p className="text-2xl font-black text-white mt-0.5">Year I - IV (Sem 1-8)</p>
          </div>
          <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] font-bold text-rose-200 uppercase block">Autonomous Regulation</span>
            <p className="text-2xl font-black text-emerald-300 mt-0.5">R-2021 CBCS</p>
          </div>
        </div>
      </div>

      {/* 13 Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {departments.map((dept) => {
          const deptStudents = students.filter((s) => s.department === dept.code);
          const config = departmentConfigs[dept.code];
          const isUnlocked = !!unlockedDepts[dept.code];
          const avgCgpa =
            deptStudents.length > 0
              ? (deptStudents.reduce((acc, s) => acc + s.cgpa, 0) / deptStudents.length).toFixed(2)
              : '8.40';
          const shortageCount = deptStudents.filter((s) => s.attendancePercentage < 75).length;

          return (
            <div
              key={dept.code}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent rounded-bl-full pointer-events-none" />

              <div>
                {/* Header with Code Pill & Unlock Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-xl bg-[#781717]/10 text-[#781717] font-black text-xs sm:text-sm tracking-wide">
                    {dept.code}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                        <Unlock className="w-3 h-3 text-emerald-600" />
                        <span>Unlocked</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Locked</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Name & Degree */}
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug group-hover:text-[#781717] transition-colors">
                  {config?.name || dept.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {config?.degreeTitle || `B.E. ${dept.name}`}
                </p>

                {/* HOD & Details */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Head of Dept:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[180px]">
                      {config?.hodName || 'Dr. HOD Office'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Intake / Faculty:</span>
                    <span className="font-bold text-slate-700">
                      {config?.sanctionedIntake || 180} Seats • {config?.facultyCount || 20} Faculty
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Class CGPA Avg:</span>
                    <span className="font-black text-amber-600">{avgCgpa}</span>
                  </div>
                  {shortageCount > 0 && (
                    <div className="flex items-center justify-between text-rose-600">
                      <span className="font-medium">Attendance &lt;75%:</span>
                      <span className="font-black bg-rose-50 px-2 py-0.5 rounded-md text-[11px]">
                        {shortageCount} Students
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Action Controls */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectDepartment(dept.code)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#781717] hover:bg-[#601212] text-white font-black text-xs shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  <span>Open Dept Portal</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isUnlocked) {
                      onCustomizeDepartment(dept.code);
                    } else {
                      onUnlockDepartment(dept.code);
                    }
                  }}
                  title="Customize Department Details"
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-bold text-xs cursor-pointer transition-all active:scale-95"
                >
                  <Sliders className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
