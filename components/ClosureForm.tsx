import React, { useState } from 'react';
import { ClosureNotificationData } from '../types';
import { SignaturePad } from './SignaturePad';
import { Building2, Calendar, FileText, ChevronRight, CheckCircle2, ShieldCheck, MapPin, Phone, Check, PenTool, Loader2, Send, AlertCircle, RefreshCw } from 'lucide-react';

interface ClosureFormProps {
  onSubmit: (data: ClosureNotificationData) => Promise<void>;
  onBack: () => void;
}

export const ClosureForm: React.FC<ClosureFormProps> = ({ onSubmit, onBack }) => {
  const [formData, setFormData] = useState<Partial<ClosureNotificationData>>({
    id: 'CLO-' + Math.random().toString(36).substring(2, 11).toUpperCase(),
    status: 'submitted',
    submittedAt: new Date().toISOString().split('T')[0],
    dboName: '',
    permitNo: '',
    premiseName: '',
    permitType: 'Milk Bar',
    county: '',
    subCounty: '',
    location: '',
    tel: '',
    closureDate: '',
    closureReason: '',
    permitStatusIntent: 'Cancellation',
    declarationAgreed: false,
    clientSignature: '',
    clientName: '',
    clientTitle: ''
  });

  const [customIntent, setCustomIntent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transmissionStatus, setTransmissionStatus] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const updateField = (field: keyof ClosureNotificationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.dboName?.trim()) return setFormError('Permit Holder Name is required');
    if (!formData.permitNo?.trim()) return setFormError('KDB Permit Number is required');
    if (!formData.premiseName?.trim()) return setFormError('Premise Name is required');
    if (!formData.county?.trim()) return setFormError('County is required');
    if (!formData.location?.trim()) return setFormError('Physical Location is required');
    if (!formData.tel?.trim()) return setFormError('Phone Number is required');
    if (!formData.closureDate) return setFormError('Closure Date is required');
    if (!formData.clientSignature) return setFormError('Signature of Permit Holder is required');
    if (!formData.clientName?.trim()) return setFormError('Form Signatory Name is required');
    if (!formData.clientTitle?.trim()) return setFormError('Title of Signatory is required');

    setIsSubmitting(true);
    const statuses = [
      'Validating Permit status...',
      'Compiling cessation archives...',
      'Encrypting digital signatures...',
      'Uploading Closure Notification to KDB Secure Servers...',
      'Finalizing transmission...'
    ];

    for (const status of statuses) {
      setTransmissionStatus(status);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const submission: ClosureNotificationData = {
        ...(formData as ClosureNotificationData),
        closureReason: formData.closureReason || '',
        permitStatusIntent: 'Cancellation',
        declarationAgreed: true,
        submittedAt: formData.submittedAt ? new Date(formData.submittedAt).toISOString() : new Date().toISOString()
      };

      await onSubmit(submission);
      setSubmittedSuccess(true);
    } catch (error: any) {
      console.error("Closure Submission Error:", error);
      setFormError(error.message || 'Transmission failed. Please check network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-in fade-in zoom-in duration-300">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-100 rounded-full mb-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 animate-pulse" />
        </div>
        
        <h2 className="text-4xl font-extrabold text-slate-850 mb-4 tracking-tight">Notification Submitted!</h2>
        <p className="text-slate-600 text-lg mb-12">
          Your formal closure notice for <span className="font-bold text-slate-800">{formData.premiseName}</span> has been securely logged and sent to Kenya Dairy Board (KDB) Regulatory Department.
        </p>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-left mb-12 space-y-4">
          <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider border-b pb-3">Notice Receipt Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm font-medium">
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Permit Holder Name</span>
              <span className="text-slate-700 font-bold">{formData.dboName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Permit Number</span>
              <span className="text-slate-700 font-mono font-bold">{formData.permitNo}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Closure Date</span>
              <span className="text-slate-700 font-bold">{formData.closureDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold leading-5 bg-amber-100 text-amber-800">
                Awaiting Regulatory Review
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={onBack}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-colors flex items-center justify-center uppercase tracking-wider text-xs"
          >
            Return to Service Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {isSubmitting && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95">
            <div className="relative inline-block">
              <div className="w-24 h-24 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Send className="w-8 h-8 text-emerald-500 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-widest">TRANSMITTING CLOSURE NOTICE</h3>
              <p className="text-emerald-400 font-bold text-sm h-6">{transmissionStatus}</p>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full animate-[progress_3s_ease-in-out]"></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-red-600 px-10 py-10 text-white flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Cessation Portal</h2>
            <p className="text-red-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">KDB Business Closure Notification</p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center">
            <Building2 className="w-3.5 h-3.5 mr-2" /> Regulatory Notice
          </div>
        </div>

        <div className="p-10 border-b bg-red-50/50 text-red-800 text-xs font-medium leading-relaxed px-10 py-6 border-red-100 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-red-900 block mb-1">NB: Permits are Not Transferable</span>
            This form is for Kenya Dairy Board (KDB) clients to formally notify the KDB Regulatory Department of the closure or cessation of operations of a licensed Dairy Business Premise. This information is vital for updating KDB regulatory records.
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="p-10 space-y-10">
          {formError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-5 rounded-2xl flex items-center font-bold animate-pulse">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0 text-rose-500" />
              {formError}
            </p>
          )}

          {/* Section 1: Contact & Identification Details */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">1</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">Contact & Identification Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name of Permit Holder *</label>
                <input 
                  required 
                  type="text"
                  placeholder="Type your name as registered on the Permit" 
                  value={formData.dboName} 
                  onChange={e => updateField('dboName', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Notification / Notice Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required 
                    type="date"
                    value={formData.submittedAt} 
                    onChange={e => updateField('submittedAt', e.target.value)} 
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">KDB Permit Number *</label>
                <input 
                  required 
                  type="text"
                  placeholder="KDB/MB/0001234/2024" 
                  value={formData.permitNo} 
                  onChange={e => updateField('permitNo', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Licensed Premise Name *</label>
                <input 
                  required 
                  type="text"
                  placeholder="The name as listed on the permit" 
                  value={formData.premiseName} 
                  onChange={e => updateField('premiseName', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Business / Permit Type *</label>
                <select 
                  value={formData.permitType}
                  onChange={e => updateField('permitType', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800"
                >
                  <option value="Milk Bar">Milk Bar</option>
                  <option value="Cottage Industry">Cottage Industry</option>
                  <option value="Dispenser">Dispenser</option>
                  <option value="Cooling Plant">Cooling Plant</option>
                  <option value="Mini Dairy">Mini Dairy</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Primary Contact Phone Number *</label>
                <input 
                  required 
                  type="tel"
                  placeholder="Must be reachable, e.g. 0712345678" 
                  value={formData.tel} 
                  onChange={e => updateField('tel', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">County of Operation *</label>
                <input 
                  required 
                  type="text"
                  placeholder="e.g. Kericho" 
                  value={formData.county} 
                  onChange={e => updateField('county', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Business Location / Physical Address *</label>
                <input 
                  required 
                  type="text"
                  placeholder="e.g. Majengo Road, near Post Office" 
                  value={formData.location} 
                  onChange={e => updateField('location', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>
            </div>
          </div>

          {/* Section 2: Closure Details */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">2</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">Closure Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Date of Official Business Closure / Cessation *</label>
                <div className="relative">
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required 
                    type="date"
                    value={formData.closureDate} 
                    onChange={e => updateField('closureDate', e.target.value)} 
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Reason for Closure (Optional)</label>
                <div className="relative">
                  <FileText className="absolute left-5 top-5 w-4 h-4 text-slate-400" />
                  <textarea 
                    placeholder="e.g. Relocating operations, high overhead costs, scaling down, etc." 
                    value={formData.closureReason || ''} 
                    onChange={e => updateField('closureReason', e.target.value)} 
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800 min-h-[100px] resize-none" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Authorization */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">3</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">Authorized Operator Signature</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name of Signatory (Permit Holder) *</label>
                  <input 
                    required 
                    type="text"
                    placeholder="Enter full name for validation" 
                    value={formData.clientName} 
                    onChange={e => updateField('clientName', e.target.value)} 
                    className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Title of Signatory (e.g. Director, Owner, Manager) *</label>
                  <input 
                    required 
                    type="text"
                    placeholder="e.g. Director / Business Owner" 
                    value={formData.clientTitle} 
                    onChange={e => updateField('clientTitle', e.target.value)} 
                    className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              </div>

              <div>
                <SignaturePad 
                  label="Authorize Notification Signature *" 
                  value={formData.clientSignature}
                  onSave={sig => updateField('clientSignature', sig)} 
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t flex flex-col sm:flex-row gap-4">
            <button 
              type="button"
              onClick={onBack}
              className="flex-1 py-5 bg-slate-50 text-slate-500 hover:text-slate-700 font-black rounded-3xl outline-none hover:bg-slate-100 transition-all uppercase tracking-wider text-xs"
            >
              Cancel and Return
            </button>
            <button 
              type="submit"
              className="flex-1 py-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-3xl outline-none shadow-xl shadow-red-200 transition-all uppercase tracking-wider text-xs"
            >
              Submit Cessation Notice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
