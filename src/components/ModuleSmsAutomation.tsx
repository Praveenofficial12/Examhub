import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquareShare,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  PhoneCall,
  Search,
  Filter,
  Copy,
  Check,
  Zap,
  Radio,
  X,
  FileText,
  User,
  Users,
  RefreshCw,
  Edit3,
  BookOpen,
  Calendar,
  Layers,
  GraduationCap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SmsTemplate, SmsLog, DepartmentCode, StudentProfile, UserSession } from '../types';
import { StudentEditModal } from './StudentEditModal';

interface ModuleSmsAutomationProps {
  templates: SmsTemplate[];
  smsLogs: SmsLog[];
  students: StudentProfile[];
  onSendBroadcast: (newLogs: SmsLog[]) => void;
  onUpdateStudent?: (updatedStudent: StudentProfile) => void;
  session?: UserSession;
}

export const ModuleSmsAutomation: React.FC<ModuleSmsAutomationProps> = ({
  templates,
  smsLogs,
  students,
  onSendBroadcast,
  onUpdateStudent,
  session
}) => {
  const isDeptUser = session && !session.isAdmin && session.department && session.department !== 'ALL';
  const activeDept = isDeptUser ? (session.department as DepartmentCode) : 'ALL';

  // 1. Academic Year, Semester & 2. Class Selection
  const [selectedYear, setSelectedYear] = useState<'I' | 'II' | 'III' | 'IV'>('III');
  const [selectedSemester, setSelectedSemester] = useState<number>(5);
  const [selectedClass, setSelectedClass] = useState<'A' | 'B' | 'C' | 'D' | 'ALL'>('A');

  // Active Template & Variables
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate>(templates[0]);
  const [selectedDept, setSelectedDept] = useState<DepartmentCode | 'ALL'>(
    isDeptUser ? (session.department as DepartmentCode) : 'ALL'
  );
  const [customVariableSession, setCustomVariableSession] = useState('Nov/Dec 2026');

  // Modals & Operations
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [logSearch, setLogSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'queued' | 'failed'>('all');

  // Student Edit State
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Single SMS confirmation modal
  const [directSmsTarget, setDirectSmsTarget] = useState<StudentProfile | null>(null);

  // Filter students by active department
  const deptStudents = students.filter((s) => {
    if (activeDept !== 'ALL' && s.department !== activeDept) return false;
    if (selectedDept !== 'ALL' && s.department !== selectedDept) return false;
    return true;
  });

  // Filter students by Selected Year and Selected Class
  const classStudents = deptStudents.filter((s) => {
    if (s.year !== selectedYear) return false;
    if (selectedClass !== 'ALL' && s.section !== selectedClass) return false;
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        s.registerNo.includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q) ||
        s.parentPhone.includes(q)
      );
    }
    return true;
  });

  // Calculate year counts
  const yearCounts = {
    I: deptStudents.filter((s) => s.year === 'I').length,
    II: deptStudents.filter((s) => s.year === 'II').length,
    III: deptStudents.filter((s) => s.year === 'III').length,
    IV: deptStudents.filter((s) => s.year === 'IV').length
  };

  // Stats
  const totalSent = smsLogs.length;
  const deliveredCount = smsLogs.filter((l) => l.status === 'delivered').length;
  const queuedCount = smsLogs.filter((l) => l.status === 'queued').length;
  const failedCount = smsLogs.filter((l) => l.status === 'failed').length;

  const handleCopyTemplate = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generate sample message for a given student & template
  const previewMessage = (template: SmsTemplate, student?: StudentProfile) => {
    const s = student || classStudents[0] || deptStudents[0] || students[0];
    if (!s) return template.messageFormat;
    let msg = template.messageFormat;
    msg = msg.replace(/\{Student_Name\}/g, s.name);
    msg = msg.replace(/\{Roll_No\}/g, s.registerNo);
    msg = msg.replace(/\{Department\}/g, s.department);
    msg = msg.replace(/\{Percentage\}/g, s.cgpa.toString());
    msg = msg.replace(/\{Grade\}/g, s.cgpa >= 9.0 ? 'O (Distinction)' : 'A+ (First Class)');
    msg = msg.replace(/\{Exam_Session\}/g, customVariableSession);
    return msg;
  };

  // Broadcast to selected Year & Class
  const handleExecuteBroadcast = () => {
    setIsSending(true);

    const targetStudents = classStudents.length > 0 ? classStudents : deptStudents;

    setTimeout(() => {
      const newLogs: SmsLog[] = targetStudents.map((st, idx) => ({
        id: `SMS-${Date.now().toString().slice(-4)}-${idx}`,
        templateTitle: selectedTemplate.title,
        studentName: st.name,
        registerNo: st.registerNo,
        parentPhone: st.parentPhone,
        parentName: st.parentName,
        department: st.department,
        messageBody: previewMessage(selectedTemplate, st),
        sentAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        status: 'delivered',
        dltMsgId: `DLT-MSG-${Math.floor(889000 + Math.random() * 9000)}`,
        latencyMs: Math.floor(220 + Math.random() * 180)
      }));

      onSendBroadcast(newLogs);
      setIsSending(false);
      setIsBroadcastModalOpen(false);

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.5 }
      });
    }, 1200);
  };

  // Direct 1-to-1 SMS
  const handleSendSingleSms = () => {
    if (!directSmsTarget) return;

    const singleLog: SmsLog = {
      id: `SMS-${Date.now().toString().slice(-4)}`,
      templateTitle: selectedTemplate.title,
      studentName: directSmsTarget.name,
      registerNo: directSmsTarget.registerNo,
      parentPhone: directSmsTarget.parentPhone,
      parentName: directSmsTarget.parentName,
      department: directSmsTarget.department,
      messageBody: previewMessage(selectedTemplate, directSmsTarget),
      sentAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      status: 'delivered',
      dltMsgId: `DLT-MSG-${Math.floor(889000 + Math.random() * 9000)}`,
      latencyMs: Math.floor(210 + Math.random() * 150)
    };

    onSendBroadcast([singleLog]);
    setDirectSmsTarget(null);
    confetti({ particleCount: 30, spread: 50 });
  };

  // Filtered Logs
  const filteredLogs = smsLogs.filter((log) => {
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const query = logSearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      log.studentName.toLowerCase().includes(query) ||
      log.registerNo.includes(query) ||
      log.parentPhone.includes(query) ||
      log.templateTitle.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-950 border border-emerald-700/50 text-emerald-400">
              <MessageSquareShare className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Parent SMS Automation & DLT Gateway Portal
            </h1>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Select Academic Year & Class to view students, update parent contacts, and broadcast official Anna University Autonomous SMS alerts
          </p>
        </div>

        {/* Global DLT Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs whitespace-nowrap">
            <Radio className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>TRAI DLT Pipeline Active (Header: VSBEXM)</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          ACADEMIC SELECTION DROPDOWNS: YEAR, SEMESTER & CLASS
         ======================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs font-black flex items-center justify-center shrink-0">
              ✓
            </span>
            <div>
              <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide block">
                SMS Automation Recipient Filters (AI&DS Dept)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Select Year, Semester, and Class Section from the dropdowns below to target student parent alerts
              </span>
            </div>
          </div>

          <span className="text-xs font-bold text-emerald-800 font-mono shrink-0">
            Selected Year: Year {selectedYear} • Sem 0{selectedSemester} • Class {selectedClass === 'ALL' ? 'All Classes' : `Sec ${selectedClass}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Year Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
              Academic Year Dropdown
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                const yr = e.target.value as 'I' | 'II' | 'III' | 'IV';
                setSelectedYear(yr);
                if (yr === 'I') setSelectedSemester(1);
                else if (yr === 'II') setSelectedSemester(3);
                else if (yr === 'III') setSelectedSemester(5);
                else if (yr === 'IV') setSelectedSemester(7);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
            >
              <option value="I">Year I (Sem 1 & 2 • {yearCounts.I} Parents)</option>
              <option value="II">Year II (Sem 3 & 4 • {yearCounts.II} Parents)</option>
              <option value="III">Year III (Sem 5 & 6 • {yearCounts.III} Parents)</option>
              <option value="IV">Year IV (Sem 7 & 8 • {yearCounts.IV} Parents)</option>
            </select>
          </div>

          {/* Semester Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              Curricular Semester Dropdown
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                const sem = Number(e.target.value);
                setSelectedSemester(sem);
                if (sem === 1 || sem === 2) setSelectedYear('I');
                else if (sem === 3 || sem === 4) setSelectedYear('II');
                else if (sem === 5 || sem === 6) setSelectedYear('III');
                else if (sem === 7 || sem === 8) setSelectedYear('IV');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 text-xs font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
            >
              <option value={1}>Semester 01 (Year I • Python & Math)</option>
              <option value={2}>Semester 02 (Year I • DSA & Graphics)</option>
              <option value={3}>Semester 03 (Year II • DAA & DBMS)</option>
              <option value={4}>Semester 04 (Year II • Machine Learning)</option>
              <option value={5}>Semester 05 (Year III • Deep Learning)</option>
              <option value={6}>Semester 06 (Year III • NLP & GenAI)</option>
              <option value={7}>Semester 07 (Year IV • Computer Vision)</option>
              <option value={8}>Semester 08 (Year IV • Capstone Project)</option>
            </select>
          </div>

          {/* Class / Section Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-700" />
              Class / Section Dropdown
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
            >
              <option value="ALL">All Classes in Year {selectedYear}</option>
              <option value="A">Section A (Class A)</option>
              <option value="B">Section B (Class B)</option>
              <option value="C">Section C (Class C)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================
          STUDENTS ACCESS ROSTER & CLASS SMS BROADCAST
         ======================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Banner with Broadcast CTA */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-b border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                Active Cohort Directory
              </span>
              <span className="text-xs font-bold text-slate-600 font-mono">
                Year {selectedYear} • Class {selectedClass}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
              Class Students ({classStudents.length} Candidates Enrolled)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Review guardian phone numbers, update details, or broadcast official SMS alerts to all parents of this class
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Direct Broadcast to this Class */}
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              disabled={classStudents.length === 0}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-950/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast SMS to Class {selectedClass} ({classStudents.length})</span>
            </button>
          </div>
        </div>

        {/* Search within class */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search candidate name, reg no, parent name, or mobile..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            Showing {classStudents.length} Candidates
          </span>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 uppercase tracking-wider font-mono text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Register & Roll No</th>
                <th className="py-3 px-4">Student Candidate</th>
                <th className="py-3 px-4">Parent / Guardian Contact</th>
                <th className="py-3 px-4">Academic Status</th>
                <th className="py-3 px-4">Last SMS Log</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {classStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No students enrolled in Year {selectedYear} - Class {selectedClass}.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Select a different year or section from the buttons above.</p>
                  </td>
                </tr>
              ) : (
                classStudents.map((st) => {
                  const lastLog = smsLogs.find((l) => l.registerNo === st.registerNo);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      {/* Register & Roll */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {st.registerNo}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {st.rollNo}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{st.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {st.department} • Year {st.year}-Sec {st.section}
                        </div>
                      </td>

                      {/* Guardian Contact */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{st.parentName}</div>
                        <a
                          href={`tel:${st.parentPhone.replace(/\s+/g, '')}`}
                          className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <PhoneCall className="w-3 h-3 text-emerald-600" />
                          <span>{st.parentPhone}</span>
                        </a>
                      </td>

                      {/* Academic Status */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-indigo-700 font-mono font-bold">
                            CGPA {st.cgpa.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-slate-600 font-semibold text-[11px]">
                            Attd: {st.attendancePercentage}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          IAT Avg: {st.iat1Average.toFixed(1)} / 100
                        </div>
                      </td>

                      {/* Last SMS */}
                      <td className="py-3 px-4">
                        {lastLog ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Delivered</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              {lastLog.sentAt.split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No alerts yet</span>
                        )}
                      </td>

                      {/* Actions: Update Details & Direct SMS */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Update Student Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStudent(st);
                              setIsEditModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-all text-[11px] cursor-pointer"
                            title="Update Student & Guardian Phone"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Update Details</span>
                          </button>

                          {/* Direct SMS to this Parent */}
                          <button
                            type="button"
                            onClick={() => setDirectSmsTarget(st)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-all text-[11px] cursor-pointer"
                            title="Send Tailored SMS to Guardian"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send SMS</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          TEMPLATES & LIVE PREVIEW GRID
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates Selector */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Registered TRAI DLT Templates
          </h2>
          <div className="space-y-2">
            {templates.map((tpl) => {
              const isSelected = selectedTemplate.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950 text-white border-emerald-500 shadow-md ring-1 ring-emerald-500'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-extrabold text-sm">{tpl.title}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tpl.category}
                    </span>
                  </div>
                  <p className={`text-[11px] line-clamp-2 ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                    {tpl.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Message Preview for Class */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Live Dynamic Message Generator
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    DLT ID: {selectedTemplate.dltTemplateId}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleCopyTemplate(previewMessage(selectedTemplate), selectedTemplate.id)}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                {copiedId === selectedTemplate.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === selectedTemplate.id ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>

            {/* Rendered Preview Phone Bubble */}
            <div className="p-4 rounded-2xl bg-slate-950 text-white font-mono text-xs leading-relaxed border border-slate-800 mb-4 shadow-inner relative">
              <div className="text-[10px] text-emerald-400 font-bold mb-2 flex items-center justify-between">
                <span>VSBEXM (Autonomous COE Gateway)</span>
                <span>Just Now</span>
              </div>
              <p className="text-slate-200 whitespace-pre-wrap">
                {previewMessage(selectedTemplate, classStudents[0])}
              </p>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-slate-700">Dynamic Merging:</span>
              <span>Values populated from Year {selectedYear} Class {selectedClass} candidates.</span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Targeting <strong className="text-slate-900">{classStudents.length} verified parent phones</strong>
            </span>
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              disabled={classStudents.length === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Launch Class Broadcast</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          TRANSMISSION AUDIT LOGS
         ======================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Parent SMS Transmission Audit Trail
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live delivery acknowledgments, operator latencies, and DLT verification IDs
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search SMS logs..."
                className="bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider font-mono text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Message ID & DLT</th>
                <th className="py-3 px-4">Student & Roll No</th>
                <th className="py-3 px-4">Parent Phone</th>
                <th className="py-3 px-4">Template Title</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    No SMS broadcasts recorded in this staff workspace yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block">{log.id}</span>
                      <span className="font-mono text-[10px] text-slate-400">{log.dltMsgId}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{log.studentName}</span>
                      <span className="font-mono text-slate-500">{log.registerNo}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-slate-800 tabular-nums">{log.parentPhone}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700 font-medium">{log.templateTitle}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{log.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500 text-[11px] tabular-nums">
                      {log.sentAt}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL: EDIT STUDENT DETAILS (PHONE, NAME, ATTD)
         ======================================================== */}
      {isEditModalOpen && editingStudent && (
        <StudentEditModal
          student={editingStudent}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingStudent(null);
          }}
          onSave={(updated) => {
            if (onUpdateStudent) {
              onUpdateStudent(updated);
            }
            setIsEditModalOpen(false);
            setEditingStudent(null);
            confetti({ particleCount: 30, spread: 45 });
          }}
        />
      )}

      {/* ========================================================
          MODAL: SINGLE DIRECT SMS CONFIRMATION
         ======================================================== */}
      <AnimatePresence>
        {directSmsTarget && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Send Instant Parent SMS Alert
                    </h3>
                    <p className="text-[11px] text-slate-500">TRAI DLT Verified Gateway</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDirectSmsTarget(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div className="font-bold text-slate-900">Candidate: {directSmsTarget.name}</div>
                  <div className="text-slate-500 font-mono mt-0.5">
                    Parent: {directSmsTarget.parentName} • Mobile: <strong className="text-emerald-700">{directSmsTarget.parentPhone}</strong>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl text-slate-200 font-mono text-xs border border-slate-800">
                  {previewMessage(selectedTemplate, directSmsTarget)}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDirectSmsTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendSingleSms}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit SMS Now</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL: CLASS-WIDE BROADCAST CONFIRMATION
         ======================================================== */}
      <AnimatePresence>
        {isBroadcastModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Confirm Class Broadcast: Year {selectedYear} - Class {selectedClass}
                    </h3>
                    <p className="text-[11px] text-slate-500">Autonomous COE Bulk Dispatch</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 mb-6 text-xs">
                <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-emerald-950">
                  <span className="font-bold block">Broadcast Target Summary:</span>
                  <div className="mt-1 flex items-center gap-4 text-[11px]">
                    <span>Cohort: <strong>Year {selectedYear} (Class {selectedClass})</strong></span>
                    <span>Recipients: <strong>{classStudents.length} Parents</strong></span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-600 font-semibold block mb-1">
                    Active Template: {selectedTemplate.title}
                  </span>
                  <div className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px]">
                    {previewMessage(selectedTemplate, classStudents[0])}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  disabled={isSending}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBroadcast}
                  disabled={isSending}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Transmitting Alerts...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Execute Class Broadcast ({classStudents.length})</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
