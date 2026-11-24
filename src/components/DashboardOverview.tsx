import React from 'react';
import { motion } from 'motion/react';
import {
  QrCode,
  MessageSquareShare,
  FileSpreadsheet,
  KeyRound,
  Users,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  Clock,
  Sparkles,
  FileText,
  CheckCircle,
  AlertTriangle,
  Send,
  Layers,
  GraduationCap,
  Download,
  FileCheck2,
  CheckCircle2,
  Cpu,
  UserX
} from 'lucide-react';
import { ActiveTab } from './HeaderNav';
import {
  AnswerSheet,
  SmsLog,
  MarkRecord,
  ExamAnswerKey,
  StudentProfile,
  ExamTelemetryEvent,
  UserSession,
  StaffAccount,
  TeacherAllocation,
  StudentTestMark
} from '../types';
import {
  getActiveStaffWorkspace,
  loadStatementsForStaff,
  loadCustomTemplatesForStaff
} from '../utils/staffAuthService';
import {
  collectRetestStudentsFromAnswerSheets,
  collectRetestStudentsFromTestMarks
} from '../utils/retestHelper';

interface DashboardOverviewProps {
  onNavigate: (tab: ActiveTab) => void;
  answerSheets: AnswerSheet[];
  smsLogs: SmsLog[];
  markRecords: MarkRecord[];
  answerKeys: ExamAnswerKey[];
  students: StudentProfile[];
  telemetryEvents: ExamTelemetryEvent[];
  session?: UserSession;
  staffAccounts?: StaffAccount[];
  teacherAllocations?: TeacherAllocation[];
  studentTestMarks?: StudentTestMark[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
  answerSheets,
  smsLogs,
  markRecords,
  answerKeys,
  students,
  telemetryEvents,
  session,
  staffAccounts = [],
  teacherAllocations = [],
  studentTestMarks = []
}) => {
  const isDeptUser = session && !session.isAdmin && session.department && session.department !== 'ALL';
  const currentDept = session?.department;
  const staffWorkspace = getActiveStaffWorkspace(session, staffAccounts);
  const activeStaffId = staffWorkspace.staffId;
  const activeStaffName = staffWorkspace.staffName;
  const staffOwnStatements = activeStaffId ? loadStatementsForStaff(activeStaffId) : [];
  const staffOwnTemplates = activeStaffId ? loadCustomTemplatesForStaff(activeStaffId) : [];
  const staffOwnAllocations = activeStaffId
    ? teacherAllocations.filter(
        (a) =>
          a.department === 'AI&DS' &&
          (a.teacherId === activeStaffId ||
            a.teacherName.toLowerCase() === (activeStaffName || '').toLowerCase())
      )
    : [];

  // Department-isolated data sets if non-admin user
  const effectiveAnswerSheets = isDeptUser
    ? answerSheets.filter((s) => s.department === currentDept)
    : answerSheets;
  const effectiveSmsLogs = isDeptUser
    ? smsLogs.filter((l) => l.department === currentDept)
    : smsLogs;
  const effectiveStudents = isDeptUser
    ? students.filter((s) => s.department === currentDept)
    : students;
  const effectiveAnswerKeys = isDeptUser
    ? answerKeys.filter((k) => k.department === currentDept)
    : answerKeys;
  const [selectedSemester, setSelectedSemester] = React.useState<number>(0);

  const [liveDateStr, setLiveDateStr] = React.useState(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  const [liveTimeStr, setLiveTimeStr] = React.useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setLiveDateStr(
        now.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      );
      setLiveTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalSheets = effectiveAnswerSheets.filter(
    (s) => selectedSemester === 0 || s.semester === selectedSemester
  ).length;
  const scopedSheets = effectiveAnswerSheets.filter(
    (s) => selectedSemester === 0 || s.semester === selectedSemester
  );
  const scopedStudents = effectiveStudents.filter(
    (s) => selectedSemester === 0 || s.semester === selectedSemester
  );
  const scopedAnswerKeys = effectiveAnswerKeys.filter(
    (k) => selectedSemester === 0 || k.semester === selectedSemester
  );
  const mappedSheets = scopedSheets.filter((s) => s.status === 'mapped').length;
  const mappingRate = totalSheets > 0 ? ((mappedSheets / totalSheets) * 100).toFixed(1) : '0.0';

  const totalSmsDelivered = effectiveSmsLogs.filter((l) => l.status === 'delivered').length;
  const totalStudents = scopedStudents.length;
  const latestSheet = scopedSheets[0] || null;

  const passedSheets = scopedSheets.filter((s) => s.resultStatus === 'PASS').length;
  const evaluatedSheets = scopedSheets.filter((s) => s.marksObtained !== undefined);
  const passRate =
    evaluatedSheets.length > 0
      ? `${((passedSheets / evaluatedSheets.length) * 100).toFixed(1)}%`
      : markRecords.length > 0
      ? `${((markRecords.filter((m) => m.resultStatus === 'PASS').length / markRecords.length) * 100).toFixed(1)}%`
      : '—';
  const avgCgpa =
    scopedStudents.length > 0
      ? (scopedStudents.reduce((sum, st) => sum + (Number(st.cgpa) || 0), 0) / scopedStudents.length).toFixed(2)
      : '—';

  const retestFromScans = React.useMemo(
    () => collectRetestStudentsFromAnswerSheets(scopedSheets, scopedStudents),
    [scopedSheets, scopedStudents]
  );
  const retestFromExcel = React.useMemo(
    () => collectRetestStudentsFromTestMarks(studentTestMarks, scopedStudents),
    [studentTestMarks, scopedStudents]
  );
  const totalRetestCandidates = retestFromScans.length + retestFromExcel.length;

  return (
    <div className="space-y-8 pb-10">
      {/* Isolated Staff Workspace Card (for Staff Portal or Admin inspecting a Staff Page) */}
      {staffWorkspace.isScoped && activeStaffId && (
        <div className="bg-white border-2 border-emerald-300/80 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#781717] text-amber-300 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                {activeStaffId.replace('FAC-AIDS-', 'S')}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-slate-900">
                    {activeStaffName}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-black">
                    {activeStaffId}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                    Zero Cross-Staff Mismatch
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Separate Staff Workspace — Only your private Mark Statements ({staffOwnStatements.length}), Custom Templates ({staffOwnTemplates.length}), and Subject Keys are stored here.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('marks')}
                className="px-3.5 py-2 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white text-xs font-black cursor-pointer"
              >
                My Mark Statements ({staffOwnStatements.length})
              </button>
              <button
                type="button"
                onClick={() => onNavigate('upload-marks')}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
              >
                Upload Class Marks
              </button>
            </div>
          </div>

          {staffOwnAllocations.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-bold text-slate-500 uppercase text-[10px] mr-1">
                Allocated Subjects:
              </span>
              {staffOwnAllocations.map((al) => (
                <span
                  key={al.id}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-semibold"
                >
                  <strong className="font-mono text-[#781717]">{al.subjectCode}</strong> • {al.subjectName} (Yr {al.classYear}-{al.section})
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Staff Credential & Staff Page Control Quick Card */}
      {session?.isAdmin && !staffWorkspace.isScoped && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#781717] text-amber-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-[#781717]">
                COE Admin Staff Portal Control ({staffAccounts.length} Active Staff IDs)
              </div>
              <div className="text-[11px] text-amber-900 font-medium">
                Create new Staff IDs &amp; Passwords, reset staff credentials, or open any staff member&rsquo;s separate private workspace directly.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('staff-accounts')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-black text-xs cursor-pointer shrink-0 shadow-xs"
          >
            <span>Open Staff IDs &amp; Passwords</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </div>
      )}

      {/* ========================================================
          1. TOP HERO MAROON STATS BANNER (Exact Design as in Image)
         ======================================================== */}
      <div className="bg-[#781717] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Subtle glowing ambient circles */}
        <div className="absolute -top-16 -left-16 w-56 h-56 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Left Side: Live Session Tag with Year, Month, Date & Time */}
        <div className="z-10 flex items-center justify-center lg:justify-start w-full lg:w-auto">
          <div className="inline-flex flex-col sm:flex-row items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#f59e0b] text-[#781717] font-black text-xs sm:text-sm tracking-wider uppercase shadow-md">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-800 shrink-0" />
              <span className="whitespace-nowrap">WORKSPACE CLOCK:</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="font-mono">{liveDateStr}</span>
              <span className="text-[11px] bg-red-900/20 px-2 py-0.5 rounded-md font-mono text-red-950 font-extrabold whitespace-nowrap">
                {liveTimeStr}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Live Workspace Numerical Stats */}
        <div className="z-10 grid grid-cols-3 gap-3 sm:gap-6 w-full lg:w-auto text-center tabular-nums">
          {/* Stat 1 */}
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-3xl md:text-4xl font-black text-amber-300 font-mono tracking-tight">
              {totalSheets}
            </span>
            <span className="text-[9px] sm:text-xs font-extrabold uppercase tracking-wider text-rose-200 mt-1 whitespace-nowrap">
              SCRIPTS SCANNED
            </span>
          </div>

          {/* Stat 2 */}
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-3xl md:text-4xl font-black text-amber-300 font-mono tracking-tight">
              {totalSheets > 0 ? `${mappingRate}%` : '—'}
            </span>
            <span className="text-[9px] sm:text-xs font-extrabold uppercase tracking-wider text-rose-200 mt-1 whitespace-nowrap">
              MAPPED RATE
            </span>
          </div>

          {/* Stat 3 */}
          <div className="flex flex-col items-center">
            <span className="text-xl sm:text-3xl md:text-4xl font-black text-amber-300 font-mono tracking-tight">
              {totalStudents}
            </span>
            <span className="text-[9px] sm:text-xs font-extrabold uppercase tracking-wider text-rose-200 mt-1 whitespace-nowrap">
              STUDENTS
            </span>
          </div>
        </div>
      </div>

      {/* Curricular Semester Filter Console directly under Hero Banner */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#781717] text-white flex items-center justify-center font-black text-xs shadow-xs">
            SEM
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
              Autonomous Curricular Semester Filter (AI&DS Dept)
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Filter evaluation metrics, test windows, and student cohorts by semester
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="dash-sem-select" className="text-xs font-bold text-slate-700 shrink-0">
            Select Semester:
          </label>
          <select
            id="dash-sem-select"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl border border-[#781717]/40 bg-red-50/50 text-xs font-black text-[#781717] focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
          >
            <option value={0}>All Semesters (Consolidated View)</option>
            <option value={1}>Semester 01 (Year I • Python & Math)</option>
            <option value={2}>Semester 02 (Year I • DSA & Graphics)</option>
            <option value={3}>Semester 03 (Year II • DAA & DBMS)</option>
            <option value={4}>Semester 04 (Year II • Machine Learning)</option>
            <option value={5}>Semester 05 (Year III • Deep Neural Networks)</option>
            <option value={6}>Semester 06 (Year III • NLP & GenAI)</option>
            <option value={7}>Semester 07 (Year IV • Computer Vision & Perception)</option>
            <option value={8}>Semester 08 (Year IV • Capstone Project)</option>
          </select>
        </div>
      </div>

      {/* Quick Retest Attending Students Card (<30/50 or <60/100) */}
      <div className="bg-white border border-rose-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-700 text-white flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-slate-900">
                Retest Attending Students Monitor
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black tabular-nums">
                {totalRetestCandidates} Retest Identified
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Students scoring below <strong>30 / 50</strong> or <strong>60 / 100</strong> from Answer Sheet Scans ({retestFromScans.length}) and Uploaded Mark Excel ({retestFromExcel.length}) appear automatically.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('answer-sheets')}
            className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-black cursor-pointer"
          >
            Scanned Retest List
          </button>
          <button
            type="button"
            onClick={() => onNavigate('upload-marks')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold cursor-pointer"
          >
            Excel Marks Retest List
          </button>
        </div>
      </div>

      {/* ========================================================
          ADMIN EXCLUSIVE: TEACHER CLASS ALLOCATIONS QUICK ACCESS
         ======================================================== */}
      {session?.isAdmin && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 border-2 border-amber-400/40 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1">
                Admin Exclusive Module
              </div>
              <h3 className="text-lg font-black tracking-tight text-white">
                Faculty Course & Teacher Class Allocations
              </h3>
              <p className="text-xs text-slate-300 font-medium max-w-xl mt-0.5">
                Assign faculty instructors, lab in-charges, and mentors for Department of Artificial Intelligence & Data Science (AI&DS).
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('allocations')}
            className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer"
          >
            <span>Open Allocations Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================
          2. THREE CORE MODULE CARDS (Exact Design as in Image)
         ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* MODULE 01: SCRIPT MAPPING */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/90 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div>
            {/* Header: Icon & Module Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shadow-xs">
                QR
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[11px] uppercase tracking-wider">
                MODULE 01
              </span>
            </div>

            {/* Title & Description */}
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
              SCRIPT MAPPING
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
              {latestSheet
                ? `${latestSheet.registerNo} (${latestSheet.studentName}) evaluated in ${latestSheet.subjectCode}.`
                : 'Scan answer booklets via webcam or rear lens to auto-extract Register No., marks, and sync to Live Excel.'}
            </p>

            {/* Dotted Scan Stream Box */}
            <div className="border-2 border-dashed border-indigo-200/80 bg-indigo-50/40 rounded-2xl p-3.5 mb-5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                LATEST EVALUATION RECORD
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-indigo-700 truncate tabular-nums">
                  {latestSheet
                    ? `${latestSheet.registerNo} · ${latestSheet.marksObtained ?? 0}/${latestSheet.maxMarks || 50}M`
                    : 'No scripts scanned yet'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${
                    latestSheet
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-slate-600 bg-white border-slate-200'
                  }`}
                >
                  {latestSheet ? `${mappedSheets}/${totalSheets} MAPPED` : 'READY'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={() => onNavigate('answer-sheets')}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Launch Script Scanner</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* MODULE 02: PARENT SMS LOGS */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/90 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div>
            {/* Header: Icon & Module Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs shadow-xs">
                SMS
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-extrabold text-[11px] uppercase tracking-wider">
                MODULE 02
              </span>
            </div>

            {/* Title & Description */}
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
              PARENT SMS LOGS
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
              {totalSmsDelivered > 0
                ? `Gateway: VSB-EXAM active. ${totalSmsDelivered} parent notification(s) delivered from this workspace.`
                : 'Send official DLT mark and attendance alerts directly to registered guardians.'}
            </p>

            {/* Quota Progress Box */}
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-3.5 mb-5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-900 tabular-nums">
                <span>WORKSPACE DISPATCHES</span>
                <span className="font-mono text-emerald-700">{totalSmsDelivered} / {effectiveSmsLogs.length} DELIVERED</span>
              </div>
              <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width:
                      effectiveSmsLogs.length > 0
                        ? `${Math.min(100, Math.round((totalSmsDelivered / effectiveSmsLogs.length) * 100))}%`
                        : '0%'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={() => onNavigate('sms')}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Open SMS Automation</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* MODULE 03: TRANSCRIPT HUB */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/90 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div>
            {/* Header: Icon & Module Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-black text-xs shadow-xs">
                GPA
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 font-extrabold text-[11px] uppercase tracking-wider">
                MODULE 03
              </span>
            </div>

            {/* Title & Description */}
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
              MARK STATEMENT GENERATOR
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
              Autonomous end-semester grade sheets, GPA calculations, and Form AC 09 mark statements.
            </p>

            {/* GPA Summary Box */}
            <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-3.5 mb-5 flex items-center justify-between gap-2 tabular-nums">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  COHORT PASS RATE
                </span>
                <span className="text-xs font-black text-amber-800">
                  {passRate === '—' ? 'No marks recorded' : `${passRate} Pass Rate`}
                </span>
              </div>
              <span className="text-xs font-mono font-extrabold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-xl whitespace-nowrap shrink-0">
                AVG CGPA: {avgCgpa}
              </span>
            </div>
          </div>

          {/* Action Trigger (Exact Orange "GENERATE PDF" Button as in Image) */}
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('marks')}
              className="flex-1 py-3 px-4 rounded-2xl bg-[#d97706] hover:bg-[#b45309] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer uppercase tracking-wider"
            >
              <span>GENERATE PDF</span>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================
          3. SECONDARY MODULES (Module 04 & 05) & LIVE TELEMETRY
         ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

        {/* MODULE 04: ANSWER KEY RUBRICS */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                <KeyRound className="w-5 h-5" />
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 font-extrabold text-[11px] uppercase tracking-wider">
                MODULE 04
              </span>
            </div>
            <h4 className="text-base font-black text-slate-900 uppercase">ANSWER KEY GENERATOR</h4>
            <p className="text-xs text-slate-600 mt-1 mb-4">
              AI Question Paper solver with mark-sized answers, custom Word templates, live Word editor, and aligned DOCX/PDF export across all staff, classes &amp; exam types.
            </p>
            <div className="bg-purple-50/40 p-3 rounded-2xl border border-purple-100 text-xs font-semibold text-purple-900 mb-4 flex items-center justify-between tabular-nums">
              <span>Configured Keys:</span>
              <span className="font-mono font-bold text-purple-700">{scopedAnswerKeys.length} Keys Ready</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('answer-keys')}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
          >
            <span>Open Answer Key Generator</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        {/* MODULE 05: STUDENT REGISTRY */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs">
                <Users className="w-5 h-5" />
              </div>
              <span className="px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 font-extrabold text-[11px] uppercase tracking-wider">
                MODULE 05
              </span>
            </div>
            <h4 className="text-base font-black text-slate-900 uppercase">STUDENT REGISTRY</h4>
            <p className="text-xs text-slate-600 mt-1 mb-4">
              Nominal roll verification, guardian contact database, and student records.
            </p>
            <div className="bg-sky-50/40 p-3 rounded-2xl border border-sky-100 text-xs font-semibold text-sky-900 mb-4 flex items-center justify-between tabular-nums">
              <span>Registered Cohort:</span>
              <span className="font-mono font-bold text-sky-700">{totalStudents} Candidates</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('students')}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
          >
            <span>Explore Student Directory</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

        {/* LIVE WORKSPACE ACTIVITY FEED */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="text-base font-black text-slate-900 uppercase">WORKSPACE FEED</h4>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 tabular-nums">
                {telemetryEvents.length} Events
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Real-time audit trail of your scanned answer scripts, Excel saves, and mark statements.
            </p>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {telemetryEvents.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  No workspace activity recorded yet. Scan an answer sheet or add student marks to begin.
                </div>
              ) : (
                telemetryEvents.slice(0, 4).map((event, idx) => (
                  <div
                    key={`${event.id}-${idx}`}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-900 block truncate">{event.title}</span>
                      <span className="text-[11px] text-slate-500 leading-tight block">
                        {event.details}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Workspace Isolation</span>
            <span className="font-mono text-emerald-700 font-bold">
              {activeStaffId ? `Staff ${activeStaffId}` : 'COE Verified'}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
