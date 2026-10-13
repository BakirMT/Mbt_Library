import React, { useState } from 'react';
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
} from 'lucide-react';
import { useRouter } from '../../router/RouterContext';
import { saasStorage } from '../../services/storage';

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

  const tenants = saasStorage.getTenants();
  const subscriptions = saasStorage.getSubscriptions();

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
      badge: null,
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
      <div className="md:hidden bg-slate-900 text-white flex items-center justify-between px-4 py-3 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
            M
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide leading-none">MBT LIBRARY</div>
            <div className="text-[10px] text-blue-400 font-medium tracking-wider">SUPER ADMIN SAAS</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenProvisionModal}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md flex items-center space-x-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
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
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-900/30">
              M
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">MBT LIBRARY</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  SAAS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">Level 1: Platform Owner</p>
            </div>
          </div>

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
            {/* Quick action button */}
            <button
              onClick={onOpenProvisionModal}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 sm:px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-xs hover:shadow transition-colors cursor-pointer"
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
    </div>
  );
};
