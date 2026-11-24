import {
  StaffAccount,
  UserSession,
  ClassMarkStatementDoc,
  SavedCustomTemplate,
  AnswerSheet,
  StudentProfile,
  MarkRecord,
  ExamAnswerKey,
  StudentTestMark,
  SmsLog
} from '../types';

export const STORAGE_KEY_STAFF_ACCOUNTS = 'vsbec_staff_accounts';
export const STORAGE_KEY_CLASS_STATEMENTS_PREFIX = 'vsbec_class_mark_statements';
export const STORAGE_KEY_CUSTOM_TEMPLATES_PREFIX = 'vsbec_custom_mark_templates';
export const STORAGE_KEY_AK_TEMPLATES_PREFIX = 'vsbec_custom_ak_templates';

export const INITIAL_STAFF_ACCOUNTS: StaffAccount[] = [];

export function loadStaffAccounts(): StaffAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STAFF_ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((acc: any) => !isLegacySampleId(acc?.id));
  } catch {
    return [];
  }
}

export function saveStaffAccounts(accounts: StaffAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_STAFF_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed saving staff accounts:', e);
  }
}

export function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function stripHonorific(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '')
    .replace(/\s+/g, ' ');
}

/**
 * Authenticates a staff login using either Staff ID OR Staff Name + Password.
 * Checks strictly against active staff accounts managed by the Admin Portal.
 */
export function authenticateStaffCredentials(
  accounts: StaffAccount[],
  identifierInput: string,
  passwordInput: string
): { success: true; account: StaffAccount } | { success: false; error: string } {
  const cleanIdOrName = normalizeIdentifier(identifierInput);
  const cleanPass = passwordInput.trim();

  if (!cleanIdOrName || !cleanPass) {
    return { success: false, error: 'Please enter both your Staff ID / Name and Password.' };
  }

  const matched = accounts.find((acc) => {
    const idMatch = normalizeIdentifier(acc.staffId) === cleanIdOrName;
    const fullNameMatch = normalizeIdentifier(acc.staffName) === cleanIdOrName;
    const plainNameMatch = stripHonorific(acc.staffName) === stripHonorific(identifierInput);
    return idMatch || fullNameMatch || plainNameMatch;
  });

  if (!matched) {
    return {
      success: false,
      error: `No Staff Account found matching "${identifierInput}". Verify your Staff ID or contact COE Admin.`
    };
  }

  if (!matched.isActive) {
    return {
      success: false,
      error: `Staff account ${matched.staffId} (${matched.staffName}) is currently deactivated by COE Admin.`
    };
  }

  if (matched.password !== cleanPass) {
    return {
      success: false,
      error: `Incorrect password for ${matched.staffName} (${matched.staffId}). Contact COE Admin for password reset.`
    };
  }

  return { success: true, account: matched };
}

/**
 * Generates a memorable yet strong alphanumeric password for new/reset staff accounts.
 */
export function generateStrongStaffPassword(staffName?: string): string {
  const cleanBase = (staffName || 'vsb')
    .replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 5)
    .toLowerCase();
  const prefix = cleanBase.length >= 3 ? cleanBase : 'staff';
  const digits = Math.floor(1000 + Math.random() * 9000);
  const symbols = ['@', '#', '$'];
  const sym = symbols[Math.floor(Math.random() * symbols.length)];
  return `${prefix}${sym}${digits}`;
}

/**
 * Resolves the active isolated Staff Workspace scope.
 * - Normal Staff Login: strictly locked to `session.staffId`.
 * - Admin Inspecting a Staff Page: strictly scoped to `session.adminInspectingStaffId`.
 * - Global COE Admin (not inspecting): returns `isScoped: false` (sees all aggregated or admin-managed views).
 */
export function getActiveStaffWorkspace(
  session?: UserSession | null,
  staffAccounts: StaffAccount[] = []
): {
  isScoped: boolean;
  isAdminInspecting: boolean;
  staffId: string | null;
  staffName: string | null;
  staffAccount: StaffAccount | null;
} {
  if (!session) {
    return { isScoped: false, isAdminInspecting: false, staffId: null, staffName: null, staffAccount: null };
  }

  if (session.isAdmin && session.adminInspectingStaffId) {
    const found =
      staffAccounts.find((a) => a.staffId === session.adminInspectingStaffId) || null;
    return {
      isScoped: true,
      isAdminInspecting: true,
      staffId: session.adminInspectingStaffId,
      staffName: found?.staffName || session.staffName || session.adminInspectingStaffId,
      staffAccount: found
    };
  }

  if (!session.isAdmin && session.staffId) {
    const found = staffAccounts.find((a) => a.staffId === session.staffId) || null;
    return {
      isScoped: true,
      isAdminInspecting: false,
      staffId: session.staffId,
      staffName: found?.staffName || session.staffName || session.fullName,
      staffAccount: found
    };
  }

  return {
    isScoped: false,
    isAdminInspecting: false,
    staffId: null,
    staffName: null,
    staffAccount: null
  };
}

/**
 * Partitioned Storage Key Builder for zero cross-staff mismatch.
 */
export function getStaffStatementsStorageKey(staffId: string): string {
  return `${STORAGE_KEY_CLASS_STATEMENTS_PREFIX}__${staffId.trim().toUpperCase()}`;
}

export function getStaffCustomTemplatesStorageKey(staffId: string): string {
  return `${STORAGE_KEY_CUSTOM_TEMPLATES_PREFIX}__${staffId.trim().toUpperCase()}`;
}

export function loadStatementsForStaff(staffId: string | null): ClassMarkStatementDoc[] {
  try {
    if (staffId) {
      const key = getStaffStatementsStorageKey(staffId);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((doc) => !doc.ownerStaffId || doc.ownerStaffId === staffId);
        }
      }
      return [];
    }

    // Global COE Admin fallback key (admin's own statements not assigned to a specific staff partition)
    const rawGlobal = localStorage.getItem(STORAGE_KEY_CLASS_STATEMENTS_PREFIX);
    const parsedGlobal = rawGlobal ? JSON.parse(rawGlobal) : [];
    return Array.isArray(parsedGlobal) ? parsedGlobal : [];
  } catch {
    return [];
  }
}

export function saveStatementsForStaff(
  staffId: string | null,
  statements: ClassMarkStatementDoc[]
): void {
  try {
    if (staffId) {
      const key = getStaffStatementsStorageKey(staffId);
      const stamped = statements.map((s) => ({
        ...s,
        ownerStaffId: s.ownerStaffId || staffId
      }));
      localStorage.setItem(key, JSON.stringify(stamped));
    } else {
      localStorage.setItem(STORAGE_KEY_CLASS_STATEMENTS_PREFIX, JSON.stringify(statements));
    }
  } catch (e) {
    console.error('Failed saving partitioned staff statements:', e);
  }
}

export function loadCustomTemplatesForStaff(staffId: string | null): SavedCustomTemplate[] {
  try {
    if (staffId) {
      const key = getStaffCustomTemplatesStorageKey(staffId);
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((t) => !t.ownerStaffId || t.ownerStaffId === staffId);
        }
      }
      return [];
    }
    const rawGlobal = localStorage.getItem(STORAGE_KEY_CUSTOM_TEMPLATES_PREFIX);
    const parsedGlobal = rawGlobal ? JSON.parse(rawGlobal) : [];
    return Array.isArray(parsedGlobal) ? parsedGlobal : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplatesForStaff(
  staffId: string | null,
  templates: SavedCustomTemplate[]
): void {
  try {
    if (staffId) {
      const key = getStaffCustomTemplatesStorageKey(staffId);
      const stamped = templates.map((t) => ({
        ...t,
        ownerStaffId: t.ownerStaffId || staffId
      }));
      localStorage.setItem(key, JSON.stringify(stamped));
    } else {
      localStorage.setItem(STORAGE_KEY_CUSTOM_TEMPLATES_PREFIX, JSON.stringify(templates));
    }
  } catch (e) {
    console.error('Failed saving partitioned custom templates:', e);
  }
}

/**
 * Partitioned Answer Key Custom Templates Storage (zero cross-staff mismatch)
 */
export function loadAnswerKeyTemplatesForStaff(staffId: string | null): SavedCustomTemplate[] {
  try {
    if (staffId) {
      const key = `${STORAGE_KEY_AK_TEMPLATES_PREFIX}__${staffId.trim().toUpperCase()}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((t) => !t.ownerStaffId || t.ownerStaffId === staffId);
        }
      }
      return [];
    }
    const rawGlobal = localStorage.getItem(STORAGE_KEY_AK_TEMPLATES_PREFIX);
    const parsedGlobal = rawGlobal ? JSON.parse(rawGlobal) : [];
    return Array.isArray(parsedGlobal) ? parsedGlobal : [];
  } catch {
    return [];
  }
}

export function saveAnswerKeyTemplatesForStaff(
  staffId: string | null,
  templates: SavedCustomTemplate[]
): void {
  try {
    if (staffId) {
      const key = `${STORAGE_KEY_AK_TEMPLATES_PREFIX}__${staffId.trim().toUpperCase()}`;
      const stamped = templates.map((t) => ({
        ...t,
        category: 'answer-key' as const,
        ownerStaffId: t.ownerStaffId || staffId
      }));
      localStorage.setItem(key, JSON.stringify(stamped));
    } else {
      localStorage.setItem(STORAGE_KEY_AK_TEMPLATES_PREFIX, JSON.stringify(templates));
    }
  } catch (e) {
    console.error('Failed saving partitioned answer key templates:', e);
  }
}

/**
 * Aggregates all isolated staff partitions read-only for the COE Admin Portal Audit Dashboard.
 */
export function loadAllStaffStatementsSummary(
  accounts: StaffAccount[]
): { staffId: string; staffName: string; statements: ClassMarkStatementDoc[]; templates: SavedCustomTemplate[] }[] {
  return accounts.map((acc) => ({
    staffId: acc.staffId,
    staffName: acc.staffName,
    statements: loadStatementsForStaff(acc.staffId),
    templates: loadCustomTemplatesForStaff(acc.staffId)
  }));
}

// =========================================================================
// COMPLETE PER-STAFF WORKSPACE ISOLATION (ALL DATA DOMAINS)
// =========================================================================

export function resolveWorkspaceKey(session?: UserSession | null): string {
  if (!session) return 'ANON';
  if (session.isAdmin && session.adminInspectingStaffId) {
    return session.adminInspectingStaffId.trim().toUpperCase();
  }
  if (!session.isAdmin && session.staffId) {
    return session.staffId.trim().toUpperCase();
  }
  return 'COE-ADMIN';
}

export function getWorkspaceAuthHeaders(session?: UserSession | null): Record<string, string> {
  if (!session) return {};
  const inspecting = Boolean(session.isAdmin && session.adminInspectingStaffId);
  const effectiveStaffId = inspecting
    ? session.adminInspectingStaffId!
    : !session.isAdmin && session.staffId
    ? session.staffId
    : 'COE-ADMIN';
  return {
    'x-staff-id': effectiveStaffId.trim().toUpperCase(),
    'x-user-role': session.isAdmin ? (inspecting ? 'admin-inspect' : 'admin') : 'staff',
    ...(session.token ? { 'x-auth-token': session.token } : {})
  };
}

function buildPartitionKey(baseKey: string, workspaceKey: string): string {
  return `${baseKey}__${(workspaceKey || 'COE-ADMIN').trim().toUpperCase()}`;
}

function loadPartitionedArray<T>(baseKey: string, workspaceKey: string): T[] {
  try {
    const raw = localStorage.getItem(buildPartitionKey(baseKey, workspaceKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePartitionedArray<T extends { ownerStaffId?: string }>(
  baseKey: string,
  workspaceKey: string,
  items: T[]
): void {
  try {
    const cleanKey = (workspaceKey || 'COE-ADMIN').trim().toUpperCase();
    const stamped = items.map((item) => ({
      ...item,
      ownerStaffId: item.ownerStaffId || cleanKey
    }));
    localStorage.setItem(buildPartitionKey(baseKey, cleanKey), JSON.stringify(stamped));
  } catch (e) {
    console.error(`Failed saving workspace ${baseKey}:`, e);
  }
}

const LEGACY_SAMPLE_PREFIXES = [
  'AS-9225-',
  'STU-0',
  'MR-9225-',
  'SMS-90',
  'STM-00',
  'KEY-23GET701-IAT3',
  'KEY-CS3391-MODEL',
  'KEY-CS3351-UT1',
  'TEL-10',
  'STF-AIDS-',
  'ALLOC-AIDS-'
];

export function isLegacySampleId(id?: string): boolean {
  if (!id) return false;
  return LEGACY_SAMPLE_PREFIXES.some((prefix) => id.startsWith(prefix));
}

/**
 * Purges pre-existing mock/dummy records from global & staff localStorage once so only real user-entered/uploaded data persists.
 */
export function purgeLegacySampleDataOnce(): void {
  try {
    const flagKey = 'vsbec_sample_purge_v3';
    if (localStorage.getItem(flagKey) === 'done') return;

    const legacyGlobals = [
      'vsbec_answer_sheets',
      'vsbec_students',
      'vsbec_mark_records',
      'vsbec_answer_keys',
      'vsbec_test_marks',
      'vsbec_sms_logs',
      'vsbec_staff_accounts',
      'vsbec_teacher_allocations'
    ];
    for (const k of legacyGlobals) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const realOnly = parsed.filter((item: any) => !isLegacySampleId(item?.id));
          if (realOnly.length === 0) {
            localStorage.removeItem(k);
          } else {
            localStorage.setItem(k, JSON.stringify(realOnly));
          }
        }
      } catch {
        localStorage.removeItem(k);
      }
    }

    // Clear stale pre-seeded default demo session if it contains legacy placeholder faculty names
    const rawAuth = localStorage.getItem('vsbec_auth_user');
    if (rawAuth) {
      try {
        const auth = JSON.parse(rawAuth);
        const nameStr = String(auth?.fullName || '');
        if (
          nameStr.includes('Dr. K. Senthilkumar') ||
          nameStr.includes('Dr. R. Senthil Kumar') ||
          String(auth?.staffId || '').startsWith('FAC-AIDS-20')
        ) {
          localStorage.removeItem('vsbec_auth_user');
        }
      } catch {
        localStorage.removeItem('vsbec_auth_user');
      }
    }

    localStorage.setItem(flagKey, 'done');
  } catch {
    // non-fatal
  }
}

export function loadWorkspaceAnswerSheets(workspaceKey: string): AnswerSheet[] {
  return loadPartitionedArray<AnswerSheet>('vsbec_answer_sheets', workspaceKey);
}
export function saveWorkspaceAnswerSheets(workspaceKey: string, list: AnswerSheet[]): void {
  savePartitionedArray('vsbec_answer_sheets', workspaceKey, list);
}

export function loadWorkspaceStudents(workspaceKey: string): StudentProfile[] {
  return loadPartitionedArray<StudentProfile>('vsbec_students', workspaceKey);
}
export function saveWorkspaceStudents(workspaceKey: string, list: StudentProfile[]): void {
  savePartitionedArray('vsbec_students', workspaceKey, list);
}

export function loadWorkspaceMarkRecords(workspaceKey: string): MarkRecord[] {
  return loadPartitionedArray<MarkRecord>('vsbec_mark_records', workspaceKey);
}
export function saveWorkspaceMarkRecords(workspaceKey: string, list: MarkRecord[]): void {
  savePartitionedArray('vsbec_mark_records', workspaceKey, list);
}

export function loadWorkspaceAnswerKeys(workspaceKey: string): ExamAnswerKey[] {
  return loadPartitionedArray<ExamAnswerKey>('vsbec_answer_keys', workspaceKey);
}
export function saveWorkspaceAnswerKeys(workspaceKey: string, list: ExamAnswerKey[]): void {
  savePartitionedArray('vsbec_answer_keys', workspaceKey, list);
}

export function loadWorkspaceTestMarks(workspaceKey: string): StudentTestMark[] {
  return loadPartitionedArray<StudentTestMark>('vsbec_test_marks', workspaceKey);
}
export function saveWorkspaceTestMarks(workspaceKey: string, list: StudentTestMark[]): void {
  savePartitionedArray('vsbec_test_marks', workspaceKey, list);
}

export function loadWorkspaceSmsLogs(workspaceKey: string): SmsLog[] {
  return loadPartitionedArray<SmsLog>('vsbec_sms_logs', workspaceKey);
}
export function saveWorkspaceSmsLogs(workspaceKey: string, list: SmsLog[]): void {
  savePartitionedArray('vsbec_sms_logs', workspaceKey, list);
}

