
import React, { useState, useEffect } from 'react';
import { AgreementForm } from './components/AgreementForm.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { SuccessScreen } from './components/SuccessScreen.tsx';
import { AgreementData, DebtorRecord, ViewState, ArrearItem, StaffConfig } from './types.ts';
import { ShieldCheck, User, ClipboardList, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { DBService } from './services/db.ts';
import { EmailService } from './services/email.ts';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('CLIENT_PORTAL');
  const [agreements, setAgreements] = useState<AgreementData[]>([]);
  const [debtors, setDebtors] = useState<DebtorRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [staffConfig, setStaffConfig] = useState<StaffConfig>({
    officialSignature: ''
  });
  const [currentAgreement, setCurrentAgreement] = useState<AgreementData | null>(null);

  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = async () => {
    setIsSyncing(true);
    try {
      const [storedAgreements, storedDebtors, storedStaff] = await Promise.all([
        DBService.getAgreements(),
        DBService.getDebtors(),
        DBService.getStaffConfig()
      ]);

      const uniqueAgreements = Array.from(new Map(storedAgreements.map(a => [a.id, a])).values());
      setAgreements(uniqueAgreements);
      setUnreadCount(uniqueAgreements.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length);
      setStaffConfig(storedStaff);

      if (storedDebtors.length > 0) {
        const uniqueDebtors = Array.from(new Map(storedDebtors.map(d => [d.id, d])).values());
        setDebtors(uniqueDebtors);
      } else {
        const initialDebtors: DebtorRecord[] = [
          {
            id: 'D001',
            dboName: 'Sunrise Dairy Ltd',
            premiseName: 'Sunrise Main Depot',
            permitNo: 'KDB/MB/0001/0001234/2024',
            location: 'Thika Road, Ruiru',
            county: 'Kiambu',
            arrearsBreakdown: [{ id: '1', month: 'January 2024', amount: 150000 }],
            totalArrears: 150000,
            totalArrearsWords: 'One Hundred and Fifty Thousand Shillings',
            arrearsPeriod: 'Jan 2024',
            debitNoteNo: 'DN/2024/552',
            tel: '0712345678',
            installments: [{ no: 1, period: 'Jan 2024', dueDate: '', amount: 150000 }]
          }
        ];
        setDebtors(initialDebtors);
        await DBService.saveDebtors(initialDebtors);
      }
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleClientSubmit = async (data: AgreementData) => {
    setIsSyncing(true);
    const submission = { ...data, submittedAt: new Date().toISOString() };
    
    // Check if it's an update (resubmission request)
    const existing = agreements.find(a => a.id === data.id);
    if (existing) {
      await DBService.updateAgreement(data.id, submission);
    } else {
      await DBService.saveAgreement(submission);
    }
    
    // Trigger Admin Notification
    await EmailService.sendAdminNotification(submission);
    
    const updated = await DBService.getAgreements();
    setAgreements(updated);
    setUnreadCount(updated.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length);
    
    setCurrentAgreement(data);
    setView('SUCCESS_SCREEN');
    setIsSyncing(false);
  };

  const handleAdminAction = async (id: string, action: 'approve' | 'reject', adminData?: { signature: string; name: string; reason?: string }) => {
    setIsSyncing(true);
    const updates: Partial<AgreementData> = action === 'approve' 
      ? { status: 'approved', officialSignature: adminData?.signature, officialName: adminData?.name, approvedAt: new Date().toISOString() }
      : { status: 'rejected', rejectionReason: adminData?.reason };

    await DBService.updateAgreement(id, updates);
    
    const updated = await DBService.getAgreements();
    
    // If approved, send notification to client
    if (action === 'approve') {
      const approvedAgreement = updated.find(a => a.id === id);
      if (approvedAgreement) {
        await EmailService.sendClientApproval(approvedAgreement);
      }
    }

    setAgreements(updated);
    setUnreadCount(updated.filter(a => a.status === 'submitted' || a.status === 'resubmission_requested').length);
    setIsSyncing(false);
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('CLIENT_PORTAL')}>
              <div className="bg-emerald-600 p-2 rounded-xl flex items-center shadow-lg shadow-emerald-100">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-xs uppercase tracking-widest text-slate-800">KDB PAP</span>
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
                onClick={() => setView('CLIENT_PORTAL')}
                className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === 'CLIENT_PORTAL' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <User className="w-4 h-4 mr-2" />
                Portal
              </button>
              <button 
                onClick={() => setView('ADMIN_DASHBOARD')}
                className={`relative flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === 'ADMIN_DASHBOARD' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Admin
                {unreadCount > 0 && view !== 'ADMIN_DASHBOARD' && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white animate-bounce font-black">
                    {unreadCount}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {view === 'CLIENT_PORTAL' && (
          <AgreementForm agreements={agreements} debtors={debtors} onSubmit={handleClientSubmit} />
        )}
        {view === 'ADMIN_DASHBOARD' && (
          <AdminDashboard 
            agreements={agreements} 
            debtors={debtors}
            staffConfig={staffConfig}
            onAction={handleAdminAction} 
            onDebtorUpdate={handleDebtorUpdate}
            onStaffUpdate={handleStaffUpdate}
          />
        )}
        {view === 'SUCCESS_SCREEN' && currentAgreement && (
          <SuccessScreen agreement={currentAgreement} onReturn={() => setView('CLIENT_PORTAL')} />
        )}
      </main>
      
      <footer className="py-6 border-t bg-white text-center">
      </footer>
    </div>
  );
};

export default App;
