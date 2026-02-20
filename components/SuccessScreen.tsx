
import React from 'react';
import { AgreementData } from '../types';
import { CheckCircle2, FileText, ArrowLeft, Download, Mail } from 'lucide-react';

interface SuccessScreenProps {
  agreement: AgreementData;
  onReturn: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ agreement, onReturn }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-100 rounded-full mb-8 animate-bounce">
        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
      </div>
      
      <h2 className="text-4xl font-bold text-slate-800 mb-4">Agreement Submitted!</h2>
      <p className="text-slate-600 text-lg mb-12">
        Thank you, <span className="font-bold">{agreement.dboName}</span>. Your payment agreement has been successfully submitted to the Kenya Dairy Board for review.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-12">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Email Notification</h4>
            <p className="text-sm text-slate-500">An email has been sent to the KDB administrative team to review and countersign.</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start space-x-4">
          <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Review Timeline</h4>
            <p className="text-sm text-slate-500">Upon approval, you will receive the final signed agreement in PDF format via email.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
        <button 
          onClick={onReturn}
          className="w-full sm:w-auto px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors flex items-center justify-center"
        >
          <ArrowLeft className="mr-2 w-5 h-5" /> Start New Form
        </button>
        <button 
          className="w-full sm:w-auto px-8 py-3 bg-white text-emerald-600 border-2 border-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center"
        >
          <Download className="mr-2 w-5 h-5" /> Download Draft
        </button>
      </div>
    </div>
  );
};
