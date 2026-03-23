
import React, { useState, useRef, useEffect } from 'react';
import { AgreementData, DebtorRecord } from '../types';
import { SignaturePad } from './SignaturePad';
import { Building2, Calendar, CreditCard, ChevronRight, CheckCircle2, ShieldCheck, Mail, AlertCircle, FileText, Lock, MapPin, Phone, Check, Camera, PenTool, Upload, Loader2, Send } from 'lucide-react';

interface AgreementFormProps {
  agreements: AgreementData[];
  debtors: DebtorRecord[];
  onSubmit: (data: AgreementData) => void;
}

export const AgreementForm: React.FC<AgreementFormProps> = ({ agreements, debtors, onSubmit }) => {
  const [step, setStep] = useState(0); 
  const [selectedDebtor, setSelectedDebtor] = useState<DebtorRecord | null>(null);
  const [lookupPermit, setLookupPermit] = useState('');
  const [lookupSecret, setLookupSecret] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transmissionStatus, setTransmissionStatus] = useState('');
  const [signatureMethod, setSignatureMethod] = useState<'draw' | 'upload'>('draw');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<AgreementData>>({
    id: Math.random().toString(36).substr(2, 9),
    status: 'submitted',
    date: new Date().toISOString().split('T')[0],
  });

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');
    const found = debtors.find(d => 
      d.permitNo.toLowerCase() === lookupPermit.toLowerCase() && 
      (d.tel === lookupSecret || d.debitNoteNo.toLowerCase() === lookupSecret.toLowerCase())
    );
    if (found) {
      const existing = agreements.find(a => a.permitNo.toLowerCase() === found.permitNo.toLowerCase());
      if (existing) {
        if (existing.status === 'approved') {
          setVerifyError('You already have an approved agreement. Please contact KDB for further assistance.');
          return;
        }
        if (existing.status === 'resubmission_requested') {
          setVerifyError('Your request for re-submission is currently under review by KDB.');
          return;
        }
        if (existing.status === 'submitted') {
          setSelectedDebtor(found);
          setFormData(prev => ({ ...prev, ...found, id: existing.id })); // Use existing ID
          setStep(5); // Request resubmission step
          return;
        }
      }
      setSelectedDebtor(found);
      const { id: debtorId, ...debtorData } = found;
      setFormData(prev => ({ ...prev, ...debtorData, installments: found.installments.map(i => ({ ...i })) }));
      setStep(1);
    } else {
      setVerifyError('Verification failed. Use your Regulatory Permit No and Phone/Debit Note No.');
    }
  };

  const handleResubmissionRequest = async () => {
    if (!formData.resubmissionReason) return alert("Please provide a reason for re-submission.");
    setIsSubmitting(true);
    setTransmissionStatus('Transmitting re-submission request to KDB...');
    
    const requestData: AgreementData = {
      ...(formData as AgreementData),
      status: 'resubmission_requested',
      submittedAt: new Date().toISOString(),
    };

    await new Promise(r => setTimeout(r, 1500));
    onSubmit(requestData);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    const statuses = [
      'Compiling legal agreement...',
      'Encrypting digital signatures...',
      'Uploading to KDB Secure Servers...',
      'Finalizing transmission...'
    ];

    for (const status of statuses) {
      setTransmissionStatus(status);
      await new Promise(r => setTimeout(r, 800));
    }
    
    onSubmit(formData as AgreementData);
  };

  const isStep1Valid = formData.clientEmail && formData.tel && formData.location;
  const isStep3Valid = formData.installments?.every(i => i.dueDate);
  const isStep4Valid = hasReadTerms && formData.clientName && formData.clientTitle && formData.clientSignature;

  const updateField = (field: keyof AgreementData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateInstallment = (index: number, value: string) => {
    if (!formData.installments) return;
    const newInstallments = [...formData.installments];
    newInstallments[index] = { ...newInstallments[index], dueDate: value };
    setFormData(prev => ({ ...prev, installments: newInstallments }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField('clientSignature', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
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
              <h3 className="text-xl font-black text-white uppercase tracking-widest">Transmitting Agreement</h3>
              <p className="text-emerald-400 font-bold text-sm h-6">{transmissionStatus}</p>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full animate-[progress_4s_ease-in-out]"></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-emerald-600 px-10 py-8 text-white flex justify-between items-center">
          <div><h2 className="text-2xl font-black">Execution Portal</h2><p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Levy Arrears Payment Agreement</p></div>
          <div className="bg-white/10 px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center"><Lock className="w-3 h-3 mr-2" /> Secured Session</div>
        </div>

        <div className="p-10">
          {step === 0 && (
            <div className="max-w-md mx-auto py-12 space-y-10">
              <div className="text-center"><ShieldCheck className="w-20 h-20 text-emerald-600 mx-auto mb-6" /><h3 className="text-2xl font-black text-slate-800">Operator Identity</h3><p className="text-sm text-slate-500 font-medium leading-relaxed">Authenticate your Business Profile using your KDB Permit Number and registered phone number</p></div>
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Permit Number</label><input required placeholder="KDB/MB/0001/0001234/2024" value={lookupPermit} onChange={e => setLookupPermit(e.target.value)} className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Authorized Phone / Debit Note No</label><input required type="password" placeholder="••••••••" value={lookupSecret} onChange={e => setLookupSecret(e.target.value)} className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold" /></div>
                {verifyError && <p className="text-xs text-rose-600 bg-rose-50 p-4 rounded-2xl flex items-center font-bold animate-pulse"><AlertCircle className="w-4 h-4 mr-2" /> {verifyError}</p>}
                <button className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl hover:bg-emerald-700 shadow-2xl shadow-emerald-200 transition-all flex items-center justify-center uppercase tracking-widest text-sm">Access Portal <ChevronRight className="ml-2 w-4 h-4" /></button>
              </form>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center space-x-2 text-emerald-600 font-black uppercase tracking-widest text-xs"><MapPin className="w-4 h-4" /><span>Business Information Verification</span></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 p-6 bg-slate-50 rounded-3xl border space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Operating DBO</label>
                      <div className="text-lg font-black text-slate-800">{selectedDebtor?.dboName}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">County</label>
                      <div className="text-lg font-black text-slate-800">{selectedDebtor?.county}</div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Premise Name</label>
                    <div className="text-sm font-bold text-slate-600">{selectedDebtor?.premiseName}</div>
                  </div>
                </div>
                <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Premise Physical Location *</label><input required value={formData.location || ''} onChange={e => updateField('location', e.target.value)} className="w-full px-5 py-3 rounded-2xl border bg-white focus:ring-4 focus:ring-emerald-500/5 font-bold outline-none" placeholder="e.g. Plot 42, Kisumu Rd" /></div>
                <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Signatory Contact Email *</label><input required type="email" value={formData.clientEmail || ''} onChange={e => updateField('clientEmail', e.target.value)} className="w-full px-5 py-3 rounded-2xl border bg-white focus:ring-4 focus:ring-emerald-500/5 font-bold outline-none" placeholder="manager@business.com" /></div>
                <div className="md:col-span-2 space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Authorized Phone No *</label><input required value={formData.tel || ''} onChange={e => updateField('tel', e.target.value)} className="w-full px-5 py-3 rounded-2xl border bg-white focus:ring-4 focus:ring-emerald-500/5 font-bold outline-none" placeholder="0712 345 678" /></div>
              </div>
              <div className="flex pt-4"><button disabled={!isStep1Valid} onClick={() => setStep(2)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black disabled:opacity-30 flex items-center justify-center shadow-lg hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs">Verify Arrears Balance <ChevronRight className="ml-2 w-4 h-4" /></button></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 text-center">
              <div className="bg-slate-900 p-16 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5"><CreditCard className="w-48 h-48" /></div>
                <span className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em]">Submitted Arrears Records</span>
                <div className="text-6xl font-black mt-4 tracking-tighter">KES {selectedDebtor?.totalArrears.toLocaleString()}</div>
                <div className="mt-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest italic opacity-80">
                  {selectedDebtor?.totalArrearsWords}
                </div>
                <div className="mt-6 text-slate-400 text-sm font-medium uppercase tracking-widest">{selectedDebtor?.arrearsPeriod} Arrears</div>
                <p className="mt-8 text-xs text-slate-500 italic max-w-sm mx-auto leading-relaxed">" {selectedDebtor?.totalArrearsWords} "</p>
              </div>
              <div className="flex space-x-4 pt-4">
                <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest">Back</button>
                <button onClick={() => setStep(3)} className="flex-2 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl shadow-emerald-100 hover:bg-emerald-700 transition-all uppercase text-xs tracking-widest">Agree to Schedule</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center space-x-2 text-emerald-600 font-black uppercase tracking-widest text-xs"><Calendar className="w-4 h-4" /><span>Proposed Payment Schedule</span></div>
              
              <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50 space-y-2">
                <p className="text-[11px] font-black text-emerald-800 uppercase tracking-widest">Instructions:</p>
                <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                  Please counter-check on your client portal that the information indicated below is correct. 
                  <span className="block mt-1 font-black underline">Select appropriate payment date for each period.</span>
                </p>
              </div>

              <div className="border rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 font-black text-slate-400 uppercase text-[10px] tracking-widest"><tr><th className="px-8 py-5 text-left">Installment Period</th><th className="px-8 py-5 text-left">Amount (KES)</th><th className="px-8 py-5 text-left text-slate-800">Payment Due Date *</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.installments?.map((inst, i) => (
                      <tr key={i} className="bg-white hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-400">Inst. {inst.no} ({inst.period})</td>
                        <td className="px-8 py-5 font-black text-emerald-600 text-lg">KES {inst.amount.toLocaleString()}</td>
                        <td className="px-8 py-5"><input required type="date" value={inst.dueDate || ''} onChange={e => updateInstallment(i, e.target.value)} className="w-full px-4 py-3 border-2 border-slate-50 rounded-xl outline-none focus:border-emerald-500 transition-all font-bold" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex space-x-4">
                <button onClick={() => setStep(2)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest">Back</button>
                <button disabled={!isStep3Valid} onClick={() => setStep(4)} className="flex-2 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-30 transition-all uppercase text-xs tracking-widest">Proceed to Signing</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-slate-800 font-black uppercase tracking-widest text-xs"><FileText className="w-4 h-4" /><span>KDB Regulatory Terms & Conditions</span></div>
                <div className="h-80 overflow-y-auto p-8 bg-slate-50 border rounded-3xl text-[11px] text-slate-600 leading-relaxed shadow-inner font-medium scroll-smooth">
                  <p className="font-black text-slate-800 underline mb-4 uppercase tracking-widest">AGREEMENT CLAUSES (a-k)</p>
                  <p className="mb-3">a) The DBO acknowledges, agrees to, and does not dispute the levy amount indicated herein.</p>
                  <p className="mb-3">b) Payments shall be made to the designated KDB Bank Account or via the E-Citizen Collection account as directed by KDB.</p>
                  <p className="mb-3">c) The DBO shall submit proof of each payment immediately upon settlement.</p>
                  <p className="mb-4 font-black text-rose-700 bg-rose-50 p-2 rounded">d) FAILURE TO HONOR ANY INSTALLMENT WITHIN SEVEN (7) DAYS OF ITS DUE DATE SHALL VOID THIS AGREEMENT AND THE ENTIRE OUTSTANDING BALANCE SHALL BECOME IMMEDIATELY DUE AND PAYABLE IN FULL.</p>
                  <p className="mb-3">e) KDB reserves the right to initiate legal or enforcement action upon breach of this agreement.</p>
                  <p className="mb-3">f) Applications for the renewal of any KDB-issued permit shall not be processed or approved while any part of this agreed-upon debt remains outstanding.</p>
                  <p className="mb-3">g) This Agreement pertains only to the outstanding levy amount specified herein and does not constitute a waiver of any other regulatory requirements or obligations imposed on the DBO by KDB.</p>
                  <p className="mb-3">h) In the event of business cessation, dissolution or merger, the outstanding levy obligation shall be settled in full prior to final deregistration or exit.</p>
                  <p className="mb-3">i) This agreement shall be binding on successors, assignees, and any legal representatives of the operator.</p>
                  <p className="mb-3">j) The DBO agrees to remain in full compliance with all relevant laws and regulations as prescribed under The Dairy Industry Act (Cap 336).</p>
                  <p className="mb-3">k) No Waiver of Rights. Any delay or failure by KDB to enforce a term of this Agreement does not waive its right to do so later.</p>
                  <div className="h-20"></div>
                </div>
                
                <div className="flex items-center space-x-3 bg-white p-5 rounded-3xl border-2 border-emerald-50 shadow-sm animate-in fade-in duration-700">
                  <input 
                    id="terms-checkbox"
                    type="checkbox" 
                    checked={hasReadTerms} 
                    onChange={(e) => setHasReadTerms(e.target.checked)}
                    className="w-6 h-6 text-emerald-600 rounded-lg border-slate-300 focus:ring-emerald-500 cursor-pointer transition-all"
                  />
                  <label htmlFor="terms-checkbox" className="text-xs font-black text-slate-700 cursor-pointer select-none leading-relaxed">
                    I CONFIRM THAT I HAVE READ AND AGREE TO BE BOUND BY ALL THE REGULATORY TERMS AND CONDITIONS LISTED ABOVE.
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Name of Signatory *</label><input required value={formData.clientName || ''} onChange={e => updateField('clientName', e.target.value)} className="w-full px-5 py-3 border rounded-2xl bg-white font-bold outline-none" placeholder="John Doe" /></div>
                <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Official Title / Designation *</label><input required value={formData.clientTitle || ''} onChange={e => updateField('clientTitle', e.target.value)} className="w-full px-5 py-3 border rounded-2xl bg-white font-bold outline-none" placeholder="Managing Director" /></div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Execution Method *</label>
                    <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
                        <button 
                            type="button"
                            onClick={() => { setSignatureMethod('draw'); updateField('clientSignature', ''); }}
                            className={`flex-1 sm:px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center ${signatureMethod === 'draw' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <PenTool className="w-3 h-3 mr-2" /> Digital Draw
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setSignatureMethod('upload'); updateField('clientSignature', ''); }}
                            className={`flex-1 sm:px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center ${signatureMethod === 'upload' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Camera className="w-3 h-3 mr-2" /> Upload Photo
                        </button>
                    </div>
                </div>

                {signatureMethod === 'draw' ? (
                    <SignaturePad label="Authorized Digital Signature *" onSave={sig => updateField('clientSignature', sig)} />
                ) : (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Signature Photo / Camera Capture *</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 rounded-2xl p-8 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group"
                        >
                            {formData.clientSignature ? (
                                <div className="relative w-full flex justify-center">
                                    <img src={formData.clientSignature} className="max-h-40 rounded-lg shadow-sm" alt="Signature preview" />
                                    <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/10 flex items-center justify-center rounded-lg transition-all">
                                        <Upload className="text-emerald-600 opacity-0 group-hover:opacity-100 w-8 h-8" />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white p-4 rounded-full shadow-sm mb-4 text-slate-400 group-hover:text-emerald-600 transition-colors">
                                        <Camera className="w-8 h-8" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tap to capture or upload</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Ensure signature is clear and on a white background</p>
                                </>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden" 
                                accept="image/*" 
                                capture="environment" 
                                onChange={handleFileUpload} 
                            />
                        </div>
                    </div>
                )}
              </div>

              <div className="flex space-x-4 pt-4">
                <button onClick={() => setStep(3)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest">Back</button>
                <button disabled={!isStep4Valid} onClick={handleFinalSubmit} className="flex-2 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-30 transition-all uppercase text-xs tracking-widest">Execute Final Submission</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="max-w-md mx-auto py-12 space-y-8 animate-in zoom-in-95">
              <div className="text-center">
                <AlertCircle className="w-20 h-20 text-amber-500 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-slate-800">Existing Submission Found</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed mt-2">
                  Our records show that <span className="font-bold text-slate-800">{selectedDebtor?.dboName}</span> has already submitted an agreement. 
                  Multiple submissions are restricted.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Reason for Re-submission Request</label>
                  <textarea 
                    required 
                    placeholder="Explain why you need to submit another agreement (e.g., error in previous submission, change in circumstances)..." 
                    value={formData.resubmissionReason || ''} 
                    onChange={e => updateField('resubmissionReason', e.target.value)} 
                    className="w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium text-sm min-h-[120px]"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest">Cancel</button>
                  <button 
                    onClick={handleResubmissionRequest}
                    className="flex-2 py-4 bg-amber-500 text-white font-black rounded-2xl hover:bg-amber-600 shadow-xl shadow-amber-100 transition-all flex items-center justify-center uppercase tracking-widest text-xs"
                  >
                    Request Re-submission <Send className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
