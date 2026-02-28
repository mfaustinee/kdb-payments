
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
  <div className="px-10 pb-12 text-slate-900 bg-white leading-[1.5] text-[11pt] font-sans text-left w-[1024px] box-border" id={id} style={{ fontFamily: 'Arial, Helvetica, sans-serif', whiteSpace: 'normal', wordSpacing: 'normal' }}>
    {/* Header */}
    <div className="flex flex-col items-center text-center mb-8 pt-2 break-inside-avoid">
      <div className="space-y-1 w-full flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight text-center w-full">KENYA DAIRY BOARD - KERICHO</h1>
        <p className="text-base font-bold text-center w-full">Ardhi House (Huduma Centre) 5th Floor, Wing B.</p>
        <p className="text-base font-bold text-center w-full">Tel: 0717997465 / 0734026367</p>
      </div>
      <div className="w-full border-b border-slate-900 mt-4"></div>
      <div className="w-full flex justify-center text-center">
        <h2 className="text-lg font-bold mt-6 uppercase underline underline-offset-4 text-center">Payment Agreement Form – Consumer Safety Levy Arrears</h2>
      </div>
    </div>

    <div className="space-y-4">
      <p className="text-left">
        This Payment Agreement is entered into on this <strong>{new Date(agreement.date).getDate()}</strong> day of 
        <strong> {new Date(agreement.date).toLocaleString('default', { month: 'long' })}</strong> 20<strong>{new Date(agreement.date).getFullYear().toString().slice(-2)}</strong> between:
      </p>

      <div className="space-y-2 text-left">
        <p><strong>The Kenya Dairy Board (hereafter referred to as “KDB”)</strong>, a state corporation established through an Act of Parliament; The Dairy Industry Act (Cap 336) Laws of Kenya and;</p>
        <div className="pl-4 space-y-1">
          <p><strong>Dairy Business Operator (DBO) Name:</strong> {agreement.dboName}</p>
          <p><strong>Premise Name:</strong> {agreement.premiseName}</p>
          <p><strong>Regulatory Permit No:</strong> {agreement.permitNo}</p>
          <p><strong>Premise Location:</strong> {agreement.location} | <strong>County:</strong> {agreement.county}</p>
          <p><strong>Tel:</strong> {agreement.tel}</p>
        </div>
      </div>

      <section className="text-left">
        <h3 className="font-bold uppercase mb-1">1. Purpose of Agreement</h3>
        <p className="text-left">This agreement outlines the payment schedule for outstanding, undisputed levy arrears amounting to Kenya Shillings <strong>{agreement.totalArrearsWords}</strong> (KES <strong>{agreement.totalArrears.toLocaleString()}</strong>) owed by the above-named operator for the period of <strong>{agreement.arrearsPeriod}</strong>.</p>
        <p className="mt-1"><strong>Debit Note No:</strong> {agreement.debitNoteNo}</p>
      </section>

      <section className="text-left">
        <h3 className="font-bold uppercase mb-2">2. Payment Schedule</h3>
        <table className="w-full border-collapse border border-slate-900 text-left">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-900 p-2 w-[10%] font-bold text-center">No.</th>
              <th className="border border-slate-900 p-2 w-[40%] font-bold">CSL Period</th>
              <th className="border border-slate-900 p-2 w-[25%] font-bold">Due Date</th>
              <th className="border border-slate-900 p-2 w-[25%] font-bold text-right">Amount (KES)</th>
            </tr>
          </thead>
          <tbody>
            {agreement.installments.map((inst) => (
              <tr key={inst.no}>
                <td className="border border-slate-900 p-2 text-center">{inst.no}</td>
                <td className="border border-slate-900 p-2">{inst.period}</td>
                <td className="border border-slate-900 p-2 font-bold">{inst.dueDate}</td>
                <td className="border border-slate-900 p-2 text-right font-bold">{Number(inst.amount).toLocaleString()}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold">
              <td colSpan={3} className="border border-slate-900 p-2 text-right">TOTAL ARREARS DUE:</td>
              <td className="border border-slate-900 p-2 text-right underline underline-offset-2">KES {Number(agreement.totalArrears).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="space-y-1 text-left">
        <h3 className="font-bold uppercase mb-1">3. Terms and Conditions</h3>
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
        <p>k) No Waiver of Rights. Any delay or failure by KDB to enforce a term of this Agreement does not waive its right to do so later.</p>
      </section>

      {/* Execution Blocks */}
      <div className="pt-6 flex justify-between space-x-8 text-left">
        <div className="flex-1 space-y-2">
          <p className="font-bold border-b border-slate-900 pb-1">FOR: KENYA DAIRY BOARD</p>
          <div className="space-y-1 min-h-[100px]">
            <p><span className="text-[9px] font-bold uppercase text-slate-500">Name:</span> <span className="font-bold">{agreement.officialName || ''}</span></p>
            <p><span className="text-[9px] font-bold uppercase text-slate-500">Title:</span> <span className="font-bold">Accounts Assistant</span></p>
            <div className="py-1 h-16 flex items-center">
              {agreement.officialSignature ? (
                <img src={agreement.officialSignature} className="max-h-full" alt="KDB Signature" crossOrigin="anonymous" />
              ) : (
                <div className="text-slate-300 italic text-xs">Awaiting Approval</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <p className="font-bold border-b border-slate-900 pb-1">FOR DBO: {agreement.dboName}</p>
          <div className="space-y-1 min-h-[100px]">
            <p><span className="text-[9px] font-bold uppercase text-slate-500">Name:</span> <span className="font-bold">{agreement.clientName}</span></p>
            <p><span className="text-[9px] font-bold uppercase text-slate-500">Title:</span> <span className="font-bold">{agreement.clientTitle}</span></p>
            <div className="py-1 h-16 flex items-center">
              <img src={agreement.clientSignature} className="max-h-full" alt="Operator Signature" crossOrigin="anonymous" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 flex justify-between items-end opacity-40">
        <div className="text-[7px] font-mono">DOC_ID: {agreement.id.toUpperCase()} | GEN_TIME: {new Date().toISOString()}</div>
        <div className="text-[9px] font-bold uppercase">Official Document</div>
      </div>
    </div>
  </div>
);

export const PDFPreview: React.FC<PDFPreviewProps> = ({ agreement, onClose, isHidden }) => {
  if (isHidden) {
    return (
      <div className="fixed left-[-9999px] top-0 bg-white w-[1024px] overflow-visible h-auto">
        <AgreementContent agreement={agreement} id="formal-agreement-hidden" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-[1024px] shadow-2xl rounded-none my-8 animate-in zoom-in-95 duration-300 relative">
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
