import React, { useState, useEffect } from 'react';
import { DBService } from '../services/db';
import { LicensedClient, ClientReturn, DataValidation } from '../types';
import { QuarterlyReportsView } from './QuarterlyReportsView';
import { HalfYearlyReportsView } from './HalfYearlyReportsView';
import { AnnualReportsView } from './AnnualReportsView';
import { CollectionAnalysisView } from './CollectionAnalysisView';
import { exportMonthlyReportToExcel } from '../utils/excelExport';
import { 
  FileText, 
  Printer, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  DollarSign,
  Upload
} from 'lucide-react';

interface NonReflectiveEntry {
  id: string;
  dboName: string;
  mpesa: string;
  amount: number;
}

interface ReportsModuleProps {
  onRefresh?: () => void;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ onRefresh }) => {
  const [clients, setClients] = useState<LicensedClient[]>([]);
  const [returns, setReturns] = useState<ClientReturn[]>([]);
  const [validations, setValidations] = useState<DataValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'half-yearly' | 'annual' | 'collection-analysis'>('monthly');
  const [showDebtSummary, setShowDebtSummary] = useState(true);

  // Filter selection
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[new Date().getMonth()];
  });
  const [reportingDate, setReportingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Sub-tabs to manage layout density in the web view
  // 'summary' | 'details' | 'compliance' | 'non-reflective'
  const [activeReportTab, setActiveReportTab] = useState<'summary' | 'details' | 'compliance'>('summary');

  // Editable state (saved to localStorage based on year & month)
  const [weeklyTargets, setWeeklyTargets] = useState<number[]>([50379, 50379, 50379, 50379]);
  const [nonReflectiveEntries, setNonReflectiveEntries] = useState<NonReflectiveEntry[]>([]);
  const [compiledByName, setCompiledByName] = useState('Officer Name');
  const [compiledByDesignation, setCompiledByDesignation] = useState('Revenue Officer');
  const [checkedByName, setCheckedByName] = useState('Manager Name');
  const [checkedByDesignation, setCheckedByDesignation] = useState('Regional Manager');
  const [selectedBranch, setSelectedBranch] = useState<string>(() => localStorage.getItem('kdb_report_branch') || 'Kericho');

  const [compiledSignature, setCompiledSignature] = useState<string | null>(() => localStorage.getItem('kdb_compiled_sig') || null);
  const [checkedSignature, setCheckedSignature] = useState<string | null>(() => localStorage.getItem('kdb_checked_sig') || null);
  const [compiledDate, setCompiledDate] = useState<string>(() => localStorage.getItem('kdb_compiled_date') || new Date().toISOString().split('T')[0]);
  const [checkedDate, setCheckedDate] = useState<string>(() => localStorage.getItem('kdb_checked_date') || new Date().toISOString().split('T')[0]);

  // Save changes to localStorage
  useEffect(() => {
    if (compiledSignature) localStorage.setItem('kdb_compiled_sig', compiledSignature);
    else localStorage.removeItem('kdb_compiled_sig');
  }, [compiledSignature]);

  useEffect(() => {
    if (checkedSignature) localStorage.setItem('kdb_checked_sig', checkedSignature);
    else localStorage.removeItem('kdb_checked_sig');
  }, [checkedSignature]);

  useEffect(() => {
    localStorage.setItem('kdb_compiled_date', compiledDate);
  }, [compiledDate]);

  useEffect(() => {
    localStorage.setItem('kdb_checked_date', checkedDate);
  }, [checkedDate]);

  // Synchronize branch name across report tabs in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('kdb_report_branch');
      if (stored && stored !== selectedBranch) {
        setSelectedBranch(stored);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 500);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [selectedBranch]);

  const handleBranchChange = (val: string) => {
    setSelectedBranch(val);
    localStorage.setItem('kdb_report_branch', val);
  };

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: 6 }, (_, i) => 2023 + i); // 2023 to 2028

  useEffect(() => {
    fetchData();
  }, []);

  // Sync / Load localStorage settings when month/year changes
  useEffect(() => {
    const key = `kdb_rep_targets_${selectedYear}_${selectedMonth}`;
    const storedTargets = localStorage.getItem(key);
    if (storedTargets) {
      setWeeklyTargets(JSON.parse(storedTargets));
    } else {
      setWeeklyTargets([50379, 50379, 50379, 50379]); // Default target
    }

    const nrKey = `kdb_rep_nr_${selectedYear}_${selectedMonth}`;
    const storedNR = localStorage.getItem(nrKey);
    if (storedNR) {
      setNonReflectiveEntries(JSON.parse(storedNR));
    } else {
      setNonReflectiveEntries([
        { id: 'nr-1', dboName: 'Kipkirui Dairies', mpesa: 'SBL837A831', amount: 0 }
      ]);
    }
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedClients, fetchedReturns, fetchedValidations] = await Promise.all([
        DBService.getClients(),
        DBService.getReturns(),
        DBService.getValidations()
      ]);
      setClients(fetchedClients);
      setReturns(fetchedReturns);
      setValidations(fetchedValidations);
    } catch (error) {
      console.error('[ReportsModule] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTargets = (newTargets: number[]) => {
    setWeeklyTargets(newTargets);
    const key = `kdb_rep_targets_${selectedYear}_${selectedMonth}`;
    localStorage.setItem(key, JSON.stringify(newTargets));
  };

  const handleUpdateTarget = (index: number, val: number) => {
    const updated = [...weeklyTargets];
    updated[index] = val;
    handleSaveTargets(updated);
  };

  const handleSaveNR = (newEntries: NonReflectiveEntry[]) => {
    setNonReflectiveEntries(newEntries);
    const nrKey = `kdb_rep_nr_${selectedYear}_${selectedMonth}`;
    localStorage.setItem(nrKey, JSON.stringify(newEntries));
  };

  const handleAddNR = () => {
    const newEntry: NonReflectiveEntry = {
      id: `nr-${Date.now()}`,
      dboName: '',
      mpesa: '',
      amount: 0
    };
    handleSaveNR([...nonReflectiveEntries, newEntry]);
  };

  const handleUpdateNR = (id: string, field: keyof NonReflectiveEntry, val: any) => {
    const updated = nonReflectiveEntries.map(e => {
      if (e.id === id) {
        return { ...e, [field]: val };
      }
      return e;
    });
    handleSaveNR(updated);
  };

  const handleRemoveNR = (id: string) => {
    const filtered = nonReflectiveEntries.filter(e => e.id !== id);
    handleSaveNR(filtered);
  };

  // Helper: Find collection month name (Month + 1)
  const getCollectionMonth = (monthName: string): string => {
    const idx = monthsList.indexOf(monthName);
    if (idx === -1) return '';
    const nextIdx = (idx + 1) % 12;
    return monthsList[nextIdx];
  };

  // Helper: Get weeks based on payment date
  const getWeekFromDateStr = (dateStr: string): number => {
    if (!dateStr) return 4;
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) {
      // Try string parsing of format DD-MM-YYYY or DD-MM-YY
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        if (!isNaN(d)) {
          if (d <= 7) return 1;
          if (d <= 14) return 2;
          if (d <= 21) return 3;
          return 4;
        }
      }
      return 4;
    }
    const day = dateObj.getDate();
    if (day <= 7) return 1;
    if (day <= 14) return 2;
    if (day <= 21) return 3;
    return 4;
  };

  // Core Data Derivation
  const isClientOperatingInPeriod = (client: any, monthName: string, year: number): boolean => {
    let startY = client.startYear || 2024;
    if (startY < 2015) {
      startY = 2024;
    }
    const startMIdx = Math.max(0, monthsList.indexOf(client.startMonth || 'January'));
    const targetMIdx = monthsList.indexOf(monthName);

    const hasStarted = (year > startY) || (year === startY && targetMIdx >= startMIdx);
    if (!hasStarted) return false;

    if (client.operationalStatus === 'closed' || client.endYear) {
      const endY = client.endYear || year;
      let endMIdx = client.endYear ? monthsList.indexOf(client.endMonth || 'December') : 11;
      if (endMIdx === -1) endMIdx = 11;
      const hasClosed = (year > endY) || (year === endY && targetMIdx > endMIdx);
      if (hasClosed) return false;
    }

    return true;
  };

  const activeClients = clients.filter(c => isClientOperatingInPeriod(c, selectedMonth, selectedYear));
  
  // Qualifying active clients (must be QFR and Operating in that period)
  const qualifyingClients = clients.filter(c => c.levyInfo === 'QFR' && isClientOperatingInPeriod(c, selectedMonth, selectedYear));

  // Returns for the selected period
  const selectedPeriodReturns = returns.filter(r => 
    r.year === selectedYear && 
    r.period.toLowerCase() === selectedMonth.toLowerCase()
  );

  // Returns representing previous month arrears, collected/paid in the collection month
  // (e.g. if report month is April 2026, collection month is May 2026.
  // Debt collected means returns with period prior to April 2026, whose paymentDate falls in May 2026!)
  const collectionMonthNum = (monthsList.indexOf(selectedMonth) + 1) % 12; // index 0-indexed, so +1 for actual month index, next month is +1.
  const targetPaymentMonthString = `-${String(collectionMonthNum + 1).padStart(2, '0')}-`; // e.g. "-05-" for May if selected month is April

  const debtCollectedReturns = returns.filter(r => {
    // Return period must be older/different than selected month and year
    const isPriorPeriod = r.year < selectedYear || 
      (r.year === selectedYear && monthsList.indexOf(r.period) < monthsList.indexOf(selectedMonth));
    
    if (!isPriorPeriod) return false;

    // Payment must fall in collection month
    // We check if paymentDate has targetPaymentMonthString or if paymentDate's month matches the collection month
    if (!r.paymentDate) return false;
    const pDate = new Date(r.paymentDate);
    if (isNaN(pDate.getTime())) {
      // Parse DD-MM-YYYY
      const parts = r.paymentDate.split(/[-/]/);
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        const reportCollMonthNum = collectionMonthNum + 1; // 1-based index
        const matchYear = selectedMonth === 'December' ? selectedYear + 1 : selectedYear;
        return m === reportCollMonthNum && (y === matchYear || y === (matchYear % 100));
      }
      return false;
    }
    const matchYear = selectedMonth === 'December' ? selectedYear + 1 : selectedYear;
    return (pDate.getMonth() + 1) === (collectionMonthNum + 1) && pDate.getFullYear() === matchYear;
  });

  // Calculate Weeks for current month CSL collections
  const currentMonthReturnsByWeek = {
    1: selectedPeriodReturns.filter(r => getWeekFromDateStr(r.paymentDate || r.returnDate) === 1),
    2: selectedPeriodReturns.filter(r => getWeekFromDateStr(r.paymentDate || r.returnDate) === 2),
    3: selectedPeriodReturns.filter(r => getWeekFromDateStr(r.paymentDate || r.returnDate) === 3),
    4: selectedPeriodReturns.filter(r => getWeekFromDateStr(r.paymentDate || r.returnDate) === 4),
  };

  const currentMonthCSLGrossByWeek = {
    1: currentMonthReturnsByWeek[1].reduce((sum, r) => sum + r.paymentAmount, 0),
    2: currentMonthReturnsByWeek[2].reduce((sum, r) => sum + r.paymentAmount, 0),
    3: currentMonthReturnsByWeek[3].reduce((sum, r) => sum + r.paymentAmount, 0),
    4: currentMonthReturnsByWeek[4].reduce((sum, r) => sum + r.paymentAmount, 0),
  };

  // Collected Debt (Arrears) By Week
  const debtReturnsByWeek = {
    1: debtCollectedReturns.filter(r => getWeekFromDateStr(r.paymentDate) === 1),
    2: debtCollectedReturns.filter(r => getWeekFromDateStr(r.paymentDate) === 2),
    3: debtCollectedReturns.filter(r => getWeekFromDateStr(r.paymentDate) === 3),
    4: debtCollectedReturns.filter(r => getWeekFromDateStr(r.paymentDate) === 4),
  };

  const debtCollectedAmountByWeek = {
    1: debtReturnsByWeek[1].reduce((sum, r) => sum + r.paymentAmount, 0),
    2: debtReturnsByWeek[2].reduce((sum, r) => sum + r.paymentAmount, 0),
    3: debtReturnsByWeek[3].reduce((sum, r) => sum + r.paymentAmount, 0),
    4: debtReturnsByWeek[4].reduce((sum, r) => sum + r.paymentAmount, 0),
  };

  // Proportion of DBOs Summary Calculations (grouped by category)
  const categoriesList: ('Milk Bar' | 'Dispenser' | 'Cooling Plant' | 'Mini Dairy' | 'Cottage Industry')[] = [
    'Milk Bar', 'Dispenser', 'Cooling Plant', 'Mini Dairy', 'Cottage Industry'
  ];

  const proportionData = categoriesList.map(cat => {
    // Active qualifying clients in this category
    const catQualifying = qualifyingClients.filter(c => c.premiseCategory === cat);
    
    // Clients who made returns for this selected period
    const catFilerIds = new Set(selectedPeriodReturns.map(r => r.clientId));
    const catMakingReturns = catQualifying.filter(c => catFilerIds.has(c.id));
    const catNotMakingReturns = catQualifying.filter(c => !catFilerIds.has(c.id));

    // Debt collected count (unique clients who paid arrears)
    const catDebtPayingIds = new Set(debtCollectedReturns.filter(r => {
      const client = clients.find(c => c.id === r.clientId);
      return client?.premiseCategory === cat;
    }).map(r => r.clientId));

    // Total Litres declared in this selected month
    const catTotalLitres = selectedPeriodReturns
      .filter(r => {
        const client = clients.find(c => c.id === r.clientId);
        return client?.premiseCategory === cat;
      })
      .reduce((sum, r) => sum + r.qty, 0);

    return {
      category: cat,
      activeCount: catQualifying.length,
      makingCount: catMakingReturns.length,
      notMakingCount: catNotMakingReturns.length,
      percentageMaking: catQualifying.length > 0 ? Math.round((catMakingReturns.length / catQualifying.length) * 100) : 0,
      debtPayingCount: catDebtPayingIds.size,
      totalLitres: catTotalLitres
    };
  });

  const totalsProportion = {
    activeCount: proportionData.reduce((sum, d) => sum + d.activeCount, 0),
    makingCount: proportionData.reduce((sum, d) => sum + d.makingCount, 0),
    notMakingCount: proportionData.reduce((sum, d) => sum + d.notMakingCount, 0),
    debtPayingCount: proportionData.reduce((sum, d) => sum + d.debtPayingCount, 0),
    totalLitres: proportionData.reduce((sum, d) => sum + d.totalLitres, 0),
  };

  const totalPercentageMaking = totalsProportion.activeCount > 0 
    ? Math.round((totalsProportion.makingCount / totalsProportion.activeCount) * 100)
    : 0;

  const totalPercentageNotMaking = 100 - totalPercentageMaking;

  // Pending Payments for the Month
  const pendingPayments = selectedPeriodReturns.filter(r => r.outstandingBalance > 0);
  const totalPendingAmount = pendingPayments.reduce((sum, r) => sum + r.outstandingBalance, 0);
  const totalPendingQty = pendingPayments.reduce((sum, r) => sum + r.qty, 0);

  // Clients who do not qualify to file (dictated by those marked DNQ-R and operating. closed premises should not appear in the list)
  const dnqClients = clients.filter(c => c.levyInfo === 'DNQ-R' && c.operationalStatus === 'operating');

  // Non-filers details list (Qualifying Clients who did not file)
  const filerIds = new Set(selectedPeriodReturns.map(r => r.clientId));
  const nonFilers = qualifyingClients.filter(c => !filerIds.has(c.id));

  // Monthly validations count
  const monthlyValidationsCounter = validations.filter(v => 
    Number(v.year) === selectedYear && 
    v.period.toLowerCase() === selectedMonth.toLowerCase() &&
    v.status === 'Approved'
  ).length;

  // Cumulative Branch Debt up to the end of this month
  const monthlyCumulativeDebt = returns.filter(r => {
    const returnMonthIndex = monthsList.indexOf(r.period);
    const currentMonthIndex = monthsList.indexOf(selectedMonth);
    const isPastOrSameMonth = r.year < selectedYear || (r.year === selectedYear && returnMonthIndex <= currentMonthIndex);
    return isPastOrSameMonth && r.outstandingBalance > 0;
  }).reduce((sum, r) => sum + r.outstandingBalance, 0);

  // Totals for weekly summary table
  const totalTargetCSL = weeklyTargets.reduce((sum, t) => sum + t, 0);
  
  const totalCurrentMonthCSL = 
    currentMonthCSLGrossByWeek[1] + 
    currentMonthCSLGrossByWeek[2] + 
    currentMonthCSLGrossByWeek[3] + 
    currentMonthCSLGrossByWeek[4];

  const totalDebtRecovery = 
    debtCollectedAmountByWeek[1] + 
    debtCollectedAmountByWeek[2] + 
    debtCollectedAmountByWeek[3] + 
    debtCollectedAmountByWeek[4];

  const totalCollectionByWeek = {
    1: currentMonthCSLGrossByWeek[1] + debtCollectedAmountByWeek[1],
    2: currentMonthCSLGrossByWeek[2] + debtCollectedAmountByWeek[2],
    3: currentMonthCSLGrossByWeek[3] + debtCollectedAmountByWeek[3],
    4: currentMonthCSLGrossByWeek[4] + debtCollectedAmountByWeek[4],
  };

  const grandTotalCollection = 
    totalCollectionByWeek[1] + 
    totalCollectionByWeek[2] + 
    totalCollectionByWeek[3] + 
    totalCollectionByWeek[4];

  const varianceCSLByWeek = {
    1: weeklyTargets[0] - currentMonthCSLGrossByWeek[1],
    2: weeklyTargets[1] - currentMonthCSLGrossByWeek[2],
    3: weeklyTargets[2] - currentMonthCSLGrossByWeek[3],
    4: weeklyTargets[3] - currentMonthCSLGrossByWeek[4],
  };

  const totalVarianceCSL = totalTargetCSL - totalCurrentMonthCSL;

  const varianceCollByWeek = {
    1: weeklyTargets[0] - totalCollectionByWeek[1],
    2: weeklyTargets[1] - totalCollectionByWeek[2],
    3: weeklyTargets[2] - totalCollectionByWeek[3],
    4: weeklyTargets[3] - totalCollectionByWeek[4],
  };

  const totalVarianceColl = totalTargetCSL - grandTotalCollection;

  const formatNumber = (num: number): string => {
    if (num === 0) return '-';
    return new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(num);
  };

  const formatPercentage = (num: number): string => {
    return `${num}%`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    // Map pending payments and non-filers cleanly for export
    const mappedPending = pendingPayments.map(p => {
      const client = clients.find(c => c.id === p.clientId);
      return {
        clientName: client?.clientName || 'Unknown DBO',
        permitNo: client?.id || '-',
        premiseCategory: client?.premiseCategory || '-',
        qty: p.qty,
        paymentAmount: p.paymentAmount,
        outstandingBalance: p.outstandingBalance
      };
    });

    const mappedNonFilers = nonFilers.map(f => ({
      clientName: f.clientName,
      permitNo: f.id,
      premiseCategory: f.premiseCategory,
      phone: f.tel || '-',
      contactPerson: f.contactPerson || '-'
    }));

    exportMonthlyReportToExcel({
      selectedBranch,
      selectedMonth,
      selectedYear,
      reportingDate,
      weeklyTargets,
      totalTargetCSL,
      currentMonthCSLGrossByWeek,
      totalCurrentMonthCSL,
      varianceCSLByWeek,
      totalVarianceCSL,
      debtCollectedAmountByWeek,
      totalDebtRecovery,
      totalCollectionByWeek,
      grandTotalCollection,
      varianceCollByWeek,
      totalVarianceColl,
      proportionData,
      totalsProportion,
      totalPercentageMaking,
      totalPercentageNotMaking,
      pendingPayments: mappedPending,
      nonFilers: mappedNonFilers,
      nonReflectiveEntries
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Compiling Report Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 py-8">
      
      {/* Top Level Reports Selector (Hidden on Print) */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl print:hidden max-w-4xl overflow-x-auto gap-1">
        <button
          onClick={() => setReportType('monthly')}
          className={`flex-1 min-w-[120px] py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
            reportType === 'monthly'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Monthly Report
        </button>
        <button
          onClick={() => setReportType('quarterly')}
          className={`flex-1 min-w-[120px] py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
            reportType === 'quarterly'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Quarterly Report
        </button>
        <button
          onClick={() => setReportType('half-yearly')}
          className={`flex-1 min-w-[120px] py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
            reportType === 'half-yearly'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Half-Year Report
        </button>
        <button
          onClick={() => setReportType('annual')}
          className={`flex-1 min-w-[120px] py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
            reportType === 'annual'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Annual Report
        </button>
        <button
          onClick={() => setReportType('collection-analysis')}
          className={`flex-1 min-w-[160px] py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
            reportType === 'collection-analysis'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-emerald-700 hover:text-emerald-900 font-bold bg-emerald-50/40 hover:bg-emerald-50/80'
          }`}
        >
          Collection Analysis
        </button>
      </div>

      {reportType === 'collection-analysis' && (
        <CollectionAnalysisView clients={clients} returns={returns} validations={validations} />
      )}

      {reportType === 'quarterly' && (
        <QuarterlyReportsView clients={clients} returns={returns} />
      )}

      {reportType === 'half-yearly' && (
        <HalfYearlyReportsView clients={clients} returns={returns} />
      )}

      {reportType === 'annual' && (
        <AnnualReportsView clients={clients} returns={returns} />
      )}

      {reportType === 'monthly' && (
        <>
          {/* CONTROL & FILTER BAR (Hidden on Print) */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <FileText className="text-emerald-600" /> Monthly Reports
            </h3>
            <p className="text-slate-400 text-xs font-semibold">Generate compliant weekly-summary and monthly revenue collection reports.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all"
            >
              <Download size={14} /> Download Excel
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all"
            >
              <Printer size={14} /> Print / Export PDF
            </button>
            <button
              onClick={fetchData}
              className="px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-100"
            >
              Reload Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch Name</label>
            <input
              type="text"
              value={selectedBranch}
              onChange={e => handleBranchChange(e.target.value)}
              placeholder="Branch Name"
              className="w-full bg-slate-50 px-4 py-3 rounded-xl border-none outline-none text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting Year</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="w-full bg-slate-50 px-4 py-3 rounded-xl border-none outline-none text-xs font-bold text-slate-800"
            >
              {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting Month</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-50 px-4 py-3 rounded-xl border-none outline-none text-xs font-bold text-slate-800"
            >
              {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting Date</label>
            <input
              type="date"
              value={reportingDate}
              onChange={e => setReportingDate(e.target.value)}
              className="w-full bg-slate-50 px-4 py-3 rounded-xl border-none outline-none text-xs font-bold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* ==================== THE PRINTABLE REPORT CONTAINER ==================== */}
      <div id="kdb-report-printable" className="bg-white p-4 sm:p-10 rounded-[32px] border border-slate-100 shadow-sm print:shadow-none print:border-none print:p-0 space-y-10 text-slate-800">
        
        {/* REPORT HEADER */}
        <div className="text-center space-y-2 border-b border-slate-200 pb-6">
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase">
            {selectedBranch} Revenue Collection and Budget Execution Report (Weekly Summary)
          </h2>
          <div className="flex justify-between items-center text-xs font-mono text-slate-500 max-w-md mx-auto">
            <span>REPORTING DATE: <strong className="text-slate-800">{new Date(reportingDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
            <span>PERIOD: <strong className="text-slate-800">{selectedMonth.toUpperCase()} {selectedYear}</strong></span>
          </div>
        </div>

        {/* 1. WEEKLY REVENUE SUMMARY */}
        <div className="space-y-4 animate-in fade-in duration-300">
            <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
              I. Revenue Collection and Budget Execution (Weekly Summary)
            </h3>
            
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                    <th className="p-4 border-r border-slate-200 w-16 text-center">MONTH</th>
                    <th className="p-4 border-r border-slate-200 min-w-48">REVENUE HEAD</th>
                    <th className="p-4 border-r border-slate-200 text-right w-24">WEEK 1</th>
                    <th className="p-4 border-r border-slate-200 text-right w-24">WEEK 2</th>
                    <th className="p-4 border-r border-slate-200 text-right w-24">WEEK 3</th>
                    <th className="p-4 border-r border-slate-200 text-right w-24">WEEK 4</th>
                    <th className="p-4 text-right w-32 bg-slate-100 font-black">TOTAL AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                  
                  {/* Row 1: CSL Collection Target */}
                  <tr>
                    <td className="p-4 text-center font-black border-r border-slate-200 uppercase bg-slate-50 text-[10px] tracking-tight shrink-0" rowSpan={11}>
                      <div className="writing-mode-vertical uppercase text-slate-500 flex flex-col items-center">
                        {selectedMonth.split('').map((char, i) => <span key={i}>{char}</span>)}
                        <span className="mt-2 text-[8px] font-black text-slate-400">SUMMARY</span>
                      </div>
                    </td>
                    <td className="p-4 border-r border-slate-200 text-slate-500 font-bold uppercase text-[10px]">CSL Collection Target</td>
                    <td className="p-4 border-r border-slate-200 text-right font-bold text-slate-600">{formatNumber(weeklyTargets[0])}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-bold text-slate-600">{formatNumber(weeklyTargets[1])}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-bold text-slate-600">{formatNumber(weeklyTargets[2])}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-bold text-slate-600">{formatNumber(weeklyTargets[3])}</td>
                    <td className="p-4 text-right bg-slate-50 font-black text-slate-800 border-l border-slate-200">{formatNumber(totalTargetCSL)}</td>
                  </tr>

                  {/* Row 2: Gross Month CSL */}
                  <tr className="bg-slate-50/50">
                    <td className="p-4 border-r border-slate-200">Current Month CSL (Gross)</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(currentMonthCSLGrossByWeek[1])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(currentMonthCSLGrossByWeek[2])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(currentMonthCSLGrossByWeek[3])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(currentMonthCSLGrossByWeek[4])}</td>
                    <td className="p-4 text-right bg-slate-100/50 font-bold text-slate-800">{formatNumber(totalCurrentMonthCSL)}</td>
                  </tr>

                  {/* Row 3: Permit Renewal */}
                  <tr>
                    <td className="p-4 border-r border-slate-200">Permit Renewal Fee</td>
                    <td className="p-4 border-r border-slate-200 text-right text-slate-400">-</td>
                    <td className="p-4 border-r border-slate-200 text-right text-slate-400">-</td>
                    <td className="p-4 border-r border-slate-200 text-right text-slate-400">-</td>
                    <td className="p-4 border-r border-slate-200 text-right text-slate-400">-</td>
                    <td className="p-4 text-right bg-slate-50 text-slate-400">-</td>
                  </tr>

                  {/* Row 4: Total CSL */}
                  <tr className="bg-emerald-50/20 font-bold text-slate-900 border-t-2 border-slate-200">
                    <td className="p-4 border-r border-slate-200 uppercase text-[10px] tracking-tight">Total CSL</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(currentMonthCSLGrossByWeek[1])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(currentMonthCSLGrossByWeek[2])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(currentMonthCSLGrossByWeek[3])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(currentMonthCSLGrossByWeek[4])}</td>
                    <td className="p-4 text-right bg-emerald-50/50 font-black text-emerald-800">{formatNumber(totalCurrentMonthCSL)}</td>
                  </tr>

                  {/* Row 5: Collected Debt (Arrears) */}
                  <tr>
                    <td className="p-4 border-r border-slate-200">Collected Debt (Arrears)</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(debtCollectedAmountByWeek[1])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(debtCollectedAmountByWeek[2])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(debtCollectedAmountByWeek[3])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(debtCollectedAmountByWeek[4])}</td>
                    <td className="p-4 text-right bg-slate-50 font-bold">{formatNumber(totalDebtRecovery)}</td>
                  </tr>

                  {/* Row 6: Total Debt Recovery */}
                  <tr className="bg-blue-50/10 font-bold text-slate-800 border-b border-slate-200">
                    <td className="p-4 border-r border-slate-200 uppercase text-[10px] tracking-tight">Total Debt Recovery</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(debtCollectedAmountByWeek[1])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(debtCollectedAmountByWeek[2])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(debtCollectedAmountByWeek[3])}</td>
                    <td className="p-4 border-r border-slate-200 text-right">{formatNumber(debtCollectedAmountByWeek[4])}</td>
                    <td className="p-4 text-right bg-slate-100 font-black text-slate-900">{formatNumber(totalDebtRecovery)}</td>
                  </tr>

                  {/* Row 7: Total Collection */}
                  <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-900 border-b-2">
                    <td className="p-4 border-r border-slate-700 uppercase text-[10px] tracking-wider">Total Collection</td>
                    <td className="p-4 border-r border-slate-700 text-right">{formatNumber(totalCollectionByWeek[1])}</td>
                    <td className="p-4 border-r border-slate-700 text-right">{formatNumber(totalCollectionByWeek[2])}</td>
                    <td className="p-4 border-r border-slate-700 text-right">{formatNumber(totalCollectionByWeek[3])}</td>
                    <td className="p-4 border-r border-slate-700 text-right">{formatNumber(totalCollectionByWeek[4])}</td>
                    <td className="p-4 text-right bg-emerald-600 font-black">{formatNumber(grandTotalCollection)}</td>
                  </tr>

                  {/* Row 8: Variance (Target - Total CSL) */}
                  <tr>
                    <td className="p-4 border-r border-slate-200 font-bold text-rose-600">Variance (Target - Total CSL)</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{formatNumber(varianceCSLByWeek[1])}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{formatNumber(varianceCSLByWeek[2])}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{formatNumber(varianceCSLByWeek[3])}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{formatNumber(varianceCSLByWeek[4])}</td>
                    <td className="p-4 text-right bg-slate-50 font-mono font-black text-rose-700">{formatNumber(totalVarianceCSL)}</td>
                  </tr>

                  {/* Row 9: Variance (Target - Total Coll) */}
                  <tr className="bg-slate-50/50">
                    <td className="p-4 border-r border-slate-200 font-bold text-rose-600">Variance (Target - Total Coll)</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{formatNumber(varianceCollByWeek[1])}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{formatNumber(varianceCollByWeek[2])}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{formatNumber(varianceCollByWeek[3])}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{formatNumber(varianceCollByWeek[4])}</td>
                    <td className="p-4 text-right bg-slate-100/50 font-mono font-black text-rose-700">{formatNumber(totalVarianceColl)}</td>
                  </tr>

                  {/* Row 10: Collection Rate (Excl. debt) */}
                  <tr>
                    <td className="p-4 border-r border-slate-200 text-slate-500 font-bold">Collection Rate (Excl. debt)</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{weeklyTargets[0] > 0 ? formatPercentage(Math.round((currentMonthCSLGrossByWeek[1] / weeklyTargets[0]) * 100)) : '-'}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{weeklyTargets[1] > 0 ? formatPercentage(Math.round((currentMonthCSLGrossByWeek[2] / weeklyTargets[1]) * 100)) : '-'}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{weeklyTargets[2] > 0 ? formatPercentage(Math.round((currentMonthCSLGrossByWeek[3] / weeklyTargets[2]) * 100)) : '-'}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{weeklyTargets[3] > 0 ? formatPercentage(Math.round((currentMonthCSLGrossByWeek[4] / weeklyTargets[3]) * 100)) : '-'}</td>
                    <td className="p-4 text-right bg-slate-50 font-mono font-black text-slate-800">{totalTargetCSL > 0 ? formatPercentage(Math.round((totalCurrentMonthCSL / totalTargetCSL) * 100)) : '-'}</td>
                  </tr>

                  {/* Row 11: Collection Rate (Incl. debt) */}
                  <tr className="bg-slate-50/50">
                    <td className="p-4 border-r border-slate-200 text-slate-500 font-bold">Collection Rate (Incl. debt)</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{weeklyTargets[0] > 0 ? formatPercentage(Math.round((totalCollectionByWeek[1] / weeklyTargets[0]) * 100)) : '-'}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{weeklyTargets[1] > 0 ? formatPercentage(Math.round((totalCollectionByWeek[2] / weeklyTargets[1]) * 100)) : '-'}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{weeklyTargets[2] > 0 ? formatPercentage(Math.round((totalCollectionByWeek[3] / weeklyTargets[2]) * 100)) : '-'}</td>
                    <td className="p-4 border-r border-slate-200 text-right font-mono">{weeklyTargets[3] > 0 ? formatPercentage(Math.round((totalCollectionByWeek[4] / weeklyTargets[3]) * 100)) : '-'}</td>
                    <td className="p-4 text-right bg-slate-100/50 font-mono font-black text-slate-800">{totalTargetCSL > 0 ? formatPercentage(Math.round((grandTotalCollection / totalTargetCSL) * 100)) : '-'}</td>
                  </tr>

                </tbody>
              </table>
            </div>

            {/* Total Outstanding Levies Info Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{selectedMonth.toUpperCase()} Outstanding Balance</span>
                <span className="font-mono font-black text-sm text-slate-800 mt-2">KES {formatNumber(totalPendingAmount)}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">Branch Debt for Current Month</span>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col justify-between">
                <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest">Cumulative Branch Debt</span>
                <span className="font-mono font-black text-sm text-rose-600 mt-2">KES {formatNumber(monthlyCumulativeDebt)}</span>
                <span className="text-[8px] text-rose-400 font-bold uppercase mt-1">Up to {selectedMonth} {selectedYear}</span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Validations Counter</span>
                <span className="font-mono font-black text-sm text-emerald-600 mt-2">{monthlyValidationsCounter} Form(s)</span>
                <span className="text-[8px] text-emerald-500 font-bold uppercase mt-1">Submitted & Approved</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Outstanding Levies</span>
                <span className="font-mono font-black text-sm text-slate-800 mt-2">KES {formatNumber(totalPendingAmount + 153375)}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">2023 - Present Baseline</span>
              </div>
            </div>

            {/* Explanatory Management Notes */}
            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2 text-[10px] font-medium text-slate-500 leading-relaxed">
              <h4 className="font-black text-slate-700 uppercase tracking-widest mb-1">Accounting & Reporting Notes:</h4>
              <p>1. This management report is prepared on a <strong>Modified Accrual Basis</strong> for internal purposes. CSL revenue is recognized on an accrual basis.</p>
              <p>2. All other Revenue (i.e. debt collected in the month) is recognized on a cash basis to facilitate weekly performance monitoring.</p>
              <p>3. CF stands for Convenience Fee; <strong>CSL</strong> = Consumer Safety Levy.</p>
              <p>4. Variance represents the difference between the monthly target and actual collection. A <strong>Negative variance</strong> indicates actual collections exceeded target. A <strong>Positive variance</strong> indicates actual collections fell short of the target.</p>
              <p>5. <strong>Validations Counter:</strong> Successfully completed and submitted validation forms within this month's timeline boundary: <strong className="text-emerald-700">{monthlyValidationsCounter} form(s)</strong>.</p>
            </div>
          </div>

        {/* 2. DBO PROPORTION REPORT */}
        <div className="space-y-4 animate-in fade-in duration-300 pt-6 border-t border-slate-100">
            <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
              II. Proportion of DBOs Making Monthly Returns
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[9px] tracking-widest">
                    <th className="p-4 border-r border-slate-200">Permit Category</th>
                    <th className="p-4 border-r border-slate-200 text-center w-40"># Active Qualifying Clients - Current Month</th>
                    <th className="p-4 border-r border-slate-200 text-center w-36"># Making Returns - Current Month</th>
                    <th className="p-4 border-r border-slate-200 text-center w-36"># Not Making Returns - Current Month</th>
                    <th className="p-4 border-r border-slate-200 text-center w-36">% Making Monthly Returns</th>
                    <th className="p-4 border-r border-slate-200 text-center w-32">Debt Coll (# paid previous debt)</th>
                    <th className="p-4 text-right w-44 bg-slate-50 font-black">Total Litres Declared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                  {proportionData.map(d => (
                    <tr key={d.category} className="hover:bg-slate-50/40">
                      <td className="p-4 border-r border-slate-200 font-bold text-slate-800">{d.category}</td>
                      <td className="p-4 border-r border-slate-200 text-center font-mono">{d.activeCount}</td>
                      <td className="p-4 border-r border-slate-200 text-center font-mono text-emerald-600">{d.makingCount}</td>
                      <td className="p-4 border-r border-slate-200 text-center font-mono text-slate-400">{d.notMakingCount}</td>
                      <td className="p-4 border-r border-slate-200 text-center font-mono font-bold">{formatPercentage(d.percentageMaking)}</td>
                      <td className="p-4 border-r border-slate-200 text-center font-mono text-blue-600">{d.debtPayingCount}</td>
                      <td className="p-4 text-right font-mono font-bold bg-slate-50/30">{formatNumber(d.totalLitres)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-950">
                    <td className="p-4 border-r border-slate-700 uppercase text-[9px] tracking-wider">Totals</td>
                    <td className="p-4 border-r border-slate-700 text-center font-mono">{totalsProportion.activeCount}</td>
                    <td className="p-4 border-r border-slate-700 text-center font-mono text-emerald-300">{totalsProportion.makingCount}</td>
                    <td className="p-4 border-r border-slate-700 text-center font-mono text-slate-300">{totalsProportion.notMakingCount}</td>
                    <td className="p-4 border-r border-slate-700 text-center font-mono">{formatPercentage(totalPercentageMaking)}</td>
                    <td className="p-4 border-r border-slate-700 text-center font-mono text-blue-300">{totalsProportion.debtPayingCount}</td>
                    <td className="p-4 text-right font-mono bg-emerald-600 text-white">{formatNumber(totalsProportion.totalLitres)}</td>
                  </tr>
                  <tr className="bg-slate-100 font-black text-slate-600 text-[10px] tracking-widest text-center">
                    <td className="p-2 border-r border-slate-200 text-left">Percentage (%)</td>
                    <td className="p-2 border-r border-slate-200">100%</td>
                    <td className="p-2 border-r border-slate-200 text-emerald-700">{formatPercentage(totalPercentageMaking)}</td>
                    <td className="p-2 border-r border-slate-200 text-rose-700">{formatPercentage(totalPercentageNotMaking)}</td>
                    <td className="p-2 border-r border-slate-200">-</td>
                    <td className="p-2 border-r border-slate-200">-</td>
                    <td className="p-2 bg-slate-100 text-right">-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2 text-[10px] font-medium text-slate-500 leading-relaxed">
              <p>1. <strong>DBO</strong> stands for Dairy Business Operator. <strong>Coll</strong> is short for Collection.</p>
              <p>2. <strong>Qualifying Client</strong> refers to a client who is currently active (i.e., operating/trading) and required to submit a return for the current month.</p>
              <p>3. Processor returns are not included in this summary as their revenue falls under the Head Office.</p>
            </div>
          </div>

        {/* 3. DETAILED RETURNS TABLE WEEK BY WEEK */}
        <div className="space-y-6 animate-in fade-in duration-300 pt-6 border-t border-slate-100">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
                III. Clients Filing Monthly Returns ({selectedMonth.toUpperCase()} {selectedYear} REVENUE - COLLECTED IN {getCollectionMonth(selectedMonth).toUpperCase()} {selectedMonth === 'December' ? selectedYear + 1 : selectedYear})
              </h3>
            </div>

            {[1, 2, 3, 4].map(wk => {
              const wkReturns = currentMonthReturnsByWeek[wk as 1 | 2 | 3 | 4];
              const wkTotalLevy = wkReturns.reduce((sum, r) => sum + r.paymentAmount, 0);
              const wkTotalQty = wkReturns.reduce((sum, r) => sum + r.qty, 0);

              return (
                <div key={wk} className="space-y-2">
                  <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-700">WEEK {wk} COLLECTIONS</span>
                    <span className="text-[11px] font-bold text-slate-500">Total: <strong className="text-emerald-700">KES {formatNumber(wkTotalLevy)}</strong> ({formatNumber(wkTotalQty)} Kgs)</span>
                  </div>

                  {wkReturns.length === 0 ? (
                    <p className="text-center py-4 text-slate-400 text-xs italic font-semibold">No returns collected in Week {wk}.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-black uppercase text-[8px] tracking-widest">
                            <th className="p-3 w-10 text-center">NO</th>
                            <th className="p-3 w-32">Category</th>
                            <th className="p-3">Name of DBO</th>
                            <th className="p-3 w-16 text-center">Year</th>
                            <th className="p-3 w-20 text-center">Period</th>
                            <th className="p-3 text-right w-28">Qty (Kgs/L)</th>
                            <th className="p-3 text-right w-28">Levy Amt (Ksh)</th>
                            <th className="p-3 text-center w-24">Return Date</th>
                            <th className="p-3 text-center w-24">Payment Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {wkReturns.map((r, i) => {
                            const client = clients.find(c => c.id === r.clientId);
                            return (
                              <tr key={r.id} className="hover:bg-slate-50/20">
                                <td className="p-3 text-center text-slate-400 font-mono">{i + 1}</td>
                                <td className="p-3 text-[10px] font-black text-slate-400 uppercase">{client?.premiseCategory || 'Milk Bar'}</td>
                                <td className="p-3 font-bold text-slate-800">{r.clientName}</td>
                                <td className="p-3 text-center font-mono">{r.year}</td>
                                <td className="p-3 text-center font-bold text-slate-500 uppercase text-[10px]">{r.period}</td>
                                <td className="p-3 text-right font-mono">{formatNumber(r.qty)}</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-900">{formatNumber(r.paymentAmount)}</td>
                                <td className="p-3 text-center font-mono text-[10px] text-slate-500">{r.returnDate}</td>
                                <td className="p-3 text-center font-mono text-[10px] text-slate-500">{r.paymentDate}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        {/* 4. DEBT COLLECTED */}
        <div className="space-y-6 animate-in fade-in duration-300 pt-6 border-t border-slate-100">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
                IV. Debts Collected Within the Month (Arrears Recovery)
              </h3>
            </div>

            {[1, 2, 3, 4].map(wk => {
              const wkDebtReturns = debtReturnsByWeek[wk as 1 | 2 | 3 | 4];
              const wkTotalDebtLevy = wkDebtReturns.reduce((sum, r) => sum + r.paymentAmount, 0);

              return (
                <div key={wk} className="space-y-2">
                  <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-700">WEEK {wk} DEBT RECOVERY</span>
                    <span className="text-[11px] font-bold text-slate-500">Total Debt Collected: <strong className="text-emerald-700">KES {formatNumber(wkTotalDebtLevy)}</strong></span>
                  </div>

                  {wkDebtReturns.length === 0 ? (
                    <p className="text-center py-4 text-slate-400 text-xs italic font-semibold">No debt recoveries collected in Week {wk}.</p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-black uppercase text-[8px] tracking-widest">
                            <th className="p-3 w-10 text-center">NO</th>
                            <th className="p-3 w-32">Category</th>
                            <th className="p-3">Name of DBO</th>
                            <th className="p-3 w-16 text-center">Year</th>
                            <th className="p-3 w-20 text-center">Period</th>
                            <th className="p-3 text-right w-28">Qty (Kgs/L)</th>
                            <th className="p-3 text-right w-28">Levy Amt (Ksh)</th>
                            <th className="p-3 text-center w-24">Return Date</th>
                            <th className="p-3 text-center w-24">Payment Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {wkDebtReturns.map((r, i) => {
                            const client = clients.find(c => c.id === r.clientId);
                            return (
                              <tr key={r.id} className="hover:bg-slate-50/20">
                                <td className="p-3 text-center text-slate-400 font-mono">{i + 1}</td>
                                <td className="p-3 text-[10px] font-black text-slate-400 uppercase">{client?.premiseCategory || 'Milk Bar'}</td>
                                <td className="p-3 font-bold text-slate-800">{r.clientName}</td>
                                <td className="p-3 text-center font-mono">{r.year}</td>
                                <td className="p-3 text-center font-bold text-slate-500 uppercase text-[10px]">{r.period}</td>
                                <td className="p-3 text-right font-mono">{formatNumber(r.qty)}</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-900">{formatNumber(r.paymentAmount)}</td>
                                <td className="p-3 text-center font-mono text-[10px] text-slate-500">{r.returnDate}</td>
                                <td className="p-3 text-center font-mono text-[10px] text-slate-500">{r.paymentDate}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        {/* 5. PENDING PAYMENTS */}
        <div className="space-y-4 animate-in fade-in duration-300 pt-6 border-t border-slate-100">
            <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
              V. Pending Payments for the Month ({selectedMonth.toUpperCase()} {selectedYear})
            </h3>

            {pendingPayments.length === 0 ? (
              <p className="p-8 bg-emerald-50 rounded-2xl border border-emerald-100 text-center text-emerald-600 text-xs font-black uppercase tracking-wide">
                No pending payments for {selectedMonth}.
              </p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[8px] tracking-widest">
                      <th className="p-4 w-10 text-center">NO</th>
                      <th className="p-4 w-32">Category</th>
                      <th className="p-4">Name of DBO</th>
                      <th className="p-4 w-16 text-center">Year</th>
                      <th className="p-4 w-20 text-center">Period</th>
                      <th className="p-4 text-right w-28">Total Qty</th>
                      <th className="p-4 text-right w-28">Outstanding (Ksh)</th>
                      <th className="p-4 text-center w-28">Return Date</th>
                      <th className="p-4 text-center w-28">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {pendingPayments.map((r, i) => {
                      const client = clients.find(c => c.id === r.clientId);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/40">
                          <td className="p-4 text-center text-slate-400 font-mono">{i + 1}</td>
                          <td className="p-4 text-[10px] font-black text-slate-400 uppercase">{client?.premiseCategory || 'Milk Bar'}</td>
                          <td className="p-4 font-bold text-slate-800">{r.clientName}</td>
                          <td className="p-4 text-center font-mono">{r.year}</td>
                          <td className="p-4 text-center font-bold text-slate-500 uppercase text-[10px]">{r.period}</td>
                          <td className="p-4 text-right font-mono">{formatNumber(r.qty)}</td>
                          <td className="p-4 text-right font-mono font-bold text-rose-600">{formatNumber(r.outstandingBalance)}</td>
                          <td className="p-4 text-center font-mono text-[10px] text-slate-500">{r.returnDate || 'N/A'}</td>
                          <td className="p-4 text-center font-mono text-[10px] text-slate-500">{r.paymentDate || 'Unpaid'}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                      <td className="p-4 text-right uppercase text-[8px] tracking-wider" colSpan={5}>Total Pending:</td>
                      <td className="p-4 text-right font-mono">{formatNumber(totalPendingQty)}</td>
                      <td className="p-4 text-right font-mono text-rose-700">{formatNumber(totalPendingAmount)}</td>
                      <td className="p-4" colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

        {/* 6. CLIENTS WHO DO NOT QUALIFY TO FILE */}
        <div className="space-y-4 animate-in fade-in duration-300 pt-6 border-t border-slate-100">
            <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
              VI. Clients who do not Qualify to File Monthly Returns
            </h3>

            {dnqClients.length === 0 ? (
              <p className="p-6 bg-slate-50 rounded-xl text-center text-slate-400 text-xs italic">No clients registered with DNQ-R status currently.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[8px] tracking-widest">
                      <th className="p-4 w-10 text-center">NO</th>
                      <th className="p-4 w-40">Category</th>
                      <th className="p-4">Name of DBO</th>
                      <th className="p-4">Location</th>
                      <th className="p-4 text-right">Contact Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {dnqClients.map((c, i) => (
                      <tr key={c.id} className="hover:bg-slate-50/40">
                        <td className="p-4 text-center text-slate-400 font-mono">{i + 1}</td>
                        <td className="p-4 text-[10px] font-black text-slate-400 uppercase">{c.premiseCategory}</td>
                        <td className="p-4 font-bold text-slate-800">{c.clientName}</td>
                        <td className="p-4 text-slate-500">{c.location}, {c.county}</td>
                        <td className="p-4 text-right font-mono text-slate-500">{c.tel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        {/* 7. NON-REFLECTIVE ENTRIES */}
        <div className="space-y-4 animate-in fade-in duration-300 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
                <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
                VII. Non-Reflective Entries on ERP System
              </h3>
              <button
                onClick={handleAddNR}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 print:hidden"
              >
                <Plus size={10} /> Add Entry
              </button>
            </div>

            {nonReflectiveEntries.length === 0 ? (
              <p className="p-6 bg-slate-50 rounded-xl text-center text-slate-400 text-xs italic">No manual non-reflective entries defined yet.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[8px] tracking-widest">
                      <th className="p-4 w-10 text-center">NO</th>
                      <th className="p-4">Name of DBO</th>
                      <th className="p-4 w-48">Mpesa Ref/No</th>
                      <th className="p-4 text-right w-44">Amount (KES)</th>
                      <th className="p-4 w-12 text-center print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {nonReflectiveEntries.map((e, idx) => (
                      <tr key={e.id} className="hover:bg-slate-50/40">
                        <td className="p-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={e.dboName}
                            onChange={el => handleUpdateNR(e.id, 'dboName', el.target.value)}
                            placeholder="e.g. Kipkirui Dairies"
                            className="w-full bg-slate-50 px-3 py-2 rounded-xl border-none outline-none font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 print:bg-transparent print:p-0"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={e.mpesa}
                            onChange={el => handleUpdateNR(e.id, 'mpesa', el.target.value.toUpperCase())}
                            placeholder="e.g. SBL837A831"
                            className="w-full bg-slate-50 px-3 py-2 rounded-xl border-none outline-none font-bold text-xs text-slate-800 uppercase focus:bg-white focus:ring-2 focus:ring-emerald-500/10 print:bg-transparent print:p-0"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={e.amount || ''}
                            onChange={el => handleUpdateNR(e.id, 'amount', parseFloat(el.target.value) || 0)}
                            placeholder="0"
                            className="w-32 bg-slate-50 px-3 py-2 rounded-xl border-none outline-none font-bold text-xs text-right text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 print:bg-transparent print:p-0"
                          />
                        </td>
                        <td className="p-2 text-center print:hidden">
                          <button
                            onClick={() => handleRemoveNR(e.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-black text-slate-950 border-t border-slate-200">
                      <td className="p-4 text-right uppercase text-[8px] tracking-wider" colSpan={3}>Total Non-Reflective:</td>
                      <td className="p-4 text-right font-mono">KES {formatNumber(nonReflectiveEntries.reduce((sum, e) => sum + e.amount, 0))}</td>
                      <td className="p-4 print:hidden"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

        {/* 8. QUALIFYING CLIENTS WHO DID NOT FILE */}
        <div className="space-y-4 animate-in fade-in duration-300 pt-6 border-t border-slate-100">
            <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
              VIII. Qualifying Clients who Did Not File Monthly Returns ({selectedMonth.toUpperCase()} {selectedYear})
            </h3>

            {nonFilers.length === 0 ? (
              <p className="p-8 bg-emerald-50 rounded-2xl border border-emerald-100 text-center text-emerald-600 text-xs font-black uppercase tracking-wide">
                100% filing compliance achieved for this month!
              </p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[8px] tracking-widest">
                      <th className="p-4 w-10 text-center">NO</th>
                      <th className="p-4 w-40">Category</th>
                      <th className="p-4">Name of DBO</th>
                      <th className="p-4">Location</th>
                      <th className="p-4 text-right">Contact Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {nonFilers.map((c, i) => (
                      <tr key={c.id} className="hover:bg-slate-50/40">
                        <td className="p-4 text-center text-slate-400 font-mono">{i + 1}</td>
                        <td className="p-4 text-[10px] font-black text-slate-400 uppercase">{c.premiseCategory}</td>
                        <td className="p-4 font-bold text-slate-800">{c.clientName}</td>
                        <td className="p-4 text-slate-500">{c.location}, {c.county}</td>
                        <td className="p-4 text-right font-mono text-slate-500">{c.tel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        {/* COMPILER FOOTER / SIGNATURES (Apt for print view) */}
        <div className="grid grid-cols-2 gap-8 pt-10 border-t border-slate-200 font-bold text-xs text-slate-700">
          <div className="space-y-4">
            <p className="uppercase tracking-wide text-slate-400 text-[10px] font-black">Compiled by:</p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Name"
                value={compiledByName}
                onChange={e => setCompiledByName(e.target.value)}
                className="w-full bg-slate-50 px-3 py-1.5 rounded-xl border-none outline-none font-bold text-xs text-slate-800 focus:bg-white print:bg-transparent print:p-0"
              />
              <input
                type="text"
                placeholder="Designation"
                value={compiledByDesignation}
                onChange={e => setCompiledByDesignation(e.target.value)}
                className="w-full bg-slate-50/50 px-3 py-1 text-[10px] text-slate-500 font-semibold rounded-lg border-none outline-none focus:bg-white print:bg-transparent print:p-0"
              />
              <div className="space-y-3 pt-2">
                {/* SIGNATURE UPLOAD/DISPLAY */}
                <div className="print:border-none">
                  {compiledSignature ? (
                    <div className="relative h-14 flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-white p-1 print:border-none print:bg-transparent">
                      <img src={compiledSignature} alt="Compiled Signature" className="max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setCompiledSignature(null)}
                        className="absolute top-0 right-0 bg-rose-50 hover:bg-rose-100 text-rose-600 p-1 rounded-full text-[9px] font-black uppercase tracking-wider px-2 shadow-sm transition-all print:hidden"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <label className="h-14 flex flex-col items-center justify-center border border-dashed border-slate-200 hover:border-emerald-500 rounded-xl bg-slate-50/50 hover:bg-emerald-50/10 cursor-pointer transition-all print:border-b print:border-dashed print:border-slate-300 print:bg-transparent print:h-10 print:rounded-none">
                      <span className="text-[10px] text-slate-400 font-bold hover:text-emerald-600 flex items-center gap-1 print:hidden">
                        <Upload size={12} /> Upload Signature
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setCompiledSignature(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* DATE SELECTOR */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider shrink-0">Date:</span>
                  <input
                    type="date"
                    value={compiledDate}
                    onChange={e => setCompiledDate(e.target.value)}
                    className="w-full bg-slate-50 px-2 py-1 rounded-lg border-none outline-none text-xs font-mono text-slate-700 font-bold focus:bg-white print:bg-transparent print:p-0 print:border-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="uppercase tracking-wide text-slate-400 text-[10px] font-black">Checked by:</p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Name"
                value={checkedByName}
                onChange={e => setCheckedByName(e.target.value)}
                className="w-full bg-slate-50 px-3 py-1.5 rounded-xl border-none outline-none font-bold text-xs text-slate-800 focus:bg-white print:bg-transparent print:p-0"
              />
              <input
                type="text"
                placeholder="Designation"
                value={checkedByDesignation}
                onChange={e => setCheckedByDesignation(e.target.value)}
                className="w-full bg-slate-50/50 px-3 py-1 text-[10px] text-slate-500 font-semibold rounded-lg border-none outline-none focus:bg-white print:bg-transparent print:p-0"
              />
              <div className="space-y-3 pt-2">
                {/* SIGNATURE UPLOAD/DISPLAY */}
                <div className="print:border-none">
                  {checkedSignature ? (
                    <div className="relative h-14 flex items-center justify-center border border-dashed border-slate-200 rounded-xl bg-white p-1 print:border-none print:bg-transparent">
                      <img src={checkedSignature} alt="Checked Signature" className="max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setCheckedSignature(null)}
                        className="absolute top-0 right-0 bg-rose-50 hover:bg-rose-100 text-rose-600 p-1 rounded-full text-[9px] font-black uppercase tracking-wider px-2 shadow-sm transition-all print:hidden"
                      >
                        Clear
                      </button>
                    </div>
                  ) : (
                    <label className="h-14 flex flex-col items-center justify-center border border-dashed border-slate-200 hover:border-emerald-500 rounded-xl bg-slate-50/50 hover:bg-emerald-50/10 cursor-pointer transition-all print:border-b print:border-dashed print:border-slate-300 print:bg-transparent print:h-10 print:rounded-none">
                      <span className="text-[10px] text-slate-400 font-bold hover:text-emerald-600 flex items-center gap-1 print:hidden">
                        <Upload size={12} /> Upload Signature
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setCheckedSignature(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* DATE SELECTOR */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider shrink-0">Date:</span>
                  <input
                    type="date"
                    value={checkedDate}
                    onChange={e => setCheckedDate(e.target.value)}
                    className="w-full bg-slate-50 px-2 py-1 rounded-lg border-none outline-none text-xs font-mono text-slate-700 font-bold focus:bg-white print:bg-transparent print:p-0 print:border-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
        </>
      )}

    </div>
  );
};
