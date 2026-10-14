import React from 'react';
import { useRouter } from '../../router/RouterContext';
import { ShieldCheck, ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from '../common/Logo';

export const PublicNavbar: React.FC = () => {
  const { navigate, currentPath } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => currentPath === path;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo & Brand */}
        <div 
          onClick={() => navigate('/')} 
          className="cursor-pointer group hover:opacity-95 transition-opacity min-w-0"
        >
          <Logo size={38} showText={true} />
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-sm font-semibold">
          <button
            onClick={() => navigate('/')}
            className={`transition-colors cursor-pointer py-1 ${isActive('/') ? 'text-blue-400 font-bold' : 'text-slate-300 hover:text-white'}`}
          >
            Home
          </button>
          <button
            onClick={() => navigate('/features')}
            className={`transition-colors cursor-pointer py-1 ${isActive('/features') ? 'text-blue-400 font-bold' : 'text-slate-300 hover:text-white'}`}
          >
            Features
          </button>
          <button
            onClick={() => navigate('/plans')}
            className={`transition-colors cursor-pointer py-1 ${isActive('/plans') ? 'text-blue-400 font-bold' : 'text-slate-300 hover:text-white'}`}
          >
            Subscription Plans
          </button>
          <button
            onClick={() => navigate('/contact')}
            className={`transition-colors cursor-pointer py-1 ${isActive('/contact') ? 'text-blue-400 font-bold' : 'text-slate-300 hover:text-white'}`}
          >
            Contact
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
          <button
            onClick={() => navigate('/auth/login')}
            className="text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 cursor-pointer transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => navigate('/plans')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/30 flex items-center space-x-1.5 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="p-2.5 rounded-xl bg-slate-800/90 text-slate-200 hover:text-white cursor-pointer active:scale-95 transition-transform"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-1.5 text-sm font-semibold shadow-2xl">
          <button
            onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors ${isActive('/') ? 'bg-blue-600/15 text-blue-400 font-bold' : 'text-slate-200 hover:bg-slate-800'}`}
          >
            Home
          </button>
          <button
            onClick={() => { navigate('/features'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors ${isActive('/features') ? 'bg-blue-600/15 text-blue-400 font-bold' : 'text-slate-200 hover:bg-slate-800'}`}
          >
            Features
          </button>
          <button
            onClick={() => { navigate('/plans'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors ${isActive('/plans') ? 'bg-blue-600/15 text-blue-400 font-bold' : 'text-slate-200 hover:bg-slate-800'}`}
          >
            Subscription Plans
          </button>
          <button
            onClick={() => { navigate('/contact'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors ${isActive('/contact') ? 'bg-blue-600/15 text-blue-400 font-bold' : 'text-slate-200 hover:bg-slate-800'}`}
          >
            Contact
          </button>
          <div className="pt-3 border-t border-slate-800 flex flex-col space-y-2.5">
            <button
              onClick={() => { navigate('/auth/login'); setMobileMenuOpen(false); }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-center text-sm font-bold transition-colors"
            >
              Library Sign In
            </button>
            <button
              onClick={() => { navigate('/plans'); setMobileMenuOpen(false); }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-center text-sm font-bold shadow-lg shadow-blue-900/30 flex items-center justify-center space-x-2 transition-colors"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
