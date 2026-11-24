import React from 'react';
import { Menu, LogOut } from 'lucide-react';
import { OfficialEmblem } from './OfficialEmblem';
import { UserSession } from '../types';

interface TopHeaderProps {
  onToggleMobileSidebar: () => void;
  session: UserSession;
  onLogout?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleMobileSidebar,
  session,
  onLogout
}) => {
  const activeStaffId = session.isAdmin ? session.adminInspectingStaffId : session.staffId;
  const activeStaffName = session.isAdmin
    ? (session.adminInspectingStaffId ? session.staffName || session.adminInspectingStaffId : null)
    : (session.staffName || session.fullName);

  return (
    <header className="no-print w-full bg-white border-b border-slate-200/80 shadow-xs sticky top-0 z-30 min-w-0">
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-3 min-w-0">
        {/* Left Title with Red Vertical Accent Line & Emblem */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          {/* Mobile Menu Button - 44px accessible touch target */}
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer shrink-0 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Small Screen Emblem */}
          <div className="lg:hidden flex items-center shrink-0">
            <OfficialEmblem size="sm" />
          </div>

          {/* Red Vertical Bar */}
          <div className="hidden sm:block w-1.5 h-9 bg-[#781717] rounded-full shrink-0" />

          {/* Institution Title */}
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs sm:text-base md:text-lg font-black text-slate-900 tracking-tight leading-tight truncate sm:whitespace-normal">
              V.S.B. ENGINEERING COLLEGE (AUTONOMOUS)
            </h1>
            <p className="text-[9px] sm:text-[10.5px] font-extrabold uppercase tracking-widest text-slate-500 mt-0.5 truncate">
              OFFICE OF THE CONTROLLER OF EXAMINATIONS
            </p>
          </div>
        </div>

        {/* Right Status & Profile Badges */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* SYSTEM OPERATIONAL Pill */}
          <div className="hidden xl:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            <span className="tracking-wide">
              {activeStaffId ? 'ISOLATED STAFF PORTAL' : 'OPERATIONAL'}
            </span>
          </div>

          {/* Staff / COE Admin Pill */}
          <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200 text-slate-800 shadow-xs">
            <div className="w-7 h-7 rounded-full bg-[#781717] flex items-center justify-center text-amber-300 text-[10px] font-black shadow-xs shrink-0">
              {activeStaffId ? 'STF' : 'AIDS'}
            </div>
            <div className="hidden md:flex flex-col text-left pr-1">
              <span className="text-xs font-bold text-slate-900 leading-tight max-w-[175px] truncate">
                {activeStaffName || (session.isAdmin ? 'COE Admin • AI&DS' : 'Dept. of AI & DS')}
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-semibold leading-none mt-0.5">
                {activeStaffId || 'Artificial Intelligence & Data Science'}
              </span>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Switch Account / Sign Out"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-[#781717] text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Switch / Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
