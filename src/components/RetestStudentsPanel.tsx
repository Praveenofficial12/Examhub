import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileText,
  Search,
  CheckCircle2,
  UserX
} from 'lucide-react';
import {
  RetestStudentEntry,
  exportRetestListToExcel,
  exportRetestListToPdf
} from '../utils/retestHelper';

interface RetestStudentsPanelProps {
  entries: RetestStudentEntry[];
  totalEvaluatedCount: number;
  title?: string;
  subtitle?: string;
  emptyActionHint?: string;
}

export const RetestStudentsPanel: React.FC<RetestStudentsPanelProps> = ({
  entries,
  totalEvaluatedCount,
  title = 'Retest Attending Students List',
  subtitle = 'Automatic threshold: < 30 marks out of 50 (or < 60 marks out of 100)',
  emptyActionHint = 'Scan answer sheets or upload completed mark Excel files to view students below the pass cutoff.'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('ALL');

  const subjectOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.subjectCode).filter(Boolean))),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return entries.filter((e) => {
      if (subjectFilter !== 'ALL' && e.subjectCode !== subjectFilter) return false;
      if (q) {
        return (
          e.registerNo.toLowerCase().includes(q) ||
          e.studentName.toLowerCase().includes(q) ||
          e.subjectCode.toLowerCase().includes(q) ||
          e.subjectName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, searchTerm, subjectFilter]);

  const passedCount = Math.max(0, totalEvaluatedCount - entries.length);

  return (
    <div className="bg-white rounded-3xl border border-rose-200 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="px-5 py-4 bg-gradient-to-r from-rose-50 via-amber-50/40 to-white border-b border-rose-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-2xl bg-rose-700 text-white flex items-center justify-center shrink-0 shadow-xs">
            <UserX className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900">{title}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-900 text-[11px] font-black tabular-nums">
                {entries.length} Retest Candidate{entries.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 font-medium">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={filteredEntries.length === 0}
            onClick={() =>
              exportRetestListToExcel(filteredEntries, 'Retest_Attending_Students_List')
            }
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export Retest (.XLSX)</span>
          </button>

          <button
            type="button"
            disabled={filteredEntries.length === 0}
            onClick={() =>
              exportRetestListToPdf(filteredEntries, 'Retest Attending Students List')
            }
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#781717] hover:bg-[#5e1111] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Download Retest (.PDF)</span>
          </button>
        </div>
      </div>

      {/* Criteria & Summary Bar */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 tabular-nums">
            Total Evaluated: {totalEvaluatedCount}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-bold text-emerald-800 tabular-nums">
            Passed (&ge;30/50 or &ge;60/100): {passedCount}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 font-black text-rose-800 tabular-nums">
            Retest List (&lt;30/50 or &lt;60/100): {entries.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subjectOptions.length > 1 && (
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 cursor-pointer"
            >
              <option value="ALL">All Subjects</option>
              {subjectOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          )}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search RegNo or Name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[55vh]">
        {totalEvaluatedCount === 0 ? (
          <div className="py-10 px-6 text-center text-slate-500 text-xs">
            <AlertTriangle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No marks evaluated or uploaded yet.</p>
            <p className="mt-1 text-[11px]">{emptyActionHint}</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-10 px-6 text-center text-emerald-700 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="font-black text-sm">
              Zero Retest Students — All {totalEvaluatedCount} evaluated candidates passed!
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Every candidate scored at least 30/50 (for 50M) or 60/100 (for 100M).
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 uppercase font-mono text-[10px] border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 text-center">S.No</th>
                <th className="py-2.5 px-3">Register No</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3 text-center">Class</th>
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3 text-center">Scored / Max</th>
                <th className="py-2.5 px-3 text-center">Pass Cutoff</th>
                <th className="py-2.5 px-3 text-center">Shortfall</th>
                <th className="py-2.5 px-3 text-center">Action Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredEntries.map((item, idx) => (
                <tr key={item.id} className="hover:bg-rose-50/40 transition-colors">
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-black text-[#781717]">
                    {item.registerNo}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{item.studentName}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                    {item.year !== '-' ? `Yr ${item.year}` : item.department}
                    {item.section !== '-' ? `-${item.section}` : ''}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-slate-800">{item.subjectCode}</span>
                    <span className="block text-[10px] text-slate-500 truncate max-w-[200px]">
                      {item.subjectName}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-black text-rose-700 tabular-nums">
                    {item.marksObtained} / {item.maxMarks}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 tabular-nums">
                    {item.passMark}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600 tabular-nums">
                    -{item.deficit}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-900 text-[10px] font-black uppercase whitespace-nowrap">
                      Retest Attending
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
