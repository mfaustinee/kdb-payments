
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgreementData, DebtorRecord, ArrearItem, Installment, StaffConfig, ClosureNotificationData, ComplaintData, InquiryData } from '../types';
import { Eye, Plus, Trash2, Database, FileCheck, UserPlus, MapPin, ShieldCheck, AlertTriangle, Send, Settings, Upload, CheckCircle2, Briefcase, FileText, FileSearch, Mail, Calendar, Check, Loader2, Search, X, Download, Server, Cpu, Globe, Key, Lock, AlertCircle, ExternalLink, PenTool, Trash, Activity, Building, TrendingUp } from 'lucide-react';
import { PDFPreview } from './PDFPreview';
import { ClosurePDFPreview } from './ClosurePDFPreview';
import { ComplaintPDFPreview } from './ComplaintPDFPreview';
import { InquiryPDFPreview } from './InquiryPDFPreview';
import { downloadAgreementPDF, downloadClosurePDF, downloadComplaintPDF, downloadInquiryPDF } from '../services/pdf';
import { numberToWords } from '../utils/numberToWords';
import { LicensedClientsModule } from './LicensedClientsModule';
import { ClientReturnsModule } from './ClientReturnsModule';
import { ReportsModule } from './ReportsModule';
import { DataValidationModule } from './DataValidationModule';

interface AdminDashboardProps {
  agreements: AgreementData[];
  closures: ClosureNotificationData[];
  complaints?: ComplaintData[];
  inquiries?: InquiryData[];
  debtors: DebtorRecord[];
  staffConfig: StaffConfig;
  isSyncing?: boolean;
  onRefresh?: () => void;
  onAction: (id: string, action: 'approve' | 'reject', adminData?: { signature: string; name: string; reason?: string }) => void;
  onDeleteAgreement?: (id: string) => void;
  onClosureAction: (id: string, action: 'approve' | 'reject', adminData?: { signature: string; name: string; reason?: string; title?: string; comments?: string }) => void;
  onDeleteClosure?: (id: string) => void;
  onComplaintAction?: (id: string, updates: Partial<ComplaintData>) => void;
  onDeleteComplaint?: (id: string) => void;
  onInquiryAction?: (id: string, updates: Partial<InquiryData>) => void;
  onDeleteInquiry?: (id: string) => void;
  onDebtorUpdate: (updated: DebtorRecord[]) => void;
  onStaffUpdate: (config: StaffConfig) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  agreements = [], 
  closures = [], 
  complaints = [],
  inquiries = [],
  debtors, 
  staffConfig, 
  isSyncing, 
  onRefresh, 
  onAction, 
  onDeleteAgreement, 
  onClosureAction,
  onDeleteClosure,
  onComplaintAction,
  onDeleteComplaint,
  onInquiryAction,
  onDeleteInquiry,
  onDebtorUpdate, 
  onStaffUpdate 
}) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'requests_to_approve' | 'clients' | 'returns' | 'reports' | 'data_validation' | 'settings'>('requests_to_approve');
  const [approvalSubTab, setApprovalSubTab] = useState<'agreements' | 'cessations' | 'complaints' | 'inquiries'>('agreements');
  const changeTab = (newTab: typeof tab) => {
    setTab(newTab);
    onRefresh?.();
  };
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [selectedClosureId, setSelectedClosureId] = useState<string | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);

  const [isRejecting, setIsRejecting] = useState(false);
  const [isRejectingClosure, setIsRejectingClosure] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApprovingClosure, setIsApprovingClosure] = useState(false);
  
  const [isProcessingComplaint, setIsProcessingComplaint] = useState(false);
  const [complaintProcessingStatus, setComplaintProcessingStatus] = useState('');
  const [isProcessingInquiry, setIsProcessingInquiry] = useState(false);
  const [inquiryProcessingStatus, setInquiryProcessingStatus] = useState('');

  const [approvalStatus, setApprovalStatus] = useState('');
  const [closureApprovalStatus, setClosureApprovalStatus] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showClosurePreview, setShowClosurePreview] = useState(false);
  const [showComplaintPreview, setShowComplaintPreview] = useState(false);
  const [showInquiryPreview, setShowInquiryPreview] = useState(false);

  const [rejectionReason, setRejectionReason] = useState('');
  const [closureRejectionReason, setClosureRejectionReason] = useState('');
  const [adminName, setAdminName] = useState('');
  const [closureOfficerTitle, setClosureOfficerTitle] = useState('');
  const [closureOfficerComments, setClosureOfficerComments] = useState('');

  // Complaint "Official Use Only" States
  const [complaintCategoryCode, setComplaintCategoryCode] = useState('');
  const [complaintAssignedTo, setComplaintAssignedTo] = useState('');
  const [complaintStatus, setComplaintStatus] = useState<'submitted' | 'investigating' | 'resolved' | 'closed' | 'rejected'>('submitted');
  const [investigationFindings, setInvestigationFindings] = useState('');
  const [complaintActionTaken, setComplaintActionTaken] = useState('');

  // Inquiry "Official Use Only" States
  const [inquiryReferredTo, setInquiryReferredTo] = useState('');
  const [inquiryStatus, setInquiryStatus] = useState<'submitted' | 'referred' | 'resolved' | 'closed'>('submitted');
  const [inquiryResponseDetails, setInquiryResponseDetails] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingDebtor, setIsAddingDebtor] = useState(false);
  const [editingDebtorId, setEditingDebtorId] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>({
    status: 'checking',
    writable: false,
    backendSupabase: false,
    clientSupabase: false,
    count: 0,
    error: null
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const checkHealth = async () => {
    setIsTestingConnection(true);
    try {
      console.log("[HealthCheck] Starting health checks...");
      // 1. Check Backend Health
      const healthRes = await fetch('/api/health');
      const healthResClone = healthRes.clone();
      const healthText = await healthRes.text();
      
      console.log(`[HealthCheck] /api/health response status: ${healthRes.status}`);
      
      if (!healthRes.ok) {
        throw new Error(`Backend health check failed (${healthRes.status}): ${healthText.substring(0, 100)}`);
      }
      
      let healthData;
      try {
        healthData = JSON.parse(healthText);
        console.log("[HealthCheck] /api/health data:", healthData);
      } catch (jsonErr) {
        console.error("[HealthCheck] /api/health JSON parse error:", jsonErr);
        const isHtml = healthText.trim().startsWith('<!DOCTYPE html>') || healthText.trim().startsWith('<html');
        throw new Error(`Invalid response from /api/health. Expected JSON, but received ${isHtml ? 'HTML (likely a 404 fallback)' : 'invalid text'}. Content: ${healthText.substring(0, 100)}...`);
      }
      
      // 2. Check Supabase via DBService
      const { DBService } = await import('../services/db.ts');
      const config = await DBService.fetchConfig();
      console.log("[HealthCheck] Supabase config from server:", config);
      
      // Check both sources for configuration
      const hasBuildUrl = !!import.meta.env.VITE_SUPABASE_URL;
      const hasBuildKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      const hasServerUrl = !!(config && config.VITE_SUPABASE_URL);
      const hasServerKey = !!(config && config.VITE_SUPABASE_ANON_KEY);
      
      const isConfigured = (hasBuildUrl && hasBuildKey) || (hasServerUrl && hasServerKey);
      
      console.log("[HealthCheck] Configuration status:", {
        buildTime: { url: hasBuildUrl, key: hasBuildKey },
        serverTime: { url: hasServerUrl, key: hasServerKey },
        final: isConfigured
      });

      let tableStatus = { agreements: false, debtors: false, staff: false };
      let agreementsCount = 0;

      if (isConfigured) {
        try {
          const agreements = await DBService.getAgreements();
          agreementsCount = agreements.length;
          tableStatus.agreements = true;
          console.log(`[HealthCheck] Agreements table accessible. Count: ${agreementsCount}`);
        } catch (e) {
          console.error("[HealthCheck] Agreements table check failed:", e);
        }

        try {
          await DBService.getDebtors();
          tableStatus.debtors = true;
          console.log("[HealthCheck] Debtors table accessible");
        } catch (e) {
          console.error("[HealthCheck] Debtors table check failed:", e);
        }

        try {
          await DBService.getStaffConfig();
          tableStatus.staff = true;
          console.log("[HealthCheck] Staff table accessible");
        } catch (e) {
          console.error("[HealthCheck] Staff table check failed:", e);
        }
      }
      
      setSystemHealth({ 
        status: healthData.status || 'ok', 
        writable: healthData.writable, 
        backendSupabase: healthData.supabaseConfigured,
        clientSupabase: isConfigured,
        tables: tableStatus,
        count: agreementsCount,
        error: isConfigured ? null : "Missing Configuration: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set in environment"
      });
    } catch (e: any) {
      console.error("[HealthCheck] Error:", e);
      setSystemHealth({ 
        status: 'error', 
        message: e.message,
        details: e.details || e.hint || ''
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  useEffect(() => {
    if (tab === 'settings') {
      checkHealth();
    }
  }, [tab]);

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
  
  const selectedReview = agreements.find(a => a.id === selectedReviewId);
  const selectedClosure = closures.find(c => c.id === selectedClosureId);
  const selectedComplaint = complaints.find(co => co.id === selectedComplaintId);
  const selectedInquiry = inquiries.find(inq => inq.id === selectedInquiryId);

  useEffect(() => {
    if (selectedComplaint) {
      setComplaintCategoryCode(selectedComplaint.complaintCategoryCode || '');
      setComplaintAssignedTo(selectedComplaint.assignedTo || '');
      setComplaintStatus((selectedComplaint.status as any) || 'submitted');
      setInvestigationFindings(selectedComplaint.investigationFindings || '');
      setComplaintActionTaken(selectedComplaint.actionTaken || '');
    }
  }, [selectedComplaintId, selectedComplaint]);

  useEffect(() => {
    if (selectedInquiry) {
      setInquiryReferredTo(selectedInquiry.referredTo || '');
      setInquiryStatus((selectedInquiry.status as any) || 'submitted');
      setInquiryResponseDetails(selectedInquiry.responseDetails || '');
    }
  }, [selectedInquiryId, selectedInquiry]);

  const handleProcessComplaint = async () => {
    if (!selectedComplaint) return;
    if (!adminName) return alert("Please enter your name for authorization.");
    if (!staffConfig.officialSignature) return alert("Please upload an official signature in Staff Setup first.");

    setIsProcessingComplaint(true);
    const steps = [
      'Registering complaint review...',
      'Assigning investigator...',
      'Validating county location...',
      'Publishing official findings...'
    ];

    for (const s of steps) {
      setComplaintProcessingStatus(s);
      await new Promise(r => setTimeout(r, 600));
    }

    if (onComplaintAction) {
      const updates: Partial<ComplaintData> = {
        complaintCategoryCode,
        assignedTo: complaintAssignedTo,
        status: complaintStatus,
        investigationFindings,
        actionTaken: complaintActionTaken,
        officialSignature: staffConfig.officialSignature,
        officialName: adminName,
        dateClosed: ['resolved', 'closed', 'rejected'].includes(complaintStatus) 
          ? new Date().toISOString().split('T')[0] 
          : undefined,
        dateReceived: selectedComplaint.dateReceived || new Date(selectedComplaint.submittedAt || '').toISOString().split('T')[0],
        receivedBy: selectedComplaint.receivedBy || adminName
      };
      await onComplaintAction(selectedComplaint.id, updates);
    }
    setIsProcessingComplaint(false);
  };

  const handleProcessInquiry = async () => {
    if (!selectedInquiry) return;
    if (!adminName) return alert("Please enter your name for authorization.");
    if (!staffConfig.officialSignature) return alert("Please upload an official signature in Staff Setup first.");

    setIsProcessingInquiry(true);
    const steps = [
      'Retrieving inquiry record...',
      'Routing inquiry to department...',
      'Composing official response...',
      'Filing response dossier...'
    ];

    for (const s of steps) {
      setInquiryProcessingStatus(s);
      await new Promise(r => setTimeout(r, 600));
    }

    if (onInquiryAction) {
      const updates: Partial<InquiryData> = {
        referredTo: inquiryReferredTo,
        status: inquiryStatus,
        responseDetails: inquiryResponseDetails,
        officialSignature: staffConfig.officialSignature,
        officialName: adminName,
        dateReplied: ['resolved', 'closed'].includes(inquiryStatus) 
          ? new Date().toISOString().split('T')[0] 
          : undefined,
        actionDate: new Date().toISOString().split('T')[0],
        dateReceived: selectedInquiry.dateReceived || new Date(selectedInquiry.submittedAt || '').toISOString().split('T')[0]
      };
      await onInquiryAction(selectedInquiry.id, updates);
    }
    setIsProcessingInquiry(false);
  };

  const handleApproveClosure = async () => {
    if (!adminName) return alert("Please enter your name for authorization.");
    if (!closureOfficerTitle) return alert("Please enter your official title for authorization.");
    if (!staffConfig.officialSignature) return alert("Please upload an official signature in Staff Setup first.");
    
    setIsApprovingClosure(true);
    const steps = [
      'Authenticating Credentials...',
      'Verifying Premise Dossier...',
      'Signing Decommissioning Notice...',
      'Finalizing Cessation...'
    ];

    for (const s of steps) {
      setClosureApprovalStatus(s);
      await new Promise(r => setTimeout(r, 800));
    }

    if (!selectedClosure) return;
    onClosureAction(selectedClosure.id, 'approve', { 
      signature: staffConfig.officialSignature, 
      name: adminName,
      title: closureOfficerTitle,
      comments: closureOfficerComments
    });
    setIsApprovingClosure(false);
    setAdminName('');
    setClosureOfficerTitle('');
    setClosureOfficerComments('');
  };

  const handleRejectClosure = () => {
    if (!closureRejectionReason) return alert("Please provide a reason for rejection.");
    if (selectedClosure) {
      onClosureAction(selectedClosure.id, 'reject', { signature: '', name: 'KDB Admin', reason: closureRejectionReason });
    }
    setIsRejectingClosure(false);
    setClosureRejectionReason('');
  };

  const exportLedgerCSV = () => {
    if (debtors.length === 0) {
      alert("No debtors in the ledger to export.");
      return;
    }
    const headers = [
      'DBO Name',
      'Premise Name',
      'Permit No',
      'Location',
      'County',
      'Arrears Periods',
      'Outstanding Balance (KES)',
      'Debit Note No',
      'Telephone'
    ];
    const rows = debtors.map(d => [
      d.dboName,
      d.premiseName,
      d.permitNo,
      d.location,
      d.county,
      d.arrearsPeriod,
      d.totalArrears,
      d.debitNoteNo,
      d.tel
    ]);
    const csvRows = [headers.join(',')];
    rows.forEach(row => {
      const formatted = row.map(val => {
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(formatted.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kdb_debtors_ledger_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      'Generating Execution PDF...',
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

  const [isSavingDebtor, setIsSavingDebtor] = useState(false);

  const handleAddDebtor = async () => {
    if (!newDebtor.dboName || !newDebtor.permitNo || !newDebtor.totalArrears) {
      return alert("Please fill in all required fields.");
    }

    setIsSavingDebtor(true);
    try {
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
        await onDebtorUpdate(updatedDebtors);
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
        await onDebtorUpdate([...debtors, debtor]);
      }

    } catch (error: any) {
      console.error("Error in handleAddDebtor:", error);
      alert("Failed to save entry: " + error.message);
    } finally {
      setIsSavingDebtor(false);
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
    }
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
      <div style={{ position: 'fixed', top: 0, left: '-9999px', width: '1024px', zIndex: -1000, overflow: 'hidden' }}>
        {selectedReview && (
          <PDFPreview agreement={selectedReview} onClose={() => {}} isHidden />
        )}
        {selectedClosure && (
          <ClosurePDFPreview closure={selectedClosure} onClose={() => {}} isHidden />
        )}
      </div>

      {showPreview && selectedReview && (
        <PDFPreview agreement={selectedReview} onClose={() => setShowPreview(false)} />
      )}

      {showClosurePreview && selectedClosure && (
        <ClosurePDFPreview closure={selectedClosure} onClose={() => setShowClosurePreview(false)} />
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Dairy Business Operator (DBO) Name</label>
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
            <button 
              disabled={isSavingDebtor}
              onClick={handleAddDebtor} 
              className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs flex items-center justify-center disabled:opacity-50"
            >
              {isSavingDebtor ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingDebtorId ? 'Update Ledger Entry' : 'Save to Ledger'
              )}
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

      {isApprovingClosure && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-8">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl text-center max-w-sm w-full space-y-6 animate-in zoom-in-95">
            <Loader2 className="w-16 h-16 text-red-600 animate-spin mx-auto" />
            <div>
              <h3 className="text-xl font-bold text-slate-800">Cessation Processing</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">{closureApprovalStatus}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* LEFT SIDEBAR */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6 lg:sticky lg:top-24 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm print:hidden">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Admin Workspace</h2>
              <div className="flex items-center space-x-2">
                {onRefresh && (
                  <button 
                    onClick={onRefresh}
                    disabled={isSyncing}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-emerald-600 group"
                    title="Refresh Data"
                  >
                    <Loader2 className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-slate-500 font-medium text-xs mt-2">Operational control for Kericho & Region levy compliance.</p>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={() => changeTab('data_validation')} className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center w-full text-left ${tab === 'data_validation' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              <FileCheck className="w-4 h-4 mr-3 shrink-0" /> Data Validation Form
            </button>
            <button onClick={() => navigate('/')} className="px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center text-emerald-600 hover:bg-emerald-50 border border-emerald-100 w-full text-left">
              <Globe className="w-4 h-4 mr-3 shrink-0" /> Client Portal
            </button>
            <div className="h-px bg-slate-100 my-1"></div>
            <button onClick={() => changeTab('requests_to_approve')} className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center w-full text-left ${tab === 'requests_to_approve' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              <FileCheck className="w-4 h-4 mr-3 shrink-0" /> Requests to Approve
              {(agreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length + closures.filter(c => c.status === 'submitted').length + (complaints?.filter(co => co.status === 'submitted').length || 0) + (inquiries?.filter(inq => inq.status === 'submitted').length || 0)) > 0 && (
                <span className="ml-auto px-1.5 py-0.5 text-[9px] bg-rose-500 text-white rounded-full font-black animate-pulse">
                  {agreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length + closures.filter(c => c.status === 'submitted').length + (complaints?.filter(co => co.status === 'submitted').length || 0) + (inquiries?.filter(inq => inq.status === 'submitted').length || 0)}
                </span>
              )}
            </button>
            <button onClick={() => changeTab('clients')} className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center w-full text-left ${tab === 'clients' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Building className="w-4 h-4 mr-3 shrink-0" /> Clients
            </button>
            <button onClick={() => changeTab('returns')} className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center w-full text-left ${tab === 'returns' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              <FileText className="w-4 h-4 mr-3 shrink-0" /> Returns
            </button>
            <button onClick={() => changeTab('reports')} className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center w-full text-left ${tab === 'reports' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              <TrendingUp className="w-4 h-4 mr-3 shrink-0" /> Reports
            </button>
            <button onClick={() => changeTab('settings')} className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center w-full text-left ${tab === 'settings' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Settings className="w-4 h-4 mr-3 shrink-0" /> Settings
            </button>
          </div>
        </aside>

        {/* RIGHT CONTENT AREA */}
        <div className="flex-1 min-w-0 w-full">

      {tab === 'requests_to_approve' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex bg-slate-100 p-1 rounded-2xl max-w-4xl border border-slate-200 overflow-x-auto">
            <button 
              onClick={() => { setApprovalSubTab('agreements'); }}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 whitespace-nowrap ${approvalSubTab === 'agreements' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <FileCheck className="w-4 h-4" /> Submitted Debt Agreements
              {agreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length > 0 && (
                <span className="px-1.5 py-0.5 text-[8px] bg-rose-500 text-white rounded-full font-black">
                  {agreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setApprovalSubTab('cessations'); }}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 whitespace-nowrap ${approvalSubTab === 'cessations' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Briefcase className="w-4 h-4" /> Submitted Cessations
              {closures.filter(c => c.status === 'submitted').length > 0 && (
                <span className="px-1.5 py-0.5 text-[8px] bg-rose-500 text-white rounded-full font-black animate-pulse">
                  {closures.filter(c => c.status === 'submitted').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setApprovalSubTab('complaints'); }}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 whitespace-nowrap ${approvalSubTab === 'complaints' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <AlertTriangle className="w-4 h-4" /> Stakeholder Complaints
              {complaints.filter(co => co.status === 'submitted').length > 0 && (
                <span className="px-1.5 py-0.5 text-[8px] bg-rose-500 text-white rounded-full font-black animate-pulse">
                  {complaints.filter(co => co.status === 'submitted').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setApprovalSubTab('inquiries'); }}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all text-center flex items-center justify-center gap-2 whitespace-nowrap ${approvalSubTab === 'inquiries' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Mail className="w-4 h-4" /> Client Inquiries
              {inquiries.filter(inq => inq.status === 'submitted').length > 0 && (
                <span className="px-1.5 py-0.5 text-[8px] bg-rose-500 text-white rounded-full font-black animate-pulse">
                  {inquiries.filter(inq => inq.status === 'submitted').length}
                </span>
              )}
            </button>
          </div>

          {approvalSubTab === 'agreements' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-300">
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
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dairy Business Operator (DBO) Signatory</h4>
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
                          <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                            {isRejecting ? 'Provide Rejection Reason' : 'Countersign Agreement'}
                          </h4>
                          {isRejecting ? (
                            <div className="space-y-3">
                              <textarea 
                                placeholder="Enter reason for rejection or resubmission request..." 
                                className="w-full px-4 py-3 border rounded-2xl text-xs bg-white font-bold outline-none shadow-sm h-24 resize-none"
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                              />
                              <div className="flex gap-3">
                                <button onClick={() => setIsRejecting(false)} className="flex-1 py-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest bg-white border border-slate-200 rounded-2xl">Cancel</button>
                                <button onClick={handleReject} className="flex-1 py-3 bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg hover:bg-rose-700">Submit Reject</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <input placeholder="Enter Authorized Name *" className="w-full px-6 py-4 border rounded-2xl text-xs bg-white font-bold outline-none shadow-sm" value={adminName} onChange={e => setAdminName(e.target.value)} />
                              <div className="flex gap-3">
                                <button onClick={() => setIsRejecting(true)} className="flex-1 py-4 text-rose-600 font-bold text-[10px] uppercase tracking-widest bg-white border border-rose-100 rounded-2xl hover:bg-rose-50 transition-all">Reject</button>
                                <button onClick={handleApprove} className="flex-2 py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:bg-emerald-700 transition-all">Sign & Approve</button>
                              </div>
                            </>
                          )}
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
          ) : approvalSubTab === 'cessations' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-300">
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.3em]">Submitted Cessations</h3>
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[9px] font-black">{closures?.length || 0} Total</span>
            </div>
            {(!closures || closures.length === 0) ? (
              <div className="bg-white p-12 rounded-[32px] border-2 border-dashed border-slate-200 text-center text-slate-400 text-sm font-medium">No business cessation notices</div>
            ) : (
              closures.map(c => (
                <div key={c.id} className="relative group">
                  <button onClick={() => { setSelectedClosureId(c.id); setIsRejectingClosure(false); }} className={`w-full p-6 rounded-[32px] border text-left transition-all ${selectedClosureId === c.id ? 'border-red-600 bg-red-50/50 shadow-xl' : 'border-white bg-white hover:border-red-200 shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-slate-800 block truncate leading-tight w-[70%]">{c.dboName}</span>
                      <div className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${c.status === 'submitted' ? 'bg-amber-100 text-amber-700 animate-pulse' : c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {c.status}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {c.county}</span>
                      <span>•</span>
                      <span>{new Date(c.submittedAt || '').toLocaleDateString()}</span>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteClosure?.(c.id); }}
                    className="absolute top-4 right-4 p-2 bg-white text-rose-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 border border-rose-100 z-10"
                    title="Delete Notice"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-8">
            {selectedClosure ? (
              <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                <div className="p-10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{selectedClosure.dboName}</h3>
                    <div className="flex items-center space-x-3 mt-1 text-slate-400 text-xs font-bold uppercase tracking-widest">
                      <span>Permit: {selectedClosure.permitNo}</span>
                      <span>|</span>
                      <span>{selectedClosure.county} County</span>
                    </div>
                  </div>
                  <button onClick={() => setShowClosurePreview(true)} className="flex items-center text-slate-600 font-black bg-slate-50 px-5 py-3 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-100">
                    <FileSearch className="w-4 h-4 mr-2" /> View Notice PDF
                  </button>
                </div>

                <div className="p-10 space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Briefcase className="w-3 h-3 mr-2" /> Premise Profile</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-xs text-slate-400 font-medium">Premise Name</span><span className="text-xs font-bold text-slate-700">{selectedClosure.premiseName}</span></div>
                        <div className="flex justify-between items-center"><span className="text-xs text-slate-400 font-medium">Business / Permit Type</span><span className="text-xs font-bold text-slate-700">{selectedClosure.permitType}</span></div>
                        <div className="flex justify-between items-center"><span className="text-xs text-slate-400 font-medium">Phone Number</span><span className="text-xs font-bold text-slate-700">{selectedClosure.tel}</span></div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><AlertCircle className="w-3 h-3 mr-2" /> Cessation Specifics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-xs text-slate-400 font-medium">Official Closure Date</span><span className="text-xs font-bold text-slate-700">{selectedClosure.closureDate}</span></div>
                      </div>
                    </div>
                  </div>

                  {selectedClosure.status === 'rejected' && selectedClosure.rejectionReason && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Rejection Details</h4>
                      <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl text-sm text-rose-700 italic font-medium leading-relaxed">
                        &quot;{selectedClosure.rejectionReason}&quot;
                      </div>
                    </div>
                  )}

                  <div className="pt-10 border-t flex flex-col md:flex-row md:items-end justify-between gap-10">
                    <div className="space-y-5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator Signatory</h4>
                      <div className="flex items-center space-x-5 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                        <img src={selectedClosure.clientSignature} className="h-20 w-32 object-contain bg-white rounded-2xl shadow-sm border border-slate-100 p-2" />
                        <div>
                          <div className="text-sm font-black text-slate-800">{selectedClosure.clientName}</div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DBO Applicant</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-grow max-w-sm w-full">
                      {selectedClosure.status === 'submitted' ? (
                        <div className="space-y-4 bg-red-50/60 p-8 rounded-[40px] border border-red-100 shadow-xl">
                          <h4 className="text-[10px] font-black text-red-700 uppercase tracking-widest">
                            {isRejectingClosure ? 'Provide Rejection Reason' : 'Countersign notice'}
                          </h4>
                          {isRejectingClosure ? (
                            <div className="space-y-3">
                              <textarea 
                                placeholder="Enter reason for rejecting this notification..." 
                                className="w-full px-4 py-3 border rounded-2xl text-xs bg-white font-bold outline-none shadow-sm h-24 resize-none"
                                value={closureRejectionReason}
                                onChange={e => setClosureRejectionReason(e.target.value)}
                              />
                              <div className="flex gap-3">
                                <button onClick={() => setIsRejectingClosure(false)} className="flex-1 py-3 text-slate-500 font-bold text-[10px] uppercase tracking-widest bg-white border border-slate-200 rounded-2xl">Cancel</button>
                                <button onClick={handleRejectClosure} className="flex-1 py-3 bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg hover:bg-rose-700">Submit Reject</button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <input 
                                placeholder="Enter Authorized Name *" 
                                className="w-full px-6 py-4 border rounded-2xl text-xs bg-white font-bold outline-none shadow-sm" 
                                value={adminName} 
                                onChange={e => setAdminName(e.target.value)} 
                              />
                              <input 
                                placeholder="Enter Official Title (e.g. Compliance Officer) *" 
                                className="w-full px-6 py-4 border rounded-2xl text-xs bg-white font-bold outline-none shadow-sm" 
                                value={closureOfficerTitle} 
                                onChange={e => setClosureOfficerTitle(e.target.value)} 
                              />
                              <textarea 
                                placeholder="Enter Receipt Comments (Optional)" 
                                className="w-full px-6 py-3 border rounded-2xl text-xs bg-white font-bold outline-none shadow-sm h-20 resize-none" 
                                value={closureOfficerComments} 
                                onChange={e => setClosureOfficerComments(e.target.value)} 
                              />
                              <div className="flex gap-3 pt-2">
                                <button onClick={() => setIsRejectingClosure(true)} className="flex-1 py-4 text-rose-600 font-bold text-[10px] uppercase tracking-widest bg-white border border-rose-100 rounded-2xl hover:bg-rose-50 transition-all">Reject</button>
                                <button onClick={handleApproveClosure} className="flex-2 py-4 bg-red-600 text-white font-black text-[10px] uppercase tracking-[0.1em] rounded-2xl shadow-lg hover:bg-red-700 transition-all">Countersign notice</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {selectedClosure.status === 'approved' && (
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KDB Authorized Execution</h4>
                              <div className="flex items-center space-x-5 bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100">
                                <img src={selectedClosure.officialSignature} className="h-20 w-32 object-contain font-bold" />
                                <div>
                                  <div className="text-sm font-black text-slate-800">{selectedClosure.officialName}</div>
                                  {selectedClosure.officialTitle && (
                                    <div className="text-xs font-bold text-slate-500">{selectedClosure.officialTitle}</div>
                                  )}
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-emerald-600 mt-0.5">Deregistered & Filed</div>
                                </div>
                              </div>
                              {selectedClosure.officialComments && (
                                <div className="p-5 bg-amber-50/70 border border-amber-100 rounded-3xl text-xs text-amber-800 italic leading-relaxed font-bold">
                                  <strong className="not-italic font-black text-[9px] uppercase tracking-wider text-amber-500 block mb-1">Receipt Comments:</strong>
                                  &quot;{selectedClosure.officialComments}&quot;
                                </div>
                              )}
                            </div>
                          )}
                          
                          {selectedClosure.status === 'approved' && (
                            <button 
                              onClick={() => downloadClosurePDF(selectedClosure, 'closure-certificate-hidden')}
                              className="w-full py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center"
                            >
                              <Download className="w-4 h-4 mr-2" /> Download Notification PDF
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
                <Briefcase className="w-20 h-20 opacity-10 mb-8" />
                <p className="text-[10px] font-black tracking-[0.5em] uppercase text-center px-10">Cessation Inbox Empty. Waiting for notifications.</p>
              </div>
            )}
          </div>
        </div>
          ) : approvalSubTab === 'complaints' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-300">
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.3em]">Submitted Complaints</h3>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[9px] font-black">{complaints?.length || 0} Total</span>
                </div>
                {(!complaints || complaints.length === 0) ? (
                  <div className="bg-white p-12 rounded-[32px] border-2 border-dashed border-slate-200 text-center text-slate-400 text-sm font-medium">No stakeholder complaints submitted</div>
                ) : (
                  complaints.map(co => (
                    <div key={co.id} className="relative group">
                      <button 
                        onClick={() => { setSelectedComplaintId(co.id); }} 
                        className={`w-full p-6 rounded-[32px] border text-left transition-all ${selectedComplaintId === co.id ? 'border-red-600 bg-red-50/50 shadow-xl' : 'border-white bg-white hover:border-red-200 shadow-sm'}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-bold text-slate-800 block truncate leading-tight w-[70%]">{co.complainantName}</span>
                          <div className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${
                            co.status === 'submitted' ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                            co.status === 'investigating' ? 'bg-blue-100 text-blue-700' :
                            co.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {co.status}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {co.county}</span>
                          <span>•</span>
                          <span>{new Date(co.submittedAt || '').toLocaleDateString()}</span>
                        </div>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteComplaint?.(co.id); if (selectedComplaintId === co.id) setSelectedComplaintId(null); }}
                        className="absolute top-4 right-4 p-2 bg-white text-rose-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 border border-rose-100 z-10"
                        title="Delete Complaint"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="lg:col-span-8">
                {selectedComplaint ? (
                  <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-right duration-300">
                    {/* Header */}
                    <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">STAKEHOLDER COMPLAINT DOSSIER</span>
                        <h4 className="text-xl font-black mt-1">{selectedComplaint.complainantName}</h4>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-slate-400">
                          <span>Ref: {selectedComplaint.id}</span>
                          <span>•</span>
                          <span>Category: {selectedComplaint.complainantCategory}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${
                          selectedComplaint.status === 'submitted' ? 'bg-amber-500 text-white animate-pulse' :
                          selectedComplaint.status === 'investigating' ? 'bg-blue-500 text-white' :
                          selectedComplaint.status === 'resolved' ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                        }`}>
                          {selectedComplaint.status}
                        </span>
                      </div>
                    </div>

                    {/* Details and Official Form */}
                    <div className="p-8 space-y-8 max-h-[700px] overflow-y-auto">
                      {/* Section 1: Details */}
                      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[24px]">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Complainant Contact</span>
                          <span className="text-sm font-bold text-slate-700 block mt-1">{selectedComplaint.telephone || 'N/A'}</span>
                          <span className="text-xs text-slate-400 block">{selectedComplaint.email || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Location / County</span>
                          <span className="text-sm font-bold text-slate-700 block mt-1">{selectedComplaint.county} County</span>
                          <span className="text-xs text-slate-400 block">{selectedComplaint.postalAddress || 'No postal address'}</span>
                        </div>
                        <div className="col-span-2 border-t pt-4">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Nature of Complaint</span>
                          <span className="text-sm font-black text-slate-800 block mt-1 uppercase">{selectedComplaint.natureOfComplaint}</span>
                        </div>
                        <div className="col-span-2 border-t pt-4">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-mono">Complaint Description & Details</span>
                          <p className="text-sm font-medium text-slate-600 mt-2 whitespace-pre-wrap bg-white p-4 rounded-xl border border-slate-100">{selectedComplaint.complaintDetails}</p>
                        </div>
                      </div>

                      {/* Section 2: Official Form (Editable by Admin) */}
                      <div className="border-t pt-8 space-y-6">
                        <div>
                          <h5 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] mb-1">6. For Official Use Only (Kenya Dairy Board)</h5>
                          <p className="text-xs text-slate-400 font-semibold">Verify facts, classify category, write findings, and sign authorization.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Complaint Category Code</label>
                            <input 
                              type="text"
                              value={complaintCategoryCode}
                              onChange={(e) => setComplaintCategoryCode(e.target.value)}
                              placeholder="e.g. KDB/COMP/001"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-sm font-semibold transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Assigned To Officer/Dept</label>
                            <input 
                              type="text"
                              value={complaintAssignedTo}
                              onChange={(e) => setComplaintAssignedTo(e.target.value)}
                              placeholder="e.g. Inspectorate Department"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-sm font-semibold transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Processing Status</label>
                            <select 
                              value={complaintStatus}
                              onChange={(e) => setComplaintStatus(e.target.value as any)}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-sm font-semibold transition-all"
                            >
                              <option value="submitted">Submitted (Pending Review)</option>
                              <option value="investigating">Under Investigation</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Investigation Findings</label>
                            <textarea 
                              rows={3}
                              value={investigationFindings}
                              onChange={(e) => setInvestigationFindings(e.target.value)}
                              placeholder="Enter details of investigation..."
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-sm font-medium transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Action Taken</label>
                            <textarea 
                              rows={3}
                              value={complaintActionTaken}
                              onChange={(e) => setComplaintActionTaken(e.target.value)}
                              placeholder="Enter actions taken to resolve..."
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-sm font-medium transition-all"
                            />
                          </div>
                        </div>

                        {/* Signature Block */}
                        <div className="p-6 rounded-[24px] bg-slate-50 border border-dashed flex flex-col space-y-4">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">KDB Administrative Sign-off</span>
                          
                          <div className="grid grid-cols-2 gap-6 items-end">
                            <div>
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Officer Full Name</label>
                              <input 
                                type="text"
                                value={adminName}
                                onChange={(e) => setAdminName(e.target.value)}
                                placeholder="Enter your full name"
                                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900 text-sm font-semibold transition-all"
                              />
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 border rounded-xl bg-white min-h-[60px]">
                              {staffConfig.officialSignature ? (
                                <img 
                                  src={staffConfig.officialSignature} 
                                  alt="Officer Signature" 
                                  className="max-h-[50px] object-contain" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">MISSING SIGNATURE</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-4 pt-4 border-t">
                          <button 
                            onClick={handleProcessComplaint}
                            disabled={isProcessingComplaint}
                            className="flex-1 py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center disabled:opacity-50"
                          >
                            {isProcessingComplaint ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {complaintProcessingStatus}
                              </>
                            ) : (
                              'Save & Process Complaint'
                            )}
                          </button>
                          
                          <button 
                            onClick={() => setShowComplaintPreview(true)}
                            className="px-6 py-4 border border-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center"
                          >
                            <Eye className="w-4 h-4 mr-2" /> Preview Form
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Hidden offscreen preview for automated download generation */}
                    <ComplaintPDFPreview complaint={selectedComplaint} isHidden={true} onClose={() => {}} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[600px] text-slate-300 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                    <AlertTriangle className="w-20 h-20 opacity-10 mb-8" />
                    <p className="text-[10px] font-black tracking-[0.5em] uppercase text-center px-10">Select a complaint from the list to review and file official details.</p>
                  </div>
                )}
              </div>

              {/* Popup visual preview modal if requested */}
              {showComplaintPreview && selectedComplaint && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300 p-6 overflow-y-auto">
                  <div className="bg-white rounded-[40px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative">
                    <button 
                      onClick={() => setShowComplaintPreview(false)}
                      className="absolute top-6 right-6 p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="p-8 bg-slate-50 border-b flex justify-between items-center pr-20">
                      <div>
                        <h4 className="text-lg font-black text-slate-900">Official Complaints Document</h4>
                        <p className="text-xs text-slate-400 font-semibold mt-1">This matches the official KDB Stakeholder Complaints PDF format exactly.</p>
                      </div>
                      <button 
                        onClick={async () => {
                          await downloadComplaintPDF(selectedComplaint, `complaint-form-pdf-${selectedComplaint.id}`);
                        }}
                        className="py-3 px-6 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-slate-800 transition-all flex items-center shadow-md"
                      >
                        <Download className="w-4 h-4 mr-2" /> Download PDF Document
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-12 flex justify-center bg-slate-100">
                      <div className="bg-white shadow-lg rounded-2xl border p-2 scale-90 origin-top">
                        <ComplaintPDFPreview complaint={selectedComplaint} onClose={() => setShowComplaintPreview(false)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-300">
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.3em]">Submitted Inquiries</h3>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-black">{inquiries?.length || 0} Total</span>
                </div>
                {(!inquiries || inquiries.length === 0) ? (
                  <div className="bg-white p-12 rounded-[32px] border-2 border-dashed border-slate-200 text-center text-slate-400 text-sm font-medium">No client inquiries submitted</div>
                ) : (
                  inquiries.map(inq => (
                    <div key={inq.id} className="relative group">
                      <button 
                        onClick={() => { setSelectedInquiryId(inq.id); }} 
                        className={`w-full p-6 rounded-[32px] border text-left transition-all ${selectedInquiryId === inq.id ? 'border-sky-600 bg-sky-50/50 shadow-xl' : 'border-white bg-white hover:border-sky-200 shadow-sm'}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-bold text-slate-800 block truncate leading-tight w-[70%]">{inq.clientName}</span>
                          <div className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${
                            inq.status === 'submitted' ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                            inq.status === 'referred' ? 'bg-blue-100 text-blue-700' :
                            inq.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {inq.status}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                          <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {inq.county}</span>
                          <span>•</span>
                          <span>{new Date(inq.submittedAt || '').toLocaleDateString()}</span>
                        </div>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteInquiry?.(inq.id); if (selectedInquiryId === inq.id) setSelectedInquiryId(null); }}
                        className="absolute top-4 right-4 p-2 bg-white text-rose-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 border border-rose-100 z-10"
                        title="Delete Inquiry"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="lg:col-span-8">
                {selectedInquiry ? (
                  <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-right duration-300">
                    {/* Header */}
                    <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">CLIENT INQUIRY DOSSIER</span>
                        <h4 className="text-xl font-black mt-1">{selectedInquiry.clientName}</h4>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-slate-400">
                          <span>Ref: {selectedInquiry.id}</span>
                          <span>•</span>
                          <span>Category: {selectedInquiry.clientCategory}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${
                          selectedInquiry.status === 'submitted' ? 'bg-amber-500 text-white animate-pulse' :
                          selectedInquiry.status === 'referred' ? 'bg-blue-500 text-white' :
                          selectedInquiry.status === 'resolved' ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                        }`}>
                          {selectedInquiry.status}
                        </span>
                      </div>
                    </div>

                    {/* Details and Official Form */}
                    <div className="p-8 space-y-8 max-h-[700px] overflow-y-auto">
                      {/* Section 1: Details */}
                      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[24px]">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Client Contact</span>
                          <span className="text-sm font-bold text-slate-700 block mt-1">{selectedInquiry.telephone || 'N/A'}</span>
                          <span className="text-xs text-slate-400 block">{selectedInquiry.email || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Location / County</span>
                          <span className="text-sm font-bold text-slate-700 block mt-1">{selectedInquiry.location || 'N/A'}, {selectedInquiry.county} County</span>
                          <span className="text-xs text-slate-400 block">{selectedInquiry.postalAddress || 'No postal address'}</span>
                        </div>
                        <div className="col-span-2 border-t pt-4">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-mono">Nature of Inquiry & Message</span>
                          <p className="text-sm font-medium text-slate-600 mt-2 whitespace-pre-wrap bg-white p-4 rounded-xl border border-slate-100">{selectedInquiry.message}</p>
                        </div>
                      </div>

                      {/* Section 2: Official Form (Editable by Admin) */}
                      <div className="border-t pt-8 space-y-6">
                        <div>
                          <h5 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] mb-1">8. For Official Use Only (Kenya Dairy Board)</h5>
                          <p className="text-xs text-slate-400 font-semibold">Refer inquiry, provide response details, select status and authorize.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Referred To Officer/Dept</label>
                            <input 
                              type="text"
                              value={inquiryReferredTo}
                              onChange={(e) => setInquiryReferredTo(e.target.value)}
                              placeholder="e.g. Technical Department"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-sm font-semibold transition-all"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Processing Status</label>
                            <select 
                              value={inquiryStatus}
                              onChange={(e) => setInquiryStatus(e.target.value as any)}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-sm font-semibold transition-all"
                            >
                              <option value="submitted">Submitted (Pending)</option>
                              <option value="referred">Referred</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Response / Action Taken Details</label>
                            <textarea 
                              rows={4}
                              value={inquiryResponseDetails}
                              onChange={(e) => setInquiryResponseDetails(e.target.value)}
                              placeholder="Enter details of official KDB response..."
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 text-sm font-medium transition-all"
                            />
                          </div>
                        </div>

                        {/* Signature Block */}
                        <div className="p-6 rounded-[24px] bg-slate-50 border border-dashed flex flex-col space-y-4">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">KDB Administrative Sign-off</span>
                          
                          <div className="grid grid-cols-2 gap-6 items-end">
                            <div>
                              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Officer Full Name</label>
                              <input 
                                type="text"
                                value={adminName}
                                onChange={(e) => setAdminName(e.target.value)}
                                placeholder="Enter your full name"
                                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900 text-sm font-semibold transition-all"
                              />
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 border rounded-xl bg-white min-h-[60px]">
                              {staffConfig.officialSignature ? (
                                <img 
                                  src={staffConfig.officialSignature} 
                                  alt="Officer Signature" 
                                  className="max-h-[50px] object-contain" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">MISSING SIGNATURE</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-4 pt-4 border-t">
                          <button 
                            onClick={handleProcessInquiry}
                            disabled={isProcessingInquiry}
                            className="flex-1 py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center disabled:opacity-50"
                          >
                            {isProcessingInquiry ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {inquiryProcessingStatus}
                              </>
                            ) : (
                              'Save & Process Inquiry'
                            )}
                          </button>
                          
                          <button 
                            onClick={() => setShowInquiryPreview(true)}
                            className="px-6 py-4 border border-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center"
                          >
                            <Eye className="w-4 h-4 mr-2" /> Preview Form
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Hidden offscreen preview for automated download generation */}
                    <InquiryPDFPreview inquiry={selectedInquiry} isHidden={true} onClose={() => {}} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[600px] text-slate-300 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
                    <Mail className="w-20 h-20 opacity-10 mb-8" />
                    <p className="text-[10px] font-black tracking-[0.5em] uppercase text-center px-10">Select an inquiry from the list to review and compose official response.</p>
                  </div>
                )}
              </div>

              {/* Popup visual preview modal if requested */}
              {showInquiryPreview && selectedInquiry && (
                <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300 p-6 overflow-y-auto">
                  <div className="bg-white rounded-[40px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative">
                    <button 
                      onClick={() => setShowInquiryPreview(false)}
                      className="absolute top-6 right-6 p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="p-8 bg-slate-50 border-b flex justify-between items-center pr-20">
                      <div>
                        <h4 className="text-lg font-black text-slate-900">Official Inquiry Document</h4>
                        <p className="text-xs text-slate-400 font-semibold mt-1">This matches the official KDB Client Inquiry PDF format exactly.</p>
                      </div>
                      <button 
                        onClick={async () => {
                          await downloadInquiryPDF(selectedInquiry, `inquiry-form-pdf-${selectedInquiry.id}`);
                        }}
                        className="py-3 px-6 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-slate-800 transition-all flex items-center shadow-md"
                      >
                        <Download className="w-4 h-4 mr-2" /> Download PDF Document
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-12 flex justify-center bg-slate-100">
                      <div className="bg-white shadow-lg rounded-2xl border p-2 scale-90 origin-top">
                        <InquiryPDFPreview inquiry={selectedInquiry} onClose={() => setShowInquiryPreview(false)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'clients' && (
        <div className="animate-in fade-in duration-500">
          <LicensedClientsModule />
        </div>
      )}

      {tab === 'returns' && (
        <div className="animate-in fade-in duration-500">
          <ClientReturnsModule debtors={debtors} onDebtorUpdate={onDebtorUpdate} onRefresh={onRefresh} />
        </div>
      )}

      {tab === 'data_validation' && (
        <div className="animate-in fade-in duration-500">
          <DataValidationModule />
        </div>
      )}

      {tab === 'reports' && (
        <div className="animate-in fade-in duration-500">
          <ReportsModule />
        </div>
      )}

      {tab === 'settings' && (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl space-y-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">KDB Execution Setup</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Manage your official digital identity.</p>
            </div>
            
            <div className="space-y-6">
                <div className={`p-6 rounded-[32px] border flex flex-col space-y-4 transition-all ${systemHealth.clientSupabase ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Activity className={`w-5 h-5 ${systemHealth.clientSupabase ? 'text-emerald-500' : 'text-rose-500'}`} />
                            <div>
                              <span className={`text-xs font-bold block ${systemHealth.clientSupabase ? 'text-emerald-700' : 'text-rose-700'}`}>Cloud Persistence</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Supabase Integration Status</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {systemHealth.clientSupabase ? (
                              <div className="flex items-center space-x-3">
                                <span className="text-[9px] font-black text-emerald-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-emerald-100">CLIENT: CONNECTED</span>
                              </div>
                          ) : (
                              <div className="flex items-center space-x-2">
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                                <span className="text-[9px] font-black text-rose-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-rose-100 uppercase tracking-tight">CLIENT: OFFLINE</span>
                              </div>
                          )}
                          {systemHealth && (
                            <div className="flex items-center space-x-2">
                              {systemHealth.backendSupabase ? (
                                <span className="text-[9px] font-black text-emerald-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-emerald-100">BACKEND: CONNECTED</span>
                              ) : (
                                <span className="text-[9px] font-black text-rose-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-rose-100 uppercase tracking-tight">BACKEND: OFFLINE</span>
                              )}
                            </div>
                          )}
                        </div>
                    </div>

                    {!systemHealth.clientSupabase && (
                      <div className="p-4 bg-white/50 rounded-2xl border border-rose-200 space-y-2">
                        <p className="text-[10px] font-bold text-rose-700 uppercase tracking-tight">Missing Configuration:</p>
                        <ul className="text-[9px] text-rose-600 space-y-1 list-disc ml-4 font-medium">
                          <li>VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set in environment</li>
                        </ul>
                        <p className="text-[9px] text-slate-500 italic mt-2">Add these to your project settings to enable Cloud Sync.</p>
                      </div>
                    )}

                    {systemHealth?.status === 'error' && (
                      <div className="p-5 bg-rose-50 rounded-[32px] border border-rose-200 space-y-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
                          <div>
                            <p className="text-xs font-black text-rose-800 uppercase tracking-widest mb-1">Supabase Connection Error</p>
                            <p className="text-[11px] text-rose-600 font-bold leading-relaxed">{systemHealth.message}</p>
                            {systemHealth.details && <p className="text-[9px] text-rose-500 font-medium italic mt-1">{systemHealth.details}</p>}
                          </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-rose-100 space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Database Schema</p>
                          <p className="text-[10px] text-slate-600 font-medium">If you haven't set up your tables yet, copy and run this SQL in your Supabase SQL Editor:</p>
                          
                          <div className="relative group">
                            <div className="bg-slate-900 rounded-xl p-3 overflow-x-auto max-h-[200px] scrollbar-thin scrollbar-thumb-slate-700">
                              <pre className="text-[9px] text-emerald-400 font-mono leading-relaxed">
{`CREATE TABLE IF NOT EXISTS agreements (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  clientemail TEXT,
  pobox TEXT,
  code TEXT,
  clientsignature TEXT,
  officialsignature TEXT,
  officialname TEXT,
  rejectionreason TEXT,
  resubmissionreason TEXT,
  clientname TEXT,
  clienttitle TEXT,
  submittedat TEXT,
  approvedat TEXT,
  dboname TEXT,
  premisename TEXT,
  permitno TEXT,
  location TEXT,
  county TEXT,
  totalarrears NUMERIC,
  totalarrearswords TEXT,
  arrearsperiod TEXT,
  debitnoteno TEXT,
  tel TEXT,
  arrearsbreakdown JSONB,
  installments JSONB
);

CREATE TABLE IF NOT EXISTS debtors (
  id TEXT PRIMARY KEY,
  dboname TEXT NOT NULL,
  premisename TEXT,
  permitno TEXT,
  location TEXT,
  county TEXT,
  totalarrears NUMERIC,
  totalarrearswords TEXT,
  arrearsperiod TEXT,
  debitnoteno TEXT,
  tel TEXT,
  arrearsbreakdown JSONB,
  installments JSONB
);

-- Note: To drop uniqueness constraint from an existing database, run:
-- ALTER TABLE debtors DROP CONSTRAINT IF EXISTS debtors_permitno_key;

CREATE TABLE IF NOT EXISTS staff_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  officialsignature TEXT
);

CREATE TABLE IF NOT EXISTS closures (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  submittedat TEXT,
  approvedat TEXT,
  dboname TEXT,
  permitno TEXT,
  premisename TEXT,
  permittype TEXT,
  county TEXT,
  subcounty TEXT,
  location TEXT,
  tel TEXT,
  closuredate TEXT,
  closurereason TEXT,
  permitstatusintent TEXT,
  declarationagreed BOOLEAN,
  clientsignature TEXT,
  clientname TEXT,
  officialsignature TEXT,
  officialname TEXT,
  rejectionreason TEXT
);

-- Enable RLS and add policies for anonymous access if needed
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON agreements FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON debtors FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE staff_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON staff_config FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON closures FOR ALL USING (true) WITH CHECK (true);`}
                              </pre>
                            </div>
                            <button 
                              onClick={() => {
                                const sql = `CREATE TABLE IF NOT EXISTS agreements (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  date TEXT NOT NULL,
  clientemail TEXT,
  pobox TEXT,
  code TEXT,
  clientsignature TEXT,
  officialsignature TEXT,
  officialname TEXT,
  rejectionreason TEXT,
  resubmissionreason TEXT,
  clientname TEXT,
  clienttitle TEXT,
  submittedat TEXT,
  approvedat TEXT,
  dboname TEXT,
  premisename TEXT,
  permitno TEXT,
  location TEXT,
  county TEXT,
  totalarrears NUMERIC,
  totalarrearswords TEXT,
  arrearsperiod TEXT,
  debitnoteno TEXT,
  tel TEXT,
  arrearsbreakdown JSONB,
  installments JSONB
);

CREATE TABLE IF NOT EXISTS debtors (
  id TEXT PRIMARY KEY,
  dboname TEXT NOT NULL,
  premisename TEXT,
  permitno TEXT,
  location TEXT,
  county TEXT,
  totalarrears NUMERIC,
  totalarrearswords TEXT,
  arrearsperiod TEXT,
  debitnoteno TEXT,
  tel TEXT,
  arrearsbreakdown JSONB,
  installments JSONB
);

-- Note: To drop uniqueness constraint from an existing database, run:
-- ALTER TABLE debtors DROP CONSTRAINT IF EXISTS debtors_permitno_key;

CREATE TABLE IF NOT EXISTS staff_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  officialsignature TEXT
);

CREATE TABLE IF NOT EXISTS closures (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  submittedat TEXT,
  approvedat TEXT,
  dboname TEXT,
  permitno TEXT,
  premisename TEXT,
  permittype TEXT,
  county TEXT,
  subcounty TEXT,
  location TEXT,
  tel TEXT,
  closuredate TEXT,
  closurereason TEXT,
  permitstatusintent TEXT,
  declarationagreed BOOLEAN,
  clientsignature TEXT,
  clientname TEXT,
  officialsignature TEXT,
  officialname TEXT,
  rejectionreason TEXT
);

ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON agreements FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON debtors FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE staff_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON staff_config FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON closures FOR ALL USING (true) WITH CHECK (true);`;
                                navigator.clipboard.writeText(sql);
                                alert("SQL copied to clipboard!");
                              }}
                              className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[8px] font-bold uppercase tracking-widest transition-colors"
                            >
                              Copy SQL
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {systemHealth.clientSupabase ? (
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="text-[10px] font-bold text-emerald-700 bg-white px-4 py-2 rounded-xl shadow-sm border border-emerald-100">
                          Primary Data Store: Supabase Cloud
                        </div>
                      </div>
                    ) : null}
                </div>

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
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Server className="w-3 h-3 mr-2" /> Cloud Connection
                    </h4>
                    <button onClick={checkHealth} className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline">
                      Test Connection
                    </button>
                  </div>
                  <div className="bg-slate-900 rounded-[32px] p-6 text-white space-y-4 shadow-xl">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block">Supabase Status</span>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${systemHealth?.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                          <span className="text-xs font-bold">{systemHealth?.status === 'ok' ? 'Operational' : 'Disconnected'}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest block">Data Sync</span>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${systemHealth?.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                          <span className="text-xs font-bold">Real-time</span>
                        </div>
                      </div>
                    </div>

                    {systemHealth.tables && (
                      <div className="pt-4 border-t border-slate-800 grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <div className={`text-[8px] font-black uppercase mb-1 ${systemHealth.tables.agreements ? 'text-emerald-500' : 'text-rose-500'}`}>Agreements</div>
                          <div className={`w-1.5 h-1.5 rounded-full mx-auto ${systemHealth.tables.agreements ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        </div>
                        <div className="text-center">
                          <div className={`text-[8px] font-black uppercase mb-1 ${systemHealth.tables.debtors ? 'text-emerald-500' : 'text-rose-500'}`}>Debtors</div>
                          <div className={`w-1.5 h-1.5 rounded-full mx-auto ${systemHealth.tables.debtors ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        </div>
                        <div className="text-center">
                          <div className={`text-[8px] font-black uppercase mb-1 ${systemHealth.tables.staff ? 'text-emerald-500' : 'text-rose-500'}`}>Staff</div>
                          <div className={`w-1.5 h-1.5 rounded-full mx-auto ${systemHealth.tables.staff ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
