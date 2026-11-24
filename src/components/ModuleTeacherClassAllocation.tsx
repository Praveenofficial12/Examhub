import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserPlus,
  BookOpen,
  Calendar,
  Layers,
  Search,
  Filter,
  Trash2,
  Edit,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  Building2,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  FileText,
  Copy,
  Plus,
  Lock,
  Unlock,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import {
  TeacherAllocation,
  DepartmentCode,
  UserSession,
  TestWindowConfig,
  TestCategory
} from '../types';
import { INITIAL_DEPARTMENT_CUSTOMIZATIONS } from '../data/mockData';
import { DEPARTMENT_SUBJECTS } from '../data/departmentSubjectsData';

interface ModuleTeacherClassAllocationProps {
  allocations: TeacherAllocation[];
  onAddAllocation: (allocation: TeacherAllocation) => void;
  onUpdateAllocation: (allocation: TeacherAllocation) => void;
  onDeleteAllocation: (id: string) => void;
  session: UserSession;
  testWindows?: TestWindowConfig[];
  onUpdateTestWindows?: (windows: TestWindowConfig[]) => void;
  onNavigateToUploadMarks?: () => void;
}

const ALL_DEPTS: DepartmentCode[] = [
  'AI&DS'
];

const SAMPLE_SUBJECTS_BY_DEPT: Record<string, { code: string; name: string; sem: number }[]> = {
  'AI&DS': [
    { code: 'AD3251', name: 'Data Structures and Algorithms', sem: 2 },
    { code: 'AD3351', name: 'Design and Analysis of Algorithms', sem: 3 },
    { code: 'AD3391', name: 'Database Design and Management', sem: 3 },
    { code: 'AD3491', name: 'Fundamentals of Machine Learning', sem: 4 },
    { code: 'CS3491', name: 'Artificial Intelligence and Expert Systems', sem: 4 },
    { code: 'AD3501', name: 'Deep Neural Networks & Architectures', sem: 5 },
    { code: 'AD3511', name: 'Big Data Analytics & Cloud MLOps', sem: 5 },
    { code: 'CS3591', name: 'Computer Networks and Protocols', sem: 5 },
    { code: 'AD3601', name: 'Natural Language Processing & Transformers', sem: 6 },
    { code: 'AD3611', name: 'Reinforcement Learning & Generative AI', sem: 6 },
    { code: 'AD3701', name: 'Computer Vision & Real-time Perception', sem: 7 },
    { code: 'AD3751', name: 'MLOps and Model Deployment in Cloud', sem: 7 },
    { code: 'AD3811', name: 'Autonomous Capstone Project & Internship', sem: 8 },
    { code: 'AD3851', name: 'Professional Ethics and AI Safety', sem: 8 }
  ]
};

export const ModuleTeacherClassAllocation: React.FC<ModuleTeacherClassAllocationProps> = ({
  allocations,
  onAddAllocation,
  onUpdateAllocation,
  onDeleteAllocation,
  session,
  testWindows = [],
  onUpdateTestWindows,
  onNavigateToUploadMarks
}) => {
  const isAdmin = session.isAdmin || session.department === 'ALL';
  const lockedDept = !isAdmin ? (session.department as DepartmentCode) : null;

  // Active sub-tab: Allocations vs Test Windows
  const [activeAdminTab, setActiveAdminTab] = useState<'allocations' | 'test-windows'>('allocations');

  // Filters
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(lockedDept || 'AI&DS');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<number | 'ALL'>('ALL');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Allocation Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<TeacherAllocation | null>(null);

  // Test Window Modal State (Admin Add/Edit Test Windows)
  const [testWindowModalOpen, setTestWindowModalOpen] = useState(false);
  const [editingTestWindow, setEditingTestWindow] = useState<TestWindowConfig | null>(null);
  const [testWindowFormData, setTestWindowFormData] = useState<Partial<TestWindowConfig>>({
    testName: 'Continuous Internal Assessment 1 (CIA 1)',
    testCategory: 'Continuous Internal Assessment (CIA)',
    academicYear: '2025-2026',
    semester: 5,
    year: 'III',
    section: 'ALL',
    department: 'AI&DS',
    isOpen: true,
    startDate: '2025-08-15',
    deadline: '2025-08-30',
    maxMarks: 50,
    openedBy: 'COE Autonomous Administration'
  });

  // Form State for Allocations
  const [formData, setFormData] = useState<Partial<TeacherAllocation>>({
    teacherName: '',
    teacherId: '',
    designation: 'Assistant Professor',
    department: lockedDept || 'AI&DS',
    classYear: 'III',
    semester: 5,
    section: 'A',
    subjectCode: 'AD3501',
    subjectName: 'Deep Neural Networks & Architectures',
    role: 'Course Instructor',
    academicYear: '2025-2026',
    weeklyHours: 4,
    roomNo: 'MB-201',
    phone: '',
    email: ''
  });

  // Filtered Allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((alloc) => {
      // If not admin, strictly locked to department
      if (lockedDept && alloc.department !== lockedDept) return false;

      // Filter by department if admin
      if (selectedDeptFilter !== 'ALL' && alloc.department !== selectedDeptFilter) return false;

      // Filter by Year
      if (selectedYearFilter !== 'ALL' && alloc.classYear !== selectedYearFilter) return false;

      // Filter by Semester
      if (selectedSemesterFilter !== 'ALL' && alloc.semester !== Number(selectedSemesterFilter)) return false;

      // Filter by Section
      if (selectedSectionFilter !== 'ALL' && alloc.section !== selectedSectionFilter) return false;

      // Filter by Role
      if (selectedRoleFilter !== 'ALL' && alloc.role !== selectedRoleFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = alloc.teacherName.toLowerCase().includes(q);
        const matchSubCode = alloc.subjectCode.toLowerCase().includes(q);
        const matchSubName = alloc.subjectName.toLowerCase().includes(q);
        const matchDept = alloc.department.toLowerCase().includes(q);
        return matchName || matchSubCode || matchSubName || matchDept;
      }

      return true;
    });
  }, [allocations, lockedDept, selectedDeptFilter, selectedYearFilter, selectedSemesterFilter, selectedSectionFilter, selectedRoleFilter, searchQuery]);

  // Handle Open Create Modal
  const handleOpenCreate = () => {
    setEditingAllocation(null);
    setFormData({
      teacherName: '',
      teacherId: `FAC-AIDS-${Math.floor(100 + Math.random() * 900)}`,
      designation: 'Assistant Professor',
      department: (lockedDept || 'AI&DS') as DepartmentCode,
      classYear: 'III',
      semester: 5,
      section: 'A',
      subjectCode: 'AD3501',
      subjectName: 'Deep Neural Networks & Architectures',
      role: 'Course Instructor',
      academicYear: '2025-2026',
      weeklyHours: 4,
      roomNo: 'MB-201',
      phone: '+91 94430 11000',
      email: `faculty.aids@vsbec.ac.in`
    });
    setModalOpen(true);
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (alloc: TeacherAllocation) => {
    setEditingAllocation(alloc);
    setFormData({ ...alloc });
    setModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacherName || !formData.subjectCode || !formData.subjectName) {
      alert('Please fill all required allocation fields.');
      return;
    }

    if (editingAllocation) {
      const updated: TeacherAllocation = {
        ...editingAllocation,
        ...(formData as TeacherAllocation)
      };
      onUpdateAllocation(updated);
    } else {
      const newAlloc: TeacherAllocation = {
        id: `ALLOC-${formData.department}-${Date.now().toString().slice(-4)}`,
        teacherId: formData.teacherId || `FAC-${Math.floor(100 + Math.random() * 900)}`,
        teacherName: formData.teacherName || 'Faculty Member',
        designation: formData.designation || 'Assistant Professor',
        department: (lockedDept || formData.department || 'CSE') as DepartmentCode,
        classYear: formData.classYear || 'III',
        semester: Number(formData.semester) || 5,
        section: formData.section || 'A',
        subjectCode: formData.subjectCode || 'SUB101',
        subjectName: formData.subjectName || 'Engineering Subject',
        role: formData.role || 'Course Instructor',
        academicYear: formData.academicYear || '2025-2026',
        allocatedAt: new Date().toISOString().split('T')[0],
        allocatedBy: session.fullName,
        phone: formData.phone,
        email: formData.email,
        roomNo: formData.roomNo,
        weeklyHours: formData.weeklyHours || 4
      };
      onAddAllocation(newAlloc);
    }
    setModalOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Allocation ID', 'Teacher Name', 'Teacher ID', 'Designation', 'Department', 'Class Year', 'Semester', 'Section', 'Subject Code', 'Subject Name', 'Academic Role', 'Weekly Hours', 'Allocated By'];
    const rows = filteredAllocations.map((a) => [
      a.id,
      `"${a.teacherName}"`,
      a.teacherId,
      `"${a.designation}"`,
      a.department,
      a.classYear,
      a.semester,
      a.section,
      a.subjectCode,
      `"${a.subjectName}"`,
      `"${a.role}"`,
      a.weeklyHours || 4,
      `"${a.allocatedBy}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VSBEC_Teacher_Class_Allocation_${selectedDeptFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-50 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[#781717] text-xs font-bold mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>COE ACADEMIC REGISTRY • AUTONOMOUS ROSTER</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Teacher to Class Allocation Matrix
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              {isAdmin
                ? 'Central COE Administration: Allocate teachers to departments, class years (I to IV), sections (A-D), and curricular subjects across all 13 Autonomous engineering departments.'
                : `Department of ${lockedDept}: Exclusive faculty teaching assignments, subject mapping, and class advisor allocations.`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#781717] hover:bg-[#8e1d1d] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-amber-300" />
              <span>Allocate Teacher to Class</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Allocations</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900">{allocations.length}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Faculty Assigned</span>
            <span className="text-xl sm:text-2xl font-black text-[#781717]">
              {new Set(allocations.map((a) => a.teacherName)).size}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Department Scope</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              AI&DS (Autonomous)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Filtered View</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600">{filteredAllocations.length}</span>
          </div>
        </div>
      </div>

      {/* Curricular Semester Filter Console directly under Banner */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#781717] text-white flex items-center justify-center font-black text-xs shadow-xs">
            SEM
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
              Curricular Semester Filter (AI&DS Allocations)
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Filter teacher course assignments and examination windows by semester
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="alloc-sem-select" className="text-xs font-bold text-slate-700 shrink-0">
            Semester:
          </label>
          <select
            id="alloc-sem-select"
            value={selectedSemesterFilter}
            onChange={(e) => setSelectedSemesterFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl border border-[#781717]/40 bg-red-50/50 text-xs font-black text-[#781717] focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
          >
            <option value="ALL">All Semesters (Sem 1 to 8)</option>
            <option value={1}>Semester 01 (Year I • Python & Math)</option>
            <option value={2}>Semester 02 (Year I • DSA & Graphics)</option>
            <option value={3}>Semester 03 (Year II • DAA & DBMS)</option>
            <option value={4}>Semester 04 (Year II • Machine Learning)</option>
            <option value={5}>Semester 05 (Year III • Deep Neural Networks)</option>
            <option value={6}>Semester 06 (Year III • NLP & GenAI)</option>
            <option value={7}>Semester 07 (Year IV • Computer Vision)</option>
            <option value={8}>Semester 08 (Year IV • Capstone Project)</option>
          </select>
        </div>
      </div>

      {/* Sub-Navigation Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl">
          <button
            onClick={() => setActiveAdminTab('allocations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeAdminTab === 'allocations'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Teacher Allocations ({allocations.length})
          </button>
          <button
            onClick={() => setActiveAdminTab('test-windows')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeAdminTab === 'test-windows'
                ? 'bg-[#781717] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-amber-300" />
            <span>Exam Windows & Mark Upload Portals</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
              {testWindows.filter((t) => t.isOpen).length} Open
            </span>
          </button>
        </div>

        {activeAdminTab === 'test-windows' && onNavigateToUploadMarks && (
          <button
            onClick={onNavigateToUploadMarks}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Open Upload Marks Screen</span>
          </button>
        )}
      </div>

      {/* View 2: Test Windows & Marks Upload Portals Manager */}
      {activeAdminTab === 'test-windows' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                COE Examination Window Scheduler & Mark Entry Portals
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authoritative control: Open or close test portals to enable or lock faculty marks uploading across all classes.
              </p>
            </div>
            {onUpdateTestWindows && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setEditingTestWindow(null);
                    setTestWindowFormData({
                      testName: `Continuous Internal Assessment ${testWindows.length + 1} (CIA ${testWindows.length + 1})`,
                      testCategory: 'Continuous Internal Assessment (CIA)',
                      academicYear: '2025-2026',
                      semester: selectedSemesterFilter !== 'ALL' ? Number(selectedSemesterFilter) : 5,
                      year: 'III',
                      section: 'ALL',
                      department: 'AI&DS',
                      isOpen: true,
                      startDate: new Date().toISOString().slice(0, 10),
                      deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
                      maxMarks: 50,
                      openedBy: session.fullName
                    });
                    setTestWindowModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#781717] hover:bg-[#5a1111] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-300" />
                  <span>Add Test Window</span>
                </button>
                <button
                  onClick={() => {
                    const allOpen = testWindows.map((tw) => ({ ...tw, isOpen: true }));
                    onUpdateTestWindows(allOpen);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Open All Tests
                </button>
                <button
                  onClick={() => {
                    const allClosed = testWindows.map((tw) => ({ ...tw, isOpen: false }));
                    onUpdateTestWindows(allClosed);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Lock All Tests
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testWindows.map((tw) => (
              <div
                key={tw.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                  tw.isOpen
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                        tw.isOpen
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {tw.isOpen ? '● PORTAL OPEN' : '🔒 LOCKED BY COE'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      Max {tw.maxMarks} Marks
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-900 leading-tight">
                      {tw.testName}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {tw.description || 'Autonomous curriculum evaluation window.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 space-y-1">
                    <div>
                      Deadline: <strong>{tw.deadline}</strong>
                    </div>
                    <div>
                      Target: <strong>All Years & Classes (CBCS)</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  {onUpdateTestWindows && (
                    <button
                      onClick={() => {
                        const updated = testWindows.map((t) =>
                          t.id === tw.id ? { ...t, isOpen: !t.isOpen } : t
                        );
                        onUpdateTestWindows(updated);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        tw.isOpen
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {tw.isOpen ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Lock Portal</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Open Portal</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Edit Test Window Button */}
                  <button
                    onClick={() => {
                      setEditingTestWindow(tw);
                      setTestWindowFormData({ ...tw });
                      setTestWindowModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                    title="Edit test window details"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-700" />
                    <span>Edit</span>
                  </button>

                  {onNavigateToUploadMarks && (
                    <button
                      onClick={onNavigateToUploadMarks}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#781717] hover:underline cursor-pointer"
                    >
                      <span>Upload Marks</span>
                      <Upload className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 1: Faculty Class Allocations */}
      {activeAdminTab === 'allocations' && (
        <>
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Department Filter (Visible for Admin, Locked for Dept user) */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="AI&DS">AI&DS (Artificial Intelligence & Data Science)</option>
              </select>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-[#781717] text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Dept: {lockedDept} (Locked)</span>
            </div>
          )}

          {/* Curricular Semester Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedSemesterFilter}
              onChange={(e) => setSelectedSemesterFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Semesters</option>
              <option value={1}>Sem 01</option>
              <option value={2}>Sem 02</option>
              <option value={3}>Sem 03</option>
              <option value={4}>Sem 04</option>
              <option value={5}>Sem 05</option>
              <option value={6}>Sem 06</option>
              <option value={7}>Sem 07</option>
              <option value={8}>Sem 08</option>
            </select>
          </div>

          {/* Class Year Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Years</option>
              <option value="I">Year I</option>
              <option value="II">Year II</option>
              <option value="III">Year III</option>
              <option value="IV">Year IV</option>
            </select>
          </div>

          {/* Section Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="Course Instructor">Course Instructor</option>
              <option value="Lab In-charge">Lab In-charge</option>
              <option value="Class Advisor / Mentor">Class Advisor / Mentor</option>
              <option value="Chief Question Setter">Chief Question Setter</option>
              <option value="Valuation Examiner">Valuation Examiner</option>
            </select>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teacher or subject..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#781717]"
          />
        </div>
      </div>

      {/* Allocations Table View */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Faculty Member</th>
                <th className="py-3.5 px-4">Dept</th>
                <th className="py-3.5 px-4">Class & Section</th>
                <th className="py-3.5 px-4">Subject Assigned</th>
                <th className="py-3.5 px-4">Academic Role</th>
                <th className="py-3.5 px-4">Hours</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                    <p className="font-bold">No allocations matching criteria.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Click "Allocate Teacher to Class" to create an assignment.</p>
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Faculty Name & ID */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{alloc.teacherName}</div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{alloc.teacherId}</span>
                        <span>•</span>
                        <span>{alloc.designation}</span>
                      </div>
                    </td>

                    {/* Department Badge */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-[#781717] font-black text-[11px]">
                        {alloc.department}
                      </span>
                    </td>

                    {/* Class Year, Sem, Section */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">
                        Year {alloc.classYear} — Sec {alloc.section}
                      </div>
                      <div className="text-[10px] text-slate-500">Semester {alloc.semester}</div>
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-[#781717]">{alloc.subjectCode}</div>
                      <div className="text-slate-700 truncate max-w-xs">{alloc.subjectName}</div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          alloc.role === 'Course Instructor'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : alloc.role === 'Lab In-charge'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : alloc.role === 'Class Advisor / Mentor'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : alloc.role === 'Chief Question Setter'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {alloc.role}
                      </span>
                    </td>

                    {/* Weekly Hours */}
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {alloc.weeklyHours || 4} hrs/wk
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(alloc)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Edit Allocation"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteAllocation(alloc.id)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                          title="Delete Allocation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Allocation Modal (Add / Edit) */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="bg-[#781717] px-6 py-4.5 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    {editingAllocation ? 'Modify Faculty Class Assignment' : 'Allocate Teacher to Class'}
                  </h3>
                  <p className="text-xs text-rose-200 mt-0.5">
                    Office of the Controller of Examinations • Official Autonomous Deployment
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* 1. Teacher Information */}
                <div className="space-y-3">
                  <div className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                    1. Faculty & Designation
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Teacher Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.teacherName || ''}
                        onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                        placeholder="Enter faculty full name"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Designation
                      </label>
                      <select
                        value={formData.designation || 'Assistant Professor'}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      >
                        <option value="Professor & HOD">Professor & HOD</option>
                        <option value="Professor">Professor</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Assistant Professor (Sr.G)">Assistant Professor (Sr.G)</option>
                        <option value="Assistant Professor">Assistant Professor</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Department, Semester & Class Mapping */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                    2. Department, Semester, Year & Section
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Department */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Department *
                      </label>
                      <select
                        value={formData.department || 'AI&DS'}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value as DepartmentCode })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      >
                        <option value="AI&DS">AI&DS</option>
                        {ALL_DEPTS.filter(d => d !== 'AI&DS').map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Semester */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Curricular Semester *
                      </label>
                      <select
                        value={formData.semester || 5}
                        onChange={(e) => {
                          const sem = Number(e.target.value);
                          const yr = sem <= 2 ? 'I' : sem <= 4 ? 'II' : sem <= 6 ? 'III' : 'IV';
                          const defaultSub = (DEPARTMENT_SUBJECTS['AI&DS'] || []).find(s => s.semester === sem);
                          setFormData({
                            ...formData,
                            semester: sem,
                            classYear: yr,
                            subjectCode: defaultSub ? defaultSub.code : formData.subjectCode,
                            subjectName: defaultSub ? defaultSub.name : formData.subjectName
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      >
                        <option value={1}>Sem 01 (Year I)</option>
                        <option value={2}>Sem 02 (Year I)</option>
                        <option value={3}>Sem 03 (Year II)</option>
                        <option value={4}>Sem 04 (Year II)</option>
                        <option value={5}>Sem 05 (Year III)</option>
                        <option value={6}>Sem 06 (Year III)</option>
                        <option value={7}>Sem 07 (Year IV)</option>
                        <option value={8}>Sem 08 (Year IV)</option>
                      </select>
                    </div>

                    {/* Class Year */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Class Year *
                      </label>
                      <select
                        value={formData.classYear || 'III'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            classYear: e.target.value as any,
                            semester: e.target.value === 'I' ? 1 : e.target.value === 'II' ? 3 : e.target.value === 'III' ? 5 : 7
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      >
                        <option value="I">Year I</option>
                        <option value="II">Year II</option>
                        <option value="III">Year III</option>
                        <option value="IV">Year IV</option>
                      </select>
                    </div>

                    {/* Section */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Section *
                      </label>
                      <select
                        value={formData.section || 'A'}
                        onChange={(e) => setFormData({ ...formData, section: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                        <option value="D">Section D</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Subject Assignment */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>3. Subject Assignment (AI&DS Anna Univ R-2021)</span>
                    <span className="text-[11px] text-[#781717] font-semibold">
                      Sem 0{formData.semester || 5} Curriculum
                    </span>
                  </div>

                  {/* Curricular Subject Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Choose from Curricular Subjects (Sem 0{formData.semester || 5})
                    </label>
                    <select
                      value={formData.subjectCode || ''}
                      onChange={(e) => {
                        const code = e.target.value;
                        const found = (DEPARTMENT_SUBJECTS['AI&DS'] || []).find((s) => s.code === code);
                        if (found) {
                          setFormData({
                            ...formData,
                            subjectCode: found.code,
                            subjectName: found.name
                          });
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-amber-50/60 border border-amber-300/80 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#781717] cursor-pointer"
                    >
                      <option value="">-- Select Curricular Subject --</option>
                      {(DEPARTMENT_SUBJECTS['AI&DS'] || [])
                        .filter((s) => s.semester === (formData.semester || 5))
                        .map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.code} — {s.name} ({s.credits} Credits • {s.type})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subject Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.subjectCode || ''}
                        onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value.toUpperCase() })}
                        placeholder="e.g. AD3501"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subject Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.subjectName || ''}
                        onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                        placeholder="e.g. Deep Neural Networks & Architectures"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Academic Role & Hours */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                    4. Academic Role & Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Academic Role *
                      </label>
                      <select
                        value={formData.role || 'Course Instructor'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      >
                        <option value="Course Instructor">Course Instructor</option>
                        <option value="Lab In-charge">Lab In-charge</option>
                        <option value="Class Advisor / Mentor">Class Advisor / Mentor</option>
                        <option value="Chief Question Setter">Chief Question Setter</option>
                        <option value="Valuation Examiner">Valuation Examiner</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Weekly Hours
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={formData.weeklyHours || 4}
                        onChange={(e) => setFormData({ ...formData, weeklyHours: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#781717]"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#781717] hover:bg-[#8e1d1d] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    {editingAllocation ? 'Save Changes' : 'Confirm Allocation'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Test Window Add / Edit Modal (Admin Control) */}
      <AnimatePresence>
        {testWindowModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-[#781717] px-6 py-4.5 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    {editingTestWindow ? 'Edit Examination Window' : 'Create New Examination Window'}
                  </h3>
                  <p className="text-xs text-rose-200 mt-0.5">
                    COE Autonomous Schedule & Mark Entry Portal Settings
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTestWindowModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!onUpdateTestWindows) return;
                  if (editingTestWindow) {
                    const updated = testWindows.map((t) =>
                      t.id === editingTestWindow.id
                        ? ({ ...editingTestWindow, ...testWindowFormData, lastUpdated: new Date().toISOString().slice(0, 10) } as TestWindowConfig)
                        : t
                    );
                    onUpdateTestWindows(updated);
                  } else {
                    const newTest: TestWindowConfig = {
                      id: `TW-CUSTOM-${Date.now().toString().slice(-4)}`,
                      testName: testWindowFormData.testName || 'New Autonomous Assessment',
                      testCategory: (testWindowFormData.testCategory || 'Continuous Internal Assessment (CIA)') as any,
                      academicYear: testWindowFormData.academicYear || '2025-2026',
                      semester: testWindowFormData.semester || 5,
                      year: testWindowFormData.year || 'III',
                      section: testWindowFormData.section || 'ALL',
                      department: 'AI&DS',
                      isOpen: testWindowFormData.isOpen ?? true,
                      startDate: testWindowFormData.startDate || new Date().toISOString().slice(0, 10),
                      deadline: testWindowFormData.deadline || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
                      maxMarks: testWindowFormData.maxMarks || 50,
                      openedBy: session.fullName,
                      lastUpdated: new Date().toISOString().slice(0, 10)
                    };
                    onUpdateTestWindows([...testWindows, newTest]);
                  }
                  setTestWindowModalOpen(false);
                }}
                className="p-6 space-y-4 overflow-y-auto flex-1 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Examination Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={testWindowFormData.testName || ''}
                    onChange={(e) => setTestWindowFormData({ ...testWindowFormData, testName: e.target.value })}
                    placeholder="e.g. Continuous Internal Assessment 1 (CIA 1)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#781717]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Target Semester *
                    </label>
                    <select
                      value={testWindowFormData.semester || 5}
                      onChange={(e) => setTestWindowFormData({ ...testWindowFormData, semester: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#781717]"
                    >
                      <option value={1}>Semester 01</option>
                      <option value={2}>Semester 02</option>
                      <option value={3}>Semester 03</option>
                      <option value={4}>Semester 04</option>
                      <option value={5}>Semester 05</option>
                      <option value={6}>Semester 06</option>
                      <option value={7}>Semester 07</option>
                      <option value={8}>Semester 08</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Maximum Marks *
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      required
                      value={testWindowFormData.maxMarks || 50}
                      onChange={(e) => setTestWindowFormData({ ...testWindowFormData, maxMarks: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#781717]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={testWindowFormData.startDate || ''}
                      onChange={(e) => setTestWindowFormData({ ...testWindowFormData, startDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#781717]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Submission Deadline *
                    </label>
                    <input
                      type="date"
                      required
                      value={testWindowFormData.deadline || ''}
                      onChange={(e) => setTestWindowFormData({ ...testWindowFormData, deadline: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#781717]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Marks Upload Status</span>
                    <span className="text-[11px] text-slate-500">Allow staff to upload Excel marks</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testWindowFormData.isOpen ?? true}
                      onChange={(e) => setTestWindowFormData({ ...testWindowFormData, isOpen: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTestWindowModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#781717] hover:bg-[#8e1d1d] text-white font-bold transition-all shadow-md cursor-pointer"
                  >
                    {editingTestWindow ? 'Update Test Window' : 'Create Test Window'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
