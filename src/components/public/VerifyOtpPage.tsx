import React, { useState, useEffect } from 'react';
import { useRouter } from '../../router/RouterContext';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { ShieldCheck, ArrowRight, Mail, Phone, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { saasStorage } from '../../services/storage';

export const VerifyOtpPage: React.FC = () => {
  const { navigate } = useRouter();
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || sessionStorage.getItem('mbt_reg_email') || '';
  const mobile = urlParams.get('mobile') || sessionStorage.getItem('mbt_reg_mobile') || '';
  const planId = urlParams.get('plan') || sessionStorage.getItem('mbt_reg_plan') || 'plan_free';

  const devEmailOtp = sessionStorage.getItem('mbt_dev_email_otp') || '';
  const devMobileOtp = sessionStorage.getItem('mbt_dev_mobile_otp') || '';

  const [emailOtp, setEmailOtp] = useState(devEmailOtp);
  const [mobileOtp, setMobileOtp] = useState(devMobileOtp);

  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);

  const [emailToken, setEmailToken] = useState('');
  const [mobileToken, setMobileToken] = useState('');

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingMobile, setLoadingMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email || !mobile) {
      navigate('/auth/register');
    }
  }, [email, mobile, navigate]);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtp) return;
    setError(null);
    setLoadingEmail(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: email, type: 'email', otp: emailOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email OTP');

      setEmailVerified(true);
      setEmailToken(data.verifiedToken);
      sessionStorage.setItem('mbt_verified_email_token', data.verifiedToken);
    } catch (err: any) {
      setError(err?.message || 'Email OTP verification failed');
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleVerifyMobile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileOtp) return;
    setError(null);
    setLoadingMobile(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: mobile, type: 'mobile', otp: mobileOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid mobile OTP');

      setMobileVerified(true);
      setMobileToken(data.verifiedToken);
      sessionStorage.setItem('mbt_verified_mobile_token', data.verifiedToken);
    } catch (err: any) {
      setError(err?.message || 'Mobile OTP verification failed');
    } finally {
      setLoadingMobile(false);
    }
  };

  const handleProceed = () => {
    if (!emailVerified || !mobileVerified) {
      setError('Please verify both your email address and mobile number to proceed.');
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Step 2 of 3: OTP Verification
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Verify Email & Mobile Number
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter the 6-digit OTP codes sent to <strong>{email}</strong> and <strong>{mobile}</strong>.
              {devEmailOtp && <span className="block mt-1 text-emerald-400 font-mono text-[11px]">Development Mode OTPs — Email: {devEmailOtp} | Mobile: {devMobileOtp}</span>}
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Email Verification Box */}
            <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-3.5">
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
                    Unverified
                  </span>
                )}
              </div>

              {!emailVerified ? (
                <form onSubmit={handleVerifyEmail} className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    placeholder="6-digit Email OTP"
                    className="flex-1 px-4 py-2.5 sm:py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono tracking-widest outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loadingEmail || emailOtp.length < 6}
                    className="px-5 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {loadingEmail ? 'Verifying...' : 'Verify Email'}
                  </button>
                </form>
              ) : (
                <div className="text-xs sm:text-sm text-emerald-300 font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Email successfully verified and cryptographically bound.</span>
                </div>
              )}
            </div>

            {/* Mobile Verification Box */}
            <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-white">Mobile Verification ({mobile})</span>
                </div>
                {mobileVerified ? (
                  <span className="px-2.5 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Verified ✓
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Unverified
                  </span>
                )}
              </div>

              {!mobileVerified ? (
                <form onSubmit={handleVerifyMobile} className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    maxLength={6}
                    value={mobileOtp}
                    onChange={(e) => setMobileOtp(e.target.value)}
                    placeholder="6-digit Mobile OTP"
                    className="flex-1 px-4 py-2.5 sm:py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono tracking-widest outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loadingMobile || mobileOtp.length < 6}
                    className="px-5 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {loadingMobile ? 'Verifying...' : 'Verify Mobile'}
                  </button>
                </form>
              ) : (
                <div className="text-xs sm:text-sm text-emerald-300 font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Mobile number successfully verified and bound.</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => navigate('/auth/register')}
              className="text-xs sm:text-sm text-slate-400 hover:text-white cursor-pointer underline order-2 sm:order-1"
            >
              ← Change Email or Mobile
            </button>

            <button
              onClick={handleProceed}
              disabled={!emailVerified || !mobileVerified}
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
