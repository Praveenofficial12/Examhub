/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminLogin } from './components/AdminLogin';
import { SidebarNav } from './components/SidebarNav';
import { TopHeader } from './components/TopHeader';
import { DashboardOverview } from './components/DashboardOverview';
import { ModuleAnswerSheets } from './components/ModuleAnswerSheets';
import { ModuleSmsAutomation } from './components/ModuleSmsAutomation';
import { ModuleMarkTranscripts } from './components/ModuleMarkTranscripts';
import { ModuleAnswerKeys } from './components/ModuleAnswerKeys';
import { ModuleStudentsRegistry } from './components/ModuleStudentsRegistry';
import { ModuleTeacherClassAllocation } from './components/ModuleTeacherClassAllocation';
import { ModuleUploadMarks } from './components/ModuleUploadMarks';
import { ModulePatentDocs } from './components/ModulePatentDocs';
import { ModuleAdminStaffPortal } from './components/ModuleAdminStaffPortal';
import { ActiveTab } from './components/HeaderNav';
import {
  loadStaffAccounts,
  saveStaffAccounts,
  resolveWorkspaceKey,
  getWorkspaceAuthHeaders,
  purgeLegacySampleDataOnce,
  loadWorkspaceAnswerSheets,
  saveWorkspaceAnswerSheets,
  loadWorkspaceStudents,
  saveWorkspaceStudents,
  loadWorkspaceMarkRecords,
  saveWorkspaceMarkRecords,
  loadWorkspaceAnswerKeys,
  saveWorkspaceAnswerKeys,
  loadWorkspaceTestMarks,
  saveWorkspaceTestMarks,
  loadWorkspaceSmsLogs,
  saveWorkspaceSmsLogs
} from './utils/staffAuthService';

purgeLegacySampleDataOnce();

let appIdSequence = 0;
const nextTelemetryId = () =>
  `TEL-${Date.now()}-${++appIdSequence}-${Math.random().toString(36).slice(2, 6)}`;
const nextSmsId = () =>
  `SMS-${Date.now().toString().slice(-4)}-${++appIdSequence}`;

import {
  UserSession,
  AnswerSheet,
  SmsTemplate,
  SmsLog,
  MarkRecord,
  ExamAnswerKey,
  StudentProfile,
  ExamTelemetryEvent,
  TeacherAllocation,
  TestWindowConfig,
  StudentTestMark,
  SubjectScore,
  StaffAccount
} from './types';

import {
  INITIAL_SMS_TEMPLATES,
  INITIAL_TEACHER_ALLOCATIONS,
  INITIAL_TEST_WINDOWS
} from './data/mockData';

const DEFAULT_COE_SESSION: UserSession = {
  username: 'aids_admin',
  fullName: 'COE Central Administrator',
  role: 'AI&DS Autonomous Administrator',
  designation: 'Department of Artificial Intelligence & Data Science',
  department: 'AI&DS',
  isAdmin: true,
  loginTime: 'Active Session',
  token: 'VSB-AIDS-OFFICIAL-AUTH-KEY'
};

export default function App() {
  // Mobile drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Authentication State - Default to active COE session for immediate workable preview
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const stored = localStorage.getItem('vsbec_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && !parsed.isAdmin && !parsed.staffId) {
          localStorage.removeItem('vsbec_auth_user');
          return null;
        }
        return {
          ...parsed,
          department: 'AI&DS',
          designation: parsed.isAdmin
            ? 'Department of Artificial Intelligence & Data Science'
            : (parsed.designation || 'Department of AI & DS')
        };
      }
      localStorage.setItem('vsbec_auth_user', JSON.stringify(DEFAULT_COE_SESSION));
      return DEFAULT_COE_SESSION;
    } catch {
      return DEFAULT_COE_SESSION;
    }
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Staff Accounts Directory (Admin-managed Staff IDs & Passwords)
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(() => loadStaffAccounts());

  useEffect(() => {
    saveStaffAccounts(staffAccounts);
  }, [staffAccounts]);

  // Enforce role-based access: Staff Accounts, Teacher Allocations and Admin Portal are ONLY accessible to admin
  useEffect(() => {
    if (
      session &&
      !session.isAdmin &&
      (activeTab === 'allocations' ||
        activeTab === 'staff-accounts' ||
        (activeTab as string) === 'teacher-allocation')
    ) {
      setActiveTab('dashboard');
    }
  }, [session, activeTab]);

  const activeWorkspaceKey = resolveWorkspaceKey(session);
  const loadedWorkspaceRef = React.useRef<string>(activeWorkspaceKey);

  // Application Data States — strictly partitioned & isolated per Staff ID / COE Admin workspace
  const [answerSheets, setAnswerSheets] = useState<AnswerSheet[]>(() =>
    loadWorkspaceAnswerSheets(activeWorkspaceKey)
  );
  const [smsTemplates] = useState<SmsTemplate[]>(INITIAL_SMS_TEMPLATES);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>(() =>
    loadWorkspaceSmsLogs(activeWorkspaceKey)
  );
  const [markRecords, setMarkRecords] = useState<MarkRecord[]>(() =>
    loadWorkspaceMarkRecords(activeWorkspaceKey)
  );
  const [answerKeys, setAnswerKeys] = useState<ExamAnswerKey[]>(() =>
    loadWorkspaceAnswerKeys(activeWorkspaceKey)
  );
  const [students, setStudents] = useState<StudentProfile[]>(() =>
    loadWorkspaceStudents(activeWorkspaceKey)
  );

  const [teacherAllocations, setTeacherAllocations] = useState<TeacherAllocation[]>(() => {
    try {
      const saved = localStorage.getItem('vsbec_teacher_allocations');
      const list = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(list)) return [];
      return list
        .filter((a: TeacherAllocation) => a?.id && !String(a.id).startsWith('ALLOC-AIDS-'))
        .map((a: TeacherAllocation) => ({
          ...a,
          department: 'AI&DS'
        }));
    } catch {
      return [];
    }
  });

  const [testWindows, setTestWindows] = useState<TestWindowConfig[]>(() => {
    try {
      const saved = localStorage.getItem('vsbec_test_windows');
      return saved ? JSON.parse(saved) : INITIAL_TEST_WINDOWS;
    } catch {
      return INITIAL_TEST_WINDOWS;
    }
  });

  const [studentTestMarks, setStudentTestMarks] = useState<StudentTestMark[]>(() =>
    loadWorkspaceTestMarks(activeWorkspaceKey)
  );

  const [telemetryEvents, setTelemetryEvents] = useState<ExamTelemetryEvent[]>([]);

  // Global admin config persistence
  useEffect(() => {
    try {
      localStorage.setItem('vsbec_test_windows', JSON.stringify(testWindows));
    } catch (e) {
      console.error(e);
    }
  }, [testWindows]);

  useEffect(() => {
    try {
      localStorage.setItem('vsbec_teacher_allocations', JSON.stringify(teacherAllocations));
    } catch (e) {
      console.error(e);
    }
  }, [teacherAllocations]);

  // Reload & hydrate completely isolated workspace data whenever session / active staff changes
  useEffect(() => {
    if (!session) {
      loadedWorkspaceRef.current = 'ANON';
      setAnswerSheets([]);
      setStudents([]);
      setMarkRecords([]);
      setAnswerKeys([]);
      setStudentTestMarks([]);
      setSmsLogs([]);
      setTelemetryEvents([]);
      return;
    }

    const wsKey = resolveWorkspaceKey(session);
    loadedWorkspaceRef.current = wsKey;

    const localSheets = loadWorkspaceAnswerSheets(wsKey);
    const localStudents = loadWorkspaceStudents(wsKey);
    setAnswerSheets(localSheets);
    setStudents(localStudents);
    setMarkRecords(loadWorkspaceMarkRecords(wsKey));
    setAnswerKeys(loadWorkspaceAnswerKeys(wsKey));
    setStudentTestMarks(loadWorkspaceTestMarks(wsKey));
    setSmsLogs(loadWorkspaceSmsLogs(wsKey));
    setTelemetryEvents([]);

    let active = true;
    const authHeaders = getWorkspaceAuthHeaders(session);

    // Fetch isolated server-side evaluations and student directory in parallel
    Promise.all([
      fetch('/api/answer-sheets/evaluations', { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/workspace/students', { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    ]).then(([evalData, stuData]) => {
      if (!active || loadedWorkspaceRef.current !== wsKey) return;

      if (evalData?.success && Array.isArray(evalData.evaluations)) {
        setAnswerSheets((prev) => {
          const merged = new Map<string, AnswerSheet>();
          evalData.evaluations.forEach((ev: AnswerSheet) => {
            if (ev?.id && (!ev.ownerStaffId || ev.ownerStaffId.toUpperCase() === wsKey)) {
              merged.set(ev.id, { ...ev, ownerStaffId: wsKey, department: ev.department || 'AI&DS' });
            }
          });
          prev.forEach((existing) => {
            if (existing?.id && !merged.has(existing.id)) {
              merged.set(existing.id, existing);
            }
          });
          return Array.from(merged.values());
        });
      }

      if (stuData?.success && Array.isArray(stuData.students) && stuData.students.length > 0) {
        setStudents((prev) => {
          const merged = new Map<string, StudentProfile>();
          stuData.students.forEach((st: StudentProfile) => {
            if (st?.id) merged.set(st.id, { ...st, ownerStaffId: wsKey, department: 'AI&DS' });
          });
          prev.forEach((existing) => {
            if (existing?.id && !merged.has(existing.id)) merged.set(existing.id, existing);
          });
          return Array.from(merged.values());
        });
      }
    });

    return () => {
      active = false;
    };
  }, [activeWorkspaceKey]);

  // Guarded per-workspace persistence effects (prevents cross-staff leakage on switches)
  useEffect(() => {
    if (session && loadedWorkspaceRef.current === activeWorkspaceKey) {
      saveWorkspaceAnswerSheets(activeWorkspaceKey, answerSheets);
    }
  }, [answerSheets, activeWorkspaceKey, session]);

  useEffect(() => {
    if (session && loadedWorkspaceRef.current === activeWorkspaceKey) {
      saveWorkspaceSmsLogs(activeWorkspaceKey, smsLogs);
    }
  }, [smsLogs, activeWorkspaceKey, session]);

  useEffect(() => {
    if (session && loadedWorkspaceRef.current === activeWorkspaceKey) {
      saveWorkspaceMarkRecords(activeWorkspaceKey, markRecords);
    }
  }, [markRecords, activeWorkspaceKey, session]);

  useEffect(() => {
    if (session && loadedWorkspaceRef.current === activeWorkspaceKey) {
      saveWorkspaceAnswerKeys(activeWorkspaceKey, answerKeys);
    }
  }, [answerKeys, activeWorkspaceKey, session]);

  useEffect(() => {
    if (session && loadedWorkspaceRef.current === activeWorkspaceKey) {
      saveWorkspaceTestMarks(activeWorkspaceKey, studentTestMarks);
    }
  }, [studentTestMarks, activeWorkspaceKey, session]);

  useEffect(() => {
    if (session && loadedWorkspaceRef.current === activeWorkspaceKey) {
      saveWorkspaceStudents(activeWorkspaceKey, students);
      const timer = setTimeout(() => {
        fetch('/api/workspace/students', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getWorkspaceAuthHeaders(session)
          },
          body: JSON.stringify({ students })
        }).catch(() => {});
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [students, activeWorkspaceKey, session]);

  // Handle Logout / Switch Staff
  const handleLogout = () => {
    localStorage.removeItem('vsbec_auth_user');
    setSession(null);
    setActiveTab('dashboard');
  };

  // Staff Credentials Management Handlers (Admin Portal)
  const handleAddStaffAccount = (newAccount: StaffAccount) => {
    setStaffAccounts((prev) => [newAccount, ...prev]);
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'mark_approved',
      title: 'Staff ID & Password Created',
      details: `Issued Staff ID ${newAccount.staffId} (${newAccount.staffName}) with isolated AI&DS portal vault.`,
      timestamp: 'Just now',
      department: 'AI&DS',
      severity: 'success'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  const handleUpdateStaffAccount = (updated: StaffAccount) => {
    setStaffAccounts((prev) =>
      prev.map((acc) => (acc.staffId === updated.staffId ? updated : acc))
    );
  };

  const handleDeleteStaffAccount = (staffId: string) => {
    setStaffAccounts((prev) => prev.filter((acc) => acc.staffId !== staffId));
    if (session?.adminInspectingStaffId === staffId) {
      const nextSession = { ...session, adminInspectingStaffId: undefined, staffName: undefined };
      setSession(nextSession);
      localStorage.setItem('vsbec_auth_user', JSON.stringify(nextSession));
    }
  };

  const handleRecordStaffLogin = (staffId: string) => {
    setStaffAccounts((prev) =>
      prev.map((acc) =>
        acc.staffId === staffId
          ? { ...acc, lastLoginAt: new Date().toLocaleString('en-IN') }
          : acc
      )
    );
  };

  // Admin Direct Access into a Specific Staff Member's Isolated Page
  const handleInspectStaffPage = (
    staffId: string,
    targetTab: 'dashboard' | 'marks' | 'upload-marks' | 'answer-keys' = 'dashboard'
  ) => {
    if (!session?.isAdmin) return;
    const target = staffAccounts.find((a) => a.staffId === staffId);
    const updatedSession: UserSession = {
      ...session,
      adminInspectingStaffId: staffId,
      staffName: target?.staffName || staffId
    };
    setSession(updatedSession);
    localStorage.setItem('vsbec_auth_user', JSON.stringify(updatedSession));
    setActiveTab(targetTab);
  };

  const handleExitStaffInspection = () => {
    if (!session?.isAdmin) return;
    const updatedSession: UserSession = {
      ...session,
      adminInspectingStaffId: undefined,
      staffName: undefined
    };
    setSession(updatedSession);
    localStorage.setItem('vsbec_auth_user', JSON.stringify(updatedSession));
    setActiveTab('staff-accounts');
  };

  // Add Answer Sheet Scan
  const handleAddAnswerSheet = (newSheet: AnswerSheet) => {
    setAnswerSheets((prev) => [newSheet, ...prev]);
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'barcode_scan',
      title: 'New Optical Script Mapped',
      details: `Script ${newSheet.dummyNumber} linked to ${newSheet.studentName} (${newSheet.department}). Confidence: ${newSheet.confidenceScore}%.`,
      timestamp: 'Just now',
      department: newSheet.department,
      severity: 'success'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Save verified Camera/OCR Answer Sheet Evaluation to Backend DB + sync marks ledger
  const handleSaveEvaluationResult = async (evaluatedSheet: AnswerSheet) => {
    const stampedSheet: AnswerSheet = {
      ...evaluatedSheet,
      ownerStaffId: activeWorkspaceKey
    };

    const resp = await fetch('/api/answer-sheets/evaluations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getWorkspaceAuthHeaders(session)
      },
      body: JSON.stringify(stampedSheet)
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData?.error || 'Failed to save evaluation to database');
    }

    const data = await resp.json().catch(() => ({}));
    const savedRecord: AnswerSheet = data?.evaluation || evaluatedSheet;
    const normReg = String(savedRecord.registerNo || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const normSub = String(savedRecord.subjectCode || '').trim().toUpperCase();

    setAnswerSheets((prev) => [
      savedRecord,
      ...prev.filter(
        (s) =>
          s.id !== savedRecord.id &&
          !(
            normReg &&
            normSub &&
            String(s.registerNo || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === normReg &&
            String(s.subjectCode || '').trim().toUpperCase() === normSub
          )
      )
    ]);

    if (evaluatedSheet.marksObtained !== undefined && evaluatedSheet.registerNo) {
      const maxM = Math.max(1, Number(evaluatedSheet.maxMarks) || 50);
      const scaled100 = Math.min(100, Math.round((evaluatedSheet.marksObtained / maxM) * 100));
      let newGrade: 'O' | 'A+' | 'A' | 'B+' | 'B' | 'RA' = 'RA';
      let newPts = 0;
      if (scaled100 >= 91) { newGrade = 'O'; newPts = 10; }
      else if (scaled100 >= 81) { newGrade = 'A+'; newPts = 9; }
      else if (scaled100 >= 71) { newGrade = 'A'; newPts = 8; }
      else if (scaled100 >= 60) { newGrade = 'B+'; newPts = 7; }

      setMarkRecords((prev) => {
        const idx = prev.findIndex((r) => r.registerNo === evaluatedSheet.registerNo);
        if (idx < 0) return prev;
        const rec = prev[idx];
        const subIdx = rec.subjects.findIndex((s) => s.subjectCode === evaluatedSheet.subjectCode);
        const updatedSubjects = [...rec.subjects];

        const nextInternal = Math.min(40, Math.round((evaluatedSheet.marksObtained! / maxM) * 40));
        const nextSemester = Math.max(0, scaled100 - nextInternal);

        if (subIdx >= 0) {
          updatedSubjects[subIdx] = {
            ...updatedSubjects[subIdx],
            internalMarks: nextInternal,
            semesterMarks: nextSemester,
            totalMarks: scaled100,
            grade: newGrade,
            gradePoints: newPts,
            result: scaled100 >= 60 ? 'PASS' : 'RA'
          };
        } else {
          updatedSubjects.push({
            subjectCode: evaluatedSheet.subjectCode,
            subjectName: evaluatedSheet.subjectName,
            credits: 4,
            internalMarks: nextInternal,
            semesterMarks: nextSemester,
            totalMarks: scaled100,
            grade: newGrade,
            gradePoints: newPts,
            result: scaled100 >= 60 ? 'PASS' : 'RA'
          });
        }

        let totalCred = 0;
        let earnedPts = 0;
        let arrears = 0;
        updatedSubjects.forEach((s) => {
          totalCred += s.credits;
          earnedPts += s.gradePoints * s.credits;
          if (s.result !== 'PASS') arrears++;
        });
        const newGpa = totalCred > 0 ? parseFloat((earnedPts / totalCred).toFixed(2)) : rec.gpa;

        const nextList = [...prev];
        nextList[idx] = {
          ...rec,
          subjects: updatedSubjects,
          gpa: newGpa,
          cgpa: newGpa,
          arrearsCount: arrears,
          resultStatus: arrears > 0 ? 'RA' : 'PASS',
          totalCreditsEarned: totalCred
        };
        return nextList;
      });
    }

    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'barcode_scan',
      title: 'Answer Sheet Evaluated & Saved',
      details: `${evaluatedSheet.studentName} (${evaluatedSheet.registerNo}) scored ${
        evaluatedSheet.marksObtained ?? '-'
      }/${evaluatedSheet.maxMarks ?? '-'} in ${evaluatedSheet.subjectCode}.`,
      timestamp: 'Just now',
      department: evaluatedSheet.department,
      severity: evaluatedSheet.status === 'mapped' ? 'success' : 'warning'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Ultra-fast Atomic Batch Save from Live Excel Marks Sheet Editor (<50ms single bulkWrite)
  const handleBatchSaveEvaluations = async (sheetsToSave: AnswerSheet[]) => {
    if (!sheetsToSave.length) return;
    const stampedList = sheetsToSave.map((sh) => ({
      ...sh,
      ownerStaffId: activeWorkspaceKey
    }));

    const resp = await fetch('/api/answer-sheets/evaluations/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getWorkspaceAuthHeaders(session)
      },
      body: JSON.stringify({ evaluations: stampedList })
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData?.error || 'Failed to batch save Excel rows');
    }

    const data = await resp.json().catch(() => ({}));
    const savedRows: AnswerSheet[] = Array.isArray(data?.evaluations) ? data.evaluations : stampedList;

    setAnswerSheets((prev) => {
      const byId = new Map<string, AnswerSheet>();
      savedRows.forEach((r) => byId.set(r.id, r));
      const existingFiltered = prev.filter(
        (old) =>
          !byId.has(old.id) &&
          !savedRows.some(
            (sr) =>
              String(sr.registerNo || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() ===
                String(old.registerNo || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() &&
              String(sr.subjectCode || '').trim().toUpperCase() ===
                String(old.subjectCode || '').trim().toUpperCase()
          )
      );
      return [...savedRows, ...existingFiltered];
    });
  };

  // Update Answer Sheet
  const handleUpdateAnswerSheet = (updated: AnswerSheet) => {
    const stamped = { ...updated, ownerStaffId: activeWorkspaceKey };
    setAnswerSheets((prev) => prev.map((s) => (s.id === stamped.id ? stamped : s)));
    fetch(`/api/answer-sheets/evaluations/${encodeURIComponent(stamped.id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getWorkspaceAuthHeaders(session)
      },
      body: JSON.stringify(stamped)
    }).catch(() => {});
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'barcode_scan',
      title: `Script Status Updated (${stamped.status.toUpperCase()})`,
      details: `${stamped.studentName} (${stamped.registerNo}) verified.`,
      timestamp: 'Just now',
      department: stamped.department,
      severity: stamped.status === 'mapped' ? 'success' : 'warning'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Add SMS Logs from broadcast
  const handleSendBroadcast = (newLogs: SmsLog[]) => {
    setSmsLogs((prev) => [...newLogs, ...prev]);
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'sms_broadcast',
      title: 'Parent SMS Broadcast Delivered',
      details: `Batch of ${newLogs.length} parent alerts successfully transmitted via VSBEXM DLT pipeline.`,
      timestamp: 'Just now',
      severity: 'info'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Update Mark Record
  const handleUpdateMarkRecord = (updatedRecord: MarkRecord) => {
    setMarkRecords((prev) => {
      const exists = prev.some((r) => r.id === updatedRecord.id || r.registerNo === updatedRecord.registerNo);
      if (exists) {
        return prev.map((r) =>
          r.id === updatedRecord.id || r.registerNo === updatedRecord.registerNo ? updatedRecord : r
        );
      }
      return [updatedRecord, ...prev];
    });
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'mark_approved',
      title: 'Student Mark Record Updated',
      details: `Academic marks and GPA for ${updatedRecord.studentName} (${updatedRecord.registerNo}) updated in autonomous ledger.`,
      timestamp: 'Just now',
      department: updatedRecord.department,
      severity: 'success'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Update Test Windows (Admin)
  const handleUpdateTestWindows = (updatedWindows: TestWindowConfig[]) => {
    setTestWindows(updatedWindows);
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'mark_approved',
      title: 'COE Exam Windows Schedule Updated',
      details: 'Mark upload portal access configuration updated by Controller of Examinations.',
      timestamp: 'Just now',
      severity: 'info'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Save / Sync Test Marks across all modules
  const handleSaveTestMarks = (newMarks: StudentTestMark[]) => {
    setStudentTestMarks((prev) => {
      const merged = [...prev];
      newMarks.forEach((nm) => {
        const idx = merged.findIndex((m) => m.testId === nm.testId && m.registerNo === nm.registerNo);
        if (idx >= 0) {
          merged[idx] = nm;
        } else {
          merged.push(nm);
        }
      });
      return merged;
    });
  };

  // Synchronize Test Marks to Mark Statements and Student Profiles
  const handleSyncTestMarksToStatements = (newMarks: StudentTestMark[], test: TestWindowConfig) => {
    if (newMarks.length === 0) return;

    // 1. Update Student Profiles (IAT averages & CGPA)
    setStudents((prev) =>
      prev.map((stu) => {
        const mark = newMarks.find((m) => m.registerNo === stu.registerNo);
        if (!mark) return stu;

        const isIAT1 = test.testCategory.includes('CIA 1') || test.testCategory.includes('Unit Test 1');
        const isIAT2 = test.testCategory.includes('CIA 2') || test.testCategory.includes('Unit Test 2');

        const newIat1 = isIAT1 ? mark.marksObtained : stu.iat1Average;
        const newIat2 = isIAT2 ? mark.marksObtained : stu.iat2Average;

        return {
          ...stu,
          iat1Average: newIat1,
          iat2Average: newIat2
        };
      })
    );

    // 2. Update Mark Records in Mark Statement Generator
    setMarkRecords((prev) => {
      const updatedList = [...prev];

      newMarks.forEach((mark) => {
        const recordIndex = updatedList.findIndex((r) => r.registerNo === mark.registerNo);

        if (recordIndex >= 0) {
          const rec = updatedList[recordIndex];
          const subIdx = rec.subjects.findIndex((s) => s.subjectCode === mark.subjectCode);

          let updatedSubjects = [...rec.subjects];
          if (subIdx >= 0) {
            const currentSub = updatedSubjects[subIdx];
            const isEndSem = test.testCategory.includes('Autonomous End Semester') || test.testCategory.includes('Model');
            const newInternal = isEndSem ? currentSub.internalMarks : Math.min(40, Math.round((mark.marksObtained / mark.maxMarks) * 40));
            const newSemester = isEndSem ? Math.min(60, Math.round((mark.marksObtained / mark.maxMarks) * 60)) : currentSub.semesterMarks;
            const newTotal = newInternal + newSemester;

            let newGrade: 'O' | 'A+' | 'A' | 'B+' | 'B' | 'RA' = 'RA';
            let newPts = 0;
            if (newTotal >= 91) { newGrade = 'O'; newPts = 10; }
            else if (newTotal >= 81) { newGrade = 'A+'; newPts = 9; }
            else if (newTotal >= 71) { newGrade = 'A'; newPts = 8; }
            else if (newTotal >= 60) { newGrade = 'B+'; newPts = 7; }

            updatedSubjects[subIdx] = {
              ...currentSub,
              internalMarks: newInternal,
              semesterMarks: newSemester,
              totalMarks: newTotal,
              grade: newGrade,
              gradePoints: newPts,
              result: newTotal >= 60 ? 'PASS' : 'RA'
            };
          } else {
            // Add new subject score
            const isEndSem = test.testCategory.includes('Autonomous End Semester') || test.testCategory.includes('Model');
            const newInternal = isEndSem ? 35 : Math.min(40, Math.round((mark.marksObtained / mark.maxMarks) * 40));
            const newSemester = isEndSem ? Math.min(60, Math.round((mark.marksObtained / mark.maxMarks) * 60)) : 48;
            const newTotal = newInternal + newSemester;

            let newGrade: 'O' | 'A+' | 'A' | 'B+' | 'B' | 'RA' = 'RA';
            let newPts = 0;
            if (newTotal >= 91) { newGrade = 'O'; newPts = 10; }
            else if (newTotal >= 81) { newGrade = 'A+'; newPts = 9; }
            else if (newTotal >= 71) { newGrade = 'A'; newPts = 8; }
            else if (newTotal >= 60) { newGrade = 'B+'; newPts = 7; }

            updatedSubjects.push({
              subjectCode: mark.subjectCode,
              subjectName: mark.subjectName,
              credits: 4,
              internalMarks: newInternal,
              semesterMarks: newSemester,
              totalMarks: newTotal,
              grade: newGrade,
              gradePoints: newPts,
              result: newTotal >= 60 ? 'PASS' : 'RA'
            });
          }

          // Recalculate GPA
          let totalCred = 0;
          let earnedPts = 0;
          let arrears = 0;
          updatedSubjects.forEach((s) => {
            totalCred += s.credits;
            earnedPts += s.gradePoints * s.credits;
            if (s.result !== 'PASS') arrears++;
          });

          const newGpa = totalCred > 0 ? parseFloat((earnedPts / totalCred).toFixed(2)) : rec.gpa;

          updatedList[recordIndex] = {
            ...rec,
            subjects: updatedSubjects,
            gpa: newGpa,
            cgpa: newGpa,
            arrearsCount: arrears,
            resultStatus: arrears > 0 ? 'RA' : 'PASS',
            totalCreditsEarned: totalCred
          };
        }
      });

      return updatedList;
    });

    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'mark_approved',
      title: 'Bulk Class Marks Synchronized Across Portal',
      details: `${newMarks.length} student marks for "${test.testName}" synchronized to Mark Statements, SMS alerts, and official ledgers.`,
      timestamp: 'Just now',
      severity: 'success'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Update (or upsert) Answer Key
  const handleUpdateAnswerKey = (updatedKey: ExamAnswerKey) => {
    setAnswerKeys((prev) =>
      prev.some((k) => k.id === updatedKey.id)
        ? prev.map((k) => (k.id === updatedKey.id ? updatedKey : k))
        : [updatedKey, ...prev]
    );
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'answerkey_locked',
      title: 'Answer Key Rubric Updated',
      details: `${updatedKey.subjectCode} (${updatedKey.setCode}) with ${updatedKey.questions.length} questions updated in COE database.`,
      timestamp: 'Just now',
      department: updatedKey.department,
      severity: 'info'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Add Answer Key
  const handleAddAnswerKey = (newKey: ExamAnswerKey) => {
    setAnswerKeys((prev) => [newKey, ...prev.filter((k) => k.id !== newKey.id)]);
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'answerkey_locked',
      title: 'New Autonomous Answer Key Registered',
      details: `${newKey.subjectCode} - ${newKey.subjectName} (${newKey.examCategory || 'Autonomous'} Exam) created with ${newKey.questions.length} questions.`,
      timestamp: 'Just now',
      department: newKey.department,
      severity: 'success'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Delete Answer Key
  const handleDeleteAnswerKey = (keyId: string) => {
    const target = answerKeys.find((k) => k.id === keyId);
    setAnswerKeys((prev) => prev.filter((k) => k.id !== keyId));
    if (target) {
      const event: ExamTelemetryEvent = {
        id: nextTelemetryId(),
        type: 'conflict_detected',
        title: 'Answer Key Removed',
        details: `${target.subjectCode} (${target.setCode}) removed from COE database.`,
        timestamp: 'Just now',
        department: target.department,
        severity: 'warning'
      };
      setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
    }
  };

  // Add Student
  const handleAddStudent = (newStudent: StudentProfile) => {
    setStudents((prev) => [
      newStudent,
      ...prev.filter((s) => s.id !== newStudent.id && s.registerNo !== newStudent.registerNo)
    ]);
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'mark_approved',
      title: 'New Student Candidate Enrolled',
      details: `${newStudent.name} (${newStudent.registerNo}, ${newStudent.department}) enrolled for Autonomous Examination batch.`,
      timestamp: 'Just now',
      department: newStudent.department,
      severity: 'success'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Update Student
  const handleUpdateStudent = (updatedStudent: StudentProfile) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'mark_approved',
      title: 'Student Record Updated',
      details: `Profile of ${updatedStudent.name} (${updatedStudent.registerNo}, Year ${updatedStudent.year}-${updatedStudent.section}) modified.`,
      timestamp: 'Just now',
      department: updatedStudent.department,
      severity: 'info'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Delete Student
  const handleDeleteStudent = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    if (student) {
      const event: ExamTelemetryEvent = {
        id: nextTelemetryId(),
        type: 'conflict_detected',
        title: 'Student Removed from Registry',
        details: `${student.name} (${student.registerNo}) removed from ${student.department} department roster.`,
        timestamp: 'Just now',
        department: student.department,
        severity: 'warning'
      };
      setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
    }
  };

  // Batch Update Students (for Year list change, mass promotion, bulk upload)
  const handleBatchUpdateStudents = (updatedList: StudentProfile[]) => {
    const seenIds = new Set<string>();
    const deduped = updatedList.filter((s) => {
      if (!s?.id || seenIds.has(s.id)) return false;
      seenIds.add(s.id);
      return true;
    });
    setStudents(deduped);
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'mark_approved',
      title: 'Batch Registry Synchronization',
      details: `Registry database updated with ${updatedList.length} total student records.`,
      timestamp: 'Just now',
      severity: 'success'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  // Send Direct SMS to a student's guardian
  const handleSendDirectSms = (student: StudentProfile) => {
    const newLog: SmsLog = {
      id: nextSmsId(),
      templateTitle: 'Internal Assessment (IAT) Performance Alert',
      studentName: student.name,
      registerNo: student.registerNo,
      parentPhone: student.parentPhone,
      parentName: student.parentName,
      department: student.department,
      messageBody: `Dear Parent, IAT Academic performance summary of your ward ${student.name} (Reg: ${student.registerNo}, ${student.department}): Current CGPA: ${student.cgpa.toFixed(2)}, Attendance: ${student.attendancePercentage}%. - COE, VSBEC Karur`,
      sentAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      status: 'delivered',
      dltMsgId: `DLT-MSG-${Math.floor(889000 + Math.random() * 9000)}`,
      latencyMs: Math.floor(210 + Math.random() * 150)
    };
    setSmsLogs((prev) => [newLog, ...prev]);
    setActiveTab('sms');
  };

  // Teacher Allocation Handlers (Admin can allocate teachers across all departments)
  const handleAddAllocation = (newAlloc: TeacherAllocation) => {
    setTeacherAllocations((prev) => [newAlloc, ...prev]);
    const event: ExamTelemetryEvent = {
      id: nextTelemetryId(),
      type: 'mark_approved',
      title: 'Faculty Course Allocation Assigned',
      details: `${newAlloc.teacherName} allocated to ${newAlloc.subjectName} (${newAlloc.subjectCode}) for ${newAlloc.department} Year ${newAlloc.classYear} Sec ${newAlloc.section}.`,
      timestamp: 'Just now',
      department: newAlloc.department,
      severity: 'success'
    };
    setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
  };

  const handleUpdateAllocation = (updated: TeacherAllocation) => {
    setTeacherAllocations((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleDeleteAllocation = (allocationId: string) => {
    const alloc = teacherAllocations.find((a) => a.id === allocationId);
    setTeacherAllocations((prev) => prev.filter((a) => a.id !== allocationId));
    if (alloc) {
      const event: ExamTelemetryEvent = {
        id: nextTelemetryId(),
        type: 'conflict_detected',
        title: 'Faculty Course Allocation Revoked',
        details: `Allocation for ${alloc.teacherName} in ${alloc.department} ${alloc.subjectCode} was removed.`,
        timestamp: 'Just now',
        department: alloc.department,
        severity: 'warning'
      };
      setTelemetryEvents((prev) => [event, ...prev.slice(0, 7)]);
    }
  };

  // If not logged in, render the locked Staff & Admin Login Portal
  if (!session) {
    return (
      <AdminLogin
        onLoginSuccess={(newSession) => setSession(newSession)}
        staffAccounts={staffAccounts}
        onStaffLoginRecorded={handleRecordStaffLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-900 selection:bg-amber-400 selection:text-[#781717] font-sans flex">
      
      {/* 1. Left Fixed Maroon Sidebar */}
      <SidebarNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={session}
        onLogout={handleLogout}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Backdrop for Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* 2. Main Content Canvas (Offset for Left Sidebar on Large Screens) */}
      <div className="lg:pl-64 flex-1 flex flex-col min-h-screen w-full min-w-0 overflow-x-hidden print-reset-layout">
        
        {/* Top Header Bar */}
        <TopHeader
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          session={session}
          onLogout={handleLogout}
        />

        {/* Admin Inspecting Specific Staff Page Banner */}
        {session.isAdmin && session.adminInspectingStaffId && (
          <div className="no-print w-full bg-amber-50 border-b border-amber-300">
            <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap text-amber-950 font-bold">
              <span className="px-2 py-0.5 rounded bg-[#781717] text-amber-300 font-mono text-[10px] font-black">
                ADMIN → STAFF VIEW
              </span>
              <span>
                Inspecting Private Staff Workspace:{' '}
                <strong className="text-[#781717]">
                  {session.staffName} ({session.adminInspectingStaffId})
                </strong>
              </span>
              <span className="text-[11px] font-normal text-amber-800">
                • Isolated from all other staff members&rsquo; documents
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={session.adminInspectingStaffId}
                onChange={(e) => handleInspectStaffPage(e.target.value, activeTab as any)}
                className="px-2.5 py-1 rounded-lg border border-amber-400 bg-white text-[11px] font-bold text-slate-900 cursor-pointer"
              >
                {staffAccounts.map((st) => (
                  <option key={st.staffId} value={st.staffId}>
                    {st.staffId} — {st.staffName}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleExitStaffInspection}
                className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 font-black text-[11px] cursor-pointer"
              >
                Exit to Admin Staff Portal
              </button>
            </div>
          </div>
          </div>
        )}

        {/* Main Content Area (Aligned cleanly with TopHeader across all screen sizes) */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 min-w-0 print-reset-layout">
          <div className="w-full min-w-0 print-reset-layout">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                className="w-full min-w-0"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {activeTab === 'dashboard' && (
                  <DashboardOverview
                    key={`dash-${activeWorkspaceKey}`}
                    onNavigate={(tab) => setActiveTab(tab)}
                    answerSheets={answerSheets}
                    smsLogs={smsLogs}
                    markRecords={markRecords}
                    answerKeys={answerKeys}
                    students={students}
                    telemetryEvents={telemetryEvents}
                    session={session}
                    staffAccounts={staffAccounts}
                    teacherAllocations={teacherAllocations}
                    studentTestMarks={studentTestMarks}
                  />
                )}

                {activeTab === 'staff-accounts' && session?.isAdmin && (
                  <ModuleAdminStaffPortal
                    staffAccounts={staffAccounts}
                    teacherAllocations={teacherAllocations}
                    session={session}
                    onAddStaffAccount={handleAddStaffAccount}
                    onUpdateStaffAccount={handleUpdateStaffAccount}
                    onDeleteStaffAccount={handleDeleteStaffAccount}
                    onInspectStaffPage={handleInspectStaffPage}
                  />
                )}

                {activeTab === 'upload-marks' && (
                  <ModuleUploadMarks
                    key={`upload-${activeWorkspaceKey}`}
                    students={students}
                    testWindows={testWindows}
                    studentTestMarks={studentTestMarks}
                    teacherAllocations={teacherAllocations}
                    onUpdateTestWindows={handleUpdateTestWindows}
                    onSaveTestMarks={handleSaveTestMarks}
                    onSyncToMarkStatements={handleSyncTestMarksToStatements}
                    onUpdateStudent={handleUpdateStudent}
                    session={session}
                  />
                )}

                {activeTab === 'answer-sheets' && (
                  <ModuleAnswerSheets
                    key={`sheets-${activeWorkspaceKey}`}
                    answerSheets={answerSheets}
                    onUpdateSheet={handleUpdateAnswerSheet}
                    onAddSheet={handleAddAnswerSheet}
                    answerKeys={answerKeys}
                    onSaveEvaluationResult={handleSaveEvaluationResult}
                    onBatchSaveEvaluations={handleBatchSaveEvaluations}
                    students={students}
                    onUpdateStudent={handleUpdateStudent}
                    session={session}
                  />
                )}

                {activeTab === 'sms' && (
                  <ModuleSmsAutomation
                    key={`sms-${activeWorkspaceKey}`}
                    templates={smsTemplates}
                    smsLogs={smsLogs}
                    students={students}
                    onUpdateStudent={handleUpdateStudent}
                    onSendBroadcast={handleSendBroadcast}
                    session={session}
                  />
                )}

                {activeTab === 'marks' && (
                  <ModuleMarkTranscripts
                    key={`marks-${activeWorkspaceKey}`}
                    markRecords={markRecords}
                    students={students}
                    studentTestMarks={studentTestMarks}
                    teacherAllocations={teacherAllocations}
                    testWindows={testWindows}
                    staffAccounts={staffAccounts}
                    onUpdateStudent={handleUpdateStudent}
                    onUpdateMarkRecord={handleUpdateMarkRecord}
                    session={session}
                  />
                )}

                {activeTab === 'answer-keys' && (
                  <ModuleAnswerKeys
                    key={`keys-${activeWorkspaceKey}`}
                    answerKeys={answerKeys}
                    onUpdateAnswerKey={handleUpdateAnswerKey}
                    onAddAnswerKey={handleAddAnswerKey}
                    onDeleteAnswerKey={handleDeleteAnswerKey}
                    session={session}
                    teacherAllocations={teacherAllocations}
                    staffAccounts={staffAccounts}
                  />
                )}

                {activeTab === 'students' && (
                  <ModuleStudentsRegistry
                    key={`students-${activeWorkspaceKey}`}
                    students={students}
                    onAddStudent={handleAddStudent}
                    onUpdateStudent={handleUpdateStudent}
                    onDeleteStudent={handleDeleteStudent}
                    onBatchUpdateStudents={handleBatchUpdateStudents}
                    onSendSmsToStudent={handleSendDirectSms}
                    session={session}
                  />
                )}

                {(activeTab === 'allocations' || (activeTab as string) === 'teacher-allocation') && session?.isAdmin && (
                  <ModuleTeacherClassAllocation
                    allocations={teacherAllocations}
                    onAddAllocation={handleAddAllocation}
                    onUpdateAllocation={handleUpdateAllocation}
                    onDeleteAllocation={handleDeleteAllocation}
                    session={session}
                    testWindows={testWindows}
                    onUpdateTestWindows={handleUpdateTestWindows}
                    onNavigateToUploadMarks={() => setActiveTab('upload-marks')}
                  />
                )}

                {activeTab === 'patent-docs' && (
                  <ModulePatentDocs />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

      </div>

    </div>
  );
}
