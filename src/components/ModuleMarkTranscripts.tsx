import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Upload,
  Search,
  Award,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
  FileText,
  Edit3,
  Save,
  Plus,
  TrendingUp,
  Percent,
  RefreshCw,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  CheckCheck,
  Sparkles,
  Users,
  BookOpen,
  FileUp,
  Trash2,
  BookmarkCheck,
  Lock,
  Unlock,
  Eye,
  ArrowRight,
  ArrowLeft,
  Layers,
  ClipboardList,
  Info,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import {
  MarkRecord,
  SubjectScore,
  DepartmentCode,
  UserSession,
  StudentProfile,
  StudentTestMark,
  TeacherAllocation,
  TestWindowConfig,
  ClassMarkStatementDoc,
  ClassMarkStatementRow,
  SavedCustomTemplate,
  StaffAccount
} from '../types';
import { DEPARTMENT_SUBJECTS } from '../data/departmentSubjectsData';
import {
  downloadMarkStatementTemplate,
  parseMarkStatementExcelFile
} from '../utils/excelMarksHelper';
import { triggerFileDownload } from '../utils/wordDocumentService';
import {
  computeClassStatementStats,
  computeSubjectMarkGrade,
  buildEditableWordHtml,
  generateBlankFormAC09Docx,
  generateSampleCustomClassTemplateDocx,
  parseCustomClassTemplateFile,
  syncEditedWordHtmlToRows,
  generateClassMarkStatementDocx,
  generateClassMarkStatementPdf
} from '../utils/classMarkStatementDocx';
import { printHtmlDocument } from '../utils/printService';
import {
  getActiveStaffWorkspace,
  loadStatementsForStaff,
  saveStatementsForStaff,
  loadCustomTemplatesForStaff,
  saveCustomTemplatesForStaff
} from '../utils/staffAuthService';

interface ModuleMarkTranscriptsProps {
  markRecords: MarkRecord[];
  students?: StudentProfile[];
  studentTestMarks?: StudentTestMark[];
  teacherAllocations?: TeacherAllocation[];
  testWindows?: TestWindowConfig[];
  staffAccounts?: StaffAccount[];
  onUpdateStudent?: (updatedStudent: StudentProfile) => void;
  onUpdateMarkRecord?: (updatedRecord: MarkRecord) => void;
  session?: UserSession;
}

export const ModuleMarkTranscripts: React.FC<ModuleMarkTranscriptsProps> = ({
  markRecords,
  students = [],
  studentTestMarks = [],
  teacherAllocations = [],
  testWindows = [],
  staffAccounts = [],
  onUpdateStudent,
  onUpdateMarkRecord,
  session
}) => {
  const isDeptUser = session && !session.isAdmin && session.department && session.department !== 'ALL';
  const activeDept: DepartmentCode = isDeptUser ? (session.department as DepartmentCode) : 'AI&DS';

  // Isolated Staff Workspace Scope (null = Global COE Admin, FAC-AIDS-xxx = Separate Staff Page)
  const staffWorkspace = getActiveStaffWorkspace(session, staffAccounts);
  const activeStaffId = staffWorkspace.staffId;
  const activeStaffName = staffWorkspace.staffName;
  const isStaffScoped = staffWorkspace.isScoped;

  // 1. Academic Filters (Whole Class + Subject)
  const [selectedYear, setSelectedYear] = useState<'I' | 'II' | 'III' | 'IV'>('III');
  const [selectedSemester, setSelectedSemester] = useState<number>(5);
  const [selectedClass, setSelectedClass] = useState<'A' | 'B' | 'C' | 'D' | 'ALL'>('A');
  const [academicYearLabel, setAcademicYearLabel] = useState<string>('2025-2026 (Autonomous)');
  const [selectedExamCategory, setSelectedExamCategory] = useState<string>(
    'Consolidated Semester (Internal + External)'
  );

  // Available subjects in AI&DS for the chosen semester
  const semesterSubjects = useMemo(() => {
    const fromSyllabus = (DEPARTMENT_SUBJECTS['AI&DS'] || []).filter(
      (s) => s.semester === selectedSemester
    );
    const fromAlloc = teacherAllocations
      .filter((a) => a.department === 'AI&DS' && (a.semester === selectedSemester || a.classYear === selectedYear))
      .map((a) => ({
        code: a.subjectCode,
        name: a.subjectName
      }));

    const map = new Map<string, { code: string; name: string }>();
    fromSyllabus.forEach((s) => map.set(s.code, { code: s.code, name: s.name }));
    fromAlloc.forEach((a) => map.set(a.code, { code: a.code, name: a.name }));
    const list = Array.from(map.values());
    return list.length > 0
      ? list
      : [{ code: 'AD3501', name: 'Deep Neural Networks & Architectures' }];
  }, [selectedSemester, selectedYear, teacherAllocations]);

  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('AD3501');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>(
    'Deep Neural Networks & Architectures'
  );

  // Keep selected subject valid when semester changes
  useEffect(() => {
    if (semesterSubjects.length > 0 && !semesterSubjects.some((s) => s.code === selectedSubjectCode)) {
      setSelectedSubjectCode(semesterSubjects[0].code);
      setSelectedSubjectName(semesterSubjects[0].name);
    }
  }, [selectedSemester, semesterSubjects]);

  // Matched Staff / Faculty for the selected subject & class
  const matchedAllocation = useMemo(() => {
    return (
      teacherAllocations.find(
        (a) =>
          a.department === 'AI&DS' &&
          (a.subjectCode === selectedSubjectCode || a.subjectName === selectedSubjectName) &&
          (a.semester === selectedSemester || a.classYear === selectedYear) &&
          (selectedClass === 'ALL' || a.section === selectedClass)
      ) ||
      teacherAllocations.find(
        (a) =>
          a.department === 'AI&DS' &&
          (a.subjectCode === selectedSubjectCode || a.subjectName === selectedSubjectName)
      )
    );
  }, [teacherAllocations, selectedSubjectCode, selectedSubjectName, selectedSemester, selectedYear, selectedClass]);

  const resolvedFacultyName =
    (isStaffScoped && activeStaffName ? activeStaffName : null) ||
    matchedAllocation?.teacherName ||
    session?.fullName ||
    'Allocated Course Faculty';

  // 2. Saved & Finalized Class Mark Statements (Strictly Partitioned per Staff ID)
  const loadedStaffIdRef = useRef<string | null>(activeStaffId);
  const [savedStatements, setSavedStatements] = useState<ClassMarkStatementDoc[]>(() =>
    loadStatementsForStaff(activeStaffId)
  );

  // Persist ONLY if currently hydrated state belongs to activeStaffId (prevents cross-staff overwrite races)
  useEffect(() => {
    if (loadedStaffIdRef.current === activeStaffId) {
      saveStatementsForStaff(activeStaffId, savedStatements);
    }
  }, [savedStatements]);

  // 3. Page Mode ('hub' overview vs 'studio' editor) & Workspace Tabs
  const [pageMode, setPageMode] = useState<'hub' | 'studio'>('hub');
  const [workspaceTab, setWorkspaceTab] = useState<'marks-table' | 'word-editor' | 'completion-tracker'>('word-editor');
  const [searchTerm, setSearchTerm] = useState('');

  // Hub Directory Filters & Readiness Matrix State
  const [hubFilterYear, setHubFilterYear] = useState<'ALL' | 'I' | 'II' | 'III' | 'IV'>('ALL');
  const [hubFilterSection, setHubFilterSection] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');
  const [hubFilterStatus, setHubFilterStatus] = useState<'ALL' | 'FINALIZED' | 'DRAFT'>('ALL');
  const [hubSearch, setHubSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [matrixYear, setMatrixYear] = useState<'I' | 'II' | 'III' | 'IV'>('III');
  const [matrixSemester, setMatrixSemester] = useState<number>(5);
  const [matrixSection, setMatrixSection] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [matrixExamCategory, setMatrixExamCategory] = useState<string>(
    'Consolidated Semester (Internal + External)'
  );

  // Template Selector State: 'default' (Form No. AC 09) vs 'custom'
  const [templateMode, setTemplateMode] = useState<'default' | 'custom'>('default');
  const [customTemplateName, setCustomTemplateName] = useState<string>('');
  const [customTemplateHtml, setCustomTemplateHtml] = useState<string>('');
  const [customPlaceholders, setCustomPlaceholders] = useState<string[]>([]);
  const [customTemplateError, setCustomTemplateError] = useState<string>('');
  const [isDraggingCustomTemplate, setIsDraggingCustomTemplate] = useState<boolean>(false);
  const customTemplateInputRef = useRef<HTMLInputElement>(null);

  const [savedCustomTemplates, setSavedCustomTemplates] = useState<SavedCustomTemplate[]>(() =>
    loadCustomTemplatesForStaff(activeStaffId)
  );

  useEffect(() => {
    if (loadedStaffIdRef.current === activeStaffId) {
      saveCustomTemplatesForStaff(activeStaffId, savedCustomTemplates);
    }
  }, [savedCustomTemplates]);

  // Re-hydrate isolated workspace completely whenever activeStaffId changes (zero cross-staff leakage)
  useEffect(() => {
    const freshStatements = loadStatementsForStaff(activeStaffId);
    const freshTemplates = loadCustomTemplatesForStaff(activeStaffId);
    loadedStaffIdRef.current = activeStaffId;
    setSavedStatements(freshStatements);
    setSavedCustomTemplates(freshTemplates);
    setTemplateMode('default');
    setCustomTemplateName('');
    setCustomTemplateHtml('');
    setCustomPlaceholders([]);
    setConfirmDeleteId(null);
    setPageMode('hub');
  }, [activeStaffId]);

  // Default Form No. AC 09 starts WITHOUT pre-filled values until user populates or edits manually
  const [populateValues, setPopulateValues] = useState<boolean>(false);

  // Word Editor States
  const [isWordEditing, setIsWordEditing] = useState<boolean>(true);
  const [editorHasManualEdits, setEditorHasManualEdits] = useState<boolean>(false);
  const wordEditorRef = useRef<HTMLDivElement>(null);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'info' | 'warning'; text: string } | null>(null);

  // Excel Template Modal State
  const [isTemplateUploadModalOpen, setIsTemplateUploadModalOpen] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateParsedRecords, setTemplateParsedRecords] = useState<any[]>([]);
  const [templateParseErrors, setTemplateParseErrors] = useState<string[]>([]);
  const [isParsingTemplate, setIsParsingTemplate] = useState(false);

  // Filter department students
  const deptStudents = useMemo(() => {
    return students.filter((s) => s.department === 'AI&DS');
  }, [students]);

  const yearCounts = useMemo(
    () => ({
      I: deptStudents.filter((s) => s.year === 'I').length,
      II: deptStudents.filter((s) => s.year === 'II').length,
      III: deptStudents.filter((s) => s.year === 'III').length,
      IV: deptStudents.filter((s) => s.year === 'IV').length
    }),
    [deptStudents]
  );

  const classStudents = useMemo(() => {
    return deptStudents
      .filter((s) => {
        if (s.year !== selectedYear) return false;
        if (selectedClass !== 'ALL' && s.section !== selectedClass) return false;
        return true;
      })
      .sort((a, b) => a.registerNo.localeCompare(b.registerNo));
  }, [deptStudents, selectedYear, selectedClass]);

  // Helper to build a deterministic statement key
  const currentStatementId = `CMS-${selectedYear}-${selectedSemester}-${selectedClass}-${selectedSubjectCode}-${selectedExamCategory.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}`;

  // Synthesize or Fetch Marks Rows for the selected Whole Class & Subject
  const fetchClassSubjectRows = (): ClassMarkStatementRow[] => {
    const isConsolidated =
      selectedExamCategory.toLowerCase().includes('consolidated') ||
      selectedExamCategory.toLowerCase().includes('semester');

    // Determine max marks from selected test window if applicable
    const matchedTestWindow = testWindows.find(
      (tw) => tw.testName === selectedExamCategory || tw.testCategory === selectedExamCategory
    );
    const maxMarks = matchedTestWindow ? matchedTestWindow.maxMarks : isConsolidated ? 100 : 50;

    return classStudents.map((stu, idx) => {
      // 1. Check uploaded test marks first
      const uploadedMark = studentTestMarks.find(
        (m) =>
          (m.registerNo === stu.registerNo || m.studentName.toLowerCase() === stu.name.toLowerCase()) &&
          (m.subjectCode.toUpperCase() === selectedSubjectCode.toUpperCase() ||
            m.subjectName.toLowerCase() === selectedSubjectName.toLowerCase()) &&
          (!matchedTestWindow || m.testName === matchedTestWindow.testName || m.testId === matchedTestWindow.id)
      );

      if (uploadedMark && !isConsolidated) {
        const computed = computeSubjectMarkGrade(
          uploadedMark.marksObtained,
          uploadedMark.maxMarks || maxMarks,
          uploadedMark.result === 'AB'
        );
        return {
          sno: idx + 1,
          registerNo: stu.registerNo,
          rollNo: stu.rollNo,
          studentName: stu.name,
          internalMarks: uploadedMark.marksObtained,
          externalMarks: 0,
          totalMarks: uploadedMark.marksObtained,
          maxMarks: uploadedMark.maxMarks || maxMarks,
          grade: uploadedMark.grade || computed.grade,
          gradePoints: computed.gradePoints,
          result: uploadedMark.result,
          remarks: uploadedMark.remarks || (computed.result === 'PASS' ? 'Verified' : 'Needs Improvement'),
          source: 'Uploaded Marks'
        };
      }

      // 2. Check existing markRecords for this student & subject
      const mr = markRecords.find(
        (m) => m.registerNo === stu.registerNo || m.studentName.toLowerCase() === stu.name.toLowerCase()
      );
      const mrSubject = mr?.subjects.find(
        (sub) =>
          sub.subjectCode.toUpperCase() === selectedSubjectCode.toUpperCase() ||
          sub.subjectName.toLowerCase() === selectedSubjectName.toLowerCase()
      );

      if (mrSubject) {
        const total = isConsolidated ? mrSubject.totalMarks : Math.min(maxMarks, Math.round((mrSubject.totalMarks / 100) * maxMarks));
        const computed = computeSubjectMarkGrade(total, maxMarks, mrSubject.result === 'AB');
        return {
          sno: idx + 1,
          registerNo: stu.registerNo,
          rollNo: stu.rollNo,
          studentName: stu.name,
          internalMarks: mrSubject.internalMarks,
          externalMarks: mrSubject.semesterMarks,
          totalMarks: total,
          maxMarks,
          grade: isConsolidated ? mrSubject.grade : computed.grade,
          gradePoints: isConsolidated ? mrSubject.gradePoints : computed.gradePoints,
          result: mrSubject.result,
          remarks: mrSubject.result === 'PASS' ? 'Promoted' : 'Re-appear',
          source: 'Transcript Ledger'
        };
      }

      // 3. Check any uploaded test mark even for consolidated mode to blend internal marks
      const anyTestMark = studentTestMarks.find(
        (m) =>
          m.registerNo === stu.registerNo &&
          m.subjectCode.toUpperCase() === selectedSubjectCode.toUpperCase()
      );

      const baseAvg = Math.round(((stu.iat1Average || 82) + (stu.iat2Average || 84)) / 2);
      const internal = anyTestMark
        ? Math.min(40, Math.round((anyTestMark.marksObtained / (anyTestMark.maxMarks || 50)) * 40))
        : Math.min(40, Math.round((baseAvg / 100) * 40));
      const external = Math.min(60, Math.round((baseAvg / 100) * 60));
      const total = isConsolidated
        ? internal + external
        : anyTestMark
        ? anyTestMark.marksObtained
        : Math.round((baseAvg / 100) * maxMarks);

      const isAb = anyTestMark?.result === 'AB';
      const computed = computeSubjectMarkGrade(total, maxMarks, isAb);

      return {
        sno: idx + 1,
        registerNo: stu.registerNo,
        rollNo: stu.rollNo,
        studentName: stu.name,
        internalMarks: isConsolidated ? internal : total,
        externalMarks: isConsolidated ? external : 0,
        totalMarks: total,
        maxMarks,
        grade: computed.grade,
        gradePoints: computed.gradePoints,
        result: computed.result,
        remarks: anyTestMark ? 'Synced from CIA' : computed.result === 'PASS' ? 'Cleared' : 'Arrear Risk',
        source: anyTestMark ? 'Uploaded Marks' : 'Draft / Editable'
      };
    });
  };

  // Active Working Document State — initializes cleanly as Blank Form No. AC 09 (without values)
  const [workingDoc, setWorkingDoc] = useState<ClassMarkStatementDoc>(() => {
    const initialRows = fetchClassSubjectRows();
    const isConsolidated =
      selectedExamCategory.toLowerCase().includes('consolidated') ||
      selectedExamCategory.toLowerCase().includes('semester');
    const matchedTw = testWindows.find(
      (tw) => tw.testName === selectedExamCategory || tw.testCategory === selectedExamCategory
    );
    const maxM = matchedTw ? matchedTw.maxMarks : isConsolidated ? 100 : 50;

    return {
      id: currentStatementId,
      department: 'AI&DS',
      academicYear: academicYearLabel,
      semesterType: selectedSemester % 2 === 0 ? 'EVEN' : 'ODD',
      year: selectedYear,
      semester: selectedSemester,
      section: selectedClass,
      subjectCode: selectedSubjectCode,
      subjectName: selectedSubjectName,
      facultyName: resolvedFacultyName,
      examTitle: selectedExamCategory,
      examCategory: selectedExamCategory,
      examDate: new Date().toISOString().slice(0, 10),
      regulation: 'R-2021 Autonomous (CBCS)',
      maxMarks: maxM,
      includeValues: false,
      templateMode: 'default',
      documentTitle: 'Marks Statement',
      documentSubtitle: 'Department of Artificial Intelligence & Data Science',
      headerNotes: '',
      footerNotes: '',
      preparedBy: resolvedFacultyName,
      hodName: 'HOD',
      coeName: 'Controller of Examinations',
      rows: initialRows,
      status: 'Draft',
      updatedAt: new Date().toISOString()
    };
  });

  // Live Word HTML State (synced to contentEditable container)
  const [wordHtml, setWordHtml] = useState<string>(() => buildEditableWordHtml(workingDoc));

  // Load saved statement or rebuild freshly whenever filters change
  useEffect(() => {
    const existingSaved = savedStatements.find(
      (s) =>
        s.year === selectedYear &&
        s.semester === selectedSemester &&
        s.section === selectedClass &&
        s.subjectCode === selectedSubjectCode &&
        s.examCategory === selectedExamCategory
    );

    if (existingSaved) {
      setWorkingDoc(existingSaved);
      setPopulateValues(existingSaved.includeValues ?? false);
      setTemplateMode(existingSaved.templateMode || 'default');
      if (existingSaved.customTemplateName) setCustomTemplateName(existingSaved.customTemplateName);
      if (existingSaved.customTemplateHtml) setCustomTemplateHtml(existingSaved.customTemplateHtml);
      const html = existingSaved.editedWordHtml || buildEditableWordHtml(existingSaved);
      setWordHtml(html);
      setEditorHasManualEdits(!!existingSaved.editedWordHtml);
      if (wordEditorRef.current) {
        wordEditorRef.current.innerHTML = html;
      }
    } else {
      const freshRows = fetchClassSubjectRows();
      const isConsolidated =
        selectedExamCategory.toLowerCase().includes('consolidated') ||
        selectedExamCategory.toLowerCase().includes('semester');
      const matchedTw = testWindows.find(
        (tw) => tw.testName === selectedExamCategory || tw.testCategory === selectedExamCategory
      );
      const maxM = matchedTw ? matchedTw.maxMarks : isConsolidated ? 100 : 50;

      const freshDoc: ClassMarkStatementDoc = {
        id: currentStatementId,
        department: 'AI&DS',
        academicYear: academicYearLabel,
        semesterType: selectedSemester % 2 === 0 ? 'EVEN' : 'ODD',
        year: selectedYear,
        semester: selectedSemester,
        section: selectedClass,
        subjectCode: selectedSubjectCode,
        subjectName: selectedSubjectName,
        facultyName: resolvedFacultyName,
        examTitle: selectedExamCategory,
        examCategory: selectedExamCategory,
        examDate: new Date().toISOString().slice(0, 10),
        regulation: 'R-2021 Autonomous (CBCS)',
        maxMarks: maxM,
        includeValues: populateValues,
        templateMode,
        customTemplateName: templateMode === 'custom' ? customTemplateName : undefined,
        customTemplateHtml: templateMode === 'custom' ? customTemplateHtml : undefined,
        documentTitle: 'Marks Statement',
        documentSubtitle: 'Department of Artificial Intelligence & Data Science',
        headerNotes: '',
        footerNotes: '',
        preparedBy: resolvedFacultyName,
        hodName: 'HOD',
        coeName: 'Controller of Examinations',
        rows: freshRows,
        status: 'Draft',
        updatedAt: new Date().toISOString()
      };
      setWorkingDoc(freshDoc);
      const html = buildEditableWordHtml(freshDoc);
      setWordHtml(html);
      setEditorHasManualEdits(false);
      if (wordEditorRef.current) {
        wordEditorRef.current.innerHTML = html;
      }
    }
  }, [
    activeStaffId,
    selectedYear,
    selectedSemester,
    selectedClass,
    selectedSubjectCode,
    selectedSubjectName,
    selectedExamCategory,
    students.length,
    studentTestMarks.length
  ]);

  // Keep DOM innerHTML in sync when switching back to word-editor tab or rebuilding template
  useEffect(() => {
    if (workspaceTab === 'word-editor' && wordEditorRef.current) {
      if (wordEditorRef.current.innerHTML !== wordHtml) {
        wordEditorRef.current.innerHTML = wordHtml;
      }
    }
  }, [workspaceTab, wordHtml]);

  // Rebuild Word HTML cleanly from structured doc state (when metadata, rows, or template changes)
  const rebuildWordFromDoc = (nextDoc: ClassMarkStatementDoc, showNotice?: string) => {
    const regeneratedHtml = buildEditableWordHtml(nextDoc);
    setWorkingDoc({ ...nextDoc, editedWordHtml: regeneratedHtml });
    setWordHtml(regeneratedHtml);
    setEditorHasManualEdits(false);
    if (wordEditorRef.current) {
      wordEditorRef.current.innerHTML = regeneratedHtml;
    }
    if (showNotice) {
      setStatusBanner({ type: 'info', text: showNotice });
      setTimeout(() => setStatusBanner(null), 4000);
    }
  };

  // Fetch RegNo, Name & Marks and Populate Form No. AC 09
  const handleRefetchClassMarks = () => {
    const freshRows = fetchClassSubjectRows();
    setPopulateValues(true);
    const updated: ClassMarkStatementDoc = {
      ...workingDoc,
      facultyName: resolvedFacultyName,
      preparedBy: workingDoc.preparedBy || resolvedFacultyName,
      includeValues: true,
      rows: freshRows,
      updatedAt: new Date().toISOString()
    };
    rebuildWordFromDoc(
      updated,
      `Populated ${freshRows.length} student records (Register No, Name, Marks) into Form No. AC 09 for Year ${selectedYear} Sec ${selectedClass} — ${selectedSubjectCode}.`
    );
    confetti({ particleCount: 25, spread: 45 });
  };

  // Switch between Blank Default Form AC 09 (Without Values) and Populated Mode
  const handleToggleIncludeValues = (include: boolean) => {
    setPopulateValues(include);
    const updated: ClassMarkStatementDoc = {
      ...workingDoc,
      includeValues: include,
      updatedAt: new Date().toISOString()
    };
    rebuildWordFromDoc(
      updated,
      include
        ? `Populated class student Register Nos, Names & Marks (${updated.rows.length} rows) into Mark Statement.`
        : 'Switched to Blank Default Form No. AC 09 Template (Without Any Values) — click any field/cell to edit live.'
    );
  };

  // Download Blank Default Form No. AC 09 (.docx) without values
  const handleDownloadBlankFormAC09 = async () => {
    const blob = await generateBlankFormAC09Docx();
    triggerFileDownload(blob, 'VSBEC_Form_AC_09_Blank_Mark_Statement_Template.docx');
    setStatusBanner({
      type: 'success',
      text: 'Downloaded Blank Form No. AC 09 Word Template (.docx) without any values.'
    });
    setTimeout(() => setStatusBanner(null), 4000);
  };

  // Switch between Default Form AC 09 Template and Custom Template
  const handleSelectTemplateMode = (mode: 'default' | 'custom') => {
    setTemplateMode(mode);
    const updated: ClassMarkStatementDoc = {
      ...workingDoc,
      templateMode: mode,
      customTemplateName: mode === 'custom' ? customTemplateName : undefined,
      customTemplateHtml: mode === 'custom' ? customTemplateHtml : undefined
    };
    rebuildWordFromDoc(
      updated,
      mode === 'default'
        ? workingDoc.includeValues === false
          ? 'Applied Blank Default Form No. AC 09 Template (Without Any Values).'
          : 'Applied Default Official Form No. AC 09 Template.'
        : customTemplateHtml
        ? `Applied Custom Template: ${customTemplateName}`
        : 'Custom Template mode selected — upload a .docx / .html / .txt template below.'
    );
  };

  // Process Custom Uploaded Template File (from input or drag-and-drop)
  const processUploadedCustomTemplateFile = async (file: File) => {
    setCustomTemplateError('');
    const parsed = await parseCustomClassTemplateFile(file);
    if (!parsed.success) {
      setCustomTemplateError(parsed.error || 'Could not parse uploaded template file.');
      return;
    }

    const savedEntry: SavedCustomTemplate = {
      id: `CTPL-${activeStaffId || 'ADMIN'}-${Date.now()}`,
      name: file.name,
      html: parsed.html,
      placeholders: parsed.placeholders,
      uploadedAt: new Date().toLocaleString('en-IN'),
      ownerStaffId: activeStaffId || undefined,
      ownerStaffName: activeStaffName || session?.fullName || undefined
    };

    setSavedCustomTemplates((prev) => [
      savedEntry,
      ...prev.filter((item) => item.name !== file.name)
    ]);

    setTemplateMode('custom');
    setCustomTemplateName(file.name);
    setCustomTemplateHtml(parsed.html);
    setCustomPlaceholders(parsed.placeholders);

    const updated: ClassMarkStatementDoc = {
      ...workingDoc,
      templateMode: 'custom',
      customTemplateName: file.name,
      customTemplateHtml: parsed.html,
      updatedAt: new Date().toISOString()
    };
    rebuildWordFromDoc(
      updated,
      `Custom template "${file.name}" uploaded and loaded into Live Word Editor.`
    );
    confetti({ particleCount: 35, spread: 55 });
  };

  const handleUploadCustomTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedCustomTemplateFile(file);
    e.target.value = '';
  };

  const handleApplySavedCustomTemplate = (tpl: SavedCustomTemplate) => {
    setTemplateMode('custom');
    setCustomTemplateName(tpl.name);
    setCustomTemplateHtml(tpl.html);
    setCustomPlaceholders(tpl.placeholders);
    const updated: ClassMarkStatementDoc = {
      ...workingDoc,
      templateMode: 'custom',
      customTemplateName: tpl.name,
      customTemplateHtml: tpl.html,
      updatedAt: new Date().toISOString()
    };
    rebuildWordFromDoc(updated, `Applied saved custom template "${tpl.name}".`);
  };

  const handleDeleteSavedCustomTemplate = (id: string) => {
    setSavedCustomTemplates((prev) => prev.filter((item) => item.id !== id));
  };

  // Download Blank Custom Layout Template
  const handleDownloadSampleCustomTemplate = async () => {
    const blob = await generateSampleCustomClassTemplateDocx();
    triggerFileDownload(blob, `VSBEC_Custom_Mark_Statement_Blank_Template.docx`);
  };

  // Edit single student row inside the structured table
  const handleUpdateStudentRow = (
    idx: number,
    patch: Partial<ClassMarkStatementRow>
  ) => {
    const isConsolidated =
      workingDoc.examCategory.toLowerCase().includes('consolidated') ||
      workingDoc.examCategory.toLowerCase().includes('semester');

    const newRows = [...workingDoc.rows];
    const current = { ...newRows[idx], ...patch };

    if (patch.result === 'AB') {
      current.grade = 'AB';
      current.gradePoints = 0;
      current.totalMarks = 0;
      current.remarks = patch.remarks ?? 'Absent';
    } else {
      if (isConsolidated && (patch.internalMarks !== undefined || patch.externalMarks !== undefined)) {
        const intM = Math.min(40, Math.max(0, Number(current.internalMarks) || 0));
        const extM = Math.min(60, Math.max(0, Number(current.externalMarks) || 0));
        current.internalMarks = intM;
        current.externalMarks = extM;
        current.totalMarks = intM + extM;
      } else if (patch.totalMarks !== undefined) {
        current.totalMarks = Math.min(current.maxMarks || 100, Math.max(0, Number(patch.totalMarks) || 0));
        if (!isConsolidated) {
          current.internalMarks = current.totalMarks;
        }
      }

      const computed = computeSubjectMarkGrade(
        current.totalMarks,
        current.maxMarks || 100,
        current.result === 'AB'
      );
      current.grade = computed.grade;
      current.gradePoints = computed.gradePoints;
      current.result = computed.result;
    }

    newRows[idx] = current;
    const updatedDoc: ClassMarkStatementDoc = {
      ...workingDoc,
      rows: newRows,
      updatedAt: new Date().toISOString()
    };
    setWorkingDoc(updatedDoc);
    const refreshedHtml = buildEditableWordHtml(updatedDoc);
    setWordHtml(refreshedHtml);
    if (wordEditorRef.current) {
      wordEditorRef.current.innerHTML = refreshedHtml;
    }
  };

  // Add an extra blank student row to the class mark statement
  const handleAddBlankRowToStatement = () => {
    const nextSno = workingDoc.rows.length + 1;
    const isConsolidated =
      workingDoc.examCategory.toLowerCase().includes('consolidated') ||
      workingDoc.examCategory.toLowerCase().includes('semester');
    const maxM = workingDoc.rows[0]?.maxMarks || (isConsolidated ? 100 : 50);

    const newRow: ClassMarkStatementRow = {
      sno: nextSno,
      registerNo: `922523243${String(nextSno).padStart(3, '0')}`,
      rollNo: `23AD${String(nextSno).padStart(3, '0')}`,
      studentName: 'New Candidate Name',
      internalMarks: isConsolidated ? 35 : maxM === 50 ? 40 : 80,
      externalMarks: isConsolidated ? 48 : 0,
      totalMarks: isConsolidated ? 83 : maxM === 50 ? 40 : 80,
      maxMarks: maxM,
      grade: 'A+',
      gradePoints: 9,
      result: 'PASS',
      remarks: 'Added Manually',
      source: 'Draft / Editable'
    };

    const updatedDoc: ClassMarkStatementDoc = {
      ...workingDoc,
      rows: [...workingDoc.rows, newRow],
      updatedAt: new Date().toISOString()
    };
    rebuildWordFromDoc(updatedDoc, 'Added new student row to class mark statement.');
  };

  // Remove a student row
  const handleRemoveStudentRow = (idx: number) => {
    const filtered = workingDoc.rows
      .filter((_, i) => i !== idx)
      .map((r, i) => ({ ...r, sno: i + 1 }));
    const updatedDoc: ClassMarkStatementDoc = {
      ...workingDoc,
      rows: filtered,
      updatedAt: new Date().toISOString()
    };
    rebuildWordFromDoc(updatedDoc);
  };

  // Rich Word Toolbar Command Execution
  const execWordFormat = (command: string, value?: string) => {
    if (wordEditorRef.current) {
      wordEditorRef.current.focus();
      document.execCommand(command, false, value);
      setWordHtml(wordEditorRef.current.innerHTML);
      setEditorHasManualEdits(true);
    }
  };

  const handleInsertCustomParagraph = () => {
    if (wordEditorRef.current) {
      const noteNode = document.createElement('p');
      noteNode.style.fontSize = '12px';
      noteNode.style.color = '#1e293b';
      noteNode.style.background = '#f8fafc';
      noteNode.style.borderLeft = '3px solid #781717';
      noteNode.style.padding = '6px 10px';
      noteNode.style.margin = '10px 0';
      noteNode.innerHTML = '<strong>Department Note:</strong> Click here to type additional remarks or instructions...';
      wordEditorRef.current.appendChild(noteNode);
      setWordHtml(wordEditorRef.current.innerHTML);
      setEditorHasManualEdits(true);
    }
  };

  // Helper: capture latest edits from contentEditable Word canvas before saving/downloading
  const captureSyncedDocument = (): ClassMarkStatementDoc => {
    const currentHtml = wordEditorRef.current ? wordEditorRef.current.innerHTML : wordHtml;
    const baseRows = workingDoc.includeValues === false ? [] : workingDoc.rows;
    const syncedRows = editorHasManualEdits
      ? syncEditedWordHtmlToRows(currentHtml, baseRows, workingDoc.maxMarks || 100)
      : workingDoc.rows;

    const hasManualTypedRows =
      editorHasManualEdits && syncedRows.some((r) => Boolean(r.registerNo) || Boolean(r.studentName));

    return {
      ...workingDoc,
      includeValues: workingDoc.includeValues || hasManualTypedRows,
      rows: syncedRows.length > 0 ? syncedRows : workingDoc.rows,
      editedWordHtml: currentHtml,
      updatedAt: new Date().toISOString()
    };
  };

  // Save Draft to Portal Storage (Stamped with Staff Ownership for Zero Mismatch)
  const handleSaveStatement = (finalize: boolean = false) => {
    const captured = captureSyncedDocument();
    const finalDoc: ClassMarkStatementDoc = {
      ...captured,
      ownerStaffId: activeStaffId || captured.ownerStaffId || undefined,
      ownerStaffName: activeStaffName || session?.fullName || captured.ownerStaffName || undefined,
      status: finalize ? 'Mark Statement Marked / Finalized' : captured.status,
      markedAt: finalize ? new Date().toLocaleString('en-IN') : captured.markedAt,
      markedBy: finalize ? activeStaffName || session?.fullName || resolvedFacultyName : captured.markedBy
    };

    setWorkingDoc(finalDoc);
    setWordHtml(finalDoc.editedWordHtml || wordHtml);

    setSavedStatements((prev) => {
      const others = prev.filter((item) => item.id !== finalDoc.id);
      return [finalDoc, ...others];
    });

    // If finalizing, optionally sync student markRecords back to portal
    if (finalize && onUpdateMarkRecord) {
      finalDoc.rows.forEach((r) => {
        const existingMr = markRecords.find((m) => m.registerNo === r.registerNo);
        if (existingMr) {
          const hasSub = existingMr.subjects.some(
            (s) => s.subjectCode.toUpperCase() === finalDoc.subjectCode.toUpperCase()
          );
          const updatedSub: SubjectScore = {
            subjectCode: finalDoc.subjectCode,
            subjectName: finalDoc.subjectName,
            credits: 4,
            internalMarks: r.internalMarks,
            semesterMarks: r.externalMarks,
            totalMarks: r.totalMarks,
            grade: (r.grade === 'AB' ? 'SA' : r.grade) as any,
            gradePoints: r.gradePoints,
            result: r.result
          };
          const newSubjects = hasSub
            ? existingMr.subjects.map((s) =>
                s.subjectCode.toUpperCase() === finalDoc.subjectCode.toUpperCase() ? updatedSub : s
              )
            : [...existingMr.subjects, updatedSub];

          onUpdateMarkRecord({
            ...existingMr,
            subjects: newSubjects,
            verifiedDate: new Date().toISOString().slice(0, 10)
          });
        }
      });
    }

    confetti({ particleCount: finalize ? 70 : 30, spread: finalize ? 75 : 45 });
    setStatusBanner({
      type: 'success',
      text: finalize
        ? `Marked & Finalized: Mark Statement for ${finalDoc.subjectCode} (Year ${finalDoc.year} - Class ${finalDoc.section}) saved and officially locked as completed!`
        : `Saved edited Word Mark Statement draft for ${finalDoc.subjectCode} (Year ${finalDoc.year} - Class ${finalDoc.section}).`
    });
    setTimeout(() => setStatusBanner(null), 5000);
  };

  // Toggle status directly from Finalization tracker
  const handleToggleStatementFinalize = (docItem: ClassMarkStatementDoc) => {
    const nextStatus: ClassMarkStatementDoc['status'] =
      docItem.status === 'Mark Statement Marked / Finalized'
        ? 'Draft'
        : 'Mark Statement Marked / Finalized';

    const updatedItem: ClassMarkStatementDoc = {
      ...docItem,
      status: nextStatus,
      markedAt: nextStatus === 'Mark Statement Marked / Finalized' ? new Date().toLocaleString('en-IN') : undefined,
      markedBy: nextStatus === 'Mark Statement Marked / Finalized' ? session?.fullName || resolvedFacultyName : undefined,
      updatedAt: new Date().toISOString()
    };

    setSavedStatements((prev) => prev.map((s) => (s.id === docItem.id ? updatedItem : s)));
    if (workingDoc.id === docItem.id) {
      setWorkingDoc(updatedItem);
    }
  };

  // Download Genuine Word (.docx) File
  const handleDownloadWordDocx = async (targetDoc?: ClassMarkStatementDoc) => {
    const baseExport = targetDoc || captureSyncedDocument();
    const docToExport: ClassMarkStatementDoc = {
      ...baseExport,
      ownerStaffId: activeStaffId || baseExport.ownerStaffId || undefined,
      ownerStaffName: activeStaffName || session?.fullName || baseExport.ownerStaffName || undefined
    };
    if (!targetDoc) {
      setWorkingDoc(docToExport);
      // Also auto-save draft into active staff partition when downloading
      setSavedStatements((prev) => {
        const others = prev.filter((item) => item.id !== docToExport.id);
        return [docToExport, ...others];
      });
    }

    const blob = await generateClassMarkStatementDocx(docToExport);
    const cleanSub = docToExport.subjectCode.replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `VSBEC_Mark_Statement_${cleanSub}_Year_${docToExport.year}_Sec_${docToExport.section}_Sem_${docToExport.semester}.docx`;
    triggerFileDownload(blob, fileName);

    confetti({ particleCount: 40, spread: 55 });
    setStatusBanner({
      type: 'success',
      text: `Downloaded Microsoft Word file: ${fileName}`
    });
    setTimeout(() => setStatusBanner(null), 4000);
  };

  // Download Genuine Vector PDF (.pdf) File
  const handleDownloadPdf = (targetDoc?: ClassMarkStatementDoc) => {
    const baseExport = targetDoc || captureSyncedDocument();
    const docToExport: ClassMarkStatementDoc = {
      ...baseExport,
      ownerStaffId: activeStaffId || baseExport.ownerStaffId || undefined,
      ownerStaffName: activeStaffName || session?.fullName || baseExport.ownerStaffName || undefined
    };
    if (!targetDoc) {
      setWorkingDoc(docToExport);
      setSavedStatements((prev) => {
        const others = prev.filter((item) => item.id !== docToExport.id);
        return [docToExport, ...others];
      });
    }

    const blob = generateClassMarkStatementPdf(docToExport);
    const cleanSub = (docToExport.subjectCode || 'Form_AC09').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName =
      docToExport.includeValues === false
        ? 'VSBEC_Form_AC_09_Blank_Mark_Statement.pdf'
        : `VSBEC_Mark_Statement_${cleanSub}_Year_${docToExport.year}_Sec_${docToExport.section}_Sem_${docToExport.semester}.pdf`;
    triggerFileDownload(blob, fileName);

    confetti({ particleCount: 35, spread: 55 });
    setStatusBanner({
      type: 'success',
      text: `Downloaded Official PDF Mark Statement: ${fileName}`
    });
    setTimeout(() => setStatusBanner(null), 4000);
  };

  // Direct Website Printout Handler (Isolated A4 Print Iframe)
  const handleDirectPrint = () => {
    const captured = captureSyncedDocument();
    const htmlToPrint = wordEditorRef.current?.innerHTML || captured.editedWordHtml || buildEditableWordHtml(captured);
    const title = `VSBEC Mark Statement - ${captured.subjectCode} (Yr ${captured.year} Sec ${captured.section})`;
    printHtmlDocument(title, htmlToPrint);
  };

  // Download Blank Form AC 09 as PDF directly from Hub or Studio
  const handleDownloadBlankFormAC09Pdf = () => {
    const blankSampleDoc: ClassMarkStatementDoc = {
      ...workingDoc,
      includeValues: false,
      templateMode: 'default',
      updatedAt: new Date().toISOString()
    };
    const blob = generateClassMarkStatementPdf(blankSampleDoc);
    triggerFileDownload(blob, 'VSBEC_Form_AC_09_Blank_Mark_Statement.pdf');
    setStatusBanner({
      type: 'success',
      text: 'Downloaded Blank Form No. AC 09 PDF Template (without values).'
    });
    setTimeout(() => setStatusBanner(null), 4000);
  };

  // Enter Studio to Create a New Mark Statement (optionally pre-targeted to a class & subject)
  const handleCreateNewStatement = (opts?: {
    year?: 'I' | 'II' | 'III' | 'IV';
    semester?: number;
    section?: 'A' | 'B' | 'C' | 'D';
    subjectCode?: string;
    subjectName?: string;
    examCategory?: string;
    targetTab?: 'word-editor' | 'marks-table';
    populate?: boolean;
  }) => {
    const nextYear = opts?.year || selectedYear;
    const nextSem = opts?.semester || selectedSemester;
    const nextSec = opts?.section || (selectedClass === 'ALL' ? 'A' : selectedClass);
    const nextExam = opts?.examCategory || selectedExamCategory;
    const shouldPopulate = Boolean(opts?.populate);

    setSelectedYear(nextYear);
    setSelectedSemester(nextSem);
    setSelectedClass(nextSec);
    if (opts?.subjectCode) setSelectedSubjectCode(opts.subjectCode);
    if (opts?.subjectName) setSelectedSubjectName(opts.subjectName);
    setSelectedExamCategory(nextExam);
    setTemplateMode('default');
    setPopulateValues(shouldPopulate);
    setWorkspaceTab(opts?.targetTab || 'word-editor');

    const nextDoc: ClassMarkStatementDoc = {
      ...workingDoc,
      year: nextYear,
      semester: nextSem,
      semesterType: nextSem % 2 === 0 ? 'EVEN' : 'ODD',
      section: nextSec,
      subjectCode: opts?.subjectCode || workingDoc.subjectCode,
      subjectName: opts?.subjectName || workingDoc.subjectName,
      examTitle: nextExam,
      examCategory: nextExam,
      templateMode: 'default',
      includeValues: shouldPopulate,
      updatedAt: new Date().toISOString()
    };
    const nextHtml = buildEditableWordHtml(nextDoc);
    setWorkingDoc({ ...nextDoc, editedWordHtml: nextHtml });
    setWordHtml(nextHtml);
    setEditorHasManualEdits(false);
    setPageMode('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open an existing Saved/Finalized Statement directly into the Studio
  const handleOpenSavedStatement = (
    stmt: ClassMarkStatementDoc,
    targetTab: 'word-editor' | 'marks-table' = 'word-editor'
  ) => {
    setSelectedYear(stmt.year);
    setSelectedSemester(stmt.semester);
    setSelectedClass(stmt.section as any);
    setSelectedSubjectCode(stmt.subjectCode);
    setSelectedSubjectName(stmt.subjectName);
    setSelectedExamCategory(stmt.examCategory);
    setWorkingDoc(stmt);
    setPopulateValues(stmt.includeValues ?? false);
    setTemplateMode(stmt.templateMode || 'default');
    if (stmt.customTemplateName) setCustomTemplateName(stmt.customTemplateName);
    if (stmt.customTemplateHtml) setCustomTemplateHtml(stmt.customTemplateHtml);
    const html = stmt.editedWordHtml || buildEditableWordHtml(stmt);
    setWordHtml(html);
    setEditorHasManualEdits(!!stmt.editedWordHtml);
    setWorkspaceTab(targetTab);
    setPageMode('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Print a specific Saved Statement cleanly from the Hub
  const handlePrintSavedStatement = (stmt: ClassMarkStatementDoc) => {
    handleOpenSavedStatement(stmt, 'word-editor');
    const htmlToPrint = stmt.editedWordHtml || buildEditableWordHtml(stmt);
    printHtmlDocument(`VSBEC Mark Statement - ${stmt.subjectCode} (Yr ${stmt.year} Sec ${stmt.section})`, htmlToPrint);
  };

  // Delete a Saved Statement with inline confirmation
  const handleDeleteSavedStatement = (id: string) => {
    setSavedStatements((prev) => prev.filter((item) => item.id !== id));
    setConfirmDeleteId(null);
    setStatusBanner({
      type: 'info',
      text: 'Removed saved mark statement entry from the department repository.'
    });
    setTimeout(() => setStatusBanner(null), 3500);
  };

  // Download Class Marks as Excel (.xlsx)
  const handleExportClassExcel = () => {
    const captured = captureSyncedDocument();
    const excelRows = captured.rows.map((r) => ({
      S_No: r.sno,
      Register_No: r.registerNo,
      Roll_No: r.rollNo,
      Student_Name: r.studentName,
      Department: 'AI&DS',
      Year: captured.year,
      Semester: captured.semester,
      Section: captured.section,
      Subject_Code: captured.subjectCode,
      Subject_Name: captured.subjectName,
      Internal_Marks: r.internalMarks,
      External_Marks: r.externalMarks,
      Total_Marks: r.totalMarks,
      Max_Marks: r.maxMarks,
      Grade: r.grade,
      Result: r.result,
      Remarks: r.remarks
    }));

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Class_Mark_Statement');
    XLSX.writeFile(
      wb,
      `VSBEC_Mark_Statement_${captured.subjectCode}_Year_${captured.year}_Sec_${captured.section}.xlsx`
    );
  };

  // Handle Excel Bulk Import Modal
  const handleSelectTemplateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTemplateFile(file);
    setIsParsingTemplate(true);
    setTemplateParseErrors([]);

    const result = await parseMarkStatementExcelFile(file);
    setIsParsingTemplate(false);

    if (result.success && result.records.length > 0) {
      setTemplateParsedRecords(result.records);
      confetti({ particleCount: 30, spread: 50 });
    } else {
      setTemplateParseErrors(
        result.errors.length > 0 ? result.errors : ['Failed to parse mark rows from file.']
      );
    }
  };

  const handleCommitUploadedExcel = () => {
    if (templateParsedRecords.length === 0) return;

    const importedRows: ClassMarkStatementRow[] = templateParsedRecords.map((item, idx) => {
      const matchedSub =
        item.subjects.find(
          (s: SubjectScore) => s.subjectCode.toUpperCase() === selectedSubjectCode.toUpperCase()
        ) || item.subjects[0];

      const total = matchedSub ? matchedSub.totalMarks : 80;
      const computed = computeSubjectMarkGrade(total, 100, false);

      return {
        sno: idx + 1,
        registerNo: item.registerNo,
        rollNo: item.rollNo || `23AD${String(idx + 1).padStart(3, '0')}`,
        studentName: item.studentName,
        internalMarks: matchedSub ? matchedSub.internalMarks : 32,
        externalMarks: matchedSub ? matchedSub.semesterMarks : 48,
        totalMarks: total,
        maxMarks: 100,
        grade: matchedSub?.grade || computed.grade,
        gradePoints: matchedSub?.gradePoints || computed.gradePoints,
        result: (matchedSub?.result || computed.result) as 'PASS' | 'RA' | 'AB',
        remarks: 'Imported via Excel',
        source: 'Uploaded Marks'
      };
    });

    const updatedDoc: ClassMarkStatementDoc = {
      ...workingDoc,
      rows: importedRows,
      updatedAt: new Date().toISOString()
    };
    rebuildWordFromDoc(updatedDoc, `Loaded ${importedRows.length} student rows from Excel sheet into Word Statement.`);
    setIsTemplateUploadModalOpen(false);
    setTemplateParsedRecords([]);
    setTemplateFile(null);
  };

  // Filtered rows for search
  const visibleRows = useMemo(() => {
    if (!searchTerm.trim()) return workingDoc.rows;
    const q = searchTerm.toLowerCase().trim();
    return workingDoc.rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.registerNo.toLowerCase().includes(q) ||
        r.rollNo.toLowerCase().includes(q)
    );
  }, [workingDoc.rows, searchTerm]);

  const classStats = useMemo(() => computeClassStatementStats(workingDoc.rows), [workingDoc.rows]);

  const isFinalized = workingDoc.status === 'Mark Statement Marked / Finalized';

  // Hub Directory Analytics & Readiness Inspector Memos
  const hubStats = useMemo(() => {
    const finalizedCount = savedStatements.filter(
      (s) => s.status === 'Mark Statement Marked / Finalized'
    ).length;
    const draftCount = savedStatements.length - finalizedCount;
    const uniqueClassSet = new Set(
      savedStatements.map((s) => `Year ${s.year} - Sec ${s.section}`)
    );
    const uniqueSubjectSet = new Set(savedStatements.map((s) => s.subjectCode));
    return {
      total: savedStatements.length,
      finalizedCount,
      draftCount,
      classesCovered: uniqueClassSet.size,
      classesList: Array.from(uniqueClassSet),
      subjectsCovered: uniqueSubjectSet.size
    };
  }, [savedStatements]);

  const filteredHubStatements = useMemo(() => {
    const q = hubSearch.trim().toLowerCase();
    return savedStatements.filter((stmt) => {
      if (hubFilterYear !== 'ALL' && stmt.year !== hubFilterYear) return false;
      if (hubFilterSection !== 'ALL' && stmt.section !== hubFilterSection) return false;
      const stmtFinal = stmt.status === 'Mark Statement Marked / Finalized';
      if (hubFilterStatus === 'FINALIZED' && !stmtFinal) return false;
      if (hubFilterStatus === 'DRAFT' && stmtFinal) return false;
      if (q) {
        const hay = `${stmt.subjectCode} ${stmt.subjectName} ${stmt.facultyName} ${stmt.examCategory} Year ${stmt.year} Sec ${stmt.section}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [savedStatements, hubFilterYear, hubFilterSection, hubFilterStatus, hubSearch]);

  const matrixSubjects = useMemo(() => {
    const fromSyllabus = (DEPARTMENT_SUBJECTS['AI&DS'] || []).filter(
      (s) => s.semester === matrixSemester
    );
    const fromAlloc = teacherAllocations
      .filter((a) => a.department === 'AI&DS' && (a.semester === matrixSemester || a.classYear === matrixYear))
      .map((a) => ({ code: a.subjectCode, name: a.subjectName }));
    const map = new Map<string, { code: string; name: string }>();
    fromSyllabus.forEach((s) => map.set(s.code, { code: s.code, name: s.name }));
    fromAlloc.forEach((a) => map.set(a.code, { code: a.code, name: a.name }));
    return Array.from(map.values());
  }, [matrixSemester, matrixYear, teacherAllocations]);

  const matrixClassStudents = useMemo(() => {
    return deptStudents.filter((s) => s.year === matrixYear && s.section === matrixSection);
  }, [deptStudents, matrixYear, matrixSection]);

  return (
    <div className="space-y-6 pb-14 print-reset-layout">
      {/* Live Status Toast Banner (Shared across Hub & Studio) */}
      <AnimatePresence>
        {statusBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold shadow-sm no-print ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : statusBanner.type === 'warning'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-blue-50 border-blue-300 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusBanner.text}</span>
            </div>
            <button onClick={() => setStatusBanner(null)} className="p-1 hover:bg-black/5 rounded-lg cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          HUB LANDING VIEW: CLEAN STAFF OVERVIEW, CREATE BUTTONS & CLASS DIRECTORY
         ===================================================================== */}
      {pageMode === 'hub' && (
        <div className="space-y-6 no-print">
          {/* 1. Clean Hero Bar with Primary Action Buttons */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-[#781717] text-amber-300 shadow-md shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {isStaffScoped && activeStaffName
                      ? `${activeStaffName} — Mark Statement Center`
                      : 'Mark Statement Center — AI&DS Department'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider">
                    Form No. AC 09 • Autonomous
                  </span>
                  {isStaffScoped && activeStaffId && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black font-mono">
                      🔒 Private Vault: {activeStaffId}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                  {isStaffScoped
                    ? `Isolated workspace for ${activeStaffName} (${activeStaffId}). All generated Form No. AC 09 statements, custom templates, and drafts here are completely separated from other staff members.`
                    : 'Create new whole-class mark statements using Default Form No. AC 09 or a Custom Template, review which classes and subjects already have generated mark statements, inspect pass percentages, and print or download official Word/PDF copies.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleCreateNewStatement({ populate: false, targetTab: 'word-editor' })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-black text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>Create New Mark Statement</span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateNewStatement({ populate: true, targetTab: 'word-editor' })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-emerald-200" />
                <span>New + Auto-Fetch Class Marks</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadBlankFormAC09}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#781717]" />
                <span>Blank Form AC 09 (.docx)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadBlankFormAC09Pdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-rose-700" />
                <span>Blank Form AC 09 (.pdf)</span>
              </button>
            </div>
          </div>

          {/* 2. Four Informative Staff Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Generated Statements</span>
                <BookmarkCheck className="w-4 h-4 text-[#781717]" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">{hubStats.total}</div>
              <div className="text-[11px] text-slate-600 mt-1">
                <span className="font-bold text-emerald-700">{hubStats.finalizedCount} Finalized</span> •{' '}
                <span className="font-bold text-amber-700">{hubStats.draftCount} Saved Drafts</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Classes With Statements</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-indigo-700 font-mono">{hubStats.classesCovered}</div>
              <div className="text-[11px] text-slate-600 mt-1 truncate" title={hubStats.classesList.join(', ')}>
                {hubStats.classesList.length > 0
                  ? hubStats.classesList.join(' • ')
                  : 'No classes generated yet'}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>AI&amp;DS Candidate Strength</span>
                <GraduationCap className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">{deptStudents.length}</div>
              <div className="text-[11px] text-slate-600 mt-1 font-mono">
                I:{yearCounts.I} • II:{yearCounts.II} • III:{yearCounts.III} • IV:{yearCounts.IV}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Templates &amp; Test Marks</span>
                <ClipboardList className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-700 font-mono">
                {1 + savedCustomTemplates.length}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Form AC 09 + {savedCustomTemplates.length} Custom • {studentTestMarks.length} Uploaded Marks
              </div>
            </div>
          </div>

          {/* 3. Generated Mark Statements by Class Directory */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#781717]" />
                    <span>Generated Mark Statements Directory (Class-Wise)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View all saved and finalized mark statements grouped with class strength, pass percentage, average marks, faculty name, and direct Edit / Print / PDF / DOCX actions.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-600">
                  <span>Showing {filteredHubStatements.length} of {savedStatements.length} Statements</span>
                </div>
              </div>

              {/* Filter Bar (Dropdowns + Search) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={hubFilterYear}
                  onChange={(e) => setHubFilterYear(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="ALL">All Academic Years (I – IV)</option>
                  <option value="I">Year I Only</option>
                  <option value="II">Year II Only</option>
                  <option value="III">Year III Only</option>
                  <option value="IV">Year IV Only</option>
                </select>

                <select
                  value={hubFilterSection}
                  onChange={(e) => setHubFilterSection(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="ALL">All Class Sections (A – D)</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                </select>

                <select
                  value={hubFilterStatus}
                  onChange={(e) => setHubFilterStatus(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="ALL">All Statement Statuses</option>
                  <option value="FINALIZED">Finalized / Locked Only</option>
                  <option value="DRAFT">Drafts In Progress Only</option>
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={hubSearch}
                    onChange={(e) => setHubSearch(e.target.value)}
                    placeholder="Search subject, code, faculty..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {filteredHubStatements.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-sm font-black text-slate-800">
                  {savedStatements.length === 0
                    ? 'No Generated Class Mark Statements Yet'
                    : 'No Statements Match Your Active Filters'}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {savedStatements.length === 0
                    ? 'Click "Create New Mark Statement" above or choose any class and subject in the Readiness Matrix below to generate and save your first Form No. AC 09 statement.'
                    : 'Try clearing your Year/Section/Status dropdown filter or search keyword to view all saved statements.'}
                </p>
                <div className="pt-1 flex items-center justify-center gap-2">
                  {savedStatements.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setHubFilterYear('ALL');
                        setHubFilterSection('ALL');
                        setHubFilterStatus('ALL');
                        setHubSearch('');
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                    >
                      Reset Directory Filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCreateNewStatement({ populate: true, targetTab: 'word-editor' })}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#781717] text-white text-xs font-black cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4 text-amber-300" />
                      <span>Generate First Class Mark Statement</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-mono text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Class &amp; Semester</th>
                      <th className="py-3 px-4">Subject &amp; Assessment</th>
                      <th className="py-3 px-4">Faculty &amp; Template</th>
                      <th className="py-3 px-4 text-center">Class Result Stats</th>
                      <th className="py-3 px-4 text-center">Status &amp; Date</th>
                      <th className="py-3 px-4 text-right">Staff Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHubStatements.map((stmt) => {
                      const stats = computeClassStatementStats(stmt.rows);
                      const isStmtFinal = stmt.status === 'Mark Statement Marked / Finalized';
                      const isBlank = stmt.includeValues === false;

                      return (
                        <tr key={stmt.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-black text-slate-900 text-xs">
                              Year {stmt.year} • Section {stmt.section}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                              Semester 0{stmt.semester} ({stmt.semesterType || (stmt.semester % 2 === 0 ? 'EVEN' : 'ODD')})
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {stmt.academicYear}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-[#781717]">{stmt.subjectCode}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                                Max {stmt.maxMarks || 100}M
                              </span>
                            </div>
                            <div className="font-bold text-slate-800 mt-0.5">{stmt.subjectName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{stmt.examCategory}</div>
                          </td>

                          <td className="py-3.5 px-4 align-top">
                            <div className="font-bold text-slate-800">{stmt.facultyName}</div>
                            <div className="text-[11px] text-indigo-700 mt-0.5 font-medium">
                              {stmt.templateMode === 'custom'
                                ? `Custom: ${stmt.customTemplateName || 'Uploaded Template'}`
                                : isBlank
                                ? 'Form No. AC 09 (Blank Template)'
                                : 'Form No. AC 09 (Official Dual Grid)'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center align-top">
                            {isBlank ? (
                              <span className="inline-block px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold">
                                Blank Sheet (No Marks Populated)
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="font-mono font-black text-emerald-700 text-xs">
                                  Pass: {stats.passPercentage}% • Avg: {stats.averageMark}
                                </div>
                                <div className="text-[10px] text-slate-600 font-mono">
                                  Appeared: {stats.appeared} | AB: {stats.absent} | RA: {stats.failed}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center align-top">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                isStmtFinal
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              {isStmtFinal ? <CheckCircle2 className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                              <span>{isStmtFinal ? 'Finalized' : 'Draft'}</span>
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1">
                              {stmt.markedAt || new Date(stmt.updatedAt).toLocaleString('en-IN')}
                            </div>
                            {stmt.markedBy && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[140px] mx-auto">
                                By {stmt.markedBy}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right align-top">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenSavedStatement(stmt, 'word-editor')}
                                className="px-2.5 py-1 rounded-lg bg-[#781717] hover:bg-[#5e1111] text-white font-bold text-[11px] cursor-pointer"
                              >
                                Edit Word
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenSavedStatement(stmt, 'marks-table')}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-[11px] cursor-pointer"
                              >
                                Edit Marks
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintSavedStatement(stmt)}
                                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-[11px] cursor-pointer"
                                title="Open & Print Statement"
                              >
                                Print
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(stmt)}
                                className="px-2 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-[11px] cursor-pointer"
                              >
                                .PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadWordDocx(stmt)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-[11px] cursor-pointer"
                              >
                                .DOCX
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatementFinalize(stmt)}
                                className={`p-1.5 rounded-lg border cursor-pointer ${
                                  isStmtFinal
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                }`}
                                title={isStmtFinal ? 'Unlock Finalized Statement' : 'Lock & Finalize Statement'}
                              >
                                {isStmtFinal ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>

                              {confirmDeleteId === stmt.id ? (
                                <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-lg px-1.5 py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSavedStatement(stmt.id)}
                                    className="text-[10px] font-black text-rose-700 hover:underline cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(stmt.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                  title="Delete saved statement"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. Class & Subject Readiness Inspector (Which Classes Have Statements vs Pending) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[#781717]" />
                    <span>Class &amp; Subject Readiness Inspector (Verify Before Generating)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pick any AI&amp;DS class and semester to inspect allocated faculty, uploaded test mark counts, and launch generation directly for pending subjects.
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-black text-indigo-800 font-mono">
                  Year {matrixYear} • Sec {matrixSection} • {matrixClassStudents.length} Enrolled Students
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={matrixYear}
                  onChange={(e) => {
                    const yr = e.target.value as 'I' | 'II' | 'III' | 'IV';
                    setMatrixYear(yr);
                    if (yr === 'I') setMatrixSemester(1);
                    else if (yr === 'II') setMatrixSemester(3);
                    else if (yr === 'III') setMatrixSemester(5);
                    else setMatrixSemester(7);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 cursor-pointer"
                >
                  <option value="I">Year I ({yearCounts.I} Students)</option>
                  <option value="II">Year II ({yearCounts.II} Students)</option>
                  <option value="III">Year III ({yearCounts.III} Students)</option>
                  <option value="IV">Year IV ({yearCounts.IV} Students)</option>
                </select>

                <select
                  value={matrixSemester}
                  onChange={(e) => {
                    const sem = Number(e.target.value);
                    setMatrixSemester(sem);
                    if (sem <= 2) setMatrixYear('I');
                    else if (sem <= 4) setMatrixYear('II');
                    else if (sem <= 6) setMatrixYear('III');
                    else setMatrixYear('IV');
                  }}
                  className="px-3 py-2 rounded-xl border border-[#781717]/40 bg-red-50/40 text-xs font-black text-[#781717] cursor-pointer"
                >
                  <option value={1}>Semester 01 (Year I)</option>
                  <option value={2}>Semester 02 (Year I)</option>
                  <option value={3}>Semester 03 (Year II)</option>
                  <option value={4}>Semester 04 (Year II)</option>
                  <option value={5}>Semester 05 (Year III)</option>
                  <option value={6}>Semester 06 (Year III)</option>
                  <option value={7}>Semester 07 (Year IV)</option>
                  <option value={8}>Semester 08 (Year IV)</option>
                </select>

                <select
                  value={matrixSection}
                  onChange={(e) => setMatrixSection(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 cursor-pointer"
                >
                  <option value="A">Class Section A</option>
                  <option value="B">Class Section B</option>
                  <option value="C">Class Section C</option>
                  <option value="D">Class Section D</option>
                </select>

                <select
                  value={matrixExamCategory}
                  onChange={(e) => setMatrixExamCategory(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 cursor-pointer"
                >
                  <option value="Consolidated Semester (Internal + External)">
                    Consolidated Semester (100M)
                  </option>
                  {testWindows.map((tw) => (
                    <option key={tw.id} value={tw.testName}>
                      {tw.testName} ({tw.maxMarks}M)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-mono text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Subject Code</th>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Allocated Course Faculty</th>
                    <th className="py-3 px-4 text-center">Uploaded Marks</th>
                    <th className="py-3 px-4 text-center">Pass %</th>
                    <th className="py-3 px-4 text-center">Statement Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matrixSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No syllabus subjects listed for Semester 0{matrixSemester}. Click &ldquo;Create New Mark Statement&rdquo; above to draft manually.
                      </td>
                    </tr>
                  ) : (
                    matrixSubjects.map((sub) => {
                      const alloc = teacherAllocations.find(
                        (a) =>
                          a.department === 'AI&DS' &&
                          a.subjectCode === sub.code &&
                          (a.section === matrixSection || a.semester === matrixSemester)
                      );
                      const matchedStmt = savedStatements.find(
                        (s) =>
                          s.year === matrixYear &&
                          s.semester === matrixSemester &&
                          s.section === matrixSection &&
                          s.subjectCode === sub.code &&
                          s.examCategory === matrixExamCategory
                      );
                      const uploadedCount = studentTestMarks.filter(
                        (m) =>
                          m.subjectCode.toUpperCase() === sub.code.toUpperCase() &&
                          matrixClassStudents.some(
                            (st) =>
                              st.registerNo === m.registerNo ||
                              st.name.toLowerCase() === m.studentName.toLowerCase()
                          )
                      ).length;
                      const stats = matchedStmt ? computeClassStatementStats(matchedStmt.rows) : null;
                      const isStmtFinal = matchedStmt?.status === 'Mark Statement Marked / Finalized';

                      return (
                        <tr key={sub.code} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-black text-[#781717]">{sub.code}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{sub.name}</td>
                          <td className="py-3 px-4 text-slate-700">
                            {alloc?.teacherName || 'AI&DS Faculty Pool'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                uploadedCount > 0
                                  ? 'bg-indigo-50 text-indigo-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {uploadedCount} / {matrixClassStudents.length}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                            {stats && matchedStmt?.includeValues !== false ? `${stats.passPercentage}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isStmtFinal ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                                <CheckCircle2 className="w-3 h-3" /> Finalized
                              </span>
                            ) : matchedStmt ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black">
                                Saved Draft
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                Pending Generation
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {matchedStmt ? (
                              <button
                                type="button"
                                onClick={() => handleOpenSavedStatement(matchedStmt, 'word-editor')}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-[11px] cursor-pointer"
                              >
                                Open &amp; Edit
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCreateNewStatement({
                                    year: matrixYear,
                                    semester: matrixSemester,
                                    section: matrixSection,
                                    subjectCode: sub.code,
                                    subjectName: sub.name,
                                    examCategory: matrixExamCategory,
                                    populate: true,
                                    targetTab: 'word-editor'
                                  })
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-bold text-[11px] cursor-pointer"
                              >
                                <Plus className="w-3 h-3 text-amber-300" />
                                <span>Generate Statement</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Detailed Staff Operational Guide & Standards Reference */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-[#781717] uppercase tracking-wide">
                <Info className="w-4 h-4" />
                <span>Staff Workflow SOP</span>
              </div>
              <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
                <li>Click <strong>Create New Mark Statement</strong> and select Year, Semester, Class, Subject &amp; Exam.</li>
                <li>Use <strong>Blank Form AC 09</strong> or click <strong>Populate Class</strong> to auto-fetch RegNo, Name &amp; Marks.</li>
                <li>Edit any text, marks, or cells directly in the live Word editor, then click <strong>Mark as Finalized</strong>.</li>
                <li>Export aligned <strong>.DOCX</strong>, <strong>.PDF</strong>, or click <strong>Print</strong> for clean A4 output.</li>
              </ol>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-800 uppercase tracking-wide">
                <Award className="w-4 h-4" />
                <span>Autonomous Grading Scale</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <div className="px-2 py-1 rounded bg-emerald-50 text-emerald-900 font-bold">O : 91–100 (10)</div>
                <div className="px-2 py-1 rounded bg-emerald-50 text-emerald-900 font-bold">A+: 81–90 (9)</div>
                <div className="px-2 py-1 rounded bg-blue-50 text-blue-900 font-bold">A : 71–80 (8)</div>
                <div className="px-2 py-1 rounded bg-blue-50 text-blue-900 font-bold">B+: 60–70 (7)</div>
                <div className="px-2 py-1 rounded bg-rose-50 text-rose-800 font-bold">RA: &lt;60% (Retest)</div>
                <div className="px-2 py-1 rounded bg-amber-50 text-amber-800 font-bold">AB: Absent</div>
              </div>
              <p className="text-[11px] text-slate-500">
                Pass criteria: 30 / 50 (50M Exam) or 60 / 100 (100M Exam). Below threshold triggers Retest list.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-800 uppercase tracking-wide">
                <FileUp className="w-4 h-4" />
                <span>Custom Template Tokens</span>
              </div>
              <p className="text-[11px] text-slate-600">
                When uploading custom <code className="font-mono text-[#781717]">.docx/.html</code> sheets, include any of these smart tokens:
              </p>
              <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                {[
                  '{{CLASS}}',
                  '{{SUBJECT_CODE}}',
                  '{{SUBJECT_NAME}}',
                  '{{FACULTY_NAME}}',
                  '{{EXAM_TITLE}}',
                  '{{MAX_MARKS}}',
                  '{{MARKS_TABLE}}',
                  '{{CLASS_SUMMARY}}'
                ].map((tok) => (
                  <span key={tok} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {tok}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wide">
                <Calendar className="w-4 h-4 text-[#781717]" />
                <span>Mark Statement Sign-Off</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong>Layout Guarantee:</strong> Dual separated left/right candidate tables with bottom summary block.</li>
                <li><strong>Signatures:</strong> Valuer signature with date and HOD endorsement appear cleanly at the bottom of each A4 sheet without extra footer lines.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          STUDIO VIEW: CLASS FILTER, FORM AC 09 / CUSTOM TEMPLATE, LIVE EDITOR
         ===================================================================== */}
      {pageMode === 'studio' && (
        <>
          {/* PAGE HEADER & QUICK ACTIONS */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 no-print">
            <div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPageMode('hub')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#781717]" />
                  <span>Mark Statement Hub</span>
                </button>
                <span className="p-2.5 rounded-2xl bg-[#781717] text-amber-300 shadow-md">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Whole-Class Mark Statement Generator
                    </h1>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        isFinalized
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {isFinalized ? '✓ Finalized Statement' : 'Draft Mode'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Select Class &amp; Subject → Choose Default Form AC 09 or Custom Template → Fetch RegNo, Name &amp; Marks → Edit Word File → Print, Download PDF / DOCX &amp; Mark Statement
                  </p>
                </div>
              </div>
            </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTemplateUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#781717]" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExportClassExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleDirectPrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Statement</span>
          </button>

          <button
            onClick={() => handleDownloadPdf()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-rose-200" />
            <span>Download PDF (.pdf)</span>
          </button>

          <button
            onClick={() => handleDownloadWordDocx()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Download Word (.docx)</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          STEP 1: CLASS, SEMESTER, SUBJECT & ASSESSMENT DROPDOWNS
         ======================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#781717] text-white text-xs font-black flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                Select Class, Subject &amp; Assessment Cycle (AI&amp;DS Department)
              </h2>
              <p className="text-[11px] text-slate-500">
                Automatically fetches all enrolled Register Numbers, Candidate Names, and Marks for the whole selected class
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {workingDoc.includeValues === false ? (
              <button
                onClick={handleRefetchClassMarks}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-amber-300 font-black text-xs shadow-sm transition-all cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Fetch &amp; Populate RegNo, Name &amp; Marks</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleRefetchClassMarks}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Re-Fetch Class Marks</span>
                </button>
                <button
                  onClick={() => handleToggleIncludeValues(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Clear to Blank Form AC 09</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Year Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Academic Year
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
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="I">Year I ({yearCounts.I} Students)</option>
              <option value="II">Year II ({yearCounts.II} Students)</option>
              <option value="III">Year III ({yearCounts.III} Students)</option>
              <option value="IV">Year IV ({yearCounts.IV} Students)</option>
            </select>
          </div>

          {/* Semester Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                const sem = Number(e.target.value);
                setSelectedSemester(sem);
                if (sem <= 2) setSelectedYear('I');
                else if (sem <= 4) setSelectedYear('II');
                else if (sem <= 6) setSelectedYear('III');
                else setSelectedYear('IV');
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-[#781717]/40 bg-red-50/40 text-xs font-black text-[#781717] focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value={1}>Semester 01 (Year I)</option>
              <option value={2}>Semester 02 (Year I)</option>
              <option value={3}>Semester 03 (Year II)</option>
              <option value={4}>Semester 04 (Year II)</option>
              <option value={5}>Semester 05 (Year III)</option>
              <option value={6}>Semester 06 (Year III)</option>
              <option value={7}>Semester 07 (Year IV)</option>
              <option value={8}>Semester 08 (Year IV)</option>
            </select>
          </div>

          {/* Class / Section Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Class / Section
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="A">Class Section A</option>
              <option value="B">Class Section B</option>
              <option value="C">Class Section C</option>
              <option value="D">Class Section D</option>
              <option value="ALL">All Sections Combined</option>
            </select>
          </div>

          {/* Subject Code & Name Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Subject Code &amp; Name
            </label>
            <select
              value={selectedSubjectCode}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedSubjectCode(code);
                const found = semesterSubjects.find((s) => s.code === code);
                if (found) setSelectedSubjectName(found.name);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {semesterSubjects.map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.code} — {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Examination / Test Category Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Exam / Statement Type
            </label>
            <select
              value={selectedExamCategory}
              onChange={(e) => setSelectedExamCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="Consolidated Semester (Internal + External)">
                Consolidated Semester (100 Marks)
              </option>
              {testWindows.map((tw) => (
                <option key={tw.id} value={tw.testName}>
                  {tw.testName} ({tw.maxMarks}M)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Auto-resolved Subject Staff Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <BookOpen className="w-4 h-4 text-[#781717]" />
            <span className="font-bold text-slate-700">Allocated Course Faculty:</span>
            <span className="font-black text-[#781717]">{resolvedFacultyName}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-medium">
              Year {selectedYear} • Sem 0{selectedSemester} • Section {selectedClass} • {selectedSubjectCode}
            </span>
          </div>
          <div className="font-mono text-[11px] font-bold text-indigo-700">
            Fetched {workingDoc.rows.length} Candidates
          </div>
        </div>
      </div>

      {/* ========================================================
          CLASS KPI SUMMARY CARDS
         ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Class Strength</span>
            <Users className="w-4 h-4 text-[#781717]" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{classStats.total}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Appeared: {classStats.appeared} • Absent: {classStats.absent}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
            <span>Subject Pass Rate</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{classStats.passPercentage}%</div>
          <div className="text-[11px] text-emerald-600 mt-1">
            Passed: {classStats.passed} • Arrears: {classStats.failed}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-indigo-700 mb-1">
            <span>Class Average &amp; Peak</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono">{classStats.averageMark}</div>
          <div className="text-[11px] text-indigo-600 mt-1 truncate">
            Highest: {classStats.highestMark} ({classStats.topperName})
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            isFinalized ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50/70 border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className={isFinalized ? 'text-emerald-800' : 'text-amber-900'}>
              Statement Status
            </span>
            {isFinalized ? (
              <BookmarkCheck className="w-4 h-4 text-emerald-700" />
            ) : (
              <FileText className="w-4 h-4 text-amber-700" />
            )}
          </div>
          <div className={`text-sm font-black mt-0.5 ${isFinalized ? 'text-emerald-800' : 'text-amber-900'}`}>
            {isFinalized ? 'FINALIZED FOR CLASS' : 'DRAFT IN PROGRESS'}
          </div>
          <div className="text-[11px] text-slate-600 mt-1 truncate">
            {isFinalized && workingDoc.markedAt
              ? `Marked: ${workingDoc.markedAt}`
              : `${selectedSubjectCode} • Year ${selectedYear} Sec ${selectedClass}`}
          </div>
        </div>
      </div>

      {/* ========================================================
          STEP 2: DEFAULT FORM NO. AC 09 & CUSTOM TEMPLATE UPLOAD AREA
         ======================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#781717] text-white text-xs font-black flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                Mark Statement Template &amp; Custom Template Uploading Area
              </h2>
              <p className="text-[11px] text-slate-500">
                Default Form No. AC 09 starts cleanly without pre-filled values, or upload your own custom Word/HTML template below
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleIncludeValues(false)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border cursor-pointer transition-all ${
                workingDoc.includeValues === false
                  ? 'bg-slate-900 text-amber-300 border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Blank Template (No Values)
            </button>
            <button
              type="button"
              onClick={handleRefetchClassMarks}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border cursor-pointer transition-all ${
                workingDoc.includeValues !== false
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              Populate Class Marks ({classStudents.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Option A: Official Default Form No. AC 09 Template */}
          <div
            onClick={() => handleSelectTemplateMode('default')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              templateMode === 'default'
                ? 'border-[#781717] bg-red-50/30 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-[#781717] text-amber-300 text-[10px] font-black uppercase">
                    Default Template
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    Form No. AC 09 (Official Two-Column Grid)
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Exact V.S.B. Engineering College <strong>Form No. AC 09</strong> layout in Times New Roman with dual S.No / Roll No / Reg. No / Student Name / Marks Scored columns, 6 statistical summary rows, Valuer &amp; HOD signatures. Defaults with zero hardcoded values.
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                  templateMode === 'default' ? 'border-[#781717] bg-[#781717] text-white' : 'border-slate-300'
                }`}
              >
                {templateMode === 'default' && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80"
            >
              <button
                type="button"
                onClick={handleDownloadBlankFormAC09}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-[11px] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#781717]" />
                <span>Download Blank Form AC 09 (.docx)</span>
              </button>
              <span className="text-[10px] font-mono text-slate-500">
                Mode: {workingDoc.includeValues === false ? 'Blank (No Values)' : 'Populated Class Roster'}
              </span>
            </div>
          </div>

          {/* Option B: Custom Template Uploading Area (Drag & Drop + Library) */}
          <div
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 ${
              templateMode === 'custom'
                ? 'border-indigo-700 bg-indigo-50/30 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div
              onClick={() => handleSelectTemplateMode('custom')}
              className="flex items-start justify-between gap-3 cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-indigo-700 text-white text-[10px] font-black uppercase">
                    Custom Upload Area
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    Upload Custom Mark Statement Template
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Drag &amp; drop or browse a custom <code className="font-mono text-indigo-700">.docx</code>, <code className="font-mono text-indigo-700">.html</code>, or <code className="font-mono text-indigo-700">.txt</code> template. Edit freely in the live Word editor.
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                  templateMode === 'custom' ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300'
                }`}
              >
                {templateMode === 'custom' && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Drag-and-Drop Custom Template Uploading Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingCustomTemplate(true);
              }}
              onDragLeave={() => setIsDraggingCustomTemplate(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDraggingCustomTemplate(false);
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile) await processUploadedCustomTemplateFile(droppedFile);
              }}
              onClick={() => customTemplateInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                isDraggingCustomTemplate
                  ? 'border-indigo-600 bg-indigo-100/60'
                  : 'border-indigo-300/80 hover:border-indigo-500 bg-white/80'
              }`}
            >
              <input
                ref={customTemplateInputRef}
                type="file"
                accept=".docx,.html,.htm,.txt"
                onChange={handleUploadCustomTemplate}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-900">
                <FileUp className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  {customTemplateName
                    ? `Uploaded: ${customTemplateName} (Click or drop to replace)`
                    : 'Drop .DOCX / .HTML / .TXT template here or click to upload'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDownloadSampleCustomTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] cursor-pointer transition-all whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span>Blank Layout Template (.docx)</span>
              </button>

              {customPlaceholders.length > 0 && (
                <span className="text-[10px] font-mono text-emerald-700 font-bold">
                  ✓ {customPlaceholders.length} placeholders merged
                </span>
              )}
              {customTemplateError && (
                <span className="text-[10px] text-rose-700 font-bold">{customTemplateError}</span>
              )}
            </div>

            {savedCustomTemplates.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 space-y-1">
                <div className="text-[10px] font-black text-slate-500 uppercase">Saved Uploaded Custom Templates:</div>
                <div className="flex flex-wrap gap-1.5">
                  {savedCustomTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                        templateMode === 'custom' && customTemplateName === tpl.name
                          ? 'bg-indigo-700 text-white border-indigo-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleApplySavedCustomTemplate(tpl)}
                        className="cursor-pointer truncate max-w-[160px]"
                      >
                        {tpl.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedCustomTemplate(tpl.id)}
                        className="opacity-75 hover:opacity-100 cursor-pointer"
                        title="Remove saved custom template"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          STEP 3: WORKSPACE SWITCHER (FETCHED DATA | WORD EDITOR | TRACKER)
         ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setWorkspaceTab('word-editor')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              workspaceTab === 'word-editor'
                ? 'bg-[#781717] text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>Word File Editor &amp; Live Preview</span>
          </button>

          <button
            onClick={() => setWorkspaceTab('marks-table')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              workspaceTab === 'marks-table'
                ? 'bg-[#781717] text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Fetched RegNo, Name &amp; Marks ({workingDoc.rows.length})</span>
          </button>

          <button
            onClick={() => setWorkspaceTab('completion-tracker')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              workspaceTab === 'completion-tracker'
                ? 'bg-[#1e3a8a] text-white shadow-md'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>
              Class-Subject Finalization Ledger ({savedStatements.filter((s) => s.status === 'Mark Statement Marked / Finalized').length} Marked)
            </span>
          </button>
        </div>

        {/* Finalize & Save Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSaveStatement(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-amber-300" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => handleSaveStatement(true)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer ${
              isFinalized
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>
              {isFinalized
                ? `Finalized for ${selectedSubjectCode} (Year ${selectedYear}-${selectedClass}) • Re-Save`
                : `Mark as Mark Statement for ${selectedSubjectCode} (Class ${selectedYear}-${selectedClass})`}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB A: EDIT FETCHED CLASS REGNO, NAME & MARKS TABLE
         ======================================================== */}
      {workspaceTab === 'marks-table' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Fetched Class Marks: {selectedSubjectCode} — {selectedSubjectName} (Year {selectedYear} • Class {selectedClass})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Edit any candidate's Register No, Name, Internal/External/Total Marks, or Remarks directly below. Grades and Word document update automatically.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter name or reg no..."
                  className="bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                onClick={handleAddBlankRowToStatement}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Student Row</span>
              </button>

              <button
                onClick={() => setWorkspaceTab('word-editor')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-bold text-xs cursor-pointer"
              >
                <span>Open in Word Editor</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-mono text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center">S.No</th>
                  <th className="py-3 px-3">Register No</th>
                  <th className="py-3 px-3">Roll No</th>
                  <th className="py-3 px-3">Student Name</th>
                  {(workingDoc.examCategory.toLowerCase().includes('consolidated') ||
                    workingDoc.examCategory.toLowerCase().includes('semester')) && (
                    <>
                      <th className="py-3 px-3 text-center">Internal (40)</th>
                      <th className="py-3 px-3 text-center">External (60)</th>
                    </>
                  )}
                  <th className="py-3 px-3 text-center">Total Marks</th>
                  <th className="py-3 px-3 text-center">Grade</th>
                  <th className="py-3 px-3 text-center">Result</th>
                  <th className="py-3 px-3">Remarks</th>
                  <th className="py-3 px-3 text-center">Source</th>
                  <th className="py-3 px-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-10 text-slate-500">
                      No students found for Year {selectedYear} • Section {selectedClass}. Click "Add Student Row" or switch class dropdown above.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const realIdx = workingDoc.rows.findIndex((r) => r.sno === row.sno && r.registerNo === row.registerNo);
                    const isConsolidated =
                      workingDoc.examCategory.toLowerCase().includes('consolidated') ||
                      workingDoc.examCategory.toLowerCase().includes('semester');

                    return (
                      <tr key={`${row.sno}-${row.registerNo}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                          {row.sno}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.registerNo}
                            onChange={(e) => handleUpdateStudentRow(realIdx, { registerNo: e.target.value })}
                            className="w-32 px-2 py-1 rounded-lg border border-slate-200 font-mono font-bold text-[#781717] bg-white focus:outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.rollNo}
                            onChange={(e) => handleUpdateStudentRow(realIdx, { rollNo: e.target.value })}
                            className="w-24 px-2 py-1 rounded-lg border border-slate-200 font-mono text-slate-700 bg-white focus:outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.studentName}
                            onChange={(e) => handleUpdateStudentRow(realIdx, { studentName: e.target.value })}
                            className="w-44 px-2 py-1 rounded-lg border border-slate-200 font-bold text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                          />
                        </td>

                        {isConsolidated && (
                          <>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={40}
                                disabled={row.result === 'AB'}
                                value={row.internalMarks}
                                onChange={(e) =>
                                  handleUpdateStudentRow(realIdx, { internalMarks: Number(e.target.value) })
                                }
                                className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-center font-mono font-bold bg-white"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={60}
                                disabled={row.result === 'AB'}
                                value={row.externalMarks}
                                onChange={(e) =>
                                  handleUpdateStudentRow(realIdx, { externalMarks: Number(e.target.value) })
                                }
                                className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-center font-mono font-bold bg-white"
                              />
                            </td>
                          </>
                        )}

                        <td className="py-2.5 px-3 text-center">
                          {isConsolidated ? (
                            <span className="font-mono font-black text-sm text-slate-900">
                              {row.result === 'AB' ? 'AB' : row.totalMarks}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={row.maxMarks || 50}
                              disabled={row.result === 'AB'}
                              value={row.totalMarks}
                              onChange={(e) =>
                                handleUpdateStudentRow(realIdx, { totalMarks: Number(e.target.value) })
                              }
                              className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-center font-mono font-bold bg-white"
                            />
                          )}
                          <span className="text-[10px] text-slate-400 ml-1">/ {row.maxMarks}</span>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span className="font-mono font-black text-[#781717] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            {row.grade}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <select
                            value={row.result}
                            onChange={(e) =>
                              handleUpdateStudentRow(realIdx, {
                                result: e.target.value as 'PASS' | 'RA' | 'AB'
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                              row.result === 'PASS'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : row.result === 'AB'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            <option value="PASS">PASS</option>
                            <option value="RA">RA</option>
                            <option value="AB">AB (Absent)</option>
                          </select>
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => handleUpdateStudentRow(realIdx, { remarks: e.target.value })}
                            className="w-36 px-2 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-none focus:border-amber-500"
                          />
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold whitespace-nowrap">
                            {row.source}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleRemoveStudentRow(realIdx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Remove student from statement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* ========================================================
          TAB B: LIVE INTERACTIVE WORD FILE (.DOCX) EDITOR & STUDIO
         ======================================================== */}
      {workspaceTab === 'word-editor' && (
        <div className="space-y-5">
          {/* Top Deck: Form No. AC 09 Fields & Populate/Blank Toggle (Clean A4 Fit) */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#781717]" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Form AC 09 Fields &amp; Data Fill Mode
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleIncludeValues(false)}
                  className={`py-1.5 px-3 rounded-xl text-[11px] font-black border cursor-pointer transition-all ${
                    workingDoc.includeValues === false
                      ? 'bg-slate-900 text-amber-300 border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Blank (No Values)
                </button>
                <button
                  type="button"
                  onClick={handleRefetchClassMarks}
                  className={`py-1.5 px-3 rounded-xl text-[11px] font-black border cursor-pointer transition-all ${
                    workingDoc.includeValues !== false
                      ? 'bg-[#781717] text-amber-300 border-[#781717] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Populate Class ({classStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => rebuildWordFromDoc(workingDoc, 'Word sheet refreshed from current fields.')}
                  className="text-[11px] font-bold text-[#781717] hover:underline cursor-pointer px-2"
                >
                  Apply Fields
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Marks Statement For (Test / Exam Title)
                  </label>
                  <input
                    type="text"
                    value={workingDoc.examTitle}
                    onChange={(e) => {
                      const next = { ...workingDoc, examTitle: e.target.value, includeValues: true };
                      setPopulateValues(true);
                      rebuildWordFromDoc(next);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={workingDoc.academicYear}
                      onChange={(e) => {
                        setAcademicYearLabel(e.target.value);
                        setPopulateValues(true);
                        rebuildWordFromDoc({ ...workingDoc, academicYear: e.target.value, includeValues: true });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Semester Session
                    </label>
                    <select
                      value={workingDoc.semesterType || (workingDoc.semester % 2 === 0 ? 'EVEN' : 'ODD')}
                      onChange={(e) => {
                        setPopulateValues(true);
                        rebuildWordFromDoc({
                          ...workingDoc,
                          semesterType: e.target.value as 'ODD' | 'EVEN',
                          includeValues: true
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="ODD">ODD Semester</option>
                      <option value="EVEN">EVEN Semester</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Max. Marks
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={200}
                      value={workingDoc.maxMarks ?? 100}
                      onChange={(e) => {
                        setPopulateValues(true);
                        rebuildWordFromDoc({
                          ...workingDoc,
                          maxMarks: Number(e.target.value) || 100,
                          includeValues: true
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Statement Date
                    </label>
                    <input
                      type="date"
                      value={workingDoc.examDate}
                      onChange={(e) => rebuildWordFromDoc({ ...workingDoc, examDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Name of the Subject
                  </label>
                  <input
                    type="text"
                    value={workingDoc.subjectName}
                    onChange={(e) => {
                      setPopulateValues(true);
                      rebuildWordFromDoc({ ...workingDoc, subjectName: e.target.value, includeValues: true });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Name of the Faculty Member
                  </label>
                  <input
                    type="text"
                    value={workingDoc.facultyName}
                    onChange={(e) => {
                      setPopulateValues(true);
                      rebuildWordFromDoc({ ...workingDoc, facultyName: e.target.value, includeValues: true });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800"
                  />
                </div>
            </div>
          </div>

          {/* Full-Width Panel: Rich Interactive A4 Portrait Word Paper Sheet */}
          <div className="space-y-3">
            {/* Word Formatting Toolbar */}
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 no-print">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsWordEditing(!isWordEditing)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    isWordEditing
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  {isWordEditing ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{isWordEditing ? 'Live Word Editing: ON' : 'Read-Only Preview'}</span>
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                <button
                  type="button"
                  onClick={() => execWordFormat('bold')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execWordFormat('italic')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execWordFormat('underline')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="Underline"
                >
                  <Underline className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                <button
                  type="button"
                  onClick={() => execWordFormat('justifyLeft')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="Align Left"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execWordFormat('justifyCenter')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="Align Center"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execWordFormat('justifyRight')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="Align Right"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execWordFormat('insertUnorderedList')}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                <button
                  type="button"
                  onClick={handleInsertCustomParagraph}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Insert Note</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => rebuildWordFromDoc(workingDoc, 'Word document reset cleanly from fetched marks & template.')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Reset Layout
                </button>
              </div>
            </div>

            {/* Word Document Exact A4 Portrait Paper Sheet (210mm x 297mm) */}
            <div className="w-full min-w-0 bg-slate-200/70 p-2 sm:p-5 rounded-3xl border border-slate-300 overflow-x-auto print-sheet-wrapper">
              <div
                ref={wordEditorRef}
                contentEditable={isWordEditing}
                suppressContentEditableWarning
                onInput={(e) => {
                  setWordHtml(e.currentTarget.innerHTML);
                  setEditorHasManualEdits(true);
                }}
                className={`a4-page-sheet bg-white p-5 sm:p-8 shadow-xl rounded-sm border transition-all print-sheet-page ${
                  isWordEditing
                    ? 'border-indigo-300 ring-2 ring-indigo-500/20 focus:outline-none'
                    : 'border-slate-300'
                }`}
              />
            </div>

            {/* Document Export & Finalize Action Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">Ready:</span> Click any cell or text in the sheet above to edit, then print, download PDF / <code className="font-mono text-[#781717]">.docx</code>, or finalize.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleSaveStatement(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-amber-300" />
                  <span>Save Draft</span>
                </button>
                <button
                  onClick={handleDirectPrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => handleDownloadPdf()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => handleDownloadWordDocx()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-bold text-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>Download .DOCX</span>
                </button>
                <button
                  onClick={() => handleSaveStatement(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Mark Final Statement</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB C: CLASS-SUBJECT MARK STATEMENT COMPLETION LEDGER & ARCHIVE
         ======================================================== */}
      {workspaceTab === 'completion-tracker' && (
        <div className="space-y-6 no-print">
          {/* Matrix for Current Semester & Class */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Subject Mark Statement Status — Year {selectedYear} • Semester 0{selectedSemester} • Section {selectedClass}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Track which subjects in this class already have finalized Mark Statements generated
                </p>
              </div>
              <span className="text-xs font-bold text-[#781717] font-mono">
                {semesterSubjects.length} Curricular Subjects
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-mono text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Subject Code</th>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Template Used</th>
                    <th className="py-3 px-4 text-center">Class Pass %</th>
                    <th className="py-3 px-4 text-center">Mark Statement Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {semesterSubjects.map((sub) => {
                    const matchedStmt = savedStatements.find(
                      (s) =>
                        s.year === selectedYear &&
                        s.semester === selectedSemester &&
                        s.section === selectedClass &&
                        s.subjectCode === sub.code &&
                        s.examCategory === selectedExamCategory
                    );
                    const subStats = matchedStmt ? computeClassStatementStats(matchedStmt.rows) : null;
                    const finalized = matchedStmt?.status === 'Mark Statement Marked / Finalized';

                    return (
                      <tr key={sub.code} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-black text-[#781717]">{sub.code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{sub.name}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {matchedStmt
                            ? matchedStmt.templateMode === 'custom'
                              ? `Custom (${matchedStmt.customTemplateName || 'DOCX'})`
                              : 'Form No. AC 09 (Default)'
                            : 'Not Prepared'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700">
                          {subStats ? `${subStats.passPercentage}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {finalized ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                              <CheckCircle2 className="w-3 h-3" /> Finalized Statement
                            </span>
                          ) : matchedStmt ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black">
                              Saved Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                              Pending Generation
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedSubjectCode(sub.code);
                                setSelectedSubjectName(sub.name);
                                setWorkspaceTab('word-editor');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#781717] hover:bg-[#5e1111] text-white font-bold text-[11px] cursor-pointer"
                            >
                              {matchedStmt ? 'Open / Edit Word' : 'Generate Statement'}
                            </button>
                            {matchedStmt && (
                              <>
                                <button
                                  onClick={() => handleDownloadPdf(matchedStmt)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-[11px] cursor-pointer"
                                >
                                  .PDF
                                </button>
                                <button
                                  onClick={() => handleDownloadWordDocx(matchedStmt)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] cursor-pointer"
                                >
                                  .DOCX
                                </button>
                                <button
                                  onClick={() => handleToggleStatementFinalize(matchedStmt)}
                                  className={`p-1.5 rounded-lg border cursor-pointer ${
                                    finalized
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      : 'bg-amber-50 border-amber-200 text-amber-700'
                                  }`}
                                  title={finalized ? 'Unmark Finalized Status' : 'Mark as Finalized Statement'}
                                >
                                  {finalized ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Saved & Finalized Mark Statements Archive */}
          {savedStatements.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/70">
                <h3 className="text-sm font-black text-slate-900">
                  All Saved &amp; Finalized Class Mark Statements Archive ({savedStatements.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Complete repository of saved and finalized Word mark statements across all classes and subjects
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-mono text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Class &amp; Sem</th>
                      <th className="py-2.5 px-4">Subject</th>
                      <th className="py-2.5 px-4">Exam Type</th>
                      <th className="py-2.5 px-4 text-center">Candidates</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4">Updated / Marked At</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {savedStatements.map((stmt) => (
                      <tr key={stmt.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">
                          Year {stmt.year} • Sec {stmt.section} (Sem 0{stmt.semester})
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-mono font-bold text-[#781717]">{stmt.subjectCode}</span>
                          <span className="block text-[11px] text-slate-600">{stmt.subjectName}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">{stmt.examCategory}</td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold">{stmt.rows.length}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              stmt.status === 'Mark Statement Marked / Finalized'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {stmt.status === 'Mark Statement Marked / Finalized' ? 'Finalized' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-slate-500">
                          {stmt.markedAt || new Date(stmt.updatedAt).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedYear(stmt.year);
                                setSelectedSemester(stmt.semester);
                                setSelectedClass(stmt.section as any);
                                setSelectedSubjectCode(stmt.subjectCode);
                                setSelectedSubjectName(stmt.subjectName);
                                setSelectedExamCategory(stmt.examCategory);
                                setWorkspaceTab('word-editor');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold text-[11px] hover:bg-indigo-100 cursor-pointer"
                            >
                              Open
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(stmt)}
                              className="px-2.5 py-1 rounded-lg bg-rose-700 text-white font-bold text-[11px] hover:bg-rose-800 cursor-pointer"
                            >
                              PDF
                            </button>
                            <button
                              onClick={() => handleDownloadWordDocx(stmt)}
                              className="px-2.5 py-1 rounded-lg bg-[#781717] text-white font-bold text-[11px] hover:bg-[#5e1111] cursor-pointer"
                            >
                              .docx
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          EXCEL BULK IMPORT MODAL FOR CLASS MARKS
         ======================================================== */}
      <AnimatePresence>
        {isTemplateUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 bg-[#781717] text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black">Import Class Marks from Excel</h2>
                    <p className="text-[11px] text-rose-200">
                      Load student Register No, Name &amp; Marks for Year {selectedYear} • Section {selectedClass}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsTemplateUploadModalOpen(false);
                    setTemplateParsedRecords([]);
                    setTemplateFile(null);
                  }}
                  className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-black text-amber-950 uppercase">
                      1. Download Pre-Filled Class Excel Roster
                    </div>
                    <p className="text-xs text-amber-900/80 mt-0.5">
                      Contains all {classStudents.length} students enrolled in Year {selectedYear} • Class {selectedClass}.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      downloadMarkStatementTemplate({
                        students: classStudents,
                        year: selectedYear,
                        section: selectedClass
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-amber-300 font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Excel Roster</span>
                  </button>
                </div>

                <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 hover:bg-amber-50/20">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleSelectTemplateFile}
                    className="hidden"
                  />
                  <div className="p-3 rounded-2xl bg-amber-100 text-amber-800 mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {templateFile ? templateFile.name : 'Click to select completed Excel file (.xlsx / .csv)'}
                  </span>
                </label>

                {isParsingTemplate && (
                  <div className="p-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full" />
                    <span>Reading class marks from Excel workbook...</span>
                  </div>
                )}

                {templateParseErrors.length > 0 && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Validation Errors</span>
                    </div>
                    <ul className="list-disc pl-5">
                      {templateParseErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {templateParsedRecords.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Register No</th>
                          <th className="py-2 px-3">Student Name</th>
                          <th className="py-2 px-3 text-center">Papers</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {templateParsedRecords.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-mono font-bold text-[#781717]">{item.registerNo}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{item.studentName}</td>
                            <td className="py-2 px-3 text-center font-mono">{item.subjects.length} Subjects</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => {
                    setIsTemplateUploadModalOpen(false);
                    setTemplateParsedRecords([]);
                    setTemplateFile(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommitUploadedExcel}
                  disabled={templateParsedRecords.length === 0}
                  className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer ${
                    templateParsedRecords.length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Load into Word Mark Statement ({templateParsedRecords.length})</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
};
