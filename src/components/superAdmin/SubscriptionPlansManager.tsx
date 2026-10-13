import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Check,
  Edit,
  Trash2,
  DollarSign,
  Users,
  BookOpen,
  HardDrive,
  Sparkles,
  X,
  Save,
} from 'lucide-react';
import { SubscriptionPlan } from '../../types/saas';
import { saasStorage } from '../../services/storage';

export const SubscriptionPlansManager: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => saasStorage.getPlans());
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState<any>('basic');
  const [formDesc, setFormDesc] = useState('');
  const [formMonthly, setFormMonthly] = useState(49);
  const [formAnnual, setFormAnnual] = useState(490);
  const [formTrialDays, setFormTrialDays] = useState(0);
  const [formMaxTitles, setFormMaxTitles] = useState(5000);
  const [formMaxCopies, setFormMaxCopies] = useState(12000);
  const [formMaxLibrarians, setFormMaxLibrarians] = useState(4);
  const [formMaxStudents, setFormMaxStudents] = useState(1000);
  const [formStorageGb, setFormStorageGb] = useState(10);
  const [formFeatures, setFormFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState('');

  const refreshPlans = () => {
    setPlans(saasStorage.getPlans());
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setIsCreatingNew(false);
    setFormName(plan.name);
    setFormCode(plan.code);
    setFormDesc(plan.description);
    setFormMonthly(plan.priceMonthly);
    setFormAnnual(plan.priceAnnual);
    setFormTrialDays(plan.trialDays);
    setFormMaxTitles(plan.maxTitles);
    setFormMaxCopies(plan.maxCopies);
    setFormMaxLibrarians(plan.maxLibrarians);
    setFormMaxStudents(plan.maxStudents);
    setFormStorageGb(plan.storageGb ?? Math.max(1, Math.round((plan.storageMb || 1024) / 1024)));
    setFormFeatures([...plan.features]);
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setIsCreatingNew(true);
    setFormName('');
    setFormCode('standard');
    setFormDesc('');
    setFormMonthly(79);
    setFormAnnual(790);
    setFormTrialDays(0);
    setFormMaxTitles(10000);
    setFormMaxCopies(25000);
    setFormMaxLibrarians(6);
    setFormMaxStudents(2000);
    setFormStorageGb(25);
    setFormFeatures([
      'Core Catalogue Management',
      'Barcode Scanning Support',
      'Student Search Portal',
      'Email Overdue Alerts',
    ]);
  };

  const handleSave = () => {
    if (!formName.trim()) return;

    if (isCreatingNew) {
      saasStorage.createPlan({
        name: formName,
        code: formCode,
        description: formDesc,
        priceMonthly: formMonthly,
        priceAnnual: formAnnual,
        trialDays: formTrialDays,
        maxTitles: formMaxTitles,
        maxCopies: formMaxCopies,
        maxLibrarians: formMaxLibrarians,
        maxStudents: formMaxStudents,
        storageMb: formStorageGb * 1024,
        storageGb: formStorageGb,
        features: formFeatures,
        isActive: true,
      });
    } else if (editingPlan) {
      saasStorage.updatePlan(editingPlan.id, {
        name: formName,
        code: formCode,
        description: formDesc,
        priceMonthly: formMonthly,
        priceAnnual: formAnnual,
        trialDays: formTrialDays,
        maxTitles: formMaxTitles,
        maxCopies: formMaxCopies,
        maxLibrarians: formMaxLibrarians,
        maxStudents: formMaxStudents,
        storageMb: formStorageGb * 1024,
        storageGb: formStorageGb,
        features: formFeatures,
      });
    }

    setEditingPlan(null);
    setIsCreatingNew(false);
    refreshPlans();
  };

  const handleAddFeature = () => {
    if (newFeatureText.trim() && !formFeatures.includes(newFeatureText.trim())) {
      setFormFeatures([...formFeatures, newFeatureText.trim()]);
      setNewFeatureText('');
    }
  };

  const handleRemoveFeature = (idx: number) => {
    setFormFeatures(formFeatures.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            SaaS Subscription Plans & Quota Tiers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure platform-wide subscription offerings, pricing cycles, storage, and feature matrices.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Create New Plan</span>
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border p-5 flex flex-col justify-between shadow-xs transition-all relative ${
              plan.isPopular ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200'
            }`}
          >
            {plan.isPopular && (
              <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                MOST POPULAR
              </span>
            )}

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  {plan.code}
                </span>
                <button
                  onClick={() => handleOpenEdit(plan)}
                  className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mt-1">{plan.name}</h3>
              <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>

              <div className="mt-4 pt-3 border-t border-slate-100">
                {plan.code === 'trial' ? (
                  <div className="text-xl font-black text-emerald-600">
                    Free{' '}
                    <span className="text-xs font-normal text-slate-400">
                      ({plan.trialDays} days)
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-black text-slate-900">
                      ₹{plan.priceMonthly.toLocaleString('en-IN')}
                      <span className="text-xs font-normal text-slate-400">/mo</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      or ₹{plan.priceAnnual.toLocaleString('en-IN')}/yr (billed annually)
                    </div>
                  </div>
                )}
              </div>

              {/* Resource Capacity Quotas */}
              <div className="mt-4 space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Titles:</span>
                  <span className="font-bold">{plan.maxTitles.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Physical Copies:</span>
                  <span className="font-bold">{plan.maxCopies.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Librarians:</span>
                  <span className="font-bold">{plan.maxLibrarians}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Students:</span>
                  <span className="font-bold">{plan.maxStudents.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Storage:</span>
                  <span className="font-bold">{plan.storageGb} GB</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="mt-4 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Included Features
                </span>
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs text-slate-600">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="leading-tight">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleOpenEdit(plan)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Configure Tier Limits
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Modal */}
      {(editingPlan || isCreatingNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {isCreatingNew ? 'Create New Subscription Plan' : `Edit Plan: ${editingPlan?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingPlan(null);
                  setIsCreatingNew(false);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g. Enterprise Islamic Campus"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tier Code</label>
                  <select
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="trial">trial</option>
                    <option value="basic">basic</option>
                    <option value="standard">standard</option>
                    <option value="premium">premium</option>
                    <option value="enterprise">enterprise</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Brief description of who this plan is tailored for"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    value={formMonthly}
                    onChange={(e) => setFormMonthly(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Annual Price (₹)</label>
                  <input
                    type="number"
                    value={formAnnual}
                    onChange={(e) => setFormAnnual(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Titles</label>
                  <input
                    type="number"
                    value={formMaxTitles}
                    onChange={(e) => setFormMaxTitles(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Copies</label>
                  <input
                    type="number"
                    value={formMaxCopies}
                    onChange={(e) => setFormMaxCopies(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Librarians</label>
                  <input
                    type="number"
                    value={formMaxLibrarians}
                    onChange={(e) => setFormMaxLibrarians(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Students</label>
                  <input
                    type="number"
                    value={formMaxStudents}
                    onChange={(e) => setFormMaxStudents(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Features list manager */}
              <div className="pt-2 border-t">
                <label className="block font-semibold text-slate-700 mb-1.5">Feature Highlights</label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    placeholder="Add a new feature bullet..."
                    className="flex-1 px-3 py-1.5 border rounded-lg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-medium cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {formFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200"
                    >
                      <span>{feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t flex justify-end space-x-2">
              <button
                onClick={() => {
                  setEditingPlan(null);
                  setIsCreatingNew(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
