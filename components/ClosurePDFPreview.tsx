import React from 'react';
import { ClosureNotificationData } from '../types';
import { ShieldCheck, Printer, X, Download } from 'lucide-react';
import { downloadClosurePDF } from '../services/pdf.ts';

interface ClosurePDFPreviewProps {
  closure: ClosureNotificationData;
  onClose: () => void;
  isHidden?: boolean;
}

interface ClosurePDFContentProps {
  closure: ClosureNotificationData;
  id?: string;
}

const ClosurePDFContent: React.FC<ClosurePDFContentProps> = ({ closure, id }) => (
  <div className="px-10 pb-12 text-slate-900 bg-white leading-[1.5] text-[12pt] font-sans text-left w-[1024px] box-border" id={id} style={{ fontFamily: 'Arial, Helvetica, sans-serif', whiteSpace: 'normal', wordSpacing: 'normal' }}>
    {/* Header */}
    <div className="flex flex-col items-center text-center mb-8 pt-0 break-inside-avoid">
      <div className="space-y-1 w-full flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold uppercase tracking-tight text-center w-full text-slate-800">KENYA DAIRY BOARD</h1>
        <p className="text-lg font-bold text-center w-full text-slate-600">REGULATORY & COMPLIANCE DEPARTMENT</p>
        <p className="text-sm font-bold text-slate-500 text-center w-full">Ardhi House (Huduma Centre) 5th Floor, Wing B.</p>
        <p className="text-sm font-bold text-slate-400 text-center w-full">Tel: 0717997465 / 0734026367 | Email: regulatory@kdb.co.ke</p>
      </div>
      <div className="w-full border-b-2 border-slate-900 mt-4"></div>
      <div className="w-full flex justify-center text-center">
        <h2 className="text-lg font-extrabold mt-6 uppercase underline underline-offset-4 text-center tracking-wide text-slate-900">
          ACKNOWLEDGEMENT OF CESSATION & DEREGISTRATION
        </h2>
      </div>
    </div>

    <div className="space-y-6">
      <p className="text-left font-medium leading-relaxed">
        The Kenya Dairy Board hereby acknowledges receipt of a formal notification of business cessation of the registered Dairy Business Operative (DBO) specified herein. Regulatory registries have been updated to reflect the decommission of the associated license and premises under provisions of the <strong>Dairy Industry Act (Cap 336 Laws of Kenya)</strong>.
      </p>

      {/* Operator & Premise Information */}
      <section className="text-left">
        <h3 className="font-extrabold text-[13pt] uppercase border-b border-slate-300 pb-1 mb-3 text-slate-800">1. Operational Profile Details</h3>
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 w-[35%] font-bold text-slate-500 text-xs uppercase">Permit Holder Name</td>
              <td className="py-2 font-bold text-slate-800">{closure.dboName}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 font-bold text-slate-500 text-xs uppercase">Regulated Permit Number</td>
              <td className="py-2 font-mono font-bold text-slate-800">{closure.permitNo}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 font-bold text-slate-500 text-xs uppercase">Registered Premise Name</td>
              <td className="py-2 font-bold text-slate-800">{closure.premiseName}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 font-bold text-slate-500 text-xs uppercase">Permit / Business Type</td>
              <td className="py-2 font-bold text-slate-800">{closure.permitType}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 font-bold text-slate-500 text-xs uppercase">Primary Contact Tel</td>
              <td className="py-2 font-bold text-slate-800">{closure.tel}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 font-bold text-slate-500 text-xs uppercase">Geographic Location</td>
              <td className="py-2 font-bold text-slate-800">{closure.location}, {closure.subCounty} Sub-County, {closure.county} County</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Cessation Specifics */}
      <section className="text-left">
        <h3 className="font-extrabold text-[13pt] uppercase border-b border-slate-300 pb-1 mb-3 text-slate-800">2. Cessation Specifics & Stated Toggles</h3>
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 w-[35%] font-bold text-slate-500 text-xs uppercase">Official Closure Date</td>
              <td className="py-2 font-bold text-slate-800">{closure.closureDate}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 font-bold text-slate-500 text-xs uppercase">Regulatory Permit Action</td>
              <td className="py-2 font-bold text-red-600 uppercase tracking-wider">{closure.permitStatusIntent}</td>
            </tr>
            <tr>
              <td className="py-2 font-bold text-slate-500 text-xs uppercase valign-top">Stated Cause for Cessation</td>
              <td className="py-2 text-slate-700 italic font-medium leading-relaxed">{closure.closureReason}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Legal Declaration */}
      <section className="text-left bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-semibold leading-relaxed text-slate-600">
        <p className="font-extrabold text-slate-800 mb-1 uppercase tracking-wider">Permit Holder Declaration</p>
        &quot;I declare that dairy business operations at the indicated premise have ceased as of the official closure date, and this notification has been submitted in good faith under provisions of the Dairy Industry Act. I acknowledge that regulatory permits are strictly non-transferable.&quot;
      </section>

      {/* Counter Signatures */}
      <div className="pt-6 flex justify-between space-x-12 text-left">
        <div className="flex-1 space-y-2">
          <p className="font-bold border-b border-slate-900 pb-1 text-xs">FOR: KENYA DAIRY BOARD (KDB)</p>
          <div className="space-y-1 min-h-[100px]">
            <p><span className="text-[9px] font-bold uppercase text-slate-500">Name:</span> <span className="font-bold">{closure.officialName || ''}</span></p>
            <p><span className="text-[9px] font-bold uppercase text-slate-500">Title:</span> <span className="font-bold">Regional Inspector / Accounts Officer</span></p>
            <div className="py-1 h-16 flex items-center">
              {closure.officialSignature ? (
                <img src={closure.officialSignature} className="max-h-full" alt="KDB Authorized Counter-Signature" crossOrigin="anonymous" />
              ) : (
                <div className="text-rose-500 italic text-xs font-bold uppercase tracking-wider">Awaiting Regulatory Counter-Sign</div>
              )}
            </div>
            {closure.approvedAt && (
              <p><span className="text-[9px] font-bold uppercase text-slate-500">Certified Date:</span> <span className="font-bold text-xs">{new Date(closure.approvedAt).toLocaleDateString()}</span></p>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <p className="font-bold border-b border-slate-900 pb-1 text-xs">FOR DBO (PERMIT HOLDER): {closure.dboName}</p>
          <div className="space-y-1 min-h-[100px]">
            <p><span className="text-[9px] font-bold uppercase text-slate-500">Name:</span> <span className="font-bold">{closure.clientName}</span></p>
            <p><span className="text-[9px] font-bold uppercase text-slate-500">Title:</span> <span className="font-bold">Registered DBO Signatory</span></p>
            <div className="py-1 h-16 flex items-center">
              <img src={closure.clientSignature} className="max-h-full" alt="DBO Authorized Signature" crossOrigin="anonymous" />
            </div>
            <p><span className="text-[9px] font-bold uppercase text-slate-500">Submitted Date:</span> <span className="font-bold text-xs">{new Date(closure.submittedAt).toLocaleDateString()}</span></p>
          </div>
        </div>
      </div>

      <div className="pt-8 flex justify-between items-end opacity-45">
        <div className="text-[7.5px] font-mono select-none font-bold">CESSATION_ID: {closure.id.toUpperCase()} | SYSTEM_VERIFIED</div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">KDB Official Copy</div>
      </div>
    </div>
  </div>
);

export const ClosurePDFPreview: React.FC<ClosurePDFPreviewProps> = ({ closure, onClose, isHidden }) => {
  if (isHidden) {
    return (
      <div className="fixed left-[-9999px] top-0 bg-white w-[1024px] overflow-visible h-auto">
        <ClosurePDFContent closure={closure} id="closure-certificate-hidden" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-[1024px] shadow-2xl rounded-none my-8 animate-in zoom-in-95 duration-300 relative">
        <div className="absolute -top-12 right-0 flex space-x-4 print:hidden">
          <button 
            onClick={() => downloadClosurePDF(closure, 'closure-certificate')} 
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center hover:bg-red-700 shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" /> Download Closure PDF
          </button>
          <button onClick={onClose} className="bg-white/10 text-white p-2 rounded-lg hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ClosurePDFContent closure={closure} id="closure-certificate" />
      </div>
    </div>
  );
};
