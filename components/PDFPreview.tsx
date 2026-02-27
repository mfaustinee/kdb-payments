
import React from 'react';
import { AgreementData } from '../types';
import { ShieldCheck, Printer, X, Download } from 'lucide-react';
import { downloadAgreementPDF } from '../services/pdf.ts';

interface PDFPreviewProps {
  agreement: AgreementData;
  onClose: () => void;
  isHidden?: boolean;
}

interface AgreementContentProps {
  agreement: AgreementData;
  id?: string;
}

const AgreementContent: React.FC<AgreementContentProps> = ({ agreement, id }) => (
  <div className="p-16 text-slate-900 bg-white min-h-[1056px] leading-[1.6]" id={id}>
    {/* Header */}
    <div className="flex flex-col items-center text-center mb-10">
      <div className="mb-4">
        <img 
          src={`${window.location.origin}/api/images/96/0`} 
          alt="KDB Logo" 
          className="h-32 w-auto object-contain mx-auto"
          crossOrigin="anonymous"
        />
      </div>
      <div className="w-full border-b-2 border-slate-900 mt-6"></div>
      <h2 className="text-lg font-black mt-6 uppercase">Payment Agreement Form – Consumer Safety Levy Arrears</h2>
    </div>

    <div className="text-sm space-y-6">
      <p>
        This Payment Agreement is entered into on this <span className="font-bold border-b border-slate-400 px-2 pb-1 inline-block min-w-[30px] text-center">{new Date(agreement.date).getDate()}</span> day of 
        <span className="font-bold border-b border-slate-400 px-2 pb-1 inline-block min-w-[80px] text-center">{new Date(agreement.date).toLocaleString('default', { month: 'long' })}</span> 20<span className="font-bold border-b border-slate-400 px-1 pb-1 inline-block min-w-[30px] text-center">{new Date(agreement.date).getFullYear().toString().slice(-2)}</span> between:
      </p>

      <div className="space-y-2">
        <p><span className="font-bold">The Kenya Dairy Board (hereafter referred to as “KDB”)</span>, a state corporation established through an Act of Parliament; The Dairy Industry Act (Cap 336) Laws of Kenya and;</p>
        <div className="pl-4 space-y-2">
          <p><span className="font-bold">Dairy Business Operator (DBO) Name:</span> <span className="border-b border-slate-400 pb-1 inline-block min-w-[200px]">{agreement.dboName}</span></p>
          <p><span className="font-bold">Premise Name:</span> <span className="border-b border-slate-400 pb-1 inline-block min-w-[200px]">{agreement.premiseName}</span></p>
          <p><span className="font-bold">Regulatory Permit No:</span> <span className="border-b border-slate-400 pb-1 inline-block min-w-[200px]">{agreement.permitNo}</span></p>
          <p><span className="font-bold">Premise Location:</span> <span className="border-b border-slate-400 pb-1 inline-block min-w-[150px]">{agreement.location}</span> | <span className="font-bold">County:</span> <span className="border-b border-slate-400 pb-1 inline-block min-w-[100px]">{agreement.county}</span></p>
          <p><span className="font-bold">Tel:</span> <span className="border-b border-slate-400 pb-1 inline-block min-w-[150px]">{agreement.tel}</span></p>
        </div>
      </div>

      <section>
        <h3 className="font-bold uppercase mb-2">1. Purpose of Agreement</h3>
        <p>This agreement outlines the payment schedule for outstanding, undisputed levy arrears amounting to Kenya Shillings <span className="font-bold">{agreement.totalArrearsWords}</span> (KES <span className="font-bold">{agreement.totalArrears.toLocaleString()}</span>) owed by the above-named operator for the period of <span className="font-bold">{agreement.arrearsPeriod}</span>.</p>
        <p className="mt-2"><span className="font-bold">Debit Note No:</span> {agreement.debitNoteNo}</p>
      </section>

      <section>
        <h3 className="font-bold uppercase mb-2">2. Payment Schedule</h3>
        <table className="w-full border-collapse border border-slate-800 text-[11px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-800 p-2 text-left">Installment No.</th>
              <th className="border border-slate-800 p-2 text-left">CSL Period</th>
              <th className="border border-slate-800 p-2 text-left">Agreed Payment Due Date</th>
              <th className="border border-slate-800 p-2 text-right">Amount (KES)</th>
            </tr>
          </thead>
          <tbody>
            {agreement.installments.map((inst) => (
              <tr key={inst.no}>
                <td className="border border-slate-800 p-2">{inst.no}</td>
                <td className="border border-slate-800 p-2">{inst.period}</td>
                <td className="border border-slate-800 p-2 font-bold">{inst.dueDate}</td>
                <td className="border border-slate-800 p-2 text-right font-bold">{inst.amount.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-black">
              <td colSpan={3} className="border border-slate-800 p-2 text-right">TOTAL ARREARS DUE:</td>
              <td className="border border-slate-800 p-2 text-right underline underline-offset-2">KES {agreement.totalArrears.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="text-xs space-y-2">
        <h3 className="font-bold uppercase mb-2 text-sm">3. Terms and Conditions</h3>
        <p>a) The DBO acknowledges, agrees to, and does not dispute the levy amount indicated herein.</p>
        <p>b) Payments shall be made to the designated KDB Bank Account or via the E-Citizen Collection account as directed by KDB.</p>
        <p>c) The DBO shall submit proof of each payment immediately upon settlement.</p>
        <p className="font-bold">d) Failure by the DBO to honor ANY installment within seven (7) days of its due date shall void this agreement and the entire outstanding balance shall become immediately due and payable in full.</p>
        <p>e) KDB reserves the right to initiate legal or enforcement action upon breach of this agreement.</p>
        <p>f) Applications for the renewal of any KDB-issued permit shall not be processed or approved while any part of this agreed-upon debt remains outstanding.</p>
        <p>g) This Agreement pertains only to the outstanding levy amount specified herein and does not constitute a waiver of any other regulatory requirements or obligations imposed on the DBO by KDB.</p>
        <p>h) In the event of business cessation, dissolution or merger, the outstanding levy obligation shall be settled in full prior to final deregistration or exit.</p>
        <p>i) This agreement shall be binding on successors, assignees, and any legal representatives of the operator.</p>
        <p>j) The DBO agrees to remain in full compliance with all relevant laws and regulations as prescribed under The Dairy Industry Act (Cap 336) and its subsidiary regulations.</p>
        <p>k) No Waiver of Rights. Any delay or failure by KDB to enforce a term of this Agreement does not waive its right to do so later. For instance, accepting one late payment does not prevent KDB from taking action if another payment is late.</p>
      </section>

      {/* Execution Blocks */}
      <div className="pt-8 flex justify-between space-x-12">
        <div className="flex-1 space-y-4">
          <p className="font-black border-b border-slate-900 pb-1">FOR: KENYA DAIRY BOARD</p>
          <div className="space-y-2 min-h-[120px]">
            <p><span className="text-[10px] font-bold uppercase text-slate-400">Name:</span> <span className="font-bold">{agreement.officialName || '................................'}</span></p>
            <p><span className="text-[10px] font-bold uppercase text-slate-400">Title:</span> <span className="font-bold">Accounts Assistant</span></p>
            <div className="py-2 h-20 flex items-center">
              {agreement.officialSignature ? (
                <img src={agreement.officialSignature} className="max-h-full" alt="KDB Signature" crossOrigin="anonymous" />
              ) : (
                <div className="text-slate-300 italic text-xs">Awaiting Approval</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <p className="font-black border-b border-slate-900 pb-1">FOR DBO: {agreement.dboName}</p>
          <div className="space-y-2 min-h-[120px]">
            <p><span className="text-[10px] font-bold uppercase text-slate-400">Name:</span> <span className="font-bold">{agreement.clientName}</span></p>
            <p><span className="text-[10px] font-bold uppercase text-slate-400">Title:</span> <span className="font-bold">{agreement.clientTitle}</span></p>
            <div className="py-2 h-20 flex items-center">
              <img src={agreement.clientSignature} className="max-h-full" alt="Operator Signature" crossOrigin="anonymous" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-12 flex justify-between items-end opacity-40">
        <div className="text-[8px] font-mono">DOC_ID: {agreement.id.toUpperCase()} | GEN_TIME: {new Date().toISOString()}</div>
        <div className="text-[10px] font-bold uppercase">Official Document</div>
      </div>
    </div>
  </div>
);

export const PDFPreview: React.FC<PDFPreviewProps> = ({ agreement, onClose, isHidden }) => {
  if (isHidden) {
    return (
      <div className="bg-white w-[1000px]">
        <AgreementContent agreement={agreement} id="formal-agreement-hidden" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl shadow-2xl rounded-none my-8 animate-in zoom-in-95 duration-300 relative">
        {/* UI Controls - Not part of the PDF */}
        <div className="absolute -top-12 right-0 flex space-x-4 print:hidden">
          <button 
            onClick={() => downloadAgreementPDF(agreement, 'formal-agreement')} 
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center hover:bg-emerald-700 shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" /> Download Official PDF
          </button>
          <button onClick={onClose} className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* THE PDF CONTENT START */}
        <AgreementContent agreement={agreement} id="formal-agreement" />
        {/* THE PDF CONTENT END */}
      </div>
    </div>
  );
};
