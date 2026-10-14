import React from 'react';
import { useRouter } from '../../router/RouterContext';
import { BookOpen, Mail, ShieldCheck, ExternalLink } from 'lucide-react';
import { Logo } from '../common/Logo';

export const PublicFooter: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <footer className="bg-slate-950 text-slate-400 font-sans border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-900">
        {/* Brand Column */}
        <div className="space-y-4">
          <div 
            onClick={() => navigate('/')} 
            className="cursor-pointer group hover:opacity-95 transition-opacity inline-block"
          >
            <Logo size={36} showText={true} />
          </div>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            The complete multi-tenant SaaS library management system for schools, colleges, universities, and Islamic academies worldwide.
          </p>
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} MBT Library System. All rights reserved.
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Navigation</h4>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            <li><button onClick={() => navigate('/')} className="hover:text-white transition-colors cursor-pointer">Home</button></li>
            <li><button onClick={() => navigate('/features')} className="hover:text-white transition-colors cursor-pointer">All Facilities</button></li>
            <li><button onClick={() => navigate('/plans')} className="hover:text-white transition-colors cursor-pointer">Subscription Plans</button></li>
            <li><button onClick={() => navigate('/contact')} className="hover:text-white transition-colors cursor-pointer">Contact Authority</button></li>
          </ul>
        </div>

        {/* Portals & Access */}
        <div className="space-y-3">
          <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Portals & Access</h4>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            <li><button onClick={() => navigate('/auth/register')} className="hover:text-white transition-colors cursor-pointer">Register New Library</button></li>
            <li><button onClick={() => navigate('/auth/login')} className="hover:text-white transition-colors cursor-pointer">Library Login Portal</button></li>
            <li><button onClick={() => navigate('/plans')} className="hover:text-white transition-colors cursor-pointer">Campus Subscription Plans</button></li>
          </ul>
        </div>

        {/* Support & Security */}
        <div className="space-y-3">
          <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Support & Compliance</h4>
          <p className="text-xs sm:text-sm text-slate-400">
            Need custom institutional deployment or enterprise academic migration?
          </p>
          <div className="pt-1">
            <a href="mailto:support@mbtlibrary.com" className="inline-flex items-center space-x-1.5 text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-semibold">
              <Mail className="w-3.5 h-3.5" />
              <span>support@mbtlibrary.com</span>
            </a>
          </div>
          <div className="flex items-center space-x-2 pt-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cloud SQL PostgreSQL & RLS Secured</span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
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
