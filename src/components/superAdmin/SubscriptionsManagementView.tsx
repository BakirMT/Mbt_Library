import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HardDrive,
  Users,
  BookOpen,
  Edit,
  RotateCcw,
  ShieldCheck,
  Save,
  X,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Send,
  MessageSquare,
  Building2,
} from 'lucide-react';
import {
  Tenant,
  Subscription,
  SubscriptionPlan,
  SubscriptionEnquiry,
} from '../../types/saas';
import { saasStorage } from '../../services/storage';

export const SubscriptionsManagementView: React.FC = () => {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [overrideFilter, setOverrideFilter] = useState<'all' | 'custom' | 'default'>('all');

  // Active sub-tab: 'libraries' or 'enquiries'
  const [activeSubTab, setActiveSubTab] = useState<'libraries' | 'enquiries'>('libraries');

  // Edit Subscription & Limits Modal State
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editPlanId, setEditPlanId] = useState<string>('');
  const [editBillingCycle, setEditBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [editExpiryDate, setEditExpiryDate] = useState<string>('');
  const [editGracePeriod, setEditGracePeriod] = useState<number>(14);

  // Overrides
  const [overrideTitles, setOverrideTitles] = useState<boolean>(false);
  const [valTitles, setValTitles] = useState<number>(1000);

  const [overrideCopies, setOverrideCopies] = useState<boolean>(false);
  const [valCopies, setValCopies] = useState<number>(1200);

  const [overrideLibrarians, setOverrideLibrarians] = useState<boolean>(false);
  const [valLibrarians, setValLibrarians] = useState<number>(2);

  const [overrideStudents, setOverrideStudents] = useState<boolean>(false);
  const [valStudents, setValStudents] = useState<number>(100);

  const [overrideStorage, setOverrideStorage] = useState<boolean>(false);
  const [valStorage, setValStorage] = useState<number>(200);

  const [overrideReason, setOverrideReason] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Review Enquiry Modal State
  const [reviewEnquiry, setReviewEnquiry] = useState<SubscriptionEnquiry | null>(null);
  const [enquiryNotes, setEnquiryNotes] = useState('');
  const [enquiryCommercialTerms, setEnquiryCommercialTerms] = useState('');

  const tenants = saasStorage.getTenants();
  const subscriptions = saasStorage.getSubscriptions();
  const plans = saasStorage.getPlans();
  const enquiries = saasStorage.getSubscriptionEnquiries();

  const handleOpenEdit = (tenant: Tenant) => {
    const sub = saasStorage.getSubscriptionForTenant(tenant.id);
    const plan = sub ? saasStorage.getPlanById(sub.planId) : plans[0];
    const effective = saasStorage.getEffectiveLimits(tenant.id);

    setEditingTenant(tenant);
    setEditPlanId(sub?.planId || plans[0].id);
    setEditBillingCycle(sub?.billingCycle || 'annual');
    setEditExpiryDate(sub?.expiryDate ? sub.expiryDate.split('T')[0] : '');
    setEditGracePeriod(sub?.gracePeriodDays || 14);

    setOverrideTitles(effective.isTitlesOverridden);
    setValTitles(effective.maxTitles);

    setOverrideCopies(effective.isCopiesOverridden);
    setValCopies(effective.maxCopies);

    setOverrideLibrarians(effective.isLibrariansOverridden);
    setValLibrarians(effective.maxLibrarians);

    setOverrideStudents(effective.isStudentsOverridden);
    setValStudents(effective.maxStudents);

    setOverrideStorage(effective.isStorageOverridden);
    setValStorage(effective.storageMb);

    setOverrideReason(effective.customOverrideReason || '');
    setSaveStatus(null);
  };

  const handlePlanChangeInForm = (newPlanId: string) => {
    setEditPlanId(newPlanId);
    const newPlan = plans.find((p) => p.id === newPlanId);
    if (!newPlan) return;

    if (newPlan.code === 'premium') {
      // Premium requires explicit authority limits
      setOverrideTitles(true);
      setOverrideCopies(true);
      setOverrideLibrarians(true);
      setOverrideStudents(true);
      setOverrideStorage(true);
      if (valTitles === 0) setValTitles(5000);
      if (valCopies === 0) setValCopies(7000);
      if (valLibrarians === 0) setValLibrarians(5);
      if (valStudents === 0) setValStudents(500);
      if (valStorage === 0) setValStorage(2000);
    } else {
      // If an override was NOT enabled, sync to new plan default
      if (!overrideTitles) setValTitles(newPlan.maxTitles);
      if (!overrideCopies) setValCopies(newPlan.maxCopies);
      if (!overrideLibrarians) setValLibrarians(newPlan.maxLibrarians);
      if (!overrideStudents) setValStudents(newPlan.maxStudents);
      if (!overrideStorage) setValStorage(newPlan.storageMb);
    }
  };

  const handleResetToPlanDefaults = () => {
    const plan = plans.find((p) => p.id === editPlanId);
    if (!plan) return;

    setOverrideTitles(false);
    setValTitles(plan.maxTitles);

    setOverrideCopies(false);
    setValCopies(plan.maxCopies);

    setOverrideLibrarians(false);
    setValLibrarians(plan.maxLibrarians);

    setOverrideStudents(false);
    setValStudents(plan.maxStudents);

    setOverrideStorage(false);
    setValStorage(plan.storageMb);

    setOverrideReason('');
  };

  const handleSaveSubscriptionAndLimits = async () => {
    if (!editingTenant) return;
    setSaveStatus('Saving changes and recording audit trail...');

    const customLimits: any = {};
    if (overrideTitles) customLimits.maxTitles = Number(valTitles);
    if (overrideCopies) customLimits.maxCopies = Number(valCopies);
    if (overrideLibrarians) customLimits.maxLibrarians = Number(valLibrarians);
    if (overrideStudents) customLimits.maxStudents = Number(valStudents);
    if (overrideStorage) customLimits.storageMb = Number(valStorage);

    const payload = {
      planId: editPlanId,
      billingCycle: editBillingCycle,
      expiryDate: editExpiryDate ? new Date(editExpiryDate).toISOString() : undefined,
      gracePeriodDays: Number(editGracePeriod),
      customMaxTitles: overrideTitles ? Number(valTitles) : null,
      customMaxCopies: overrideCopies ? Number(valCopies) : null,
      customMaxLibrarians: overrideLibrarians ? Number(valLibrarians) : null,
      customMaxStudents: overrideStudents ? Number(valStudents) : null,
      customMaxStorageMb: overrideStorage ? Number(valStorage) : null,
      customOverrideReason: overrideReason.trim() || undefined,
    };

    // 1. Sync to backend Cloud SQL server API
    try {
      await fetch(`/api/super-admin/tenants/${editingTenant.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('Backend subscription update warning:', e);
    }

    // 2. Sync to local storage
    saasStorage.updateSubscription(editingTenant.id, {
      planId: editPlanId,
      billingCycle: editBillingCycle,
      expiryDate: editExpiryDate ? new Date(editExpiryDate).toISOString() : undefined,
      gracePeriodDays: Number(editGracePeriod),
      customLimits,
      customOverrideReason: overrideReason.trim() || undefined,
    });

    saasStorage.logActivity({
      tenantId: editingTenant.id,
      tenantName: editingTenant.name,
      actorId: 'usr_super_admin_01',
      actorName: 'Super Administrator',
      actorRole: 'super_admin',
      action: 'SUBSCRIPTION_LIMITS_MODIFIED',
      category: 'subscription',
      details: `Super Admin configured limits for "${editingTenant.name}". Reason: ${overrideReason.trim() || 'Custom arrangement'}.`,
    });

    setRefreshNonce((n) => n + 1);
    setEditingTenant(null);
  };

  const handleApproveEnquiryAsPremium = async (enquiry: SubscriptionEnquiry) => {
    saasStorage.approveSubscriptionEnquiry(
      enquiry.id,
      enquiryNotes,
      enquiryCommercialTerms
    );

    setReviewEnquiry(null);
    setRefreshNonce((n) => n + 1);
  };

  // Filtered rows
  const filteredTenants = tenants.filter((tenant) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      tenant.name.toLowerCase().includes(q) ||
      tenant.slug.toLowerCase().includes(q) ||
      tenant.id.toLowerCase().includes(q);

    const sub = subscriptions.find((s) => s.tenantId === tenant.id);
    const plan = sub ? plans.find((p) => p.id === sub.planId) : null;
    const matchesPlan = planFilter === 'all' || plan?.code === planFilter;

    const effective = saasStorage.getEffectiveLimits(tenant.id);
    const hasAnyOverride =
      effective.isTitlesOverridden ||
      effective.isCopiesOverridden ||
      effective.isLibrariansOverridden ||
      effective.isStudentsOverridden ||
      effective.isStorageOverridden;

    const matchesOverride =
      overrideFilter === 'all' ||
      (overrideFilter === 'custom' && hasAnyOverride) ||
      (overrideFilter === 'default' && !hasAnyOverride);

    return matchesQuery && matchesPlan && matchesOverride;
  });

  const pendingEnquiriesCount = enquiries.filter((e) => e.status === 'pending').length;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Tab Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Subscription Management & Custom Limits
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
              Authority Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centrally manage subscriptions, monitor live resource usage, and authorize custom quotas for any library.
          </p>
        </div>

        {/* Sub-tab Pills */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('libraries')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'libraries'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Libraries ({tenants.length})
          </button>
          <button
            onClick={() => setActiveSubTab('enquiries')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'enquiries'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Premium Enquiries</span>
            {pendingEnquiriesCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-black">
                {pendingEnquiriesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeSubTab === 'libraries' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search library by name, unique ID, or slug..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center space-x-2.5 w-full sm:w-auto">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 outline-none"
              >
                <option value="all">All Plans</option>
                <option value="free">Free Plan (25 titles)</option>
                <option value="basic">Basic Plan (1,000 titles)</option>
                <option value="standard">Standard Plan (4,000 titles)</option>
                <option value="premium">Premium (Contact Authority)</option>
              </select>

              <select
                value={overrideFilter}
                onChange={(e) => setOverrideFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 outline-none"
              >
                <option value="all">All Limits Status</option>
                <option value="custom">With Custom Overrides Only</option>
                <option value="default">Plan Defaults Only</option>
              </select>
            </div>
          </div>

          {/* Libraries Subscriptions Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[840px]">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase font-semibold tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Library & Unique ID</th>
                    <th className="px-4 py-3">Subscription & Status</th>
                    <th className="px-4 py-3">Start & Expiry</th>
                    <th className="px-4 py-3">Catalogue Titles</th>
                    <th className="px-4 py-3">Physical Copies</th>
                    <th className="px-4 py-3">Librarians</th>
                    <th className="px-4 py-3">Students</th>
                    <th className="px-4 py-3">Storage</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.map((tenant) => {
                    const sub = subscriptions.find((s) => s.tenantId === tenant.id);
                    const plan = sub ? plans.find((p) => p.id === sub.planId) : null;
                    const effective = saasStorage.getEffectiveLimits(tenant.id);

                    const titlesUsed = tenant.currentUsage?.titlesCount || 0;
                    const copiesUsed = tenant.currentUsage?.copiesCount || 0;
                    const librariansUsed = tenant.currentUsage?.librariansCount || 1;
                    const studentsUsed = tenant.currentUsage?.studentsCount || 0;
                    const storageUsedMb = tenant.currentUsage?.storageMbUsed || Math.round(titlesUsed * 0.1);

                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Library & ID */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{tenant.name}</div>
                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5 font-mono">
                            <span>ID: {tenant.id}</span>
                            <span>·</span>
                            <span className="text-blue-600">/l/{tenant.slug}</span>
                          </div>
                        </td>

                        {/* Plan & Status */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-800">{effective.planName}</span>
                            {plan?.code === 'premium' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-purple-700">
                                CUSTOM
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                sub?.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : sub?.status === 'trial'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {sub?.status || 'ACTIVE'}
                            </span>
                          </div>
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-3.5 text-slate-600 text-[11px]">
                          <div>
                            Start:{' '}
                            <span className="font-medium">
                              {sub?.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div>
                            Expires:{' '}
                            <span className="font-medium text-slate-800">
                              {sub?.expiryDate ? new Date(sub.expiryDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </td>

                        {/* Titles */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">
                            {titlesUsed.toLocaleString()}{' '}
                            <span className="text-[10px] font-normal text-slate-500">
                              / {effective.maxTitles.toLocaleString()}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded mt-0.5 inline-block ${
                              effective.isTitlesOverridden
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {effective.isTitlesOverridden ? 'Custom Override' : 'Plan Default'}
                          </span>
                        </td>

                        {/* Copies */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">
                            {copiesUsed.toLocaleString()}{' '}
                            <span className="text-[10px] font-normal text-slate-500">
                              / {effective.maxCopies.toLocaleString()}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded mt-0.5 inline-block ${
                              effective.isCopiesOverridden
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {effective.isCopiesOverridden ? 'Custom Override' : 'Plan Default'}
                          </span>
                        </td>

                        {/* Librarians */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">
                            {librariansUsed}{' '}
                            <span className="text-[10px] font-normal text-slate-500">
                              / {effective.maxLibrarians}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded mt-0.5 inline-block ${
                              effective.isLibrariansOverridden
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {effective.isLibrariansOverridden ? 'Custom Override' : 'Plan Default'}
                          </span>
                        </td>

                        {/* Students */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">
                            {studentsUsed.toLocaleString()}{' '}
                            <span className="text-[10px] font-normal text-slate-500">
                              / {effective.maxStudents.toLocaleString()}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded mt-0.5 inline-block ${
                              effective.isStudentsOverridden
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {effective.isStudentsOverridden ? 'Custom Override' : 'Plan Default'}
                          </span>
                        </td>

                        {/* Storage */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">
                            {storageUsedMb} MB{' '}
                            <span className="text-[10px] font-normal text-slate-500">
                              / {effective.storageMb >= 1024 ? `${(effective.storageMb / 1024).toFixed(0)} GB` : `${effective.storageMb} MB`}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded mt-0.5 inline-block ${
                              effective.isStorageOverridden
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {effective.isStorageOverridden ? 'Custom Override' : 'Plan Default'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleOpenEdit(tenant)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit Limits</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Premium Contact Authority Enquiries */}
      {activeSubTab === 'enquiries' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm">
              Custom Premium Subscription Inquiries ({enquiries.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Libraries requesting custom capacity agreements, tailored server allowances, and bespoke commercial terms.
            </p>

            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {enquiries.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No subscription enquiries submitted yet.
                </div>
              ) : (
                enquiries.map((enq) => (
                  <div key={enq.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{enq.tenantName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            enq.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : enq.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {enq.status}
                        </span>
                        {enq.requestedPlan && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                            Requested: {enq.requestedPlan}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        Contact: <strong>{enq.contactName}</strong> ({enq.contactEmail}) · {enq.contactPhone || 'No phone'}
                      </div>
                      {enq.message && <p className="text-xs text-slate-500 italic mt-1">&quot;{enq.message}&quot;</p>}
                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-2">
                        <span>Submitted: {new Date(enq.createdAt).toLocaleDateString()}</span>
                        {enq.estimatedTitles && <span>· {enq.estimatedTitles} Titles</span>}
                        {enq.estimatedStudents && <span>· {enq.estimatedStudents} Students</span>}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-start md:self-auto shrink-0">
                      {enq.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              saasStorage.approveSubscriptionEnquiry(enq.id);
                              setRefreshNonce((n) => n + 1);
                            }}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center space-x-1 shadow-xs transition-all active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Quick Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              setReviewEnquiry(enq);
                              setEnquiryNotes(enq.superAdminNotes || '');
                              setEnquiryCommercialTerms(enq.commercialTerms || '');
                            }}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            Configure Limits
                          </button>
                        </>
                      )}
                      {enq.status === 'approved' && (
                        <span className="text-xs text-emerald-700 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approved & Configured</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT SUBSCRIPTION & LIMITS ================= */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Edit Subscription & Custom Limits</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {editingTenant.name} ({editingTenant.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTenant(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Plan Selection */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 uppercase text-[11px] tracking-wider">
                  Subscription Plan Assignment *
                </label>
                <select
                  value={editPlanId}
                  onChange={(e) => handlePlanChangeInForm(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code.toUpperCase()}) — {p.code === 'premium' ? 'Contact Authority (Custom)' : `₹${p.priceMonthly}/mo`}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Default limits for Free (25 titles, 50 copies, 1 lib, 20 stu, 10MB), Basic (1,000 titles, 1,200 copies, 2 lib, 100 stu, 200MB), Standard (4,000 titles, 5,000 copies, 4 lib, 250 stu, 1GB).
                </p>
              </div>

              {/* Terms & Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={editBillingCycle}
                    onChange={(e) => setEditBillingCycle(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                  >
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grace Period (Days)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={editGracePeriod}
                    onChange={(e) => setEditGracePeriod(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Custom Limits Overrides (Authority Controlled) */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">Authority-Controlled Custom Limits</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Overrides apply exclusively to <strong>{editingTenant.name}</strong> without changing other libraries.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToPlanDefaults}
                    className="px-2.5 py-1 text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All to Plan Defaults</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Limit 1: Titles */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800">Maximum Catalogue Titles</div>
                      <div className="text-[11px] text-slate-500">
                        {overrideTitles ? 'Custom override active' : 'Using plan default'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1 text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overrideTitles}
                          onChange={(e) => setOverrideTitles(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-[11px]">Override</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        disabled={!overrideTitles}
                        value={valTitles}
                        onChange={(e) => setValTitles(Number(e.target.value))}
                        className="w-28 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-bold bg-white disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Limit 2: Copies */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800">Maximum Physical Copies</div>
                      <div className="text-[11px] text-slate-500">
                        {overrideCopies ? 'Custom override active' : 'Using plan default'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1 text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overrideCopies}
                          onChange={(e) => setOverrideCopies(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-[11px]">Override</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        disabled={!overrideCopies}
                        value={valCopies}
                        onChange={(e) => setValCopies(Number(e.target.value))}
                        className="w-28 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-bold bg-white disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Limit 3: Librarians */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800">Maximum Librarians Staff</div>
                      <div className="text-[11px] text-slate-500">
                        {overrideLibrarians ? 'Custom override active' : 'Using plan default'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1 text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overrideLibrarians}
                          onChange={(e) => setOverrideLibrarians(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-[11px]">Override</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        disabled={!overrideLibrarians}
                        value={valLibrarians}
                        onChange={(e) => setValLibrarians(Number(e.target.value))}
                        className="w-28 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-bold bg-white disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Limit 4: Students */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800">Maximum Students Registered</div>
                      <div className="text-[11px] text-slate-500">
                        {overrideStudents ? 'Custom override active' : 'Using plan default'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1 text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overrideStudents}
                          onChange={(e) => setOverrideStudents(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-[11px]">Override</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        disabled={!overrideStudents}
                        value={valStudents}
                        onChange={(e) => setValStudents(Number(e.target.value))}
                        className="w-28 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-bold bg-white disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Limit 5: Storage */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800">Storage Allowance (MB)</div>
                      <div className="text-[11px] text-slate-500">
                        {overrideStorage ? 'Custom override active' : 'Using plan default'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1 text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overrideStorage}
                          onChange={(e) => setOverrideStorage(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-[11px]">Override</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        disabled={!overrideStorage}
                        value={valStorage}
                        onChange={(e) => setValStorage(Number(e.target.value))}
                        className="w-28 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-bold bg-white disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Internal Reason for Audit Trail */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Internal Reason for Custom Limits / Adjustment (Audit Record) *
                </label>
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Authorized special research capacity expansion approved by MBT Executive Committee..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none focus:border-blue-500"
                />
              </div>

              {saveStatus && (
                <div className="p-2.5 rounded bg-blue-50 text-blue-800 text-[11px] font-semibold">
                  {saveStatus}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Audit entry will be logged under Super Administrator.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSubscriptionAndLimits}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Apply Limits</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REVIEW PREMIUM ENQUIRY ================= */}
      {reviewEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Review Premium Subscription Request</h3>
                <p className="text-xs text-slate-400">Configure custom limits and approve commercial terms</p>
              </div>
              <button onClick={() => setReviewEnquiry(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div><strong>Institution:</strong> {reviewEnquiry.tenantName}</div>
                <div><strong>Contact:</strong> {reviewEnquiry.contactName} ({reviewEnquiry.contactEmail}) · {reviewEnquiry.contactPhone || 'N/A'}</div>
                {reviewEnquiry.message && <div><strong>Message:</strong> &quot;{reviewEnquiry.message}&quot;</div>}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commercial Terms & Pricing Notes</label>
                <textarea
                  rows={2}
                  value={enquiryCommercialTerms}
                  onChange={(e) => setEnquiryCommercialTerms(e.target.value)}
                  placeholder="e.g. Annual contract @ ₹18,000/year authorized with dedicated database branch..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Super Admin Internal Notes</label>
                <textarea
                  rows={2}
                  value={enquiryNotes}
                  onChange={(e) => setEnquiryNotes(e.target.value)}
                  placeholder="Internal review remarks..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t flex justify-end space-x-2">
              <button
                onClick={() => setReviewEnquiry(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveEnquiryAsPremium(reviewEnquiry)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center space-x-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve & Assign Premium</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
