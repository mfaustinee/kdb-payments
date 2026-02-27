
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgreementData, DebtorRecord, ArrearItem, Installment, StaffConfig, KDB_ADMIN_EMAIL } from '../types.ts';
import { Eye, Plus, Trash2, Database, FileCheck, UserPlus, MapPin, ShieldCheck, AlertTriangle, Send, Settings, Upload, CheckCircle2, Briefcase, FileText, FileSearch, Mail, Calendar, Check, Loader2, Search, X, Download, Server, Cpu, Globe, Key, Lock, Activity, AlertCircle, ExternalLink, PenTool, Trash } from 'lucide-react';
import { PDFPreview } from './PDFPreview.tsx';
import { downloadAgreementPDF } from '../services/pdf.ts';
import { numberToWords } from '../utils/numberToWords.ts';

interface AdminDashboardProps {
  agreements: AgreementData[];
  debtors: DebtorRecord[];
  staffConfig: StaffConfig;
  isSyncing?: boolean;
  onRefresh?: () => void;
  onAction: (id: string, action: 'approve' | 'reject', adminData?: { signature: string; name: string; reason?: string }) => void;
  onDeleteAgreement?: (id: string) => void;
  onDebtorUpdate: (updated: DebtorRecord[]) => void;
  onStaffUpdate: (config: StaffConfig) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ agreements, debtors, staffConfig, isSyncing, onRefresh, onAction, onDeleteAgreement, onDebtorUpdate, onStaffUpdate }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'reviews' | 'debtors' | 'settings'>('reviews');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminName, setAdminName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingDebtor, setIsAddingDebtor] = useState(false);
  const [editingDebtorId, setEditingDebtorId] = useState<string | null>(null);
  const [newDebtor, setNewDebtor] = useState<Partial<DebtorRecord>>({
    dboName: '',
    premiseName: '',
    permitNo: '',
    county: '',
    location: '',
    totalArrears: 0,
    tel: '',
    debitNoteNo: '',
    arrearsBreakdown: [],
    installments: [{ no: 1, period: '', dueDate: '', amount: 0 }]
  });

  const addInstallmentRow = () => {
    const current = newDebtor.installments || [];
    setNewDebtor({
      ...newDebtor,
      installments: [
        ...current,
        { no: current.length + 1, period: '', dueDate: '', amount: 0 }
      ]
    });
  };

  const removeInstallmentRow = (index: number) => {
    const current = [...(newDebtor.installments || [])];
    current.splice(index, 1);
    // Re-number
    const renumbered = current.map((inst, i) => ({ ...inst, no: i + 1 }));
    setNewDebtor({ ...newDebtor, installments: renumbered });
  };

  const updateInstallmentRow = (index: number, field: keyof Installment, value: any) => {
    const current = [...(newDebtor.installments || [])];
    current[index] = { ...current[index], [field]: value };
    setNewDebtor({ ...newDebtor, installments: current });
  };
  
  const envCheck = {
    supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    supabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  const selectedReview = agreements.find(a => a.id === selectedReviewId);

  const handleSignatureUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onStaffUpdate({ officialSignature: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleApprove = async () => {
    if (!adminName) return alert("Please enter your name for authorization.");
    if (!staffConfig.officialSignature) return alert("Please upload an official signature in Staff Setup first.");
    
    setIsApproving(true);
    const steps = [
      'Authenticating Credentials...',
      'Applying Digital Signature...',
      'Generating Execution Certificate...',
      'Finalizing Approval...'
    ];

    for (const s of steps) {
      setApprovalStatus(s);
      await new Promise(r => setTimeout(r, 800));
    }

    if (!selectedReview) return;
    onAction(selectedReview.id, 'approve', { signature: staffConfig.officialSignature, name: adminName });
    setIsApproving(false);
    setAdminName('');
  };

  const handleReject = () => {
    if (!rejectionReason) return alert("Please provide a reason.");
    if (selectedReview) {
      onAction(selectedReview.id, 'reject', { signature: '', name: 'KDB Admin', reason: rejectionReason });
    }
    setIsRejecting(false);
    setRejectionReason('');
  };

  const handleAddDebtor = () => {
    if (!newDebtor.dboName || !newDebtor.permitNo || !newDebtor.totalArrears) {
      return alert("Please fill in all required fields.");
    }

    const finalInstallments = newDebtor.installments || [];
    const totalFromInst = finalInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
    const totalArrears = totalFromInst || newDebtor.totalArrears || 0;
    
    const arrearsPeriod = finalInstallments.map(i => i.period).filter(Boolean).join(', ') || 'Current';

    if (editingDebtorId) {
      const updatedDebtors = debtors.map(d => d.id === editingDebtorId ? {
        ...(newDebtor as DebtorRecord),
        id: editingDebtorId,
        totalArrears,
        totalArrearsWords: numberToWords(totalArrears),
        installments: finalInstallments,
        arrearsPeriod
      } : d);
      onDebtorUpdate(updatedDebtors);
    } else {
      const id = `D${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`;
      const debtor: DebtorRecord = {
        ...(newDebtor as DebtorRecord),
        id,
        totalArrears,
        arrearsBreakdown: finalInstallments.map((inst, i) => ({ id: String(i), month: inst.period, amount: inst.amount })),
        totalArrearsWords: numberToWords(totalArrears),
        arrearsPeriod,
        installments: finalInstallments
      };
      onDebtorUpdate([...debtors, debtor]);
    }

    setIsAddingDebtor(false);
    setEditingDebtorId(null);
    setNewDebtor({
      dboName: '',
      premiseName: '',
      permitNo: '',
      county: '',
      location: '',
      totalArrears: 0,
      tel: '',
      debitNoteNo: '',
      arrearsBreakdown: [],
      installments: [{ no: 1, period: '', dueDate: '', amount: 0 }]
    });
  };

  const handleEditDebtor = (debtor: DebtorRecord) => {
    setEditingDebtorId(debtor.id);
    setNewDebtor(debtor);
    setIsAddingDebtor(true);
  };

  const handleDownloadPDF = async () => {
    if (!selectedReview) return;
    await downloadAgreementPDF(selectedReview, 'formal-agreement-hidden');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Hidden PDF Generation Container - Moved off-screen but kept in layout for html2canvas */}
      <div style={{ position: 'fixed', top: 0, left: '-9999px', width: '1200px', zIndex: -1000 }}>
        {selectedReview && (
          <PDFPreview agreement={selectedReview} onClose={() => {}} isHidden />
        )}
      </div>

      {showPreview && selectedReview && (
        <PDFPreview agreement={selectedReview} onClose={() => setShowPreview(false)} />
      )}

      {isAddingDebtor && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-2xl w-full space-y-6 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingDebtorId ? 'Edit Ledger Entry' : 'Add New Ledger Entry'}</h3>
              <button onClick={() => { setIsAddingDebtor(false); setEditingDebtorId(null); }} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">DBO Name</label>
                <input value={newDebtor.dboName} onChange={e => setNewDebtor({...newDebtor, dboName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="e.g. Sunrise Dairy" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Premise Name</label>
                <input value={newDebtor.premiseName} onChange={e => setNewDebtor({...newDebtor, premiseName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="e.g. Sunrise Depot" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Permit No</label>
                <input value={newDebtor.permitNo} onChange={e => setNewDebtor({...newDebtor, permitNo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="KDB/MB/..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">County</label>
                <input value={newDebtor.county} onChange={e => setNewDebtor({...newDebtor, county: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="e.g. Kericho" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Location</label>
                <input value={newDebtor.location} onChange={e => setNewDebtor({...newDebtor, location: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="e.g. Thika Rd" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Total Arrears Amount</label>
                <input type="number" value={newDebtor.totalArrears} onChange={e => setNewDebtor({...newDebtor, totalArrears: Number(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone No (Secret)</label>
                <input value={newDebtor.tel} onChange={e => setNewDebtor({...newDebtor, tel: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="07..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Debit Note No (Alt Secret)</label>
                <input value={newDebtor.debitNoteNo} onChange={e => setNewDebtor({...newDebtor, debitNoteNo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" placeholder="DN/..." />
              </div>
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase">Installment Configuration</h4>
                  <button onClick={addInstallmentRow} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Add Installment
                  </button>
                </div>
                <div className="space-y-3">
                  {newDebtor.installments?.map((inst, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="md:col-span-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">No.</label>
                        <div className="text-xs font-bold text-slate-600 px-2">{inst.no}</div>
                      </div>
                      <div className="md:col-span-6">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">CSL Period (e.g. Jan 2024)</label>
                        <input value={inst.period} onChange={e => updateInstallmentRow(idx, 'period', e.target.value)} className="w-full px-3 py-2 bg-white border rounded-lg font-bold text-xs" placeholder="Jan 2024" />
                      </div>
                      <div className="md:col-span-4">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Amount (KES)</label>
                        <input type="number" value={inst.amount} onChange={e => updateInstallmentRow(idx, 'amount', Number(e.target.value))} className="w-full px-3 py-2 bg-white border rounded-lg font-bold text-xs" placeholder="0.00" />
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <button onClick={() => removeInstallmentRow(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleAddDebtor} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs">
              {editingDebtorId ? 'Update Ledger Entry' : 'Save to Ledger'}
            </button>
          </div>
        </div>
      )}

      {isApproving && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-8">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl text-center max-w-sm w-full space-y-6 animate-in zoom-in-95">
            <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mx-auto" />
            <div>
              <h3 className="text-xl font-bold text-slate-800">Review in Progress</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">{approvalStatus}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">KDB Admin Workspace</h2>
            {onRefresh && (
              <button 
                onClick={onRefresh}
                disabled={isSyncing}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-emerald-600 group"
                title="Refresh Data"
              >
                <Loader2 className={`w-5 h-5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            )}
          </div>
          <p className="text-slate-500 font-medium mt-1">Operational control for Kericho & Region levy compliance.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          <button onClick={() => navigate('/')} className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center text-emerald-600 hover:bg-emerald-50 mr-2 border border-emerald-100">
            <Globe className="w-4 h-4 mr-2" /> Client Portal
          </button>
          <button onClick={() => setTab('reviews')} className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center ${tab === 'reviews' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            <FileCheck className="w-4 h-4 mr-2" /> Reviews
          </button>
          <button onClick={() => setTab('debtors')} className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center ${tab === 'debtors' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Database className="w-4 h-4 mr-2" /> Ledger
          </button>
          <button onClick={() => setTab('settings')} className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center ${tab === 'settings' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Settings className="w-4 h-4 mr-2" /> Settings
          </button>
        </div>
      </div>

      {tab === 'reviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.3em]">Submissions Inbox</h3>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black">{agreements.length} Total</span>
            </div>
            {agreements.length === 0 ? (
              <div className="bg-white p-12 rounded-[32px] border-2 border-dashed border-slate-200 text-center text-slate-400 text-sm font-medium">No documents awaiting review</div>
            ) : (
              agreements.map(a => (
                <div key={a.id} className="relative group">
                  <button onClick={() => { setSelectedReviewId(a.id); setIsRejecting(false); }} className={`w-full p-6 rounded-[32px] border text-left transition-all ${selectedReviewId === a.id ? 'border-emerald-600 bg-emerald-50/50 shadow-xl' : 'border-white bg-white hover:border-emerald-200 shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-slate-800 block truncate leading-tight">{a.dboName}</span>
                      <div className={`w-2 h-2 rounded-full ${a.status === 'submitted' ? 'bg-amber-400' : a.status === 'resubmission_requested' ? 'bg-purple-500 animate-pulse' : a.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    </div>
                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {a.county}</span>
                      <span>•</span>
                      <span className={a.status === 'resubmission_requested' ? 'text-purple-600 font-black' : ''}>
                        {a.status === 'resubmission_requested' ? 'Resubmission Request' : new Date(a.date).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteAgreement?.(a.id); }}
                    className="absolute top-4 right-4 p-2 bg-white text-rose-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 border border-rose-100 z-10"
                    title="Delete Submission"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-8">
            {selectedReview ? (
              <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                <div className="p-10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{selectedReview.dboName}</h3>
                    <div className="flex items-center space-x-3 mt-1 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <span>Permit: {selectedReview.permitNo}</span>
                        <span>|</span>
                        <span>{selectedReview.county} County</span>
                    </div>
                  </div>
                  <button onClick={() => setShowPreview(true)} className="flex items-center text-slate-600 font-black bg-slate-50 px-5 py-3 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-100">
                    <FileSearch className="w-4 h-4 mr-2" /> View Document
                  </button>
                </div>

                <div className="p-10 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Briefcase className="w-3 h-3 mr-2" /> Profile Highlights</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-xs text-slate-400 font-medium">Contact Email</span><span className="text-xs font-bold text-slate-700">{selectedReview.clientEmail}</span></div>
                        <div className="flex justify-between items-center"><span className="text-xs text-slate-400 font-medium">Phone Number</span><span className="text-xs font-bold text-slate-700">{selectedReview.tel}</span></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><FileText className="w-3 h-3 mr-2" /> Arrears Summary</h4>
                      <div className="p-6 bg-slate-900 rounded-[32px] text-white shadow-lg">
                        <div className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mb-1">Total Obligation</div>
                        <div className="text-3xl font-black">KES {selectedReview.totalArrears.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Calendar className="w-3 h-3 mr-2" /> Agreed Payment Schedule</h4>
                      <div className="border rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-slate-50 font-black text-slate-400 uppercase text-[9px] tracking-widest">
                            <tr>
                              <th className="px-6 py-4">Inst.</th>
                              <th className="px-6 py-4">Period</th>
                              <th className="px-6 py-4">Due Date</th>
                              <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {selectedReview.installments.map((inst, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold">{inst.no}</td>
                                <td className="px-6 py-4 text-slate-500">{inst.period}</td>
                                <td className="px-6 py-4 font-black text-slate-700">{inst.dueDate || 'TBD'}</td>
                                <td className="px-6 py-4 text-right font-black text-emerald-600">KES {inst.amount.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                  </div>

                  <div className="space-y-5">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Progress</h4>
                    <div className="flex items-center space-x-4">
                        <div className={`flex-1 h-2 rounded-full ${selectedReview.status !== 'draft' ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                        <div className={`flex-1 h-2 rounded-full ${selectedReview.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                        <div className={`flex-1 h-2 rounded-full ${selectedReview.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                    </div>
                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Submitted</span>
                        <span>Review</span>
                        <span>Dispatched</span>
                    </div>
                  </div>

                  <div className="pt-10 border-t flex flex-col md:flex-row md:items-end justify-between gap-10">
                    <div className="space-y-5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DBO Signatory</h4>
                      <div className="flex items-center space-x-5 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                        <img src={selectedReview.clientSignature} className="h-20 w-32 object-contain bg-white rounded-2xl shadow-sm border border-slate-100 p-2" />
                        <div>
                          <div className="text-sm font-black text-slate-800">{selectedReview.clientName}</div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedReview.clientTitle}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-grow max-w-sm w-full">
                      {selectedReview.status === 'submitted' ? (
                        <div className="space-y-4 bg-emerald-50 p-8 rounded-[40px] border border-emerald-100 shadow-xl">
                          <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Countersign Agreement</h4>
                          <input placeholder="Enter Authorized Name *" className="w-full px-6 py-4 border rounded-2xl text-xs bg-white font-bold outline-none shadow-sm" value={adminName} onChange={e => setAdminName(e.target.value)} />
                          <div className="flex gap-3">
                            <button onClick={() => setIsRejecting(true)} className="flex-1 py-4 text-rose-600 font-bold text-[10px] uppercase tracking-widest bg-white border border-rose-100 rounded-2xl hover:bg-rose-50 transition-all">Reject</button>
                            <button onClick={handleApprove} className="flex-2 py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:bg-emerald-700 transition-all">Sign & Approve</button>
                          </div>
                        </div>
                      ) : selectedReview.status === 'resubmission_requested' ? (
                        <div className="space-y-6 bg-purple-50 p-8 rounded-[40px] border border-purple-100 shadow-xl">
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black text-purple-700 uppercase tracking-widest">Resubmission Request</h4>
                            <div className="p-4 bg-white rounded-2xl border border-purple-100 text-xs text-slate-600 italic leading-relaxed">
                              "{selectedReview.resubmissionReason}"
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => onAction(selectedReview.id, 'reject', { signature: '', name: 'KDB Admin', reason: 'Your request for re-submission has been declined.' })} 
                              className="flex-1 py-4 text-rose-600 font-bold text-[10px] uppercase tracking-widest bg-white border border-rose-100 rounded-2xl hover:bg-rose-50 transition-all"
                            >
                              Decline
                            </button>
                            <button 
                              onClick={() => onAction(selectedReview.id, 'reject', { signature: '', name: 'KDB Admin', reason: 'Re-submission request approved. You can now submit a new agreement.' })} 
                              className="flex-2 py-4 bg-purple-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:bg-purple-700 transition-all"
                            >
                              Allow Resubmission
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KDB Execution</h4>
                            <div className="flex items-center space-x-5 bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100">
                              <img src={selectedReview.officialSignature} className="h-20 w-32 object-contain" />
                              <div>
                                <div className="text-sm font-black text-slate-800">{selectedReview.officialName}</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-emerald-600">Authorized & Sent</div>
                              </div>
                            </div>
                          </div>
                          
                          {selectedReview.status === 'approved' && (
                            <button 
                              onClick={handleDownloadPDF}
                              className="w-full py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center"
                            >
                              <Download className="w-4 h-4 mr-2" /> Download Signed PDF
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[600px] text-slate-300 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                <Mail className="w-20 h-20 opacity-10 mb-8" />
                <p className="text-[10px] font-black tracking-[0.5em] uppercase text-center px-10">Inbox Empty. Waiting for operator submissions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'debtors' && (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        placeholder="Search ledger by DBO or Permit..." 
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl outline-none font-medium text-sm"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                  <button onClick={() => setIsAddingDebtor(true)} className="flex-1 sm:flex-none px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center shadow-lg hover:bg-slate-800 transition-all">
                      <UserPlus className="w-4 h-4 mr-2" /> Add Entry
                  </button>
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 font-black text-slate-400 uppercase text-[9px] tracking-widest">
                            <tr>
                                <th className="px-8 py-6">Operator Details</th>
                                <th className="px-8 py-6">Permit No</th>
                                <th className="px-8 py-6 text-right">Balance Due</th>
                                <th className="px-8 py-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {debtors.filter(d => 
                                d.dboName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                d.permitNo.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map(d => (
                                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-800">{d.dboName}</div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-tight">{d.premiseName}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">{d.county}</div>
                                    </td>
                                    <td className="px-8 py-6 font-mono text-xs font-bold text-slate-500">{d.permitNo}</td>
                                    <td className="px-8 py-6 text-right font-black text-emerald-600 text-lg">KES {d.totalArrears.toLocaleString()}</td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                          <button onClick={() => handleEditDebtor(d)} className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><PenTool className="w-4 h-4" /></button>
                                          <button onClick={() => onDebtorUpdate(debtors.filter(item => item.id !== d.id))} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl space-y-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">KDB Execution Setup</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Manage your official digital identity and secrets.</p>
            </div>
            
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                    <div className="w-40 h-28 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner group relative">
                        {staffConfig.officialSignature ? (
                            <>
                                <img src={staffConfig.officialSignature} className="h-full w-full object-contain p-2" />
                                <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                    <X className="text-white cursor-pointer" onClick={() => onStaffUpdate({ officialSignature: '' })} />
                                </div>
                            </>
                        ) : (
                            <Upload className="w-8 h-8 text-slate-200" />
                        )}
                    </div>
                    <div className="flex-grow space-y-4 text-center sm:text-left">
                        <h4 className="font-bold text-slate-800">Authority Signature</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Official KDB Execution Stamp.</p>
                        <input type="file" accept="image/*" onChange={(e) => handleSignatureUpload(e.target.files?.[0] || null)} className="hidden" id="staff-sig-upload" />
                        <label htmlFor="staff-sig-upload" className="inline-flex px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm uppercase tracking-widest transition-all">
                            {staffConfig.officialSignature ? 'Change Image' : 'Add Signature'}
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cloud Configuration</h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${envCheck.supabaseUrl && envCheck.supabaseKey ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                            <div className="flex items-center space-x-3">
                                <Activity className={`w-4 h-4 ${envCheck.supabaseUrl ? 'text-emerald-500' : 'text-rose-500'}`} />
                                <span className={`text-xs font-bold ${envCheck.supabaseUrl ? 'text-emerald-700' : 'text-rose-700'}`}>Supabase DB</span>
                            </div>
                            {envCheck.supabaseUrl && envCheck.supabaseKey ? (
                                <span className="text-[9px] font-black text-emerald-600 bg-white px-2 py-0.5 rounded shadow-sm">CONNECTED</span>
                            ) : (
                                <div className="flex items-center space-x-2">
                                  <AlertCircle className="w-3 h-3 text-rose-500" />
                                  <span className="text-[9px] font-black text-rose-600 bg-white px-2 py-0.5 rounded shadow-sm uppercase tracking-tight">MISSING URL/KEY</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[40px] shadow-2xl space-y-8 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-5"><ShieldCheck className="w-64 h-64" /></div>
            
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500 p-2 rounded-xl"><Server className="w-5 h-5 text-slate-900" /></div>
              <h3 className="text-xl font-black uppercase tracking-widest">Go-Live Help</h3>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center">
                  <Key className="w-4 h-4 mr-2" /> Where is my Supabase URL?
                </h4>
                <div className="text-[11px] text-slate-300 leading-relaxed font-medium space-y-2">
                  <p>1. Log in to <a href="https://supabase.com" target="_blank" className="text-emerald-400 underline">Supabase Dashboard</a></p>
                  <p>2. Go to <strong>Settings (⚙️)</strong> &gt; <strong>API</strong></p>
                  <p>3. Copy <strong>Project URL</strong> (This is <code>SUPABASE_URL</code>)</p>
                  <p>4. Copy <strong>anon public</strong> key (This is <code>SUPABASE_ANON_KEY</code>)</p>
                </div>
                <a 
                  href="https://supabase.com/dashboard/project/_/settings/api" 
                  target="_blank" 
                  className="flex items-center justify-center w-full py-2 bg-emerald-500 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all"
                >
                  Open Supabase API Settings <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </div>

              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3">
                 <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest">How to Apply Keys</h4>
                 <p className="text-[10px] text-slate-400">Add them to your Vercel/Netlify Environment Variables section using these keys:</p>
                 <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                   <div className="bg-white/10 p-2 rounded">SUPABASE_URL</div>
                   <div className="bg-white/10 p-2 rounded">SUPABASE_ANON_KEY</div>
                 </div>
              </div>
            </div>

            <div className="bg-emerald-600/10 p-6 rounded-[32px] border border-emerald-500/20">
                <div className="flex items-center space-x-2 mb-2">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">System Security Note</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                    Keys are loaded securely from your environment. Never paste them directly into files you commit to public GitHub repositories.
                </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
