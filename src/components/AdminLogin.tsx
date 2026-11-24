import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Building2,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { OfficialEmblem } from './OfficialEmblem';
import { UserSession, DepartmentCode, StaffAccount } from '../types';
import { INITIAL_DEPARTMENT_CUSTOMIZATIONS } from '../data/mockData';
import { recordLoginSessionToMongo } from '../utils/sessionTracker';
import {
  loadStaffAccounts,
  authenticateStaffCredentials
} from '../utils/staffAuthService';

interface AdminLoginProps {
  onLoginSuccess: (session: UserSession) => void;
  staffAccounts?: StaffAccount[];
  onStaffLoginRecorded?: (staffId: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  staffAccounts: propStaffAccounts,
  onStaffLoginRecorded
}) => {
  const [loginMode, setLoginMode] = useState<'department' | 'admin'>('department');

  const availableStaffAccounts = React.useMemo(
    () => (propStaffAccounts && propStaffAccounts.length > 0 ? propStaffAccounts : loadStaffAccounts()),
    [propStaffAccounts]
  );

  // Department Staff Login State (Staff ID / Staff Name + Staff Password)
  const [selectedDeptCode, setSelectedDeptCode] = useState<DepartmentCode>('AI&DS');
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [deptPassword, setDeptPassword] = useState('');
  const [showDeptPassword, setShowDeptPassword] = useState(false);

  // Admin Login State
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Feedback State
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedDeptMeta = INITIAL_DEPARTMENT_CUSTOMIZATIONS[selectedDeptCode] || {
    name: 'Artificial Intelligence & Data Science',
    hodName: 'Head of Department (AI&DS)',
    regulation: 'Regulation R-2021 Autonomous (CBCS)'
  };

  // Handle Staff Login (Strictly isolated per Staff ID & Password)
  const handleDepartmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(async () => {
      const auth = authenticateStaffCredentials(
        availableStaffAccounts,
        staffIdentifier,
        deptPassword
      );

      if (auth.success) {
        const acc = auth.account;
        const session: UserSession = {
          username: acc.staffId,
          fullName: acc.staffName,
          role: 'Department Staff Portal',
          designation: `${acc.designation} • Department of AI&DS`,
          loginTime: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }),
          token: `VSB-STAFF-${acc.staffId}-${Date.now()}`,
          department: acc.department,
          isAdmin: false,
          staffId: acc.staffId,
          staffName: acc.staffName
        };

        if (onStaffLoginRecorded) {
          onStaffLoginRecorded(acc.staffId);
        }

        recordLoginSessionToMongo(session).catch((err) => {
          console.warn('[MongoDB Session Log]:', err);
        });

        localStorage.setItem('vsbec_auth_user', JSON.stringify(session));
        onLoginSuccess(session);
      } else {
        setErrorMessage('error' in auth ? auth.error : 'Invalid Staff ID / Name or Password.');
      }
      setIsLoading(false);
    }, 350);
  };

  // Handle COE Admin Login
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(async () => {
      const cleanUser = adminUsername.trim().toLowerCase();
      const cleanPass = adminPassword.trim();

      if (
        (cleanUser === 'admin' || cleanUser === 'vsbec exam control' || cleanUser === 'coe admin') &&
        (cleanPass === 'admin@123' || cleanPass === 'vsbec@2027')
      ) {
        const session: UserSession = {
          username: 'admin',
          fullName: 'COE Super Administrator',
          role: 'Autonomous Exam Administrator',
          designation: 'Office of the Controller of Examinations',
          loginTime: new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }),
          token: `VSB-COE-ADMIN-${Date.now()}`,
          department: 'ALL',
          isAdmin: true
        };

        recordLoginSessionToMongo(session).catch((err) => {
          console.warn('[MongoDB Session Log]:', err);
        });

        localStorage.setItem('vsbec_auth_user', JSON.stringify(session));
        onLoginSuccess(session);
      } else {
        setErrorMessage('Invalid Administrator Credentials. Verify your Admin username and password.');
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between bg-[#FAF7F2] text-slate-900 relative overflow-hidden font-sans bg-cover bg-center"
      style={{ backgroundImage: "url('/edu-campus-bg.svg')" }}
    >
      {/* Soft Cream Translucent Wash Over Education Illustration */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF7F2]/60 via-[#FAF7F2]/35 to-[#F4EDE0]/75 pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[280px] bg-gradient-to-b from-amber-200/30 via-[#781717]/10 to-transparent blur-3xl pointer-events-none" />

      {/* Top Institutional Banner (Light Cream Parchment) */}
      <header className="w-full px-4 sm:px-6 py-3.5 border-b border-[#E5DEC9] bg-[#FFFDF9]/90 backdrop-blur-md z-10 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <OfficialEmblem size="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black text-[#781717] tracking-wide truncate">
                  V.S.B. ENGINEERING COLLEGE, KARUR
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-extrabold uppercase shrink-0">
                  Autonomous
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium truncate">
                Affiliated to Anna University · Accredited by NAAC &apos;A++&apos; Grade · Karur - 639 111
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-[#781717] bg-[#FAF4E8] border border-[#E2D5BA] px-3.5 py-1.5 rounded-full shadow-2xs shrink-0">
            <GraduationCap className="w-4 h-4 text-amber-700" />
            <span>Autonomous Examination Cell</span>
          </div>
        </div>
      </header>

      {/* Main Centered Light/Cream Login Card */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 z-10 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22 }}
          className="w-full max-w-lg bg-[#FFFDF9]/95 border border-[#E2D8C5] shadow-[0_24px_60px_-15px_rgba(120,23,23,0.14)] rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden"
        >
          {/* Institutional Maroon & Amber Accent Strip */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#781717] via-amber-500 to-[#781717]" />

          {/* Crest & Portal Heading */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-[#FAF7F2] p-2 shadow-sm ring-2 ring-[#E2D5BA] flex items-center justify-center mb-3">
              <OfficialEmblem size="lg" className="w-full h-full justify-center items-center" />
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-[#781717] tracking-tight">
              Autonomous Exam Portal
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-semibold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
              <span>Office of the Controller of Examinations</span>
            </p>
          </div>

          {/* Role Switcher Tabs (Cream / Maroon) */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#F4EFE6] border border-[#E5DEC9] rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => {
                setLoginMode('department');
                setErrorMessage('');
              }}
              className={`min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                loginMode === 'department'
                  ? 'bg-[#781717] text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <Building2
                className={`w-4 h-4 ${loginMode === 'department' ? 'text-amber-300' : 'text-[#781717]'}`}
              />
              <span>Department Portal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginMode('admin');
                setErrorMessage('');
              }}
              className={`min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                loginMode === 'admin'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
              }`}
            >
              <ShieldCheck
                className={`w-4 h-4 ${loginMode === 'admin' ? 'text-amber-100' : 'text-amber-700'}`}
              />
              <span>COE Central Admin</span>
            </button>
          </div>

          {/* Error Message Alert */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5 shadow-2xs"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-semibold">{errorMessage}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ========================================================
              TAB 1: DEPARTMENT STAFF PORTAL
             ======================================================== */}
          {loginMode === 'department' && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
            >
              <form onSubmit={handleDepartmentSubmit} className="space-y-4">
                {/* Department Header Badge */}
                <div className="p-3 rounded-2xl bg-[#FAF4E8] border border-[#E5DEC9] flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#781717] flex items-center justify-center font-black text-amber-300 text-xs shrink-0 shadow-xs">
                      {selectedDeptCode}
                    </div>
                    <div className="min-w-0">
                      <span className="font-black text-slate-900 block truncate">
                        {selectedDeptMeta.name}
                      </span>
                      <span className="text-[11px] text-slate-600 block truncate">
                        Separate Staff Portal · Isolated Faculty Workspace
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold shrink-0">
                    Staff Scoped
                  </span>
                </div>

                {/* Staff ID or Staff Name Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#781717]" />
                      Staff ID or Staff Name
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono font-semibold">
                      Issued by COE Admin
                    </span>
                  </div>

                  <input
                    type="text"
                    required
                    value={staffIdentifier}
                    onChange={(e) => setStaffIdentifier(e.target.value)}
                    placeholder="Enter your Staff ID or Full Name"
                    className="w-full bg-white border border-[#D8CEBC] rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#781717]/30 focus:border-[#781717] transition-all font-medium"
                  />
                </div>

                {availableStaffAccounts.filter((a) => a.isActive).length === 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
                    No staff accounts created yet. Sign in via <strong>COE Central Admin</strong> to create or upload official staff accounts.
                  </div>
                )}

                {/* Staff Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#781717]" />
                      Staff Personal Password
                    </label>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Assigned by COE Admin
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type={showDeptPassword ? 'text' : 'password'}
                      required
                      value={deptPassword}
                      onChange={(e) => setDeptPassword(e.target.value)}
                      placeholder="Enter password created by Admin"
                      className="w-full bg-white border border-[#D8CEBC] rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#781717]/30 focus:border-[#781717] transition-all pr-11 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeptPassword(!showDeptPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 p-1 cursor-pointer"
                      aria-label={showDeptPassword ? 'Hide password' : 'Show password'}
                    >
                      {showDeptPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Department Staff Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 min-h-[48px] bg-gradient-to-r from-[#781717] via-[#8d1d1d] to-[#9a2828] hover:from-[#641212] hover:to-[#781717] text-white font-extrabold text-sm py-3.5 px-6 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2 font-bold">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Opening Isolated Staff Portal...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 font-bold">
                      <Lock className="w-4 h-4 text-amber-300" />
                      <span>Enter My Staff Portal ({selectedDeptCode})</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </button>

                {/* Scope Shield Notice */}
                <div className="pt-1 text-center">
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Strict Staff Isolation: Answer sheets, mark statements, and answer keys remain privately scoped under your{' '}
                    <span className="text-[#781717] font-bold">Staff ID</span>.
                  </p>
                </div>
              </form>
            </motion.div>
          )}

          {/* ========================================================
              TAB 2: COE CENTRAL SUPER ADMIN LOGIN
             ======================================================== */}
          {loginMode === 'admin' && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
            >
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <span className="font-bold text-[#781717]">Central COE Administrator:</span> Full authority over AI&amp;DS Staff Account creation, Answer Sheet scanning vaults, Mark Statements, and Teacher Allocations.
                  </p>
                </div>

                {/* Admin Username Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 tracking-wide flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-700" />
                    Admin Username
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full bg-white border border-[#D8CEBC] rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-700 transition-all font-medium"
                  />
                </div>

                {/* Admin Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                      Admin Secret Password
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter administrator password"
                      className="w-full bg-white border border-[#D8CEBC] rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-700 transition-all pr-11 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 p-1 cursor-pointer"
                      aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Admin Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 min-h-[48px] bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-sm py-3.5 px-6 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2 font-bold">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating Super Admin Console...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 font-black">
                      <ShieldCheck className="w-4 h-4 text-amber-100" />
                      <span>Authenticate COE Central Admin</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </button>

                <div className="pt-1 text-center">
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Admin Privileges: Authenticated administrators manage{' '}
                    <span className="text-[#781717] font-bold">Staff Credentials</span> and{' '}
                    <span className="text-[#781717] font-bold">Teacher Class Allocation</span>.
                  </p>
                </div>
              </form>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Bottom Institutional Academic Footer Strip */}
      <footer className="w-full px-4 py-3 text-center text-[11px] text-slate-600 font-medium z-10 border-t border-[#E5DEC9]/80 bg-[#FFFDF9]/80 backdrop-blur-xs">
        V.S.B. Engineering College (Autonomous) · Internal &amp; End Semester Examination Valuation System
      </footer>
    </div>
  );
};
