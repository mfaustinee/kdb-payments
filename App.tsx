
import DataValidationModule from './components/DataValidationModule';
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AgreementForm } from './components/AgreementForm.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { SuccessScreen } from './components/SuccessScreen.tsx';
import { PortalHub } from './components/PortalHub.tsx';
import { ClosureForm } from './components/ClosureForm.tsx';
import { ComplaintForm } from './components/ComplaintForm.tsx';
import { InquiryForm } from './components/InquiryForm.tsx';
import { AgreementData, DebtorRecord, ArrearItem, StaffConfig, ClosureNotificationData, LicensedClient, ComplaintData, InquiryData } from './types.ts';
import { ShieldCheck, User, ClipboardList, Cloud, CloudOff, Loader2, LogOut, Lock, ClipboardCheck } from 'lucide-react';
import { DBService } from './services/db.ts';
import { numberToWords } from './utils/numberToWords.ts';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [agreements, setAgreements] = useState<AgreementData[]>([]);
  const [closures, setClosures] = useState<ClosureNotificationData[]>([]);
  const [complaints, setComplaints] = useState<ComplaintData[]>([]);
  const [inquiries, setInquiries] = useState<InquiryData[]>([]);
  const [debtors, setDebtors] = useState<DebtorRecord[]>([]);
  const [clients, setClients] = useState<LicensedClient[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [staffConfig, setStaffConfig] = useState<StaffConfig>({
    officialSignature: ''
  });
  const [currentAgreement, setCurrentAgreement] = useState<AgreementData | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    loadDatabase();
  }, []);

  const handleAdminAccess = () => {
    navigate('/admin');
  };

  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (adminPasswordInput === 'KDB@2024') {
      setIsAdminAuthenticated(true);
      setLoginError(false);
      setAdminPasswordInput('');
      navigate('/admin');
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    navigate('/');
  };

  const loadDatabase = async () => {
    setIsSyncing(true);
    try {
      const [storedAgreements, storedDebtors, storedStaff, storedClosures, storedReturns, storedClients, storedComplaints, storedInquiries] = await Promise.all([
        DBService.getAgreements(),
        DBService.getDebtors(),
        DBService.getStaffConfig(),
        DBService.getClosures(),
        DBService.getReturns(),
        DBService.getClients(),
        DBService.getComplaints(),
        DBService.getInquiries()
      ]);

      const uniqueAgreements = Array.from(new Map(storedAgreements.map(a => [a.id, a])).values());
      setAgreements(uniqueAgreements);

      const uniqueClosures = Array.from(new Map(storedClosures.map(c => [c.id, c])).values());
      setClosures(uniqueClosures);

      const uniqueComplaints = Array.from(new Map(storedComplaints.map(co => [co.id, co])).values());
      setComplaints(uniqueComplaints);

      const uniqueInquiries = Array.from(new Map(storedInquiries.map(inq => [inq.id, inq])).values());
      setInquiries(uniqueInquiries);
      
      // Check for direct link ID
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      if (id) {
        const found = uniqueAgreements.find(a => a.id === id);
        if (found) {
          setCurrentAgreement(found);
          navigate('/success');
        }
      }
      
      const unreadAgreements = uniqueAgreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
      const unreadClosures = uniqueClosures.filter(c => c.status === 'submitted').length;
      const unreadComplaints = uniqueComplaints.filter(co => co.status === 'submitted').length;
      const unreadInquiries = uniqueInquiries.filter(inq => inq.status === 'submitted').length;
      setUnreadCount(unreadAgreements + unreadClosures + unreadComplaints + unreadInquiries);
      setStaffConfig(storedStaff);
      setClients(storedClients || []);

      let baseDebtors = storedDebtors;
      if (baseDebtors.length === 0) {
        baseDebtors = [
          {
            id: 'D001',
            dboName: 'Sunrise Dairy Ltd',
            premiseName: 'Sunrise Main Depot',
            permitNo: 'KDB/MB/0001234/2025',
            location: 'Thika Road, Ruiru',
            county: 'Kiambu',
            arrearsBreakdown: [{ id: '1', month: 'January 2024', amount: 150000 }],
            totalArrears: 150000,
            totalArrearsWords: 'One Hundred and Fifty Thousand Shillings Only',
            arrearsPeriod: 'Jan 2024',
            debitNoteNo: 'DN/2024/552',
            tel: '0712345678',
            installments: [{ no: 1, period: 'Jan 2024', dueDate: '', amount: 150000 }]
          }
        ];
        await DBService.saveDebtors(baseDebtors);
      }

      // Group returns with outstandingBalance > 0 by client
      const outstandingByClient: Record<string, any[]> = {};
      (storedReturns || []).forEach(ret => {
        if (ret.outstandingBalance > 0) {
          if (!outstandingByClient[ret.clientId]) {
            outstandingByClient[ret.clientId] = [];
          }
          outstandingByClient[ret.clientId].push(ret);
        }
      });

      const integrated: DebtorRecord[] = JSON.parse(JSON.stringify(baseDebtors));

      Object.entries(outstandingByClient).forEach(([clientId, rets]) => {
        const client = (storedClients || []).find(c => c.id === clientId);
        const clientName = client ? client.clientName : rets[0].clientName;
        const premiseName = client ? client.premiseName : 'Unknown Premise';
        const location = client ? client.location : 'Unknown Location';
        const county = client ? client.county : 'Unknown County';
        const tel = client ? client.tel : 'No Phone';

        const arrearsBreakdown: ArrearItem[] = rets.map((r, i) => ({
          id: `ret-arr-${r.id || i}`,
          month: `${r.period} ${r.year}`,
          amount: r.outstandingBalance
        }));

        const totalArrears = rets.reduce((sum, r) => sum + r.outstandingBalance, 0);
        const totalArrearsWords = numberToWords(totalArrears);
        const arrearsPeriod = rets.map(r => `${(r.period || '').substring(0,3)} ${r.year}`).join(', ');

        // Check if existing
        const existingIndex = integrated.findIndex(d => 
          (d.dboName || '').toLowerCase() === (clientName || '').toLowerCase() ||
          d.id === clientId ||
          (d.permitNo || '') === clientId ||
          (d.permitNo || '') === `KDB/LC/${clientId}`
        );

        if (existingIndex !== -1) {
          const existing = integrated[existingIndex];
          const combinedBreakdown = [...existing.arrearsBreakdown];
          arrearsBreakdown.forEach(arr => {
            const duplicate = combinedBreakdown.find(eb => eb.month === arr.month);
            if (duplicate) {
              duplicate.amount = arr.amount;
            } else {
              combinedBreakdown.push(arr);
            }
          });

          const newTotal = combinedBreakdown.reduce((sum, item) => sum + item.amount, 0);

          let finalInstallments = existing.installments || [];
          if (finalInstallments.length <= 1 || existing.debitNoteNo?.startsWith('DN/RET/')) {
            finalInstallments = combinedBreakdown.map((item, idx) => ({
              no: idx + 1,
              period: item.month,
              dueDate: new Date().toISOString().slice(0, 10),
              amount: item.amount
            }));
          }

          integrated[existingIndex] = {
            ...existing,
            arrearsBreakdown: combinedBreakdown,
            totalArrears: newTotal,
            totalArrearsWords: numberToWords(newTotal),
            arrearsPeriod: combinedBreakdown.map(b => b.month).join(', '),
            installments: finalInstallments,
          };
        } else {
          integrated.push({
            id: clientId,
            dboName: clientName,
            premiseName: premiseName,
            permitNo: `KDB/LC/${clientId}`,
            location: location,
            county: county,
            arrearsBreakdown,
            totalArrears,
            totalArrearsWords,
            arrearsPeriod,
            debitNoteNo: `DN/RET/${clientId}`,
            tel: tel,
            installments: arrearsBreakdown.map((item, idx) => ({
              no: idx + 1,
              period: item.month,
              dueDate: new Date().toISOString().slice(0, 10),
              amount: item.amount
            }))
          });
        }
      });

      const uniqueDebtors = Array.from(new Map(integrated.map(d => [d.id, d])).values());
      setDebtors(uniqueDebtors);
    } catch (error) {
      console.error("[App] Failed to load database:", error);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };


  const handleClientSubmit = async (data: AgreementData) => {
    setIsSyncing(true);
    try {
      const submission = { ...data, submittedAt: new Date().toISOString() };
      
      // Save or update the agreement
      await DBService.saveAgreement(submission);
      
      // Refresh local state
      const updated = await DBService.getAgreements();
      setAgreements(updated);
      
      const updatedClosures = await DBService.getClosures();
      setClosures(updatedClosures);

      const unreadAgreements = updated.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
      const unreadClosures = updatedClosures.filter(c => c.status === 'submitted').length;
      setUnreadCount(unreadAgreements + unreadClosures);
      
      setCurrentAgreement(submission);
      navigate('/success');
    } catch (error: any) {
      console.error("Submission failed:", error);
      alert(`Submission failed: ${error.message || 'Please try again.'}`);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClosureSubmit = async (data: ClosureNotificationData) => {
    setIsSyncing(true);
    try {
      const submission = { ...data, submittedAt: data.submittedAt || new Date().toISOString() };
      await DBService.saveClosure(submission);
      
      const updated = await DBService.getClosures();
      setClosures(updated);

      const updatedAgreements = await DBService.getAgreements();
      const updatedComplaints = await DBService.getComplaints();
      const updatedInquiries = await DBService.getInquiries();
      const unreadAgreements = updatedAgreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
      const unreadClosures = updated.filter(c => c.status === 'submitted').length;
      const unreadComplaints = updatedComplaints.filter(co => co.status === 'submitted').length;
      const unreadInquiries = updatedInquiries.filter(inq => inq.status === 'submitted').length;
      setUnreadCount(unreadAgreements + unreadClosures + unreadComplaints + unreadInquiries);
    } catch (error: any) {
      console.error("Closure submission failed:", error);
      alert(`Cessation notification submission failed: ${error.message || 'Please try again.'}`);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleComplaintSubmit = async (data: ComplaintData) => {
    setIsSyncing(true);
    try {
      const submission = { ...data, submittedAt: data.submittedAt || new Date().toISOString() };
      await DBService.saveComplaint(submission);
      
      const updated = await DBService.getComplaints();
      setComplaints(updated);

      const updatedAgreements = await DBService.getAgreements();
      const updatedClosures = await DBService.getClosures();
      const updatedInquiries = await DBService.getInquiries();
      const unreadAgreements = updatedAgreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
      const unreadClosures = updatedClosures.filter(c => c.status === 'submitted').length;
      const unreadComplaints = updated.filter(co => co.status === 'submitted').length;
      const unreadInquiries = updatedInquiries.filter(inq => inq.status === 'submitted').length;
      setUnreadCount(unreadAgreements + unreadClosures + unreadComplaints + unreadInquiries);
    } catch (error: any) {
      console.error("Complaint submission failed:", error);
      alert(`Complaint submission failed: ${error.message || 'Please try again.'}`);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInquirySubmit = async (data: InquiryData) => {
    setIsSyncing(true);
    try {
      const submission = { ...data, submittedAt: data.submittedAt || new Date().toISOString() };
      await DBService.saveInquiry(submission);
      
      const updated = await DBService.getInquiries();
      setInquiries(updated);

      const updatedAgreements = await DBService.getAgreements();
      const updatedClosures = await DBService.getClosures();
      const updatedComplaints = await DBService.getComplaints();
      const unreadAgreements = updatedAgreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
      const unreadClosures = updatedClosures.filter(c => c.status === 'submitted').length;
      const unreadComplaints = updatedComplaints.filter(co => co.status === 'submitted').length;
      const unreadInquiries = updated.filter(inq => inq.status === 'submitted').length;
      setUnreadCount(unreadAgreements + unreadClosures + unreadComplaints + unreadInquiries);
    } catch (error: any) {
      console.error("Inquiry submission failed:", error);
      alert(`Inquiry submission failed: ${error.message || 'Please try again.'}`);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAdminAction = async (id: string, action: 'approve' | 'reject', adminData?: { signature: string; name: string; reason?: string }) => {
    setIsSyncing(true);
    const updates: Partial<AgreementData> = action === 'approve' 
      ? { status: 'approved', officialSignature: adminData?.signature, officialName: adminData?.name, approvedAt: new Date().toISOString() }
      : { status: 'rejected', rejectionReason: adminData?.reason };

    await DBService.updateAgreement(id, updates);
    
    const updated = await DBService.getAgreements();
    setAgreements(updated);
    
    const updatedClosures = await DBService.getClosures();
    
    const unreadAgreements = updated.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
    const unreadClosures = updatedClosures.filter(c => c.status === 'submitted').length;
    setUnreadCount(unreadAgreements + unreadClosures);
    setIsSyncing(false);
  };

  const handleClosureAction = async (id: string, action: 'approve' | 'reject', adminData?: { signature: string; name: string; reason?: string; title?: string; comments?: string }) => {
    setIsSyncing(true);
    const updates: Partial<ClosureNotificationData> = action === 'approve'
      ? { 
          status: 'approved', 
          officialSignature: adminData?.signature, 
          officialName: adminData?.name, 
          officialTitle: adminData?.title,
          officialComments: adminData?.comments,
          approvedAt: new Date().toISOString() 
        }
      : { status: 'rejected', rejectionReason: adminData?.reason };

    await DBService.updateClosure(id, updates);
    
    // Automatically update relevant client's dates of cessation in the clients list
    const closure = closures.find(c => c.id === id);
    if (action === 'approve' && closure) {
      try {
        const clients = await DBService.getClients();
        let clientId = '';
        if (closure.permitNo && closure.permitNo.includes('KDB/LC/')) {
          clientId = closure.permitNo.split('KDB/LC/')[1];
        }
        
        const client = clients.find(c => c.id === clientId) || 
                       clients.find(c => String(c.clientName || '').toLowerCase() === String(closure.dboName || '').toLowerCase()) ||
                       clients.find(c => c.tel === closure.tel);
                       
        if (client) {
          const dateObj = new Date(closure.closureDate);
          const year = isNaN(dateObj.getTime()) ? null : dateObj.getFullYear();
          const monthsList = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          const month = isNaN(dateObj.getTime()) ? null : monthsList[dateObj.getMonth()];

          const updatedClient = {
            ...client,
            operationalStatus: 'closed' as const,
            levyInfo: 'DNQ-R' as const,
            endYear: year,
            endMonth: month
          };
          await DBService.saveClient(updatedClient);
          console.log(`[App] Automatically updated client ${client.clientName} status to closed with endYear=${year}, endMonth=${month}`);
        }
      } catch (err) {
        console.error("[App] Failed to auto-update client cessation status:", err);
      }
    }
    
    const updatedClosures = await DBService.getClosures();
    setClosures(updatedClosures);

    const updatedAgreements = await DBService.getAgreements();
    const unreadAgreements = updatedAgreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
    const unreadClosures = updatedClosures.filter(c => c.status === 'submitted').length;
    setUnreadCount(unreadAgreements + unreadClosures);
    setIsSyncing(false);
  };

  const handleDeleteAgreement = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this submission? This action cannot be undone.")) return;
    
    setIsSyncing(true);
    try {
      await DBService.deleteAgreement(id);
      const updated = await DBService.getAgreements();
      setAgreements(updated);
      
      const updatedClosures = await DBService.getClosures();
      const unreadAgreements = updated.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
      const unreadClosures = updatedClosures.filter(c => c.status === 'submitted').length;
      setUnreadCount(unreadAgreements + unreadClosures);
    } catch (error) {
      console.error("Deletion failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteClosure = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this cessation notice? This action cannot be undone.")) return;
    
    setIsSyncing(true);
    try {
      await DBService.deleteClosure(id);
      const updatedClosures = await DBService.getClosures();
      setClosures(updatedClosures);

      const updatedAgreements = await DBService.getAgreements();
      const unreadAgreements = updatedAgreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
      const unreadClosures = updatedClosures.filter(c => c.status === 'submitted').length;
      setUnreadCount(unreadAgreements + unreadClosures);
    } catch (error) {
      console.error("Cessation deletion failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleComplaintAction = async (id: string, updates: Partial<ComplaintData>) => {
    setIsSyncing(true);
    try {
      await DBService.updateComplaint(id, updates);
      const updatedComplaints = await DBService.getComplaints();
      setComplaints(updatedComplaints);

      const updatedAgreements = await DBService.getAgreements();
      const updatedClosures = await DBService.getClosures();
      const updatedInquiries = await DBService.getInquiries();
      const unreadAgreements = updatedAgreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
      const unreadClosures = updatedClosures.filter(c => c.status === 'submitted').length;
      const unreadComplaints = updatedComplaints.filter(co => co.status === 'submitted').length;
      const unreadInquiries = updatedInquiries.filter(inq => inq.status === 'submitted').length;
      setUnreadCount(unreadAgreements + unreadClosures + unreadComplaints + unreadInquiries);
    } catch (error) {
      console.error("Complaint action failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteComplaint = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this complaint? This action cannot be undone.")) return;
    
    setIsSyncing(true);
    try {
      await DBService.deleteComplaint(id);
      const updatedComplaints = await DBService.getComplaints();
      setComplaints(updatedComplaints);

      const updatedAgreements = await DBService.getAgreements();
      const updatedClosures = await DBService.getClosures();
      const updatedInquiries = await DBService.getInquiries();
      const unreadAgreements = updatedAgreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
      const unreadClosures = updatedClosures.filter(c => c.status === 'submitted').length;
      const unreadComplaints = updatedComplaints.filter(co => co.status === 'submitted').length;
      const unreadInquiries = updatedInquiries.filter(inq => inq.status === 'submitted').length;
      setUnreadCount(unreadAgreements + unreadClosures + unreadComplaints + unreadInquiries);
    } catch (error) {
      console.error("Complaint deletion failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInquiryAction = async (id: string, updates: Partial<InquiryData>) => {
    setIsSyncing(true);
    try {
      await DBService.updateInquiry(id, updates);
      const updatedInquiries = await DBService.getInquiries();
      setInquiries(updatedInquiries);

      const updatedAgreements = await DBService.getAgreements();
      const updatedClosures = await DBService.getClosures();
      const updatedComplaints = await DBService.getComplaints();
      const unreadAgreements = updatedAgreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
      const unreadClosures = updatedClosures.filter(c => c.status === 'submitted').length;
      const unreadComplaints = updatedComplaints.filter(co => co.status === 'submitted').length;
      const unreadInquiries = updatedInquiries.filter(inq => inq.status === 'submitted').length;
      setUnreadCount(unreadAgreements + unreadClosures + unreadComplaints + unreadInquiries);
    } catch (error) {
      console.error("Inquiry action failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this inquiry? This action cannot be undone.")) return;
    
    setIsSyncing(true);
    try {
      await DBService.deleteInquiry(id);
      const updatedInquiries = await DBService.getInquiries();
      setInquiries(updatedInquiries);

      const updatedAgreements = await DBService.getAgreements();
      const updatedClosures = await DBService.getClosures();
      const updatedComplaints = await DBService.getComplaints();
      const unreadAgreements = updatedAgreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length;
      const unreadClosures = updatedClosures.filter(c => c.status === 'submitted').length;
      const unreadComplaints = updatedComplaints.filter(co => co.status === 'submitted').length;
      const unreadInquiries = updatedInquiries.filter(inq => inq.status === 'submitted').length;
      setUnreadCount(unreadAgreements + unreadClosures + unreadComplaints + unreadInquiries);
    } catch (error) {
      console.error("Inquiry deletion failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDebtorUpdate = async (updated: DebtorRecord[]) => {
    setDebtors(updated);
    await DBService.saveDebtors(updated);
  };

  const handleStaffUpdate = async (config: StaffConfig) => {
    setStaffConfig(config);
    await DBService.saveStaffConfig(config);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="bg-emerald-600 p-2 rounded-xl flex items-center shadow-lg shadow-emerald-100">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-xs uppercase tracking-widest text-slate-800">KDB Hub</span>
                  <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border ${isSyncing ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    {isSyncing ? (
                      <Loader2 className="w-2.5 h-2.5 text-amber-500 animate-spin" />
                    ) : (
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    )}
                    <span className={`text-[9px] font-black uppercase tracking-tight ${isSyncing ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {isSyncing ? 'Syncing...' : 'Connected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <nav className="flex space-x-1.5">
              <button 
                onClick={() => navigate('/')}
                className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${['/', '/payment-agreement', '/closure-notice'].includes(location.pathname) ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <User className="w-4 h-4 mr-2" />
                Portal
              </button>
              
              {(isAdminAuthenticated || location.pathname === '/admin') && (
                <button 
                  onClick={handleAdminAccess}
                  className={`relative flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${location.pathname === '/admin' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Admin
                  {unreadCount > 0 && location.pathname !== '/admin' && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white animate-bounce font-black">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {isAdminAuthenticated && (
                <button 
                  onClick={handleAdminLogout}
                  className="flex items-center px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <Routes>
          <Route path="/" element={
            <PortalHub 
              onSelectPaymentPortal={() => navigate('/payment-agreement')} 
              onSelectClosurePortal={() => navigate('/closure-notice')}
              onSelectComplaintPortal={() => navigate('/complaints')}
              onSelectInquiryPortal={() => navigate('/inquiries')}
              unreadAgreementsCount={agreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length}
              unreadClosuresCount={closures.filter(c => c.status === 'submitted').length}
            />
          } />
          <Route path="/payment-agreement" element={<AgreementForm agreements={agreements} debtors={debtors} clients={clients} onSubmit={handleClientSubmit} />} />
          <Route path="/closure-notice" element={<ClosureForm onSubmit={handleClosureSubmit} onBack={() => navigate('/')} />} />
          <Route path="/complaints" element={<ComplaintForm onSubmit={handleComplaintSubmit} onBack={() => navigate('/')} />} />
          <Route path="/inquiries" element={<InquiryForm onSubmit={handleInquirySubmit} onBack={() => navigate('/')} />} />
          <Route path="/admin" element={
            isAdminAuthenticated ? (
              <AdminDashboard 
                agreements={agreements} 
                closures={closures}
                complaints={complaints}
                inquiries={inquiries}
                debtors={debtors}
                staffConfig={staffConfig}
                isSyncing={isSyncing}
                onRefresh={loadDatabase}
                onAction={handleAdminAction} 
                onDeleteAgreement={handleDeleteAgreement}
                onClosureAction={handleClosureAction}
                onDeleteClosure={handleDeleteClosure}
                onComplaintAction={handleComplaintAction}
                onDeleteComplaint={handleDeleteComplaint}
                onInquiryAction={handleInquiryAction}
                onDeleteInquiry={handleDeleteInquiry}
                onDebtorUpdate={handleDebtorUpdate}
                onStaffUpdate={handleStaffUpdate}
              />
            ) : (
              <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[40px] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                  <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Lock className="text-white w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800">Admin Access</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Restricted Personnel Only</p>
                </div>
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Security Password</label>
                    <input 
                      autoFocus
                      type="password" 
                      value={adminPasswordInput}
                      onChange={e => setAdminPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-6 py-4 rounded-2xl border bg-slate-50 focus:bg-white outline-none transition-all font-bold ${loginError ? 'border-rose-500 ring-4 ring-rose-500/10 animate-shake' : 'focus:ring-4 focus:ring-slate-900/10'}`}
                    />
                  </div>
                  {loginError && (
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest text-center animate-pulse">Invalid Credentials</p>
                  )}
                  <button 
                    type="submit"
                    className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-slate-800 shadow-xl transition-all uppercase tracking-widest text-xs"
                  >
                    Authenticate
                  </button>
                  <button 
                    type="button"
                    onClick={() => navigate('/')}
                    className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all"
                  >
                    Return to Portal
                  </button>
                </form>
              </div>
            )
          } />
          <Route path="/success" element={
            currentAgreement ? (
              <SuccessScreen 
                agreement={currentAgreement} 
                onReturn={() => navigate(currentAgreement.adminBypassed ? '/admin' : '/')} 
              />
            ) : (
              <Navigate to="/" replace />
            )
          } />
        </Routes>
      </main>
      
      <footer className="py-6 border-t bg-white text-center">
      </footer>
    </div>
  );
};

export default App;
