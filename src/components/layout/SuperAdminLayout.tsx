import React, { useState, useEffect } from 'react';
import {
  Building2,
  LayoutDashboard,
  CreditCard,
  Receipt,
  Mail,
  FileClock,
  PlusCircle,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Shield,
  Layers,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useRouter } from '../../router/RouterContext';
import { saasStorage } from '../../services/storage';
import { SubscriptionEnquiry } from '../../types/saas';
import { Logo } from '../common/Logo';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenProvisionModal: () => void;
}

export const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  onOpenProvisionModal,
}) => {
  const { navigate, logoutSuperAdmin, superAdminUser } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tenantSelectorOpen, setTenantSelectorOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeedback, setUpgradeFeedback] = useState<string | null>(null);
  const [modalFilter, setModalFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [testSubmitting, setTestSubmitting] = useState(false);

  const [enquiries, setEnquiries] = useState<SubscriptionEnquiry[]>(() => saasStorage.getSubscriptionEnquiries());
  const tenants = saasStorage.getTenants();
  const subscriptions = saasStorage.getSubscriptions();
  const pendingEnquiriesCount = enquiries.filter((e) => e.status === 'pending').length;

  useEffect(() => {
    const handleUpdate = () => {
      setEnquiries(saasStorage.getSubscriptionEnquiries());
    };
    window.addEventListener('mbt_enquiries_updated', handleUpdate);

    // Initial sync from PostgreSQL DB
    saasStorage
      .syncSubscriptionEnquiriesFromApi()
      .then((list) => {
        setEnquiries(list);
      })
      .catch(() => {});

    // Polling every 4 seconds to sync any customer upgrade requests from database
    const interval = setInterval(() => {
      saasStorage
        .syncSubscriptionEnquiriesFromApi()
        .then((list) => {
          setEnquiries(list);
        })
        .catch(() => {});
    }, 4000);

    return () => {
      window.removeEventListener('mbt_enquiries_updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Impending expiries count (next 14 days)
  const now = new Date().getTime();
  const impendingExpiries = subscriptions.filter((s) => {
    const exp = new Date(s.expiryDate).getTime();
    const daysLeft = (exp - now) / (1000 * 3600 * 24);
    return daysLeft >= 0 && daysLeft <= 14 && s.status !== 'suspended';
  });

  const navItems = [
    {
      id: 'overview',
      label: 'Platform Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'libraries',
      label: 'Library Tenants',
      icon: Building2,
      badge: tenants.length.toString(),
    },
    {
      id: 'plans',
      label: 'Subscription Plans',
      icon: Layers,
      badge: pendingEnquiriesCount > 0 ? `${pendingEnquiriesCount} Requests` : null,
      badgeColor: 'bg-blue-600 text-white font-bold',
    },
    {
      id: 'billing',
      label: 'Billing & Invoices',
      icon: Receipt,
      badge: impendingExpiries.length > 0 ? `${impendingExpiries.length} Alerts` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    {
      id: 'invitations',
      label: 'Access & Invitations',
      icon: Mail,
      badge: null,
    },
    {
      id: 'logs',
      label: 'Audit & Activity Logs',
      icon: FileClock,
      badge: null,
    },
  ];

  const handleNavClick = (tabId: string) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
    navigate(`/super-admin?tab=${tabId}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-800">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center space-x-2 min-w-0">
          <Logo size={30} showText={true} subtext="Super Admin" />
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onOpenProvisionModal}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-25 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - MBT Navy Blue Design System */}
      <aside
        className={`fixed md:sticky top-0 z-30 h-screen w-72 md:w-64 lg:w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800/80 transition-transform duration-200 ease-in-out md:translate-x-0 shrink-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80">
          <Logo size={38} showText={true} subtext="Level 1: Platform Owner" />

          {/* Quick System Badge */}
          <div className="mt-4 px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300 font-medium">Multi-Tenant Core</span>
            </div>
            <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900">
              {tenants.length} Tenants
            </span>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenProvisionModal();
            }}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow transition-all group cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>Add New Library</span>
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Platform Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                      item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tenant Quick Links
          </div>
          {/* Quick jump to individual tenant portals */}
          <div className="space-y-0.5">
            {tenants.slice(0, 3).map((tenant) => (
              <a
                key={tenant.id}
                href={`/l/${tenant.slug}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/l/${tenant.slug}`);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors group"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 group-hover:bg-blue-900 group-hover:text-blue-200">
                    {tenant.logoInitials}
                  </span>
                  <span className="truncate">{tenant.name}</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </nav>

        {/* Super Admin User Profile & Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {superAdminUser?.fullName || 'Super Administrator'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {superAdminUser?.email || 'superadmin@mbtlibrary.com'}
                </div>
              </div>
            </div>
            <button
              onClick={logoutSuperAdmin}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-3.5 sticky top-0 z-20 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 truncate">
                <span className="hidden xs:inline">Platform Owner</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden xs:inline" />
                <span className="font-semibold text-slate-700 capitalize truncate">
                  {activeTab.replace('_', ' ')}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight capitalize truncate">
                {activeTab === 'overview'
                  ? 'Super Admin Dashboard'
                  : activeTab === 'libraries'
                  ? 'Library Management'
                  : activeTab === 'plans'
                  ? 'Subscription Plans'
                  : activeTab === 'billing'
                  ? 'Billing & Invoices'
                  : activeTab === 'invitations'
                  ? 'Platform Access & Invitations'
                  : 'Platform Activity Audit'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Upgrade Requests Button - Always visible, first button in header options */}
            <button
              type="button"
              onClick={() => {
                setShowUpgradeModal(true);
                saasStorage
                  .syncSubscriptionEnquiriesFromApi()
                  .then((list) => setEnquiries(list))
                  .catch(() => {});
              }}
              className={`inline-flex items-center space-x-1.5 px-3 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer active:scale-95 shadow-xs ${
                pendingEnquiriesCount > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
              title={
                pendingEnquiriesCount > 0
                  ? `${pendingEnquiriesCount} pending customer upgrade request(s) - Click to review and activate`
                  : 'View customer upgrade requests and plan upgrades'
              }
            >
              <Sparkles
                className={`w-3.5 h-3.5 ${
                  pendingEnquiriesCount > 0 ? 'text-amber-300 animate-pulse' : 'text-slate-500'
                }`}
              />
              <span>Upgrade Requests</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  pendingEnquiriesCount > 0
                    ? 'bg-amber-400 text-slate-900 animate-pulse'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {pendingEnquiriesCount}
              </span>
            </button>

            {/* Quick action button */}
            <button
              type="button"
              onClick={onOpenProvisionModal}
              className="inline-flex items-center space-x-1.5 px-3 sm:px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg shadow-xs hover:shadow transition-all cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Create Library</span>
            </button>

            {/* Direct Tenant View Selector */}
            <div className="relative">
              <button
                onClick={() => setTenantSelectorOpen(!tenantSelectorOpen)}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="hidden sm:inline">Preview Tenant Portal</span>
                <span className="sm:hidden text-xs">Portals</span>
              </button>

              {tenantSelectorOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setTenantSelectorOpen(false)}
                >
                  <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch to Tenant View
                  </div>
                  <div className="py-1 max-h-64 overflow-y-auto space-y-1">
                    {tenants.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => navigate(`/l/${t.slug}`)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-100 flex items-center justify-between group cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-slate-800 truncate">{t.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">/l/{t.slug}</div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3.5 sm:p-5 md:p-6 max-w-7xl w-full mx-auto space-y-4 sm:space-y-6 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Quick Upgrade Requests Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-4 animate-in fade-in duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                    <span>Customer Upgrade & Quota Requests</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Cloud SQL Connected
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Requests submitted by library admins and expired institutions seeking plan activation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {upgradeFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{upgradeFeedback}</span>
              </div>
            )}

            {/* Filter Tabs & Test Generator */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setModalFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                    modalFilter === 'pending'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Pending</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      pendingEnquiriesCount > 0 ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {pendingEnquiriesCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                    modalFilter === 'approved'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Approved</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                    {enquiries.filter((e) => e.status === 'approved').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                    modalFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>All Requests</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                    {enquiries.length}
                  </span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={testSubmitting}
                  onClick={async () => {
                    setTestSubmitting(true);
                    try {
                      const target =
                        tenants.find((t) => t.status === 'deactivated' || t.status === 'trial') ||
                        tenants[0] || {
                          id: 'ten_demo',
                          slug: 'demo-library',
                          name: 'Demo Library',
                        };
                      const payload = {
                        tenantId: target.id,
                        tenantSlug: target.slug,
                        tenantName: target.name,
                        contactName: 'Library Administrator',
                        contactEmail: `admin@${target.slug}.org`,
                        contactPhone: '+91 98765 00000',
                        requestedPlan: 'premium',
                        estimatedTitles: 5000,
                        estimatedCopies: 7500,
                        estimatedLibrarians: 5,
                        estimatedStudents: 750,
                        estimatedStorageMb: 2048,
                        message: `Customer requesting full authority upgrade for "${target.name}".`,
                      };

                      await fetch('/api/enquiries', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      });
                      saasStorage.createSubscriptionEnquiry(payload);
                      const list = await saasStorage.syncSubscriptionEnquiriesFromApi();
                      setEnquiries(list);
                      setUpgradeFeedback(`✓ Created customer upgrade request for "${target.name}" and saved to database!`);
                      setTimeout(() => setUpgradeFeedback(null), 5000);
                    } catch (err: any) {
                      setUpgradeFeedback(`Failed to create test request: ${err.message}`);
                    } finally {
                      setTestSubmitting(false);
                    }
                  }}
                  className="inline-flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer active:scale-95 transition-all"
                  title="Simulate a customer submitting an upgrade request to verify database workflow"
                >
                  {testSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>+ Test Customer Request</span>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 divide-y divide-slate-100 pr-1">
              {enquiries.filter((e) =>
                modalFilter === 'pending'
                  ? e.status === 'pending'
                  : modalFilter === 'approved'
                  ? e.status === 'approved'
                  : true
              ).length === 0 ? (
                <div className="py-10 text-center text-slate-500 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">
                    {modalFilter === 'pending'
                      ? 'All Upgrade Requests Processed!'
                      : 'No requests found for this filter.'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {modalFilter === 'pending'
                      ? 'No pending upgrade requests from customer libraries. Use "+ Test Customer Request" to simulate a customer request.'
                      : 'Switch filters or submit a new test enquiry.'}
                  </p>
                </div>
              ) : (
                enquiries
                  .filter((e) =>
                    modalFilter === 'pending'
                      ? e.status === 'pending'
                      : modalFilter === 'approved'
                      ? e.status === 'approved'
                      : true
                  )
                  .map((enq) => {
                    const isPending = enq.status === 'pending';
                    const isApproved = enq.status === 'approved';
                    const isApproving = approvingId === enq.id;

                    return (
                      <div key={enq.id} className="pt-3.5 first:pt-0 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{enq.tenantName}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  (enq.requestedPlan || '').toLowerCase() === 'premium'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : (enq.requestedPlan || '').toLowerCase() === 'standard'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                Requested Plan: {enq.requestedPlan || 'Standard'}
                              </span>

                              {isApproved ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                                  <Check className="w-3 h-3" />
                                  <span>Active & Approved</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending Approval</span>
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-600">
                              Representative:{' '}
                              <strong className="text-slate-800">{enq.contactName}</strong> (
                              <span className="text-blue-600">{enq.contactEmail}</span>
                              {enq.contactPhone ? ` · ${enq.contactPhone}` : ''})
                            </div>

                            {(enq.estimatedTitles || enq.estimatedCopies || enq.estimatedStudents) && (
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-medium">
                                <span className="text-slate-500">Requested Quotas:</span>
                                {enq.estimatedTitles && (
                                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {enq.estimatedTitles.toLocaleString()} Titles
                                  </span>
                                )}
                                {enq.estimatedCopies && (
                                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {enq.estimatedCopies.toLocaleString()} Copies
                                  </span>
                                )}
                                {enq.estimatedLibrarians && (
                                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {enq.estimatedLibrarians} Staff
                                  </span>
                                )}
                                {enq.estimatedStudents && (
                                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {enq.estimatedStudents} Patrons
                                  </span>
                                )}
                                {enq.estimatedStorageMb && (
                                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {enq.estimatedStorageMb} MB Storage
                                  </span>
                                )}
                              </div>
                            )}

                            {enq.message && (
                              <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200">
                                &quot;{enq.message}&quot;
                              </p>
                            )}

                            <div className="text-[11px] text-slate-400">
                              Submitted: {new Date(enq.createdAt).toLocaleString()}
                              {enq.tenantSlug && (
                                <span className="ml-2 font-mono text-slate-500">/l/{enq.tenantSlug}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                            {isPending ? (
                              <button
                                type="button"
                                disabled={isApproving}
                                onClick={async () => {
                                  setApprovingId(enq.id);
                                  try {
                                    const res = await saasStorage.approveSubscriptionEnquiryAsync(enq.id);
                                    if (res.success) {
                                      setUpgradeFeedback(
                                        `✓ Successfully activated and upgraded "${res.tenantName}" to plan ${res.planName}! Saved to PostgreSQL database.`
                                      );
                                      const updated = saasStorage.getSubscriptionEnquiries();
                                      setEnquiries(updated);
                                      setTimeout(() => setUpgradeFeedback(null), 6000);
                                    }
                                  } catch (err: any) {
                                    setUpgradeFeedback(`Error approving: ${err.message}`);
                                  } finally {
                                    setApprovingId(null);
                                  }
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 active:scale-95 transition-all"
                              >
                                {isApproving ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>{isApproving ? 'Activating...' : 'Approve & Activate'}</span>
                              </button>
                            ) : (
                              <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center space-x-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Activated</span>
                              </div>
                            )}

                            {enq.tenantSlug && (
                              <button
                                type="button"
                                onClick={() => navigate(`/l/${enq.tenantSlug}`)}
                                className="text-[11px] text-slate-600 hover:text-blue-600 font-medium flex items-center space-x-1"
                              >
                                <span>Preview Library</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  onTabChange('plans');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
              >
                Go to Full Subscriptions & Plans Manager →
              </button>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
