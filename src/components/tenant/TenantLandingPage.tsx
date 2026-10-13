import React, { useState } from 'react';
import {
  Building2,
  BookOpen,
  Search,
  Users,
  ShieldCheck,
  ArrowRight,
  Clock,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { Tenant } from '../../types/saas';
import { useRouter } from '../../router/RouterContext';
import { saasStorage } from '../../services/storage';

interface TenantLandingPageProps {
  tenant: Tenant;
}

export const TenantLandingPage: React.FC<TenantLandingPageProps> = ({ tenant }) => {
  const { navigate } = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const subscription = saasStorage.getSubscriptionForTenant(tenant.id);
  const plan = subscription ? saasStorage.getPlanById(subscription.planId) : null;

  const brandColor = tenant.settings.primaryColor || '#2563eb';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Top Multi-Tenant Admin Banner for seamless demo navigation */}
      <div className="bg-slate-900 text-slate-300 px-4 py-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-semibold text-white truncate">Multi-Tenant Route:</span>
          <code className="text-blue-400 font-mono text-[11px] truncate">/l/{tenant.slug}</code>
          <span className="text-slate-400 hidden md:inline truncate">
            ({tenant.institutionType.replace('_', ' ')})
          </span>
        </div>
        <button
          onClick={() => navigate('/super-admin?tab=libraries')}
          className="text-xs text-blue-400 hover:text-white flex items-center space-x-1 font-semibold cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span>← Back to MBT Super Admin</span>
        </button>
      </div>

      {/* Institution Main Header */}
      <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white font-black text-base sm:text-lg shadow-sm shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              {tenant.logoInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight truncate">
                  {tenant.name}
                </h1>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase shrink-0"
                  style={{ backgroundColor: brandColor }}
                >
                  {tenant.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">{tenant.institutionName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs overflow-x-auto scrollbar-thin pb-1 sm:pb-0">
            <button
              onClick={() => navigate(`/l/${tenant.slug}/student/login`)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Student Portal
            </button>
            <button
              onClick={() => navigate(`/l/${tenant.slug}/librarian/login`)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Librarian Desk
            </button>
            <button
              onClick={() => navigate(`/l/${tenant.slug}/admin/login`)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-white font-semibold rounded-lg shadow-xs transition-opacity cursor-pointer shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              Library Admin
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-slate-100 py-8 sm:py-12 px-4 sm:px-6 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center space-y-3 sm:space-y-4">
          <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Dedicated Campus Digital Repository & Library Network</span>
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Welcome to {tenant.name}
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Search thousands of catalogued manuscripts, academic textbooks, Islamic literature, and
            research journals. Reserve titles online or visit our circulation desk.
          </p>

          {/* Quick OPAC Search bar */}
          <div className="pt-2 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row shadow-md rounded-xl overflow-hidden border border-slate-300 bg-white">
              <div className="flex items-center flex-1 px-3 py-2 sm:py-0 min-w-0">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalogue by title, author, ISBN..."
                  className="w-full text-xs sm:text-sm outline-none bg-transparent py-2"
                />
              </div>
              <button
                className="w-full sm:w-auto px-5 py-2.5 sm:py-3.5 text-white font-bold text-xs uppercase tracking-wider shrink-0 transition-opacity cursor-pointer"
                style={{ backgroundColor: brandColor }}
              >
                Search OPAC
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 mt-2">
              <span>Popular: Tafsir Ibn Kathir</span>
              <span>·</span>
              <span>Organic Chemistry</span>
              <span>·</span>
              <span>Algorithms 4th Ed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Portals Access Selection Cards (Level 2, 3, 4) */}
      <section className="max-w-7xl mx-auto px-6 py-10 w-full flex-1">
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-slate-900">Choose Your Access Portal</h3>
          <p className="text-xs text-slate-500 mt-1">
            Access is securely partitioned by tenant role privileges
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Level 2: Library Admin */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Level 2 Access
              </div>
              <h4 className="text-lg font-bold text-slate-900 mt-1">Library Admin Portal</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Configure institution branding, invite librarians, manage student enrolments,
                and review circulation reports.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div>✓ Staff & librarian accounts</div>
                <div>✓ Borrowing & overdue policies</div>
                <div>✓ Subscription usage monitor</div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/l/${tenant.slug}/admin/login`)}
              className="mt-6 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <span>Enter Admin Portal</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Level 3: Librarian Circulation Desk */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Level 3 Access
              </div>
              <h4 className="text-lg font-bold text-slate-900 mt-1">Librarian Circulation Desk</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Scan accession barcodes, issue and return books, process hold reservations, and
                collect overdue fines.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div>✓ Fast barcode check-in / check-out</div>
                <div>✓ Member search & verification</div>
                <div>✓ Physical copy condition audits</div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/l/${tenant.slug}/librarian/login`)}
              className="mt-6 w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <span>Enter Librarian Desk</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Level 4: Student & Member Portal */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold mb-4">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-600">
                Level 4 Access
              </div>
              <h4 className="text-lg font-bold text-slate-900 mt-1">Student & Member Portal</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Search books, view shelf call numbers, reserve high-demand titles, and check your
                due dates and fine statements.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div>✓ Mobile-responsive self-service</div>
                <div>✓ Active loans & due date tracker</div>
                <div>✓ Online hold queue placement</div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/l/${tenant.slug}/student/login`)}
              className="mt-6 w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <span>Enter Student Portal</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Institution Information Strip */}
        <div className="mt-10 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-xs">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Library Location</span>
              <p className="text-slate-600 mt-0.5">
                {tenant.settings.address || 'Central Academic Campus'}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Operating Hours</span>
              <p className="text-slate-600 mt-0.5">Sun – Thu: 08:00 AM – 08:00 PM</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Contact Desk</span>
              <p className="text-slate-600 mt-0.5">{tenant.settings.contactEmail}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Phone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Phone Support</span>
              <p className="text-slate-600 mt-0.5">{tenant.settings.contactPhone}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 px-6 text-xs border-t border-slate-800 text-center">
        <p>
          Powered by <strong>MBT Library SaaS Multi-Tenant Architecture</strong> · Centralized Platform
          for Educational & Islamic Institutions
        </p>
      </footer>
    </div>
  );
};
