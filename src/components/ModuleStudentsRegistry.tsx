import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  Filter,
  LayoutGrid,
  List,
  UserPlus,
  Mail,
  Phone,
  GraduationCap,
  Award,
  AlertTriangle,
  CheckCircle2,
  Send,
  X,
  Building,
  UserCheck,
  ShieldCheck,
  TrendingUp,
  Clock,
  Calendar,
  Lock,
  Unlock,
  KeyRound,
  Upload,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit3,
  RefreshCw,
  Sliders,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Save,
  Layers,
  Sparkles,
  ChevronRight,
  Copy,
  Info,
  Check,
  UserX,
  ExternalLink,
  Plus,
  Bell,
  CheckSquare,
  Square
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import { StudentProfile, DepartmentCode, DepartmentCustomization, UserSession } from '../types';
import { INITIAL_DEPARTMENT_CUSTOMIZATIONS } from '../data/mockData';
import { StudentEditModal } from './StudentEditModal';
import { StudentViewProfileModal } from './StudentViewProfileModal';
import { DepartmentCustomizeModal } from './DepartmentCustomizeModal';
import { DepartmentDirectoryGrid } from './DepartmentDirectoryGrid';

interface ModuleStudentsRegistryProps {
  students: StudentProfile[];
  onAddStudent: (student: StudentProfile) => void;
  onUpdateStudent: (student: StudentProfile) => void;
  onDeleteStudent: (studentId: string) => void;
  onBatchUpdateStudents: (students: StudentProfile[]) => void;
  onSendSmsToStudent: (student: StudentProfile) => void;
  session?: UserSession;
}

export const DEPARTMENTS: { code: DepartmentCode; name: string; alias: string; description: string }[] = [
  { code: 'AI&DS', name: 'Artificial Intelligence & Data Science', alias: 'aids', description: 'Machine Learning, Neural Architectures, Data Mining & Big Data Analytics' }
];

export const YEARS: { value: 'I' | 'II' | 'III' | 'IV'; label: string; sem: string; semNums: [number, number] }[] = [
  { value: 'I', label: 'Year I', sem: 'Sem 1 & 2', semNums: [1, 2] },
  { value: 'II', label: 'Year II', sem: 'Sem 3 & 4', semNums: [3, 4] },
  { value: 'III', label: 'Year III', sem: 'Sem 5 & 6', semNums: [5, 6] },
  { value: 'IV', label: 'Year IV', sem: 'Sem 7 & 8', semNums: [7, 8] }
];

export const SECTIONS: ('A' | 'B' | 'C' | 'D' | 'E' | 'F')[] = ['A', 'B', 'C', 'D', 'E', 'F'];

export const ModuleStudentsRegistry: React.FC<ModuleStudentsRegistryProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBatchUpdateStudents,
  onSendSmsToStudent,
  session
}) => {
  const isDeptUser = session && !session.isAdmin && session.department && session.department !== 'ALL';
  const initialDept: DepartmentCode = isDeptUser ? (session.department as DepartmentCode) : 'AI&DS';

  // Dedicated Department Portal View for AI&DS
  const [currentView, setCurrentView] = useState<'overview' | 'department-page'>('department-page');
  const [activeDept, setActiveDept] = useState<DepartmentCode>('AI&DS');

  // Filter States
  const [selectedYear, setSelectedYear] = useState<'all' | 'I' | 'II' | 'III' | 'IV'>('all');
  const [selectedSemester, setSelectedSemester] = useState<'all' | number>('all');
  const [selectedSection, setSelectedSection] = useState<'all' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'shortage'>('all');

  // Multi-Selection State for Batch Actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBatchActionOpen, setIsBatchActionOpen] = useState(false);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const [batchTargetSection, setBatchTargetSection] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('B');
  const [batchTargetSemester, setBatchTargetSemester] = useState<number>(5);

  // Department Customization State with Local Storage
  const [deptConfigs, setDeptConfigs] = useState<Record<string, DepartmentCustomization>>(() => {
    try {
      const saved = localStorage.getItem('vsbec_dept_configs');
      return saved ? JSON.parse(saved) : INITIAL_DEPARTMENT_CUSTOMIZATIONS;
    } catch {
      return INITIAL_DEPARTMENT_CUSTOMIZATIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vsbec_dept_configs', JSON.stringify(deptConfigs));
    } catch (e) {
      console.error(e);
    }
  }, [deptConfigs]);

  // Unlocked Status for Edit Operations
  const [unlockedDepts, setUnlockedDepts] = useState<Record<string, boolean>>({
    'AI&DS': true,
    'CSE': false,
    'ECE': false,
    'EEE': false,
    'IT': false,
    'MECH': false,
    'CIVIL': false,
    'CSE(AIML)': false,
    'CSBS': false,
    'CCE': false,
    'BME': false,
    'BIOTECH': false,
    'CHEM': false
  });

  // Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetDeptForAuth, setTargetDeptForAuth] = useState<DepartmentCode>('AI&DS');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [isDeptCustomizerOpen, setIsDeptCustomizerOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [isSectionManagerOpen, setIsSectionManagerOpen] = useState(false);

  // Upload Form State
  const [uploadMethod, setUploadMethod] = useState<'excel' | 'single' | 'csv'>('excel');
  const [uploadYear, setUploadYear] = useState<'I' | 'II' | 'III' | 'IV'>('III');
  const [uploadSection, setUploadSection] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('A');
  const [uploadBatch, setUploadBatch] = useState('2023 - 2027');
  const [csvText, setCsvText] = useState('');
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [parsedExcelRows, setParsedExcelRows] = useState<StudentProfile[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelParseErrors, setExcelParseErrors] = useState<string[]>([]);

  // Single Add Form State
  const [formName, setFormName] = useState('');
  const [formRegNo, setFormRegNo] = useState('');
  const [formRollNo, setFormRollNo] = useState('');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formParentEmail, setFormParentEmail] = useState('');
  const [formCgpa, setFormCgpa] = useState(8.5);
  const [formAttendance, setFormAttendance] = useState(92);

  // Year Promotion State
  const [promoFromYear, setPromoFromYear] = useState<'I' | 'II' | 'III'>('I');
  const [promoToYear, setPromoToYear] = useState<'II' | 'III' | 'IV'>('II');
  const [promoSelectedStudentIds, setPromoSelectedStudentIds] = useState<string[]>([]);
  const [promoNewBatchTag, setPromoNewBatchTag] = useState('');
  const [promoAdvanceSem, setPromoAdvanceSem] = useState(true);

  // Section Deletion & Re-allocation State
  const [secManageYear, setSecManageYear] = useState<'I' | 'II' | 'III' | 'IV'>('III');
  const [secToDelete, setSecToDelete] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('F');
  const [secDeleteMode, setSecDeleteMode] = useState<'reallocate' | 'delete_all'>('reallocate');
  const [secReallocateTarget, setSecReallocateTarget] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');

  const currentConfig = deptConfigs[activeDept] || INITIAL_DEPARTMENT_CUSTOMIZATIONS[activeDept];
  const isCurrentDeptUnlocked = !!unlockedDepts[activeDept];

  const getDeptAlias = (deptCode: string) => {
    const config = deptConfigs[deptCode];
    if (config?.alias) return config.alias;
    const dept = DEPARTMENTS.find((d) => d.code === deptCode);
    return dept ? dept.alias : deptCode.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const handleOpenPasswordModal = (dept: DepartmentCode) => {
    setTargetDeptForAuth(dept);
    setPasswordInput('');
    setPasswordError('');
    setIsPasswordModalOpen(true);
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = passwordInput.trim().toLowerCase();
    const alias = getDeptAlias(targetDeptForAuth);
    const customPass = deptConfigs[targetDeptForAuth]?.customPassword?.toLowerCase();
    const expected1 = `edit@${alias}`;
    const expected2 = `edit@${targetDeptForAuth.toLowerCase()}`;

    if (cleanInput === expected1 || cleanInput === expected2 || (customPass && cleanInput === customPass)) {
      setUnlockedDepts((prev) => ({ ...prev, [targetDeptForAuth]: true }));
      setPasswordInput('');
      setPasswordError('');
      setIsPasswordModalOpen(false);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } else {
      setPasswordError(`Invalid password. Expected format: edit@${alias}`);
    }
  };

  const handleLockDept = (deptCode: DepartmentCode) => {
    setUnlockedDepts((prev) => ({ ...prev, [deptCode]: false }));
  };

  const handleNavigateToDept = (deptCode: DepartmentCode) => {
    setActiveDept(deptCode);
    setSelectedYear('all');
    setSelectedSection('all');
    setSearchTerm('');
    setSelectedStudentIds([]);
    setCurrentView('department-page');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDepartmentConfig = (updatedConfig: DepartmentCustomization) => {
    setDeptConfigs((prev) => ({
      ...prev,
      [updatedConfig.code]: updatedConfig
    }));
  };

  // Filter students based on Department, Year, Section, Attendance & Search
  const currentDeptStudents = students.filter((s) => s.department === activeDept);

  const filteredStudents = currentDeptStudents.filter((s) => {
    const matchesYear = selectedYear === 'all' || s.year === selectedYear;
    const matchesSemester = selectedSemester === 'all' || s.semester === selectedSemester;
    const matchesSection = selectedSection === 'all' || s.section === selectedSection;
    const matchesAttendance =
      attendanceFilter === 'all' || (attendanceFilter === 'shortage' && s.attendancePercentage < 75);
    const query = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !query ||
      s.name.toLowerCase().includes(query) ||
      s.registerNo.includes(query) ||
      s.rollNo.toLowerCase().includes(query) ||
      s.parentName.toLowerCase().includes(query);

    return matchesYear && matchesSemester && matchesSection && matchesAttendance && matchesSearch;
  });

  // Calculate Department Stats
  const totalInDept = currentDeptStudents.length;
  const avgCgpa =
    totalInDept > 0
      ? (currentDeptStudents.reduce((acc, s) => acc + s.cgpa, 0) / totalInDept).toFixed(2)
      : '0.00';
  const attendanceShortageCount = currentDeptStudents.filter((s) => s.attendancePercentage < 75).length;

  // Single Student Enrollment
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formRegNo || !formRollNo) return;

    const newProfile: StudentProfile = {
      id: `STU-${Date.now().toString().slice(-5)}`,
      name: formName.trim(),
      registerNo: formRegNo.trim(),
      rollNo: formRollNo.trim(),
      department: activeDept,
      degree: currentConfig?.degreeTitle || `B.E. ${activeDept}`,
      year: uploadYear,
      semester: uploadYear === 'I' ? 1 : uploadYear === 'II' ? 3 : uploadYear === 'III' ? 5 : 7,
      section: uploadSection,
      batch: uploadBatch || '2023 - 2027',
      cgpa: Number(formCgpa) || 8.0,
      attendancePercentage: Number(formAttendance) || 90,
      parentName: formParentName.trim() || 'Guardian',
      parentPhone: formParentPhone.trim() || '+91 94430 00000',
      parentEmail: formParentEmail.trim() || 'parent@vsbec.ac.in',
      mentorName: currentConfig?.hodName || 'Department Faculty Mentor',
      bloodGroup: 'O+ve',
      admissionType: 'TNEA Government Quota',
      iat1Average: 88,
      iat2Average: 90,
      historyOfArrears: 0,
      activeStatus: 'Active'
    };

    onAddStudent(newProfile);
    setFormName('');
    setFormRegNo('');
    setFormRollNo('');
    setFormParentName('');
    setFormParentPhone('');
    setFormParentEmail('');
    setUploadSuccessMsg(`Successfully enrolled ${newProfile.name} in Year ${uploadYear}, Section ${uploadSection}!`);
    setTimeout(() => setUploadSuccessMsg(''), 4000);
  };

  // CSV / Batch Upload Handler
  const handleProcessCsv = () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split('\n');
    const newAdded: StudentProfile[] = [];

    lines.forEach((line, idx) => {
      if (idx === 0 && line.toLowerCase().includes('reg')) return;
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 3) {
        const regNo = parts[0];
        const rollNo = parts[1] || `${activeDept.slice(0, 2)}${idx + 10}`;
        const name = parts[2];
        const parentName = parts[3] || 'Guardian';
        const parentPhone = parts[4] || '+91 99440 00000';
        const cgpa = parts[5] ? parseFloat(parts[5]) : 8.5;
        const att = parts[6] ? parseFloat(parts[6]) : 92;

        newAdded.push({
          id: `STU-CSV-${Date.now().toString().slice(-4)}-${idx}`,
          name,
          registerNo: regNo,
          rollNo,
          department: activeDept,
          degree: currentConfig?.degreeTitle || `B.E. ${activeDept}`,
          year: uploadYear,
          semester: uploadYear === 'I' ? 1 : uploadYear === 'II' ? 3 : uploadYear === 'III' ? 5 : 7,
          section: uploadSection,
          batch: uploadBatch || '2023 - 2027',
          cgpa,
          attendancePercentage: att,
          parentName,
          parentPhone,
          parentEmail: 'parent@vsbec.ac.in',
          mentorName: currentConfig?.hodName || 'Assigned Mentor',
          bloodGroup: 'O+ve',
          admissionType: 'TNEA Government Quota',
          iat1Average: 85,
          iat2Average: 87,
          historyOfArrears: 0,
          activeStatus: 'Active'
        });
      }
    });

    if (newAdded.length > 0) {
      onBatchUpdateStudents([...newAdded, ...students]);
      setCsvText('');
      setUploadSuccessMsg(`Successfully imported ${newAdded.length} candidates into Year ${uploadYear}, Section ${uploadSection}!`);
      setTimeout(() => setUploadSuccessMsg(''), 4000);
      confetti({ particleCount: 70, spread: 60 });
    }
  };

  // Download clean blank Excel Template with required & optional columns
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        RegisterNo: '',
        RollNo: '',
        Name: '',
        Department: activeDept,
        Year: uploadYear,
        Semester: uploadYear === 'I' ? 1 : uploadYear === 'II' ? 3 : uploadYear === 'III' ? 5 : 7,
        Section: uploadSection,
        Batch: uploadBatch || '2023 - 2027',
        CGPA: '',
        Attendance: '',
        IAT1: '',
        IAT2: '',
        Arrears: '',
        ParentName: '',
        ParentPhone: '',
        ParentEmail: '',
        EmergencyContact: '',
        BloodGroup: '',
        Gender: '',
        AdmissionQuota: '',
        MentorName: currentConfig?.hodName || 'Faculty Mentor',
        HostelStatus: '',
        Address: ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeDept}_Roster`);
    XLSX.writeFile(workbook, `VSBEC_${activeDept}_Student_Registry_Template.xlsx`);
  };

  // Process Excel File Upload
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setExcelParseErrors([]);
    setParsedExcelRows([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setExcelParseErrors(['The uploaded file contains no data rows.']);
          return;
        }

        const parsed: StudentProfile[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, idx) => {
          const normalized: Record<string, any> = {};
          Object.keys(row).forEach((key) => {
            const cleanKey = key.trim().toLowerCase().replace(/[\s_\-]/g, '');
            normalized[cleanKey] = row[key];
          });

          const regNo = String(
            normalized['registerno'] ||
              normalized['regno'] ||
              normalized['registernumber'] ||
              normalized['registrationnumber'] ||
              normalized['reg'] ||
              ''
          ).trim();

          const name = String(
            normalized['name'] ||
              normalized['studentname'] ||
              normalized['candidatename'] ||
              normalized['fullname'] ||
              ''
          ).trim();

          const rollNo = String(
            normalized['rollno'] ||
              normalized['rollnumber'] ||
              normalized['roll'] ||
              `${activeDept.slice(0, 2)}${idx + 101}`
          ).trim();

          if (!regNo && !name) {
            return;
          }

          if (!regNo) {
            errors.push(`Row ${idx + 2}: Missing required Register Number.`);
            return;
          }

          if (!name) {
            errors.push(`Row ${idx + 2} (${regNo}): Missing required Student Name.`);
            return;
          }

          const rawCgpa = parseFloat(normalized['cgpa'] || normalized['gpa'] || '8.5');
          const cgpa = isNaN(rawCgpa) ? 8.5 : Math.min(10, Math.max(0, rawCgpa));

          const rawAtt = parseFloat(normalized['attendance'] || normalized['attendancepercentage'] || normalized['att'] || '92');
          const attendancePercentage = isNaN(rawAtt) ? 92 : Math.min(100, Math.max(0, rawAtt));

          const parentName = String(normalized['parentname'] || normalized['guardianname'] || normalized['fathername'] || 'Guardian').trim();
          const parentPhone = String(normalized['parentphone'] || normalized['parentmobile'] || normalized['phone'] || normalized['mobile'] || '+91 94430 00000').trim();
          const parentEmail = String(normalized['parentemail'] || normalized['email'] || 'parent@vsbec.ac.in').trim();
          const emergencyContact = String(normalized['emergencycontact'] || normalized['emergencyphone'] || parentPhone).trim();

          const bloodGroup = String(normalized['bloodgroup'] || normalized['blood'] || 'O+ve').trim();
          const gender = (normalized['gender'] || 'Male').trim() as any;
          const admissionType = (normalized['admissionquota'] || normalized['admissiontype'] || normalized['quota'] || 'TNEA Government Quota').trim() as any;
          const mentorName = String(normalized['mentorname'] || normalized['mentor'] || currentConfig?.hodName || 'Assigned Mentor').trim();
          const hostelStatus = (normalized['hostelstatus'] || normalized['hostel'] || normalized['accommodation'] || 'Day Scholar').trim() as any;
          const residentialAddress = String(normalized['address'] || normalized['residentialaddress'] || '').trim();

          const iat1 = parseFloat(normalized['iat1'] || normalized['iat1average'] || '86');
          const iat2 = parseFloat(normalized['iat2'] || normalized['iat2average'] || '88');
          const arrears = parseInt(normalized['arrears'] || normalized['historyofarrears'] || '0') || 0;

          const rowYear = (normalized['year'] || uploadYear) as any;
          const rowSection = (normalized['section'] || uploadSection) as any;
          const rowBatch = String(normalized['batch'] || uploadBatch || '2023 - 2027').trim();

          parsed.push({
            id: `STU-XLSX-${Date.now().toString().slice(-4)}-${idx}`,
            name,
            registerNo: regNo,
            rollNo,
            department: activeDept,
            degree: currentConfig?.degreeTitle || `B.E. ${activeDept}`,
            year: rowYear,
            semester: rowYear === 'I' ? 1 : rowYear === 'II' ? 3 : rowYear === 'III' ? 5 : 7,
            section: rowSection,
            batch: rowBatch,
            cgpa,
            attendancePercentage,
            parentName,
            parentPhone,
            parentEmail,
            emergencyContact,
            mentorName,
            bloodGroup,
            gender,
            admissionType,
            iat1Average: isNaN(iat1) ? 86 : iat1,
            iat2Average: isNaN(iat2) ? 88 : iat2,
            historyOfArrears: arrears,
            activeStatus: 'Active',
            hostelStatus,
            residentialAddress
          });
        });

        setParsedExcelRows(parsed);
        setExcelParseErrors(errors);
      } catch (err: any) {
        console.error('Failed to parse Excel file:', err);
        setExcelParseErrors(['Failed to read Excel file. Please ensure it is a valid .xlsx or .xls file.']);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Commit Excel import
  const handleCommitExcelImport = () => {
    if (parsedExcelRows.length === 0) return;
    onBatchUpdateStudents([...parsedExcelRows, ...students]);
    setUploadSuccessMsg(`Successfully imported ${parsedExcelRows.length} candidates from "${excelFileName}" into ${activeDept}!`);
    setParsedExcelRows([]);
    setExcelFileName('');
    setExcelParseErrors([]);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => {
      setUploadSuccessMsg('');
      setIsUploadModalOpen(false);
    }, 2500);
  };

  // Promotion Execution
  const handleExecutePromotion = () => {
    const targetStudents = students.filter(
      (s) =>
        s.department === activeDept &&
        s.year === promoFromYear &&
        (promoSelectedStudentIds.length === 0 || promoSelectedStudentIds.includes(s.id))
    );

    if (targetStudents.length === 0) return;

    const semIncrement = promoAdvanceSem ? 2 : 0;

    const updated = students.map((s) => {
      if (
        s.department === activeDept &&
        s.year === promoFromYear &&
        (promoSelectedStudentIds.length === 0 || promoSelectedStudentIds.includes(s.id))
      ) {
        return {
          ...s,
          year: promoToYear,
          semester: Math.min(8, s.semester + semIncrement),
          batch: promoNewBatchTag.trim() ? promoNewBatchTag.trim() : s.batch
        };
      }
      return s;
    });

    onBatchUpdateStudents(updated);
    setIsPromotionModalOpen(false);
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
  };

  // Section Deletion & Re-allocation Execution
  const handleExecuteSectionDeletion = () => {
    const affected = students.filter(
      (s) => s.department === activeDept && s.year === secManageYear && s.section === secToDelete
    );

    if (affected.length === 0) {
      setIsSectionManagerOpen(false);
      return;
    }

    let updated: StudentProfile[];
    if (secDeleteMode === 'reallocate') {
      updated = students.map((s) => {
        if (s.department === activeDept && s.year === secManageYear && s.section === secToDelete) {
          return { ...s, section: secReallocateTarget };
        }
        return s;
      });
    } else {
      updated = students.filter(
        (s) => !(s.department === activeDept && s.year === secManageYear && s.section === secToDelete)
      );
    }

    onBatchUpdateStudents(updated);
    setIsSectionManagerOpen(false);
    confetti({ particleCount: 50 });
  };

  // Multi-Select Batch Actions
  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleBatchMoveSection = () => {
    if (selectedStudentIds.length === 0) return;
    const updated = students.map((s) => {
      if (selectedStudentIds.includes(s.id)) {
        return { ...s, section: batchTargetSection };
      }
      return s;
    });
    onBatchUpdateStudents(updated);
    setIsBatchActionOpen(false);
    setSelectedStudentIds([]);
    confetti({ particleCount: 40 });
  };

  const handleBatchDeleteSelected = () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirmBatchDelete) {
      setConfirmBatchDelete(true);
      return;
    }
    const updated = students.filter((s) => !selectedStudentIds.includes(s.id));
    onBatchUpdateStudents(updated);
    setSelectedStudentIds([]);
    setConfirmBatchDelete(false);
  };

  // Export CSV of current filtered roster
  const handleExportRoster = () => {
    const headers = 'RegisterNo,RollNo,Name,Department,Year,Semester,Section,Batch,CGPA,Attendance,ParentName,ParentPhone\n';
    const rows = filteredStudents
      .map(
        (s) =>
          `"${s.registerNo}","${s.rollNo}","${s.name}","${s.department}","${s.year}","${s.semester}","${s.section}","${s.batch}","${s.cgpa}","${s.attendancePercentage}","${s.parentName}","${s.parentPhone}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `VSBEC_${activeDept}_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* View 1: 13 Departments Directory Overview */}
      {currentView === 'overview' && (
        <DepartmentDirectoryGrid
          departments={DEPARTMENTS}
          students={students}
          departmentConfigs={deptConfigs}
          unlockedDepts={unlockedDepts}
          onSelectDepartment={handleNavigateToDept}
          onCustomizeDepartment={(dept) => {
            setActiveDept(dept);
            setIsDeptCustomizerOpen(true);
          }}
          onUnlockDepartment={handleOpenPasswordModal}
        />
      )}

      {/* View 2: Dedicated Department Management Portal */}
      {currentView === 'department-page' && (
        <div className="space-y-6">
          {/* Top Scope Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-[#781717] font-black text-xs flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Department of Artificial Intelligence & Data Science (AI&DS)
              </span>
              <span className="text-[11px] text-slate-500 font-bold hidden sm:inline">
                Official Student Enrollment Registry • Regulation R-2021 CBCS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#781717]">
                Total Enrolled: {totalInDept} Candidates
              </span>
            </div>
          </div>

          {/* Department Hero Portal Banner */}
          <div className="bg-[#781717] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-wider uppercase mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>DEPARTMENT PORTAL • {activeDept}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  {currentConfig?.name || DEPARTMENTS.find((d) => d.code === activeDept)?.name}
                </h1>
                <p className="text-xs sm:text-sm text-rose-200 mt-1 font-medium flex flex-wrap items-center gap-2 sm:gap-3">
                  <span>HOD: {currentConfig?.hodName}</span>
                  <span>•</span>
                  <span>{currentConfig?.regulation || 'Autonomous Regulation R-2021'}</span>
                  <span>•</span>
                  <span>{currentConfig?.naacGrade || 'NAAC A+ Certified'}</span>
                </p>

                {currentConfig?.departmentNotice && (
                  <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-bold">
                    <Bell className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>{currentConfig.departmentNotice}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Customize, Upload, Promotion, Section Manager, Lock/Unlock */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <button
                  onClick={() => setIsDeptCustomizerOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs sm:text-sm border border-white/20 cursor-pointer transition-all active:scale-95"
                >
                  <Sliders className="w-4 h-4 text-amber-300" />
                  <span>Customize Dept</span>
                </button>

                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md hover:bg-amber-300 cursor-pointer transition-all active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>Enroll Candidates</span>
                </button>

                {isCurrentDeptUnlocked ? (
                  <>
                    <button
                      onClick={() => setIsPromotionModalOpen(true)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Promote Year</span>
                    </button>

                    <button
                      onClick={() => setIsSectionManagerOpen(true)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer transition-all active:scale-95"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Manage Sections</span>
                    </button>

                    <button
                      onClick={() => handleLockDept(activeDept)}
                      className="p-2.5 rounded-2xl bg-red-950/80 hover:bg-red-950 text-rose-300 border border-rose-800 cursor-pointer transition-all"
                      title="Lock Edit Options"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleOpenPasswordModal(activeDept)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-red-950/80 hover:bg-red-950 text-amber-300 border border-amber-400/40 font-black text-xs sm:text-sm shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Unlock Edit (edit@{getDeptAlias(activeDept)})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Department Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-rose-900/60 relative z-10">
              <div className="bg-red-950/60 rounded-2xl p-3.5 border border-red-800/60">
                <span className="text-[11px] font-bold text-rose-300 uppercase">Total Enrolled</span>
                <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{totalInDept} Candidates</p>
              </div>
              <div className="bg-red-950/60 rounded-2xl p-3.5 border border-red-800/60">
                <span className="text-[11px] font-bold text-rose-300 uppercase">Class CGPA Average</span>
                <p className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{avgCgpa}</p>
              </div>
              <div className="bg-red-950/60 rounded-2xl p-3.5 border border-red-800/60">
                <span className="text-[11px] font-bold text-rose-300 uppercase">Attendance &lt;75%</span>
                <p className="text-xl sm:text-2xl font-black text-rose-300 mt-0.5">{attendanceShortageCount}</p>
              </div>
              <div className="bg-red-950/60 rounded-2xl p-3.5 border border-red-800/60">
                <span className="text-[11px] font-bold text-rose-300 uppercase">Intake & Capacity</span>
                <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{currentConfig?.sanctionedIntake || 180} Seats</p>
              </div>
            </div>
          </div>

          {/* Academic Year, Curricular Semester & Section Dropdowns */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-50/80 rounded-2xl border border-red-200">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#781717] text-white text-xs font-black flex items-center justify-center shrink-0">
                  ✓
                </span>
                <div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide block">
                    Student Registry Roster Filters (AI&DS Dept)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Select Year, Semester, and Section from the dropdowns below to filter student cohorts
                  </span>
                </div>
              </div>

              <span className="text-xs font-bold text-[#781717] font-mono shrink-0">
                Filtered: {filteredStudents.length} of {totalInDept} Candidates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Year Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#781717]" />
                  Academic Year Dropdown
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
                >
                  <option value="all">All Academic Years ({totalInDept} Students)</option>
                  <option value="I">Year I (1st Year • Batch 2025-2029)</option>
                  <option value="II">Year II (2nd Year • Batch 2024-2028)</option>
                  <option value="III">Year III (3rd Year • Batch 2023-2027)</option>
                  <option value="IV">Year IV (4th Year • Batch 2022-2026)</option>
                </select>
              </div>

              {/* Semester Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#781717]" />
                  Curricular Semester Dropdown
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#781717]/40 bg-red-50/50 text-xs font-black text-[#781717] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
                >
                  <option value="all">All Semesters (Sem 1 to 8)</option>
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

              {/* Section Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  Section Dropdown
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs cursor-pointer"
                >
                  <option value="all">All Sections (A, B, C & D)</option>
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                  <option value="D">Section D</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search, Filter Bar & Batch Controls */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Name, Reg No, Roll No..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#781717]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
                {/* Attendance Filter */}
                <select
                  value={attendanceFilter}
                  onChange={(e) => setAttendanceFilter(e.target.value as any)}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="all">All Attendance</option>
                  <option value="shortage">Shortage (&lt;75%)</option>
                </select>

                {/* Export CSV */}
                <button
                  onClick={handleExportRoster}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer transition-all"
                  title="Download Roster CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>

                {/* Grid / Table Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      viewMode === 'grid' ? 'bg-white text-[#781717] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      viewMode === 'table' ? 'bg-white text-[#781717] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Batch Action Floating Toolbar */}
            {selectedStudentIds.length > 0 && (
              <div className="mb-5 p-3.5 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-lg">
                    {selectedStudentIds.length} Selected
                  </span>
                  <span className="text-xs text-slate-300 font-medium">Batch Operations</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                    <span className="text-xs text-slate-400">Move to Sec:</span>
                    <select
                      value={batchTargetSection}
                      onChange={(e) => setBatchTargetSection(e.target.value as any)}
                      className="bg-slate-700 text-amber-300 text-xs font-bold rounded px-1.5 py-0.5"
                    >
                      {SECTIONS.map((sec) => (
                        <option key={sec} value={sec}>
                          Sec {sec}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleBatchMoveSection}
                      className="px-2 py-0.5 bg-amber-400 text-slate-950 text-xs font-black rounded hover:bg-amber-300 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {!confirmBatchDelete ? (
                    <button
                      onClick={() => setConfirmBatchDelete(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 bg-rose-950/60 px-2 py-1 rounded-xl border border-rose-500">
                      <span className="text-[11px] font-bold text-rose-200 px-1">Remove {selectedStudentIds.length}?</span>
                      <button
                        onClick={handleBatchDeleteSelected}
                        className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmBatchDelete(false)}
                        className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedStudentIds([]);
                      setConfirmBatchDelete(false);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Students List or Grid */}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-black text-slate-700">No Student Records Found</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  There are no candidates matching the active filter criteria for Year {selectedYear} in {activeDept}.
                </p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#781717] text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Enroll First Candidate</span>
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      className={`bg-slate-50/80 rounded-2xl p-4 sm:p-5 border transition-all relative flex flex-col justify-between group ${
                        isSelected
                          ? 'border-[#781717] bg-rose-50/40 ring-2 ring-[#781717]/20 shadow-md'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      {/* Checkbox for batch selection */}
                      <button
                        type="button"
                        onClick={() => handleToggleSelectStudent(student.id)}
                        className="absolute top-3 left-3 text-slate-400 hover:text-[#781717] cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#781717]" />
                        ) : (
                          <Square className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                        )}
                      </button>

                      {/* Quick Edit Icon */}
                      <button
                        type="button"
                        onClick={() => setEditingStudent(student)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-[#781717] cursor-pointer transition-all shadow-xs"
                        title="Edit All Details for Student"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <div className="pl-6 pt-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-black text-slate-900 leading-snug">{student.name}</h4>
                            <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">
                              {student.registerNo}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-black">
                            Roll: {student.rollNo}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#781717]/10 text-[#781717] text-[10px] font-black">
                            Year {student.year} - Sec {student.section}
                          </span>
                        </div>

                        {/* Performance Badges */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/70 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">CGPA</span>
                            <span className="font-black text-amber-600">{student.cgpa.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Attendance</span>
                            <span
                              className={`font-black ${
                                student.attendancePercentage < 75 ? 'text-rose-600 font-black' : 'text-emerald-600'
                              }`}
                            >
                              {student.attendancePercentage}%
                            </span>
                          </div>
                        </div>

                        {/* Guardian Contact Info */}
                        <div className="mt-2.5 pt-2 border-t border-slate-200/50 text-[11px] text-slate-600 space-y-0.5">
                          <p className="truncate">
                            <span className="text-slate-400 font-medium">Guardian:</span>{' '}
                            <span className="font-bold">{student.parentName}</span>
                          </p>
                          <p className="font-mono text-slate-500">
                            <span className="text-slate-400">Mobile:</span> {student.parentPhone}
                          </p>
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black cursor-pointer transition-all"
                        >
                          View Profile
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingStudent(student)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black cursor-pointer transition-all"
                          title="Edit Student"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => onSendSmsToStudent(student)}
                          className="p-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer transition-all"
                          title="Send Parent SMS"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Comprehensive Table View */
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3 w-8">
                        <button
                          type="button"
                          onClick={handleSelectAllFiltered}
                          className="cursor-pointer text-slate-500 hover:text-slate-900"
                        >
                          {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-[#781717]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="p-3">Register No</th>
                      <th className="p-3">Roll No</th>
                      <th className="p-3">Candidate Name</th>
                      <th className="p-3">Year / Sec</th>
                      <th className="p-3">CGPA</th>
                      <th className="p-3">Attendance</th>
                      <th className="p-3">Guardian Mobile</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white font-medium">
                    {filteredStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-rose-50/40' : ''}`}
                        >
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectStudent(student.id)}
                              className="cursor-pointer text-slate-400 hover:text-[#781717]"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#781717]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">{student.registerNo}</td>
                          <td className="p-3 font-mono text-slate-600">{student.rollNo}</td>
                          <td className="p-3 font-bold text-slate-900">{student.name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-800 text-[11px]">
                              Yr {student.year}-{student.section}
                            </span>
                          </td>
                          <td className="p-3 font-black text-amber-600">{student.cgpa.toFixed(2)}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                student.attendancePercentage < 75
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {student.attendancePercentage}%
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-600">{student.parentPhone}</td>
                          <td className="p-3 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingStudent(student)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-black text-[11px] cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStudent(student)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-[11px] cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendSmsToStudent(student)}
                              className="p-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer inline-flex items-center"
                              title="Send SMS"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteStudent(student.id)}
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer inline-flex items-center"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: DEPARTMENT ACCESS UNLOCK PASSKEY
         ======================================================== */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative"
            >
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-2xl bg-amber-100 text-amber-900">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Unlock Department</h3>
                  <p className="text-xs text-slate-500 font-medium">{targetDeptForAuth} Department Portal</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Enter the administrative secret key to unlock modification of student rosters, promotion workflows,
                and department settings for <strong className="text-slate-900">{targetDeptForAuth}</strong>.
              </p>

              <form onSubmit={handleVerifyPassword} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Passkey (Format: <code className="text-[#781717]">edit@{getDeptAlias(targetDeptForAuth)}</code>)
                  </label>
                  <input
                    type="password"
                    autoFocus
                    placeholder={`e.g. edit@${getDeptAlias(targetDeptForAuth)}`}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#781717]"
                  />
                  {passwordError && (
                    <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{passwordError}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordInput(`edit@${getDeptAlias(targetDeptForAuth)}`);
                    }}
                    className="text-xs text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
                  >
                    Auto-Fill Secret Key
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-[#781717] hover:bg-[#601212] text-white font-black text-xs shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    Authenticate
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL 2: YEAR-TO-YEAR PROMOTION ENGINE
         ======================================================== */}
      <AnimatePresence>
        {isPromotionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-8"
            >
              <button
                onClick={() => setIsPromotionModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Academic Year Promotion Engine</h3>
                  <p className="text-xs text-slate-500 font-medium">{activeDept} Department</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Promote From
                    </label>
                    <select
                      value={promoFromYear}
                      onChange={(e) => {
                        const from = e.target.value as any;
                        setPromoFromYear(from);
                        setPromoToYear(from === 'I' ? 'II' : from === 'II' ? 'III' : 'IV');
                        setPromoSelectedStudentIds([]);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold"
                    >
                      <option value="I">Year I (Sem 1 & 2)</option>
                      <option value="II">Year II (Sem 3 & 4)</option>
                      <option value="III">Year III (Sem 5 & 6)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Promote To
                    </label>
                    <select
                      value={promoToYear}
                      onChange={(e) => setPromoToYear(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-emerald-700"
                    >
                      <option value="II">Year II (Sem 3 & 4)</option>
                      <option value="III">Year III (Sem 5 & 6)</option>
                      <option value="IV">Year IV (Sem 7 & 8)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="advanceSemCheck"
                    checked={promoAdvanceSem}
                    onChange={(e) => setPromoAdvanceSem(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <label htmlFor="advanceSemCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Advance Semester counter by +2 automatically (e.g. Sem 3 to Sem 5)
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Update Academic Batch Tag (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2024 - 2028 (leave blank to keep unchanged)"
                    value={promoNewBatchTag}
                    onChange={(e) => setPromoNewBatchTag(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsPromotionModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecutePromotion}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Execute Year Promotion</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL 3: SECTION MANAGER & DELETION CONTROLS
         ======================================================== */}
      <AnimatePresence>
        {isSectionManagerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-8"
            >
              <button
                onClick={() => setIsSectionManagerOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-800">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Manage Sections (A to F)</h3>
                  <p className="text-xs text-slate-500 font-medium">{activeDept} Department</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                      Academic Year
                    </label>
                    <select
                      value={secManageYear}
                      onChange={(e) => setSecManageYear(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                    >
                      <option value="I">Year I</option>
                      <option value="II">Year II</option>
                      <option value="III">Year III</option>
                      <option value="IV">Year IV</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                      Target Section
                    </label>
                    <select
                      value={secToDelete}
                      onChange={(e) => setSecToDelete(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-indigo-700"
                    >
                      {SECTIONS.map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                    Operation Strategy
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="secDeleteMode"
                        checked={secDeleteMode === 'reallocate'}
                        onChange={() => setSecDeleteMode('reallocate')}
                        className="text-[#781717]"
                      />
                      <span>Re-allocate enrolled candidates to another section</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-rose-600 cursor-pointer">
                      <input
                        type="radio"
                        name="secDeleteMode"
                        checked={secDeleteMode === 'delete_all'}
                        onChange={() => setSecDeleteMode('delete_all')}
                        className="text-rose-600"
                      />
                      <span>Permanently purge section and delete enrolled records</span>
                    </label>
                  </div>
                </div>

                {secDeleteMode === 'reallocate' && (
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                      Move All Candidates Into Section:
                    </label>
                    <select
                      value={secReallocateTarget}
                      onChange={(e) => setSecReallocateTarget(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                    >
                      {SECTIONS.filter((s) => s !== secToDelete).map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsSectionManagerOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteSectionDeletion}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    Execute Section Update
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL 4: ENROLL / UPLOAD STUDENTS MODAL (EXCEL & CSV)
         ======================================================== */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative my-6 max-h-[92vh] flex flex-col"
            >
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setParsedExcelRows([]);
                  setExcelFileName('');
                  setExcelParseErrors([]);
                }}
                className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4 shrink-0">
                <div className="p-3 rounded-2xl bg-[#781717]/10 text-[#781717]">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Enroll Candidates & Excel Import</h3>
                  <p className="text-xs text-slate-500 font-medium">{activeDept} Department • Autonomous Registry</p>
                </div>
              </div>

              {uploadSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{uploadSuccessMsg}</span>
                </div>
              )}

              {/* Target Academic Batch Settings */}
              <div className="grid grid-cols-3 gap-3 mb-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 shrink-0">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold"
                  >
                    <option value="I">Year I (Sem 1 & 2)</option>
                    <option value="II">Year II (Sem 3 & 4)</option>
                    <option value="III">Year III (Sem 5 & 6)</option>
                    <option value="IV">Year IV (Sem 7 & 8)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Section
                  </label>
                  <select
                    value={uploadSection}
                    onChange={(e) => setUploadSection(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-amber-600"
                  >
                    {SECTIONS.map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Batch Tag
                  </label>
                  <input
                    type="text"
                    value={uploadBatch}
                    onChange={(e) => setUploadBatch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Method Switcher Tabs */}
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setUploadMethod('excel')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    uploadMethod === 'excel'
                      ? 'bg-[#781717] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Upload Excel File (.xlsx, .xls)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadMethod('single')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    uploadMethod === 'single'
                      ? 'bg-[#781717] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Single Candidate Form</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadMethod('csv')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    uploadMethod === 'csv'
                      ? 'bg-[#781717] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Paste CSV Text</span>
                </button>
              </div>

              {/* Tab 1: Excel File Upload */}
              {uploadMethod === 'excel' && (
                <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
                  {/* Action Bar: Download Template & Instructions */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Required & Supported Excel Columns:</span>
                      </h4>
                      <p className="text-[11px] text-amber-900 mt-0.5">
                        <span className="font-bold underline">Required:</span> RegisterNo (12 digits), RollNo, Name.
                        <br />
                        <span className="font-medium text-amber-800">
                          Optional: CGPA, Attendance, ParentName, ParentPhone, ParentEmail, EmergencyContact, BloodGroup, Gender, AdmissionQuota, MentorName, HostelStatus, IAT1, IAT2, Arrears.
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadExcelTemplate}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xs cursor-pointer transition-all shrink-0 active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download .xlsx Template</span>
                    </button>
                  </div>

                  {/* Dropzone File Input */}
                  <div className="border-2 border-dashed border-slate-300 hover:border-[#781717] rounded-3xl p-6 text-center transition-all bg-slate-50/50 hover:bg-rose-50/20 relative group">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleExcelFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <FileSpreadsheet className="w-12 h-12 text-[#781717] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <h5 className="text-sm font-black text-slate-800">
                      {excelFileName ? `Selected: ${excelFileName}` : 'Choose or Drag & Drop Excel File (.xlsx, .xls)'}
                    </h5>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports Excel workbooks and CSV files formatted with standard college columns.
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Browse Spreadsheet</span>
                    </span>
                  </div>

                  {/* Parse Errors if any */}
                  {excelParseErrors.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Validation Warnings ({excelParseErrors.length}):</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] space-y-0.5">
                        {excelParseErrors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Parsed Preview Table */}
                  {parsedExcelRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">
                          Parsed Records Preview ({parsedExcelRows.length} Candidates Ready)
                        </span>
                        <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                          ✓ All Required Columns Verified
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-bold text-slate-600">
                            <tr>
                              <th className="py-2 px-3">#</th>
                              <th className="py-2 px-3">Register No</th>
                              <th className="py-2 px-3">Roll No</th>
                              <th className="py-2 px-3">Student Name</th>
                              <th className="py-2 px-3">CGPA</th>
                              <th className="py-2 px-3">Att %</th>
                              <th className="py-2 px-3">Parent / Contact</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {parsedExcelRows.slice(0, 15).map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50/80">
                                <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">{i + 1}</td>
                                <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{r.registerNo}</td>
                                <td className="py-1.5 px-3 font-mono text-slate-600">{r.rollNo}</td>
                                <td className="py-1.5 px-3 font-bold text-slate-900">{r.name}</td>
                                <td className="py-1.5 px-3 font-bold text-amber-600">{r.cgpa.toFixed(2)}</td>
                                <td className="py-1.5 px-3 font-bold text-emerald-600">{r.attendancePercentage}%</td>
                                <td className="py-1.5 px-3 text-slate-600 text-[11px]">
                                  {r.parentName} ({r.parentPhone})
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {parsedExcelRows.length > 15 && (
                        <p className="text-[11px] text-slate-400 text-center">
                          Showing first 15 of {parsedExcelRows.length} candidates.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleCommitExcelImport}
                        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Enroll All {parsedExcelRows.length} Candidates into {activeDept}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Single Student Form */}
              {uploadMethod === 'single' && (
                <div className="flex-1 overflow-y-auto py-3 pr-1">
                  <form onSubmit={handleCreateStudent} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        placeholder="Candidate Full Name *"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Register No (12 digits) *"
                        value={formRegNo}
                        onChange={(e) => setFormRegNo(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Roll No (e.g. 23CS012) *"
                        value={formRollNo}
                        onChange={(e) => setFormRollNo(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <input
                        type="text"
                        placeholder="Parent/Guardian Name"
                        value={formParentName}
                        onChange={(e) => setFormParentName(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Parent Phone (+91 ...)"
                        value={formParentPhone}
                        onChange={(e) => setFormParentPhone(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="CGPA (0 - 10)"
                        value={formCgpa}
                        onChange={(e) => setFormCgpa(parseFloat(e.target.value))}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                      />
                      <input
                        type="number"
                        placeholder="Attendance %"
                        value={formAttendance}
                        onChange={(e) => setFormAttendance(parseInt(e.target.value))}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={!formName || !formRegNo || !formRollNo}
                        className={`px-5 py-2.5 rounded-xl text-white font-black text-xs shadow-md transition-all ${
                          formName && formRegNo && formRollNo
                            ? 'bg-[#781717] hover:bg-[#601212] cursor-pointer'
                            : 'bg-slate-300 cursor-not-allowed'
                        }`}
                      >
                        Enroll Single Candidate
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab 3: CSV Paste */}
              {uploadMethod === 'csv' && (
                <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Paste Comma-Separated Values (CSV)</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      RegisterNo, RollNo, Name, ParentName, ParentPhone, CGPA, Attendance
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    placeholder="RegisterNo, RollNo, Name, ParentName, ParentPhone, CGPA, Attendance..."
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#781717]"
                  />
                  {csvText.trim() && (
                    <button
                      type="button"
                      onClick={handleProcessCsv}
                      className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md cursor-pointer transition-all"
                    >
                      Process and Import CSV Candidates
                    </button>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 shrink-0">
                <span className="text-[11px] text-slate-500 font-medium">
                  Enrolling into {activeDept} • Year {uploadYear} • Section {uploadSection}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setParsedExcelRows([]);
                    setExcelFileName('');
                    setExcelParseErrors([]);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL 5: FULL COMPREHENSIVE STUDENT PROFILE VIEW MODAL
         ======================================================== */}
      <StudentViewProfileModal
        student={selectedStudent}
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onEdit={(stu) => {
          setSelectedStudent(null);
          setEditingStudent(stu);
        }}
        onSendSms={(stu) => {
          onSendSmsToStudent(stu);
        }}
      />

      {/* ========================================================
          MODAL 6: FULL STUDENT EDIT MODAL
         ======================================================== */}
      <StudentEditModal
        student={editingStudent}
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        onSave={(updated) => {
          onUpdateStudent(updated);
        }}
      />

      {/* ========================================================
          MODAL 7: DEPARTMENT FULL CUSTOMIZATION MODAL
         ======================================================== */}
      <DepartmentCustomizeModal
        deptCode={activeDept}
        config={currentConfig}
        isOpen={isDeptCustomizerOpen}
        onClose={() => setIsDeptCustomizerOpen(false)}
        onSave={handleSaveDepartmentConfig}
      />
    </div>
  );
};
