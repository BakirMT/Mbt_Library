/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RouterProvider, useRouter } from './router/RouterContext';
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { DashboardOverview } from './components/superAdmin/DashboardOverview';
import { LibraryManagement } from './components/superAdmin/LibraryManagement';
import { SubscriptionPlansManager } from './components/superAdmin/SubscriptionPlansManager';
import { BillingInvoicesManager } from './components/superAdmin/BillingInvoicesManager';
import { InvitationsManager } from './components/superAdmin/InvitationsManager';
import { ActivityLogsView } from './components/superAdmin/ActivityLogsView';
import { ProvisionLibraryModal } from './components/superAdmin/ProvisionLibraryModal';
import { SuperAdminLogin } from './components/auth/SuperAdminLogin';
import { TenantLandingPage } from './components/tenant/TenantLandingPage';
import { TenantLogin } from './components/tenant/TenantLogin';
import { LibraryAdminPortal } from './components/tenant/LibraryAdminPortal';
import { LibrarianPortal } from './components/tenant/LibrarianPortal';
import { StudentPortal } from './components/tenant/StudentPortal';
import { AcceptInvitationPage } from './components/invitation/AcceptInvitationPage';
import { ExpiredLibraryPage } from './components/tenant/ExpiredLibraryPage';
import { PublicHomePage } from './components/public/PublicHomePage';
import { PlansPage } from './components/public/PlansPage';
import { FeaturesPage } from './components/public/FeaturesPage';
import { ContactPage } from './components/public/ContactPage';
import { LoginAuthPage } from './components/public/LoginAuthPage';
import { RegisterAuthPage } from './components/public/RegisterAuthPage';
import { VerifyOtpPage } from './components/public/VerifyOtpPage';
import { CheckoutRegistrationPage } from './components/public/CheckoutRegistrationPage';
import { Building2, ShieldCheck, BookOpen, Users, ArrowRight, Lock, ArrowLeft, AlertTriangle } from 'lucide-react';
import { saasStorage } from './services/storage';

const AppContent: React.FC = () => {
  const { route, superAdminUser, activeTenant, navigate } = useRouter();
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(route.tab || 'overview');

  // Sync activeTab if route changes
  React.useEffect(() => {
    if (route.tab && route.tab !== activeTab) {
      setActiveTab(route.tab);
    }
  }, [route.tab]);

  // Public Website & Auth Routes
  if (route.type === 'home') return <PublicHomePage />;
  if (route.type === 'plans') return <PlansPage />;
  if (route.type === 'features') return <FeaturesPage />;
  if (route.type === 'contact') return <ContactPage />;
  if (route.type === 'login') return <LoginAuthPage />;
  if (route.type === 'register') return <RegisterAuthPage />;
  if (route.type === 'verify') return <VerifyOtpPage />;
  if (route.type === 'checkout') return <CheckoutRegistrationPage />;

  // 1. Acceptance of invitation: /invite/:token
  if (route.type === 'accept_invitation' && route.inviteToken) {
    return <AcceptInvitationPage token={route.inviteToken} />;
  }

  // 2. Multi-Tenant Routes (/l/:slug/...)
  if (route.tenantSlug) {
    // Run automated trial expiration check (trusted server/storage timestamp)
    saasStorage.checkAndEnforceTrialExpirations();
    const targetTenant = activeTenant || saasStorage.getTenantBySlug(route.tenantSlug);

    // If tenant does not exist
    if (!targetTenant) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-center font-sans">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Library Not Found</h2>
            <p className="text-xs text-slate-500">
              No library is registered under slug <code className="font-mono text-rose-600">/l/{route.tenantSlug}</code>.
            </p>
            <div className="pt-2 space-y-2">
              <button
                onClick={() => navigate('/super-admin')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Go to MBT Super Admin Portal
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Check Subscription & Expiry Status (Strict 72-Hour Trial Enforcement)
    const subscription = saasStorage.getSubscriptionForTenant(targetTenant.id);
    const now = Date.now();
    const isFreeOrTrial = subscription ? (subscription.planId === 'plan_free' || subscription.status === 'trial') : false;
    const isTrialExpired = subscription ? (isFreeOrTrial && now >= new Date(subscription.expiryDate).getTime()) : false;
    const isDeactivatedOrExpired = targetTenant.status === 'deactivated' || subscription?.status === 'expired' || isTrialExpired;

    // Requirement 2 & 4: Dedicated Expired Library Page
    // Blocks public landing page, catalogue, Library Admin dashboard, Librarian portal, and Student portal.
    // Existing sessions cannot bypass this check.
    if (isDeactivatedOrExpired) {
      return <ExpiredLibraryPage tenant={targetTenant} />;
    }

    // Requirement 7 & 8: Separately Suspended Library Check
    if (targetTenant.status === 'suspended') {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center font-sans text-white">
          <div className="bg-slate-800 rounded-3xl p-8 max-w-md w-full border border-slate-700 shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Institutional Access Suspended
              </span>
              <h2 className="text-xl font-black text-white">{targetTenant.name}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Access to this library has been suspended by the MBT Library authority. All portal activities and catalogue queries are disabled until reactivated by the Super Admin.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate('/super-admin')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Go to MBT Super Admin Portal
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Active Library: Render Respective Pages / Portals
    if (route.type === 'tenant_landing') {
      return <TenantLandingPage tenant={targetTenant} />;
    }

    if (
      route.type === 'tenant_admin_login' ||
      route.type === 'tenant_librarian_login' ||
      route.type === 'tenant_student_login'
    ) {
      const role =
        route.type === 'tenant_admin_login'
          ? 'admin'
          : route.type === 'tenant_librarian_login'
          ? 'librarian'
          : 'student';

      return <TenantLogin tenant={targetTenant} role={role} />;
    }

    if (route.type === 'tenant_admin_portal') {
      return <LibraryAdminPortal tenant={targetTenant} />;
    }

    if (route.type === 'tenant_librarian_portal') {
      return <LibrarianPortal tenant={targetTenant} />;
    }

    if (route.type === 'tenant_student_portal') {
      return <StudentPortal tenant={targetTenant} />;
    }
  }

  // 5. Super Admin Login
  if (route.type === 'super_admin_login' || !superAdminUser) {
    return <SuperAdminLogin />;
  }

  // 6. Super Admin Dashboard & Management: /super-admin
  return (
    <SuperAdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onOpenProvisionModal={() => setProvisionModalOpen(true)}
    >
      {activeTab === 'overview' && (
        <DashboardOverview
          onOpenProvisionModal={() => setProvisionModalOpen(true)}
          onNavigateTab={setActiveTab}
        />
      )}

      {activeTab === 'libraries' && (
        <LibraryManagement onOpenProvisionModal={() => setProvisionModalOpen(true)} />
      )}

      {activeTab === 'plans' && <SubscriptionPlansManager />}

      {activeTab === 'billing' && <BillingInvoicesManager />}

      {activeTab === 'invitations' && <InvitationsManager />}

      {activeTab === 'logs' && <ActivityLogsView />}

      {/* Global Provisioning Wizard Modal */}
      <ProvisionLibraryModal
        isOpen={provisionModalOpen}
        onClose={() => setProvisionModalOpen(false)}
        onSuccess={(newTenant) => {
          // Handled inside modal's confirmation step
        }}
      />
    </SuperAdminLayout>
  );
};

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}
