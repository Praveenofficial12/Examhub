import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  GraduationCap,
  Award,
  Phone,
  Building,
  Mail,
  Edit3,
  Send,
  Calendar,
  Heart,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Printer,
  Home,
  FileText,
  BadgeAlert,
  Percent,
  Sparkles
} from 'lucide-react';
import { StudentProfile } from '../types';

interface StudentViewProfileModalProps {
  student: StudentProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (student: StudentProfile) => void;
  onSendSms: (student: StudentProfile) => void;
}

export const StudentViewProfileModal: React.FC<StudentViewProfileModalProps> = ({
  student,
  isOpen,
  onClose,
  onEdit,
  onSendSms
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'academic' | 'performance' | 'guardian' | 'mentorship'>('all');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !student) return null;

  const handleCopySummary = () => {
    const summary = `VSBEC Student Dossier:
Name: ${student.name}
Register No: ${student.registerNo}
Roll No: ${student.rollNo}
Department: ${student.department} (${student.degree})
Year/Sem/Sec: Year ${student.year}, Sem ${student.semester}, Sec ${student.section}
CGPA: ${student.cgpa.toFixed(2)} | Attendance: ${student.attendancePercentage}%
Guardian: ${student.parentName} (${student.parentPhone})
Mentor: ${student.mentorName}
Quota: ${student.admissionType}`;

    navigator.clipboard?.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCgpaClass = (cgpa: number) => {
    if (cgpa >= 8.5) return { label: 'First Class with Distinction', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
    if (cgpa >= 7.0) return { label: 'First Class', color: 'text-blue-700 bg-blue-50 border-blue-300' };
    if (cgpa >= 6.0) return { label: 'Second Class', color: 'text-amber-700 bg-amber-50 border-amber-300' };
    return { label: 'Passing Grade', color: 'text-slate-700 bg-slate-50 border-slate-300' };
  };

  const cgpaClassification = getCgpaClass(student.cgpa);
  const isAttendanceShortage = student.attendancePercentage < 75;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative my-6 max-h-[92vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#781717] to-red-900 text-white flex items-center justify-center text-xl sm:text-2xl font-black shrink-0 shadow-lg ring-2 ring-amber-400/50">
              {student.name.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {student.name}
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-black border ${
                    student.activeStatus === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : student.activeStatus === 'Detained'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {student.activeStatus || 'Active Student'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  Reg: {student.registerNo}
                </span>
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  Roll: {student.rollNo}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-[#781717] text-white font-black text-[11px]">
                  {student.department}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
                  Year {student.year} • Sem {student.semester} • Sec {student.section}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopySummary}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              title="Copy Summary"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Key Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Cumulative CGPA</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-amber-600">{student.cgpa.toFixed(2)}</span>
              <span className="text-xs font-bold text-slate-400">/ 10</span>
            </div>
            <span className="text-[10px] font-bold text-slate-600 block truncate mt-0.5">
              {cgpaClassification.label}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Attendance %</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl font-black ${isAttendanceShortage ? 'text-rose-600' : 'text-emerald-600'}`}>
                {student.attendancePercentage}%
              </span>
            </div>
            <span className={`text-[10px] font-bold block truncate mt-0.5 ${isAttendanceShortage ? 'text-rose-600' : 'text-emerald-600'}`}>
              {isAttendanceShortage ? '⚠️ Attendance Shortage' : '✓ Normal Eligibility'}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">IAT 1 & 2 Average</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black text-slate-900">{student.iat1Average || 85}%</span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-base font-black text-slate-900">{student.iat2Average || 88}%</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 block truncate mt-0.5">
              Continuous Internal Eval
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Standing Arrears</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl font-black ${student.historyOfArrears > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {student.historyOfArrears}
              </span>
            </div>
            <span className={`text-[10px] font-bold block truncate mt-0.5 ${student.historyOfArrears > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {student.historyOfArrears === 0 ? '✓ All Papers Cleared' : `${student.historyOfArrears} Arrear Papers`}
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 sm:gap-2 pb-3 border-b border-slate-200 overflow-x-auto shrink-0">
          {[
            { id: 'all', label: 'Complete Dossier (All)' },
            { id: 'academic', label: '1. Academic & Degree' },
            { id: 'performance', label: '2. Examination & Marks' },
            { id: 'guardian', label: '3. Guardian & Contacts' },
            { id: 'mentorship', label: '4. Mentor & Campus Stay' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                activeTab === tab.id
                  ? 'bg-[#781717] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 text-xs">
          {/* Section 1: Personal & Identity Details */}
          {(activeTab === 'all' || activeTab === 'academic') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-[#781717] flex items-center gap-2">
                <User className="w-4 h-4 text-[#781717]" />
                <span>Personal & University Identity</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Candidate Name</span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">{student.name}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Anna Univ Register No</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{student.registerNo}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">College Roll Number</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{student.rollNo}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Gender</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{student.gender || 'Not specified'}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Group</span>
                  <span className="font-bold text-[#781717] mt-0.5 block">{student.bloodGroup || 'O+ve'}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Admission Quota</span>
                  <span className="font-bold text-slate-900 mt-0.5 block truncate">{student.admissionType}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                  <span className="font-bold text-emerald-700 mt-0.5 block">{student.activeStatus || 'Active'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Academic Curriculum & Degree Details */}
          {(activeTab === 'all' || activeTab === 'academic') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-indigo-700 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Academic Curriculum & Degree Program</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Engineering Department</span>
                  <span className="font-black text-slate-900 mt-0.5 block">
                    {student.department} - Autonomous Division
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Degree Program</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{student.degree}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Academic Year</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">Year {student.year}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Semester</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">Semester {student.semester}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Class Section</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">Section {student.section}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Academic Batch</span>
                  <span className="font-mono font-bold text-slate-900 mt-0.5 block">{student.batch}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-[11px] text-indigo-900 font-medium">
                Autonomous Regulation: <span className="font-bold">Regulation R-2021 Autonomous (CBCS) • Anna University Affiliated</span>
              </div>
            </div>
          )}

          {/* Section 3: Performance, CGPA & Assessment Marks */}
          {(activeTab === 'all' || activeTab === 'performance') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-amber-700 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Internal Assessment & CGPA Performance</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                  <span className="text-[10px] font-black uppercase text-amber-900 block">Graduation CGPA</span>
                  <span className="text-2xl font-black text-amber-700 mt-0.5 block">{student.cgpa.toFixed(2)}</span>
                  <span className="text-[11px] font-bold text-amber-950 mt-1 block">{cgpaClassification.label}</span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <span className="text-[10px] font-black uppercase text-emerald-900 block">Semester Attendance</span>
                  <span className={`text-2xl font-black mt-0.5 block ${isAttendanceShortage ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {student.attendancePercentage}%
                  </span>
                  <span className="text-[11px] font-bold text-emerald-950 mt-1 block">
                    {student.attendancePercentage >= 75 ? 'Qualified for Exam Hall Ticket' : 'Shortage - Medical Leave Required'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Arrears History</span>
                  <span className={`text-2xl font-black mt-0.5 block ${student.historyOfArrears > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {student.historyOfArrears} Papers
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 mt-1 block">
                    {student.historyOfArrears === 0 ? 'Nil Standing Arrears' : 'Arrear Exams Scheduled'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">IAT-1 Test Score Avg</span>
                    <span className="font-black text-slate-900 text-sm mt-0.5 block">{student.iat1Average || 85}%</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 font-bold text-slate-700">Internal 1</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">IAT-2 Test Score Avg</span>
                    <span className="font-black text-slate-900 text-sm mt-0.5 block">{student.iat2Average || 88}%</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 font-bold text-slate-700">Internal 2</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Guardian, Parent Contacts & Address */}
          {(activeTab === 'all' || activeTab === 'guardian') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-rose-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-rose-600" />
                <span>Parent / Guardian & Communication Contacts</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Parent / Guardian Full Name</span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">{student.parentName}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Parent Mobile (DLT SMS Gateway)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{student.parentPhone}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Parent Email</span>
                  <span className="font-mono text-slate-800 mt-0.5 block">{student.parentEmail || 'Not provided'}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Emergency Contact</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                    {student.emergencyContact || student.parentPhone}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Residential Communication Address</span>
                <span className="text-slate-800 mt-0.5 block font-medium">
                  {student.residentialAddress || 'College Campus Hostel / Residence recorded in Anna University Registry'}
                </span>
              </div>
            </div>
          )}

          {/* Section 5: Faculty Mentorship, Hostel & Conduct Remarks */}
          {(activeTab === 'all' || activeTab === 'mentorship') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>Faculty Mentorship & Campus Stay</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Faculty Mentor</span>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">{student.mentorName}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Hostel / Accommodation Status</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{student.hostelStatus || 'Day Scholar (College Transport)'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Counseling Remarks & Mentorship Notes
                </span>
                <p className="text-slate-700 leading-relaxed font-medium text-xs">
                  {student.counselingRemarks ||
                    'Student maintains consistent academic progression and active participation in department technical symposiums, laboratory sessions, and autonomous examinations.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Close View
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onSendSms(student);
                onClose();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Send Parent SMS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(student);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#781717] hover:bg-[#601212] text-white font-black text-xs shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit All Details</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
