import React, { useState } from 'react';
import { InquiryData } from '../types';
import { SignaturePad } from './SignaturePad';
import { Building2, Calendar, FileText, CheckCircle2, MapPin, Phone, PenTool, Send, AlertCircle, HelpCircle } from 'lucide-react';

interface InquiryFormProps {
  onSubmit: (data: InquiryData) => Promise<void>;
  onBack: () => void;
}

export const InquiryForm: React.FC<InquiryFormProps> = ({ onSubmit, onBack }) => {
  const [formData, setFormData] = useState<Partial<InquiryData>>({
    id: 'INQ-' + Math.random().toString(36).substring(2, 11).toUpperCase(),
    status: 'submitted',
    submittedAt: new Date().toISOString().split('T')[0],
    clientName: '',
    contactPerson: '',
    idPassportNo: '',
    kdbLicenseNo: '',
    postalAddress: '',
    cityTown: '',
    tel: '',
    mobileNumber: '',
    email: '',
    clientType: 'Dairy Farmer',
    otherClientType: '',
    natureOfInquiry: 'Licensing & Registration',
    otherNatureOfInquiry: '',
    inquiryDetails: '',
    supportingDocsStatus: 'To be submitted later',
    attachedDocsList: '',
    preferredResponseMode: 'Email',
    declarationAgreed: false,
    clientSignature: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transmissionStatus, setTransmissionStatus] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const updateField = (field: keyof InquiryData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.clientName?.trim()) return setFormError('Client Full Name / Company Name is required');
    if (!formData.postalAddress?.trim()) return setFormError('Postal Address is required');
    if (!formData.cityTown?.trim()) return setFormError('City/Town is required');
    if (!formData.tel?.trim()) return setFormError('Telephone Number is required');
    if (!formData.mobileNumber?.trim()) return setFormError('Mobile Number is required');
    if (!formData.email?.trim()) return setFormError('Email Address is required');
    if (!formData.inquiryDetails?.trim()) return setFormError('Inquiry Details description is required');
    if (formData.supportingDocsStatus === 'Attached' && !formData.attachedDocsList?.trim()) {
      return setFormError('Please list the attached supporting documents');
    }
    if (!formData.declarationAgreed) return setFormError('You must agree to the declaration statement');
    if (!formData.clientSignature) return setFormError('Your digital signature is required');

    setIsSubmitting(true);
    const statuses = [
      'Structuring client inquiry details...',
      'Signing declaration payload...',
      'Transmitting Client Inquiry to Kenya Dairy Board...',
      'Finalizing transmission...'
    ];

    for (const status of statuses) {
      setTransmissionStatus(status);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const submission: InquiryData = {
        ...(formData as InquiryData),
        submittedAt: formData.submittedAt ? new Date(formData.submittedAt).toISOString() : new Date().toISOString()
      };

      await onSubmit(submission);
      setSubmittedSuccess(true);
    } catch (error: any) {
      console.error("Inquiry Submission Error:", error);
      setFormError(error.message || 'Transmission failed. Please check network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-in fade-in zoom-in duration-300" id="inquiry_success_screen">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-sky-100 rounded-full mb-8">
          <CheckCircle2 className="w-12 h-12 text-sky-600 animate-pulse" />
        </div>
        
        <h2 className="text-4xl font-extrabold text-slate-850 mb-4 tracking-tight">Inquiry Submitted!</h2>
        <p className="text-slate-600 text-lg mb-12">
          Thank you for contacting Kenya Dairy Board. Your inquiry has been securely logged with Reference Number: <span className="font-bold text-sky-600">{formData.id}</span>. We will respond through your preferred mode of response.
        </p>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-left mb-12 space-y-4">
          <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider border-b pb-3">Inquiry Reference Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm font-medium">
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Client Name</span>
              <span className="text-slate-700 font-bold">{formData.clientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Reference Number</span>
              <span className="text-slate-700 font-mono font-bold text-sky-600">{formData.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Preferred Response Mode</span>
              <span className="text-slate-700 font-bold">{formData.preferredResponseMode}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-xs uppercase tracking-wider font-bold">Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold leading-5 bg-sky-100 text-sky-800">
                Awaiting Response
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={onBack}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-colors flex items-center justify-center uppercase tracking-wider text-xs"
            id="back_to_hub_btn_inq"
          >
            Return to Service Hub
          </button>
        </div>
      </div>
    );
  }

  const clientTypes = [
    'Dairy Farmer',
    'Milk Transporter',
    'Milk Processor',
    'Milk Vendor/Trader',
    'Cooperative Society',
    'Equipment Supplier',
    'Exporter/Importer',
    'Prospective Investor',
    'Member of Public',
    'Other'
  ];

  const inquiryNatures = [
    'Licensing & Registration',
    'License Renewal',
    'Compliance Requirements',
    'Inspection & Certification',
    'Dairy Imports/Exports',
    'Market Information',
    'Training & Capacity Building',
    'Complaint Submission',
    'Product Standards',
    'Other'
  ];

  const preferredModes = [
    'Email',
    'Phone Call',
    'In-person Appointment',
    'Written Letter'
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-12" id="inquiry_form_root">
      {isSubmitting && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95">
            <div className="relative inline-block">
              <div className="w-24 h-24 border-4 border-sky-500/20 border-t-sky-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Send className="w-8 h-8 text-sky-600 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-widest">TRANSMITTING INQUIRY</h3>
              <p className="text-sky-400 font-bold text-sm h-6">{transmissionStatus}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-sky-850 px-10 py-10 text-white flex justify-between items-center" style={{ backgroundColor: '#0284c7' }}>
          <div>
            <h2 className="text-3xl font-black tracking-tight">Client Inquiry Form</h2>
            <p className="text-sky-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Kenya Dairy Board (KDB)</p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center">
            <HelpCircle className="w-3.5 h-3.5 mr-2" /> Inquiry Desk
          </div>
        </div>

        <div className="p-10 border-b bg-sky-50/50 text-sky-800 text-xs font-medium leading-relaxed px-10 py-6 border-sky-100 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sky-900 block mb-1">We are here to serve you</span>
            Thank you for contacting the Kenya Dairy Board. Kindly fill in the details below to help us serve you better. Your submission will be routed to the respective department for rapid feedback.
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="p-10 space-y-10" id="actual_inquiry_form">
          {formError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-5 rounded-2xl flex items-center font-bold animate-pulse">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0 text-rose-500" />
              {formError}
            </p>
          )}

          {/* Section 1: Client Information */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">1</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">1. Client Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name / Company Name *</label>
                <input 
                  required 
                  type="text"
                  placeholder="Enter full name or company name" 
                  value={formData.clientName} 
                  onChange={e => updateField('clientName', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contact Person (if company)</label>
                <input 
                  type="text"
                  placeholder="Enter official contact person" 
                  value={formData.contactPerson} 
                  onChange={e => updateField('contactPerson', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">ID / Passport No.</label>
                <input 
                  type="text"
                  placeholder="Enter ID or Passport Number" 
                  value={formData.idPassportNo} 
                  onChange={e => updateField('idPassportNo', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">KDB License Number (if applicable)</label>
                <input 
                  type="text"
                  placeholder="e.g. KDB/L/2026/000123" 
                  value={formData.kdbLicenseNo} 
                  onChange={e => updateField('kdbLicenseNo', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800 font-mono" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Postal Address *</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. P.O. Box 456, Nairobi" 
                  value={formData.postalAddress} 
                  onChange={e => updateField('postalAddress', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">City / Town *</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Eldoret, Mombasa" 
                  value={formData.cityTown} 
                  onChange={e => updateField('cityTown', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Telephone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required 
                    type="tel"
                    placeholder="Landline or Main Tel" 
                    value={formData.tel} 
                    onChange={e => updateField('tel', e.target.value)} 
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required 
                    type="tel"
                    placeholder="e.g. +254 712 345678" 
                    value={formData.mobileNumber} 
                    onChange={e => updateField('mobileNumber', e.target.value)} 
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Address *</label>
                <input 
                  required 
                  type="email"
                  placeholder="e.g. name@domain.com" 
                  value={formData.email} 
                  onChange={e => updateField('email', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800" 
                />
              </div>
            </div>
          </div>

          {/* Section 2: Type of Client */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">2</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">2. Type of Client</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Client Category Group *</label>
                <select 
                  value={formData.clientType}
                  onChange={e => updateField('clientType', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800"
                >
                  {clientTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              {formData.clientType === 'Other' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Specify Client Category *</label>
                  <input 
                    required 
                    type="text"
                    placeholder="Specify other client category type" 
                    value={formData.otherClientType} 
                    onChange={e => updateField('otherClientType', e.target.value)} 
                    className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Nature of Inquiry */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">3</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">3. Nature of Inquiry</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nature of Inquiry Topic *</label>
                <select 
                  value={formData.natureOfInquiry}
                  onChange={e => updateField('natureOfInquiry', e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800"
                >
                  {inquiryNatures.map(nature => <option key={nature} value={nature}>{nature}</option>)}
                </select>
              </div>

              {formData.natureOfInquiry === 'Other' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Specify Inquiry Nature *</label>
                  <input 
                    required 
                    type="text"
                    placeholder="Specify other nature of inquiry" 
                    value={formData.otherNatureOfInquiry} 
                    onChange={e => updateField('otherNatureOfInquiry', e.target.value)} 
                    className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800" 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Details of Inquiry */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">4</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">4. Details of Inquiry</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Please provide a detailed description of your inquiry *</label>
              <textarea 
                required 
                rows={5}
                placeholder="Write your questions, requests, or information needs in full detail..." 
                value={formData.inquiryDetails} 
                onChange={e => updateField('inquiryDetails', e.target.value)} 
                className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800" 
              />
            </div>
          </div>

          {/* Section 5: Supporting Documents */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">5</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">5. Supporting Documents (If Any)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Documents Status *</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => updateField('supportingDocsStatus', 'Attached')}
                    className={`flex-1 py-3 px-4 rounded-2xl border text-center transition-all text-xs font-bold ${formData.supportingDocsStatus === 'Attached' ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    Attached
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('supportingDocsStatus', 'To be submitted later')}
                    className={`flex-1 py-3 px-4 rounded-2xl border text-center transition-all text-xs font-bold ${formData.supportingDocsStatus === 'To be submitted later' ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    To be submitted later
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">List of documents attached</label>
                <input 
                  type="text"
                  placeholder="e.g. License receipt, Compliance letter (separate with commas)" 
                  value={formData.attachedDocsList} 
                  disabled={formData.supportingDocsStatus !== 'Attached'}
                  onChange={e => updateField('attachedDocsList', e.target.value)} 
                  className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold text-slate-800 disabled:opacity-50" 
                />
              </div>
            </div>
          </div>

          {/* Section 6: Preferred Mode of Response */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">6</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">6. Preferred Mode of Response</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {preferredModes.map(mode => {
                const selected = formData.preferredResponseMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateField('preferredResponseMode', mode)}
                    className={`py-3 px-4 rounded-2xl border text-center transition-all text-xs font-bold ${selected ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 7: Declaration */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-3 border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">7</div>
              <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">7. Declaration</h3>
            </div>

            <div className="p-8 bg-slate-50 rounded-3xl border space-y-4">
              <label className="flex items-start cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={formData.declarationAgreed || false} 
                  onChange={e => updateField('declarationAgreed', e.target.checked)}
                  className="mt-1.5 mr-4 h-5 w-5 rounded border-slate-300 text-sky-650 focus:ring-sky-500/10 focus:ring-4 transition-all" 
                />
                <div className="text-slate-600 font-semibold text-xs leading-relaxed">
                  I hereby confirm that the information provided above is true and accurate to the best of my knowledge.
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <div className="overflow-hidden bg-white max-w-md">
                <SignaturePad 
                  onSave={sig => updateField('clientSignature', sig)} 
                  label="Digital Signature Draw *"
                  value={formData.clientSignature}
                />
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
              className="w-full sm:w-auto px-10 py-4 bg-sky-600 hover:bg-sky-750 text-white rounded-2xl font-black shadow-lg shadow-sky-650/25 transition-all flex items-center justify-center uppercase tracking-wider text-xs gap-2"
              style={{ backgroundColor: '#0284c7' }}
            >
              <Send className="w-4 h-4" /> Submit Inquiry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
