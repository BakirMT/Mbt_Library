import React, { useState, useEffect } from 'react';
import {
  Mail,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Plus,
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  Search,
  RefreshCw,
  Key,
  Shield,
} from 'lucide-react';
import { Invitation, UserRole } from '../../types/saas';
import { saasStorage } from '../../services/storage';

export const InvitationsManager: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>(() => saasStorage.getInvitations());
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'expired' | 'revoked'>('all');

  // New invitation form state
  const tenants = saasStorage.getTenants();
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id || '');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [role, setRole] = useState<UserRole>('librarian');

  const refreshInvitations = () => {
    saasStorage
      .syncInvitationsFromApi()
      .then((tokens) => setInvitations(tokens))
      .catch(() => setInvitations(saasStorage.getInvitations()));
  };

  useEffect(() => {
    refreshInvitations();
    const handleUpdate = () => setInvitations(saasStorage.getInvitations());
    window.addEventListener('mbt_invitations_updated', handleUpdate);
    return () => window.removeEventListener('mbt_invitations_updated', handleUpdate);
  }, []);

  const handleCopy = (token: string) => {
    const fullLink = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      // 1. Post revocation to real Cloud SQL backend
      const res = await fetch(`/api/invitations/${encodeURIComponent(invitationId)}/revoke`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Server rejected token revocation.');
      }

      // 2. Sync to local state
      saasStorage.revokeInvitation(invitationId);
      refreshInvitations();
      showToast('Invitation token revoked successfully in database.');
    } catch (err: any) {
      showToast(`Revocation error: ${err.message}`);
    } finally {
      setRevokeConfirmId(null);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !recipientEmail.trim() || !recipientName.trim()) return;

    setIsSubmitting(true);
    setActionError(null);

    try {
      // 1. Persist to real Cloud SQL backend
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim(),
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create invitation in database.');
      }

      // 2. Sync to local state
      saasStorage.createInvitation(selectedTenantId, recipientEmail.trim(), recipientName.trim(), role);

      setCreateModalOpen(false);
      setRecipientEmail('');
      setRecipientName('');
      showToast('New cryptographic invitation token issued.');
      refreshInvitations();
    } catch (err: any) {
      setActionError(err.message || 'Invitation generation rejected by server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvitations = invitations.filter((inv) => {
    const isExpired = new Date(inv.expiresAt) < new Date();
    const effectiveStatus = isExpired && inv.status === 'pending' ? 'expired' : inv.status;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      inv.recipientName.toLowerCase().includes(q) ||
      inv.recipientEmail.toLowerCase().includes(q) ||
      inv.tenantName.toLowerCase().includes(q) ||
      inv.token.toLowerCase().includes(q) ||
      inv.role.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Platform Invitation Tokens & Access Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Single-use cryptographic onboarding tokens generated for Library Admins, Librarians, and Students.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={refreshInvitations}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Cloud SQL</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Invitation</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by recipient name, email, institution, or token..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 overflow-x-auto w-full sm:w-auto">
          {(
            [
              { id: 'all', label: 'All Tokens', count: invitations.length },
              {
                id: 'pending',
                label: 'Active Pending',
                count: invitations.filter((i) => i.status === 'pending' && new Date(i.expiresAt) >= new Date()).length,
              },
              {
                id: 'accepted',
                label: 'Accepted',
                count: invitations.filter((i) => i.status === 'accepted').length,
              },
              {
                id: 'expired',
                label: 'Expired',
                count: invitations.filter((i) => i.status === 'expired' || (i.status === 'pending' && new Date(i.expiresAt) < new Date())).length,
              },
              {
                id: 'revoked',
                label: 'Revoked',
                count: invitations.filter((i) => i.status === 'revoked').length,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Invitations Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            All Issued Tokens ({filteredInvitations.length})
          </span>
          <span className="text-xs text-slate-400">Tokens expire automatically after 7 days</span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-slate-50/70 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Recipient</th>
                <th className="px-5 py-3 font-semibold">Assigned Institution</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Security Token</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Expires</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvitations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No issued invitation tokens found.
                  </td>
                </tr>
              ) : (
                filteredInvitations.map((inv) => {
                  const isExpired = new Date(inv.expiresAt) < new Date();
                  const displayStatus = isExpired && inv.status === 'pending' ? 'expired' : inv.status;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{inv.recipientName}</div>
                        <div className="text-[11px] text-slate-500">{inv.recipientEmail}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{inv.tenantName}</div>
                        <div className="text-[10px] text-blue-600 font-mono">/l/{inv.tenantSlug}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-700 capitalize">
                          {inv.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200 inline-block font-mono">
                          {inv.token.substring(0, 16)}...
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            displayStatus === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : displayStatus === 'pending'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : displayStatus === 'revoked'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(inv.token)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer inline-flex items-center space-x-1"
                          >
                            {copiedToken === inv.token ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 shrink-0" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          {/* Test Link Button */}
                          <a
                            href={`/invite/${inv.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold inline-flex items-center space-x-1 cursor-pointer"
                            title="Open onboarding invite link in new tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </a>

                          {inv.status === 'pending' && (
                            revokeConfirmId === inv.id ? (
                              <div className="inline-flex items-center space-x-1 bg-rose-50 p-1 rounded border border-rose-200">
                                <span className="text-[10px] text-rose-700 font-semibold px-1">Revoke?</span>
                                <button
                                  type="button"
                                  onClick={() => handleRevoke(inv.id)}
                                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRevokeConfirmId(null)}
                                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-semibold cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setRevokeConfirmId(inv.id)}
                                className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded text-xs font-medium cursor-pointer"
                              >
                                Revoke
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150 my-8">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Issue Secure Access Invitation</h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvitation} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Institution *</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Full Name *</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Dr. Fatima Al-Zahra"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Official Email *</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="fatima@darulirfan.edu"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Security Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="librarian">Librarian (Cataloging, Circulation & Borrowing Ops)</option>
                  <option value="library_admin">Library Administrator (Institution Tenant Admin)</option>
                  <option value="student">Student / Library Patron</option>
                </select>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="bg-slate-50 -mx-5 -mb-5 px-5 py-3 border-t flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {isSubmitting ? 'Generating Token...' : 'Issue Access Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center space-x-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};
