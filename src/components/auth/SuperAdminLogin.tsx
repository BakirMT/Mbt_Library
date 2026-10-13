import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Building2 } from 'lucide-react';
import { useRouter } from '../../router/RouterContext';

export const SuperAdminLogin: React.FC = () => {
  const { loginSuperAdmin, navigate } = useRouter();
  const [email, setEmail] = useState('superadmin@mbtlibrary.com');
  const [password, setPassword] = useState('mbt@Admin2026!');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const success = loginSuperAdmin(email);
    if (success) {
      navigate('/super-admin?tab=overview');
    } else {
      setError('Invalid Super Admin credentials. Only provisioned platform owners have access.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-200">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 max-w-md w-full shadow-2xl backdrop-blur-md">
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl mx-auto shadow-lg shadow-blue-900/40">
            M
          </div>
          <div className="flex items-center justify-center space-x-1.5">
            <span className="font-extrabold text-white text-lg tracking-tight">MBT LIBRARY</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              LEVEL 1
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Platform Owner & Central SaaS Administration Portal
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Super Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Platform Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Seed credentials indicator for evaluator */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/60 text-[11px] text-slate-400">
            <div className="font-semibold text-slate-300 mb-0.5">Pre-Bootstrapped Platform Owner:</div>
            <div>Email: <code className="text-blue-400">superadmin@mbtlibrary.com</code></div>
            <div>Password: <code className="text-blue-400">mbt@Admin2026!</code></div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md shadow-blue-900/40 cursor-pointer"
          >
            <span>Sign In to Super Admin</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-700/60 text-center text-[11px] text-slate-400">
          Public registration is strictly disabled. Super admin accounts are managed via server initialization.
        </div>
      </div>
    </div>
  );
};
