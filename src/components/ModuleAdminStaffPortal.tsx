import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus,
  KeyRound,
  ShieldCheck,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  LogIn,
  Lock,
  Unlock,
  Trash2,
  FileText,
  Users,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
  FolderLock,
  ArrowRight,
  Upload,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import {
  StaffAccount,
  TeacherAllocation,
  UserSession,
  ClassMarkStatementDoc,
  SavedCustomTemplate
} from '../types';
import {
  generateStrongStaffPassword,
  loadAllStaffStatementsSummary
} from '../utils/staffAuthService';

interface ModuleAdminStaffPortalProps {
  staffAccounts: StaffAccount[];
  teacherAllocations: TeacherAllocation[];
  session: UserSession;
  onAddStaffAccount: (newAccount: StaffAccount) => void;
  onUpdateStaffAccount: (updated: StaffAccount) => void;
  onDeleteStaffAccount: (staffId: string) => void;
  onInspectStaffPage: (staffId: string, targetTab?: 'dashboard' | 'marks' | 'upload-marks' | 'answer-keys') => void;
}

export const ModuleAdminStaffPortal: React.FC<ModuleAdminStaffPortalProps> = ({
  staffAccounts,
  teacherAllocations,
  session,
  onAddStaffAccount,
  onUpdateStaffAccount,
  onDeleteStaffAccount,
  onInspectStaffPage
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Create Staff ID & Password Form State
  const staffImportInputRef = React.useRef<HTMLInputElement | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(true);
  const [newStaffId, setNewStaffId] = useState<string>('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newDesignation, setNewDesignation] = useState('Assistant Professor');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState(() => generateStrongStaffPassword('staff'));
  const [showNewPassword, setShowNewPassword] = useState(true);

  // Password Reset / Edit Modal State
  const [resetTarget, setResetTarget] = useState<StaffAccount | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [editProfileTarget, setEditProfileTarget] = useState<StaffAccount | null>(null);
  const [editProfileForm, setEditProfileForm] = useState<Partial<StaffAccount>>({});

  // Inspect Isolated Staff Documents Drawer Modal
  const [docsPreviewTarget, setDocsPreviewTarget] = useState<{
    account: StaffAccount;
    statements: ClassMarkStatementDoc[];
    templates: SavedCustomTemplate[];
  } | null>(null);

  // Aggregate read-only storage summaries for all staff partitions
  const partitionSummaries = useMemo(() => {
    const list = loadAllStaffStatementsSummary(staffAccounts);
    const map = new Map<
      string,
      { statements: ClassMarkStatementDoc[]; templates: SavedCustomTemplate[] }
    >();
    list.forEach((item) => {
      map.set(item.staffId, {
        statements: item.statements,
        templates: item.templates
      });
    });
    return map;
  }, [staffAccounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffAccounts.filter((acc) => {
      if (statusFilter === 'ACTIVE' && !acc.isActive) return false;
      if (statusFilter === 'INACTIVE' && acc.isActive) return false;
      if (q) {
        const hay = `${acc.staffId} ${acc.staffName} ${acc.designation} ${acc.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [staffAccounts, searchQuery, statusFilter]);

  const totals = useMemo(() => {
    let totalDocs = 0;
    let totalFinalized = 0;
    let totalCustomTemplates = 0;
    partitionSummaries.forEach((val) => {
      totalDocs += val.statements.length;
      totalFinalized += val.statements.filter(
        (s) => s.status === 'Mark Statement Marked / Finalized'
      ).length;
      totalCustomTemplates += val.templates.length;
    });
    return {
      totalStaff: staffAccounts.length,
      activeStaff: staffAccounts.filter((s) => s.isActive).length,
      totalDocs,
      totalFinalized,
      totalCustomTemplates
    };
  }, [staffAccounts, partitionSummaries]);

  const showNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const suggestNextStaffId = (currentAccounts: StaffAccount[]) => {
    let num = 201 + currentAccounts.length;
    while (currentAccounts.some((a) => a.staffId.toUpperCase() === `FAC-AIDS-${num}`)) {
      num++;
    }
    return `FAC-AIDS-${num}`;
  };

  const handleCreateStaffAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newStaffId.trim().toUpperCase();
    const cleanName = newStaffName.trim();
    const cleanPass = newPassword.trim();

    if (!cleanId || !cleanName || !cleanPass) {
      showNotice('error', 'Staff ID, Staff Name, and Password are all required.');
      return;
    }

    if (cleanPass.length < 4) {
      showNotice('error', 'Staff Password must be at least 4 characters long.');
      return;
    }

    if (staffAccounts.some((a) => a.staffId.toUpperCase() === cleanId)) {
      showNotice('error', `Staff ID "${cleanId}" already exists. Use a unique Staff ID.`);
      return;
    }

    if (
      staffAccounts.some(
        (a) => a.staffName.trim().toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      showNotice(
        'error',
        `A staff account for "${cleanName}" already exists. Use unique Staff Name to prevent document mismatch.`
      );
      return;
    }

    const generatedEmail =
      newEmail.trim() ||
      `${cleanName
        .toLowerCase()
        .replace(/^(dr\.?|prof\.?|mr\.?|ms\.?)\s+/i, '')
        .replace(/[^a-z0-9]/g, '')}@vsbec.ac.in`;

    const created: StaffAccount = {
      id: `STF-${Date.now().toString().slice(-6)}`,
      staffId: cleanId,
      staffName: cleanName,
      designation: newDesignation,
      department: 'AI&DS',
      email: generatedEmail,
      phone: newPhone.trim(),
      password: cleanPass,
      isActive: true,
      createdAt: new Date().toISOString().slice(0, 10),
      createdBy: session.fullName || 'COE Admin'
    };

    onAddStaffAccount(created);
    confetti({ particleCount: 45, spread: 60 });
    showNotice(
      'success',
      `Created Isolated Staff Page for ${created.staffName} (${created.staffId}) with password "${created.password}".`
    );

    const updatedList = [created, ...staffAccounts];
    setNewStaffId(suggestNextStaffId(updatedList));
    setNewStaffName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword(generateStrongStaffPassword('staff'));
  };

  const handleDownloadStaffTemplate = () => {
    const templateRows = [
      {
        Staff_ID: '',
        Staff_Name: '',
        Designation: 'Assistant Professor',
        Department: 'AI&DS',
        Email: '',
        Phone: '',
        Password: ''
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 24 },
      { wch: 24 },
      { wch: 12 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff_Upload_Template');
    XLSX.writeFile(wb, 'VSBEC_Staff_Upload_Template.xlsx');
  };

  const handleImportStaffExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        showNotice('error', 'Uploaded Excel file contains no worksheet.');
        return;
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[sheetName], { defval: '' });
      let added = 0;
      const existingIds = new Set(staffAccounts.map((a) => a.staffId.toUpperCase()));

      rows.forEach((raw, idx) => {
        const cleanId = String(raw['Staff_ID'] || raw['StaffID'] || raw['ID'] || '').trim().toUpperCase();
        const cleanName = String(raw['Staff_Name'] || raw['StaffName'] || raw['Name'] || '').trim();
        if (!cleanId || !cleanName || existingIds.has(cleanId)) return;

        existingIds.add(cleanId);
        const designation = String(raw['Designation'] || 'Assistant Professor').trim();
        const email =
          String(raw['Email'] || '').trim() ||
          `${cleanName.toLowerCase().replace(/^(dr\.?|prof\.?|mr\.?|ms\.?)\s+/i, '').replace(/[^a-z0-9]/g, '')}@vsbec.ac.in`;
        const phone = String(raw['Phone'] || raw['Mobile'] || '').trim();
        const password = String(raw['Password'] || '').trim() || generateStrongStaffPassword(cleanName);

        onAddStaffAccount({
          id: `STF-${Date.now().toString().slice(-6)}-${idx}`,
          staffId: cleanId,
          staffName: cleanName,
          designation,
          department: 'AI&DS',
          email,
          phone,
          password,
          isActive: true,
          createdAt: new Date().toISOString().slice(0, 10),
          createdBy: session.fullName || 'COE Admin'
        });
        added++;
      });

      if (added > 0) {
        confetti({ particleCount: 45, spread: 60 });
        showNotice('success', `Imported ${added} staff account(s) from "${file.name}".`);
      } else {
        showNotice('error', 'No new valid rows found (check Staff_ID and Staff_Name columns).');
      }
    } catch (err: any) {
      showNotice('error', err?.message || 'Failed to parse staff Excel file.');
    }
  };

  const handleSaveResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    const cleanPass = resetPasswordValue.trim();
    if (cleanPass.length < 4) {
      showNotice('error', 'New password must be at least 4 characters.');
      return;
    }
    const updated: StaffAccount = {
      ...resetTarget,
      password: cleanPass,
      lastPasswordResetAt: new Date().toLocaleString('en-IN')
    };
    onUpdateStaffAccount(updated);
    setResetTarget(null);
    setResetPasswordValue('');
    showNotice(
      'success',
      `Password updated for ${updated.staffName} (${updated.staffId}).`
    );
  };

  const handleSaveEditProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileTarget) return;
    const updated: StaffAccount = {
      ...editProfileTarget,
      staffName: (editProfileForm.staffName || editProfileTarget.staffName).trim(),
      designation: (editProfileForm.designation || editProfileTarget.designation).trim(),
      email: (editProfileForm.email || editProfileTarget.email).trim(),
      phone: (editProfileForm.phone || editProfileTarget.phone).trim()
    };
    onUpdateStaffAccount(updated);
    setEditProfileTarget(null);
    showNotice('success', `Updated profile details for ${updated.staffId}.`);
  };

  const handleCopyCredentials = (acc: StaffAccount) => {
    const text = `V.S.B. Engineering College - AI&DS Staff Portal\nStaff Name: ${acc.staffName}\nStaff ID: ${acc.staffId}\nPassword: ${acc.password}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(acc.staffId);
    setTimeout(() => setCopiedId(null), 2000);
    showNotice('info', `Copied Staff ID & Password for ${acc.staffName} to clipboard.`);
  };

  return (
    <div className="space-y-6 pb-14">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-[#781717] text-amber-300 shadow-md shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Admin Staff Credentials &amp; Isolated Staff Portal Control
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider">
                Admin Only • Zero Cross-Staff Mismatch
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
              Create unique Staff IDs and Passwords for AI&amp;DS faculty, reset passwords anytime, audit partitioned documents, and open any individual Staff Member&rsquo;s private portal page directly.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={staffImportInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportStaffExcel}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleDownloadStaffTemplate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#781717]" />
            <span>Staff Excel Template</span>
          </button>
          <button
            type="button"
            onClick={() => staffImportInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Staff (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-black text-xs shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-300" />
            <span>{showCreateForm ? 'Hide Form' : '+ Add Staff ID'}</span>
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold shadow-sm ${
              banner.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : banner.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-blue-50 border-blue-300 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {banner.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{banner.text}</span>
            </div>
            <button onClick={() => setBanner(null)} className="p-1 rounded-lg hover:bg-black/5 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Registered Staff IDs</span>
            <Users className="w-4 h-4 text-[#781717]" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{totals.totalStaff}</div>
          <div className="text-[11px] text-emerald-700 font-bold mt-1">
            {totals.activeStaff} Active Accounts • AI&amp;DS Dept
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Isolated Staff Statements</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono">{totals.totalDocs}</div>
          <div className="text-[11px] text-slate-600 mt-1">
            {totals.totalFinalized} Finalized across private staff vaults
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Private Custom Templates</span>
            <FolderLock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">{totals.totalCustomTemplates}</div>
          <div className="text-[11px] text-slate-600 mt-1">
            Scoped per Staff ID — zero template overlap
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Course Allocations Linked</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {teacherAllocations.filter((a) => a.department === 'AI&DS').length}
          </div>
          <div className="text-[11px] text-slate-600 mt-1">
            Auto-mapped to Staff ID on Portal Entry
          </div>
        </div>
      </div>

      {/* Create New Staff ID & Password Creator Card */}
      {showCreateForm && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#781717]/20 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-red-50 text-[#781717] border border-red-200">
                <KeyRound className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Staff ID &amp; Password Creation Form
                </h2>
                <p className="text-[11px] text-slate-500">
                  Every new Staff ID automatically receives a private, isolated Staff Portal and partitioned document storage vault.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewStaffId(suggestNextStaffId(staffAccounts));
                setNewPassword(generateStrongStaffPassword(newStaffName));
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate New ID &amp; Password</span>
            </button>
          </div>

          <form onSubmit={handleCreateStaffAccount} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Unique Staff ID *
              </label>
              <input
                type="text"
                required
                value={newStaffId}
                onChange={(e) => setNewStaffId(e.target.value.toUpperCase())}
                placeholder="Enter unique Staff ID"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-black text-xs text-[#781717] bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Staff Full Name *
              </label>
              <input
                type="text"
                required
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Enter faculty full name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Designation
              </label>
              <select
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="Professor & HOD">Professor &amp; HOD</option>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor (Sr.G)">Assistant Professor (Sr.G)</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lab Instructor">Lab Instructor</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Official Email ID
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@vsbec.ac.in (auto if blank)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Mobile Contact
              </label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Enter contact number"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Staff Portal Password *
                </label>
                <button
                  type="button"
                  onClick={() => setNewPassword(generateStrongStaffPassword(newStaffName))}
                  className="text-[10px] font-black text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-Generate</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create staff password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                Staff member will log into <strong>Department Staff Portal</strong> using <code className="font-mono text-[#781717] font-bold">{newStaffId || 'Staff ID'}</code> or their <strong>Staff Name</strong> + Password.
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-black text-xs shadow-md cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-amber-300" />
                <span>Create Staff ID &amp; Activate Private Portal</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Registered Staff Pages & Credentials Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900">
              AI&amp;DS Staff Accounts, Passwords &amp; Direct Page Access ({filteredAccounts.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click <strong>Open Staff Page</strong> to enter any staff member&rsquo;s isolated portal directly, reset their password, or inspect their private documents.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
            >
              <option value="ALL">All Staff Statuses</option>
              <option value="ACTIVE">Active Accounts Only</option>
              <option value="INACTIVE">Suspended Only</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Staff ID, Name, Email..."
                className="pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Staff ID &amp; Name</th>
                <th className="py-3 px-4">Designation &amp; Contact</th>
                <th className="py-3 px-4">Staff Password</th>
                <th className="py-3 px-4 text-center">Isolated Docs &amp; Courses</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">No staff accounts added yet.</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Use the form above or click &ldquo;Upload Staff (.xlsx)&rdquo; to register your department faculty.
                    </p>
                  </td>
                </tr>
              ) : filteredAccounts.map((acc) => {
                const isRevealed = !!revealedPasswords[acc.staffId];
                const summary = partitionSummaries.get(acc.staffId) || {
                  statements: [],
                  templates: []
                };
                const staffAllocs = teacherAllocations.filter(
                  (a) =>
                    a.department === 'AI&DS' &&
                    (a.teacherId === acc.staffId ||
                      a.teacherName.toLowerCase() === acc.staffName.toLowerCase())
                );
                const finalizedDocs = summary.statements.filter(
                  (s) => s.status === 'Mark Statement Marked / Finalized'
                ).length;

                return (
                  <tr key={acc.staffId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 align-top">
                      <div className="inline-block px-2 py-0.5 rounded bg-red-50 border border-red-200 font-mono font-black text-[#781717] text-[11px] mb-1">
                        {acc.staffId}
                      </div>
                      <div className="font-black text-slate-900 text-xs">{acc.staffName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {acc.lastLoginAt ? `Last Login: ${acc.lastLoginAt}` : `Created: ${acc.createdAt}`}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-800">{acc.designation}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{acc.email}</div>
                      <div className="text-[10px] font-mono text-slate-400">{acc.phone}</div>
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
                        <span className="font-mono font-bold text-slate-900">
                          {isRevealed ? acc.password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedPasswords((prev) => ({
                              ...prev,
                              [acc.staffId]: !prev[acc.staffId]
                            }))
                          }
                          className="p-0.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                          title={isRevealed ? 'Hide Password' : 'Reveal Password'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(acc)}
                          className="p-0.5 text-slate-500 hover:text-[#781717] cursor-pointer"
                          title="Copy Staff ID & Password"
                        >
                          {copiedId === acc.staffId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {acc.lastPasswordResetAt && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          Reset: {acc.lastPasswordResetAt}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center align-top">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setDocsPreviewTarget({
                              account: acc,
                              statements: summary.statements,
                              templates: summary.templates
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-[11px] cursor-pointer"
                        >
                          {summary.statements.length} Statements ({finalizedDocs} Final)
                        </button>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {staffAllocs.length} Courses • {summary.templates.length} Custom Tpls
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center align-top">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateStaffAccount({ ...acc, isActive: !acc.isActive })
                        }
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border cursor-pointer ${
                          acc.isActive
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                        title="Click to toggle Active / Suspended"
                      >
                        {acc.isActive ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span>{acc.isActive ? 'Active' : 'Suspended'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right align-top">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onInspectStaffPage(acc.staffId, 'dashboard')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-black text-[11px] shadow-xs cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5 text-amber-300" />
                          <span>Open Staff Page</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(acc);
                            setResetPasswordValue(acc.password);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] cursor-pointer"
                        >
                          Reset Password
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditProfileTarget(acc);
                            setEditProfileForm(acc);
                          }}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="Edit Staff Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {confirmDeleteStaffId === acc.staffId ? (
                          <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-lg px-2 py-1">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteStaffAccount(acc.staffId);
                                setConfirmDeleteStaffId(null);
                              }}
                              className="text-[10px] font-black text-rose-700 hover:underline cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteStaffId(null)}
                              className="text-[10px] font-bold text-slate-500 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStaffId(acc.staffId)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                            title="Delete Staff Account"
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
      </div>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="p-5 bg-[#781717] text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black">Reset Staff Password</h3>
                  <p className="text-[11px] text-rose-200">
                    {resetTarget.staffName} ({resetTarget.staffId})
                  </p>
                </div>
                <button
                  onClick={() => setResetTarget(null)}
                  className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveResetPassword} className="p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">New Staff Password</label>
                    <button
                      type="button"
                      onClick={() =>
                        setResetPasswordValue(generateStrongStaffPassword(resetTarget.staffName))
                      }
                      className="text-[11px] font-black text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Auto-Generate Password</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetTarget(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#781717] hover:bg-[#5e1111] text-white font-black text-xs cursor-pointer"
                  >
                    Save New Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Staff Profile Modal */}
      <AnimatePresence>
        {editProfileTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black">Edit Staff Details</h3>
                  <p className="text-[11px] text-amber-300 font-mono">{editProfileTarget.staffId}</p>
                </div>
                <button
                  onClick={() => setEditProfileTarget(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveEditProfile} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Staff Name</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.staffName || ''}
                    onChange={(e) =>
                      setEditProfileForm((p) => ({ ...p, staffName: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.designation || ''}
                    onChange={(e) =>
                      setEditProfileForm((p) => ({ ...p, designation: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editProfileForm.email || ''}
                    onChange={(e) => setEditProfileForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editProfileForm.phone || ''}
                    onChange={(e) => setEditProfileForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditProfileTarget(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#781717] text-white font-black cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Isolated Staff Documents Audit Modal */}
      <AnimatePresence>
        {docsPreviewTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 bg-[#781717] text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black">
                    Isolated Staff Vault — {docsPreviewTarget.account.staffName}
                  </h3>
                  <p className="text-[11px] text-amber-300 font-mono">
                    Partition Key: {docsPreviewTarget.account.staffId} • {docsPreviewTarget.statements.length} Statements • {docsPreviewTarget.templates.length} Custom Templates
                  </p>
                </div>
                <button
                  onClick={() => setDocsPreviewTarget(null)}
                  className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                {docsPreviewTarget.statements.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                    No mark statements saved yet inside <strong>{docsPreviewTarget.account.staffId}</strong>&rsquo;s private vault.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docsPreviewTarget.statements.map((st) => (
                      <div
                        key={st.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-black text-slate-900">
                            {st.subjectCode} — {st.subjectName}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            Year {st.year} • Sec {st.section} • Sem 0{st.semester} • {st.examCategory}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            st.status === 'Mark Statement Marked / Finalized'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {st.status === 'Mark Statement Marked / Finalized' ? 'Finalized' : 'Draft'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDocsPreviewTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = docsPreviewTarget.account.staffId;
                    setDocsPreviewTarget(null);
                    onInspectStaffPage(id, 'marks');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#781717] text-white font-black text-xs cursor-pointer"
                >
                  <span>Enter Staff Mark Statements Page</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
