import React, { useState } from 'react';
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
} from 'lucide-react';
import { Invitation, UserRole } from '../../types/saas';
import { saasStorage } from '../../services/storage';

export const InvitationsManager: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>(() => saasStorage.getInvitations());
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New invitation form state
  const tenants = saasStorage.getTenants();
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id || '');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [role, setRole] = useState<UserRole>('librarian');

  const refreshInvitations = () => {
    setInvitations(saasStorage.getInvitations());
  };

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
      showToast('Invitation token revoked successfully.');
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
      refreshInvitations();
    } catch (err: any) {
      setActionError(err.message || 'Invitation generation rejected by server.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New Invitation</span>
        </button>
      </div>

      {/* Invitations Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            All Issued Tokens ({invitations.length})
          </span>
          <span className="text-xs text-slate-400">Tokens expire automatically after 7 days</span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[700px]">
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
              {invitations.map((inv) => {
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
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                        {inv.token.substring(0, 16)}...
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
                              className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded text-xs font-medium cursor-pointer"
                            >
                              Revoke
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Invitation Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Generate Access Invitation Token</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvitation} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Library *</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (/l/{t.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Name *</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Uthman Al-Khatib"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="khatib@institution.edu"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="librarian">Librarian (Level 3 - Circulation & Cataloguing)</option>
                  <option value="senior_librarian">Senior Librarian (Reports & Inventory)</option>
                  <option value="student">Student / Member (Level 4 - OPAC & Search)</option>
                  <option value="library_admin">Library Admin (Level 2 - Branch Administrator)</option>
                </select>
              </div>

              {actionError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[11px]">
                A secure single-use invitation token with 7-day expiry will be generated. The user sets their own password when redeeming the link.
              </div>

              <div className="pt-2 flex justify-end space-x-2">
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
                  {isSubmitting ? 'Saving to Database...' : 'Generate Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 text-xs font-medium animate-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};
