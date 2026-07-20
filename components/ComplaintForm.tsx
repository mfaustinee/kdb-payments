import React, { useState } from 'react';
import { ComplaintData } from '../types';
import { SignaturePad } from './SignaturePad';
import { Building2, Calendar, FileText, CheckCircle2, MapPin, Phone, PenTool, Send, AlertCircle, RefreshCw } from 'lucide-react';

interface ComplaintFormProps {
  onSubmit: (data: ComplaintData) => Promise<void>;
  onBack: () => void;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ onSubmit, onBack }) => {
  const [formData, setFormData] = useState<Partial<ComplaintData>>({
    id: 'COM-' + Math.random().toString(36).substring(2, 11).toUpperCase(),
    status: 'submitted',
    submittedAt: new Date().toISOString().split('T')[0],
    clientName: '',
    idNumber: '',
    stakeholderCategory: 'Farmer',
    otherStakeholderCategory: '',
    postalAddress: '',
    tel: '',
    email: '',
    county: '',
    natureOfComplaint: 'Licensing Issues',
    otherNatureOfComplaint: '',
    location: '',
    incidentDate: '',
    complaintDescription: '',
    attachments: [],
    otherAttachment: '',
    numAttachments: 0,
    desiredResolution: '',
    declarationAgreed: false,
    clientSignature: '',
    clientNameDeclaration: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transmissionStatus, setTransmissionStatus] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const updateField = (field: keyof ComplaintData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleAttachment = (item: string) => {
    const current = formData.attachments || [];
    if (current.includes(item)) {
      updateField('attachments', current.filter(x => x !== item));
    } else {
      updateField('attachments', [...current, item]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.clientName?.trim()) return setFormError('Complainant Full Name / Company Name is required');
    if (!formData.idNumber?.trim()) return setFormError('ID Number / Registration Number is required');
    if (!formData.tel?.trim()) return setFormError('Telephone Number is required');
    if (!formData.email?.trim()) return setFormError('Email Address is required');
    if (!formData.county?.trim()) return setFormError('County is required');
    if (!formData.location?.trim()) return setFormError('Location where issue occurred is required');
    if (!formData.incidentDate) return setFormError('Date incident occurred is required');
    if (!formData.complaintDescription?.trim()) return setFormError('Detailed description of complaint is required');
    if (!formData.desiredResolution?.trim()) return setFormError('Desired resolution is required');
    if (!formData.declarationAgreed) return setFormError('You must agree to the declaration statement');
    if (!formData.clientSignature) return setFormError('Your digital signature is required');
    if (!formData.clientNameDeclaration?.trim()) return setFormError('Declaration Signatory Name is required');

    setIsSubmitting(true);
    const statuses = [
      'Validating complaint details...',
      'Encrypting digital signatures...',
      'Uploading Stakeholder Complaint to KDB Secure Servers...',
      'Finalizing transmission...'
    ];

    for (const status of statuses) {
      setTransmissionStatus(status);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const submission: ComplaintData = {
        ...(formData as ComplaintData),
        submittedAt: formData.submittedAt ? new Date(formData.submittedAt).toISOString() : new Date().toISOString()
      };

      await onSubmit(submission);
      setSubmittedSuccess(true);
    } catch (error: any) {
      console.error("Complaint Submission Error:", error);
      setFormError(error.message || 'Transmission failed. Please check network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-in fade-in zoom-in duration-300" id="complaint_success_screen">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-8">
          <CheckCircle2 className="w-12 h-12 text-red-650 animate-pulse" />
        </div>
        
        <h2 className="text-4xl font-extrabold text-slate-850 mb-4 tracking-tight">Complaint Logged!</h2>
        <p className="text-slate-600 text-lg mb-12">
          Your stakeholder complaint has been securely logged with Reference No: <span className="font-bold text-red-600">{formData.id}</span> and sent to Kenya Dairy Board (KDB) Regulatory and Compliance Department.
        </p>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-left mb-12 space-y-4">
          <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider border-b pb-3">Complaint Reference Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm font-medium">
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Complainant Name</span>
              <span className="text-slate-700 font-bold">{formData.clientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Reference Number</span>
              <span className="text-slate-700 font-mono font-bold text-red-650">{formData.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Incident Date</span>
              <span className="text-slate-700 font-bold">{formData.incidentDate}</span>
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
            id="back_to_hub_btn"
          >
            Return to Service Hub
          </button>
        </div>
      </div>
    );
  }

  const categories = [
    'Farmer',
    'Milk Trader',
    'Processor',
    'Transporter',
    'Cooperative Society',
    'Input Supplier',
    'Distributor',
    'Consumer',
    'Other'
  ];

  const complaintNatures = [
    'Licensing Issues',
    'Delayed Services',
    'Quality/Standards Concerns',
    'Inspection/Compliance Issues',
    'Milk Pricing Disputes',
    'Staff Conduct',
    'Corruption or Misconduct',
    'Regulatory Enforcement Concern',
    'Other'
  ];

  const attachmentOptions = [
    'License Copy',
    'Payment Receipt',
    'Correspondence (Emails/Letters)',
    'Inspection Report',
    'Photos',
    'Other'
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-12" id="complaint_form_root">
      {isSubmitting && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95">
            <div className="relative inline-block">
              <div className="w-24 h-24 border-4 border-red-500/20 border-t-red-650 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Send className="w-8 h-8 text-red-650 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-widest">TRANSMITTING COMPLAINT</h3>
              <p className="text-red-400 font-bold text-sm h-6">{transmissionStatus}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-red-750 px-10 py-10 text-white flex justify-between items-center" style={{ backgroundColor: '#991b1b' }}>
          <div>
            <h2 className="text-3xl font-black tracking-tight">Stakeholder Complaints Form</h2>
            <p className="text-red-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Kenya Dairy Board (KDB)</p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center">
            <FileText className="w-3.5 h-3.5 mr-2" /> Complaint Portal
          </div>
        </div>

        <div className="p-10 border-b bg-red-50/50 text-red-800 text-xs font-medium leading-relaxed px-10 py-6 border-red-100 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-red-900 block mb-1">NB: Formal Complaints Tracking</span>
            Use this form to submit stakeholder complaints regarding Kenya Dairy Board regulatory services, staff conduct, licensing delays, quality standards disputes, pricing, or regulatory enforcement concerns. Your report will be thoroughly investigated.
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="p-10 space-y-10" id="actual_complaint_form">
          {formError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-5 rounded-2xl flex items-center font-bold animate-pulse">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0 text-rose-500" />
              {formError}
            </p>
          )}

          {/* Section 1: Complainant Details */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">1</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">1. Complainant Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name / Company Name *</label>
                <input 
                  required 
                  type="text"
                  placeholder="Enter full name or registered company" 
                  value={formData.clientName} 
                  onChange={e => updateField('clientName', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">ID / Registration Number *</label>
                <input 
                  required 
                  type="text"
                  placeholder="Enter National ID or Reg Number" 
                  value={formData.idNumber} 
                  onChange={e => updateField('idNumber', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Stakeholder Category *</label>
                <select 
                  value={formData.stakeholderCategory}
                  onChange={e => updateField('stakeholderCategory', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              {formData.stakeholderCategory === 'Other' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Specify Category *</label>
                  <input 
                    required 
                    type="text"
                    placeholder="Specify other stakeholder category" 
                    value={formData.otherStakeholderCategory} 
                    onChange={e => updateField('otherStakeholderCategory', e.target.value)} 
                    className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Postal Address</label>
                <input 
                  type="text"
                  placeholder="e.g. P.O. Box 123, Town" 
                  value={formData.postalAddress} 
                  onChange={e => updateField('postalAddress', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Telephone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required 
                    type="tel"
                    placeholder="e.g. +254 700 000000" 
                    value={formData.tel} 
                    onChange={e => updateField('tel', e.target.value)} 
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Address *</label>
                <input 
                  required 
                  type="email"
                  placeholder="e.g. name@domain.com" 
                  value={formData.email} 
                  onChange={e => updateField('email', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">County *</label>
                <input 
                  required 
                  type="text"
                  placeholder="e.g. Nairobi, Kericho, Nakuru" 
                  value={formData.county} 
                  onChange={e => updateField('county', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>
            </div>
          </div>

          {/* Section 2: Complaint Details */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">2</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">2. Complaint Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nature of Complaint *</label>
                <select 
                  value={formData.natureOfComplaint}
                  onChange={e => updateField('natureOfComplaint', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800"
                >
                  {complaintNatures.map(nat => <option key={nat} value={nat}>{nat}</option>)}
                </select>
              </div>

              {formData.natureOfComplaint === 'Other' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Specify Nature *</label>
                  <input 
                    required 
                    type="text"
                    placeholder="Specify other nature of complaint" 
                    value={formData.otherNatureOfComplaint} 
                    onChange={e => updateField('otherNatureOfComplaint', e.target.value)} 
                    className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Location (County/Sub-County) *</label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required 
                    type="text"
                    placeholder="Location where issue occurred" 
                    value={formData.location} 
                    onChange={e => updateField('location', e.target.value)} 
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Date Incident Occurred *</label>
                <div className="relative">
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required 
                    type="date"
                    value={formData.incidentDate} 
                    onChange={e => updateField('incidentDate', e.target.value)} 
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Detailed Description of Complaint *</label>
              <textarea 
                required 
                rows={5}
                placeholder="Provide full details including names, dates, and supporting facts..." 
                value={formData.complaintDescription} 
                onChange={e => updateField('complaintDescription', e.target.value)} 
                className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
              />
            </div>
          </div>

          {/* Section 3: Supporting Documents */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">3</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">3. Supporting Documents</h3>
            </div>

            <p className="text-xs text-slate-500 font-medium">Please attach/indicate copies of any relevant documents (Check where applicable):</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {attachmentOptions.map(opt => {
                const checked = (formData.attachments || []).includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleAttachment(opt)}
                    className={`flex items-center px-4 py-3 rounded-2xl border text-left transition-all ${checked ? 'border-red-650 bg-red-50/50 text-red-850 font-bold' : 'border-slate-200 text-slate-600 font-medium hover:bg-slate-50'}`}
                  >
                    <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center ${checked ? 'border-red-650 bg-red-650 text-white' : 'border-slate-300'}`}>
                      {checked && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    <span className="text-xs">{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Number of Attachments</label>
                <input 
                  type="number"
                  placeholder="0" 
                  min={0}
                  value={formData.numAttachments || ''} 
                  onChange={e => updateField('numAttachments', parseInt(e.target.value) || 0)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Other Attachment Description</label>
                <input 
                  type="text"
                  placeholder="Specify other attachment if checked" 
                  value={formData.otherAttachment} 
                  disabled={!(formData.attachments || []).includes('Other')}
                  onChange={e => updateField('otherAttachment', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800 disabled:opacity-50" 
                />
              </div>
            </div>
          </div>

          {/* Section 4: Desired Resolution */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">4</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">4. Desired Resolution</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">What action would you like Kenya Dairy Board to take? *</label>
              <textarea 
                required 
                rows={3}
                placeholder="Describe your desired resolution clearly..." 
                value={formData.desiredResolution} 
                onChange={e => updateField('desiredResolution', e.target.value)} 
                className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
              />
            </div>
          </div>

          {/* Section 5: Declaration & Signature */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">5</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">5. Declaration Statement</h3>
            </div>

            <div className="p-8 bg-slate-50 rounded-3xl space-y-4 border">
              <label className="flex items-start cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={formData.declarationAgreed || false} 
                  onChange={e => updateField('declarationAgreed', e.target.checked)}
                  className="mt-1.5 mr-4 h-5 w-5 rounded border-slate-300 text-red-650 focus:ring-red-500/10 focus:ring-4 transition-all" 
                />
                <div className="text-slate-600 font-semibold text-xs leading-relaxed">
                  I declare that the information provided is true and accurate to the best of my knowledge.
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Signatory Full Name *</label>
                <input 
                  required 
                  type="text"
                  placeholder="Enter your legal full name" 
                  value={formData.clientNameDeclaration} 
                  onChange={e => updateField('clientNameDeclaration', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-red-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-3">
                <div className="overflow-hidden bg-white relative">
                  <SignaturePad 
                    onSave={sig => updateField('clientSignature', sig)} 
                    label="Digital Signature Draw *"
                    value={formData.clientSignature}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onBack}
              className="w-full sm:w-auto px-8 py-4 border border-slate-200 hover:bg-slate-50 rounded-2xl font-black text-slate-500 transition-colors uppercase tracking-wider text-xs"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="w-full sm:w-auto px-10 py-4 bg-red-700 hover:bg-red-800 text-white rounded-2xl font-black shadow-lg shadow-red-750/20 transition-all flex items-center justify-center uppercase tracking-wider text-xs gap-2"
              style={{ backgroundColor: '#b91c1c' }}
            >
              <Send className="w-4 h-4" /> Submit Complaint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
