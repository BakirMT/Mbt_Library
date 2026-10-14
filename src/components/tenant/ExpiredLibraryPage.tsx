import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Mail,
  Building2,
  CheckCircle2,
  ExternalLink,
  CreditCard,
  Sparkles,
  Lock,
  X,
  Phone,
  HelpCircle,
} from 'lucide-react';
import { Tenant } from '../../types/saas';
import { saasStorage } from '../../services/storage';
import { useRouter } from '../../router/RouterContext';

interface ExpiredLibraryPageProps {
  tenant: Tenant;
}

export const ExpiredLibraryPage: React.FC<ExpiredLibraryPageProps> = ({ tenant }) => {
  const { navigate } = useRouter();
  const subscription = saasStorage.getSubscriptionForTenant(tenant.id);
  const plan = subscription ? saasStorage.getPlanById(subscription.planId) : null;

  // Contact Authority Modal state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [senderName, setSenderName] = useState(tenant.name || '');
  const [senderEmail, setSenderEmail] = useState(tenant.settings.contactEmail || '');
  const [senderPhone, setSenderPhone] = useState(tenant.settings.contactPhone || '');
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Upgrade Modal state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const activationDate = subscription?.startDate
    ? new Date(subscription.startDate)
    : new Date(tenant.createdAt);

  const expiryDate = subscription?.expiryDate
    ? new Date(subscription.expiryDate)
    : new Date(activationDate.getTime() + 72 * 60 * 60 * 1000);

  const formatDateTime = (d: Date) => {
    return d.toLocaleString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  };

  const handleSendEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName || !senderEmail) return;

    setSubmitting(true);
    try {
      const payload = {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        contactName: senderName,
        contactEmail: senderEmail,
        contactPhone: senderPhone,
        requestedPlan: selectedPlan,
        message: message || `Customer submitted upgrade request for "${tenant.name}" (${selectedPlan.toUpperCase()} tier).`,
      };

      // 1. Post to backend
      await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});

      // 2. Save locally
      saasStorage.createSubscriptionEnquiry(payload);

      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col justify-between">
      {/* Top Banner */}
      <div className="bg-rose-950/80 border-b border-rose-800/80 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
          <span className="font-bold uppercase tracking-wider text-rose-300">
            System Notice:
          </span>
          <span className="truncate">
            Library access for <strong>{tenant.name}</strong> is currently deactivated.
          </span>
        </div>
      </div>

      {/* Main Expired Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="max-w-2xl w-full bg-slate-800/90 border border-slate-700/90 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-md space-y-6">
          {/* Header with Icon and Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-6">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-black text-xl shrink-0 shadow-lg shadow-rose-900/30">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Free Trial Expired
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                    Status: Deactivated
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5 truncate">
                  {tenant.name}
                </h1>
                <p className="text-xs text-slate-400 truncate">{tenant.institutionName}</p>
              </div>
            </div>

            <div className="text-right sm:text-right hidden sm:block">
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-700">
                /l/{tenant.slug}
              </span>
            </div>
          </div>

          {/* Core Expiry Notice */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
              Library Temporarily Deactivated
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your library&apos;s <strong>3-day Free trial (72 hours)</strong> has expired. To restore
              access for your Library Administrators, Librarians, and Students, please upgrade your
              subscription or contact the MBT Library authority.
            </p>
          </div>

          {/* Expiry Timestamp & Plan Information Box */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] uppercase font-semibold flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Trial Activated At</span>
                </span>
                <div className="font-semibold text-slate-200">
                  {formatDateTime(activationDate)}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] uppercase font-semibold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Trial Expired At</span>
                </span>
                <div className="font-bold text-rose-300">
                  {formatDateTime(expiryDate)}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] uppercase font-semibold">
                  Subscription Tier
                </span>
                <div className="font-semibold text-slate-200">
                  {plan?.name || 'Free Plan (3-Day Trial)'} · 72 Hours
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] uppercase font-semibold">
                  Subscription Status
                </span>
                <div className="font-bold text-rose-400 uppercase">
                  Expired (Access Blocked)
                </div>
              </div>
            </div>

            {/* Data Protection Reassurance */}
            <div className="pt-3 border-t border-slate-800 flex items-start space-x-2 text-[11px] text-slate-400">
              <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                <strong>Data Safe & Preserved:</strong> All catalogued titles, physical copies, student
                profiles, and borrowing histories remain securely saved in the database. No library data is
                deleted. Full access is instantly restored upon subscription activation.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(true)}
              className="flex-1 py-3 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center space-x-2 cursor-pointer transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Upgrade Subscription</span>
            </button>

            <button
              type="button"
              onClick={() => setContactModalOpen(true)}
              className="flex-1 py-3 px-5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs sm:text-sm rounded-xl border border-slate-600 flex items-center justify-center space-x-2 cursor-pointer transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Contact Authority</span>
            </button>
          </div>

          {/* Footer Assistance */}
          <div className="pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <span>Official MBT Library Support & Multi-Tenant Authority</span>
            <div className="flex items-center space-x-3">
              <a
                href="mailto:support@mbtlibrary.com"
                className="hover:text-white flex items-center space-x-1"
              >
                <Mail className="w-3 h-3" />
                <span>support@mbtlibrary.com</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Upgrade Subscription Modal */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl text-slate-200 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div className="flex items-center space-x-2.5">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-white">Upgrade Subscription Plan</h3>
              </div>
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Select an authorised institutional plan below to request immediate restoration of access for{' '}
              <strong className="text-white">{tenant.name}</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Basic Plan */}
              <div
                onClick={() => {
                  setSelectedPlan('basic');
                  setUpgradeModalOpen(false);
                  setContactModalOpen(true);
                }}
                className="p-4 rounded-xl border border-slate-700 hover:border-blue-500 bg-slate-900/60 hover:bg-slate-900 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Basic Plan</span>
                  <span className="text-blue-400 font-bold">₹1,999/mo</span>
                </div>
                <p className="text-[11px] text-slate-400">1,000 Titles · 1,200 Copies · 2 Librarians · 100 Students</p>
                <button className="w-full py-1.5 bg-blue-600/30 text-blue-300 rounded font-semibold text-[11px]">
                  Request Basic Tier
                </button>
              </div>

              {/* Standard Plan */}
              <div
                onClick={() => {
                  setSelectedPlan('standard');
                  setUpgradeModalOpen(false);
                  setContactModalOpen(true);
                }}
                className="p-4 rounded-xl border border-blue-500/80 bg-blue-950/20 hover:bg-blue-950/40 cursor-pointer transition-all space-y-2 relative"
              >
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white">
                  POPULAR
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Standard Campus</span>
                  <span className="text-blue-300 font-bold">₹4,999/mo</span>
                </div>
                <p className="text-[11px] text-slate-400">4,000 Titles · 5,000 Copies · 4 Librarians · 250 Students</p>
                <button className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-[11px]">
                  Request Standard Tier
                </button>
              </div>

              {/* Premium Plan */}
              <div
                onClick={() => {
                  setSelectedPlan('premium');
                  setUpgradeModalOpen(false);
                  setContactModalOpen(true);
                }}
                className="sm:col-span-2 p-4 rounded-xl border border-purple-500/50 bg-purple-950/20 hover:bg-purple-950/40 cursor-pointer transition-all flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-white text-sm">Premium Institutional Agreement</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Custom quota capacity configured directly by the authority for universities and large madrasas.
                  </p>
                </div>
                <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-semibold text-[11px] shrink-0">
                  Custom Authority Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Authority Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl text-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Contact MBT Library Authority</h3>
              </div>
              <button
                onClick={() => setContactModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-base">Upgrade Request Submitted</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your request for <strong>{tenant.name}</strong> has been logged in the Super Admin
                  authority queue. A license officer will activate your subscription shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setContactModalOpen(false);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendEnquiry} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Principal or Head Librarian"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="official@institution.edu"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Requested Plan</label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                  >
                    <option value="basic">Basic Plan (₹1,999/mo · 1,000 Titles)</option>
                    <option value="standard">Standard Campus (₹4,999/mo · 4,000 Titles)</option>
                    <option value="premium">Premium Custom Agreement (Authority Determined)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Notes / Instructions</label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mention any custom quota requirements or payment transfer details..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setContactModalOpen(false)}
                    className="px-3.5 py-2 text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Transmitting...' : 'Submit Upgrade Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Subtle bottom note */}
      <footer className="text-center py-3 text-[10px] text-slate-500">
        MBT Library Multi-Tenant Platform · Strict 72-Hour Free Trial Enforcement
      </footer>
    </div>
  );
};
