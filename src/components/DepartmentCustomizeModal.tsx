import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Sliders,
  Building,
  UserCheck,
  Award,
  BookOpen,
  FlaskConical,
  KeyRound,
  Bell,
  Save,
  CheckCircle2,
  Plus,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DepartmentCustomization, DepartmentCode } from '../types';

interface DepartmentCustomizeModalProps {
  deptCode: DepartmentCode;
  config: DepartmentCustomization;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedConfig: DepartmentCustomization) => void;
}

export const DepartmentCustomizeModal: React.FC<DepartmentCustomizeModalProps> = ({
  deptCode,
  config,
  isOpen,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'leadership' | 'academics' | 'labs' | 'notice'>('general');
  const [formData, setFormData] = useState<DepartmentCustomization>(config);
  const [newSpecTag, setNewSpecTag] = useState('');
  const [newLabTag, setNewLabTag] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({ ...config });
      setSavedSuccess(false);
    }
  }, [config, isOpen]);

  if (!isOpen || !formData) return null;

  const handleAddSpec = () => {
    if (newSpecTag.trim()) {
      setFormData({
        ...formData,
        specializations: [...formData.specializations, newSpecTag.trim()]
      });
      setNewSpecTag('');
    }
  };

  const handleRemoveSpec = (index: number) => {
    setFormData({
      ...formData,
      specializations: formData.specializations.filter((_, idx) => idx !== index)
    });
  };

  const handleAddLab = () => {
    if (newLabTag.trim()) {
      setFormData({
        ...formData,
        keyLabs: [...formData.keyLabs, newLabTag.trim()]
      });
      setNewLabTag('');
    }
  };

  const handleRemoveLab = (index: number) => {
    setFormData({
      ...formData,
      keyLabs: formData.keyLabs.filter((_, idx) => idx !== index)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSavedSuccess(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    setTimeout(() => {
      onClose();
      setSavedSuccess(false);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative my-6 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#781717]/10 text-[#781717]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Department Customization • {formData.name} ({deptCode})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Configure HOD, contact info, vision/mission, regulation, labs & security passkey
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 pt-3 pb-3 border-b border-slate-100 overflow-x-auto shrink-0">
          {[
            { id: 'general', label: '1. Department Overview', icon: Building },
            { id: 'leadership', label: '2. HOD & Leadership', icon: UserCheck },
            { id: 'academics', label: '3. Accreditation & Intake', icon: Award },
            { id: 'labs', label: '4. Labs & Thrust Areas', icon: FlaskConical },
            { id: 'notice', label: '5. Notice & Security', icon: Bell }
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-[#781717] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Department Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Degree Program Title
                  </label>
                  <input
                    type="text"
                    value={formData.degreeTitle}
                    onChange={(e) => setFormData({ ...formData, degreeTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Department Vision Statement
                </label>
                <textarea
                  rows={2}
                  value={formData.vision}
                  onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Department Mission Statements
                </label>
                <textarea
                  rows={3}
                  value={formData.mission}
                  onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'leadership' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Head of Department (HOD) Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hodName}
                    onChange={(e) => setFormData({ ...formData, hodName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Academic Qualifications & Titles
                  </label>
                  <input
                    type="text"
                    value={formData.hodQualification}
                    onChange={(e) => setFormData({ ...formData, hodQualification: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    HOD Email
                  </label>
                  <input
                    type="email"
                    value={formData.hodEmail}
                    onChange={(e) => setFormData({ ...formData, hodEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    HOD Contact / Intercom
                  </label>
                  <input
                    type="text"
                    value={formData.hodPhone}
                    onChange={(e) => setFormData({ ...formData, hodPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Office / Cabin Location
                  </label>
                  <input
                    type="text"
                    value={formData.hodCabin}
                    onChange={(e) => setFormData({ ...formData, hodCabin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Board of Studies (BOS) Chairperson Title
                </label>
                <input
                  type="text"
                  value={formData.syllabusBOSChair || ''}
                  onChange={(e) => setFormData({ ...formData, syllabusBOSChair: e.target.value })}
                  placeholder="Enter HOD Name & Title (Chairperson, BOS)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                />
              </div>
            </div>
          )}

          {activeTab === 'academics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Autonomous Curriculum Regulation
                  </label>
                  <input
                    type="text"
                    value={formData.regulation}
                    onChange={(e) => setFormData({ ...formData, regulation: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    NAAC Accreditation Grade
                  </label>
                  <input
                    type="text"
                    value={formData.naacGrade}
                    onChange={(e) => setFormData({ ...formData, naacGrade: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Established Year
                  </label>
                  <input
                    type="number"
                    value={formData.establishedYear}
                    onChange={(e) => setFormData({ ...formData, establishedYear: parseInt(e.target.value) || 2002 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Sanctioned Intake
                  </label>
                  <input
                    type="number"
                    value={formData.sanctionedIntake}
                    onChange={(e) => setFormData({ ...formData, sanctionedIntake: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Faculty Count
                  </label>
                  <input
                    type="number"
                    value={formData.facultyCount}
                    onChange={(e) => setFormData({ ...formData, facultyCount: parseInt(e.target.value) || 12 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                    Dedicated Labs
                  </label>
                  <input
                    type="number"
                    value={formData.labsCount}
                    onChange={(e) => setFormData({ ...formData, labsCount: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="nbaCheck"
                  checked={formData.nbaAccredited}
                  onChange={(e) => setFormData({ ...formData, nbaAccredited: e.target.checked })}
                  className="w-4 h-4 text-[#781717] rounded border-slate-300 cursor-pointer"
                />
                <label htmlFor="nbaCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  NBA Accredited Tier-1 Status Certified
                </label>
              </div>
            </div>
          )}

          {activeTab === 'labs' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Core Specialization Areas & Thrust Domains
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.specializations.map((spec, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold"
                    >
                      <span>{spec}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(idx)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add new domain (e.g. Cognitive Vision)"
                    value={newSpecTag}
                    onChange={(e) => setNewSpecTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSpec();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSpec}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Key Research Centers & Specialized Laboratories
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.keyLabs.map((lab, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold"
                    >
                      <span>{lab}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLab(idx)}
                        className="text-amber-600 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add lab (e.g. High Performance Computing Lab)"
                    value={newLabTag}
                    onChange={(e) => setNewLabTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLab();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddLab}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                  >
                    Add Lab
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notice' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Department Announcement Banner Notice
                </label>
                <textarea
                  rows={2}
                  value={formData.departmentNotice || ''}
                  onChange={(e) => setFormData({ ...formData, departmentNotice: e.target.value })}
                  placeholder="Official notice displayed at top of department portal..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1">
                  Department Edit Password (Custom Passkey)
                </label>
                <input
                  type="text"
                  value={formData.customPassword || `edit@${formData.alias}`}
                  onChange={(e) => setFormData({ ...formData, customPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Default format is <span className="font-mono text-slate-600">edit@{formData.alias}</span>. You may customize it anytime.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
          <div>
            {savedSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Department settings saved successfully!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#781717] hover:bg-[#601212] text-white font-black text-xs shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Department Customization</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
