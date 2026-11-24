import {
  AnswerSheet,
  SmsTemplate,
  SmsLog,
  MarkRecord,
  ExamAnswerKey,
  StudentProfile,
  ExamTelemetryEvent,
  DepartmentCustomization,
  TeacherAllocation,
  TestWindowConfig,
  StudentTestMark
} from '../types';

export const INITIAL_DEPARTMENT_CUSTOMIZATIONS: Record<string, DepartmentCustomization> = {
  'AI&DS': {
    code: 'AI&DS',
    name: 'Artificial Intelligence & Data Science',
    degreeTitle: 'B.Tech Artificial Intelligence and Data Science',
    alias: 'aids',
    hodName: 'Head of Department (AI&DS)',
    hodQualification: 'M.E. / M.Tech., Ph.D.',
    hodEmail: 'hod.aids@vsbec.ac.in',
    hodPhone: '',
    hodCabin: 'AI&DS Block',
    establishedYear: 2020,
    sanctionedIntake: 180,
    facultyCount: 0,
    labsCount: 8,
    regulation: 'Regulation R-2021 Autonomous (CBCS)',
    nbaAccredited: true,
    naacGrade: "NAAC 'A+' Grade Certified",
    vision:
      'To emerge as a premier center of excellence in Artificial Intelligence and Data Science, fostering research, innovation and ethical engineering leaders.',
    mission:
      '1. Impart quality outcome-based education in machine learning and big data analytics.\n2. Promote industry-collaborative research and innovation in cognitive computing.\n3. Inculcate professional ethics and continuous learning among future technologists.',
    specializations: [
      'Machine Learning',
      'Deep Neural Networks',
      'Big Data Analytics',
      'Computer Vision',
      'Natural Language Processing',
      'Cloud MLOps'
    ],
    keyLabs: [
      'NVIDIA GPU AI Research Lab',
      'Big Data Analytics Center',
      'Cloud Computing & MLOps Facility',
      'Cognitive IoT Center'
    ],
    departmentNotice:
      'Autonomous End-Semester & Internal Assessment Examination Cell — Artificial Intelligence & Data Science.'
  }
};

export const INITIAL_ANSWER_SHEETS: AnswerSheet[] = [];

export const INITIAL_SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'TMPL-01',
    title: 'Autonomous Exam Result Announcement',
    category: 'Results',
    dltTemplateId: 'DLT-TN-VSB-11009842',
    headerId: 'VSBEXM',
    messageFormat:
      'Dear Parent, Autonomous End Semester results for {Student_Name} (Reg: {Roll_No}, {Department}) have been published. Secured GPA: {Percentage} ({Grade}). Check detailed grade sheet at coe.vsbec.ac.in. - COE, VSBEC Karur',
    variableTags: ['{Student_Name}', '{Roll_No}', '{Department}', '{Percentage}', '{Grade}'],
    description: 'Official result broadcast to parents after autonomous board result ratification.'
  },
  {
    id: 'TMPL-02',
    title: 'Internal Assessment (IAT) Performance Alert',
    category: 'Internal Assessment',
    dltTemplateId: 'DLT-TN-VSB-11009843',
    headerId: 'VSBEXM',
    messageFormat:
      'Dear Parent, IAT-{Exam_Session} performance report of your ward {Student_Name} (Reg: {Roll_No}, {Department}): Aggregate {Percentage}%. Class rank: {Grade}. Parents meeting scheduled on Saturday. - HOD & COE, VSBEC',
    variableTags: ['{Student_Name}', '{Roll_No}', '{Department}', '{Percentage}', '{Grade}', '{Exam_Session}'],
    description: 'Mid-term periodic performance updates sent directly to registered parent mobile numbers.'
  },
  {
    id: 'TMPL-03',
    title: 'Exam Timetable & Answer Key Release',
    category: 'Schedule',
    dltTemplateId: 'DLT-TN-VSB-11009844',
    headerId: 'VSBEXM',
    messageFormat:
      'Notice from COE VSBEC: Master Answer Keys & Timetable for Autonomous Exam {Exam_Session} have been released for {Department} (Reg: {Roll_No}). Hall Tickets issued. Report to exam hall by 8:45 AM. - COE Karur',
    variableTags: ['{Student_Name}', '{Roll_No}', '{Department}', '{Exam_Session}'],
    description: 'Advance notification regarding examination halls, master key challenges, and session timings.'
  },
  {
    id: 'TMPL-04',
    title: 'Semester Attendance Shortage Alert (<75% Anna Univ Rule)',
    category: 'Attendance Alert',
    dltTemplateId: 'DLT-TN-VSB-11009845',
    headerId: 'VSBEXM',
    messageFormat:
      'URGENT: Your ward {Student_Name} (Reg: {Roll_No}, {Department}) has {Percentage}% attendance, which is below the mandatory 75% autonomous exam eligibility threshold. Contact mentor immediately to avoid hall ticket detention. - COE, VSBEC',
    variableTags: ['{Student_Name}', '{Roll_No}', '{Department}', '{Percentage}'],
    description: 'Statutory warning dispatched to parents of students facing condonation or detention risks.'
  }
];

export const INITIAL_SMS_LOGS: SmsLog[] = [];

export const INITIAL_MARK_RECORDS: MarkRecord[] = [];

export const INITIAL_ANSWER_KEYS: ExamAnswerKey[] = [];

export const INITIAL_STUDENTS: StudentProfile[] = [];

export const INITIAL_TELEMETRY_EVENTS: ExamTelemetryEvent[] = [];

export const INITIAL_TEACHER_ALLOCATIONS: TeacherAllocation[] = [];

export const INITIAL_TEST_WINDOWS: TestWindowConfig[] = [
  {
    id: 'TW-CIA-1',
    testName: 'Continuous Internal Assessment - I (CIA 1)',
    testCategory: 'Continuous Internal Assessment 1 (CIA 1)',
    academicYear: '2025-2026',
    semester: 5,
    year: 'ALL',
    section: 'ALL',
    department: 'ALL',
    isOpen: true,
    startDate: '2025-08-10',
    deadline: '2025-08-25',
    maxMarks: 50,
    weightagePercentage: 20,
    openedBy: 'COE Admin',
    description: 'Autonomous Mid-Term Assessment 1 covering Units 1 & 2.',
    lastUpdated: '2025-08-10'
  },
  {
    id: 'TW-CIA-2',
    testName: 'Continuous Internal Assessment - II (CIA 2)',
    testCategory: 'Continuous Internal Assessment 2 (CIA 2)',
    academicYear: '2025-2026',
    semester: 5,
    year: 'ALL',
    section: 'ALL',
    department: 'ALL',
    isOpen: true,
    startDate: '2025-09-15',
    deadline: '2025-09-30',
    maxMarks: 50,
    weightagePercentage: 20,
    openedBy: 'COE Admin',
    description: 'Autonomous Mid-Term Assessment 2 covering Units 3 & 4.',
    lastUpdated: '2025-09-15'
  },
  {
    id: 'TW-UNIT-1',
    testName: 'Unit Assessment Test - 1 (UT-1)',
    testCategory: 'Unit Test 1',
    academicYear: '2025-2026',
    semester: 5,
    year: 'ALL',
    section: 'ALL',
    department: 'ALL',
    isOpen: false,
    startDate: '2025-07-20',
    deadline: '2025-07-30',
    maxMarks: 50,
    weightagePercentage: 10,
    openedBy: 'COE Admin',
    description: 'Early foundational unit evaluation.',
    lastUpdated: '2025-07-31'
  },
  {
    id: 'TW-UNIT-2',
    testName: 'Unit Assessment Test - 2 (UT-2)',
    testCategory: 'Unit Test 2',
    academicYear: '2025-2026',
    semester: 5,
    year: 'ALL',
    section: 'ALL',
    department: 'ALL',
    isOpen: true,
    startDate: '2025-09-01',
    deadline: '2025-09-18',
    maxMarks: 50,
    weightagePercentage: 10,
    openedBy: 'COE Admin',
    description: 'Unit 3 & 4 foundational problem-solving assessment.',
    lastUpdated: '2025-09-01'
  },
  {
    id: 'TW-MODEL-EXAM',
    testName: 'Autonomous Pre-Semester Model Examination',
    testCategory: 'Model Exam',
    academicYear: '2025-2026',
    semester: 5,
    year: 'ALL',
    section: 'ALL',
    department: 'ALL',
    isOpen: true,
    startDate: '2025-10-10',
    deadline: '2025-10-25',
    maxMarks: 100,
    weightagePercentage: 30,
    openedBy: 'COE Admin',
    description: 'Full syllabus 3-hour autonomous model examination.',
    lastUpdated: '2025-10-10'
  },
  {
    id: 'TW-END-SEM',
    testName: 'Autonomous End Semester Theory & Practical Examination',
    testCategory: 'Autonomous End Semester Exam',
    academicYear: '2025-2026',
    semester: 5,
    year: 'ALL',
    section: 'ALL',
    department: 'ALL',
    isOpen: true,
    startDate: '2025-11-05',
    deadline: '2025-11-28',
    maxMarks: 100,
    weightagePercentage: 60,
    openedBy: 'COE Admin',
    description: 'Final Anna University autonomous regulation R-2021 grade generation portal.',
    lastUpdated: '2025-11-05'
  }
];

export const INITIAL_STUDENT_TEST_MARKS: StudentTestMark[] = [];
