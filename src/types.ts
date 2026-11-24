export type DepartmentCode =
  | 'AI&DS'
  | 'CSE'
  | 'ECE'
  | 'EEE'
  | 'IT'
  | 'MECH'
  | 'CIVIL'
  | 'CSE(AIML)'
  | 'CSBS'
  | 'CCE'
  | 'BME'
  | 'BIOTECH'
  | 'CHEM';

export interface UserSession {
  username: string;
  fullName: string;
  role: string;
  designation: string;
  loginTime: string;
  token: string;
  department?: DepartmentCode | 'ALL';
  isAdmin?: boolean;
  staffId?: string;
  staffName?: string;
  adminInspectingStaffId?: string;
}

export interface StaffAccount {
  id: string;
  staffId: string;
  staffName: string;
  designation: string;
  department: DepartmentCode;
  email: string;
  phone: string;
  password: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  lastPasswordResetAt?: string;
  lastLoginAt?: string;
}

export interface TeacherAllocation {
  id: string;
  teacherId: string;
  teacherName: string;
  designation: string;
  department: DepartmentCode;
  classYear: 'I' | 'II' | 'III' | 'IV';
  semester: number;
  section: 'A' | 'B' | 'C' | 'D';
  subjectCode: string;
  subjectName: string;
  role: 'Course Instructor' | 'Lab In-charge' | 'Class Advisor / Mentor' | 'Chief Question Setter' | 'Valuation Examiner';
  academicYear: string;
  allocatedAt: string;
  allocatedBy: string;
  phone?: string;
  email?: string;
  roomNo?: string;
  weeklyHours?: number;
}

export type SheetStatus = 'mapped' | 'pending' | 'conflict';

export interface EvaluatedQuestionScore {
  questionNo: number;
  subDivision?: string;
  part?: 'Part A' | 'Part B' | 'Part C' | string;
  questionChoice?: 'a' | 'b';
  eitherOrGroup?: '6' | '7' | '8' | string;
  questionText: string;
  attempted: boolean;
  extractedStudentAnswer?: string;
  marksAwarded: number;
  maxMarks: number;
  feedback?: string;
  confidence?: number;
}

export interface AnswerSheet {
  id: string;
  barcode: string;
  dummyNumber: string;
  packetNumber: string;
  registerNo: string;
  studentName: string;
  department: DepartmentCode;
  semester: number;
  subjectCode: string;
  subjectName: string;
  examDate: string;
  session: 'FN' | 'AN';
  totalPagesScanned: number;
  status: SheetStatus;
  confidenceScore: number;
  conflictReason?: string;
  qrPayload?: string;
  scannedAt: string;
  evaluatorId?: string;
  verifiedBy?: string;
  answerKeyId?: string;
  marksObtained?: number;
  maxMarks?: number;
  percentage?: number;
  grade?: 'O' | 'A+' | 'A' | 'B+' | 'B' | 'RA' | 'AB';
  resultStatus?: 'PASS' | 'RA' | 'AB';
  questionEvaluations?: EvaluatedQuestionScore[];
  ocrExtractedText?: string;
  captureSource?: 'webcam' | 'rear-camera' | 'file-upload' | 'optical-feeder';
  capturedImageDataUrl?: string;
  classYear?: 'I' | 'II' | 'III' | 'IV';
  section?: string;
  extractedQpCode?: string;
  extractedYearDept?: string;
  pagesUsed?: number;
  ownerStaffId?: string;
  ownerStaffName?: string;
}

export interface SmsTemplate {
  id: string;
  title: string;
  category: 'Results' | 'Internal Assessment' | 'Schedule' | 'Attendance Alert';
  dltTemplateId: string;
  headerId: string;
  messageFormat: string;
  variableTags: string[];
  description: string;
}

export type SmsDeliveryStatus = 'delivered' | 'queued' | 'failed';

export interface SmsLog {
  id: string;
  templateTitle: string;
  studentName: string;
  registerNo: string;
  parentPhone: string;
  parentName: string;
  department: DepartmentCode;
  messageBody: string;
  sentAt: string;
  status: SmsDeliveryStatus;
  dltMsgId: string;
  latencyMs: number;
  ownerStaffId?: string;
}

export interface SubjectScore {
  subjectCode: string;
  subjectName: string;
  credits: number;
  internalMarks: number; // Max 40 or 20
  semesterMarks: number; // Max 60 or 80
  totalMarks: number;    // 100
  grade: 'O' | 'A+' | 'A' | 'B+' | 'B' | 'RA' | 'SA';
  gradePoints: number;
  result: 'PASS' | 'RA' | 'AB';
}

export interface MarkRecord {
  id: string;
  registerNo: string;
  rollNo: string;
  studentName: string;
  department: DepartmentCode;
  semester: number;
  academicYear: string;
  regulation: string; // e.g. "R-2021 Autonomous"
  subjects: SubjectScore[];
  gpa: number;
  cgpa: number;
  rank: number;
  totalCreditsEarned: number;
  totalCreditsOffered: number;
  arrearsCount: number;
  resultStatus: 'PASS' | 'WITHHELD' | 'RA';
  verifiedDate: string;
  ownerStaffId?: string;
}

export type KeyOption = 'A' | 'B' | 'C' | 'D' | 'Bonus' | 'Descriptive';
export type ExamCategory = 'Internal' | 'Model' | 'Semester';

export interface StepRubric {
  stepNo: number;
  description: string;
  marks: number;
}

export interface QuestionKey {
  questionNo: number;
  part?: 'Part A' | 'Part B' | 'Part C';
  subDivision?: string;
  questionText?: string;
  topic: string;
  keyOption: KeyOption;
  positiveMarks: number;
  negativeMarks: number;
  cognitiveLevel: 'K1 - Remember' | 'K2 - Understand' | 'K3 - Apply' | 'K4 - Analyze' | 'K5 - Evaluate' | 'K6 - Create';
  mappedSyllabusUnit: string;
  status: 'Active' | 'Challenged' | 'Bonus';
  courseOutcome?: 'CO1' | 'CO2' | 'CO3' | 'CO4' | 'CO5' | 'CO6';
  expectedAnswer?: string;
  rubricBreakdown?: StepRubric[];
  pageNo?: number;
}

export interface UploadedPageSolution {
  page: number;
  fileName: string;
  fileSize: string;
  timestamp: string;
  notes?: string;
}

export interface ExamAnswerKey {
  id: string;
  subjectCode: string;
  subjectName: string;
  regulation: string;
  semester: number;
  semesterType?: 'ODD' | 'EVEN';
  department: DepartmentCode;
  programmeName?: string;
  examCategory?: ExamCategory;
  examTitle?: string;
  examTypeLabel?: string;
  academicYear?: string;
  examDate?: string;
  duration?: string;
  setCode: 'Set A' | 'Set B' | 'Set C' | 'Set D';
  totalQuestions: number;
  maximumMarks: number;
  createdDate: string;
  updatedAt?: string;
  approvedBy: string;
  isLocked: boolean;
  questions: QuestionKey[];
  uploadedQuestionPaperName?: string;
  uploadedTemplateName?: string;
  uploadedPageSolutions?: UploadedPageSolution[];
  classYear?: 'I' | 'II' | 'III' | 'IV';
  section?: 'A' | 'B' | 'C' | 'D' | 'ALL';
  handledBy?: string;
  ownerStaffId?: string;
  ownerStaffName?: string;
  templateMode?: 'default' | 'custom';
  customTemplateName?: string;
  customTemplateHtml?: string;
  editedWordHtml?: string;
  includeValues?: boolean;
}

export interface AnswerKeyTemplate {
  id: string;
  title: string;
  examCategory: ExamCategory;
  department: DepartmentCode | 'ALL';
  regulation: string;
  fileFormat: 'EXCEL' | 'DOCX' | 'PDF' | 'JSON';
  fileName: string;
  description: string;
  lastUpdated: string;
  sampleSubject?: string;
  downloadUrl?: string;
}

export interface DepartmentCustomization {
  code: DepartmentCode;
  name: string;
  degreeTitle: string;
  alias: string;
  hodName: string;
  hodQualification: string;
  hodEmail: string;
  hodPhone: string;
  hodCabin: string;
  establishedYear: number;
  sanctionedIntake: number;
  facultyCount: number;
  labsCount: number;
  regulation: string; // e.g. "Regulation R-2021 Autonomous (CBCS)"
  nbaAccredited: boolean;
  naacGrade: string;
  vision: string;
  mission: string;
  specializations: string[];
  keyLabs: string[];
  departmentNotice?: string;
  customPassword?: string;
  syllabusBOSChair?: string;
}

export interface StudentProfile {
  id: string;
  registerNo: string;
  rollNo: string;
  name: string;
  department: DepartmentCode;
  degree: string;
  year: 'I' | 'II' | 'III' | 'IV';
  semester: number;
  section: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  batch: string;
  cgpa: number;
  attendancePercentage: number;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  mentorName: string;
  bloodGroup: string;
  admissionType: 'TNEA Government Quota' | 'Management Quota' | 'Lateral Entry';
  iat1Average: number;
  iat2Average: number;
  historyOfArrears: number;
  activeStatus: 'Active' | 'Detained' | 'Graduated';
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  residentialAddress?: string;
  counselingRemarks?: string;
  hostelStatus?: 'Day Scholar' | 'College Hostel' | 'Self Stay';
  emergencyContact?: string;
  ownerStaffId?: string;
}

export interface ExamTelemetryEvent {
  id: string;
  type: 'barcode_scan' | 'sms_broadcast' | 'mark_approved' | 'conflict_detected' | 'transcript_issued' | 'answerkey_locked';
  title: string;
  details: string;
  timestamp: string;
  department?: DepartmentCode;
  severity: 'info' | 'success' | 'warning' | 'error';
}

export interface SessionLocation {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  source?: 'geolocation' | 'ip_lookup' | 'campus_default';
}

export interface SessionDeviceInfo {
  userAgent?: string;
  platform?: string;
  screenResolution?: string;
  deviceType?: string;
}

export interface LoginSessionRecord {
  id?: string;
  _id?: string;
  token: string;
  username: string;
  fullName: string;
  role: string;
  designation: string;
  department: DepartmentCode | 'ALL';
  isAdmin: boolean;
  loginTime: string;
  ipAddress: string;
  serverDetectedIp?: string;
  location: SessionLocation;
  deviceInfo?: SessionDeviceInfo;
  status: 'Active' | 'Logged Out';
  _syncedToMongo?: boolean;
  createdAt: string;
}

export interface MongoStatusInfo {
  connected: boolean;
  status: 'connected' | 'connecting' | 'error' | 'offline';
  lastError: string | null;
  cluster: string;
  database: string;
  collection: string;
  lastAttemptAt?: string;
  totalSessionsRecorded?: number;
}

export type TestCategory =
  | 'Unit Test 1'
  | 'Unit Test 2'
  | 'Continuous Internal Assessment 1 (CIA 1)'
  | 'Continuous Internal Assessment 2 (CIA 2)'
  | 'Model Exam'
  | 'Autonomous End Semester Exam';

export interface TestWindowConfig {
  id: string;
  testName: string;
  testCategory: TestCategory;
  academicYear: string;
  semester: number;
  year: 'I' | 'II' | 'III' | 'IV' | 'ALL';
  section: 'A' | 'B' | 'C' | 'D' | 'ALL';
  department: DepartmentCode | 'ALL';
  isOpen: boolean; // whether marks upload is open or locked
  startDate: string;
  deadline: string;
  maxMarks: number;
  weightagePercentage?: number;
  openedBy: string;
  description?: string;
  lastUpdated?: string;
}

export interface StudentTestMark {
  id: string;
  testId: string;
  testName: string;
  registerNo: string;
  rollNo?: string;
  studentName: string;
  department: DepartmentCode;
  year: 'I' | 'II' | 'III' | 'IV';
  section: string;
  subjectCode: string;
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
  grade?: string;
  result: 'PASS' | 'RA' | 'AB';
  uploadedAt: string;
  uploadedBy: string;
  ownerStaffId?: string;
  remarks?: string;
}

export interface ClassMarkStatementRow {
  sno: number;
  registerNo: string;
  rollNo: string;
  studentName: string;
  internalMarks: number;
  externalMarks: number;
  totalMarks: number;
  maxMarks: number;
  grade: string;
  gradePoints: number;
  result: 'PASS' | 'RA' | 'AB';
  remarks: string;
  source: 'Uploaded Marks' | 'Transcript Ledger' | 'Draft / Editable';
}

export interface SavedCustomTemplate {
  id: string;
  name: string;
  html: string;
  placeholders: string[];
  uploadedAt: string;
  ownerStaffId?: string;
  ownerStaffName?: string;
  category?: 'mark-statement' | 'answer-key';
}

export interface ClassMarkStatementDoc {
  id: string;
  department: DepartmentCode;
  academicYear: string;
  semesterType?: 'ODD' | 'EVEN';
  year: 'I' | 'II' | 'III' | 'IV';
  semester: number;
  section: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  ownerStaffId?: string;
  ownerStaffName?: string;
  examTitle: string;
  examCategory: string;
  examDate: string;
  regulation: string;
  maxMarks?: number;
  includeValues?: boolean;
  templateMode: 'default' | 'custom';
  customTemplateName?: string;
  customTemplateHtml?: string;
  documentTitle: string;
  documentSubtitle: string;
  headerNotes: string;
  footerNotes: string;
  preparedBy: string;
  hodName: string;
  coeName: string;
  editedWordHtml?: string;
  rows: ClassMarkStatementRow[];
  status: 'Draft' | 'Mark Statement Marked / Finalized';
  markedAt?: string;
  markedBy?: string;
  updatedAt: string;
}

