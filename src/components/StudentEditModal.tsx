import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Edit3,
  User,
  GraduationCap,
  Award,
  Phone,
  Building,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudentProfile, DepartmentCode } from '../types';

interface StudentEditModalProps {
  student: StudentProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStudent: StudentProfile) => void;
}

const DEPT_OPTIONS: { code: DepartmentCode; name: string }[] = [
  { code: 'AI&DS', name: 'Artificial Intelligence & Data Science' },
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'ECE', name: 'Electronics & Communication Engineering' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
  { code: 'CSE(AIML)', name: 'CSE (AI & Machine Learning)' },
  { code: 'CSBS', name: 'Computer Science & Business Systems' },
  { code: 'CCE', name: 'Computer & Communication Engineering' },
  { code: 'BME', name: 'Biomedical Engineering' },
  { code: 'BIOTECH', name: 'Biotechnology' },
  { code: 'CHEM', name: 'Chemical Engineering' }
];

export const StudentEditModal: React.FC<StudentEditModalProps> = ({
  student,
  isOpen,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'academic' | 'performance' | 'guardian' | 'mentorship'>('basic');
  const [formData, setFormData] = useState<StudentProfile | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({ ...student });
      setSavedSuccess(false);
    }
  }, [student]);

  if (!isOpen || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.registerNo.trim()) return;

    onSave(formData);
    setSavedSuccess(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    setTimeout(() => {
      onClose();
      setSavedSuccess(false);
    }, 900);
  };

  const handleDeptChange = (dept: DepartmentCode) => {
    const isTech = ['AI&DS', 'IT', 'CSBS', 'BIOTECH', 'CHEM'].includes(dept);
    setFormData({
      ...formData,
      department: dept,
      degree: isTech ? `B.Tech ${dept}` : `B.E. ${dept}`
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative my-6 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#781717]/10 text-[#781717]">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Edit Student Details • {formData.name}
              </h3>
              <p className="text-xs font-mono font-bold text-slate-500">
                Reg: {formData.registerNo} | Roll: {formData.rollNo} | {formData.department}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 pt-3 pb-3 border-b border-slate-100 overflow-x-auto shrink-0">
          {[
            { id: 'basic', label: '1. Basic Info', icon: User },
            { id: 'academic', label: '2. Academic / Year', icon: GraduationCap },
            { id: 'performance', label: '3. Marks & CGPA', icon: Award },
            { id: 'guardian', label: '4. Guardian / Contact', icon: Phone },
            { id: 'mentorship', label: '5. Mentor & Hostel', icon: Building }
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-[#781717] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#781717]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Anna University Register Number (12 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.registerNo}
                    onChange={(e) => setFormData({ ...formData, registerNo: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#781717]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    College Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.rollNo}
                    onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender || 'Male'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  >
                    {['O+ve', 'A+ve', 'B+ve', 'AB+ve', 'O-ve', 'A-ve', 'B-ve', 'AB-ve'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Admission Quota
                  </label>
                  <select
                    value={formData.admissionType}
                    onChange={(e) => setFormData({ ...formData, admissionType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  >
                    <option value="TNEA Government Quota">TNEA Government Quota (Single Window)</option>
                    <option value="Management Quota">Management Quota (Merit)</option>
                    <option value="Lateral Entry">Lateral Entry (Direct 2nd Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Enrollment Status
                  </label>
                  <select
                    value={formData.activeStatus}
                    onChange={(e) => setFormData({ ...formData, activeStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  >
                    <option value="Active">Active Student</option>
                    <option value="Detained">Detained (Attendance/Academic)</option>
                    <option value="Graduated">Graduated / Alumni</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleDeptChange(e.target.value as DepartmentCode)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-[#781717]"
                  >
                    {DEPT_OPTIONS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Degree Title
                  </label>
                  <input
                    type="text"
                    value={formData.degree}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  >
                    <option value="I">Year I</option>
                    <option value="II">Year II</option>
                    <option value="III">Year III</option>
                    <option value="IV">Year IV</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Semester (1 - 8)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Section (A - F)
                  </label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F'].map((s) => (
                      <option key={s} value={s}>Section {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Batch Period
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2023 - 2027"
                  value={formData.batch}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    CGPA (0 - 10)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={10}
                    value={formData.cgpa}
                    onChange={(e) => setFormData({ ...formData, cgpa: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-black text-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Attendance %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.attendancePercentage}
                    onChange={(e) => setFormData({ ...formData, attendancePercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-black text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    IAT-1 Avg %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.iat1Average}
                    onChange={(e) => setFormData({ ...formData, iat1Average: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    IAT-2 Avg %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.iat2Average}
                    onChange={(e) => setFormData({ ...formData, iat2Average: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  History of Standing Arrears Count
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.historyOfArrears}
                  onChange={(e) => setFormData({ ...formData, historyOfArrears: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-rose-600"
                />
              </div>
            </div>
          )}

          {activeTab === 'guardian' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Parent / Guardian Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Parent Phone (SMS Gateway)
                  </label>
                  <input
                    type="text"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Parent Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Emergency Contact Number
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContact || ''}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="+91 94430 00000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Residential Communication Address
                </label>
                <textarea
                  rows={2}
                  value={formData.residentialAddress || ''}
                  onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                  placeholder="Street, Town, District, Pincode"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                />
              </div>
            </div>
          )}

          {activeTab === 'mentorship' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Assigned Faculty Mentor
                  </label>
                  <input
                    type="text"
                    value={formData.mentorName}
                    onChange={(e) => setFormData({ ...formData, mentorName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Accommodation Status
                  </label>
                  <select
                    value={formData.hostelStatus || 'Day Scholar'}
                    onChange={(e) => setFormData({ ...formData, hostelStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  >
                    <option value="Day Scholar">Day Scholar (College Bus / Private)</option>
                    <option value="College Hostel">VSB College Campus Hostel</option>
                    <option value="Self Stay">Private Stay / PG</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Counseling Remarks / Disciplinary Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.counselingRemarks || ''}
                  onChange={(e) => setFormData({ ...formData, counselingRemarks: e.target.value })}
                  placeholder="Special academic guidance notes, participation, achievements..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
          <div>
            {savedSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All changes saved successfully!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#781717] hover:bg-[#601212] text-white font-black text-xs shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Student Record</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
