import React, { useState } from 'react';
import {
  Building2,
  Users,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Layers,
  BookOpen,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileText,
  UserCheck,
  Database,
  Lock,
} from 'lucide-react';
import { saasStorage } from '../../services/storage';
import { useRouter } from '../../router/RouterContext';
import { SubscriptionEnquiry } from '../../types/saas';

interface DashboardOverviewProps {
  onOpenProvisionModal: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onOpenProvisionModal,
  onNavigateTab,
}) => {
  const { navigate } = useRouter();
  const [reminderStatus, setReminderStatus] = useState<Record<string, string>>({});
  const [enquiries, setEnquiries] = useState<SubscriptionEnquiry[]>(() => saasStorage.getSubscriptionEnquiries());
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    const handleUpdate = () => {
      setEnquiries(saasStorage.getSubscriptionEnquiries());
    };
    window.addEventListener('mbt_enquiries_updated', handleUpdate);

    saasStorage
      .syncSubscriptionEnquiriesFromApi()
      .then((list) => {
        setEnquiries(list);
      })
      .catch(() => {});

    return () => window.removeEventListener('mbt_enquiries_updated', handleUpdate);
  }, []);

  const pendingEnquiries = enquiries.filter((e) => e.status === 'pending');

  const handleQuickApprove = async (enquiryId: string) => {
    const res = await saasStorage.approveSubscriptionEnquiryAsync(enquiryId);
    if (res.success) {
      setActionFeedback(
        `Approved upgrade for "${res.tenantName}"! Subscription updated to ${res.planName} & library access reactivated in database.`
      );
      setEnquiries(saasStorage.getSubscriptionEnquiries());
      setTimeout(() => setActionFeedback(null), 6000);
    }
  };

  const tenants = saasStorage.getTenants();
  const subscriptions = saasStorage.getSubscriptions();
  const invoices = saasStorage.getInvoices();
  const logs = saasStorage.getActivityLogs();
  const users = saasStorage.getUsers();
  const memberships = saasStorage.getMemberships();

  // Aggregated Metrics
  const totalLibraries = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === 'active').length;
  const trialTenants = tenants.filter((t) => t.status === 'trial').length;
  const deactivatedTenants = tenants.filter((t) => t.status === 'deactivated').length;
  const suspendedTenants = tenants.filter((t) => t.status === 'suspended').length;
  const archivedTenants = tenants.filter((t) => t.status === 'archived').length;

  // Users across all tenants
  const libraryAdmins = memberships.filter((m) => m.role === 'library_admin' && m.isActive).length;
  const librariansTotal = tenants.reduce((acc, t) => acc + (t.currentUsage?.librariansCount || 0), 0);
  const studentsTotal = tenants.reduce((acc, t) => acc + (t.currentUsage?.studentsCount || 0), 0);
  const titlesTotal = tenants.reduce((acc, t) => acc + (t.currentUsage?.titlesCount || 0), 0);
  const copiesTotal = tenants.reduce((acc, t) => acc + (t.currentUsage?.copiesCount || 0), 0);

  // Revenue calculation
  const totalRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((acc, inv) => acc + inv.amount, 0);

  const pendingRevenue = invoices
    .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
    .reduce((acc, inv) => acc + inv.amount, 0);

  // Subscriptions expiring within 14 days or currently expired
  const now = new Date().getTime();
  const expiringSubscriptions = subscriptions
    .filter((sub) => {
      const expDate = new Date(sub.expiryDate).getTime();
      const daysRemaining = (expDate - now) / (1000 * 3600 * 24);
      return (daysRemaining <= 14 || sub.status === 'expired') && sub.status !== 'cancelled';
    })
    .map((sub) => {
      const tenant = tenants.find((t) => t.id === sub.tenantId);
      const plan = saasStorage.getPlanById(sub.planId);
      const daysLeft = Math.ceil((new Date(sub.expiryDate).getTime() - now) / (1000 * 3600 * 24));
      return {
        ...sub,
        tenant,
        plan,
        daysLeft,
      };
    })
    .sort((a, b) => {
      if (a.status === 'expired' && b.status !== 'expired') return -1;
      if (b.status === 'expired' && a.status !== 'expired') return 1;
      return a.daysLeft - b.daysLeft;
    });

  const handleSendReminder = (tenantId: string) => {
    const success = saasStorage.sendSubscriptionExpiryReminder(tenantId);
    if (success) {
      setReminderStatus((prev) => ({ ...prev, [tenantId]: 'Sent!' }));
      setTimeout(() => {
        setReminderStatus((prev) => {
          const next = { ...prev };
          delete next[tenantId];
          return next;
        });
      }, 3500);
    }
  };

  // Institution Types Breakdown
  const typeCounts = tenants.reduce((acc: Record<string, number>, t) => {
    acc[t.institutionType] = (acc[t.institutionType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Welcome & Platform Notice Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-xl p-6 text-white shadow-sm border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Central SaaS Multi-Tenant Control</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            MBT Library Management SaaS Platform
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
            Centrally manage independent schools, colleges, universities, Islamic institutions,
            and public libraries. Each institution operates with dedicated tenant routes, isolated
            catalogue limits, and separate role access.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenProvisionModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Provision New Library</span>
          </button>
          <button
            onClick={() => onNavigateTab('libraries')}
            className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <span>View All Tenants</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Registered Libraries */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Registered Libraries
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{totalLibraries}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              100% active
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              <strong className="text-slate-800">{activeTenants}</strong> Active ·{' '}
              <strong className="text-blue-700">{trialTenants}</strong> Trial
            </span>
            <span>
              {deactivatedTenants > 0 && (
                <strong className="text-rose-600 mr-2">{deactivatedTenants} Expired</strong>
              )}
              <strong className="text-amber-600">{suspendedTenants}</strong> Suspended
            </span>
          </div>
        </div>

        {/* Metric 2: Subscriptions & MRR */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Subscription Revenue
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500">collected</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Pending: <strong className="text-amber-600">₹{pendingRevenue.toLocaleString('en-IN')}</strong>
            </span>
            <button
              onClick={() => onNavigateTab('billing')}
              className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
            >
              Invoices →
            </button>
          </div>
        </div>

        {/* Metric 3: Total Platform Users */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Global Platform Users
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">
              {(studentsTotal + librariansTotal + libraryAdmins).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">across tenants</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              <strong className="text-slate-800">{studentsTotal.toLocaleString()}</strong> Students
            </span>
            <span>
              <strong className="text-slate-800">{librariansTotal}</strong> Staff ·{' '}
              <strong className="text-slate-800">{libraryAdmins}</strong> Admins
            </span>
          </div>
        </div>

        {/* Metric 4: Books & Inventory Managed */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Managed Volumes
            </span>
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">
              {copiesTotal.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">copies</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Unique Titles: <strong className="text-slate-800">{titlesTotal.toLocaleString()}</strong>
            </span>
            <span className="text-emerald-600 font-semibold">Isolated</span>
          </div>
        </div>
      </div>

      {/* Relational Database, Row Level Security & Server-Side Limits Architecture Status */}
      <div className="bg-gradient-to-r from-blue-900/90 via-slate-900 to-indigo-950 rounded-xl p-5 text-white border border-blue-500/30 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-tight text-white">Relational Cloud SQL (PostgreSQL 16)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  CONNECTED · us-west1
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Managed relational database with multi-tenant Row Level Security (RLS) policies and server-side subscription limits.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-blue-300 bg-blue-950/80 px-2.5 py-1 rounded border border-blue-800">
            13 Relational Tables Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Row Level Security (RLS)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">ENFORCED</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Tenant tables (<code className="text-blue-300">books</code>, <code className="text-blue-300">loans</code>, <code className="text-blue-300">copies</code>, <code className="text-blue-300">memberships</code>) evaluate <code className="text-blue-300">app.current_tenant_id</code> to strictly isolate data across institutions.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Server-Side Quota Meters</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">ACTIVE</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Every insert verifies active subscription grace periods, maximum titles quota, staff count limits, and per-student loan capacities.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center space-x-1">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>Subscription Lifecycle</span>
              </span>
              <span className="text-[10px] text-amber-300 font-bold">AUTO-MANAGED</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Trial durations, grace periods, plan renewals, and manual payment confirmations are recorded directly into relational ledger tables.
            </p>
          </div>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Customer Upgrade Requests & Enquiries Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-blue-50/60 to-indigo-50/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Customer Upgrade & License Requests
                </h3>
                {pendingEnquiries.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider animate-pulse">
                    {pendingEnquiries.length} New Action Required
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Incoming upgrade requests submitted by library administrators and expired institutions
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('plans')}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Configure All Plans</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {enquiries.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No upgrade requests at this moment.</p>
            <p className="text-xs text-slate-400">When customers click &quot;Submit Upgrade Request&quot; on expired pages or in their portal, their requests will appear here instantly.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 font-semibold">Library / Institution</th>
                  <th className="px-5 py-3 font-semibold">Contact Person</th>
                  <th className="px-5 py-3 font-semibold">Requested Plan</th>
                  <th className="px-5 py-3 font-semibold">Message / Reason</th>
                  <th className="px-5 py-3 font-semibold">Request Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enquiries.slice(0, 8).map((enq) => {
                  const isPending = enq.status === 'pending';
                  const reqPlanUpper = (enq.requestedPlan || 'Standard').toUpperCase();

                  return (
                    <tr key={enq.id} className={`transition-colors ${isPending ? 'bg-blue-50/20 hover:bg-blue-50/40' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{enq.tenantName}</div>
                        {enq.tenantSlug && (
                          <div className="text-[11px] text-slate-400 font-mono">/l/{enq.tenantSlug}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{enq.contactName}</div>
                        <div className="text-[11px] text-slate-500">{enq.contactEmail}</div>
                        {enq.contactPhone && (
                          <div className="text-[11px] text-slate-400">{enq.contactPhone}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          {reqPlanUpper}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs text-slate-600">
                        <p className="truncate text-[11px]" title={enq.message || ''}>
                          {enq.message || 'Trial expired. Requesting license activation.'}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {new Date(enq.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {enq.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(enq.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Approve & Activate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigateTab('plans')}
                              className="inline-flex items-center px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              Configure
                            </button>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-bold text-xs inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Activated</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription Expiry Alerts Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Subscription Expiry & Renewal Alerts
              </h3>
              <p className="text-xs text-slate-500">
                Libraries with subscriptions or trial periods ending in the next 14 days
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            {expiringSubscriptions.length} Actions Required
          </span>
        </div>

        {expiringSubscriptions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium">No impending subscription expiries.</p>
            <p className="text-xs text-slate-400">All tenant subscriptions are healthy and active.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 font-semibold">Library / Institution</th>
                  <th className="px-5 py-3 font-semibold">Current Plan</th>
                  <th className="px-5 py-3 font-semibold">Expiry Date</th>
                  <th className="px-5 py-3 font-semibold">Days Remaining</th>
                  <th className="px-5 py-3 font-semibold">Grace Period</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiringSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{sub.tenant?.name}</div>
                      <div className="text-[11px] text-slate-400">/l/{sub.tenant?.slug}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-700">{sub.plan?.name}</span>
                      <span className="block text-[10px] text-slate-400 uppercase">
                        {sub.billingCycle}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(sub.expiryDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          sub.status === 'expired' || sub.tenant?.status === 'deactivated'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                            : sub.daysLeft <= 5
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <Clock className="w-3 h-3 mr-1 shrink-0" />
                        {sub.status === 'expired' || sub.tenant?.status === 'deactivated'
                          ? 'Trial Expired (Deactivated)'
                          : sub.daysLeft <= 0
                          ? 'Expires Today'
                          : `${sub.daysLeft} days left`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {sub.gracePeriodDays} days allowed
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {sub.status === 'expired' && (
                          <button
                            type="button"
                            onClick={() => {
                              saasStorage.extendTrial(sub.tenantId, 72, 'Super Admin manual trial extension from Dashboard alert');
                              onNavigateTab('libraries');
                            }}
                            title="Extend 72-Hour Trial"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-xs transition-colors cursor-pointer"
                          >
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>Extend +72h</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSendReminder(sub.tenantId)}
                          disabled={!!reminderStatus[sub.tenantId]}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded text-xs transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <Send className="w-3 h-3 shrink-0" />
                          <span>{reminderStatus[sub.tenantId] || 'Send Alert'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('libraries')}
                          className="inline-flex items-center px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-xs transition-colors cursor-pointer"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid: Institution Types Distribution & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Institution Type & Subscription Health (1 col) */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Institutions by Sector
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Breakdown of supported multi-tenant facilities
            </p>

            <div className="space-y-2.5">
              {[
                { type: 'Islamic Institutions & Madrasas', count: typeCounts['islamic_institution'] || 0, color: 'bg-emerald-500' },
                { type: 'Colleges & Higher Education', count: typeCounts['college'] || 0, color: 'bg-blue-600' },
                { type: 'Primary & Secondary Schools', count: typeCounts['school'] || 0, color: 'bg-sky-500' },
                { type: 'Public & Municipal Libraries', count: typeCounts['public_library'] || 0, color: 'bg-amber-500' },
                { type: 'Research & Specialized Centers', count: typeCounts['research_center'] || 0, color: 'bg-purple-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-slate-700 font-medium">{item.type}</span>
                  </div>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm">Quick Provision Checklist</h3>
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>Isolated tenant slug automatically generated</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>Initial Library Admin account provisioned</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>Single-use invitation token created</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>Custom storage and book limits assigned</span>
              </li>
            </ul>
            <button
              onClick={onOpenProvisionModal}
              className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Start Provision Wizard
            </button>
          </div>
        </div>

        {/* Right Column: Recent Platform Activity Logs (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Recent Platform Activity & Audit Feed
              </h3>
              <p className="text-xs text-slate-500">
                Real-time security and management events across all library tenants
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              View Full Audit Log →
            </button>
          </div>

          <div className="space-y-3.5 flex-1">
            {logs.slice(0, 6).map((log) => (
              <div
                key={log.id}
                className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50/70 hover:bg-slate-100/60 transition-colors border border-slate-100 text-xs"
              >
                <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold mt-0.5">
                  {log.category === 'provisioning' ? (
                    <Building2 className="w-3.5 h-3.5" />
                  ) : log.category === 'subscription' ? (
                    <CreditCard className="w-3.5 h-3.5" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 truncate">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs mt-0.5">{log.details}</p>
                  <div className="mt-1 flex items-center space-x-2 text-[10px] text-slate-500">
                    {log.tenantName && (
                      <span className="font-medium text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                        {log.tenantName}
                      </span>
                    )}
                    <span>by {log.actorName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
