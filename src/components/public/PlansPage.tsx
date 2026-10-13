import React from 'react';
import { useRouter } from '../../router/RouterContext';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { CheckCircle2, ArrowRight, ShieldCheck, Sparkles, HelpCircle } from 'lucide-react';
import { saasStorage } from '../../services/storage';

export const PlansPage: React.FC = () => {
  const { navigate } = useRouter();
  const plans = saasStorage.getPlans();

  const handleSelectPlan = (planId: string) => {
    navigate(`/auth/register?plan=${planId}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Institutional Pricing</span>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              Simple, Transparent Subscription Plans
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Choose the exact capacity your school, college, university, or research center requires. Start with a strict 3-day Free trial or select an authorized institutional plan.
            </p>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plans.map((plan) => {
              const isFree = plan.code === 'free';
              const isPremium = plan.code === 'premium';
              const isStandard = plan.isPopular || plan.code === 'standard';

              return (
                <div
                  key={plan.id}
                  className={`bg-slate-950 rounded-3xl p-6 sm:p-8 border flex flex-col justify-between relative transition-all duration-200 hover:border-blue-500/50 ${
                    isStandard
                      ? 'border-blue-500 shadow-2xl shadow-blue-950/50 bg-gradient-to-b from-slate-950 via-slate-950 to-blue-950/20'
                      : 'border-slate-800'
                  }`}
                >
                  {isStandard && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider rounded-full shadow-md">
                      Most Popular Campus Plan
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white">{plan.name}</h3>
                        {isFree && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            3-Day Trial
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-2 min-h-[36px]">{plan.description}</p>
                    </div>

                    {/* Pricing */}
                    <div className="py-3 border-y border-slate-800">
                      {isPremium ? (
                        <div className="text-xl font-black text-white">Contact Authority</div>
                      ) : isFree ? (
                        <div className="flex items-baseline space-x-1">
                          <span className="text-3xl font-black text-white">₹0</span>
                          <span className="text-xs text-slate-400">/ 3 days trial</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-baseline space-x-1">
                            <span className="text-3xl font-black text-white">₹{plan.priceMonthly.toLocaleString('en-IN')}</span>
                            <span className="text-xs text-slate-400">/ month</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            or ₹{plan.priceAnnual.toLocaleString('en-IN')} / year (Save 15%)
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resource Limits List */}
                    <div className="space-y-2.5 text-xs">
                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Resource Quotas</div>
                      <ul className="space-y-2 text-slate-300">
                        <li className="flex items-center justify-between">
                          <span className="text-slate-400">Catalogue Titles:</span>
                          <strong className="text-white">{isPremium ? 'Custom' : plan.maxTitles.toLocaleString()}</strong>
                        </li>
                        <li className="flex items-center justify-between">
                          <span className="text-slate-400">Physical Copies:</span>
                          <strong className="text-white">{isPremium ? 'Custom' : plan.maxCopies.toLocaleString()}</strong>
                        </li>
                        <li className="flex items-center justify-between">
                          <span className="text-slate-400">Librarians:</span>
                          <strong className="text-white">{isPremium ? 'Custom' : plan.maxLibrarians}</strong>
                        </li>
                        <li className="flex items-center justify-between">
                          <span className="text-slate-400">Students:</span>
                          <strong className="text-white">{isPremium ? 'Custom' : plan.maxStudents.toLocaleString()}</strong>
                        </li>
                        <li className="flex items-center justify-between">
                          <span className="text-slate-400">Storage:</span>
                          <strong className="text-white">{isPremium ? 'Custom' : `${plan.storageMb} MB`}</strong>
                        </li>
                      </ul>
                    </div>

                    {/* Included Features */}
                    <div className="space-y-2 text-xs pt-2">
                      <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Features Included</div>
                      <ul className="space-y-1.5 text-slate-400">
                        {plan.features?.slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-start space-x-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-6">
                    {isPremium ? (
                      <button
                        type="button"
                        onClick={() => navigate('/contact')}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                      >
                        <span>Contact Authority</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectPlan(plan.id)}
                        className={`w-full py-3 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 cursor-pointer transition-colors ${
                          isStandard
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        }`}
                      >
                        <span>{isFree ? 'Start 3-Day Free Trial' : `Select ${plan.name}`}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQ / Info Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <span>Need a Custom Enterprise or National Library Network License?</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-2xl">
                We support multi-campus federated library synchronization, bespoke cataloguing quotas, and dedicated Cloud SQL database instances for university systems and government ministries.
              </p>
            </div>
            <button
              onClick={() => navigate('/contact')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shrink-0 cursor-pointer transition-colors"
            >
              Contact Authority
            </button>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
