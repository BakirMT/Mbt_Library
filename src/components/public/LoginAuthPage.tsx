import React, { useState } from 'react';
import { useRouter } from '../../router/RouterContext';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { Building2, ShieldCheck, ArrowRight, Lock, KeyRound } from 'lucide-react';
import { saasStorage } from '../../services/storage';

export const LoginAuthPage: React.FC = () => {
  const { navigate } = useRouter();
  const [slugQuery, setSlugQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGoToTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slugQuery.trim()) {
      setError('Please enter a library slug or name.');
      return;
    }
    const clean = slugQuery.trim().toLowerCase().replace(/^\/l\//, '');
    const tenants = saasStorage.getTenants();
    const found = tenants.find((t) => t.slug === clean || t.name.toLowerCase().includes(clean));
    if (!found) {
      setError(`Library matching "${slugQuery}" not found.`);
      return;
    }
    navigate(`/l/${found.slug}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      <main className="flex-1 py-16 sm:py-24 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto shadow-lg shadow-blue-900/30">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">MBT Library Portal Login</h1>
            <p className="text-xs text-slate-400">
              Access your institutional library administration, circulation desk, or student borrowing portal.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Super Admin Login Option */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Super Administrator Console</h3>
              </div>
              <p className="text-xs text-slate-400">
                Manage global plans, provision libraries, review premium enquiries, and monitor platform subscriptions.
              </p>
              <button
                onClick={() => navigate('/super-admin-login')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center space-x-2"
              >
                <span>Super Admin Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Tenant Library Search */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Tenant Library Access</h3>
              </div>
              <p className="text-xs text-slate-400">
                Search your library by slug (e.g. <code className="text-blue-400">darul-irfan</code>) or name to open your institution&apos;s portal.
              </p>
              <form onSubmit={handleGoToTenant} className="space-y-2.5">
                <input
                  type="text"
                  value={slugQuery}
                  onChange={(e) => setSlugQuery(e.target.value)}
                  placeholder="Enter library slug or name..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Go to Library Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-xs text-slate-400">
              Don&apos;t have a library yet?{' '}
              <button onClick={() => navigate('/plans')} className="text-blue-400 hover:underline font-semibold cursor-pointer">
                Start Free Trial
              </button>
            </span>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
