import React from 'react';
import { useRouter } from '../../router/RouterContext';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { 
  Building2, 
  BookOpen, 
  QrCode, 
  Users, 
  Calendar, 
  AlertTriangle, 
  Tag, 
  ShieldCheck, 
  BarChart3, 
  Smartphone, 
  Lock, 
  ArrowRight,
  CheckCircle2,
  Layers
} from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  const { navigate } = useRouter();

  const facilities = [
    {
      icon: <Building2 className="w-6 h-6 text-blue-400" />,
      title: 'Multi-Library & Tenant Isolation',
      description: 'Host hundreds of independent libraries on a single secure SaaS platform. Each institution gets its own slug, custom branding, and isolated data boundaries.'
    },
    {
      icon: <BookOpen className="w-6 h-6 text-indigo-400" />,
      title: 'Advanced Book Catalogue',
      description: 'Comprehensive catalogue management supporting ISBN tracking, author attribution, publisher metadata, classifications, and shelf locations.'
    },
    {
      icon: <QrCode className="w-6 h-6 text-emerald-400" />,
      title: 'Physical Copies & Barcodes',
      description: 'Auto-generate accession numbers and barcode numbers for every physical book copy. Track book condition (good, fair, damaged, lost).'
    },
    {
      icon: <Users className="w-6 h-6 text-cyan-400" />,
      title: 'Circulation & Barcode Scanning',
      description: 'Lightning-fast checkout and return desks using barcode scanners. Issue books by scanning book barcodes and student ID cards instantly.'
    },
    {
      icon: <Calendar className="w-6 h-6 text-amber-400" />,
      title: 'Reservations & Waiting Lists',
      description: 'Allow students and faculty to place reservations on checked-out volumes with automated priority queues and fulfillment notifications.'
    },
    {
      icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
      title: 'Overdue Tracking & Fines',
      description: 'Automatic calculation of overdue fine amounts based on configurable daily fine rates. Track paid, pending, and waived library fines.'
    },
    {
      icon: <Tag className="w-6 h-6 text-purple-400" />,
      title: 'Categories & Classifications',
      description: 'Organize library holdings by academic subjects, Dewey decimal ranges, fiction/non-fiction, and research manuscripts.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: 'Role-Based Access Control (RBAC)',
      description: 'Granular permissions separating Super Admins, Library Admins, Senior Librarians, Circulation Staff, and Students.'
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-blue-400" />,
      title: 'Institutional Dashboards & Reports',
      description: 'Real-time analytics on active loans, overdue ratios, member engagement, and monthly circulation metrics with exportable reports.'
    },
    {
      icon: <Smartphone className="w-6 h-6 text-indigo-400" />,
      title: 'Responsive Mobile & Tablet Portals',
      description: 'Optimized touch-friendly interfaces for circulation desks, student mobile browsing, and librarian shelf management on any device.'
    },
    {
      icon: <Layers className="w-6 h-6 text-amber-400" />,
      title: 'Subscription & Usage Monitoring',
      description: 'Automated 72-hour trial enforcement, usage meter tracking against plan limits (titles, copies, librarians, students, storage), and seamless upgrades.'
    },
    {
      icon: <Lock className="w-6 h-6 text-rose-400" />,
      title: 'Secure OTP & Authentication',
      description: 'Secure multi-channel email and mobile OTP verification during onboarding, coupled with encrypted session tokens and Row Level Security.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Platform Capabilities</span>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              All Facilities & Features
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Explore the robust module suite powering MBT Library. Designed specifically for modern academic institutions, seminaries, and public libraries.
            </p>
          </div>

          {/* Facilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((fac, idx) => (
              <div 
                key={idx}
                className="bg-slate-950 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-800/80 hover:border-blue-500/50 transition-all space-y-4 shadow-xl"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  {fac.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">{fac.title}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{fac.description}</p>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="bg-gradient-to-r from-blue-900/30 via-slate-950 to-indigo-900/30 border border-blue-500/30 rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">Ready to Modernize Your Library?</h2>
            <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Deploy your library in 3 minutes with our strict 3-day Free trial or choose an institutional plan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
              <button
                onClick={() => navigate('/plans')}
                className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-900/30 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
              >
                View Subscription Plans
              </button>
              <button
                onClick={() => navigate('/auth/register')}
                className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm sm:text-base rounded-xl border border-slate-700 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
