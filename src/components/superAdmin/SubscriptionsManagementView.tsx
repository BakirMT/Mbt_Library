import React, { useState, useEffect } from 'react';
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
  Plus,
  Ban,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  Tenant,
  Subscription,
  SubscriptionPlan,
  SubscriptionEnquiry,
} from '../../types/saas';
import { saasStorage } from '../../services/storage';
import { SubscriptionPlansManager } from './SubscriptionPlansManager';

export const SubscriptionsManagementView: React.FC = () => {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [overrideFilter, setOverrideFilter] = useState<'all' | 'custom' | 'default'>('all');

  // Active sub-tab: 'libraries', 'enquiries', or 'tiers'
  const [activeSubTab, setActiveSubTab] = useState<'libraries' | 'enquiries' | 'tiers'>(() => {
    const enquiries = saasStorage.getSubscriptionEnquiries();
    return enquiries.some((e) => e.status === 'pending') ? 'enquiries' : 'libraries';
  });

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
  const [enqTitles, setEnqTitles] = useState<number>(5000);
  const [enqCopies, setEnqCopies] = useState<number>(7500);
  const [enqLibrarians, setEnqLibrarians] = useState<number>(5);
  const [enqStudents, setEnqStudents] = useState<number>(500);
  const [enqStorageMb, setEnqStorageMb] = useState<number>(2048);

  // Additional Enquiry states
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [approvingEnquiryId, setApprovingEnquiryId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [rejectModalEnquiry, setRejectModalEnquiry] = useState<SubscriptionEnquiry | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  // Log new inquiry modal
  const [newEnquiryModalOpen, setNewEnquiryModalOpen] = useState(false);
  const [newEnqTenantId, setNewEnqTenantId] = useState('');
  const [newEnqName, setNewEnqName] = useState('');
  const [newEnqEmail, setNewEnqEmail] = useState('');
  const [newEnqPhone, setNewEnqPhone] = useState('');
  const [newEnqPlan, setNewEnqPlan] = useState('premium');
  const [newEnqTitles, setNewEnqTitles] = useState(5000);
  const [newEnqStudents, setNewEnqStudents] = useState(500);
  const [newEnqMessage, setNewEnqMessage] = useState('');
  const [isSubmittingEnq, setIsSubmittingEnq] = useState(false);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 4000);
  };

  useEffect(() => {
    saasStorage
      .syncSubscriptionEnquiriesFromApi()
      .then(() => setRefreshNonce((n) => n + 1))
      .catch(() => {});
    const onUpdate = () => setRefreshNonce((n) => n + 1);
    window.addEventListener('mbt_enquiries_updated', onUpdate);
    return () => window.removeEventListener('mbt_enquiries_updated', onUpdate);
  }, []);

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

  const handleQuickApprove = async (enquiry: SubscriptionEnquiry) => {
    setApprovingEnquiryId(enquiry.id);
    try {
      const res = await saasStorage.approveSubscriptionEnquiryAsync(enquiry.id);
      showToast(`Approved "${res.tenantName || enquiry.tenantName}"! Subscription active in Cloud SQL.`);
      setRefreshNonce((n) => n + 1);
    } catch (err: any) {
      showToast(`Error: ${err?.message || 'Failed to approve'}`);
    } finally {
      setApprovingEnquiryId(null);
    }
  };

  const handleApproveEnquiryAsPremium = async (enquiry: SubscriptionEnquiry) => {
    setApprovingEnquiryId(enquiry.id);
    try {
      // 1. If linked to tenant, update subscription custom limits
      if (enquiry.tenantId) {
        saasStorage.updateSubscription(enquiry.tenantId, {
          customLimits: {
            maxTitles: enqTitles,
            maxCopies: enqCopies,
            maxLibrarians: enqLibrarians,
            maxStudents: enqStudents,
            storageMb: enqStorageMb,
          },
          customOverrideReason: enquiryCommercialTerms || 'Custom Premium Enterprise Limits approved',
        });
      }

      const res = await saasStorage.approveSubscriptionEnquiryAsync(
        enquiry.id,
        enquiryNotes,
        enquiryCommercialTerms
      );
      showToast(`Approved & configured custom limits for "${res.tenantName || enquiry.tenantName}"!`);
      setReviewEnquiry(null);
      setRefreshNonce((n) => n + 1);
    } catch (err: any) {
      showToast(`Error: ${err?.message || 'Approval failed'}`);
    } finally {
      setApprovingEnquiryId(null);
    }
  };

  const handleRejectEnquiry = async () => {
    if (!rejectModalEnquiry) return;
    try {
      const res = await saasStorage.rejectSubscriptionEnquiryAsync(
        rejectModalEnquiry.id,
        rejectNotes.trim() || 'Request declined by Super Administrator.'
      );
      showToast(`Inquiry for "${res.tenantName || rejectModalEnquiry.tenantName}" rejected.`);
      setRejectModalEnquiry(null);
      setRejectNotes('');
      setRefreshNonce((n) => n + 1);
    } catch (err: any) {
      showToast(`Error: ${err?.message || 'Failed to reject enquiry'}`);
    }
  };

  const handleCreateNewEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnqName.trim() || !newEnqEmail.trim()) {
      showToast('Contact name and email are required.');
      return;
    }

    setIsSubmittingEnq(true);
    try {
      const selectedTenant = tenants.find((t) => t.id === newEnqTenantId);
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenant?.id,
          tenantSlug: selectedTenant?.slug,
          tenantName: selectedTenant?.name || newEnqName.trim(),
          contactName: newEnqName.trim(),
          contactEmail: newEnqEmail.trim(),
          contactPhone: newEnqPhone.trim(),
          requestedPlan: newEnqPlan,
          estimatedTitles: Number(newEnqTitles),
          estimatedStudents: Number(newEnqStudents),
          message: newEnqMessage.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to record custom enquiry');
      }

      await saasStorage.syncSubscriptionEnquiriesFromApi();
      showToast('Custom subscription inquiry logged successfully in database.');
      setNewEnquiryModalOpen(false);
      setNewEnqName('');
      setNewEnqEmail('');
      setNewEnqPhone('');
      setNewEnqMessage('');
      setRefreshNonce((n) => n + 1);
    } catch (err: any) {
      showToast(`Error: ${err?.message || 'Failed to create inquiry'}`);
    } finally {
      setIsSubmittingEnq(false);
    }
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
            <span>Customer Upgrade Requests</span>
            {pendingEnquiriesCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-black animate-pulse">
                {pendingEnquiriesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('tiers')}
            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'tiers'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Plan Tiers & Pricing ({plans.length})</span>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Custom Premium Subscription Inquiries ({enquiries.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Libraries requesting custom capacity agreements, tailored server allowances, and bespoke commercial terms.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    saasStorage.syncSubscriptionEnquiriesFromApi().then(() => {
                      setRefreshNonce((n) => n + 1);
                      showToast('Synchronized with Cloud SQL database.');
                    });
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync DB</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewEnqTenantId(tenants[0]?.id || '');
                    setNewEnquiryModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log New Inquiry</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 pt-3 pb-1 overflow-x-auto scrollbar-none">
              {(
                [
                  { id: 'all', label: 'All Inquiries', count: enquiries.length },
                  { id: 'pending', label: 'Pending Review', count: enquiries.filter((e) => e.status === 'pending').length },
                  { id: 'approved', label: 'Approved & Active', count: enquiries.filter((e) => e.status === 'approved').length },
                  { id: 'rejected', label: 'Declined', count: enquiries.filter((e) => e.status === 'rejected').length },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEnquiryStatusFilter(tab.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                    enquiryStatusFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Inquiries list */}
            <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
              {enquiries.filter((e) => enquiryStatusFilter === 'all' || e.status === enquiryStatusFilter).length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No subscription enquiries matching filter &quot;{enquiryStatusFilter}&quot;.
                </div>
              ) : (
                enquiries
                  .filter((e) => enquiryStatusFilter === 'all' || e.status === enquiryStatusFilter)
                  .map((enq) => (
                    <div key={enq.id} className="py-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{enq.tenantName}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              enq.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : enq.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {enq.status}
                          </span>
                          {enq.requestedPlan && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                              Plan: {enq.requestedPlan}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600">
                          Authority Contact: <strong className="text-slate-800">{enq.contactName}</strong> ({enq.contactEmail}) · {enq.contactPhone || 'No phone'}
                        </div>

                        {enq.message && (
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-700 italic">
                            &quot;{enq.message}&quot;
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                          <span>Submitted: {new Date(enq.createdAt).toLocaleDateString()}</span>
                          {enq.estimatedTitles && <span className="font-medium text-slate-700">· {enq.estimatedTitles.toLocaleString()} Titles</span>}
                          {enq.estimatedCopies && <span>· {enq.estimatedCopies.toLocaleString()} Copies</span>}
                          {enq.estimatedLibrarians && <span>· {enq.estimatedLibrarians} Librarians</span>}
                          {enq.estimatedStudents && <span className="font-medium text-slate-700">· {enq.estimatedStudents.toLocaleString()} Students</span>}
                          {enq.estimatedStorageMb && <span>· {enq.estimatedStorageMb} MB Storage</span>}
                        </div>

                        {enq.commercialTerms && (
                          <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded inline-block font-medium">
                            Commercial Agreement: {enq.commercialTerms}
                          </div>
                        )}
                        {enq.superAdminNotes && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded inline-block">
                            Admin Note: {enq.superAdminNotes}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {enq.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={approvingEnquiryId === enq.id}
                              onClick={() => handleQuickApprove(enq)}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center space-x-1.5 shadow-xs transition-all active:scale-95"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{approvingEnquiryId === enq.id ? 'Approving...' : 'Quick Approve'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewEnquiry(enq);
                                setEnquiryNotes(enq.superAdminNotes || '');
                                setEnquiryCommercialTerms(enq.commercialTerms || '');
                                setEnqTitles(enq.estimatedTitles || 5000);
                                setEnqCopies(enq.estimatedCopies || 7500);
                                setEnqLibrarians(enq.estimatedLibrarians || 5);
                                setEnqStudents(enq.estimatedStudents || 500);
                                setEnqStorageMb(enq.estimatedStorageMb || 2048);
                              }}
                              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center space-x-1.5 shadow-xs"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Configure Limits</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalEnquiry(enq);
                                setRejectNotes('');
                              }}
                              className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg cursor-pointer flex items-center space-x-1 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </>
                        )}
                        {enq.status === 'approved' && (
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold rounded-lg flex items-center space-x-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Approved & Quotas Live</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewEnquiry(enq);
                                setEnquiryNotes(enq.superAdminNotes || '');
                                setEnquiryCommercialTerms(enq.commercialTerms || '');
                                setEnqTitles(enq.estimatedTitles || 5000);
                                setEnqCopies(enq.estimatedCopies || 7500);
                                setEnqLibrarians(enq.estimatedLibrarians || 5);
                                setEnqStudents(enq.estimatedStudents || 500);
                                setEnqStorageMb(enq.estimatedStorageMb || 2048);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                            >
                              Re-adjust Quotas
                            </button>
                          </div>
                        )}
                        {enq.status === 'rejected' && (
                          <span className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold rounded-lg flex items-center space-x-1.5">
                            <Ban className="w-3.5 h-3.5" />
                            <span>Declined</span>
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

      {/* Sub-tab 3: Pricing Tiers & Global Quotas */}
      {activeSubTab === 'tiers' && (
        <SubscriptionPlansManager />
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

      {/* ================= MODAL: REVIEW PREMIUM ENQUIRY & CONFIGURE LIMITS ================= */}
      {reviewEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Configure Quotas & Approve Premium Request</h3>
                <p className="text-xs text-slate-400">Set customized title, copy, staff, student allowances & commercial agreement</p>
              </div>
              <button onClick={() => setReviewEnquiry(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Institution & Contact Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{reviewEnquiry.tenantName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                    Target: {reviewEnquiry.requestedPlan || 'Premium'}
                  </span>
                </div>
                <div className="text-slate-600">
                  <strong>Contact:</strong> {reviewEnquiry.contactName} ({reviewEnquiry.contactEmail}) · {reviewEnquiry.contactPhone || 'N/A'}
                </div>
                {reviewEnquiry.message && (
                  <div className="mt-1 text-slate-700 italic border-l-2 border-blue-400 pl-2">
                    &quot;{reviewEnquiry.message}&quot;
                  </div>
                )}
              </div>

              {/* Custom Quota Overrides */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>Allocated Quota Allowances</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Overrides plan defaults upon activation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Max Titles Quota</label>
                    <input
                      type="number"
                      value={enqTitles}
                      onChange={(e) => setEnqTitles(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Max Copies Quota</label>
                    <input
                      type="number"
                      value={enqCopies}
                      onChange={(e) => setEnqCopies(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Max Librarians</label>
                    <input
                      type="number"
                      value={enqLibrarians}
                      onChange={(e) => setEnqLibrarians(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Max Students</label>
                    <input
                      type="number"
                      value={enqStudents}
                      onChange={(e) => setEnqStudents(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Storage Quota (MB)</label>
                    <input
                      type="number"
                      value={enqStorageMb}
                      onChange={(e) => setEnqStorageMb(Math.max(100, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Commercial Terms & Pricing Agreement</label>
                <textarea
                  rows={2}
                  value={enquiryCommercialTerms}
                  onChange={(e) => setEnquiryCommercialTerms(e.target.value)}
                  placeholder="e.g. Authorized annual agreement @ ₹24,000/year with dedicated database allocation..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Super Admin Internal Notes</label>
                <textarea
                  rows={2}
                  value={enquiryNotes}
                  onChange={(e) => setEnquiryNotes(e.target.value)}
                  placeholder="Internal remarks for compliance and audit trail..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3.5 border-t flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setReviewEnquiry(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approvingEnquiryId === reviewEnquiry.id}
                onClick={() => handleApproveEnquiryAsPremium(reviewEnquiry)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center space-x-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{approvingEnquiryId === reviewEnquiry.id ? 'Activating Quotas...' : 'Approve & Activate Quotas'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REJECT SUBSCRIPTION ENQUIRY ================= */}
      {rejectModalEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Ban className="w-4 h-4 text-rose-400" />
                <h3 className="font-bold text-sm">Decline Upgrade Request</h3>
              </div>
              <button onClick={() => setRejectModalEnquiry(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Institution:</div>
                <div className="font-bold text-slate-900 text-sm">{rejectModalEnquiry.tenantName}</div>
                <div className="text-slate-500 mt-1">Contact: {rejectModalEnquiry.contactName} ({rejectModalEnquiry.contactEmail})</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Declining (Optional)</label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="e.g. Existing capacity sufficient, custom pricing terms rejected, or contact could not be reached."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg border-slate-300"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setRejectModalEnquiry(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectEnquiry}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: LOG NEW CUSTOM INQUIRY ================= */}
      {newEnquiryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Log Custom Subscription Inquiry</h3>
                <p className="text-xs text-slate-400">Record a bespoke authority quotation or upgrade request</p>
              </div>
              <button onClick={() => setNewEnquiryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewEnquiry} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Target Library Institution</label>
                <select
                  value={newEnqTenantId}
                  onChange={(e) => {
                    setNewEnqTenantId(e.target.value);
                    const t = tenants.find((item) => item.id === e.target.value);
                    if (t) {
                      setNewEnqName(t.settings.contactName || '');
                      setNewEnqEmail(t.settings.contactEmail || '');
                      setNewEnqPhone(t.settings.contactPhone || '');
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="">-- Standalone / Unlinked Inquiry --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={newEnqName}
                    onChange={(e) => setNewEnqName(e.target.value)}
                    placeholder="e.g. Dr. Salman Khan"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={newEnqEmail}
                    onChange={(e) => setNewEnqEmail(e.target.value)}
                    placeholder="salman@university.edu"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newEnqPhone}
                    onChange={(e) => setNewEnqPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Requested Plan Tier</label>
                  <select
                    value={newEnqPlan}
                    onChange={(e) => setNewEnqPlan(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="basic">Basic Plan</option>
                    <option value="standard">Standard Campus Plan</option>
                    <option value="premium">Premium University Plan</option>
                    <option value="enterprise">Bespoke Enterprise / Multi-Branch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Title Count</label>
                  <input
                    type="number"
                    value={newEnqTitles}
                    onChange={(e) => setNewEnqTitles(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Student Count</label>
                  <input
                    type="number"
                    value={newEnqStudents}
                    onChange={(e) => setNewEnqStudents(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message / Requirements</label>
                <textarea
                  rows={2}
                  value={newEnqMessage}
                  onChange={(e) => setNewEnqMessage(e.target.value)}
                  placeholder="Details regarding institution capacity, branch network, or special terms..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="bg-slate-50 -mx-6 -mb-6 px-6 py-3.5 border-t flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setNewEnquiryModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEnq}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                >
                  {isSubmittingEnq ? 'Recording...' : 'Record Custom Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Toast */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center space-x-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}
    </div>
  );
};
