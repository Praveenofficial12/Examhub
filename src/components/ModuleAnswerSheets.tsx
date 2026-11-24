import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Scan,
  RotateCw,
  Eye,
  X,
  FileText,
  User,
  GraduationCap,
  Download,
  Barcode,
  Edit3,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Check,
  Plus,
  Camera,
  Upload,
  Sparkles,
  FileSpreadsheet,
  Save,
  UserX
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  AnswerSheet,
  DepartmentCode,
  ExamAnswerKey,
  SheetStatus,
  UserSession,
  StudentProfile
} from '../types';
import { StudentEditModal } from './StudentEditModal';
import { AnswerSheetLensModal } from './AnswerSheetLensModal';
import { RetestStudentsPanel } from './RetestStudentsPanel';
import {
  collectRetestStudentsFromAnswerSheets,
  exportRetestListToExcel
} from '../utils/retestHelper';
import {
  LiveExcelMarkRow,
  answerSheetToLiveExcelRow,
  recomputeLiveExcelRow,
  liveExcelRowToAnswerSheet,
  exportLiveExcelWorkbook,
  parseImportedLiveExcelWorkbook
} from '../utils/answerSheetExcelHelper';

interface ModuleAnswerSheetsProps {
  answerSheets: AnswerSheet[];
  onUpdateSheet: (updatedSheet: AnswerSheet) => void;
  onAddSheet: (newSheet: AnswerSheet) => void;
  answerKeys?: ExamAnswerKey[];
  onSaveEvaluationResult?: (sheet: AnswerSheet) => Promise<void> | void;
  onBatchSaveEvaluations?: (sheets: AnswerSheet[]) => Promise<void> | void;
  students?: StudentProfile[];
  onUpdateStudent?: (updatedStudent: StudentProfile) => void;
  session?: UserSession;
}

export const ModuleAnswerSheets: React.FC<ModuleAnswerSheetsProps> = ({
  answerSheets,
  onUpdateSheet,
  onAddSheet,
  answerKeys = [],
  onSaveEvaluationResult,
  onBatchSaveEvaluations,
  students = [],
  onUpdateStudent,
  session
}) => {
  const isDeptUser = session && !session.isAdmin && session.department && session.department !== 'ALL';
  const activeDept = isDeptUser ? (session.department as DepartmentCode) : 'ALL';

  // Academic Year, Semester & Class Selection
  const [selectedYear, setSelectedYear] = useState<'I' | 'II' | 'III' | 'IV'>('III');
  const [selectedSemester, setSelectedSemester] = useState<number>(5);
  const [selectedClass, setSelectedClass] = useState<'A' | 'B' | 'C' | 'D' | 'ALL'>('A');

  // View SubTab ('live-excel' & 'retest-list' included!)
  const [viewTab, setViewTab] = useState<'live-excel' | 'retest-list' | 'students-mapping' | 'all-scans'>('live-excel');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SheetStatus>('all');
  const [deptFilter, setDeptFilter] = useState<string>(isDeptUser ? (session.department as string) : 'all');

  // Modal States
  const [selectedSheet, setSelectedSheet] = useState<AnswerSheet | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [mappingStudentTarget, setMappingStudentTarget] = useState<StudentProfile | null>(null);
  const [newDummyNo, setNewDummyNo] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('CS3351');
  const [newSubjectName, setNewSubjectName] = useState('Digital Principles & Computer Organization');

  // Lens Camera Evaluation Modal State
  const [lensOpen, setLensOpen] = useState(false);
  const [lensInitialMode, setLensInitialMode] = useState<'camera' | 'upload'>('camera');
  const [selectedKeyId, setSelectedKeyId] = useState<string>(() => answerKeys[0]?.id || '');
  const [examSession, setExamSession] = useState<'FN' | 'AN'>('FN');

  const activeAnswerKey =
    answerKeys.find((k) => k.id === selectedKeyId) || answerKeys[0] || null;

  // Live Excel Sheet Editable State & Filter
  const [excelSubjectFilter, setExcelSubjectFilter] = useState<string>('ALL');
  const [excelRows, setExcelRows] = useState<LiveExcelMarkRow[]>([]);
  const [excelDirty, setExcelDirty] = useState(false);
  const [excelSaving, setExcelSaving] = useState(false);
  const [excelBanner, setExcelBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const excelImportInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync live excel grid whenever underlying answerSheets change (when not actively editing)
  React.useEffect(() => {
    const filtered = answerSheets.filter((s) => {
      if (excelSubjectFilter !== 'ALL' && s.subjectCode !== excelSubjectFilter) return false;
      return true;
    });
    const seenKeys = new Map<string, number>();
    filtered.forEach((s) => {
      const k = `${String(s.registerNo || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}__${String(s.subjectCode || '').toUpperCase()}`;
      seenKeys.set(k, (seenKeys.get(k) || 0) + 1);
    });
    const nextRows = filtered.map((s, idx) => {
      const k = `${String(s.registerNo || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}__${String(s.subjectCode || '').toUpperCase()}`;
      const isDup = (seenKeys.get(k) || 0) > 1;
      return answerSheetToLiveExcelRow(s, idx + 1, isDup);
    });
    setExcelRows(nextRows);
    setExcelDirty(false);
  }, [answerSheets, excelSubjectFilter]);

  const handleExcelCellChange = (
    idx: number,
    patch: Partial<LiveExcelMarkRow>
  ) => {
    setExcelRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        let next = { ...row, ...patch };
        // Auto-fetch Student Name from DB when Register No is edited
        if (patch.registerNo !== undefined) {
          const norm = patch.registerNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const matchedStu = students.find(
            (st) => st.registerNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === norm
          );
          if (matchedStu) {
            next.studentName = matchedStu.name;
          }
        }
        next = recomputeLiveExcelRow(next);
        return next;
      })
    );
    setExcelDirty(true);
    setExcelBanner(null);
  };

  const handleSaveLiveExcelRows = async (rowsToSave: LiveExcelMarkRow[] = excelRows) => {
    if (rowsToSave.length === 0) return;
    setExcelSaving(true);
    setExcelBanner(null);
    try {
      const sheetPayloads = rowsToSave.map((r) => {
        const existing = answerSheets.find((s) => s.id === r.sheetId);
        return liveExcelRowToAnswerSheet(r, existing);
      });
      if (onBatchSaveEvaluations) {
        await onBatchSaveEvaluations(sheetPayloads);
      } else if (onSaveEvaluationResult) {
        for (const sh of sheetPayloads) {
          await onSaveEvaluationResult(sh);
        }
      } else {
        sheetPayloads.forEach((sh) => onUpdateSheet(sh));
      }
      setExcelDirty(false);
      setExcelBanner({
        type: 'success',
        text: `Saved ${sheetPayloads.length} student row(s) to Database & synced Mark Statements cleanly.`
      });
    } catch (err: any) {
      setExcelBanner({
        type: 'error',
        text: err?.message || 'Failed to persist Live Excel edits.'
      });
    } finally {
      setExcelSaving(false);
    }
  };

  const handleImportExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const defSubCode =
      excelSubjectFilter !== 'ALL'
        ? excelSubjectFilter
        : activeAnswerKey?.subjectCode || '23GET701';
    const defSubName =
      activeAnswerKey?.subjectName || 'Human Values and Ethics';
    const result = await parseImportedLiveExcelWorkbook(file, defSubCode, defSubName);
    if (!result.success) {
      setExcelBanner({ type: 'error', text: result.error || 'Import failed' });
      return;
    }
    // Resolve student names from DB automatically
    const enriched = result.rows.map((r) => {
      const norm = r.registerNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const matched = students.find(
        (st) => st.registerNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === norm
      );
      return matched ? { ...r, studentName: matched.name } : r;
    });
    setExcelRows(enriched);
    await handleSaveLiveExcelRows(enriched);
  };

  const handleAddBlankExcelRow = () => {
    const defSubCode =
      excelSubjectFilter !== 'ALL'
        ? excelSubjectFilter
        : activeAnswerKey?.subjectCode || '23GET701';
    const defSubName =
      activeAnswerKey?.subjectName || 'Human Values and Ethics';
    const newRow = recomputeLiveExcelRow({
      sheetId: `AS-XLS-${Date.now()}`,
      sno: excelRows.length + 1,
      registerNo: '',
      studentName: '',
      subjectCode: defSubCode,
      subjectName: defSubName,
      q1: null,
      q2: null,
      q3: null,
      q4: null,
      q5: null,
      q6Choice: '',
      q6: null,
      q7Choice: '',
      q7: null,
      q8Choice: '',
      q8: null,
      attendedQuestions: 'None',
      totalMarks: 0,
      maxMarks: 50,
      percentage: 0,
      grade: 'RA',
      resultStatus: 'RA',
      confidenceScore: 100,
      status: 'mapped',
      scannedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
    setExcelRows((prev) => [newRow, ...prev]);
    setExcelDirty(true);
  };

  // Department-filtered students
  const deptStudents = students.filter((s) => {
    if (activeDept !== 'ALL' && s.department !== activeDept) return false;
    if (deptFilter !== 'all' && s.department !== deptFilter) return false;
    return true;
  });

  // Year & Class Filtered Students
  const classStudents = deptStudents.filter((s) => {
    if (s.year !== selectedYear) return false;
    if (selectedClass !== 'ALL' && s.section !== selectedClass) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      return (
        s.name.toLowerCase().includes(q) ||
        s.registerNo.includes(q) ||
        s.rollNo.toLowerCase().includes(q)
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

  // Metrics across all sheets
  const totalCount = answerSheets.length;
  const mappedCount = answerSheets.filter((s) => s.status === 'mapped').length;
  const pendingCount = answerSheets.filter((s) => s.status === 'pending').length;
  const conflictCount = answerSheets.filter((s) => s.status === 'conflict').length;

  // Filtered Sheets for "all-scans" tab
  const filteredSheets = answerSheets.filter((sheet) => {
    const matchesStatus = statusFilter === 'all' || sheet.status === statusFilter;
    const matchesDept = deptFilter === 'all' || sheet.department === deptFilter;
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !query ||
      sheet.studentName.toLowerCase().includes(query) ||
      sheet.registerNo.includes(query) ||
      sheet.barcode.toLowerCase().includes(query) ||
      sheet.dummyNumber.toLowerCase().includes(query) ||
      sheet.subjectCode.toLowerCase().includes(query) ||
      sheet.subjectName.toLowerCase().includes(query);

    return matchesStatus && matchesDept && matchesSearch;
  });

  // Retest Attending Students List (<30/50 or <60/100) computed automatically from scanned & Live Excel sheets
  const retestEntries = React.useMemo(
    () => collectRetestStudentsFromAnswerSheets(answerSheets, students),
    [answerSheets, students]
  );
  const evaluatedSheetCount = React.useMemo(
    () => answerSheets.filter((s) => s.marksObtained !== undefined).length,
    [answerSheets]
  );

  // Status resolution
  const handleResolveStatus = (sheet: AnswerSheet, newStatus: SheetStatus) => {
    const updated: AnswerSheet = {
      ...sheet,
      status: newStatus,
      confidenceScore: newStatus === 'mapped' ? 100 : sheet.confidenceScore,
      verifiedBy: session?.fullName || 'COE Verified',
      conflictReason: newStatus === 'mapped' ? undefined : sheet.conflictReason
    };
    onUpdateSheet(updated);
    setSelectedSheet(updated);
  };

  // Quick Map Script to Student
  const handleOpenMapScriptModal = (student: StudentProfile) => {
    setMappingStudentTarget(student);
    setNewDummyNo(`DM-${Math.floor(88500 + Math.random() * 400)}`);
  };

  const handleSaveQuickMapScript = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingStudentTarget) return;

    const newScan: AnswerSheet = {
      id: `AS-MAP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      barcode: `VSB24AUT-${newSubjectCode}-${mappingStudentTarget.registerNo}`,
      dummyNumber: newDummyNo.trim() || `DM-${Math.floor(88500 + Math.random() * 400)}`,
      packetNumber: `PKT-${mappingStudentTarget.department}-${mappingStudentTarget.section}`,
      registerNo: mappingStudentTarget.registerNo,
      studentName: mappingStudentTarget.name,
      department: mappingStudentTarget.department,
      semester: mappingStudentTarget.semester,
      subjectCode: newSubjectCode,
      subjectName: newSubjectName,
      examDate: '2026-08-16',
      session: 'FN',
      totalPagesScanned: 32,
      status: 'mapped',
      confidenceScore: 100.0,
      scannedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      evaluatorId: 'EVAL-FACULTY',
      verifiedBy: session?.fullName || 'COE Verified'
    };

    onAddSheet(newScan);
    setMappingStudentTarget(null);
    confetti({ particleCount: 35, spread: 45 });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Title & Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-950 border border-indigo-700/50 text-indigo-400">
              <QrCode className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Answer Sheet Scanning & Evaluation Center
            </h1>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Scan answer scripts live via device camera (mobile rear lens or webcam) with automatic OCR Register No. lookup and AI rubric marking
          </p>
        </div>

        {/* Camera Lens Scan + Upload Fallback Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setLensInitialMode('camera');
              setLensOpen(true);
            }}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#781717] hover:bg-[#5e1111] text-white font-black text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Scan Answer Sheet (Camera)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLensInitialMode('upload');
              setLensOpen(true);
            }}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-4 h-4 text-indigo-700 shrink-0" />
            <span>Upload Photo / PDF</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          ACTIVE ANSWER KEY & MARKING SCHEME CONFIGURATION BAR
         ======================================================== */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-[#781717] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <div className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Active Valuation Answer Key & Marking Scheme
            </div>
            <p className="text-[11px] text-slate-500">
              {activeAnswerKey
                ? `${activeAnswerKey.subjectCode} · ${activeAnswerKey.subjectName} · ${activeAnswerKey.questions.length} Questions · Max ${activeAnswerKey.maximumMarks} Marks`
                : 'No Answer Key attached — Auto VSBEC Valuation (50M / 100M) ready to scan & grade immediately'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={activeAnswerKey?.id || ''}
            onChange={(e) => setSelectedKeyId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#781717] cursor-pointer max-w-full sm:max-w-xs"
          >
            {answerKeys.length === 0 ? (
              <option value="">Auto VSBEC Scheme (No Key Needed)</option>
            ) : (
              answerKeys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.subjectCode} — {k.examTitle || k.examCategory} ({k.maximumMarks}M · {k.questions.length} Qs)
                </option>
              ))
            )}
          </select>

          <select
            value={examSession}
            onChange={(e) => setExamSession(e.target.value as 'FN' | 'AN')}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 cursor-pointer"
          >
            <option value="FN">Session: FN</option>
            <option value="AN">Session: AN</option>
          </select>
        </div>
      </div>

      {/* ========================================================
          ACADEMIC SELECTION DROPDOWNS: YEAR, SEMESTER & CLASS
         ======================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-indigo-50/80 rounded-2xl border border-indigo-200">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-indigo-900 text-white text-xs font-black flex items-center justify-center shrink-0">
              ✓
            </span>
            <div>
              <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide block">
                Answer Sheet Script Mapping Filters (AI&DS Dept)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Select Year, Semester, and Class Section from the dropdowns to access student scripts
              </span>
            </div>
          </div>

          <span className="text-xs font-bold text-indigo-700 font-mono shrink-0">
            Active: Year {selectedYear} • Sem 0{selectedSemester} • Class {selectedClass === 'ALL' ? 'All Classes' : `Sec ${selectedClass}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Year Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-700" />
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
            >
              <option value="I">Year I (Sem 1 & 2 • {yearCounts.I} Students)</option>
              <option value="II">Year II (Sem 3 & 4 • {yearCounts.II} Students)</option>
              <option value="III">Year III (Sem 5 & 6 • {yearCounts.III} Students)</option>
              <option value="IV">Year IV (Sem 7 & 8 • {yearCounts.IV} Students)</option>
            </select>
          </div>

          {/* Semester Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-700" />
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 text-xs font-black text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
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
              <Layers className="w-3.5 h-3.5 text-indigo-700" />
              Class / Section Dropdown
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
            >
              <option value="ALL">All Classes in Year {selectedYear}</option>
              <option value="A">Section A (Class A)</option>
              <option value="B">Section B (Class B)</option>
              <option value="C">Section C (Class C)</option>
              <option value="D">Section D (Class D)</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs & Summary */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewTab('live-excel')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewTab === 'live-excel'
                ? 'bg-[#781717] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
            <span>Live Excel Marks Sheet (.xlsx)</span>
            <span className="px-1.5 py-0.2 rounded bg-white/20 text-white text-[10px] font-mono">
              {excelRows.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('retest-list')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewTab === 'retest-list'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-rose-800 bg-rose-50/70 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <UserX className="w-3.5 h-3.5 shrink-0" />
            <span>Retest Attending List</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                viewTab === 'retest-list'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-200 text-rose-900'
              }`}
            >
              {retestEntries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('students-mapping')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewTab === 'students-mapping'
                ? 'bg-[#781717] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5 text-amber-300" />
            <span>Class Roster Mapping</span>
            <span className="px-1.5 py-0.2 rounded bg-white/20 text-white text-[10px] font-mono">
              {classStudents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('all-scans')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              viewTab === 'all-scans'
                ? 'bg-[#781717] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Barcode className="w-3.5 h-3.5 text-amber-300" />
            <span>Scanned Booklets Log</span>
            <span className="px-1.5 py-0.2 rounded bg-white/20 text-white text-[10px] font-mono">
              {totalCount}
            </span>
          </button>
        </div>

        {/* Search within Current View */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student or register no..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Instant Retest Alert Strip for Easy Staff Access right after Scanning */}
      {retestEntries.length > 0 && viewTab !== 'retest-list' && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5 text-rose-950 font-bold">
            <UserX className="w-4 h-4 text-rose-700 shrink-0" />
            <span>
              Retest Attending Students Identified: <strong>{retestEntries.length}</strong> candidate{retestEntries.length === 1 ? '' : 's'} below passing criteria (&lt;30/50 or &lt;60/100)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => exportRetestListToExcel(retestEntries, 'Retest_Attending_Students_List')}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Export Retest .xlsx</span>
            </button>
            <button
              type="button"
              onClick={() => setViewTab('retest-list')}
              className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-[11px] cursor-pointer"
            >
              Open Retest List ({retestEntries.length})
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 0: LIVE EDITABLE EXCEL MARKS SHEET (.XLSX)
         ======================================================== */}
      {viewTab === 'live-excel' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <input
            ref={excelImportInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportExcelFile}
            className="hidden"
          />

          <div className="px-5 py-4 border-b border-slate-200 bg-[#FAF7F2] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-[#781717] flex items-center gap-2 flex-wrap">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Live Editable Evaluation Excel Sheet (Q1–5: 2M · Q6a/b: 8M · Q7a/b: 16M · Q8a/b: 16M)</span>
                {excelDirty && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold">
                    Unsaved Edits
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Scanned sheets appear here immediately. Edit marks inline without rescanning — totals &amp; grades recalculate live.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={excelSubjectFilter}
                onChange={(e) => setExcelSubjectFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 cursor-pointer"
              >
                <option value="ALL">All Subjects</option>
                {Array.from(
                  new Set([
                    ...answerKeys.map((k) => k.subjectCode),
                    ...answerSheets.map((s) => s.subjectCode)
                  ])
                )
                  .filter(Boolean)
                  .map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
              </select>

              <button
                type="button"
                onClick={handleAddBlankExcelRow}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add Row</span>
              </button>

              <button
                type="button"
                onClick={() => excelImportInputRef.current?.click()}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span>Import .xlsx</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportLiveExcelWorkbook(
                    excelRows,
                    excelSubjectFilter === 'ALL'
                      ? activeAnswerKey?.subjectCode || 'ALL'
                      : excelSubjectFilter
                  )
                }
                disabled={excelRows.length === 0}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Download .xlsx</span>
              </button>

              <button
                type="button"
                disabled={excelSaving || excelRows.length === 0}
                onClick={() => handleSaveLiveExcelRows(excelRows)}
                className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#781717] hover:bg-[#5e1111] disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>{excelSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          {excelBanner && (
            <div
              className={`px-5 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
                excelBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <span>{excelBanner.text}</span>
              <button
                type="button"
                onClick={() => setExcelBanner(null)}
                className="text-xs underline ml-3 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="overflow-x-auto max-h-[65vh]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-mono text-[10px] border-b border-slate-300 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-2.5 border-r border-slate-200 text-center">S.No</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[130px]">Register No</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[155px]">Student Name</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-200">Subj</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-200 min-w-[135px]">Attended Qs</th>
                  <th className="py-2.5 px-1.5 border-r border-slate-200 text-center">Q1 (2)</th>
                  <th className="py-2.5 px-1.5 border-r border-slate-200 text-center">Q2 (2)</th>
                  <th className="py-2.5 px-1.5 border-r border-slate-200 text-center">Q3 (2)</th>
                  <th className="py-2.5 px-1.5 border-r border-slate-200 text-center">Q4 (2)</th>
                  <th className="py-2.5 px-1.5 border-r border-slate-200 text-center">Q5 (2)</th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-center min-w-[110px]">Q6 a/b (8)</th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-center min-w-[110px]">Q7 a/b (16)</th>
                  <th className="py-2.5 px-2 border-r border-slate-200 text-center min-w-[110px]">Q8 a/b (16)</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-200 text-center">Total /50</th>
                  <th className="py-2.5 px-2 text-center">Grade</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 font-mono">
                {excelRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="text-center py-12 font-sans text-slate-500">
                      <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-700">No evaluated sheets in this staff workspace yet.</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Click &ldquo;Scan Answer Sheet (Camera)&rdquo; or &ldquo;Upload Photo / PDF&rdquo; above to scan &amp; auto-populate the Live Excel grid.
                      </p>
                    </td>
                  </tr>
                ) : null}
                {excelRows
                  .filter((r) => {
                    const q = searchTerm.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      r.registerNo.toLowerCase().includes(q) ||
                      r.studentName.toLowerCase().includes(q) ||
                      r.subjectCode.toLowerCase().includes(q)
                    );
                  })
                  .map((row) => {
                    const realIdx = excelRows.findIndex((x) => x.sheetId === row.sheetId);
                    const parseCellMark = (v: string): number | null =>
                      v.trim() === '' ? null : parseFloat(v);

                    return (
                      <tr
                        key={row.sheetId}
                        className={`hover:bg-amber-50/40 transition-colors ${
                          row.isDuplicate ? 'bg-red-50/70' : ''
                        }`}
                      >
                        <td className="py-2 px-2.5 border-r border-slate-200 text-center font-bold text-slate-600 tabular-nums">
                          {realIdx + 1}
                        </td>

                        <td className="py-1.5 px-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.registerNo}
                            onChange={(e) =>
                              handleExcelCellChange(realIdx, { registerNo: e.target.value })
                            }
                            placeholder="922523243..."
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#781717]"
                          />
                          {row.isDuplicate && (
                            <span className="text-[9px] text-red-700 font-sans font-bold block mt-0.5">
                              Duplicate RegNo
                            </span>
                          )}
                        </td>

                        <td className="py-1.5 px-2 border-r border-slate-200 font-sans">
                          <input
                            type="text"
                            value={row.studentName}
                            onChange={(e) =>
                              handleExcelCellChange(realIdx, { studentName: e.target.value })
                            }
                            placeholder="Candidate Name"
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#781717]"
                          />
                        </td>

                        <td className="py-2 px-2.5 border-r border-slate-200 text-[11px] font-bold text-slate-700">
                          {row.subjectCode}
                        </td>

                        <td className="py-2 px-2.5 border-r border-slate-200 text-[11px] text-slate-700 font-sans font-semibold">
                          {row.attendedQuestions}
                        </td>

                        {(['q1', 'q2', 'q3', 'q4', 'q5'] as const).map((field) => (
                          <td key={field} className="py-1.5 px-1 border-r border-slate-200 text-center">
                            <input
                              type="number"
                              min={0}
                              max={2}
                              step={0.5}
                              value={row[field] ?? ''}
                              placeholder="-"
                              onChange={(e) =>
                                handleExcelCellChange(realIdx, {
                                  [field]: parseCellMark(e.target.value)
                                } as Partial<LiveExcelMarkRow>)
                              }
                              className="w-12 px-1 py-1 text-center rounded border border-slate-200 bg-white text-xs font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-[#781717]"
                            />
                          </td>
                        ))}

                        {/* Q6 Choice + Marks (max 8) */}
                        <td className="py-1.5 px-1.5 border-r border-slate-200">
                          <div className="flex items-center justify-center gap-1">
                            <select
                              value={row.q6Choice}
                              onChange={(e) => {
                                const ch = e.target.value as 'a' | 'b' | '';
                                handleExcelCellChange(realIdx, {
                                  q6Choice: ch,
                                  q6: ch ? (row.q6 ?? 0) : null
                                });
                              }}
                              className="px-1 py-1 rounded border border-slate-200 bg-slate-50 text-[11px] font-bold cursor-pointer"
                            >
                              <option value="">-</option>
                              <option value="a">6a</option>
                              <option value="b">6b</option>
                            </select>
                            <input
                              type="number"
                              min={0}
                              max={8}
                              step={0.5}
                              value={row.q6 ?? ''}
                              placeholder="-"
                              onChange={(e) => {
                                const val = parseCellMark(e.target.value);
                                handleExcelCellChange(realIdx, {
                                  q6: val,
                                  q6Choice: val !== null ? (row.q6Choice || 'a') : ''
                                });
                              }}
                              className="w-12 px-1 py-1 text-center rounded border border-slate-200 bg-white text-xs font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-[#781717]"
                            />
                          </div>
                        </td>

                        {/* Q7 Choice + Marks (max 16) */}
                        <td className="py-1.5 px-1.5 border-r border-slate-200">
                          <div className="flex items-center justify-center gap-1">
                            <select
                              value={row.q7Choice}
                              onChange={(e) => {
                                const ch = e.target.value as 'a' | 'b' | '';
                                handleExcelCellChange(realIdx, {
                                  q7Choice: ch,
                                  q7: ch ? (row.q7 ?? 0) : null
                                });
                              }}
                              className="px-1 py-1 rounded border border-slate-200 bg-slate-50 text-[11px] font-bold cursor-pointer"
                            >
                              <option value="">-</option>
                              <option value="a">7a</option>
                              <option value="b">7b</option>
                            </select>
                            <input
                              type="number"
                              min={0}
                              max={16}
                              step={0.5}
                              value={row.q7 ?? ''}
                              placeholder="-"
                              onChange={(e) => {
                                const val = parseCellMark(e.target.value);
                                handleExcelCellChange(realIdx, {
                                  q7: val,
                                  q7Choice: val !== null ? (row.q7Choice || 'a') : ''
                                });
                              }}
                              className="w-12 px-1 py-1 text-center rounded border border-slate-200 bg-white text-xs font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-[#781717]"
                            />
                          </div>
                        </td>

                        {/* Q8 Choice + Marks (max 16) */}
                        <td className="py-1.5 px-1.5 border-r border-slate-200">
                          <div className="flex items-center justify-center gap-1">
                            <select
                              value={row.q8Choice}
                              onChange={(e) => {
                                const ch = e.target.value as 'a' | 'b' | '';
                                handleExcelCellChange(realIdx, {
                                  q8Choice: ch,
                                  q8: ch ? (row.q8 ?? 0) : null
                                });
                              }}
                              className="px-1 py-1 rounded border border-slate-200 bg-slate-50 text-[11px] font-bold cursor-pointer"
                            >
                              <option value="">-</option>
                              <option value="a">8a</option>
                              <option value="b">8b</option>
                            </select>
                            <input
                              type="number"
                              min={0}
                              max={16}
                              step={0.5}
                              value={row.q8 ?? ''}
                              placeholder="-"
                              onChange={(e) => {
                                const val = parseCellMark(e.target.value);
                                handleExcelCellChange(realIdx, {
                                  q8: val,
                                  q8Choice: val !== null ? (row.q8Choice || 'a') : ''
                                });
                              }}
                              className="w-12 px-1 py-1 text-center rounded border border-slate-200 bg-white text-xs font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-[#781717]"
                            />
                          </div>
                        </td>

                        {/* Live Recalculated Total */}
                        <td className="py-2 px-2.5 border-r border-slate-200 text-center font-black text-[#781717] tabular-nums">
                          {row.totalMarks} / {row.maxMarks || 50}
                        </td>

                        <td className="py-2 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              row.resultStatus === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {row.grade} ({row.resultStatus === 'PASS' ? 'PASS' : 'RETEST'})
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 0B: RETEST ATTENDING STUDENTS LIST (<30/50 OR <60/100)
         ======================================================== */}
      {viewTab === 'retest-list' && (
        <RetestStudentsPanel
          entries={retestEntries}
          totalEvaluatedCount={evaluatedSheetCount}
          title="Retest Attending Students List (From Answer Sheet Scans & Live Excel)"
          subtitle="Pass criteria: >= 30 / 50 marks (or >= 60 / 100 marks). All students scoring below are listed automatically."
          emptyActionHint="Scan answer sheets or upload Live Excel marks to generate the Retest Attending Students List."
        />
      )}

      {/* ========================================================
          TAB 1: CLASS STUDENTS & SCRIPT MAPPING ROSTER (STUDENT ACCESS)
         ======================================================== */}
      {viewTab === 'students-mapping' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>Class Roster: Year {selectedYear} • Class {selectedClass}</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  {classStudents.length} Students Enrolled
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Update student details and map anonymous answer booklet dummy numbers for valuation
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Mapped: {classStudents.filter((st) => answerSheets.some((sh) => sh.registerNo === st.registerNo && sh.status === 'mapped')).length}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Unmapped: {classStudents.filter((st) => !answerSheets.some((sh) => sh.registerNo === st.registerNo)).length}</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-600 uppercase tracking-wider font-mono text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Register & Roll No</th>
                  <th className="py-3 px-4">Student Candidate</th>
                  <th className="py-3 px-4">Academic Specs</th>
                  <th className="py-3 px-4">Mapped Dummy ID</th>
                  <th className="py-3 px-4">Subject & Barcode</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-700">No students found in Year {selectedYear} - Class {selectedClass}.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Select another year or class from the selector above, or add students in Student Registry.</p>
                    </td>
                  </tr>
                ) : (
                  classStudents.map((student) => {
                    const studentSheet = answerSheets.find((sh) => sh.registerNo === student.registerNo);
                    const isMapped = studentSheet?.status === 'mapped';
                    const isPending = studentSheet?.status === 'pending';
                    const isConflict = studentSheet?.status === 'conflict';

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Register & Roll No */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900 block">
                            {student.registerNo}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {student.rollNo}
                          </span>
                        </td>

                        {/* Student Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{student.name}</div>
                          <div className="text-[10px] text-slate-500">
                            {student.gender || 'Candidate'} • Parent: {student.parentName}
                          </div>
                        </td>

                        {/* Specs */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-700">
                            {student.department} • Sec {student.section}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            CGPA: <strong className="text-indigo-600">{student.cgpa.toFixed(2)}</strong> • Attd: {student.attendancePercentage}%
                          </div>
                        </td>

                        {/* Mapped Dummy */}
                        <td className="py-3 px-4">
                          {studentSheet ? (
                            <span className="font-mono font-black text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 block text-center">
                              {studentSheet.dummyNumber}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Pending Mapping
                            </span>
                          )}
                        </td>

                        {/* Subject & Barcode / Evaluated Marks */}
                        <td className="py-3 px-4">
                          {studentSheet ? (
                            <div>
                              <span className="font-bold text-slate-800 block text-[11px]">
                                {studentSheet.subjectCode} - {studentSheet.subjectName}
                              </span>
                              {studentSheet.marksObtained !== undefined ? (
                                <span className="font-mono text-[11px] font-black text-[#781717] tabular-nums block">
                                  Scored: {studentSheet.marksObtained}/{studentSheet.maxMarks || 50} ({studentSheet.grade || 'PASS'})
                                </span>
                              ) : (
                                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px] block">
                                  {studentSheet.barcode}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Booklet not yet scanned
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {studentSheet ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-mono ${
                                isMapped
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isPending
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              {isMapped && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                              {isConflict && <AlertTriangle className="w-3 h-3 text-red-600" />}
                              <span>{studentSheet.status}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                              Not Mapped
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Update Student Details */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStudent(student);
                                setIsEditStudentModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-all text-[11px] cursor-pointer"
                              title="Update Student Details"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Update Details</span>
                            </button>

                            {/* Map or Inspect Script */}
                            {studentSheet ? (
                              <button
                                type="button"
                                onClick={() => setSelectedSheet(studentSheet)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all text-[11px] cursor-pointer"
                                title="Inspect Mapped Script"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenMapScriptModal(student)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-all text-[11px] cursor-pointer"
                                title="Map Answer Script"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Map Script</span>
                              </button>
                            )}
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
      )}

      {/* ========================================================
          TAB 2: ALL SCANNED BOOKLETS STREAM
         ======================================================== */}
      {viewTab === 'all-scans' && (
        <div className="space-y-4">
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Total Scanned Scripts</span>
                <Barcode className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">{totalCount}</div>
              <div className="text-[11px] text-slate-500 mt-1">Autonomous 32-page scripts</div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-emerald-600 mb-1">
                <span>Mapped to Register No</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 font-mono">{mappedCount}</div>
              <div className="text-[11px] text-emerald-600/80 mt-1">Verified & decryptable</div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-amber-600 mb-1">
                <span>Pending Review</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 font-mono">{pendingCount}</div>
              <div className="text-[11px] text-amber-600/80 mt-1">Minor OMR blur / jitter</div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs text-red-600 mb-1">
                <span>Detected Conflicts</span>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-black text-red-700 font-mono">{conflictCount}</div>
              <div className="text-[11px] text-red-600/80 mt-1">Requires COE signoff</div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-mono text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Dummy / Barcode</th>
                    <th className="py-3 px-4">Register No & Student</th>
                    <th className="py-3 px-4">Department & Subject</th>
                    <th className="py-3 px-4 text-center">Pages / Packet</th>
                    <th className="py-3 px-4 text-center">Confidence</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredSheets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        No answer scripts matched the specified search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSheets.map((sheet) => {
                      const isMapped = sheet.status === 'mapped';
                      const isPending = sheet.status === 'pending';
                      const isConflict = sheet.status === 'conflict';

                      return (
                        <tr key={sheet.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-indigo-700 block">
                              {sheet.dummyNumber}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 truncate block max-w-[140px]">
                              {sheet.barcode}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{sheet.studentName}</span>
                            <span className="font-mono text-slate-500">{sheet.registerNo}</span>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">{sheet.subjectCode}</span>
                            {sheet.marksObtained !== undefined ? (
                              <span className="font-mono text-[11px] font-black text-[#781717] tabular-nums">
                                Marks: {sheet.marksObtained}/{sheet.maxMarks || 50} · {sheet.grade || ''}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">{sheet.department} • Sem {sheet.semester}</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="text-slate-800 font-mono font-bold tabular-nums">{sheet.totalPagesScanned} Pgs</span>
                            <span className="text-[10px] text-slate-400 block">{sheet.packetNumber}</span>
                          </td>

                          <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700 tabular-nums">
                            {sheet.confidenceScore}%
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-mono ${
                                isMapped
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isPending
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              {isMapped && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                              {isConflict && <AlertTriangle className="w-3 h-3 text-red-600" />}
                              <span>{sheet.status}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedSheet(sheet)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-indigo-700 font-bold text-xs transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: STUDENT DETAILS UPDATE (USING SHARED StudentEditModal)
         ======================================================== */}
      {isEditStudentModalOpen && editingStudent && (
        <StudentEditModal
          student={editingStudent}
          isOpen={isEditStudentModalOpen}
          onClose={() => {
            setIsEditStudentModalOpen(false);
            setEditingStudent(null);
          }}
          onSave={(updated) => {
            if (onUpdateStudent) {
              onUpdateStudent(updated);
            }
            setIsEditStudentModalOpen(false);
            setEditingStudent(null);
            confetti({ particleCount: 30, spread: 40 });
          }}
        />
      )}

      {/* ========================================================
          MODAL: QUICK MAP SCRIPT TO STUDENT
         ======================================================== */}
      <AnimatePresence>
        {mappingStudentTarget && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Map Script to Candidate</h3>
                    <p className="text-[11px] text-slate-500">Autonomous OMR Decoupling</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMappingStudentTarget(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveQuickMapScript} className="space-y-3.5">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div className="font-bold text-slate-900">{mappingStudentTarget.name}</div>
                  <div className="text-slate-500 font-mono mt-0.5">
                    Reg: {mappingStudentTarget.registerNo} • {mappingStudentTarget.department} Year {mappingStudentTarget.year}-{mappingStudentTarget.section}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Anonymous Dummy ID
                  </label>
                  <input
                    type="text"
                    required
                    value={newDummyNo}
                    onChange={(e) => setNewDummyNo(e.target.value)}
                    placeholder="e.g. DM-88490"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Subject Code
                    </label>
                    <input
                      type="text"
                      required
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Subject Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMappingStudentTarget(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Script Mapping</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sheet Inspection Drawer / Modal */}
      <AnimatePresence>
        {selectedSheet && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Top gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedSheet(null)}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {selectedSheet.dummyNumber}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {selectedSheet.packetNumber}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    Booklet Verification & OMR Audit
                  </h3>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800/80 mb-6">
                <div>
                  <span className="text-slate-500 font-medium">Candidate Name:</span>
                  <div className="text-white font-bold text-sm mt-0.5">{selectedSheet.studentName}</div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Register Number:</span>
                  <div className="text-amber-400 font-mono font-bold text-sm mt-0.5">
                    {selectedSheet.registerNo}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Subject Code & Name:</span>
                  <div className="text-slate-200 font-medium mt-0.5">
                    <span className="font-mono font-bold text-indigo-300">{selectedSheet.subjectCode}</span> -{' '}
                    {selectedSheet.subjectName}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Department & Semester:</span>
                  <div className="text-slate-200 font-semibold mt-0.5">
                    {selectedSheet.department} (Semester {selectedSheet.semester} - Autonomous)
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Scan Timestamp:</span>
                  <div className="text-slate-400 font-mono mt-0.5">{selectedSheet.scannedAt}</div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">OCR Confidence:</span>
                  <div className="text-emerald-400 font-mono font-bold mt-0.5">
                    {selectedSheet.confidenceScore}% (32/32 Pages Checked)
                  </div>
                </div>
              </div>

              {/* Barcode visual preview simulation */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center mb-6">
                <div className="text-[10px] text-slate-500 font-mono mb-1">OPTICAL 2D MATRIX PAYLOAD</div>
                <div className="font-mono text-xs font-bold text-indigo-300 tracking-widest break-all">
                  {selectedSheet.barcode}
                </div>
              </div>

              {/* Evaluated Marks & Question Breakdown (when captured via Camera OCR / AI) */}
              {selectedSheet.marksObtained !== undefined && (
                <div className="mb-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wide">
                      Verified Evaluation Breakdown
                    </span>
                    <div className="flex items-center gap-2 font-mono text-xs font-black tabular-nums">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                        Total: {selectedSheet.marksObtained} / {selectedSheet.maxMarks || 50}
                      </span>
                      {selectedSheet.grade && (
                        <span className="px-2 py-1 rounded-lg bg-slate-800 text-white">
                          Grade {selectedSheet.grade} · {selectedSheet.resultStatus || 'PASS'}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedSheet.capturedImageDataUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/50">
                      <img
                        src={selectedSheet.capturedImageDataUrl}
                        alt="Evaluated Sheet Preview"
                        className="max-h-40 w-full object-contain"
                      />
                    </div>
                  )}

                  {Array.isArray(selectedSheet.questionEvaluations) &&
                    selectedSheet.questionEvaluations.length > 0 && (
                      <div className="max-h-44 overflow-y-auto divide-y divide-slate-800 text-xs">
                        {selectedSheet.questionEvaluations.map((qe, idx) => (
                          <div
                            key={`${qe.questionNo}-${idx}`}
                            className="py-2 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-indigo-300 mr-2">
                                Q{qe.subDivision || qe.questionNo}
                              </span>
                              <span className="text-slate-300 truncate">{qe.questionText}</span>
                            </div>
                            <span className="font-mono font-bold text-amber-300 shrink-0 tabular-nums">
                              {qe.attempted ? `${qe.marksAwarded}/${qe.maxMarks}` : 'Not Attempted'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* Conflict notice if any */}
              {selectedSheet.conflictReason && (
                <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700/60 text-red-200 text-xs mb-6 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Flagged Issue:</div>
                    <div>{selectedSheet.conflictReason}</div>
                  </div>
                </div>
              )}

              {/* Manual Override Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleResolveStatus(selectedSheet, 'conflict')}
                  className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-700/50 text-red-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Flag Conflict
                </button>

                <button
                  onClick={() => handleResolveStatus(selectedSheet, 'pending')}
                  className="px-4 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-700/50 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Mark Pending Review
                </button>

                <button
                  onClick={() => {
                    handleResolveStatus(selectedSheet, 'mapped');
                    confetti({ particleCount: 40, spread: 50 });
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Lock Mapping</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Lens Camera & AI Evaluation Modal */}
      <AnswerSheetLensModal
        isOpen={lensOpen}
        initialMode={lensInitialMode}
        onClose={() => setLensOpen(false)}
        selectedAnswerKey={activeAnswerKey}
        answerKeys={answerKeys}
        onSelectAnswerKey={(key) => setSelectedKeyId(key.id)}
        students={students}
        existingSheets={answerSheets}
        session={session}
        examSession={examSession}
        onSaveEvaluationResult={async (savedSheet) => {
          if (onSaveEvaluationResult) {
            await onSaveEvaluationResult(savedSheet);
          } else {
            onAddSheet(savedSheet);
          }
          setViewTab('live-excel');
          setExcelBanner({
            type: 'success',
            text: `Synced ${savedSheet.studentName} (${savedSheet.registerNo}) · ${savedSheet.marksObtained ?? 0}/${savedSheet.maxMarks || 50} marks directly into Live Excel Sheet.`
          });
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        }}
      />
    </div>
  );
};
