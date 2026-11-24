import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  ShieldCheck,
  Search,
  Check,
  X,
  RefreshCw,
  Sparkles,
  HelpCircle,
  FileText,
  UserCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  Edit,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  StudentProfile,
  DepartmentCode,
  UserSession,
  TestWindowConfig,
  StudentTestMark,
  MarkRecord,
  SubjectScore,
  TeacherAllocation
} from '../types';
import { DEPARTMENT_SUBJECTS } from '../data/departmentSubjectsData';
import {
  downloadTestMarkExcelTemplate,
  parseTestMarkExcelFile,
  calculateGrade
} from '../utils/excelMarksHelper';
import { RetestStudentsPanel } from './RetestStudentsPanel';
import {
  collectRetestStudentsFromTestMarks,
  getPassMarkForMax,
  isRetestRequired
} from '../utils/retestHelper';

interface ModuleUploadMarksProps {
  students: StudentProfile[];
  testWindows: TestWindowConfig[];
  studentTestMarks: StudentTestMark[];
  teacherAllocations?: TeacherAllocation[];
  onUpdateTestWindows: (updatedWindows: TestWindowConfig[]) => void;
  onSaveTestMarks: (marks: StudentTestMark[]) => void;
  onSyncToMarkStatements?: (updatedMarks: StudentTestMark[], test: TestWindowConfig) => void;
  onUpdateStudent?: (student: StudentProfile) => void;
  session?: UserSession;
}

export const ModuleUploadMarks: React.FC<ModuleUploadMarksProps> = ({
  students = [],
  testWindows = [],
  studentTestMarks = [],
  teacherAllocations = [],
  onUpdateTestWindows,
  onSaveTestMarks,
  onSyncToMarkStatements,
  onUpdateStudent,
  session
}) => {
  const isAdmin = !!session?.isAdmin;
  const isDeptUser = session && !session.isAdmin && session.department && session.department !== 'ALL';
  const activeDept = isDeptUser ? (session.department as DepartmentCode) : 'ALL';

  // 1. Mandatory Academic Year, Semester & Class Selection
  const [selectedSemester, setSelectedSemester] = useState<number>(5);
  const [selectedYear, setSelectedYear] = useState<'I' | 'II' | 'III' | 'IV'>('III');
  const [selectedClass, setSelectedClass] = useState<'A' | 'B' | 'C' | 'D' | 'ALL'>('A');
  const [deptFilter, setDeptFilter] = useState<string>('AI&DS');

  // Available AI&DS Curricular Subjects for the selected semester
  const aidsSubjects = React.useMemo(() => {
    const fromSyllabus = (DEPARTMENT_SUBJECTS['AI&DS'] || []).filter(
      (s) => s.semester === selectedSemester
    );
    const fromAlloc = teacherAllocations
      .filter((a) => a.semester === selectedSemester || a.classYear === selectedYear)
      .map((a) => ({
        code: a.subjectCode,
        name: a.subjectName,
        semester: a.semester || selectedSemester,
        department: 'AI&DS' as DepartmentCode,
        regulation: 'R-2021 Autonomous',
        credits: 4,
        type: 'Theory' as const
      }));

    const map = new Map<string, { code: string; name: string }>();
    fromSyllabus.forEach((s) => map.set(s.code, { code: s.code, name: s.name }));
    fromAlloc.forEach((a) => map.set(a.code, { code: a.code, name: a.name }));
    const list = Array.from(map.values());
    return list.length > 0
      ? list
      : [{ code: 'AD3501', name: 'Deep Neural Networks & Architectures' }];
  }, [selectedSemester, selectedYear, teacherAllocations]);

  // 2. Selected Test Window
  const [selectedTestId, setSelectedTestId] = useState<string>(testWindows[0]?.id || 'TW-CIA-1');

  // 3. Subject Configuration (Defaults to first subject of selected semester)
  const [subjectCode, setSubjectCode] = useState('AD3501');
  const [subjectName, setSubjectName] = useState('Deep Neural Networks & Architectures');

  // Sync subject when semester changes
  React.useEffect(() => {
    if (aidsSubjects.length > 0 && !aidsSubjects.some((s) => s.code === subjectCode)) {
      setSubjectCode(aidsSubjects[0].code);
      setSubjectName(aidsSubjects[0].name);
    }
  }, [selectedSemester, aidsSubjects]);

  // Find automatically allocated staff member for the selected subject and class
  const matchedAllocation = React.useMemo(() => {
    return (
      teacherAllocations.find(
        (a) =>
          a.department === 'AI&DS' &&
          (a.subjectCode === subjectCode || a.subjectName === subjectName) &&
          (a.semester === selectedSemester || a.classYear === selectedYear) &&
          (selectedClass === 'ALL' || a.section === selectedClass)
      ) ||
      teacherAllocations.find(
        (a) =>
          a.department === 'AI&DS' &&
          (a.subjectCode === subjectCode || a.subjectName === subjectName)
      )
    );
  }, [teacherAllocations, subjectCode, subjectName, selectedSemester, selectedYear, selectedClass]);

  const allocatedFacultyName =
    matchedAllocation?.teacherName ||
    session?.staffName ||
    session?.fullName ||
    'Allocated Course Faculty';

  const allocatedFacultyRole =
    matchedAllocation?.designation || 'Associate Professor (Allocated by Admin)';

  // Handle Semester Switch
  const handleSemesterChange = (newSem: number) => {
    setSelectedSemester(newSem);
    if (newSem === 1 || newSem === 2) setSelectedYear('I');
    else if (newSem === 3 || newSem === 4) setSelectedYear('II');
    else if (newSem === 5 || newSem === 6) setSelectedYear('III');
    else if (newSem === 7 || newSem === 8) setSelectedYear('IV');
  };

  // Handle Year Switch
  const handleYearChange = (newYear: 'I' | 'II' | 'III' | 'IV') => {
    setSelectedYear(newYear);
    if (newYear === 'I') setSelectedSemester(1);
    else if (newYear === 'II') setSelectedSemester(3);
    else if (newYear === 'III') setSelectedSemester(5);
    else if (newYear === 'IV') setSelectedSemester(7);
  };

  // Handle Subject Code Change
  const handleSubjectCodeChange = (code: string) => {
    setSubjectCode(code);
    const found = aidsSubjects.find((s) => s.code === code);
    if (found) {
      setSubjectName(found.name);
    }
  };

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Upload & File state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Admin Window Manager Modal
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isAddWindowOpen, setIsAddWindowOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<TestWindowConfig | null>(null);
  const [newWindowForm, setNewWindowForm] = useState({
    testName: '',
    testCategory: 'CIA 1' as any,
    maxMarks: 50,
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    description: ''
  });

  // Success Notification
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Active Test Window
  const currentTest = testWindows.find((t) => t.id === selectedTestId) || testWindows[0];

  // Additional candidates imported directly from uploaded Mark Excel sheets (works even if Student Registry is empty)
  const [uploadedExcelCandidates, setUploadedExcelCandidates] = useState<StudentProfile[]>([]);
  const [hasUnsavedMarksInput, setHasUnsavedMarksInput] = useState(false);

  const combinedCandidates = React.useMemo(() => {
    const map = new Map<string, StudentProfile>();
    students.forEach((s) => {
      if (activeDept !== 'ALL' && s.department !== activeDept) return;
      if (deptFilter !== 'all' && s.department !== deptFilter) return;
      if (s.year !== selectedYear) return;
      if (selectedClass !== 'ALL' && s.section !== selectedClass) return;
      map.set(s.registerNo.trim().toUpperCase(), s);
    });
    uploadedExcelCandidates.forEach((u) => {
      const k = u.registerNo.trim().toUpperCase();
      if (!map.has(k)) map.set(k, u);
    });
    return Array.from(map.values());
  }, [students, uploadedExcelCandidates, activeDept, deptFilter, selectedYear, selectedClass]);

  // Filter students by active department, selection & search
  const filteredStudents = combinedCandidates.filter((s) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        s.registerNo.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Local draft marks state: Map of registerNo -> mark entry
  const [draftMarks, setDraftMarks] = useState<Record<string, { marksObtained: number; remarks: string }>>({});

  // Sync draft marks from existing studentTestMarks when test or selection changes
  React.useEffect(() => {
    const newDraft: Record<string, { marksObtained: number; remarks: string }> = {};
    filteredStudents.forEach((student) => {
      const existing = studentTestMarks.find(
        (m) => m.testId === currentTest?.id && m.registerNo === student.registerNo
      );
      if (existing) {
        newDraft[student.registerNo] = {
          marksObtained: existing.marksObtained,
          remarks: existing.remarks || ''
        };
      } else if (draftMarks[student.registerNo] && uploadedExcelCandidates.some((u) => u.registerNo === student.registerNo)) {
        newDraft[student.registerNo] = draftMarks[student.registerNo];
      } else {
        newDraft[student.registerNo] = {
          marksObtained: 0,
          remarks: ''
        };
      }
    });
    setDraftMarks(newDraft);
  }, [selectedTestId, selectedYear, selectedClass, deptFilter, students.length, studentTestMarks.length, uploadedExcelCandidates.length]);

  // Handle Mark Input Change
  const handleMarkChange = (registerNo: string, val: string) => {
    const num = val === '' ? 0 : Number(val);
    const max = currentTest?.maxMarks || 50;
    const clamped = isNaN(num) ? 0 : Math.min(max, Math.max(0, num));
    setDraftMarks((prev) => ({
      ...prev,
      [registerNo]: {
        ...(prev[registerNo] || { remarks: '' }),
        marksObtained: clamped
      }
    }));
    setHasUnsavedMarksInput(true);
  };

  // Handle Download Excel Template
  const handleDownloadTemplate = () => {
    if (!currentTest) return;
    downloadTestMarkExcelTemplate({
      students: filteredStudents,
      year: selectedYear,
      section: selectedClass,
      test: currentTest,
      subjectCode,
      subjectName
    });
  };

  // Handle File Upload & Parse
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadStatus('parsing');
    setValidationErrors([]);

    const result = await parseTestMarkExcelFile(file);

    if (result.records.length > 0) {
      const updatedDraft = { ...draftMarks };
      const extraCandidates: StudentProfile[] = [];
      let matchedCount = 0;

      result.records.forEach((rec, rIdx) => {
        const cleanReg = rec.registerNo.trim();
        const target = students.find(
          (s) => s.registerNo.trim().toUpperCase() === cleanReg.toUpperCase()
        );
        const targetReg = target ? target.registerNo : cleanReg;
        updatedDraft[targetReg] = {
          marksObtained: rec.marksObtained,
          remarks: rec.remarks || ''
        };
        if (!target) {
          extraCandidates.push({
            id: `XLS-STU-${cleanReg}-${rIdx}`,
            registerNo: cleanReg,
            rollNo: rec.rollNo || cleanReg,
            name: rec.studentName || `Candidate ${cleanReg}`,
            degree: 'B.Tech AI&DS',
            department: (rec.department as DepartmentCode) || 'AI&DS',
            year: ((rec.year as 'I' | 'II' | 'III' | 'IV') || selectedYear),
            semester: selectedSemester,
            section: ((rec.section as 'A' | 'B' | 'C' | 'D') || (selectedClass === 'ALL' ? 'A' : selectedClass)),
            batch: '2023 - 2027',
            cgpa: 0,
            attendancePercentage: 100,
            parentName: '',
            parentPhone: '',
            parentEmail: '',
            mentorName: allocatedFacultyName,
            bloodGroup: '',
            admissionType: 'TNEA Government Quota',
            iat1Average: rec.marksObtained,
            iat2Average: 0,
            historyOfArrears: 0,
            activeStatus: 'Active'
          });
        }
        matchedCount++;
      });

      if (extraCandidates.length > 0) {
        setUploadedExcelCandidates((prev) => {
          const seen = new Set(prev.map((p) => p.registerNo.toUpperCase()));
          return [...prev, ...extraCandidates.filter((c) => !seen.has(c.registerNo.toUpperCase()))];
        });
      }

      setDraftMarks(updatedDraft);
      setHasUnsavedMarksInput(true);
      setUploadStatus('success');
      if (result.errors.length > 0) {
        setValidationErrors(result.errors);
      }
      setSuccessBanner(
        `Excel sheet imported! ${matchedCount} student mark(s) mapped from "${file.name}" — Retest Attending List updated below.`
      );
      confetti({ particleCount: 50, spread: 60 });
    } else {
      setUploadStatus('error');
      setValidationErrors(
        result.errors.length > 0
          ? result.errors
          : ['Could not extract valid student mark rows from the Excel workbook.']
      );
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save / Commit Marks
  const handleCommitMarks = () => {
    if (!currentTest) return;

    if (!currentTest.isOpen && !isAdmin) {
      alert(`The upload portal for "${currentTest.testName}" is currently closed by the COE Office.`);
      return;
    }

    const effectiveStaffId = session?.isAdmin
      ? session.adminInspectingStaffId
      : session?.staffId;
    const effectiveStaffName = session?.isAdmin
      ? (session.adminInspectingStaffId ? session.staffName || session.adminInspectingStaffId : session.fullName)
      : (session?.staffName || session?.fullName);

    const newMarksList: StudentTestMark[] = filteredStudents.map((student) => {
      const entry = draftMarks[student.registerNo] || { marksObtained: 0, remarks: '' };
      const score = entry.marksObtained;
      const max = currentTest.maxMarks;
      const passCutoff = getPassMarkForMax(max);
      const result: 'PASS' | 'RA' | 'AB' = score >= passCutoff ? 'PASS' : 'RA';

      // Grade calculation (60% cutoff aligned with >=30/50 and >=60/100)
      const percentage = (score / max) * 100;
      const { grade } = calculateGrade(percentage);

      return {
        id: `STM-${effectiveStaffId || 'ADM'}-${currentTest.id}-${student.registerNo}`,
        testId: currentTest.id,
        testName: currentTest.testName,
        registerNo: student.registerNo,
        rollNo: student.rollNo,
        studentName: student.name,
        department: student.department,
        year: student.year,
        section: student.section,
        subjectCode,
        subjectName,
        marksObtained: score,
        maxMarks: max,
        grade,
        result,
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        uploadedBy: effectiveStaffName || 'Faculty Evaluator',
        ownerStaffId: effectiveStaffId || undefined,
        remarks: entry.remarks
      };
    });

    // 1. Save to Test Marks store
    onSaveTestMarks(newMarksList);
    setHasUnsavedMarksInput(false);

    // 2. Synchronize to Mark Statements (updates MarkRecord & GPA)
    if (onSyncToMarkStatements) {
      onSyncToMarkStatements(newMarksList, currentTest);
    }

    // 3. Update student profiles internal averages (IAT1 / IAT2)
    filteredStudents.forEach((student) => {
      const entry = draftMarks[student.registerNo];
      if (entry && onUpdateStudent) {
        if (currentTest.testCategory.includes('CIA 1') || currentTest.testCategory.includes('Unit Test 1')) {
          onUpdateStudent({
            ...student,
            iat1Average: entry.marksObtained
          });
        } else if (currentTest.testCategory.includes('CIA 2') || currentTest.testCategory.includes('Unit Test 2')) {
          onUpdateStudent({
            ...student,
            iat2Average: entry.marksObtained
          });
        }
      }
    });

    const retestCount = newMarksList.filter((m) => isRetestRequired(m.marksObtained, m.maxMarks)).length;
    setSuccessBanner(
      `✓ Marks saved for ${newMarksList.length} candidates! ${retestCount} student(s) below pass mark (${getPassMarkForMax(currentTest.maxMarks)}/${currentTest.maxMarks}) added to Retest Attending List.`
    );
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });

    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  // Live combined marks for immediate Retest List generation (saved marks + freshly uploaded Excel rows)
  const effectiveRetestMarksSource = React.useMemo<StudentTestMark[]>(() => {
    const byKey = new Map<string, StudentTestMark>();
    studentTestMarks.forEach((tm) => {
      byKey.set(`${tm.testId}__${tm.registerNo.toUpperCase()}`, tm);
    });

    if (currentTest && (uploadedExcelCandidates.length > 0 || hasUnsavedMarksInput)) {
      filteredStudents.forEach((stu) => {
        const key = `${currentTest.id}__${stu.registerNo.toUpperCase()}`;
        const entry = draftMarks[stu.registerNo];
        if (!entry) return;
        const max = currentTest.maxMarks || 50;
        const passCutoff = getPassMarkForMax(max);
        const pct = (entry.marksObtained / max) * 100;
        byKey.set(key, {
          id: `LIVE-${currentTest.id}-${stu.registerNo}`,
          testId: currentTest.id,
          testName: currentTest.testName,
          registerNo: stu.registerNo,
          rollNo: stu.rollNo,
          studentName: stu.name,
          department: stu.department,
          year: stu.year,
          section: stu.section,
          subjectCode,
          subjectName,
          marksObtained: entry.marksObtained,
          maxMarks: max,
          grade: calculateGrade(pct).grade,
          result: entry.marksObtained >= passCutoff ? 'PASS' : 'RA',
          uploadedAt: new Date().toISOString().slice(0, 16),
          uploadedBy: session?.fullName || 'Staff',
          remarks: entry.remarks
        });
      });
    }

    return Array.from(byKey.values());
  }, [studentTestMarks, uploadedExcelCandidates, hasUnsavedMarksInput, currentTest, filteredStudents, draftMarks, subjectCode, subjectName, session]);

  const retestStudentsList = React.useMemo(
    () => collectRetestStudentsFromTestMarks(effectiveRetestMarksSource, combinedCandidates),
    [effectiveRetestMarksSource, combinedCandidates]
  );

  // Toggle Test Open / Lock (Admin feature)
  const handleToggleTestWindow = (testId: string) => {
    const updated = testWindows.map((tw) =>
      tw.id === testId ? { ...tw, isOpen: !tw.isOpen, lastUpdated: new Date().toISOString().slice(0, 10) } : tw
    );
    onUpdateTestWindows(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-950 border border-amber-700/50 text-amber-400">
              <Upload className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Upload Marks Portal
            </h1>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Bulk Excel Mark Upload & Synchronization for Autonomous Internal Tests, CIA, and Model Examinations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Admin Open / Close Tests button */}
          {isAdmin && (
            <button
              onClick={() => setIsAdminPortalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#781717] hover:bg-[#601212] text-white text-xs font-bold shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>COE Window Control</span>
            </button>
          )}

          {/* Download Excel Template */}
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Download formatted Excel sheet for currently selected Year and Class"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Download Excel Template</span>
          </button>

          {/* Upload Excel Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!currentTest?.isOpen && !isAdmin}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              currentTest?.isOpen || isAdmin
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>Upload Completed Excel</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between text-emerald-900 shadow-sm"
        >
          <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="p-1 text-emerald-700 hover:text-emerald-900 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Upload Error Banner */}
      {uploadStatus === 'error' && validationErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Excel Validation Notice ({validationErrors.length} issues)</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ========================================================
          1. MANDATORY ACADEMIC YEAR & CLASS FILTER CONTROLS
         ======================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        
        {/* Step 1: Academic Year, Semester, Class & Test Window Dropdown Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-50/80 rounded-2xl border border-red-200">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#781717] text-white text-xs font-black flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide block">
                  Curricular Filters & Test Portal Selection (AI&DS Dept)
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Select Year, Semester, Class Section, and Exam Window using the dropdowns below
                </span>
              </div>
            </div>

            <span className="text-xs font-bold text-[#781717] font-mono shrink-0">
              Year {selectedYear} • Sem 0{selectedSemester} • Class {selectedClass === 'ALL' ? 'All Sections' : `Sec ${selectedClass}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Academic Year Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Academic Year Dropdown
              </label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
              >
                <option value="I">Year I (1st Year • Sem 1 & 2)</option>
                <option value="II">Year II (2nd Year • Sem 3 & 4)</option>
                <option value="III">Year III (3rd Year • Sem 5 & 6)</option>
                <option value="IV">Year IV (4th Year • Sem 7 & 8)</option>
              </select>
            </div>

            {/* Semester Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Curricular Semester Dropdown
              </label>
              <select
                id="upload-semester-select"
                value={selectedSemester}
                onChange={(e) => handleSemesterChange(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#781717]/40 bg-red-50/50 text-xs font-black text-[#781717] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
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
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Class / Section Dropdown
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
              >
                <option value="ALL">All Sections (A, B, C & D)</option>
                <option value="A">Section A (Class A)</option>
                <option value="B">Section B (Class B)</option>
                <option value="C">Section C (Class C)</option>
                <option value="D">Section D (Class D)</option>
              </select>
            </div>

            {/* Examination / Test Window Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Test / Exam Window
                </label>
                {currentTest && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                      currentTest.isOpen
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {currentTest.isOpen ? '🔓 OPEN' : '🔒 LOCKED'}
                  </span>
                )}
              </div>
              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
              >
                {testWindows.map((tw) => (
                  <option key={tw.id} value={tw.id}>
                    {tw.isOpen ? '🔓' : '🔒'} {tw.testName} (Max {tw.maxMarks}M)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lock / Unlock Notice & COE Admin Controls */}
        {currentTest && (
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              currentTest.isOpen
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-3">
              {currentTest.isOpen ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Unlock className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
              )}
              <div>
                <span className="font-black text-sm block">
                  {currentTest.isOpen
                    ? `● Portal Unlocked: Staff can enter & upload marks for ${currentTest.testName}`
                    : `🔒 Portal Locked by COE Admin: Mark uploads and modifications are closed for ${currentTest.testName}`}
                </span>
                <span className="text-[11px] opacity-80 block mt-0.5">
                  Deadline: {currentTest.deadline} • Max Marks: {currentTest.maxMarks} • Academic Year: {currentTest.academicYear}
                </span>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => handleToggleTestWindow(currentTest.id)}
                className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all shrink-0 ${
                  currentTest.isOpen
                    ? 'bg-rose-700 hover:bg-rose-800 text-white'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                {currentTest.isOpen ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Lock Test Window</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Unlock Test Window</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

          {/* Subject Dropdowns with Auto-appearing Allocated Staff Name */}
          <div className="mt-4 p-4.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#781717] text-white">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Subject Selection & Course Faculty Allocation
                </span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                AI&DS • Semester 0{selectedSemester} • R-2021
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 1. Subject Code Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subject Code Dropdown
                </label>
                <select
                  value={subjectCode}
                  onChange={(e) => handleSubjectCodeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
                >
                  {aidsSubjects.map((sub) => (
                    <option key={sub.code} value={sub.code}>
                      {sub.code} — {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Subject Name Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subject Name Dropdown
                </label>
                <select
                  value={subjectCode}
                  onChange={(e) => handleSubjectCodeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer truncate"
                >
                  {aidsSubjects.map((sub) => (
                    <option key={sub.code} value={sub.code}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* AUTOMATICALLY APPEARING ALLOCATED STAFF MEMBER */}
            <div className="p-3.5 bg-white rounded-xl border border-amber-300/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#781717] text-amber-300 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  FAC
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Allocated Faculty Member
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      ✓ Allocated by Admin
                    </span>
                  </div>
                  <p className="text-sm font-black text-slate-900 truncate">
                    {allocatedFacultyName}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-xs font-bold text-slate-700 block">
                  {allocatedFacultyRole}
                </span>
                <span className="text-[10px] text-amber-800 font-semibold font-mono">
                  {subjectCode} • Class {selectedClass === 'ALL' ? 'All Sections' : `Sec ${selectedClass}`} • Sem 0{selectedSemester}
                </span>
              </div>
            </div>
          </div>
        </div>

      {/* ========================================================
          CANDIDATES & LIVE MARKS ENTRY TABLE
         ======================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Top Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900">
              Students Roster ({filteredStudents.length} candidates)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
              Year {selectedYear} • {selectedClass === 'ALL' ? 'All Sections' : `Sec ${selectedClass}`}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Reg No or Name..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Commit All Marks Button */}
            <button
              onClick={handleCommitMarks}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save & Sync Marks</span>
            </button>
          </div>
        </div>

        {/* Closed Test Warning banner if test is locked */}
        {currentTest && !currentTest.isOpen && (
          <div className="px-5 py-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-800 font-medium">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Mark Entry Locked:</strong> COE Office has closed the upload window for {currentTest.testName}.
                {isAdmin ? ' As COE Administrator, you may still override or open this window.' : ' Please contact the Controller of Examinations to reopen.'}
              </span>
            </div>
            {isAdmin && (
              <button
                onClick={() => handleToggleTestWindow(currentTest.id)}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
              >
                Reopen Window Now
              </button>
            )}
          </div>
        )}

        {/* Student Marks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">S.No</th>
                <th className="py-3 px-4">Register Number</th>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4 text-center">Year / Sec</th>
                <th className="py-3 px-4 text-center">
                  Marks Obtained (Max {currentTest?.maxMarks || 50})
                </th>
                <th className="py-3 px-4 text-center">Percentage</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Remarks / Evaluation Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No students match the selected Year ({selectedYear}) and Class ({selectedClass}).
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const entry = draftMarks[student.registerNo] || { marksObtained: 0, remarks: '' };
                  const maxMarks = currentTest?.maxMarks || 50;
                  const percentage = Math.round((entry.marksObtained / maxMarks) * 100);
                  const isPass = !isRetestRequired(entry.marksObtained, maxMarks);
                  const { grade } = calculateGrade(percentage);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#781717]">
                        {student.registerNo}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {student.rollNo}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {student.name}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        Year {student.year} - {student.section}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max={maxMarks}
                          value={entry.marksObtained}
                          onChange={(e) => handleMarkChange(student.registerNo, e.target.value)}
                          disabled={!currentTest?.isOpen && !isAdmin}
                          className="w-20 text-center py-1 px-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span
                          className={
                            percentage >= 80
                              ? 'text-emerald-700'
                              : percentage >= 60
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }
                        >
                          {percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPass
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPass ? `PASS (${grade})` : 'RETEST (RA)'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={entry.remarks}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftMarks((prev) => ({
                              ...prev,
                              [student.registerNo]: {
                                ...(prev[student.registerNo] || { marksObtained: 0 }),
                                remarks: val
                              }
                            }));
                            setHasUnsavedMarksInput(true);
                          }}
                          placeholder="Optional notes..."
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-3">
          <div>
            Showing <strong>{filteredStudents.length}</strong> students for {currentTest?.testName}.
            Passing Cutoff: <strong>{getPassMarkForMax(currentTest?.maxMarks || 50)} / {currentTest?.maxMarks || 50} Marks (30/50 or 60/100 · Below = Retest)</strong>.
          </div>
          <button
            onClick={handleCommitMarks}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply &amp; Synchronize All Marks</span>
          </button>
        </div>
      </div>

      {/* Automatic Retest Attending Students List right below Marks Upload */}
      <RetestStudentsPanel
        entries={retestStudentsList}
        totalEvaluatedCount={effectiveRetestMarksSource.length}
        title="Retest Attending Students List (Uploaded Mark Excel & Entries)"
        subtitle="Criteria: Below 30 marks out of 50 (or below 60 marks out of 100) — Updates automatically on upload or save."
        emptyActionHint="Upload a completed mark Excel sheet or enter marks above to view students requiring a retest."
      />

      {/* ========================================================
          ADMIN MODAL: TEST WINDOW OPEN / CLOSE MANAGER
         ======================================================== */}
      <AnimatePresence>
        {isAdminPortalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-5 bg-[#781717] text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-base font-black">COE Examination Window Control</h2>
                    <p className="text-[11px] text-rose-200">
                      Open or lock mark upload portals for departments and faculty
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdminPortalOpen(false)}
                  className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600 max-w-lg">
                    As Controller of Examinations, manage test mark upload portals for faculty. Opening an exam window enables staff to upload marks via Excel.
                  </p>
                  <button
                    onClick={() => {
                      setIsAddWindowOpen(!isAddWindowOpen);
                      setEditingWindow(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#781717] hover:bg-[#5a1111] text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isAddWindowOpen ? 'Cancel New Test' : '+ Add Test Window'}</span>
                  </button>
                </div>

                {/* Add New Test Window Form */}
                {isAddWindowOpen && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newWindowForm.testName.trim()) return;
                      const newWin: TestWindowConfig = {
                        id: `TW-${Date.now().toString().slice(-4)}`,
                        testName: newWindowForm.testName.trim(),
                        testCategory: newWindowForm.testCategory,
                        academicYear: '2025-2026',
                        semester: selectedSemester,
                        year: selectedYear,
                        section: selectedClass,
                        department: 'AI&DS',
                        maxMarks: Number(newWindowForm.maxMarks) || 50,
                        startDate: new Date().toISOString().slice(0, 10),
                        deadline: newWindowForm.deadline,
                        isOpen: true,
                        openedBy: session?.fullName || 'COE Administration',
                        lastUpdated: new Date().toISOString().slice(0, 10),
                        description: newWindowForm.description.trim() || 'Autonomous internal assessment mark portal.'
                      };
                      onUpdateTestWindows([newWin, ...testWindows]);
                      setIsAddWindowOpen(false);
                      setNewWindowForm({
                        testName: '',
                        testCategory: 'CIA 1',
                        maxMarks: 50,
                        deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
                        description: ''
                      });
                    }}
                    className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                        Create New Exam Window
                      </span>
                      <span className="text-[10px] text-amber-800 font-bold">New Assessment</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Test Name
                        </label>
                        <input
                          type="text"
                          required
                          value={newWindowForm.testName}
                          onChange={(e) => setNewWindowForm({ ...newWindowForm, testName: e.target.value })}
                          placeholder="e.g. CIA 3 / Unit Test 3"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Max Marks
                        </label>
                        <input
                          type="number"
                          required
                          value={newWindowForm.maxMarks}
                          onChange={(e) => setNewWindowForm({ ...newWindowForm, maxMarks: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Upload Deadline
                        </label>
                        <input
                          type="date"
                          value={newWindowForm.deadline}
                          onChange={(e) => setNewWindowForm({ ...newWindowForm, deadline: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddWindowOpen(false)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700"
                      >
                        Save & Open Window
                      </button>
                    </div>
                  </form>
                )}

                {/* Edit Window Form */}
                {editingWindow && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const updated = testWindows.map((tw) =>
                        tw.id === editingWindow.id ? editingWindow : tw
                      );
                      onUpdateTestWindows(updated);
                      setEditingWindow(null);
                    }}
                    className="p-4 rounded-2xl bg-blue-50 border border-blue-300 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-950 uppercase tracking-wide">
                        Edit Test Window • {editingWindow.testName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingWindow(null)}
                        className="text-xs text-blue-700 hover:underline font-bold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Test Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editingWindow.testName}
                          onChange={(e) =>
                            setEditingWindow({ ...editingWindow, testName: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Max Marks
                        </label>
                        <input
                          type="number"
                          required
                          value={editingWindow.maxMarks}
                          onChange={(e) =>
                            setEditingWindow({ ...editingWindow, maxMarks: Number(e.target.value) })
                          }
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Upload Deadline
                        </label>
                        <input
                          type="date"
                          value={editingWindow.deadline}
                          onChange={(e) =>
                            setEditingWindow({ ...editingWindow, deadline: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingWindow(null)}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700"
                      >
                        Update Test Window
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {testWindows.map((tw) => (
                    <div
                      key={tw.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        tw.isOpen
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">
                            {tw.testName}
                          </span>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                              tw.isOpen
                                ? 'bg-emerald-200 text-emerald-900'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {tw.isOpen ? 'PORTAL OPEN' : 'LOCKED'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Max Marks: <strong>{tw.maxMarks}</strong> • Deadline: <strong>{tw.deadline}</strong> • Opened by: {tw.openedBy}
                        </div>
                        {tw.description && (
                          <div className="text-[11px] text-slate-600 italic">
                            "{tw.description}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWindow(tw);
                            setIsAddWindowOpen(false);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleToggleTestWindow(tw.id)}
                          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                            tw.isOpen
                              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setIsAdminPortalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
