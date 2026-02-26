
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AgreementForm } from './components/AgreementForm.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { SuccessScreen } from './components/SuccessScreen.tsx';
import { AgreementData, DebtorRecord, ArrearItem, StaffConfig } from './types.ts';
import { ShieldCheck, User, ClipboardList, Cloud, CloudOff, Loader2, LogOut, Lock } from 'lucide-react';
import { DBService } from './services/db.ts';
import { EmailService } from './services/email.ts';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [agreements, setAgreements] = useState<AgreementData[]>([]);
  const [debtors, setDebtors] = useState<DebtorRecord[]>([]);
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
      const [storedAgreements, storedDebtors, storedStaff] = await Promise.all([
        DBService.getAgreements(),
        DBService.getDebtors(),
        DBService.getStaffConfig()
      ]);

      const uniqueAgreements = Array.from(new Map(storedAgreements.map(a => [a.id, a])).values());
      setAgreements(uniqueAgreements);
      
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
    try {
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
      navigate('/success');
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Submission failed. Please check your connection and try again.");
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
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="bg-emerald-600 p-2 rounded-xl flex items-center shadow-lg shadow-emerald-100">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-xs uppercase tracking-widest text-slate-800">KDB Payments</span>
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
                className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${location.pathname === '/' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
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
          <Route path="/" element={<AgreementForm agreements={agreements} debtors={debtors} onSubmit={handleClientSubmit} />} />
          <Route path="/admin" element={
            isAdminAuthenticated ? (
              <AdminDashboard 
                agreements={agreements} 
                debtors={debtors}
                staffConfig={staffConfig}
                isSyncing={isSyncing}
                onRefresh={loadDatabase}
                onAction={handleAdminAction} 
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
              <SuccessScreen agreement={currentAgreement} onReturn={() => navigate('/')} />
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
