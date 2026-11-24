import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  QrCode,
  MessageSquareShare,
  FileCheck,
  KeyRound,
  Users,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Bell,
  Clock,
  ExternalLink,
  Upload
} from 'lucide-react';
import { OfficialEmblem } from './OfficialEmblem';
import { UserSession } from '../types';

export type ActiveTab =
  | 'dashboard'
  | 'staff-accounts'
  | 'upload-marks'
  | 'answer-sheets'
  | 'sms'
  | 'marks'
  | 'answer-keys'
  | 'students'
  | 'allocations'
  | 'patent-docs';

interface HeaderNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  session: UserSession;
  onLogout: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeTab,
  setActiveTab,
  session,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) +
          ' | ' +
          now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = !!session?.isAdmin;

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: 'Live',
      accentColor: 'text-amber-400 border-amber-500'
    },
    ...(isAdmin
      ? [
          {
            id: 'allocations' as ActiveTab,
            label: 'Teacher Allocations',
            icon: Users,
            badge: 'Admin Only',
            accentColor: 'text-amber-400 border-amber-500'
          }
        ]
      : []),
    {
      id: 'upload-marks' as ActiveTab,
      label: 'Upload Marks',
      icon: Upload,
      badge: 'Excel Sync',
      accentColor: 'text-amber-400 border-amber-500'
    },
    {
      id: 'marks' as ActiveTab,
      label: 'Mark Statement Generator',
      icon: FileSpreadsheet,
      badge: 'R-2021',
      accentColor: 'text-amber-400 border-amber-500'
    },
    {
      id: 'answer-sheets' as ActiveTab,
      label: 'Answer Sheet Mapping',
      icon: QrCode,
      badge: '99.8%',
      accentColor: 'text-indigo-400 border-indigo-500'
    },
    {
      id: 'sms' as ActiveTab,
      label: 'SMS Automation',
      icon: MessageSquareShare,
      badge: 'DLT Gate',
      accentColor: 'text-emerald-400 border-emerald-500'
    },
    {
      id: 'answer-keys' as ActiveTab,
      label: 'Answer Key Rubrics',
      icon: KeyRound,
      badge: 'Schemes',
      accentColor: 'text-purple-400 border-purple-500'
    },
    {
      id: 'students' as ActiveTab,
      label: 'Students Registry',
      icon: Users,
      badge: 'Roster',
      accentColor: 'text-sky-400 border-sky-500'
    }
  ];

  return (
    <header className="w-full sticky top-0 z-40 bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-xl shadow-xl">
      {/* Top institution bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-slate-900/90 text-xs">
        
        {/* Left emblem & title */}
        <div className="flex items-center gap-3">
          <OfficialEmblem size="sm" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white tracking-wide text-xs sm:text-sm">
                V.S.B. ENGINEERING COLLEGE
              </span>
              <span className="hidden sm:inline-block px-2 py-0.2 text-[10px] uppercase font-bold tracking-wider rounded bg-red-950 text-red-300 border border-red-800">
                Autonomous
              </span>
            </div>
            <span className="text-[11px] text-amber-400 font-medium">
              Office of the Controller of Examinations (COE) • Karur - 639 111
            </span>
          </div>
        </div>

        {/* Right Session info & live time */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Developed By Department of AI&DS Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 font-bold text-[11px] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>AI & DS • Batch 2023 - 2027</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-slate-300 font-mono text-[11px] bg-slate-900 px-3 py-1 rounded-full border border-slate-800 font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentTime}</span>
          </div>

          {/* Admin profile pill */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-full py-1 px-2.5 sm:px-3 text-slate-200 shadow-inner">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-600 to-red-700 flex items-center justify-center font-black text-white text-xs shadow">
              COE
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold leading-tight text-white flex items-center gap-1">
                Admin COE
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              </span>
              <span className="text-[10px] text-amber-300/80 leading-tight font-medium">Exam Controller</span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title="Sign out of COE Session"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-950/70 hover:bg-red-900/80 border border-red-700/60 text-red-200 text-xs font-semibold transition-all hover:text-white shadow-sm cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Desktop Navigation Bar */}
      <nav className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between overflow-x-auto scrollbar-none py-1.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? item.accentColor.split(' ')[0] : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold ${
                        isActive
                          ? 'bg-slate-900 text-slate-200 border border-slate-700'
                          : 'bg-slate-900/50 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <div
                      className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full ${
                        item.id === 'answer-sheets'
                          ? 'bg-indigo-500'
                          : item.id === 'sms'
                          ? 'bg-emerald-500'
                          : item.id === 'marks'
                          ? 'bg-amber-500'
                          : item.id === 'answer-keys'
                          ? 'bg-purple-500'
                          : item.id === 'students'
                          ? 'bg-sky-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-800/40 whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>Autonomous Server Active</span>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:bg-slate-900 text-left'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
