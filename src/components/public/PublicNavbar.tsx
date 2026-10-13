import React from 'react';
import { useRouter } from '../../router/RouterContext';
import { BookOpen, ShieldCheck, ArrowRight, Menu, X } from 'lucide-react';

export const PublicNavbar: React.FC = () => {
  const { navigate, currentPath } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => currentPath === path;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo & Brand */}
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-900/40 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-lg tracking-tight flex items-center space-x-1.5">
              <span>MBT Library</span>
              <span className="text-[10px] uppercase font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">SaaS</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Multi-Tenant Library System</p>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold">
          <button
            onClick={() => navigate('/')}
            className={`transition-colors cursor-pointer ${isActive('/') ? 'text-blue-400 font-bold' : 'text-slate-300 hover:text-white'}`}
          >
            Home
          </button>
          <button
            onClick={() => navigate('/features')}
            className={`transition-colors cursor-pointer ${isActive('/features') ? 'text-blue-400 font-bold' : 'text-slate-300 hover:text-white'}`}
          >
            Features
          </button>
          <button
            onClick={() => navigate('/plans')}
            className={`transition-colors cursor-pointer ${isActive('/plans') ? 'text-blue-400 font-bold' : 'text-slate-300 hover:text-white'}`}
          >
            Subscription Plans
          </button>
          <button
            onClick={() => navigate('/contact')}
            className={`transition-colors cursor-pointer ${isActive('/contact') ? 'text-blue-400 font-bold' : 'text-slate-300 hover:text-white'}`}
          >
            Contact
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <button
            onClick={() => navigate('/super-admin-login')}
            className="text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => navigate('/plans')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/30 flex items-center space-x-1.5 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-5 space-y-4 text-xs font-semibold">
          <button
            onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-slate-200 hover:text-white"
          >
            Home
          </button>
          <button
            onClick={() => { navigate('/features'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-slate-200 hover:text-white"
          >
            Features
          </button>
          <button
            onClick={() => { navigate('/plans'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-slate-200 hover:text-white"
          >
            Subscription Plans
          </button>
          <button
            onClick={() => { navigate('/contact'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-slate-200 hover:text-white"
          >
            Contact
          </button>
          <div className="pt-3 border-t border-slate-800 flex flex-col space-y-2">
            <button
              onClick={() => { navigate('/super-admin-login'); setMobileMenuOpen(false); }}
              className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-center font-bold"
            >
              Login
            </button>
            <button
              onClick={() => { navigate('/plans'); setMobileMenuOpen(false); }}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-center font-bold"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
