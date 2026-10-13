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
import { Building2, ShieldCheck, BookOpen, Users, ArrowRight, Lock, ArrowLeft } from 'lucide-react';
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

  // 1. Acceptance of invitation: /invite/:token
  if (route.type === 'accept_invitation' && route.inviteToken) {
    return <AcceptInvitationPage token={route.inviteToken} />;
  }

  // 2. Tenant Landing Page: /l/:slug
  if (route.type === 'tenant_landing') {
    if (activeTenant) {
      return <TenantLandingPage tenant={activeTenant} />;
    }
    // Tenant not found
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

  // 3. Tenant-Specific Login Portals:
  // /l/:slug/admin/login, /l/:slug/librarian/login, /l/:slug/student/login
  if (
    route.type === 'tenant_admin_login' ||
    route.type === 'tenant_librarian_login' ||
    route.type === 'tenant_student_login'
  ) {
    const targetTenant = activeTenant || saasStorage.getTenantBySlug(route.tenantSlug || '');
    if (!targetTenant) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center text-white">
          <div className="bg-slate-800 p-8 rounded-2xl max-w-md w-full space-y-3">
            <h2 className="text-lg font-bold">Library Not Found</h2>
            <p className="text-xs text-slate-400">The requested library slug does not exist.</p>
            <button
              onClick={() => navigate('/super-admin')}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg"
            >
              Back to Super Admin
            </button>
          </div>
        </div>
      );
    }

    const role =
      route.type === 'tenant_admin_login'
        ? 'admin'
        : route.type === 'tenant_librarian_login'
        ? 'librarian'
        : 'student';

    return <TenantLogin tenant={targetTenant} role={role} />;
  }

  // 4. Tenant-Specific Logged-In Portals (Level 2, Level 3, Level 4):
  // /l/:slug/admin
  if (route.type === 'tenant_admin_portal') {
    const targetTenant = activeTenant || saasStorage.getTenantBySlug(route.tenantSlug || '');
    if (!targetTenant) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl text-center">Library Not Found</div>
        </div>
      );
    }
    return <LibraryAdminPortal tenant={targetTenant} />;
  }

  // /l/:slug/librarian
  if (route.type === 'tenant_librarian_portal') {
    const targetTenant = activeTenant || saasStorage.getTenantBySlug(route.tenantSlug || '');
    if (!targetTenant) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl text-center">Library Not Found</div>
        </div>
      );
    }
    return <LibrarianPortal tenant={targetTenant} />;
  }

  // /l/:slug/student
  if (route.type === 'tenant_student_portal') {
    const targetTenant = activeTenant || saasStorage.getTenantBySlug(route.tenantSlug || '');
    if (!targetTenant) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl text-center">Library Not Found</div>
        </div>
      );
    }
    return <StudentPortal tenant={targetTenant} />;
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
