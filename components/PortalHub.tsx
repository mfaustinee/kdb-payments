import React from 'react';
import { ShieldCheck, ArrowRight, Building2, FileCheck, CircleCheck, AlertCircle } from 'lucide-react';

interface PortalHubProps {
  onSelectPaymentPortal: () => void;
  onSelectClosurePortal: () => void;
  unreadAgreementsCount: number;
  unreadClosuresCount: number;
}

export const PortalHub: React.FC<PortalHubProps> = ({ 
  onSelectPaymentPortal, 
  onSelectClosurePortal,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-24 space-y-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-4">
        <div className="inline-flex p-3 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm mb-2">
          <ShieldCheck className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Kenya Dairy Board
        </h1>
        <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">
          Regulatory Compliance & Client Portal
        </p>
        <p className="max-w-xl mx-auto text-sm text-slate-500 font-medium leading-relaxed">
          Welcome to the official digital service portal of the Kenya Dairy Board. 
          Select a simplified regulatory pathway below to execute a legal levy payment agreement or formally submit a business cessation notice.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        {/* Card 1: Levy Payment Agreement */}
        <div 
          onClick={onSelectPaymentPortal}
          className="group relative cursor-pointer overflow-hidden rounded-[32px] bg-white border border-slate-100 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-emerald-300 p-8 flex flex-col justify-between space-y-8"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/40 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
          
          <div className="space-y-6">
            <div className="inline-flex p-4 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
              <FileCheck className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors">
                Levy Arrears Payment Portal
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Portals & Agreements (PAP)
              </p>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Formally propose or formalize structured installment plans to clear outstanding levy arrears. Verify your premise details to begin your schedule.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access PAP</span>
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Card 2: Business Closure Notification */}
        <div 
          onClick={onSelectClosurePortal}
          className="group relative cursor-pointer overflow-hidden rounded-[32px] bg-white border border-slate-100 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-red-300 p-8 flex flex-col justify-between space-y-8"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/40 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
          
          <div className="space-y-6">
            <div className="inline-flex p-4 bg-red-50 rounded-2xl text-red-600 border border-red-100">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-red-700 transition-colors">
                Business Closure & Cessation
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                KDB Regulatory Notices
              </p>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Formally notify KDB of business cessation or permanent premise closures. Essential for regulatory compliance and updating license registries.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notify Cessation</span>
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto bg-slate-50 rounded-3xl p-6 border flex items-center space-x-4">
        <CircleCheck className="w-8 h-8 text-emerald-500 shrink-0" />
        <div className="text-left">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Certified</span>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            All data transmissions are fully encrypted and securely logged. Access is audited under the provisions of the Kenya Dairy Industry Act (Cap 336).
          </p>
        </div>
      </div>
    </div>
  );
};
