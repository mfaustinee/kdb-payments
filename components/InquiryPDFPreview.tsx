import React from 'react';
import { InquiryData } from '../types';
import { ShieldCheck, Printer, X, Download, HelpCircle } from 'lucide-react';
import { downloadInquiryPDF } from '../services/pdf.ts';

interface InquiryPDFPreviewProps {
  inquiry: InquiryData;
  onClose: () => void;
  isHidden?: boolean;
}

interface InquiryPDFContentProps {
  inquiry: InquiryData;
  id?: string;
}

const InquiryPDFContent: React.FC<InquiryPDFContentProps> = ({ inquiry, id }) => {
  const formattedDate = new Date(inquiry.submittedAt || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div 
      className="px-12 py-12 leading-[1.6] text-[11.5pt] text-left w-[1024px] box-border relative" 
      id={id} 
      style={{ 
        fontFamily: 'system-ui, -apple-system, sans-serif', 
        whiteSpace: 'normal', 
        wordSpacing: 'normal',
        backgroundColor: '#ffffff',
        color: '#1e293b'
      }}
    >
      {/* Header */}
      <div className="text-center border-b-2 border-sky-850 pb-4 mb-6">
        <h1 className="font-extrabold text-2xl text-sky-850 tracking-tight">KENYA DAIRY BOARD</h1>
        <h2 className="font-black text-lg text-slate-800 tracking-wider uppercase">CLIENT INQUIRY FORM</h2>
      </div>

      {/* Official Use Header Meta */}
      <div className="grid grid-cols-2 gap-4 border p-4 bg-slate-50/50 rounded-xl mb-6 font-semibold text-xs">
        <div>
          <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Reference No.</span>
          <span className="text-sky-700 font-bold font-mono">{inquiry.id}</span>
        </div>
        <div>
          <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Date Received</span>
          <span className="text-slate-700">{inquiry.dateReceived || formattedDate}</span>
        </div>
      </div>

      {/* Section 1: Client Information */}
      <div className="mb-6">
        <h3 className="font-black text-xs text-sky-850 uppercase tracking-widest border-b pb-1.5 mb-3">1. Client Information</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Full Name / Company Name</span>
            <span className="font-bold text-slate-800">{inquiry.clientName}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Contact Person</span>
            <span className="font-semibold text-slate-700">{inquiry.contactPerson || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">ID / Passport No.</span>
            <span className="font-semibold text-slate-700">{inquiry.idPassportNo || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">KDB License Number</span>
            <span className="font-mono font-semibold text-slate-700">{inquiry.kdbLicenseNo || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Postal Address</span>
            <span className="font-semibold text-slate-700">{inquiry.postalAddress}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">City / Town</span>
            <span className="font-bold text-slate-800">{inquiry.cityTown}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Telephone Number</span>
            <span className="font-bold text-slate-800">{inquiry.tel}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Mobile Number</span>
            <span className="font-bold text-slate-800">{inquiry.mobileNumber}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Email Address</span>
            <span className="font-semibold text-slate-700">{inquiry.email}</span>
          </div>
        </div>
      </div>

      {/* Section 2 & 3: Client Type & Inquiry Nature */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-black text-xs text-sky-850 uppercase tracking-widest border-b pb-1.5 mb-3">2. Type of Client</h3>
          <span className="font-bold text-slate-800 text-sm">{inquiry.clientType === 'Other' ? `Other (${inquiry.otherClientType})` : inquiry.clientType}</span>
        </div>
        <div>
          <h3 className="font-black text-xs text-sky-850 uppercase tracking-widest border-b pb-1.5 mb-3">3. Nature of Inquiry</h3>
          <span className="font-bold text-slate-800 text-sm">{inquiry.natureOfInquiry === 'Other' ? `Other (${inquiry.otherNatureOfInquiry})` : inquiry.natureOfInquiry}</span>
        </div>
      </div>

      {/* Section 4: Details of Inquiry */}
      <div className="mb-6">
        <h3 className="font-black text-xs text-sky-850 uppercase tracking-widest border-b pb-1.5 mb-3">4. Details of Inquiry</h3>
        <div className="p-4 bg-slate-50 rounded-xl border">
          <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed font-serif italic">{inquiry.inquiryDetails}</p>
        </div>
      </div>

      {/* Section 5 & 6: Supporting Docs & Preferred Response */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-black text-xs text-sky-850 uppercase tracking-widest border-b pb-1.5 mb-3">5. Supporting Documents</h3>
          <div className="text-sm">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Status</span>
            <span className="font-bold text-slate-700">{inquiry.supportingDocsStatus}</span>
            {inquiry.supportingDocsStatus === 'Attached' && (
              <div className="mt-2">
                <span className="text-slate-400 font-bold text-[10px] uppercase block">Attached Documents</span>
                <span className="font-semibold text-slate-700">{inquiry.attachedDocsList}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-black text-xs text-sky-850 uppercase tracking-widest border-b pb-1.5 mb-3">6. Preferred Response Mode</h3>
          <span className="font-bold text-slate-800 text-sm">{inquiry.preferredResponseMode}</span>
        </div>
      </div>

      {/* Section 7: Declaration */}
      <div className="mb-6 grid grid-cols-2 gap-6 border-t pt-4">
        <div>
          <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest mb-3">7. Declaration</h3>
          <p className="text-slate-500 text-[10px] leading-relaxed mb-3">
            I hereby confirm that the information provided above is true and accurate to the best of my knowledge.
          </p>
          <div className="font-semibold text-xs text-slate-700 space-y-1">
            <p><span className="text-slate-400 font-bold uppercase text-[9px]">Client Name:</span> {inquiry.clientName}</p>
            <p><span className="text-slate-400 font-bold uppercase text-[9px]">Date Signed:</span> {formattedDate}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center border p-4 rounded-xl bg-slate-50/50">
          <span className="text-slate-400 font-bold text-[10px] uppercase block mb-2">Digital Signature</span>
          {inquiry.clientSignature ? (
            <img 
              src={inquiry.clientSignature} 
              alt="Client Signature" 
              className="max-h-[60px] object-contain border border-dashed rounded bg-white p-1" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-slate-300 italic text-xs">No signature recorded</div>
          )}
        </div>
      </div>

      {/* Section 8: For Official Use Only */}
      <div className="border-t-2 border-dashed border-slate-300 pt-6 mt-6 bg-slate-50 p-6 rounded-2xl border">
        <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b pb-2 mb-4">8. For Official Use Only (Kenya Dairy Board Office)</h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4 text-xs font-semibold">
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Referred To</span>
            <span className="text-slate-800 block min-h-[16px]">{inquiry.referredTo || '____________________'}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Date of Action</span>
            <span className="text-slate-700 block min-h-[16px]">{inquiry.actionDate || '____ / ____ / ______'}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Status</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              inquiry.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
              inquiry.status === 'closed' ? 'bg-slate-200 text-slate-700' : 'bg-sky-100 text-sky-800'
            }`}>
              {inquiry.status || 'Pending'}
            </span>
          </div>
        </div>

        <div className="border p-3 rounded-lg bg-white min-h-[60px] mb-4 text-xs">
          <span className="text-slate-400 font-bold text-[9px] uppercase block mb-1">Response Details</span>
          <p className="text-slate-700 italic font-semibold">{inquiry.responseDetails || 'Pending official response...'}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs font-semibold items-end pt-2 border-t">
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Date Replied</span>
            <span className="text-slate-700">{inquiry.dateReplied || '____ / ____ / ______'}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Officer Name</span>
            <span className="text-slate-700">{inquiry.officialName || '____________________'}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-400 block uppercase tracking-wider text-[9px] mb-1">Officer Signature</span>
            {inquiry.officialSignature ? (
              <img 
                src={inquiry.officialSignature} 
                alt="Officer Signature" 
                className="max-h-[40px] object-contain" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-slate-300 italic">____________________</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const InquiryPDFPreview: React.FC<InquiryPDFPreviewProps> = ({ inquiry, onClose, isHidden = false }) => {
  const handleDownload = async () => {
    await downloadInquiryPDF(inquiry, `inquiry-form-pdf-${inquiry.id}`);
  };

  if (isHidden) {
    return (
      <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none">
        <InquiryPDFContent inquiry={inquiry} id={`inquiry-form-pdf-${inquiry.id}`} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-3xl max-w-[1080px] w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Controls Bar */}
        <div className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HelpCircle className="w-5 h-5 text-sky-400" />
            <span className="text-sm font-bold uppercase tracking-wider">Client Inquiry Document</span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleDownload}
              className="p-2.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 rounded-xl transition-all flex items-center space-x-2 text-xs font-bold"
              title="Download PDF Document"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button 
              onClick={() => window.print()}
              className="p-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl transition-all"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Container for Document */}
        <div className="overflow-y-auto flex-1 bg-slate-800 p-8 flex justify-center">
          <div className="shadow-2xl rounded-2xl overflow-hidden bg-white border border-slate-700">
            <InquiryPDFContent inquiry={inquiry} id={`inquiry-form-pdf-${inquiry.id}`} />
          </div>
        </div>
      </div>
    </div>
  );
};
