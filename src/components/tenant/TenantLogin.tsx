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
import { authenticateWithCustomToken } from '../../lib/firebase';

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
  const [showForgotTip, setShowForgotTip] = useState(false);

  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [otpDestination, setOtpDestination] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

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

  const handleSubmitPassword = (e: React.FormEvent) => {
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpDestination.trim()) {
      setError('Please enter your registered Gmail Email Address.');
      return;
    }
    setError(null);
    setOtpNotice(null);
    setSendingOtp(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpDestination.trim().toLowerCase(),
          tenantSlug: tenant.slug,
          role,
        }),
      });

      let data: any = {};
      try {
        const resText = await res.text();
        try {
          data = JSON.parse(resText);
        } catch {
          data = { error: resText || 'Server error. Please try again in a moment.' };
        }
      } catch {
        data = { error: 'Unable to read server response.' };
      }
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch email verification code');

      setOtpSent(true);
      setOtpNotice(data.message || '6-digit verification code dispatched to your email.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send email verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpDestination.trim(),
          otpCode: cleanCode,
          tenantSlug: tenant.slug,
          role,
        }),
      });

      let data: any = {};
      try {
        const resText = await res.text();
        try {
          data = JSON.parse(resText);
        } catch {
          data = { error: resText || 'Server error. Please try again in a moment.' };
        }
      } catch {
        data = { error: 'Unable to read server response.' };
      }
      if (!res.ok) throw new Error(data.error || 'Invalid or expired verification code');

      // Exchange Firebase custom token
      if (data.customToken) {
        await authenticateWithCustomToken(data.customToken);
      }

      // Automatically sign in user for this tenant session
      loginTenantUser(tenant.slug, data.user?.email || otpDestination, 'Password123!', userRole);
      navigate(targetPortalRoute);
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (targetEmail: string) => {
    setEmail(targetEmail);
    setPassword('Password123!');
    setOtpDestination(targetEmail);
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
            className="text-slate-300 hover:text-white flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Library Public Page</span>
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

          <div className="p-6 sm:p-7 space-y-4">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => { setAuthMode('password'); setError(null); }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${authMode === 'password' ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-900'}`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('otp'); setError(null); }}
                className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${authMode === 'otp' ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-900'}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>OTP Verification</span>
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {authMode === 'password' ? (
              <form onSubmit={handleSubmitPassword} className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-700 text-xs sm:text-sm mb-1.5">
                    Registered Institutional Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@institution.edu"
                      className="w-full pl-10 pr-3 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-slate-700 text-xs sm:text-sm">Account Password</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotTip((prev) => !prev)}
                      className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  {showForgotTip && (
                    <div className="mb-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs leading-relaxed">
                      Password reset for this tenant is initiated by the Library Admin or Super Admin via secure invitation tokens. Default test credentials use <strong>Password123!</strong>
                    </div>
                  )}
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 sm:py-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 sm:py-3.5 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: brandColor }}
                >
                  <span>{isSubmitting ? 'Authenticating...' : `Sign In as ${role === 'admin' ? 'Library Admin' : role === 'librarian' ? 'Librarian' : 'Student'}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* OTP Verification Form */
              <div className="space-y-4">
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center space-x-2 font-semibold">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Gmail OTP Verification Active</span>
                </div>

                {otpNotice && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs space-y-1">
                    <div className="flex items-center space-x-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{otpNotice}</span>
                    </div>
                    {devOtp && (
                      <div className="font-mono text-[11px] text-emerald-900 bg-emerald-100/80 p-1.5 rounded mt-1">
                        Development Verification Code: <strong>{devOtp}</strong>
                      </div>
                    )}
                  </div>
                )}

                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 text-xs mb-1">
                        Registered Gmail / Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={otpDestination}
                        onChange={(e) => setOtpDestination(e.target.value)}
                        placeholder="user@gmail.com or user@institution.edu"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sendingOtp}
                      className="w-full py-3 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: brandColor }}
                    >
                      <span>{sendingOtp ? 'Sending Code...' : 'Send OTP to Gmail'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 text-xs mb-1">
                        Enter 6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-center text-lg font-mono tracking-widest outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        ← Change Email
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-blue-600 font-semibold hover:underline cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: brandColor }}
                    >
                      <span>{isSubmitting ? 'Verifying OTP...' : 'Verify OTP & Sign In'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            )}

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
