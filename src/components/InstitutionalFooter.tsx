import React from 'react';
import { ShieldCheck, Award, GraduationCap, Sparkles, Code2 } from 'lucide-react';

export const InstitutionalFooter: React.FC = () => {
  return (
    <footer className="no-print w-full bg-white border-t border-slate-200/90 py-4 px-4 sm:px-8 mt-auto text-slate-600">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-xs">
        
        {/* Left: Institutional Name */}
        <div className="font-extrabold text-slate-700 tracking-wide">
          <span>VSB ENGINEERING COLLEGE (AUTONOMOUS), KARUR - 639 111</span>
          <span className="mx-2 text-slate-400">•</span>
          <span className="text-slate-900">OFFICE OF THE CONTROLLER OF EXAMINATIONS</span>
        </div>

        {/* Right: Institutional Credentials */}
        <div className="flex items-center gap-2 text-slate-500 font-semibold text-[11px]">
          <span>Affiliated to Anna University • Accredited by NAAC 'A++' Grade</span>
        </div>

      </div>
    </footer>
  );
};
