import React, { useState } from 'react';
import {
  Building2,
  Search,
  Filter,
  PlusCircle,
  ExternalLink,
  MoreVertical,
  ShieldAlert,
  Play,
  Pause,
  Archive,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Layers,
  Users,
  BookOpen,
  Trash2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Tenant, TenantStatus, InstitutionType } from '../../types/saas';
import { saasStorage } from '../../services/storage';
import { useRouter } from '../../router/RouterContext';
import { LibraryDetailModal } from './LibraryDetailModal';

interface LibraryManagementProps {
  onOpenProvisionModal: () => void;
}

export const LibraryManagement: React.FC<LibraryManagementProps> = ({
  onOpenProvisionModal,
}) => {
  const { navigate } = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Detail Modal state
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Quick feedback on copy
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const tenants = saasStorage.getTenants();
  const subscriptions = saasStorage.getSubscriptions();
  const plans = saasStorage.getPlans();

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/l/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // In-app Confirmation Modal (replaces browser window.confirm which is blocked in iframes)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'status' | 'delete';
    tenantId: string;
    tenantName: string;
    newStatus?: TenantStatus;
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive: boolean;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExtendTrial = (tenant: Tenant) => {
    try {
      const res = saasStorage.extendTrial(tenant.id, 72, 'Super Admin manual 72-hour trial extension from Library Management');
      if (res.success) {
        showToast(`3-day Free trial for "${tenant.name}" extended by 72 hours. Status restored to Trial.`, 'success');
        setRefreshTrigger((prev) => prev + 1);
      } else {
        showToast(res.error || 'Failed to extend trial', 'error');
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to extend trial', 'error');
    }
  };

  const requestStatusChange = (tenant: Tenant, newStatus: TenantStatus) => {
    const actionLabel =
      newStatus === 'suspended' ? 'Pause / Suspend' :
      newStatus === 'active' ? 'Activate / Resume' :
      newStatus === 'deactivated' ? 'Deactivate (Expire Trial)' :
      newStatus === 'archived' ? 'Archive' : newStatus;

    setConfirmDialog({
      isOpen: true,
      type: 'status',
      tenantId: tenant.id,
      tenantName: tenant.name,
      newStatus,
      title: `${actionLabel} "${tenant.name}"?`,
      message:
        newStatus === 'suspended'
          ? `Suspending this library will immediately restrict access to its portals for students and librarians while preserving all database records.`
          : newStatus === 'active'
          ? `Reactivating this library will immediately restore full portal access and catalog operations.`
          : newStatus === 'deactivated'
          ? `Deactivating this library marks its trial as expired and displays the Expired Library notice.`
          : `Archiving this library will set its status to archived. Data is preserved but access will be read-only.`,
      confirmLabel: actionLabel,
      isDestructive: newStatus === 'suspended' || newStatus === 'archived' || newStatus === 'deactivated',
    });
  };

  const requestDelete = (tenant: Tenant) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      tenantId: tenant.id,
      tenantName: tenant.name,
      title: `Permanently Delete "${tenant.name}"?`,
      message: `Are you sure you want to permanently delete this library and all associated catalog, loans, and membership records? This action cannot be reversed.`,
      confirmLabel: 'Delete Library Permanently',
      isDestructive: true,
    });
  };

  const handleConfirmAction = () => {
    if (!confirmDialog) return;
    try {
      if (confirmDialog.type === 'status' && confirmDialog.newStatus) {
        saasStorage.updateTenantStatus(confirmDialog.tenantId, confirmDialog.newStatus);
        showToast(`Library "${confirmDialog.tenantName}" status changed to ${confirmDialog.newStatus}.`, 'success');
      } else if (confirmDialog.type === 'delete') {
        saasStorage.deleteTenant(confirmDialog.tenantId);
        showToast(`Library "${confirmDialog.tenantName}" has been deleted.`, 'info');
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      showToast(err?.message || 'Action failed', 'error');
    } finally {
      setConfirmDialog(null);
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    // Search
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      tenant.name.toLowerCase().includes(q) ||
      tenant.slug.toLowerCase().includes(q) ||
      tenant.institutionName.toLowerCase().includes(q) ||
      tenant.settings.contactEmail.toLowerCase().includes(q);

    // Status Filter
    const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;

    // Institution Type Filter
    const matchesType = typeFilter === 'all' || tenant.institutionType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Action & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex-1 flex flex-col sm:flex-row flex-wrap gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by library name, slug, institution, or email..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white text-slate-700 cursor-pointer"
          >
            <option value="all">All Statuses ({tenants.length})</option>
            <option value="active">Active Only</option>
            <option value="trial">Free Trial Only</option>
            <option value="deactivated">Deactivated (Trial Expired) Only</option>
            <option value="suspended">Suspended Only</option>
            <option value="archived">Archived Only</option>
          </select>

          {/* Institution Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white text-slate-700 cursor-pointer"
          >
            <option value="all">All Sectors</option>
            <option value="islamic_institution">Islamic Seminaries / Madrasas</option>
            <option value="college">Colleges</option>
            <option value="school">Schools</option>
            <option value="university">Universities</option>
            <option value="public_library">Public Libraries</option>
            <option value="research_center">Research Centers</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onOpenProvisionModal}
          className="w-full lg:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center space-x-2 shrink-0 cursor-pointer transition-colors"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>Provision New Library</span>
        </button>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Registered Institutions ({filteredTenants.length})
          </span>
          <span className="text-xs text-slate-400">
            Isolated tenant routing with RBAC enforcement
          </span>
        </div>

        {/* Mobile Cards View (Visible on < sm screens) */}
        <div className="sm:hidden divide-y divide-slate-100">
          {filteredTenants.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No libraries match your search or filter.</div>
          ) : (
            filteredTenants.map((tenant) => {
              const sub = subscriptions.find((s) => s.tenantId === tenant.id);
              const plan = sub ? plans.find((p) => p.id === sub.planId) : null;
              return (
                <div key={tenant.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0"
                        style={{ backgroundColor: tenant.settings.primaryColor || '#2563eb' }}
                      >
                        {tenant.logoInitials}
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setDetailModalOpen(true);
                          }}
                          className="font-bold text-slate-900 hover:text-blue-600 truncate text-left block text-xs"
                        >
                          {tenant.name}
                        </button>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 truncate max-w-[150px]">
                            /l/{tenant.slug}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(tenant.slug)}
                            title="Copy Public Link"
                            className="text-slate-400 hover:text-slate-700 p-0.5"
                          >
                            {copiedSlug === tenant.slug ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                        tenant.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : tenant.status === 'trial'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : tenant.status === 'deactivated'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : tenant.status === 'suspended'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {tenant.status === 'deactivated' && <AlertTriangle className="w-3 h-3 text-rose-600 inline mr-0.5" />}
                      <span>{tenant.status === 'deactivated' ? 'Deactivated (Expired)' : tenant.status}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Institution</span>
                      <span className="font-medium text-slate-800 truncate block">{tenant.institutionName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Plan</span>
                      <span className="font-semibold text-slate-900">{plan?.name || 'Standard'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Titles</span>
                      <span className="text-slate-700 font-bold">{(tenant.currentUsage?.titlesCount || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Students</span>
                      <span className="text-slate-700 font-bold">{(tenant.currentUsage?.studentsCount || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Mobile Actions Bar */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setDetailModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Manage Details
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/l/${tenant.slug}`)}
                        title="Visit Tenant Portal"
                        className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 border border-slate-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5 pointer-events-none" />
                      </button>

                      {tenant.status === 'deactivated' && (
                        <button
                          type="button"
                          onClick={() => handleExtendTrial(tenant)}
                          title="Extend Free Trial by 72 Hours"
                          className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 border border-blue-200 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5 pointer-events-none" />
                        </button>
                      )}

                      {tenant.status === 'active' || tenant.status === 'trial' ? (
                        <button
                          type="button"
                          onClick={() => requestStatusChange(tenant, 'suspended')}
                          title="Suspend / Pause Library"
                          className="p-1.5 text-amber-600 hover:text-amber-800 rounded-lg hover:bg-amber-50 border border-slate-200 cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5 pointer-events-none" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => requestStatusChange(tenant, 'active')}
                          title="Activate / Reactivate Library"
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 border border-slate-200 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 pointer-events-none" />
                        </button>
                      )}

                      {tenant.status !== 'archived' && (
                        <button
                          type="button"
                          onClick={() => requestStatusChange(tenant, 'archived')}
                          title="Archive Library"
                          className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 border border-slate-200 cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5 pointer-events-none" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => requestDelete(tenant)}
                        title="Delete Library"
                        className="p-1.5 text-rose-600 hover:text-rose-800 rounded-lg hover:bg-rose-50 border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop & Tablet Table (Hidden on small mobile, scrollable on tablet) */}
        <div className="hidden sm:block overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Library & Slug</th>
                <th className="px-5 py-3 font-semibold">Institution / Sector</th>
                <th className="px-5 py-3 font-semibold">Subscription & Plan</th>
                <th className="px-5 py-3 font-semibold">Usage / Capacity</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.map((tenant) => {
                const sub = subscriptions.find((s) => s.tenantId === tenant.id);
                const plan = sub ? plans.find((p) => p.id === sub.planId) : null;

                return (
                  <tr key={tenant.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Library & Slug */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-2xs shrink-0"
                          style={{ backgroundColor: tenant.settings.primaryColor || '#2563eb' }}
                        >
                          {tenant.logoInitials}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setDetailModalOpen(true);
                            }}
                            className="font-bold text-slate-900 hover:text-blue-600 truncate block text-left cursor-pointer"
                          >
                            {tenant.name}
                          </button>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                              /l/{tenant.slug}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(tenant.slug)}
                              title="Copy Public Link"
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              {copiedSlug === tenant.slug ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Institution & Sector */}
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{tenant.institutionName}</div>
                      <span className="text-[10px] text-slate-500 capitalize">
                        {tenant.institutionType.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Subscription & Plan */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {plan?.name || 'Standard Campus'}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>
                          Expires:{' '}
                          {sub?.expiryDate
                            ? new Date(sub.expiryDate).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Usage / Capacity */}
                    <td className="px-5 py-3.5">
                      <div className="text-slate-700">
                        <strong>{(tenant.currentUsage?.titlesCount || 0).toLocaleString()}</strong> titles
                        · <strong>{(tenant.currentUsage?.studentsCount || 0).toLocaleString()}</strong> students
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {tenant.currentUsage?.librariansCount || 1} staff ·{' '}
                        {(tenant.currentUsage?.copiesCount || 0).toLocaleString()} copies
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          tenant.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : tenant.status === 'trial'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : tenant.status === 'deactivated'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : tenant.status === 'suspended'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {tenant.status === 'deactivated' && <AlertTriangle className="w-3 h-3 text-rose-600 inline mr-0.5" />}
                        <span>{tenant.status === 'deactivated' ? 'Deactivated (Expired)' : tenant.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setDetailModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium cursor-pointer"
                        >
                          Manage
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/l/${tenant.slug}`)}
                          title="Visit Tenant Portal"
                          className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 inline-block cursor-pointer align-middle"
                        >
                          <ExternalLink className="w-4 h-4 pointer-events-none" />
                        </button>

                        {tenant.status === 'deactivated' && (
                          <button
                            type="button"
                            onClick={() => handleExtendTrial(tenant)}
                            title="Extend Free Trial by 72 Hours (+3 Days)"
                            className="px-2 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <Clock className="w-3 h-3 pointer-events-none" />
                            <span>Extend +72h</span>
                          </button>
                        )}

                        {/* Status Toggle Actions */}
                        {tenant.status === 'active' || tenant.status === 'trial' ? (
                          <button
                            type="button"
                            onClick={() => requestStatusChange(tenant, 'suspended')}
                            title="Suspend / Pause Library"
                            className="p-1.5 text-amber-600 hover:text-amber-800 rounded hover:bg-amber-50 inline-flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Pause className="w-4 h-4 pointer-events-none" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => requestStatusChange(tenant, 'active')}
                            title="Activate / Reactivate Library"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50 inline-flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Play className="w-4 h-4 pointer-events-none" />
                          </button>
                        )}

                        {tenant.status !== 'archived' && (
                          <button
                            type="button"
                            onClick={() => requestStatusChange(tenant, 'archived')}
                            title="Archive Library"
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Archive className="w-4 h-4 pointer-events-none" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => requestDelete(tenant)}
                          title="Delete Library"
                          className="p-1.5 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50 inline-flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4 pointer-events-none" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-app Confirmation Dialog (Robust alternative to browser window.confirm in iframes) */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-start space-x-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmDialog.isDestructive
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {confirmDialog.isDestructive ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {confirmDialog.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`w-full sm:w-auto px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs cursor-pointer transition-colors ${
                  confirmDialog.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 text-xs font-medium animate-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Detail Modal Component */}
      <LibraryDetailModal
        tenant={selectedTenant}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onUpdate={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  );
};
