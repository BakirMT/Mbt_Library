import React from 'react';
import { useRouter } from '../../router/RouterContext';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { 
  BookOpen, 
  ShieldCheck, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  BarChart3, 
  QrCode, 
  Clock, 
  Sparkles, 
  Layers, 
  Lock 
} from 'lucide-react';

export const PublicHomePage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-28 md:pt-28 md:pb-36 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.15),transparent_50%)] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Multi-Tenant Library Cloud</span>
            </div>

            <div className="max-w-4xl mx-auto space-y-4">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
                Your Complete Library.{' '}
                <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500 bg-clip-text text-transparent">
                  One Smart Platform.
                </span>
              </h1>
              <p className="text-base sm:text-xl text-slate-300 font-normal max-w-2xl mx-auto leading-relaxed">
                Manage books, members, circulation, subscriptions, and library operations with one powerful library management system.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => navigate('/plans')}
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-blue-900/40 flex items-center justify-center space-x-2 cursor-pointer transition-all hover:scale-105"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/features')}
                className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-2xl border border-slate-700 flex items-center justify-center space-x-2 cursor-pointer transition-all"
              >
                <span>Explore Plans & Features</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instant 3-Day Free Trial</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Isolated Tenant Portals</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Cloud SQL PostgreSQL & RLS</span>
              </span>
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section className="py-20 bg-slate-950 border-b border-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Institutional Dashboard</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">Built for Librarians and Administrators</h2>
              <p className="text-sm text-slate-400">
                Provide your students, faculty, and library staff with blazing-fast role-specific portals tailored to your campus or seminary.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 pb-5 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white text-base">
                    DI
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Darul Irfan Islamic Academy Library</h3>
                    <p className="text-xs text-slate-400 font-mono">/l/darul-irfan · Standard Institutional Plan</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active Subscription
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 text-xs font-semibold uppercase">Catalogue Titles</span>
                  <div className="text-2xl font-black text-white">8,420</div>
                  <span className="text-[11px] text-emerald-400 font-medium">Fully catalogued volumes</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 text-xs font-semibold uppercase">Active Circulation</span>
                  <div className="text-2xl font-black text-white">312</div>
                  <span className="text-[11px] text-blue-400 font-medium">On loan to students</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 text-xs font-semibold uppercase">Registered Members</span>
                  <div className="text-2xl font-black text-white">1,420</div>
                  <span className="text-[11px] text-indigo-400 font-medium">Students & faculty</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-400 text-xs font-semibold uppercase">Daily Circulation</span>
                  <div className="text-2xl font-black text-white">48</div>
                  <span className="text-[11px] text-amber-400 font-medium">Issues & returns today</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three Step Onboarding Section */}
        <section className="py-24 bg-slate-900 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Simple Onboarding</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">Get Your Library Online in 3 Minutes</h2>
              <p className="text-sm text-slate-400">
                No complex server setup required. Choose your plan, verify your identity, and launch instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800/80 space-y-4 relative">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-lg">
                  1
                </div>
                <h3 className="text-lg font-bold text-white">Choose Plan & Verify</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select between Free (3-day trial), Basic, or Standard plans. Securely verify your email and mobile number with OTP.
                </p>
              </div>

              <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800/80 space-y-4 relative">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-lg">
                  2
                </div>
                <h3 className="text-lg font-bold text-white">Register Library & Admin</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Provide your institution name, unique library slug (e.g. <code className="text-blue-400">/l/my-library</code>), and initial administrator credentials.
                </p>
              </div>

              <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800/80 space-y-4 relative">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-lg">
                  3
                </div>
                <h3 className="text-lg font-bold text-white">Launch Portals & Manage</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Access your dedicated Admin, Librarian, and Student portals instantly. Start cataloguing books and managing circulation.
                </p>
              </div>
            </div>

            <div className="text-center pt-12">
              <button
                onClick={() => navigate('/auth/register')}
                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/30 cursor-pointer transition-all"
              >
                Register Your Library Now →
              </button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
};
