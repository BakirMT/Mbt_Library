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

  const handleStatusChange = (tenantId: string, newStatus: TenantStatus) => {
    const conf = window.confirm(`Are you sure you want to change tenant status to "${newStatus}"?`);
    if (!conf) return;

    saasStorage.updateTenantStatus(tenantId, newStatus);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDelete = (tenantId: string) => {
    const conf = window.confirm('Are you sure you want to permanently delete this library and all associated data? This action cannot be undone.');
    if (!conf) return;

    saasStorage.deleteTenant(tenantId);
    setRefreshTrigger((prev) => prev + 1);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
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
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white text-slate-700"
          >
            <option value="all">All Statuses ({tenants.length})</option>
            <option value="active">Active Only</option>
            <option value="trial">Free Trial Only</option>
            <option value="suspended">Suspended Only</option>
            <option value="archived">Archived Only</option>
          </select>

          {/* Institution Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white text-slate-700"
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
          onClick={onOpenProvisionModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
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
                const admin = saasStorage.getLibraryAdminForTenant(tenant.id);

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
                        <Calendar className="w-3 h-3 text-slate-400" />
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
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          tenant.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : tenant.status === 'trial'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : tenant.status === 'suspended'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {tenant.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
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

                      {/* Status Toggle Actions */}
                      {tenant.status === 'active' || tenant.status === 'trial' ? (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(tenant.id, 'suspended')}
                          title="Suspend Library"
                          className="p-1 text-amber-600 hover:text-amber-800 rounded hover:bg-amber-50 inline-block cursor-pointer align-middle"
                        >
                          <Pause className="w-4 h-4 pointer-events-none" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(tenant.id, 'active')}
                          title="Activate / Reactivate Library"
                          className="p-1 text-emerald-600 hover:text-emerald-800 rounded hover:bg-emerald-50 inline-block cursor-pointer align-middle"
                        >
                          <Play className="w-4 h-4 pointer-events-none" />
                        </button>
                      )}

                      {tenant.status !== 'archived' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(tenant.id, 'archived')}
                          title="Archive Library"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 inline-block cursor-pointer align-middle"
                        >
                          <Archive className="w-4 h-4 pointer-events-none" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(tenant.id)}
                        title="Delete Library"
                        className="p-1 text-rose-600 hover:text-rose-800 rounded hover:bg-rose-50 inline-block cursor-pointer align-middle"
                      >
                        <Trash2 className="w-4 h-4 pointer-events-none" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
