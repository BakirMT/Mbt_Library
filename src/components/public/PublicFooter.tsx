import React from 'react';
import { useRouter } from '../../router/RouterContext';
import { BookOpen, Mail, ShieldCheck, ExternalLink } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <footer className="bg-slate-950 text-slate-400 font-sans border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-900">
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-black text-white text-base tracking-tight">MBT Library</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The complete multi-tenant SaaS library management system for schools, colleges, universities, and Islamic academies worldwide.
          </p>
          <div className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} MBT Library System. All rights reserved.
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Navigation</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={() => navigate('/')} className="hover:text-white transition-colors">Home</button></li>
            <li><button onClick={() => navigate('/features')} className="hover:text-white transition-colors">All Facilities</button></li>
            <li><button onClick={() => navigate('/plans')} className="hover:text-white transition-colors">Subscription Plans</button></li>
            <li><button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">Contact Authority</button></li>
          </ul>
        </div>

        {/* Portals & Access */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Portals & Access</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={() => navigate('/super-admin-login')} className="hover:text-white transition-colors flex items-center space-x-1"><span>Super Admin Console</span></button></li>
            <li><button onClick={() => navigate('/auth/register')} className="hover:text-white transition-colors">Register New Library</button></li>
            <li><button onClick={() => navigate('/auth/login')} className="hover:text-white transition-colors">Tenant Login Portal</button></li>
          </ul>
        </div>

        {/* Support & Security */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Support & Compliance</h4>
          <p className="text-xs text-slate-400">
            Need custom institutional deployment or enterprise academic migration?
          </p>
          <div className="pt-1">
            <a href="mailto:support@mbtlibrary.com" className="inline-flex items-center space-x-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold">
              <Mail className="w-3.5 h-3.5" />
              <span>support@mbtlibrary.com</span>
            </a>
          </div>
          <div className="flex items-center space-x-2 pt-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cloud SQL PostgreSQL & RLS Secured</span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
        <span>MBT Library SaaS Platform — Multi-Tenant Architecture</span>
        <div className="flex items-center space-x-6">
          <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
          <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
          <span className="hover:text-slate-400 cursor-pointer">Security Statement</span>
        </div>
      </div>
    </footer>
  );
};
