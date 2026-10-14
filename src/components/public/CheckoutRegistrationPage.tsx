import React, { useState, useEffect } from 'react';
import { useRouter } from '../../router/RouterContext';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { 
  Building2, 
  ShieldCheck, 
  BookOpen, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertTriangle 
} from 'lucide-react';
import { saasStorage } from '../../services/storage';
import { InstitutionType } from '../../types/saas';

export const CheckoutRegistrationPage: React.FC = () => {
  const { navigate } = useRouter();
  const urlParams = new URLSearchParams(window.location.search);
  const paramEmail = urlParams.get('email') || sessionStorage.getItem('mbt_reg_email') || 'admin@institution.edu';
  const paramMobile = urlParams.get('mobile') || sessionStorage.getItem('mbt_reg_mobile') || '+91 9876543210';
  const planId = urlParams.get('plan') || sessionStorage.getItem('mbt_reg_plan') || 'plan_free';

  const plan = saasStorage.getPlanById(planId) || saasStorage.getPlans()[0];

  const [libraryName, setLibraryName] = useState('');
  const [slug, setSlug] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [institutionType, setInstitutionType] = useState<InstitutionType>('islamic_institution');
  const [address, setAddress] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState(paramEmail);
  const [adminPhone, setAdminPhone] = useState(paramMobile);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto-generate slug from library name
  useEffect(() => {
    if (libraryName && !slug) {
      const generated = libraryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  }, [libraryName, slug]);

  const handleRegisterLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryName || !slug || !institutionName || !adminFullName) {
      setError('Please complete all required fields.');
      return;
    }
    if (!acceptedTerms) {
      setError('You must accept the terms of service and privacy policy.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // 1. Call backend tenant provisioning API
      const res = await fetch('/api/tenants/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: libraryName,
          slug,
          institutionName,
          institutionType,
          address,
          adminEmail: adminEmail || 'admin@' + slug + '.edu',
          adminPhone: adminPhone || '+91 9876543210',
          adminFullName,
          planId: plan.id,
          isTrial: plan.code === 'free',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Library provisioning failed');

      // 2. Also provision locally in saasStorage for instant client preview if needed
      const localResult = saasStorage.provisionLibrary({
        name: libraryName,
        slug,
        institutionName,
        institutionType,
        address,
        contactEmail: adminEmail || 'admin@' + slug + '.edu',
        contactPhone: adminPhone || '+91 9876543210',
        timezone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
        adminEmail: adminEmail || 'admin@' + slug + '.edu',
        adminPhone: adminPhone || '+91 9876543210',
        adminFullName,
        invitationDeliveryMethod: 'email',
        planId: plan.id,
        billingCycle: 'monthly',
        isTrial: plan.code === 'free',
        trialDays: 3,
        startDate: new Date().toISOString(),
        gracePeriodDays: 7,
      });

      const origin = window.location.origin;
      const resultData = {
        tenant: data.tenant || localResult.tenant,
        subscription: data.subscription || localResult.subscription,
        adminUser: data.adminUser || localResult.adminUser,
        urls: {
          landing: `${origin}/l/${slug}`,
          adminLogin: `${origin}/l/${slug}/admin/login`,
          librarianLogin: `${origin}/l/${slug}/librarian/login`,
          studentLogin: `${origin}/l/${slug}/student/login`,
        },
      };

      setCreatedResult(resultData);
    } catch (err: any) {
      setError(err?.message || 'Failed to create library tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (createdResult) {
    const { tenant, subscription, urls } = createdResult;
    return (
      <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
        <PublicNavbar />

        <main className="flex-1 py-16 sm:py-24 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-950 p-8 sm:p-10 rounded-3xl border border-emerald-500/30 shadow-2xl space-y-8 animate-in fade-in">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Provisioning Successful — Library Online
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {tenant.name} is Ready!
              </h1>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                Your library has been successfully provisioned with isolated tenant routing, verified admin credentials, and plan resource quotas.
              </p>
            </div>

            {/* Summary Box */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block">Library ID:</span>
                  <strong className="text-white font-mono">{tenant.id}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Subscription Tier:</span>
                  <strong className="text-blue-400">{plan.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Subscription Status:</span>
                  <strong className="text-emerald-400 uppercase">{subscription?.status || 'Active'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Trial Expiry:</span>
                  <strong className="text-amber-300">
                    {subscription?.expiryDate ? new Date(subscription.expiryDate).toLocaleString() : 'N/A (72h Free Trial)'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Access URLs */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Role-Specific Portal Access URLs
              </h3>

              <div className="space-y-3">
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Library Admin Portal</span>
                    <span className="text-xs font-mono text-blue-400 truncate block">{urls.adminLogin}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyLink(urls.adminLogin, 'admin')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedKey === 'admin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'admin' ? 'Copied' : 'Copy'}</span>
                    </button>
                    <a
                      href={`/l/${tenant.slug}/admin/login`}
                      className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                      title="Open Portal"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Librarian Circulation Desk</span>
                    <span className="text-xs font-mono text-blue-400 truncate block">{urls.librarianLogin}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyLink(urls.librarianLogin, 'librarian')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedKey === 'librarian' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'librarian' ? 'Copied' : 'Copy'}</span>
                    </button>
                    <a
                      href={`/l/${tenant.slug}/librarian/login`}
                      className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                      title="Open Portal"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Student Portal</span>
                    <span className="text-xs font-mono text-blue-400 truncate block">{urls.studentLogin}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyLink(urls.studentLogin, 'student')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedKey === 'student' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'student' ? 'Copied' : 'Copy'}</span>
                    </button>
                    <a
                      href={`/l/${tenant.slug}/student/login`}
                      className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                      title="Open Portal"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => navigate(`/l/${tenant.slug}`)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors"
              >
                View Library Public Page
              </button>
              <button
                onClick={() => navigate(`/l/${tenant.slug}/admin/login`)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/30 cursor-pointer transition-colors"
              >
                Sign In to Library Admin →
              </button>
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      <main className="flex-1 py-16 sm:py-24 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-slate-950 p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Step 3 of 3: Library Details & Checkout
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Finalize Library Registration
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Selected Plan: <strong>{plan.name}</strong> ({plan.code === 'free' ? '3-Day Free Trial' : 'Active Plan'}). Verified Admin: {adminEmail}.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegisterLibrary} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Library Display Name *</label>
              <input
                type="text"
                required
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                placeholder="e.g. Al-Hikmah Academy Library"
                className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-slate-300">Unique Library Slug (URL Path) *</label>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors">
                <span className="px-3.5 text-xs sm:text-sm text-slate-400 font-mono bg-slate-950 py-2.5 sm:py-3 border-r border-slate-800">/l/</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="al-hikmah"
                  className="flex-1 px-3.5 py-2.5 sm:py-3 bg-slate-900 text-sm text-white font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-slate-300">Institution Name *</label>
                <input
                  type="text"
                  required
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. Al-Hikmah Educational Trust"
                  className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-slate-300">Institution Sector *</label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value as InstitutionType)}
                  className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none cursor-pointer transition-colors"
                >
                  <option value="islamic_institution">Islamic Seminary / Madrasa</option>
                  <option value="college">College / Higher Secondary</option>
                  <option value="school">School</option>
                  <option value="university">University</option>
                  <option value="public_library">Public Library</option>
                  <option value="research_center">Research Center</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-slate-300">Administrator Full Name *</label>
                <input
                  type="text"
                  required
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  placeholder="e.g. Dr. Ibrahim Al-Mansoor"
                  className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-slate-300">Admin Email Address *</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@institution.edu"
                  className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-slate-300">Admin WhatsApp / Mobile Number</label>
              <input
                type="tel"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-slate-300">Campus Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Building, Street, City, Country"
                className="w-full px-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <input
                type="checkbox"
                id="terms"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs sm:text-sm text-slate-300 cursor-pointer leading-relaxed">
                I accept the MBT Library <span className="text-blue-400 underline">Terms of Service</span> and <span className="text-blue-400 underline">Privacy Policy</span>. I confirm that the provided contact mobile and email are verified.
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigate('/auth/verify')}
                className="text-xs sm:text-sm text-slate-400 hover:text-white cursor-pointer underline order-2 sm:order-1"
              >
                ← Back to OTP Verification
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 order-1 sm:order-2"
              >
                <span>{submitting ? 'Provisioning Library...' : 'Provision Library & Launch'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
