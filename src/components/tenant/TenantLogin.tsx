import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  BookOpen,
  Users,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { Tenant, UserRole } from '../../types/saas';
import { useRouter } from '../../router/RouterContext';
import { saasStorage } from '../../services/storage';

interface TenantLoginProps {
  tenant: Tenant;
  role: 'admin' | 'librarian' | 'student';
}

export const TenantLogin: React.FC<TenantLoginProps> = ({ tenant, role }) => {
  const { navigate, loginTenantUser } = useRouter();

  const userRole: UserRole =
    role === 'admin' ? 'library_admin' : role === 'librarian' ? 'librarian' : 'student';

  // Seed user discovery for 1-click test fill
  const tenantUsers = saasStorage.getUsersForTenant(tenant.id);
  const matchedUser = tenantUsers.find((u) => {
    if (role === 'admin') return u.membership.role === 'library_admin';
    if (role === 'librarian') return u.membership.role === 'librarian' || u.membership.role === 'senior_librarian';
    return u.membership.role === 'student';
  });

  const defaultEmail = matchedUser ? matchedUser.user.email : '';
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const brandColor = tenant.settings.primaryColor || '#2563eb';

  const roleTitle =
    role === 'admin'
      ? 'Library Administrator (Level 2)'
      : role === 'librarian'
      ? 'Librarian Circulation Desk (Level 3)'
      : 'Student & Member Portal (Level 4)';

  const roleIcon =
    role === 'admin' ? (
      <ShieldCheck className="w-6 h-6 text-blue-600" />
    ) : role === 'librarian' ? (
      <BookOpen className="w-6 h-6 text-emerald-600" />
    ) : (
      <Users className="w-6 h-6 text-purple-600" />
    );

  const targetPortalRoute =
    role === 'admin'
      ? `/l/${tenant.slug}/admin`
      : role === 'librarian'
      ? `/l/${tenant.slug}/librarian`
      : `/l/${tenant.slug}/student`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = loginTenantUser(tenant.slug, email, password, userRole);
    setIsSubmitting(false);

    if (res.success) {
      navigate(targetPortalRoute);
    } else {
      setError(res.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleQuickFill = (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Banner */}
      <div className="bg-slate-900 text-slate-300 px-4 py-2 text-xs flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-white font-semibold">Tenant Authentication:</span>
          <code className="text-blue-400 font-mono">/l/{tenant.slug}/{role}/login</code>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => navigate(`/l/${tenant.slug}`)}
            className="text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Library Public Page</span>
          </button>
          <button
            onClick={() => navigate('/super-admin')}
            className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
          >
            Super Admin Portal →
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header with Institution Styling */}
          <div className="p-6 text-center space-y-2 border-b border-slate-100 bg-slate-50/60">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-white font-bold text-lg shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              {tenant.logoInitials}
            </div>
            <div className="font-bold text-slate-900 text-base">{tenant.name}</div>
            <p className="text-xs text-slate-500">{tenant.institutionName}</p>

            <div className="pt-2 flex items-center justify-center space-x-1.5">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {roleIcon}
                <span className="ml-1">{roleTitle}</span>
              </span>
            </div>
          </div>

          <div className="p-6 space-y-4 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Registered Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@institution.edu"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Account Password</label>
                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        `Password reset for this tenant is initiated by the Library Admin or Super Admin via secure invitation tokens. Default test password: Password123!`
                      )
                    }
                    className="text-[11px] text-blue-600 hover:text-blue-800"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 text-white font-bold rounded-lg shadow-sm flex items-center justify-center space-x-1.5 transition-opacity cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                <span>{isSubmitting ? 'Verifying Tenant Access...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* 1-Click Demo Sign-in Fast Fill */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>1-Click Test Credentials ({tenant.slug})</span>
                </span>
              </div>

              <div className="space-y-1.5">
                {matchedUser ? (
                  <button
                    type="button"
                    onClick={() => handleQuickFill(matchedUser.user.email)}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-800 truncate">
                        {matchedUser.user.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {matchedUser.user.email} (Password: <code>Password123!</code>)
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                      Auto Fill
                    </span>
                  </button>
                ) : (
                  <div className="p-2 text-[11px] text-slate-400 bg-slate-50 rounded border border-slate-200">
                    No active account registered with role &quot;{role}&quot; yet. You can invite or add one
                    from the Library Admin or Super Admin portal.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center text-[11px] text-slate-500 flex items-center justify-between">
            <span>Tenant Isolation Active</span>
            <span>Only {tenant.name} users accepted</span>
          </div>
        </div>
      </div>
    </div>
  );
};
