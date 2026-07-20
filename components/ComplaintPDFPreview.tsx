import React from 'react';
import { ComplaintData } from '../types';
import { ShieldCheck, Printer, X, Download } from 'lucide-react';
import { downloadComplaintPDF } from '../services/pdf.ts';

interface ComplaintPDFPreviewProps {
  complaint: ComplaintData;
  onClose: () => void;
  isHidden?: boolean;
}

interface ComplaintPDFContentProps {
  complaint: ComplaintData;
  id?: string;
}

const ComplaintPDFContent: React.FC<ComplaintPDFContentProps> = ({ complaint, id }) => {
  const formattedDate = new Date(complaint.submittedAt || Date.now()).toLocaleDateString('en-GB', {
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
      {/* Header Stamp */}
      <div className="text-center border-b-2 border-red-800 pb-4 mb-6">
        <h1 className="font-extrabold text-2xl text-red-800 tracking-tight">KENYA DAIRY BOARD</h1>
        <h2 className="font-black text-lg text-slate-800 tracking-wider uppercase">STAKEHOLDER COMPLAINTS FORM</h2>
      </div>

      {/* Official Use Header Meta */}
      <div className="grid grid-cols-3 gap-4 border p-4 bg-slate-50/50 rounded-xl mb-6 font-semibold text-xs">
        <div>
          <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Reference No.</span>
          <span className="text-red-700 font-bold font-mono">{complaint.id}</span>
        </div>
        <div>
          <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Date Received</span>
          <span className="text-slate-700">{complaint.dateReceived || formattedDate}</span>
        </div>
        <div>
          <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Received By (KDB Officer)</span>
          <span className="text-slate-700">{complaint.receivedBy || 'Pending Assignment'}</span>
        </div>
      </div>

      {/* Section 1: Complainant Details */}
      <div className="mb-6">
        <h3 className="font-black text-xs text-red-800 uppercase tracking-widest border-b pb-1.5 mb-3">1. Complainant Details</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Full Name / Company Name</span>
            <span className="font-bold text-slate-800">{complaint.clientName}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">ID Number / Registration Number</span>
            <span className="font-semibold text-slate-700">{complaint.idNumber}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Stakeholder Category</span>
            <span className="font-semibold text-slate-700">{complaint.stakeholderCategory === 'Other' ? `Other (${complaint.otherStakeholderCategory})` : complaint.stakeholderCategory}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Postal Address</span>
            <span className="font-semibold text-slate-700">{complaint.postalAddress || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Telephone Number</span>
            <span className="font-bold text-slate-800">{complaint.tel}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Email Address</span>
            <span className="font-semibold text-slate-700">{complaint.email}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">County</span>
            <span className="font-bold text-slate-800">{complaint.county}</span>
          </div>
        </div>
      </div>

      {/* Section 2: Complaint Details */}
      <div className="mb-6">
        <h3 className="font-black text-xs text-red-800 uppercase tracking-widest border-b pb-1.5 mb-3">2. Complaint Details</h3>
        <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Nature of Complaint</span>
            <span className="font-bold text-slate-800">{complaint.natureOfComplaint === 'Other' ? `Other (${complaint.otherNatureOfComplaint})` : complaint.natureOfComplaint}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Location of Occurrence</span>
            <span className="font-semibold text-slate-700">{complaint.location}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Date Incident Occurred</span>
            <span className="font-semibold text-slate-700">{complaint.incidentDate}</span>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border">
          <span className="text-slate-400 font-bold text-[10px] uppercase block mb-1">Detailed Description of Complaint</span>
          <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed font-serif italic">{complaint.complaintDescription}</p>
        </div>
      </div>

      {/* Section 3 & 4: Supporting Docs & Desired Resolution */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-black text-xs text-red-800 uppercase tracking-widest border-b pb-1.5 mb-3">3. Supporting Documents</h3>
          <div className="space-y-1 text-xs">
            <div className="flex flex-wrap gap-2 mb-2">
              {(complaint.attachments || []).map(att => (
                <span key={att} className="px-2.5 py-1 bg-red-50 text-red-850 border border-red-100 rounded-lg font-bold uppercase text-[9px]">{att}</span>
              ))}
              {(!complaint.attachments || complaint.attachments.length === 0) && <span className="text-slate-400 italic">No attachments checked</span>}
            </div>
            <div>
              <span className="text-slate-400 font-bold text-[10px] uppercase block">Number of Attachments</span>
              <span className="font-bold text-slate-700">{complaint.numAttachments || 0}</span>
            </div>
            {complaint.otherAttachment && (
              <div className="mt-1">
                <span className="text-slate-400 font-bold text-[10px] uppercase block">Other Attachment Description</span>
                <span className="font-semibold text-slate-700">{complaint.otherAttachment}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-black text-xs text-red-800 uppercase tracking-widest border-b pb-1.5 mb-3">4. Desired Resolution</h3>
          <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 h-[100px] overflow-y-auto">
            <span className="text-slate-400 font-bold text-[10px] uppercase block mb-1">Requested KDB Action</span>
            <p className="text-slate-800 text-xs font-semibold leading-relaxed italic">{complaint.desiredResolution}</p>
          </div>
        </div>
      </div>

      {/* Section 5: Declaration */}
      <div className="mb-6 grid grid-cols-2 gap-6 border-t pt-4">
        <div>
          <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest mb-3">5. Complainant Declaration</h3>
          <p className="text-slate-500 text-[10px] leading-relaxed mb-3">
            I declare that the information provided is true and accurate to the best of my knowledge.
          </p>
          <div className="font-semibold text-xs text-slate-700 space-y-1">
            <p><span className="text-slate-400 font-bold uppercase text-[9px]">Name:</span> {complaint.clientNameDeclaration}</p>
            <p><span className="text-slate-400 font-bold uppercase text-[9px]">Date Signed:</span> {formattedDate}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center border p-4 rounded-xl bg-slate-50/50">
          <span className="text-slate-400 font-bold text-[10px] uppercase block mb-2">Complainant Signature</span>
          {complaint.clientSignature ? (
            <img 
              src={complaint.clientSignature} 
              alt="Client Signature" 
              className="max-h-[60px] object-contain border border-dashed rounded bg-white p-1" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="text-slate-300 italic text-xs">No signature recorded</div>
          )}
        </div>
      </div>

      {/* Section 6: For Official Use Only */}
      <div className="border-t-2 border-dashed border-slate-300 pt-6 mt-6 bg-slate-50 p-6 rounded-2xl border">
        <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b pb-2 mb-4">6. For Official Use Only (Kenya Dairy Board Office)</h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4 text-xs font-semibold">
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Complaint Category Code</span>
            <span className="text-slate-800 font-mono font-bold block min-h-[16px]">{complaint.complaintCategoryCode || '____________________'}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Assigned To</span>
            <span className="text-slate-800 block min-h-[16px]">{complaint.assignedTo || '____________________'}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Status</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              complaint.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
              complaint.status === 'closed' ? 'bg-slate-200 text-slate-700' :
              complaint.status === 'referred' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {complaint.status || 'Pending'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
          <div className="border p-3 rounded-lg bg-white min-h-[60px]">
            <span className="text-slate-400 font-bold text-[9px] uppercase block mb-1">Investigation Findings</span>
            <p className="text-slate-700 italic font-semibold">{complaint.investigationFindings || 'Pending investigation...'}</p>
          </div>
          <div className="border p-3 rounded-lg bg-white min-h-[60px]">
            <span className="text-slate-400 font-bold text-[9px] uppercase block mb-1">Action Taken</span>
            <p className="text-slate-700 italic font-semibold">{complaint.actionTaken || 'Pending actions...'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs font-semibold items-end pt-2 border-t">
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Date Closed</span>
            <span className="text-slate-700">{complaint.dateClosed || '____ / ____ / ______'}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[9px]">Officer Name</span>
            <span className="text-slate-700">{complaint.officialName || '____________________'}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-400 block uppercase tracking-wider text-[9px] mb-1">Officer Signature</span>
            {complaint.officialSignature ? (
              <img 
                src={complaint.officialSignature} 
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

export const ComplaintPDFPreview: React.FC<ComplaintPDFPreviewProps> = ({ complaint, onClose, isHidden = false }) => {
  const handleDownload = async () => {
    await downloadComplaintPDF(complaint, `complaint-form-pdf-${complaint.id}`);
  };

  if (isHidden) {
    return (
      <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none">
        <ComplaintPDFContent complaint={complaint} id={`complaint-form-pdf-${complaint.id}`} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-3xl max-w-[1080px] w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Controls Bar */}
        <div className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-5 h-5 text-red-500" />
            <span className="text-sm font-bold uppercase tracking-wider">Stakeholder Complaint Document</span>
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
            <ComplaintPDFContent complaint={complaint} id={`complaint-form-pdf-${complaint.id}`} />
          </div>
        </div>
      </div>
    </div>
  );
};
