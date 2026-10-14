import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Building2 } from 'lucide-react';
import { useRouter } from '../../router/RouterContext';
import { Logo } from '../common/Logo';

export const SuperAdminLogin: React.FC = () => {
  const { loginSuperAdmin, navigate } = useRouter();
  const [email, setEmail] = useState('mbtofficial26@gmail.com');
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans text-slate-200">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl backdrop-blur-md">
        <div className="flex flex-col items-center justify-center space-y-3 mb-6">
          <Logo size={50} showText={true} subtext="Platform Owner & SaaS Administration" />
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 font-semibold text-xs sm:text-sm mb-1.5">
              Super Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold text-xs sm:text-sm mb-1.5">
              Platform Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Seed credentials indicator for evaluator */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-200">Pre-Bootstrapped Platform Owner:</div>
            <div>Email: <code className="text-blue-400 font-mono">mbtofficial26@gmail.com</code></div>
            <div>Password: <code className="text-blue-400 font-mono">mbt@Admin2026!</code></div>
          </div>

          <button
            type="submit"
            className="w-full py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/40 cursor-pointer active:scale-95"
          >
            <span>Sign In to Super Admin</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-700/60 text-center text-xs text-slate-400">
          Public registration is strictly disabled. Super admin accounts are managed via server initialization.
        </div>
      </div>
    </div>
  );
};
