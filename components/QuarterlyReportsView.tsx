import React, { useState, useEffect } from 'react';
import { LicensedClient, ClientReturn } from '../types';
import { exportQuarterlyReportToExcel } from '../utils/excelExport';
import { 
  FileText, 
  Printer, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  DollarSign,
  Award,
  Download,
  Upload
} from 'lucide-react';

interface QuarterlyReportsViewProps {
  clients: LicensedClient[];
  returns: ClientReturn[];
}

export const QuarterlyReportsView: React.FC<QuarterlyReportsViewProps> = ({ clients, returns }) => {
  const [selectedFY, setSelectedFY] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  });
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q4');
  const [annualTarget, setAnnualTarget] = useState<number>(2418192);
  const [reportingDate, setReportingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [compiledByName, setCompiledByName] = useState('Officer Name');
  const [compiledByDesignation, setCompiledByDesignation] = useState('Revenue Officer');
  const [checkedByName, setCheckedByName] = useState('Manager Name');
  const [checkedByDesignation, setCheckedByDesignation] = useState('Regional Manager');
  const [selectedBranch, setSelectedBranch] = useState<string>(() => localStorage.getItem('kdb_report_branch') || 'Kericho');

  const [compiledSignature, setCompiledSignature] = useState<string | null>(() => localStorage.getItem('kdb_compiled_sig') || null);
  const [checkedSignature, setCheckedSignature] = useState<string | null>(() => localStorage.getItem('kdb_checked_sig') || null);
  const [compiledDate, setCompiledDate] = useState<string>(() => localStorage.getItem('kdb_compiled_date') || new Date().toISOString().split('T')[0]);
  const [checkedDate, setCheckedDate] = useState<string>(() => localStorage.getItem('kdb_checked_date') || new Date().toISOString().split('T')[0]);

  const [validations, setValidations] = useState<any[]>([]);
  useEffect(() => {
    import('../services/db').then(mod => {
      mod.DBService.getValidations().then(res => setValidations(res));
    });
  }, []);

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

  const fyOptions = (() => {
    const startOptionYear = 2022;
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const latestFYStart = month >= 7 ? year : year - 1;
    
    const list: string[] = [];
    const endYearRange = latestFYStart + 1;
    for (let y = endYearRange; y >= startOptionYear; y--) {
      list.push(`${y}/${y + 1}`);
    }
    return list;
  })();
  const quarterOptions = [
    { value: 'Q1', label: 'Q1 (Jul - Sep)' },
    { value: 'Q2', label: 'Q2 (Oct - Dec)' },
    { value: 'Q3', label: 'Q3 (Jan - Mar)' },
    { value: 'Q4', label: 'Q4 (Apr - Jun)' }
  ];

  // Sync annual target for selected Financial Year independently
  useEffect(() => {
    const key = `kdb_fy_target_${selectedFY}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setAnnualTarget(parseFloat(stored));
    } else {
      // Default independent target for different FYs
      if (selectedFY === '2025/2026') {
        setAnnualTarget(2418192); // Default
      } else if (selectedFY === '2024/2025') {
        setAnnualTarget(2200000);
      } else {
        setAnnualTarget(2400000);
      }
    }
  }, [selectedFY]);

  const handleUpdateAnnualTarget = (val: number) => {
    setAnnualTarget(val);
    localStorage.setItem(`kdb_fy_target_${selectedFY}`, val.toString());
  };

  // Extract fiscal start and end years
  const fyStartYear = parseInt(selectedFY.split('/')[0], 10);
  const fyEndYear = parseInt(selectedFY.split('/')[1], 10) || (fyStartYear + 1);

  // Get exact months for selected Quarter
  const getQuarterMonths = (q: string, startY: number, endY: number) => {
    switch (q) {
      case 'Q1':
        return [
          { name: 'July', year: startY },
          { name: 'August', year: startY },
          { name: 'September', year: startY }
        ];
      case 'Q2':
        return [
          { name: 'October', year: startY },
          { name: 'November', year: startY },
          { name: 'December', year: startY }
        ];
      case 'Q3':
        return [
          { name: 'January', year: endY },
          { name: 'February', year: endY },
          { name: 'March', year: endY }
        ];
      case 'Q4':
      default:
        return [
          { name: 'April', year: endY },
          { name: 'May', year: endY },
          { name: 'June', year: endY }
        ];
    }
  };

  const qMonths = getQuarterMonths(selectedQuarter, fyStartYear, fyEndYear);

  const quarterlyValidationsCount = validations.filter(v => {
    const vYear = Number(v.year);
    return qMonths.some(qm => qm.name.toLowerCase() === v.period.toLowerCase() && Number(qm.year) === vYear) && v.status === 'Approved';
  }).length;

  const quarterlyCumulativeDebt = (() => {
    if (qMonths.length === 0) return 0;
    const lastQMonth = qMonths[qMonths.length - 1];
    const lastQMonthIndex = monthsList.indexOf(lastQMonth.name);
    const lastQMonthYear = lastQMonth.year;
    return returns.filter(r => {
      const returnMonthIndex = monthsList.indexOf(r.period);
      const isPastOrSame = r.year < lastQMonthYear || (r.year === lastQMonthYear && returnMonthIndex <= lastQMonthIndex);
      return isPastOrSame && r.outstandingBalance > 0;
    }).reduce((sum, r) => sum + r.outstandingBalance, 0);
  })();

  // Core Monthly Report Data Compiler for calculations
  const getMonthlyReportData = (mName: string, yr: number) => {
    const mReturns = returns.filter(r => 
      r.year === yr && 
      r.period.toLowerCase() === mName.toLowerCase()
    );
    
    const collMonthNum = (monthsList.indexOf(mName) + 1) % 12;
    const matchYr = mName === 'December' ? yr + 1 : yr;
    
    const dReturns = returns.filter(r => {
      const isPriorPeriod = r.year < yr || 
        (r.year === yr && monthsList.indexOf(r.period) < monthsList.indexOf(mName));
      if (!isPriorPeriod) return false;
      if (!r.paymentDate) return false;
      
      const pDate = new Date(r.paymentDate);
      if (isNaN(pDate.getTime())) {
        const parts = r.paymentDate.split(/[-/]/);
        if (parts.length === 3) {
          const m = parseInt(parts[1], 10);
          const y = parseInt(parts[2], 10);
          const reportCollMonthNum = collMonthNum + 1;
          return m === reportCollMonthNum && (y === matchYr || y === (matchYr % 100));
        }
        return false;
      }
      return (pDate.getMonth() + 1) === (collMonthNum + 1) && pDate.getFullYear() === matchYr;
    });

    const gross = mReturns.reduce((sum, r) => sum + r.paymentAmount, 0);
    const debt = dReturns.reduce((sum, r) => sum + r.paymentAmount, 0);
    const totalQty = mReturns.reduce((sum, r) => sum + r.qty, 0);
    const outstanding = mReturns.filter(r => r.outstandingBalance > 0).reduce((sum, r) => sum + r.outstandingBalance, 0);

    return {
      returns: mReturns,
      debtReturns: dReturns,
      gross,
      debt,
      total: gross + debt,
      totalQty,
      outstanding
    };
  };

  // Compile individual month details for the selected Quarter
  const m1Data = getMonthlyReportData(qMonths[0].name, qMonths[0].year);
  const m2Data = getMonthlyReportData(qMonths[1].name, qMonths[1].year);
  const m3Data = getMonthlyReportData(qMonths[2].name, qMonths[2].year);

  // Targets Configuration
  const quarterTarget = annualTarget / 4;
  const monthTarget = quarterTarget / 3;

  // Totals & Metrics for the Quarter
  const quarterGross = m1Data.gross + m2Data.gross + m3Data.gross;
  const quarterDebt = m1Data.debt + m2Data.debt + m3Data.debt;
  const quarterTotal = quarterGross + quarterDebt;
  const quarterQty = m1Data.totalQty + m2Data.totalQty + m3Data.totalQty;
  const quarterOutstanding = m1Data.outstanding + m2Data.outstanding + m3Data.outstanding;

  const m1DebtClientIds = m1Data.debtReturns.map(r => r.clientId);
  const m2DebtClientIds = m2Data.debtReturns.map(r => r.clientId);
  const m3DebtClientIds = m3Data.debtReturns.map(r => r.clientId);
  const allQuarterDebtClientIds = new Set([...m1DebtClientIds, ...m2DebtClientIds, ...m3DebtClientIds]);
  const numQuarterDebtPayingDBOs = allQuarterDebtClientIds.size;

  const varianceCSL = quarterTarget - quarterGross;
  const varianceTotal = quarterTarget - quarterTotal;

  const rateExclDebt = quarterTarget > 0 ? (quarterGross / quarterTarget) * 100 : 0;
  const rateInclDebt = quarterTarget > 0 ? (quarterTotal / quarterTarget) * 100 : 0;

  // Helper to check if a client was operating in a specific month and year
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

  // Compile individual month details for qualifying clients
  const qualifying_m1 = clients.filter(c => c.levyInfo === 'QFR' && isClientOperatingInPeriod(c, qMonths[0].name, qMonths[0].year));
  const qualifying_m2 = clients.filter(c => c.levyInfo === 'QFR' && isClientOperatingInPeriod(c, qMonths[1].name, qMonths[1].year));
  const qualifying_m3 = clients.filter(c => c.levyInfo === 'QFR' && isClientOperatingInPeriod(c, qMonths[2].name, qMonths[2].year));

  const filerIds_m1 = new Set(m1Data.returns.map(r => r.clientId));
  const filerIds_m2 = new Set(m2Data.returns.map(r => r.clientId));
  const filerIds_m3 = new Set(m3Data.returns.map(r => r.clientId));

  const nonFilers_m1 = qualifying_m1.filter(c => !filerIds_m1.has(c.id));
  const nonFilers_m2 = qualifying_m2.filter(c => !filerIds_m2.has(c.id));
  const nonFilers_m3 = qualifying_m3.filter(c => !filerIds_m3.has(c.id));

  const quarterlyNonFilers: Array<{
    clientName: string;
    permitNo: string;
    premiseCategory: string;
    period: string;
    phone: string;
    contactPerson: string;
  }> = [];

  nonFilers_m1.forEach(c => {
    quarterlyNonFilers.push({
      clientName: c.clientName,
      permitNo: c.id,
      premiseCategory: c.premiseCategory,
      period: `${qMonths[0].name} ${qMonths[0].year}`,
      phone: c.tel || '-',
      contactPerson: c.contactPerson || '-'
    });
  });

  nonFilers_m2.forEach(c => {
    quarterlyNonFilers.push({
      clientName: c.clientName,
      permitNo: c.id,
      premiseCategory: c.premiseCategory,
      period: `${qMonths[1].name} ${qMonths[1].year}`,
      phone: c.tel || '-',
      contactPerson: c.contactPerson || '-'
    });
  });

  nonFilers_m3.forEach(c => {
    quarterlyNonFilers.push({
      clientName: c.clientName,
      permitNo: c.id,
      premiseCategory: c.premiseCategory,
      period: `${qMonths[2].name} ${qMonths[2].year}`,
      phone: c.tel || '-',
      contactPerson: c.contactPerson || '-'
    });
  });

  // Active qualifying clients (using latest month or union for count)
  const activeClients = clients.filter(c => isClientOperatingInPeriod(c, qMonths[2].name, qMonths[2].year));
  const qualifyingClients = qualifying_m3;

  // Proportion of DBOs and submissions per category
  const categoriesList: ('Milk Bar' | 'Dispenser' | 'Cooling Plant' | 'Mini Dairy' | 'Cottage Industry')[] = [
    'Milk Bar', 'Dispenser', 'Cooling Plant', 'Mini Dairy', 'Cottage Industry'
  ];

  const proportionData = categoriesList.map(cat => {
    const catQualifying_m1 = qualifying_m1.filter(c => c.premiseCategory === cat);
    const catQualifying_m2 = qualifying_m2.filter(c => c.premiseCategory === cat);
    const catQualifying_m3 = qualifying_m3.filter(c => c.premiseCategory === cat);
    
    // Combine all returns in the Quarter for this category
    const catReturns = [
      ...m1Data.returns,
      ...m2Data.returns,
      ...m3Data.returns
    ].filter(r => {
      const client = clients.find(c => c.id === r.clientId);
      return client?.premiseCategory === cat;
    });

    const filerIds = new Set(catReturns.map(r => r.clientId));
    const catQualifyingUnion = Array.from(new Set([
      ...catQualifying_m1.map(c => c.id),
      ...catQualifying_m2.map(c => c.id),
      ...catQualifying_m3.map(c => c.id)
    ])).map(id => clients.find(c => c.id === id)!);

    const uniqueFilers = catQualifyingUnion.filter(c => filerIds.has(c.id));
    
    // Consistency Rate: Expected returns is sum of active count in each of the 3 months
    const expectedSubmissions = catQualifying_m1.length + catQualifying_m2.length + catQualifying_m3.length;
    const actualSubmissions = catReturns.length;
    const submissionRate = expectedSubmissions > 0 ? (actualSubmissions / expectedSubmissions) * 100 : 0;

    const totalLitres = catReturns.reduce((sum, r) => sum + r.qty, 0);
    const totalLevy = catReturns.reduce((sum, r) => sum + r.paymentAmount, 0);

    const activeCount = catQualifying_m3.length;

    return {
      category: cat,
      activeCount,
      makingCount: uniqueFilers.length,
      percentageMaking: activeCount > 0 ? Math.round((uniqueFilers.length / activeCount) * 100) : 0,
      expectedSubmissions,
      actualSubmissions,
      submissionRate,
      totalLitres,
      totalLevy
    };
  });

  const totalsProportion = {
    activeCount: proportionData.reduce((sum, d) => sum + d.activeCount, 0),
    makingCount: proportionData.reduce((sum, d) => sum + d.makingCount, 0),
    expectedSubmissions: proportionData.reduce((sum, d) => sum + d.expectedSubmissions, 0),
    actualSubmissions: proportionData.reduce((sum, d) => sum + d.actualSubmissions, 0),
    totalLitres: proportionData.reduce((sum, d) => sum + d.totalLitres, 0),
    totalLevy: proportionData.reduce((sum, d) => sum + d.totalLevy, 0),
  };

  const totalPercentageMaking = totalsProportion.activeCount > 0 
    ? Math.round((totalsProportion.makingCount / totalsProportion.activeCount) * 100)
    : 0;

  const totalSubmissionRate = totalsProportion.expectedSubmissions > 0
    ? Math.round((totalsProportion.actualSubmissions / totalsProportion.expectedSubmissions) * 100)
    : 0;

  // DBO Leaderboard (Top 5 contributors in the Quarter)
  const clientContributions = qualifyingClients.map(c => {
    const clientReturns = [
      ...m1Data.returns,
      ...m2Data.returns,
      ...m3Data.returns
    ].filter(r => r.clientId === c.id);

    const totalLevyPaid = clientReturns.reduce((sum, r) => sum + r.paymentAmount, 0);
    const totalLitres = clientReturns.reduce((sum, r) => sum + r.qty, 0);
    const submissionCount = clientReturns.length;

    return {
      client: c,
      totalLevyPaid,
      totalLitres,
      submissionCount
    };
  })
  .filter(item => item.totalLevyPaid > 0)
  .sort((a, b) => b.totalLevyPaid - a.totalLevyPaid)
  .slice(0, 5);

  // Quarterly Pending/Outstanding Returns list
  const pendingReturns = [
    ...m1Data.returns,
    ...m2Data.returns,
    ...m3Data.returns
  ].filter(r => r.outstandingBalance > 0);

  const formatNumber = (num: number): string => {
    if (num === 0) return '-';
    return new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(num);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const mappedPending = pendingReturns.map(r => {
      const client = clients.find(c => c.id === r.clientId);
      return {
        clientName: client?.clientName || 'Unknown DBO',
        permitNo: client?.id || '-',
        period: `${r.period} ${r.year}`,
        qty: r.qty,
        paymentAmount: r.paymentAmount,
        outstandingBalance: r.outstandingBalance,
        phone: client?.tel || '-',
        contactPerson: client?.contactPerson || '-'
      };
    });

    exportQuarterlyReportToExcel({
      selectedBranch,
      selectedQuarter,
      selectedFY,
      reportingDate: new Date().toISOString(),
      quarterTarget,
      quarterGross,
      quarterDebt,
      quarterTotal,
      varianceCSL,
      varianceTotal,
      rateExclDebt,
      rateInclDebt,
      proportionData,
      totalsProportion,
      totalPercentageMaking,
      totalSubmissionRate,
      nonFilers: quarterlyNonFilers,
      pendingReturns: mappedPending
    });
  };

  return (
    <div className="space-y-6">
      {/* FILTER BAR FOR QUARTERLY REPORT (Hidden on print) */}
      <div className="bg-slate-50/60 p-6 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-4 print:hidden">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch Name</label>
          <input
            type="text"
            value={selectedBranch}
            onChange={e => handleBranchChange(e.target.value)}
            placeholder="Branch Name"
            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 outline-none text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Year</label>
          <select
            value={selectedFY}
            onChange={e => setSelectedFY(e.target.value)}
            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 outline-none text-xs font-bold text-slate-800"
          >
            {fyOptions.map(fy => <option key={fy} value={fy}>FY {fy}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quarter Period</label>
          <select
            value={selectedQuarter}
            onChange={e => setSelectedQuarter(e.target.value)}
            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 outline-none text-xs font-bold text-slate-800"
          >
            {quarterOptions.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting Date</label>
          <input
            type="date"
            value={reportingDate}
            onChange={e => setReportingDate(e.target.value)}
            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 outline-none text-xs font-bold text-slate-800"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Independent FY Annual Target (Ksh)</label>
          <input
            type="number"
            value={annualTarget || ''}
            onChange={e => handleUpdateAnnualTarget(parseFloat(e.target.value) || 0)}
            placeholder="Configure FY Target"
            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 outline-none text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {/* PRINT CONTROLS SHORTCUT (Hidden on Print) */}
      <div className="flex justify-end gap-3 print:hidden">
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-md transition-all"
        >
          <Download size={13} /> Export Excel
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-md transition-all"
        >
          <Printer size={13} /> Export Quarterly PDF
        </button>
      </div>

      {/* PRINTABLE QUARTERLY CONTAINER */}
      <div id="kdb-quarterly-report-printable" className="bg-white p-2 sm:p-4 rounded-3xl border border-slate-100 shadow-sm print:shadow-none print:border-none print:p-0 space-y-10 text-slate-800">
        
        {/* REPORT HEADER */}
        <div className="text-center space-y-2 border-b border-slate-200 pb-6">
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase">
            {selectedBranch} Quarterly Revenue Collection and Budget Execution Report
          </h2>
          <div className="flex justify-between items-center text-xs font-mono text-slate-500 max-w-lg mx-auto">
            <span>REPORTING DATE: <strong className="text-slate-800">{new Date(reportingDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
            <span>PERIOD: <strong className="text-slate-800">{selectedQuarter} (FY {selectedFY})</strong></span>
          </div>
        </div>

        {/* 1. EXECUTIVE SUMMARY SECTION */}
        <div className="space-y-4">
          <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
            I. Quarterly Executive Revenue Summary
          </h3>

          {/* Performance analysis table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                  <th className="p-4">REVENUE METRIC</th>
                  <th className="p-4 text-right">TARGET (KES)</th>
                  <th className="p-4 text-right">ACTUALS (KES)</th>
                  <th className="p-4 text-right">VARIANCE (KES)</th>
                  <th className="p-4 text-center">EXECUTION RATE (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                <tr>
                  <td className="p-4">Consumer Safety Levy (CSL Gross)</td>
                  <td className="p-4 text-right font-mono">{formatNumber(quarterTarget)}</td>
                  <td className="p-4 text-right font-mono text-slate-800">{formatNumber(quarterGross)}</td>
                  <td className="p-4 text-right font-mono text-rose-600">{formatNumber(varianceCSL)}</td>
                  <td className="p-4 text-center font-mono font-bold">{rateExclDebt.toFixed(1)}%</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-4">Debt Recovery / Arrears</td>
                  <td className="p-4 text-right font-mono text-slate-300">-</td>
                  <td className="p-4 text-right font-mono text-emerald-600">{formatNumber(quarterDebt)}</td>
                  <td className="p-4 text-right font-mono text-slate-300">-</td>
                  <td className="p-4 text-center font-mono text-slate-300">-</td>
                </tr>
                <tr className="bg-slate-900 text-white font-black">
                  <td className="p-4">Grand Total Revenue</td>
                  <td className="p-4 text-right font-mono">{formatNumber(quarterTarget)}</td>
                  <td className="p-4 text-right font-mono text-emerald-300">{formatNumber(quarterTotal)}</td>
                  <td className="p-4 text-right font-mono text-rose-300">{formatNumber(varianceTotal)}</td>
                  <td className="p-4 text-center font-mono text-emerald-400">{rateInclDebt.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Explanatory notes */}
          <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2 text-[10px] font-medium text-slate-500 leading-relaxed">
            <h4 className="font-black text-slate-700 uppercase tracking-widest mb-1">Financial Performance Notes:</h4>
            <p>1. Financial Year (FY) target is configured independently per FY at KES <strong>{formatNumber(annualTarget)}</strong>. The quarterly share is 25% (KES <strong>{formatNumber(quarterTarget)}</strong>).</p>
            <p>2. Gross CSL represents revenue declared for the active months in the selected Quarter. Debt recovery represents previous quarters' arrears collected during this period. During this quarter, <strong>{numQuarterDebtPayingDBOs}</strong> distinct DBO(s) paid outstanding arrears.</p>
            <p>3. A negative variance indicates performance has exceeded targets, whereas a positive variance shows shortfalls.</p>
            <p>4. <strong>Validations Counter:</strong> Successfully completed and submitted validation forms within this quarter's timeline boundary: <strong className="text-emerald-700">{quarterlyValidationsCount} form(s)</strong>.</p>
          </div>
        </div>

        {/* 2. MONTHLY & CATEGORY BREAKDOWN SECTION */}
        <div className="space-y-6 pt-6 border-t border-slate-200">
          {/* Monthly breakdown */}
          <div className="space-y-3">
            <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
              II. Monthly Performance Breakdown
            </h3>
            
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                    <th className="p-4">MONTH</th>
                    <th className="p-4 text-center">FILINGS</th>
                    <th className="p-4 text-right">TARGET (CSL)</th>
                    <th className="p-4 text-right">ACTUAL CSL GROSS</th>
                    <th className="p-4 text-right">DEBT RECOVERY</th>
                    <th className="p-4 text-right">TOTAL COLLECTION</th>
                    <th className="p-4 text-right">VARIANCE (CSL)</th>
                    <th className="p-4 text-center">RATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                  {/* Month 1 */}
                  <tr>
                    <td className="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-wider">{qMonths[0].name} {qMonths[0].year}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-600">{m1Data.returns.length}</td>
                    <td className="p-4 text-right font-mono">{formatNumber(monthTarget)}</td>
                    <td className="p-4 text-right font-mono">{formatNumber(m1Data.gross)}</td>
                    <td className="p-4 text-right font-mono text-emerald-600">{formatNumber(m1Data.debt)}</td>
                    <td className="p-4 text-right font-mono font-bold">{formatNumber(m1Data.total)}</td>
                    <td className="p-4 text-right font-mono text-rose-600">{formatNumber(monthTarget - m1Data.gross)}</td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-600">{(monthTarget > 0 ? (m1Data.gross / monthTarget * 100) : 0).toFixed(0)}%</td>
                  </tr>
                  {/* Month 2 */}
                  <tr>
                    <td className="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-wider">{qMonths[1].name} {qMonths[1].year}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-600">{m2Data.returns.length}</td>
                    <td className="p-4 text-right font-mono">{formatNumber(monthTarget)}</td>
                    <td className="p-4 text-right font-mono">{formatNumber(m2Data.gross)}</td>
                    <td className="p-4 text-right font-mono text-emerald-600">{formatNumber(m2Data.debt)}</td>
                    <td className="p-4 text-right font-mono font-bold">{formatNumber(m2Data.total)}</td>
                    <td className="p-4 text-right font-mono text-rose-600">{formatNumber(monthTarget - m2Data.gross)}</td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-600">{(monthTarget > 0 ? (m2Data.gross / monthTarget * 100) : 0).toFixed(0)}%</td>
                  </tr>
                  {/* Month 3 */}
                  <tr>
                    <td className="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-wider">{qMonths[2].name} {qMonths[2].year}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-600">{m3Data.returns.length}</td>
                    <td className="p-4 text-right font-mono">{formatNumber(monthTarget)}</td>
                    <td className="p-4 text-right font-mono">{formatNumber(m3Data.gross)}</td>
                    <td className="p-4 text-right font-mono text-emerald-600">{formatNumber(m3Data.debt)}</td>
                    <td className="p-4 text-right font-mono font-bold">{formatNumber(m3Data.total)}</td>
                    <td className="p-4 text-right font-mono text-rose-600">{formatNumber(monthTarget - m3Data.gross)}</td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-600">{(monthTarget > 0 ? (m3Data.gross / monthTarget * 100) : 0).toFixed(0)}%</td>
                  </tr>
                  {/* Totals row */}
                  <tr className="bg-slate-900 text-white font-black">
                    <td className="p-4 uppercase text-[10px] tracking-wider">TOTALS</td>
                    <td className="p-4 text-center font-mono text-emerald-300">{m1Data.returns.length + m2Data.returns.length + m3Data.returns.length}</td>
                    <td className="p-4 text-right font-mono">{formatNumber(quarterTarget)}</td>
                    <td className="p-4 text-right font-mono">{formatNumber(quarterGross)}</td>
                    <td className="p-4 text-right font-mono text-emerald-300">{formatNumber(quarterDebt)}</td>
                    <td className="p-4 text-right font-mono font-bold bg-emerald-600 text-white">{formatNumber(quarterTotal)}</td>
                    <td className="p-4 text-right font-mono text-rose-300">{formatNumber(varianceCSL)}</td>
                    <td className="p-4 text-center font-mono text-emerald-300">{rateExclDebt.toFixed(0)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
              III. Category-wise Revenue & Volume Contribution
            </h3>
            
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[9px] tracking-widest">
                    <th className="p-4">PERMIT CATEGORY</th>
                    <th className="p-4 text-center">ACTIVE CLIENTS</th>
                    <th className="p-4 text-center">EXPECTED RETURNS</th>
                    <th className="p-4 text-center">SUBMITTED RETURNS</th>
                    <th className="p-4 text-center">SUBMISSION RATE (%)</th>
                    <th className="p-4 text-right">TOTAL LITRES</th>
                    <th className="p-4 text-right">LEVY COLLECTED (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                  {proportionData.map(d => (
                    <tr key={d.category} className="hover:bg-slate-50/40">
                      <td className="p-4 font-bold text-slate-800">{d.category}</td>
                      <td className="p-4 text-center font-mono">{d.activeCount}</td>
                      <td className="p-4 text-center font-mono text-slate-400">{d.expectedSubmissions}</td>
                      <td className="p-4 text-center font-mono text-emerald-600">{d.actualSubmissions}</td>
                      <td className="p-4 text-center font-mono font-bold">{d.submissionRate.toFixed(0)}%</td>
                      <td className="p-4 text-right font-mono">{formatNumber(d.totalLitres)}</td>
                      <td className="p-4 text-right font-mono text-slate-950">{formatNumber(d.totalLevy)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-950">
                    <td className="p-4 uppercase text-[9px] tracking-wider">TOTALS</td>
                    <td className="p-4 text-center font-mono">{totalsProportion.activeCount}</td>
                    <td className="p-4 text-center font-mono text-slate-300">{totalsProportion.expectedSubmissions}</td>
                    <td className="p-4 text-center font-mono text-emerald-300">{totalsProportion.actualSubmissions}</td>
                    <td className="p-4 text-center font-mono">{totalSubmissionRate}%</td>
                    <td className="p-4 text-right font-mono">{formatNumber(totalsProportion.totalLitres)}</td>
                    <td className="p-4 text-right font-mono bg-emerald-600 text-white">{formatNumber(totalsProportion.totalLevy)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. COMPLIANCE & OUTSTANDING LIST SECTION */}
        <div className="space-y-6 pt-6 border-t border-slate-200">
          {/* Outstanding Returns list */}
          <div className="space-y-3">
            <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-rose-600 rounded"></span>
              IV. Pending Payments & Outstanding Levies in Selected Quarter
            </h3>

            {pendingReturns.length === 0 ? (
              <p className="p-8 bg-emerald-50 rounded-2xl border border-emerald-100 text-center text-emerald-600 text-xs font-black uppercase tracking-wide">
                No outstanding levies registered for this Quarter!
              </p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[8px] tracking-widest">
                      <th className="p-4 w-10 text-center">NO</th>
                      <th className="p-4">NAME OF DBO</th>
                      <th className="p-4 w-32">CATEGORY</th>
                      <th className="p-4 w-24 text-center">PERIOD</th>
                      <th className="p-4 text-right w-28">QTY (KGS/L)</th>
                      <th className="p-4 text-right w-32">OUTSTANDING (KES)</th>
                      <th className="p-4 text-center w-28">DUE DATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {pendingReturns.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50/40">
                        <td className="p-4 text-center text-slate-400 font-mono">{i + 1}</td>
                        <td className="p-4 font-bold text-slate-800">{r.clientName}</td>
                        <td className="p-4 text-[10px] font-black text-slate-400 uppercase">
                          {clients.find(c => c.id === r.clientId)?.premiseCategory || 'Milk Bar'}
                        </td>
                        <td className="p-4 text-center text-[10px] font-black text-slate-500 uppercase">{r.period} {r.year}</td>
                        <td className="p-4 text-right font-mono">{formatNumber(r.qty)}</td>
                        <td className="p-4 text-right font-mono text-rose-600 font-black">{formatNumber(r.outstandingBalance)}</td>
                        <td className="p-4 text-center font-mono text-[10px] text-slate-400">{r.returnDate || '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-rose-50 font-black text-rose-950">
                      <td className="p-4 text-right uppercase text-[8px] tracking-wider" colSpan={4}>TOTAL OUTSTANDING FOR THE QUARTER:</td>
                      <td className="p-4 text-right font-mono">{formatNumber(pendingReturns.reduce((sum, r) => sum + r.qty, 0))}</td>
                      <td className="p-4 text-right font-mono text-rose-700 text-sm">KES {formatNumber(quarterOutstanding)}</td>
                      <td className="p-4"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Quarterly KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{selectedQuarter} Outstanding Balance</span>
                <span className="font-mono font-black text-sm text-slate-800 mt-2">KES {formatNumber(quarterOutstanding)}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">Branch Debt for Current Quarter</span>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col justify-between">
                <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest">Cumulative Branch Debt</span>
                <span className="font-mono font-black text-sm text-rose-600 mt-2">KES {formatNumber(quarterlyCumulativeDebt)}</span>
                <span className="text-[8px] text-rose-400 font-bold uppercase mt-1">Up to end of {selectedQuarter} {selectedFY}</span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Validations Counter</span>
                <span className="font-mono font-black text-sm text-emerald-600 mt-2">{quarterlyValidationsCount} Form(s)</span>
                <span className="text-[8px] text-emerald-500 font-bold uppercase mt-1">Submitted & Approved in Quarter</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Outstanding Levies</span>
                <span className="font-mono font-black text-sm text-slate-800 mt-2">KES {formatNumber(quarterOutstanding + 153375)}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">Baseline + Quarter Arrears</span>
              </div>
            </div>
          </div>
        </div>

        {/* SIGNATURE SIGN-OFFS (Apt for print view) */}
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
    </div>
  );
};
