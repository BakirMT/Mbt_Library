import React, { useState, useEffect } from 'react';
import { useRouter } from '../../router/RouterContext';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { ShieldCheck, ArrowRight, Mail, Phone, Lock, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { saasStorage } from '../../services/storage';

export const RegisterAuthPage: React.FC = () => {
  const { navigate } = useRouter();
  const urlParams = new URLSearchParams(window.location.search);
  const selectedPlanId = urlParams.get('plan') || 'plan_free';
  const plan = saasStorage.getPlanById(selectedPlanId) || saasStorage.getPlans()[0];

  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !mobile) {
      setError('Both email address and mobile number are required.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Send Email OTP
      const emailRes = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: email, type: 'email' }),
      });
      const emailData = await emailRes.json();
      if (!emailRes.ok) throw new Error(emailData.error || 'Failed to send email OTP');

      // Send Mobile OTP
      const phoneRes = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: mobile, type: 'mobile' }),
      });
      const phoneData = await phoneRes.json();
      if (!phoneRes.ok) throw new Error(phoneData.error || 'Failed to send mobile OTP');

      // Store temporary registration state in sessionStorage
      sessionStorage.setItem('mbt_reg_email', email);
      sessionStorage.setItem('mbt_reg_mobile', mobile);
      sessionStorage.setItem('mbt_reg_plan', plan.id);
      if (emailData.devOtp) sessionStorage.setItem('mbt_dev_email_otp', emailData.devOtp);
      if (phoneData.devOtp) sessionStorage.setItem('mbt_dev_mobile_otp', phoneData.devOtp);

      // Navigate to verification page
      navigate(`/auth/verify?email=${encodeURIComponent(email)}&mobile=${encodeURIComponent(mobile)}&plan=${plan.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch verification OTPs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      <main className="flex-1 py-16 sm:py-24 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-slate-950 p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                Step 1 of 3: Identity Verification
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                {plan.name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Register Your Library Admin Account
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your professional email address and mobile number. Both channels must be verified via secure OTP before library provisioning.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSendOtps} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>Administrator Email Address *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@institution.edu"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mobile Number (with Country Code) *</span>
              </label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+971 50 123 4567"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 text-xs space-y-2 text-slate-400">
              <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Two-Factor Verification Guarantee</span>
              </div>
              <p>
                We will send a 6-digit secure OTP code to both your email and mobile number simultaneously.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center space-x-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <span>{loading ? 'Sending Verification OTPs...' : 'Send OTP to Email & Mobile'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-slate-400">
            Already have a library account?{' '}
            <button onClick={() => navigate('/auth/login')} className="text-blue-400 hover:underline font-semibold cursor-pointer">
              Sign In Here
            </button>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
