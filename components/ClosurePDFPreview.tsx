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

const ClosurePDFContent: React.FC<ClosurePDFContentProps> = ({ closure, id }) => {
  const formattedDate = new Date(closure.submittedAt || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div 
      className="px-12 py-10 leading-[1.5] text-[10.5pt] text-left w-[1024px] box-border relative" 
      id={id} 
      style={{ 
        fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif', 
        whiteSpace: 'normal', 
        wordSpacing: 'normal',
        backgroundColor: '#ffffff',
        color: '#1e293b'
      }}
    >
      {/* Sender Address Info */}
      <div className="mb-4">
        <div className="space-y-0.5 font-sans">
          <div className="font-black text-lg text-slate-900">{closure.clientName}</div>
          <div className="font-bold text-slate-700">{closure.premiseName}</div>
          <div className="text-slate-500 text-xs">Tel: {closure.tel}</div>
        </div>
      </div>

      {/* Recipient Address Info & Repositioned Stamp */}
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-0.5 text-left font-sans" style={{ color: '#0f172a' }}>
          <p className="font-extrabold text-slate-900 text-[11pt] leading-tight">The Compliance Officer</p>
          <p className="font-bold leading-tight">Kenya Dairy Board</p>
          <p className="text-slate-700 leading-tight">P.O Box 30406 -00100</p>
          <p className="font-extrabold text-slate-800 leading-tight">Nairobi .</p>
          <div className="pt-2 font-sans">
            <p className="font-bold text-slate-600 text-[10pt] leading-tight">Cc. KDB- Kericho</p>
            <p className="text-slate-500 text-[9.5pt] leading-tight">P.O Box 159-20200</p>
            <p className="font-bold text-slate-600 text-[9.5pt] leading-tight">Kericho .</p>
          </div>
        </div>

        {/* Dynamic Stamped Badging visual on the right far side of the address details */}
        {closure.status === 'approved' && (
          <div className="pr-4 pt-2 select-none">
            <div 
              style={{ 
                fontFamily: '"Arial Black", Arial, sans-serif',
                borderWidth: '3.5px',
                borderStyle: 'solid',
                borderColor: '#ef4444', 
                color: '#ef4444',
                borderRadius: '8px',
                transform: 'rotate(-6deg)',
                backgroundColor: '#ffffff',
                padding: '8px 20px',
                display: 'inline-block',
                fontWeight: 'heavy',
                letterSpacing: '0.15em',
                lineHeight: '1.1',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              className="uppercase text-xl font-black"
            >
              RECEIVED
            </div>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="text-left mb-4 font-sans font-bold text-slate-900 text-[10.5pt]">
        {formattedDate}.
      </div>

      {/* Letter Body */}
      <div className="space-y-3.5 text-left mb-6 text-[10.5pt]">
        <p>Dear Sir/Madam,</p>
        
        <p className="font-black text-slate-950 uppercase underline underline-offset-4 tracking-wide font-sans text-xs">
          RE: NOTIFICATION OF BUSINESS CLOSURE AND CESSATION OF OPERATIONS
        </p>

        <p>
          I am writing to formally notify your office of the closure of my licensed dairy business premises, operating as a <strong>{closure.permitType || 'Milk Bar / Dairy Shop'}</strong>, situated at <strong>{closure.location || '[Location]'}, {closure.county || '[County]'}</strong>.
        </p>

        <p>
          The business, operating under License/Permit No. <strong className="font-mono">{closure.permitNo}</strong>, officially ceased all operations effective <strong>{closure.closureDate || '[Closure Date]'}</strong>.
        </p>

        {closure.closureReason && (
          <p>
            <strong>Reason for Business Closure:</strong> {closure.closureReason}
          </p>
        )}
      </div>

      {/* Yours faithfully, signature and signatories */}
      <div className="grid grid-cols-2 gap-8 pt-4 border-t border-dashed border-slate-300 relative">
        
        {/* LEFT SIDE: Applicant Operator Sign-off (Submitted By) */}
        <div className="space-y-3 font-sans text-left">
          <p className="font-serif italic text-slate-600 text-sm">Yours faithfully,</p>
          
          <div className="h-16 flex items-center py-2 bg-white rounded-xl border border-slate-200 p-2 w-44">
            <img src={closure.clientSignature} className="max-h-full object-contain" alt="Operator Signature" crossOrigin="anonymous" />
          </div>
          
          <div>
            <p className="font-extrabold text-slate-900 text-[10.5pt]">{closure.clientName}</p>
            <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">
              {closure.clientTitle || 'Registered DBO Operator'}
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: KDB Received by Sign-off */}
        <div className="space-y-3 font-sans text-left relative min-h-[120px]">
          <p className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b pb-1 border-slate-200">
            For Kenya Dairy Board:
          </p>
          
          <div className="space-y-2">
            <div className="h-16 flex items-center py-2 bg-white rounded-xl border border-slate-200 p-2 w-44">
              {closure.officialSignature ? (
                <img src={closure.officialSignature} className="max-h-full object-contain" alt="KDB Official Signature" crossOrigin="anonymous" />
              ) : (
                <div className="italic text-rose-500 font-bold block py-2 text-[10px] uppercase">
                  Awaiting Countersign
                </div>
              )}
            </div>

            <div>
              <p className="font-extrabold text-slate-900 text-[10.5pt]">{closure.officialName || '______________________'}</p>
              <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider">
                {closure.officialTitle || 'Authorized KDB Official'}
              </p>
            </div>

            {closure.approvedAt && (
              <p className="text-[8.5pt] text-slate-400 font-bold uppercase tracking-widest">
                Receipt Date: {new Date(closure.approvedAt).toLocaleDateString('en-GB')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stamp comments docket if present and approved */}
      {closure.status === 'approved' && closure.officialComments && (
        <div className="mt-4 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl font-sans text-left text-xs text-slate-700 leading-relaxed font-bold">
          <span className="not-italic font-black text-[9px] uppercase tracking-wider text-amber-700 block mb-0.5">KDB Assessment Remarks:</span>
          &quot;{closure.officialComments}&quot;
        </div>
      )}

      {/* Small metadata copy line */}
      <div className="pt-4 flex justify-between items-end opacity-40 font-sans text-[8px] tracking-wider uppercase mt-4 border-t border-slate-100 text-slate-400">
        <div>System Record ID: {closure.id.toUpperCase()}</div>
        <div></div>
      </div>
    </div>
  );
};

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
            <Download className="w-4 h-4 mr-2" /> Download Notification PDF
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
