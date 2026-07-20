import React, { useState, useEffect } from 'react';
import { LicensedClient, ClientReturn } from '../types';
import { exportHalfYearlyReportToExcel } from '../utils/excelExport';
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

interface HalfYearlyReportsViewProps {
  clients: LicensedClient[];
  returns: ClientReturn[];
}

export const HalfYearlyReportsView: React.FC<HalfYearlyReportsViewProps> = ({ clients, returns }) => {
  const [selectedFY, setSelectedFY] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  });
  const [selectedHalf, setSelectedHalf] = useState<string>('H2'); // Default to second half for June 2026 local time
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
  const halfOptions = [
    { value: 'H1', label: 'H1 (Jul - Dec)' },
    { value: 'H2', label: 'H2 (Jan - Jun)' }
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
        setAnnualTarget(2418192);
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

  // Get exact months for selected Half Year
  const getHalfYearMonths = (h: string, startY: number, endY: number) => {
    if (h === 'H1') {
      return [
        { name: 'July', year: startY },
        { name: 'August', year: startY },
        { name: 'September', year: startY },
        { name: 'October', year: startY },
        { name: 'November', year: startY },
        { name: 'December', year: startY }
      ];
    } else {
      return [
        { name: 'January', year: endY },
        { name: 'February', year: endY },
        { name: 'March', year: endY },
        { name: 'April', year: endY },
        { name: 'May', year: endY },
        { name: 'June', year: endY }
      ];
    }
  };

  const hMonths = getHalfYearMonths(selectedHalf, fyStartYear, fyEndYear);

  const halfYearlyValidationsCount = validations.filter(v => {
    const vYear = Number(v.year);
    return hMonths.some(qm => qm.name.toLowerCase() === v.period.toLowerCase() && Number(qm.year) === vYear) && v.status === 'Approved';
  }).length;

  const halfYearlyCumulativeDebt = (() => {
    if (hMonths.length === 0) return 0;
    const lastHMonth = hMonths[hMonths.length - 1];
    const lastHMonthIndex = monthsList.indexOf(lastHMonth.name);
    const lastHMonthYear = lastHMonth.year;
    return returns.filter(r => {
      const returnMonthIndex = monthsList.indexOf(r.period);
      const isPastOrSame = r.year < lastHMonthYear || (r.year === lastHMonthYear && returnMonthIndex <= lastHMonthIndex);
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

  // Compile individual month details for the selected Half Year
  const compiledMonths = hMonths.map(m => ({
    ...m,
    data: getMonthlyReportData(m.name, m.year)
  }));

  // Targets Configuration
  const halfTarget = annualTarget / 2;
  const monthTarget = annualTarget / 12;

  // Totals & Metrics for the Half Year
  const halfGross = compiledMonths.reduce((sum, m) => sum + m.data.gross, 0);
  const halfDebt = compiledMonths.reduce((sum, m) => sum + m.data.debt, 0);
  const halfTotal = halfGross + halfDebt;
  const halfQty = compiledMonths.reduce((sum, m) => sum + m.data.totalQty, 0);
  const halfOutstanding = compiledMonths.reduce((sum, m) => sum + m.data.outstanding, 0);

  const allHalfDebtClientIds = new Set(
    compiledMonths.flatMap(m => m.data.debtReturns.map(r => r.clientId))
  );
  const numHalfDebtPayingDBOs = allHalfDebtClientIds.size;

  const varianceCSL = halfTarget - halfGross;
  const varianceTotal = halfTarget - halfTotal;

  const rateExclDebt = halfTarget > 0 ? (halfGross / halfTarget) * 100 : 0;
  const rateInclDebt = halfTarget > 0 ? (halfTotal / halfTarget) * 100 : 0;

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

  const halfYearlyNonFilers: Array<{
    clientName: string;
    permitNo: string;
    premiseCategory: string;
    period: string;
    phone: string;
    contactPerson: string;
  }> = [];

  compiledMonths.forEach(m => {
    const qualifying_m = clients.filter(c => c.levyInfo === 'QFR' && isClientOperatingInPeriod(c, m.name, m.year));
    const filerIds_m = new Set(m.data.returns.map(r => r.clientId));
    const nonFilers_m = qualifying_m.filter(c => !filerIds_m.has(c.id));

    nonFilers_m.forEach(c => {
      halfYearlyNonFilers.push({
        clientName: c.clientName,
        permitNo: c.id,
        premiseCategory: c.premiseCategory,
        period: `${m.name} ${m.year}`,
        phone: c.tel || '-',
        contactPerson: c.contactPerson || '-'
      });
    });
  });

  // Active qualifying clients (using latest month of the half year)
  const latestMonthName = hMonths[5].name;
  const latestMonthYear = hMonths[5].year;
  const activeClients = clients.filter(c => isClientOperatingInPeriod(c, latestMonthName, latestMonthYear));
  const qualifyingClients = clients.filter(c => c.levyInfo === 'QFR' && isClientOperatingInPeriod(c, latestMonthName, latestMonthYear));

  // Proportion of DBOs and submissions per category
  const categoriesList: ('Milk Bar' | 'Dispenser' | 'Cooling Plant' | 'Mini Dairy' | 'Cottage Industry')[] = [
    'Milk Bar', 'Dispenser', 'Cooling Plant', 'Mini Dairy', 'Cottage Industry'
  ];

  const proportionData = categoriesList.map(cat => {
    const catQualifyingByMonth = compiledMonths.map(m => {
      const qualifying_m = clients.filter(c => c.levyInfo === 'QFR' && isClientOperatingInPeriod(c, m.name, m.year));
      return qualifying_m.filter(c => c.premiseCategory === cat);
    });

    // Combine all returns in the Half Year for this category
    const catReturns = compiledMonths.flatMap(m => m.data.returns).filter(r => {
      const client = clients.find(c => c.id === r.clientId);
      return client?.premiseCategory === cat;
    });

    const filerIds = new Set(catReturns.map(r => r.clientId));
    const catQualifyingUnion = Array.from(new Set(
      catQualifyingByMonth.flatMap(list => list.map(c => c.id))
    )).map(id => clients.find(c => c.id === id)!);

    const uniqueFilers = catQualifyingUnion.filter(c => filerIds.has(c.id));
    
    // Consistency Rate: Expected returns is sum of active count in each of the 6 months
    const expectedSubmissions = catQualifyingByMonth.reduce((sum, list) => sum + list.length, 0);
    const actualSubmissions = catReturns.length;
    const submissionRate = expectedSubmissions > 0 ? (actualSubmissions / expectedSubmissions) * 100 : 0;

    const totalLitres = catReturns.reduce((sum, r) => sum + r.qty, 0);
    const totalLevy = catReturns.reduce((sum, r) => sum + r.paymentAmount, 0);

    const activeCount = catQualifyingByMonth[5].length;

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

  // DBO Leaderboard (Top 5 contributors in the Half Year)
  const clientContributions = qualifyingClients.map(c => {
    const clientReturns = compiledMonths.flatMap(m => m.data.returns).filter(r => r.clientId === c.id);

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

  // Half-Yearly Pending/Outstanding Returns list
  const pendingReturns = compiledMonths.flatMap(m => m.data.returns).filter(r => r.outstandingBalance > 0);

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

    exportHalfYearlyReportToExcel({
      selectedBranch,
      selectedHalf,
      selectedFY,
      reportingDate: new Date().toISOString(),
      halfTarget,
      halfGross,
      halfDebt,
      halfTotal,
      varianceCSL,
      varianceTotal,
      rateExclDebt,
      rateInclDebt,
      proportionData,
      totalsProportion,
      totalPercentageMaking,
      totalSubmissionRate,
      nonFilers: halfYearlyNonFilers,
      pendingReturns: mappedPending
    });
  };

  return (
    <div className="space-y-6">
      {/* FILTER BAR FOR HALF-YEARLY REPORT (Hidden on print) */}
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
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Half Year Period</label>
          <select
            value={selectedHalf}
            onChange={e => setSelectedHalf(e.target.value)}
            className="w-full bg-white px-4 py-3 rounded-xl border border-slate-100 outline-none text-xs font-bold text-slate-800"
          >
            {halfOptions.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
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
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FY Annual Target (Ksh)</label>
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
          <Printer size={13} /> Export Half Year PDF
        </button>
      </div>

      {/* PRINTABLE HALF YEAR CONTAINER */}
      <div id="kdb-half-yearly-report-printable" className="bg-white p-2 sm:p-4 rounded-3xl border border-slate-100 shadow-sm print:shadow-none print:border-none print:p-0 space-y-10 text-slate-800">
        
        {/* REPORT HEADER */}
        <div className="text-center space-y-2 border-b border-slate-200 pb-6">
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase">
            {selectedBranch} Half-Year Revenue Collection and Budget Execution Report
          </h2>
          <div className="flex justify-between items-center text-xs font-mono text-slate-500 max-w-lg mx-auto">
            <span>REPORTING DATE: <strong className="text-slate-800">{new Date(reportingDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
            <span>PERIOD: <strong className="text-slate-800">{selectedHalf} (FY {selectedFY})</strong></span>
          </div>
        </div>

        {/* 1. EXECUTIVE SUMMARY SECTION */}
        <div className="space-y-4">
          <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-600 rounded"></span>
            I. Half-Yearly Executive Revenue Summary
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
                  <td className="p-4 text-right font-mono">{formatNumber(halfTarget)}</td>
                  <td className="p-4 text-right font-mono text-slate-800">{formatNumber(halfGross)}</td>
                  <td className="p-4 text-right font-mono text-rose-600">{formatNumber(varianceCSL)}</td>
                  <td className="p-4 text-center font-mono font-bold">{rateExclDebt.toFixed(1)}%</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-4">Debt Recovery / Arrears</td>
                  <td className="p-4 text-right font-mono text-slate-300">-</td>
                  <td className="p-4 text-right font-mono text-emerald-600">{formatNumber(halfDebt)}</td>
                  <td className="p-4 text-right font-mono text-slate-300">-</td>
                  <td className="p-4 text-center font-mono text-slate-300">-</td>
                </tr>
                <tr className="bg-slate-900 text-white font-black">
                  <td className="p-4">Grand Total Revenue</td>
                  <td className="p-4 text-right font-mono">{formatNumber(halfTarget)}</td>
                  <td className="p-4 text-right font-mono text-emerald-300">{formatNumber(halfTotal)}</td>
                  <td className="p-4 text-right font-mono text-rose-300">{formatNumber(varianceTotal)}</td>
                  <td className="p-4 text-center font-mono text-emerald-400">{rateInclDebt.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Explanatory notes */}
          <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2 text-[10px] font-medium text-slate-500 leading-relaxed">
            <h4 className="font-black text-slate-700 uppercase tracking-widest mb-1">Financial Performance Notes:</h4>
            <p>1. Financial Year (FY) target is configured independently per FY at KES <strong>{formatNumber(annualTarget)}</strong>. The half-yearly share is 50% (KES <strong>{formatNumber(halfTarget)}</strong>).</p>
            <p>2. Gross CSL represents revenue declared for the active months in the selected Half Year. Debt recovery represents previous periods' arrears collected during this period. During this half year, <strong>{numHalfDebtPayingDBOs}</strong> distinct DBO(s) paid outstanding arrears.</p>
            <p>3. A negative variance indicates performance has exceeded targets, whereas a positive variance shows shortfalls.</p>
            <p>4. <strong>Validations Counter:</strong> Successfully completed and submitted validation forms within this half-yearly timeline boundary: <strong className="text-emerald-700">{halfYearlyValidationsCount} form(s)</strong>.</p>
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
                  {compiledMonths.map(m => (
                    <tr key={`${m.name}-${m.year}`}>
                      <td className="p-4 font-bold text-slate-800 uppercase text-[10px] tracking-wider">{m.name} {m.year}</td>
                      <td className="p-4 text-center font-mono font-bold text-slate-600">{m.data.returns.length}</td>
                      <td className="p-4 text-right font-mono">{formatNumber(monthTarget)}</td>
                      <td className="p-4 text-right font-mono">{formatNumber(m.data.gross)}</td>
                      <td className="p-4 text-right font-mono text-emerald-600">{formatNumber(m.data.debt)}</td>
                      <td className="p-4 text-right font-mono font-bold">{formatNumber(m.data.total)}</td>
                      <td className="p-4 text-right font-mono text-rose-600">{formatNumber(monthTarget - m.data.gross)}</td>
                      <td className="p-4 text-center font-mono font-bold text-emerald-600">{(monthTarget > 0 ? (m.data.gross / monthTarget * 100) : 0).toFixed(0)}%</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-slate-900 text-white font-black">
                    <td className="p-4 uppercase text-[10px] tracking-wider">TOTALS</td>
                    <td className="p-4 text-center font-mono text-emerald-300">{compiledMonths.reduce((sum, m) => sum + m.data.returns.length, 0)}</td>
                    <td className="p-4 text-right font-mono">{formatNumber(halfTarget)}</td>
                    <td className="p-4 text-right font-mono">{formatNumber(halfGross)}</td>
                    <td className="p-4 text-right font-mono text-emerald-300">{formatNumber(halfDebt)}</td>
                    <td className="p-4 text-right font-mono font-bold bg-emerald-600 text-white">{formatNumber(halfTotal)}</td>
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
              IV. Pending Payments & Outstanding Levies in Selected Half Year
            </h3>

            {pendingReturns.length === 0 ? (
              <p className="p-8 bg-emerald-50 rounded-2xl border border-emerald-100 text-center text-emerald-600 text-xs font-black uppercase tracking-wide">
                No outstanding levies registered for this Half Year!
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
                      <td className="p-4 text-right uppercase text-[8px] tracking-wider" colSpan={4}>TOTAL OUTSTANDING FOR THE HALF YEAR:</td>
                      <td className="p-4 text-right font-mono">{formatNumber(pendingReturns.reduce((sum, r) => sum + r.qty, 0))}</td>
                      <td className="p-4 text-right font-mono text-rose-700 text-sm">KES {formatNumber(halfOutstanding)}</td>
                      <td className="p-4"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Half-Yearly KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{selectedHalf} Outstanding Balance</span>
                <span className="font-mono font-black text-sm text-slate-800 mt-2">KES {formatNumber(halfOutstanding)}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">Branch Debt for Current Half-Year</span>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col justify-between">
                <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest">Cumulative Branch Debt</span>
                <span className="font-mono font-black text-sm text-rose-600 mt-2">KES {formatNumber(halfYearlyCumulativeDebt)}</span>
                <span className="text-[8px] text-rose-400 font-bold uppercase mt-1">Up to end of {selectedHalf} {selectedFY}</span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Validations Counter</span>
                <span className="font-mono font-black text-sm text-emerald-600 mt-2">{halfYearlyValidationsCount} Form(s)</span>
                <span className="text-[8px] text-emerald-500 font-bold uppercase mt-1">Submitted & Approved in Half-Year</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Outstanding Levies</span>
                <span className="font-mono font-black text-sm text-slate-800 mt-2">KES {formatNumber(halfOutstanding + 153375)}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">Baseline + Half-Year Arrears</span>
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
