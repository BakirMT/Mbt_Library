import React, { useState, useEffect } from 'react';
import { useRouter } from '../../router/RouterContext';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { ShieldCheck, ArrowRight, Mail, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { authenticateWithCustomToken } from '../../lib/firebase';

export const VerifyOtpPage: React.FC = () => {
  const { navigate } = useRouter();
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || sessionStorage.getItem('mbt_reg_email') || '';
  const mobile = urlParams.get('mobile') || sessionStorage.getItem('mbt_reg_mobile') || '';
  const planId = urlParams.get('plan') || sessionStorage.getItem('mbt_reg_plan') || 'plan_free';

  const [emailOtp, setEmailOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      navigate('/auth/register');
    }
  }, [email, navigate]);

  // Resend Countdown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = emailOtp.trim();
    if (cleanCode.length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }

    setError(null);
    setNoticeMessage(null);
    setLoadingEmail(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpCode: cleanCode }),
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
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired verification code.');
      }

      // Genuine Firebase Authentication Custom Token Exchange
      if (data.customToken) {
        await authenticateWithCustomToken(data.customToken);
      }

      setEmailVerified(true);
      sessionStorage.setItem('mbt_verified_email_token', data.customToken || 'verified_email');
      setNoticeMessage('Email verified successfully with Firebase Authentication!');
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired verification code.');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;

    setError(null);
    setNoticeMessage(null);
    setResending(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend verification email.');
      }

      setResendCooldown(data.cooldownSeconds || 60);
      setNoticeMessage(data.message || 'A new 6-digit code has been sent to your email.');
    } catch (err: any) {
      setError(err?.message || 'Failed to resend email code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleProceed = () => {
    if (!emailVerified) {
      setError('Please verify your email address to proceed.');
      return;
    }
    navigate(`/subscription/checkout?email=${encodeURIComponent(email)}&mobile=${encodeURIComponent(mobile)}&plan=${planId}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      <main className="flex-1 py-16 sm:py-24 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-slate-950 p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Step 2 of 3: Email OTP Verification</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Verify Your Email Address
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              We have sent a production 6-digit verification code to <strong>{email}</strong> via Resend.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {noticeMessage && (
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{noticeMessage}</span>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-white">Email Verification ({email})</span>
                </div>
                {emailVerified ? (
                  <span className="px-2.5 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Verified ✓
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Pending Verification
                  </span>
                )}
              </div>

              {!emailVerified ? (
                <form onSubmit={handleVerifyEmail} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter 6-digit code"
                      className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-center sm:text-left text-lg font-mono font-bold tracking-[6px] text-white outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={loadingEmail || emailOtp.length < 6}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center space-x-2"
                    >
                      {loadingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify Code</span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                    <span>Didn&apos;t receive the code?</span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || resending}
                      className="text-blue-400 hover:underline disabled:text-slate-500 cursor-pointer disabled:cursor-not-allowed font-semibold flex items-center space-x-1"
                    >
                      {resending ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : resendCooldown > 0 ? (
                        <span>Resend in {resendCooldown}s</span>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          <span>Resend Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-xs sm:text-sm text-emerald-300 font-semibold flex items-center space-x-2 bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Email authenticated & identity verified with Firebase Authentication.</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => navigate('/auth/register')}
              className="text-xs sm:text-sm text-slate-400 hover:text-white cursor-pointer underline order-2 sm:order-1"
            >
              ← Change Email Address
            </button>

            <button
              onClick={handleProceed}
              disabled={!emailVerified}
              className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95 disabled:opacity-40 order-1 sm:order-2"
            >
              <span>Proceed to Library Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
