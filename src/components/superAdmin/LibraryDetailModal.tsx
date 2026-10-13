import React, { useState } from 'react';
import {
  X,
  Building2,
  Calendar,
  CreditCard,
  Users,
  Key,
  ShieldCheck,
  FileClock,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Mail,
  Lock,
  Edit,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Tenant, Subscription, SubscriptionPlan, User } from '../../types/saas';
import { saasStorage } from '../../services/storage';
import { useRouter } from '../../router/RouterContext';

interface LibraryDetailModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface LibraryDetailModalContentProps {
  tenant: Tenant;
  onClose: () => void;
  onUpdate: () => void;
}

const LibraryDetailModalContent: React.FC<LibraryDetailModalContentProps> = ({
  tenant,
  onClose,
  onUpdate,
}) => {
  const { navigate } = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'users' | 'links' | 'logs'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Editable Overview Form
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [name, setName] = useState(tenant.name);
  const [institutionName, setInstitutionName] = useState(tenant.institutionName);
  const [contactEmail, setContactEmail] = useState(tenant.settings.contactEmail);
  const [contactPhone, setContactPhone] = useState(tenant.settings.contactPhone);
  const [address, setAddress] = useState(tenant.settings.address);
  const [timezone, setTimezone] = useState(tenant.settings.timezone);

  // Subscription Details
  const subscription = saasStorage.getSubscriptionForTenant(tenant.id);
  const plans = saasStorage.getPlans();
  const currentPlan = subscription ? saasStorage.getPlanById(subscription.planId) : null;

  // Editable Subscription Form
  const [isEditingSub, setIsEditingSub] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(subscription?.planId || '');
  const [expiryDate, setExpiryDate] = useState(subscription?.expiryDate?.split('T')[0] || '');
  const [maxTitles, setMaxTitles] = useState(subscription?.customLimits?.maxTitles ?? currentPlan?.maxTitles ?? 10000);
  const [maxCopies, setMaxCopies] = useState(subscription?.customLimits?.maxCopies ?? currentPlan?.maxCopies ?? 25000);
  const [maxLibrarians, setMaxLibrarians] = useState(subscription?.customLimits?.maxLibrarians ?? currentPlan?.maxLibrarians ?? 5);
  const [maxStudents, setMaxStudents] = useState(subscription?.customLimits?.maxStudents ?? currentPlan?.maxStudents ?? 2000);
  const [gracePeriodDays, setGracePeriodDays] = useState(subscription?.gracePeriodDays ?? 14);

  // Reset Admin State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [generatedResetLink, setGeneratedResetLink] = useState<string | null>(null);

  // Data Queries
  const usersWithMembership = saasStorage.getUsersForTenant(tenant.id);
  const tenantInvitations = saasStorage.getInvitations().filter((i) => i.tenantId === tenant.id);
  const tenantLogs = saasStorage.getActivityLogs().filter((l) => l.tenantId === tenant.id);
  const libraryAdmin = saasStorage.getLibraryAdminForTenant(tenant.id);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveDetails = () => {
    saasStorage.updateTenantDetails(tenant.id, {
      name,
      institutionName,
      settings: {
        ...tenant.settings,
        contactEmail,
        contactPhone,
        address,
        timezone,
      },
    });
    setIsEditingDetails(false);
    onUpdate();
  };

  const handleSaveSubscription = () => {
    if (!subscription) return;
    saasStorage.updateSubscription(tenant.id, {
      planId: selectedPlanId,
      expiryDate: new Date(expiryDate).toISOString(),
      gracePeriodDays,
      customLimits: {
        maxTitles,
        maxCopies,
        maxLibrarians,
        maxStudents,
      },
    });
    setIsEditingSub(false);
    onUpdate();
  };

  const handleExecuteResetAdmin = () => {
    if (!libraryAdmin) return;
    try {
      const result = saasStorage.resetLibraryAdminAccount(tenant.id, libraryAdmin.id);
      setGeneratedResetLink(result.resetLink);
    } catch (e: any) {
      alert(e.message || 'Failed to reset admin account');
    }
  };

  const origin = window.location.origin;
  const links = {
    landing: `${origin}/l/${tenant.slug}`,
    adminLogin: `${origin}/l/${tenant.slug}/admin/login`,
    librarianLogin: `${origin}/l/${tenant.slug}/librarian/login`,
    studentLogin: `${origin}/l/${tenant.slug}/student/login`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-xs">
              {tenant.logoInitials}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold tracking-tight">{tenant.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    tenant.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : tenant.status === 'trial'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {tenant.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">/l/{tenant.slug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 flex items-center space-x-1 text-xs">
          {[
            { id: 'overview', label: 'Overview & Details', icon: Building2 },
            { id: 'subscription', label: 'Subscription & Limits', icon: CreditCard },
            { id: 'users', label: 'Staff & Members', icon: Users },
            { id: 'links', label: 'Access URLs & Invitations', icon: ExternalLink },
            { id: 'logs', label: 'Audit Trail', icon: FileClock },
          ].map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-3 px-3.5 font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
                  isSel
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Institutional Profile</h3>
                {!isEditingDetails ? (
                  <button
                    onClick={() => setIsEditingDetails(true)}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsEditingDetails(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDetails}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </div>

              {!isEditingDetails ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                      Official Library Name
                    </span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {tenant.name}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                      Parent Institution
                    </span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                      {tenant.institutionName}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                      Institution Type
                    </span>
                    <span className="font-semibold text-slate-800 mt-0.5 block capitalize">
                      {tenant.institutionType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                      Timezone & Locale
                    </span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {tenant.settings.timezone} ({tenant.settings.dateFormat})
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                      Contact Email
                    </span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {tenant.settings.contactEmail}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                      Phone & Address
                    </span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {tenant.settings.contactPhone} · {tenant.settings.address || 'Not specified'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Library Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Institution Name
                    </label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Usage Statistics Meter */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Current Consumption vs Quota
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Catalogued Titles',
                      used: tenant.currentUsage?.titlesCount || 0,
                      limit: subscription?.customLimits?.maxTitles ?? currentPlan?.maxTitles ?? 1000,
                    },
                    {
                      label: 'Physical Copies',
                      used: tenant.currentUsage?.copiesCount || 0,
                      limit: subscription?.customLimits?.maxCopies ?? currentPlan?.maxCopies ?? 2500,
                    },
                    {
                      label: 'Librarians Staff',
                      used: tenant.currentUsage?.librariansCount || 1,
                      limit: subscription?.customLimits?.maxLibrarians ?? currentPlan?.maxLibrarians ?? 3,
                    },
                    {
                      label: 'Enrolled Students',
                      used: tenant.currentUsage?.studentsCount || 0,
                      limit: subscription?.customLimits?.maxStudents ?? currentPlan?.maxStudents ?? 200,
                    },
                  ].map((stat, i) => {
                    const pct = Math.min(Math.round((stat.used / stat.limit) * 100), 100);
                    return (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-semibold text-slate-600">{stat.label}</div>
                        <div className="text-base font-bold text-slate-900 mt-1">
                          {stat.used.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            / {stat.limit.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              pct > 90 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">{pct}% capacity</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUBSCRIPTION & LIMITS */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Subscription & Plan Tier</h3>
                  <p className="text-xs text-slate-500">
                    Manage tier assignment, renewal dates, and custom resource limits.
                  </p>
                </div>
                {!isEditingSub ? (
                  <button
                    onClick={() => setIsEditingSub(true)}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Change Plan or Limits</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsEditingSub(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveSubscription}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save Subscription</span>
                    </button>
                  </div>
                )}
              </div>

              {!isEditingSub ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                        Active Plan Tier
                      </span>
                      <h4 className="text-lg font-bold text-blue-950 mt-0.5">
                        {currentPlan?.name || 'Standard Campus'}
                      </h4>
                      <p className="text-xs text-blue-800 mt-0.5">
                        Billing:{' '}
                        <strong className="capitalize">{subscription?.billingCycle || 'Annual'}</strong> ·
                        Expiry:{' '}
                        <strong>
                          {subscription?.expiryDate
                            ? new Date(subscription.expiryDate).toLocaleDateString()
                            : 'N/A'}
                        </strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                        {subscription?.status?.toUpperCase()}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Grace Period: {subscription?.gracePeriodDays} days
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Maximum Titles</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {(subscription?.customLimits?.maxTitles ?? currentPlan?.maxTitles)?.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Physical Copies</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {(subscription?.customLimits?.maxCopies ?? currentPlan?.maxCopies)?.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Allowed Librarians</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {subscription?.customLimits?.maxLibrarians ?? currentPlan?.maxLibrarians}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Maximum Students</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {(subscription?.customLimits?.maxStudents ?? currentPlan?.maxStudents)?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Assigned Plan
                    </label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-white"
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.priceMonthly}/mo · ₹{p.priceAnnual}/yr)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Subscription Expiry Date
                      </label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Grace Period (Days)
                      </label>
                      <input
                        type="number"
                        value={gracePeriodDays}
                        onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                        className="w-full px-3 py-1.5 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t">
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Max Titles</label>
                      <input
                        type="number"
                        value={maxTitles}
                        onChange={(e) => setMaxTitles(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Max Copies</label>
                      <input
                        type="number"
                        value={maxCopies}
                        onChange={(e) => setMaxCopies(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Max Librarians</label>
                      <input
                        type="number"
                        value={maxLibrarians}
                        onChange={(e) => setMaxLibrarians(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 mb-1">Max Students</label>
                      <input
                        type="number"
                        value={maxStudents}
                        onChange={(e) => setMaxStudents(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border rounded"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: USERS & RESET ADMIN */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Library Admin Highlight Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {libraryAdmin?.fullName || 'Primary Library Admin'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        Admin (Level 2)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {libraryAdmin?.email} · Phone: {libraryAdmin?.phone || 'N/A'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setGeneratedResetLink(null);
                    setResetModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Reset Admin Account</span>
                </button>
              </div>

              {/* Reset Password Modal Inside */}
              {resetModalOpen && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-3">
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700" />
                      <span>Secure Reset Workflow for {libraryAdmin?.fullName}</span>
                    </span>
                    <button
                      onClick={() => setResetModalOpen(false)}
                      className="text-amber-800 hover:text-amber-950 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-amber-800">
                    This invalidates existing active sessions and creates an expiring single-use password
                    reset token. The Library Admin can use this link to set fresh credentials.
                  </p>

                  {!generatedResetLink ? (
                    <button
                      onClick={handleExecuteResetAdmin}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg cursor-pointer"
                    >
                      Generate Secure Reset Link
                    </button>
                  ) : (
                    <div className="space-y-1.5 pt-2">
                      <span className="font-semibold text-slate-800">Single-Use Reset Link (48h):</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={generatedResetLink}
                          className="w-full font-mono bg-white px-3 py-1.5 rounded border border-amber-300 text-slate-800 select-all"
                        />
                        <button
                          onClick={() => handleCopy(generatedResetLink, 'admin_reset')}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded font-medium flex items-center space-x-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKey === 'admin_reset' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Members List Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Registered Members & Staff in Tenant
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">User</th>
                        <th className="px-4 py-2.5 font-semibold">Role</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                        <th className="px-4 py-2.5 font-semibold">Joined At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersWithMembership.map((item) => (
                        <tr key={item.membership.id}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{item.user.fullName}</div>
                            <div className="text-[11px] text-slate-400">{item.user.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-700 capitalize">
                              {item.membership.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(item.membership.joinedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACCESS URLS & INVITATIONS */}
          {activeTab === 'links' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Tenant-Specific Access URLs
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Isolated URL endpoints permanently bound to this tenant.
                </p>

                <div className="space-y-2.5">
                  {[
                    { label: 'Library Public Landing Page', url: links.landing, key: 'k_land' },
                    { label: 'Library Admin Login (/admin/login)', url: links.adminLogin, key: 'k_adm' },
                    { label: 'Librarian Login (/librarian/login)', url: links.librarianLogin, key: 'k_lib' },
                    { label: 'Student Login (/student/login)', url: links.studentLogin, key: 'k_stu' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-900">{item.label}</div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">
                          {item.url}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleCopy(item.url, item.key)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded font-medium flex items-center space-x-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKey === item.key ? 'Copied' : 'Copy'}</span>
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invitations Table */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Invitations Generated for this Library
                  </h4>
                  <span className="text-xs text-slate-500">
                    {tenantInvitations.length} total invitations
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Recipient</th>
                        <th className="px-4 py-2.5 font-semibold">Role</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                        <th className="px-4 py-2.5 font-semibold">Expires</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenantInvitations.map((inv) => (
                        <tr key={inv.id}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{inv.recipientName}</div>
                            <div className="text-[11px] text-slate-400">{inv.recipientEmail}</div>
                          </td>
                          <td className="px-4 py-3 capitalize">{inv.role.replace('_', ' ')}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                inv.status === 'accepted'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.status === 'pending'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() =>
                                handleCopy(`${origin}/invite/${inv.token}`, `inv_${inv.id}`)
                              }
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium cursor-pointer"
                            >
                              {copiedKey === `inv_${inv.id}` ? 'Copied' : 'Copy Link'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Tenant Activity & Security Audit Trail
              </h3>
              {tenantLogs.length === 0 ? (
                <p className="text-xs text-slate-400">No activity logs recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {tenantLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{log.details}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Actor: {log.actorName} ({log.actorRole})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              navigate(`/l/${tenant.slug}`);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Visit /l/{tenant.slug}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const LibraryDetailModal: React.FC<LibraryDetailModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onUpdate,
}) => {
  if (!isOpen || !tenant) return null;

  return (
    <LibraryDetailModalContent
      key={tenant.id}
      tenant={tenant}
      onClose={onClose}
      onUpdate={onUpdate}
    />
  );
};

