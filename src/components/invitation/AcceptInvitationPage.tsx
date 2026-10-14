import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { saasStorage } from '../../services/storage';
import { useRouter } from '../../router/RouterContext';

interface AcceptInvitationPageProps {
  token: string;
}

export const AcceptInvitationPage: React.FC<AcceptInvitationPageProps> = ({ token }) => {
  const { navigate } = useRouter();
  const invitation = saasStorage.getInvitationByToken(token);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activatedSlug, setActivatedSlug] = useState<string | null>(null);

  if (!invitation) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Invalid Invitation Link</h2>
          <p className="text-xs text-slate-500">
            This invitation token was not found or may have been permanently purged. Please contact
            your MBT Library administrator to request a fresh invitation link.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Go to Platform Homepage
          </button>
        </div>
      </div>
    );
  }

  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isRevoked = invitation.status === 'revoked';
  const isAlreadyAccepted = invitation.status === 'accepted';

  if (isRevoked || isExpired || isAlreadyAccepted) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-200 shadow-xl text-center space-y-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
              isAlreadyAccepted
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-amber-100 text-amber-600'
            }`}
          >
            {isAlreadyAccepted ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {isAlreadyAccepted
              ? 'Invitation Already Claimed'
              : isRevoked
              ? 'Invitation Revoked'
              : 'Invitation Link Expired'}
          </h2>
          <p className="text-xs text-slate-500">
            {isAlreadyAccepted
              ? 'This single-use access link was previously accepted and credentials were created.'
              : isRevoked
              ? 'This invitation was revoked by your institution administrator for security.'
              : 'This invitation token has expired past its 7-day validity window.'}
          </p>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate(`/l/${invitation.tenantSlug}`)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              Go to {invitation.tenantName}
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Post to real database endpoint
      const res = await fetch(`/api/invitations/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server rejected invitation acceptance.');
      }

      // 2. Sync to local state session
      saasStorage.acceptInvitation(token, password);

      setSuccess(true);
      setActivatedSlug(data.tenantSlug || invitation.tenantSlug);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. Operation was aborted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto text-white font-bold shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Accept Your Invitation</h1>
          <p className="text-xs text-slate-400">
            Welcome to <strong>{invitation.tenantName}</strong>
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-bold">{invitation.recipientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-bold">{invitation.recipientEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Role:</span>
                  <span className="font-bold uppercase tracking-wide text-blue-700">
                    {invitation.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Create Account Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Activating Account in Database...' : 'Activate Account & Sign In'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Account Activated!</h2>
              <p className="text-xs text-slate-500">
                Your credentials have been securely stored. You may now enter the library portal.
              </p>
              <button
                onClick={() => navigate(`/l/${activatedSlug || invitation.tenantSlug}`)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-2"
              >
                <span>Proceed to {invitation.tenantName}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
