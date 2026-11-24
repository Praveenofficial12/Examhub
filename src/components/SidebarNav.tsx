import React from 'react';
import {
  LayoutDashboard,
  QrCode,
  MessageSquareShare,
  FileSpreadsheet,
  KeyRound,
  Users,
  ShieldCheck,
  LogOut,
  Sparkles,
  Code2,
  X
} from 'lucide-react';
import { OfficialEmblem } from './OfficialEmblem';
import { ActiveTab } from './HeaderNav';
import { UserSession } from '../types';

interface SidebarNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  session: UserSession;
  onLogout: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  session,
  onLogout,
  mobileOpen = false,
  onCloseMobile
}) => {
  const isAdmin = !!session.isAdmin;
  const activeStaffId = session.isAdmin ? session.adminInspectingStaffId : session.staffId;
  const activeStaffName = session.isAdmin
    ? (session.adminInspectingStaffId ? session.staffName || session.adminInspectingStaffId : null)
    : (session.staffName || session.fullName);

  // The side names are consistent across department staff & admin portals
  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      prefix: '',
      title: 'Dashboard',
      isDashboard: true
    },
    ...(isAdmin
      ? [
          {
            id: 'staff-accounts' as ActiveTab,
            prefix: '01',
            title: 'Staff IDs & Passwords',
            badge: 'Admin Only'
          },
          {
            id: 'allocations' as ActiveTab,
            prefix: '02',
            title: 'Teacher Allocations',
            badge: 'Admin Only'
          }
        ]
      : []),
    {
      id: 'upload-marks' as ActiveTab,
      prefix: isAdmin ? '03' : '01',
      title: 'Upload Marks',
      badge: 'Excel Sync'
    },
    {
      id: 'marks' as ActiveTab,
      prefix: isAdmin ? '04' : '02',
      title: 'Mark Statement Generator'
    },
    {
      id: 'answer-sheets' as ActiveTab,
      prefix: isAdmin ? '05' : '03',
      title: 'Answer Sheet Mapping'
    },
    {
      id: 'sms' as ActiveTab,
      prefix: isAdmin ? '06' : '04',
      title: 'SMS Automation'
    },
    {
      id: 'answer-keys' as ActiveTab,
      prefix: isAdmin ? '07' : '05',
      title: 'Answer Key Generator',
      badge: 'AI Word'
    },
    {
      id: 'students' as ActiveTab,
      prefix: isAdmin ? '08' : '06',
      title: 'Student Registry'
    },
    {
      id: 'patent-docs' as ActiveTab,
      prefix: isAdmin ? '09' : '07',
      title: 'Patent & IP Docs',
      badge: 'IPR / Claims'
    }
  ];

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={`no-print fixed inset-y-0 left-0 z-50 w-64 max-w-[82vw] bg-[#781717] text-white flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Mobile Close Button */}
      {onCloseMobile && (
        <button
          onClick={onCloseMobile}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-xl bg-black/20 hover:bg-black/35 text-white transition-colors z-20 cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Top Section: Logo & Branding */}
      <div className="pt-7 pb-5 px-6 flex flex-col items-center justify-center text-center relative">
        {/* Centered Flex-based Alignment Container for Logo */}
        <div className="w-full flex items-center justify-center mb-3.5">
          <div className="w-24 h-24 sm:w-28 sm:h-28 aspect-square flex items-center justify-center rounded-2xl bg-white p-2 shadow-xl ring-2 ring-amber-400/80 shrink-0 overflow-hidden transition-transform duration-300 hover:scale-105">
            <OfficialEmblem size="lg" className="w-full h-full flex items-center justify-center" />
          </div>
        </div>

        {/* Title & Subtitle - Identical for both Admin and Department side */}
        <h1 className="text-lg sm:text-xl font-black tracking-wider text-white uppercase font-sans">
          CONTROL CENTER
        </h1>
        <p className="text-[10px] sm:text-[11px] font-extrabold tracking-widest text-amber-300 uppercase mt-0.5">
          AUTONOMOUS DIVISION
        </p>
      </div>

      {/* Navigation Items List */}
      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#5a1010] text-white shadow-inner ring-1 ring-amber-400/40'
                  : 'text-rose-100/80 hover:bg-[#8e1d1d] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                {item.isDashboard ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-sm" />
                ) : (
                  <span className="text-xs font-mono font-bold text-amber-300/80 w-5 shrink-0">
                    {item.prefix}
                  </span>
                )}
                <span className="truncate">{item.title}</span>
              </div>
              {('badge' in item) && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-red-950 font-black tracking-wide uppercase shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section: Active Session & Developer Badge */}
      <div className="p-4 border-t border-red-900/60 bg-[#651212]/90 space-y-2.5">
        {/* Department / Staff / Admin Scope Badge */}
        <div className="w-full bg-[#460909] border border-amber-500/30 rounded-2xl px-3 py-2 text-center">
          <div className="text-[10px] uppercase font-mono tracking-wider text-amber-300 font-bold truncate">
            {activeStaffId
              ? `${session.isAdmin ? '👁 Admin → ' : '🔒 '}${activeStaffId}`
              : session.isAdmin
              ? '👑 COE Admin • AI&DS'
              : '🔒 Department of AI&DS'}
          </div>
          <div className="text-[10px] text-rose-200 truncate font-semibold mt-0.5">
            {activeStaffName || (session.isAdmin ? 'B.Tech AI & DS Autonomous Control' : 'Department Staff Portal')}
          </div>
        </div>

        {/* Active Session Card with Live Date */}
        <div className="w-full bg-[#520d0d] border border-red-800/80 rounded-2xl px-3.5 py-2.5 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full h-2 w-2 bg-emerald-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-200 whitespace-nowrap">
              ACTIVE SESSION
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-300 font-bold tabular-nums whitespace-nowrap">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
          </span>
        </div>

        {/* Logout / Switch Staff Trigger */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 text-xs font-bold text-rose-200 hover:text-white bg-[#520d0d]/70 hover:bg-[#781717] py-2 rounded-xl border border-red-800/60 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-amber-300" />
          <span>Switch Staff / Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
