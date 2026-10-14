import React, { useState } from 'react';
import { useRouter } from '../../router/RouterContext';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { Mail, Phone, MapPin, Send, CheckCircle2, Building2 } from 'lucide-react';
import { saasStorage } from '../../services/storage';

export const ContactPage: React.FC = () => {
  const { navigate } = useRouter();
  const [tenantName, setTenantName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [requestedPlan, setRequestedPlan] = useState('premium');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !contactName || !contactEmail) {
      setError('Please fill in all required fields.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // 1. Post to backend API
      await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName,
          contactName,
          contactEmail,
          contactPhone,
          requestedPlan,
          message,
        }),
      }).catch(() => {});

      // 2. Save locally in saasStorage
      saasStorage.createSubscriptionEnquiry({
        tenantName,
        contactName,
        contactEmail,
        contactPhone,
        requestedPlan,
        message,
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Institutional Authority</span>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              Contact MBT Library Support
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Have questions about custom institutional licensing, enterprise migrations, or Premium plans? Get in touch with our authority team.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Info Cards */}
            <div className="space-y-6">
              <div className="bg-slate-950 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                <div className="w-11 h-11 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base sm:text-lg">Email Authority</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">For licensing, billing, custom limits, and technical support inquiries.</p>
                <a href="mailto:mbtofficial26@gmail.com" className="text-xs sm:text-sm font-semibold text-blue-400 hover:text-blue-300 block">
                  mbtofficial26@gmail.com
                </a>
              </div>

              <div className="bg-slate-950 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                <div className="w-11 h-11 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base sm:text-lg">Direct Helpline</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">MBT Super Admin Authority contact hotline.</p>
                <span className="text-xs sm:text-sm font-semibold text-emerald-400 block font-mono">
                  +91 8943182858
                </span>
              </div>
            </div>

            {/* Contact / Enquiry Form */}
            <div className="lg:col-span-2 bg-slate-950 p-6 sm:p-10 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Enquiry Successfully Submitted!</h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                    Thank you, <strong>{contactName}</strong>. Our MBT Library licensing authority has received your request for <strong>{tenantName}</strong> and will contact you shortly.
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setTenantName(''); setContactName(''); setContactEmail(''); setContactPhone(''); setMessage(''); }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors active:scale-95"
                  >
                    Submit Another Enquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs sm:text-sm font-semibold">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-semibold text-slate-300">Library / Institution Name *</label>
                      <input
                        type="text"
                        required
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="e.g. Al-Noor Academy Library"
                        className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-semibold text-slate-300">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Dr. Ibrahim Al-Hassan"
                        className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-semibold text-slate-300">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="director@institution.edu"
                        className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-semibold text-slate-300">Mobile Number / Phone</label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+91 8943182858"
                        className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-semibold text-slate-300">Interested Plan / Tier</label>
                    <select
                      value={requestedPlan}
                      onChange={(e) => setRequestedPlan(e.target.value)}
                      className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none cursor-pointer"
                    >
                      <option value="premium">Premium Plan (Custom Institutional Requirements)</option>
                      <option value="standard">Standard Plan (Campus & College)</option>
                      <option value="basic">Basic Plan (School & Madrasa)</option>
                      <option value="free">Free Plan (3-Day Trial)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-semibold text-slate-300">Message & Custom Requirements</label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please specify estimated student count, number of titles, or special integration needs..."
                      className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Submitting Enquiry...' : 'Send Enquiry to Authority'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
