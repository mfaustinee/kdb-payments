import React, { useState, useEffect } from 'react';
import { LicensedClient, ClientReturn, DataValidation } from '../types';
import { FileText, TrendingUp, TrendingDown, DollarSign, Calendar, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';

interface CollectionAnalysisViewProps {
  clients: LicensedClient[];
  returns: ClientReturn[];
  validations: DataValidation[];
}

const MONTHS_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CollectionAnalysisView: React.FC<CollectionAnalysisViewProps> = ({ clients, returns, validations }) => {
  const [selectedFY, setSelectedFY] = useState<string>('2025/2026');
  const [timeline, setTimeline] = useState<'monthly' | 'quarterly' | 'half-yearly' | 'annual'>('monthly');
  
  // Specific period selections
  const [selectedMonth, setSelectedMonth] = useState<string>('April');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q4');
  const [selectedHalf, setSelectedHalf] = useState<string>('H2');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const [annualTarget, setAnnualTarget] = useState<number>(2418192);

  // Sync annual target based on financial year
  useEffect(() => {
    const key = `kdb_fy_target_${selectedFY}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setAnnualTarget(parseFloat(stored));
    } else {
      if (selectedFY === '2025/2026') {
        setAnnualTarget(2418192);
      } else if (selectedFY === '2024/2025') {
        setAnnualTarget(2200000);
      } else {
        setAnnualTarget(2400000);
      }
    }
  }, [selectedFY]);

  const fyStartYear = parseInt(selectedFY.split('/')[0], 10) || 2025;
  const fyEndYear = parseInt(selectedFY.split('/')[1], 10) || 2026;

  // Determine active months and years for selected timeline
  const getPeriodMonths = (): { name: string; year: number }[] => {
    if (timeline === 'monthly') {
      // Find matching year for month in fiscal year
      const isSecondHalf = ['January', 'February', 'March', 'April', 'May', 'June'].includes(selectedMonth);
      return [{ name: selectedMonth, year: isSecondHalf ? fyEndYear : fyStartYear }];
    }
    
    if (timeline === 'quarterly') {
      if (selectedQuarter === 'Q1') {
        return [
          { name: 'July', year: fyStartYear },
          { name: 'August', year: fyStartYear },
          { name: 'September', year: fyStartYear }
        ];
      }
      if (selectedQuarter === 'Q2') {
        return [
          { name: 'October', year: fyStartYear },
          { name: 'November', year: fyStartYear },
          { name: 'December', year: fyStartYear }
        ];
      }
      if (selectedQuarter === 'Q3') {
        return [
          { name: 'January', year: fyEndYear },
          { name: 'February', year: fyEndYear },
          { name: 'March', year: fyEndYear }
        ];
      }
      // Q4
      return [
        { name: 'April', year: fyEndYear },
        { name: 'May', year: fyEndYear },
        { name: 'June', year: fyEndYear }
      ];
    }

    if (timeline === 'half-yearly') {
      if (selectedHalf === 'H1') {
        return [
          { name: 'July', year: fyStartYear },
          { name: 'August', year: fyStartYear },
          { name: 'September', year: fyStartYear },
          { name: 'October', year: fyStartYear },
          { name: 'November', year: fyStartYear },
          { name: 'December', year: fyStartYear }
        ];
      }
      // H2
      return [
        { name: 'January', year: fyEndYear },
        { name: 'February', year: fyEndYear },
        { name: 'March', year: fyEndYear },
        { name: 'April', year: fyEndYear },
        { name: 'May', year: fyEndYear },
        { name: 'June', year: fyEndYear }
      ];
    }

    // Annual
    return [
      { name: 'July', year: fyStartYear },
      { name: 'August', year: fyStartYear },
      { name: 'September', year: fyStartYear },
      { name: 'October', year: fyStartYear },
      { name: 'November', year: fyStartYear },
      { name: 'December', year: fyStartYear },
      { name: 'January', year: fyEndYear },
      { name: 'February', year: fyEndYear },
      { name: 'March', year: fyEndYear },
      { name: 'April', year: fyEndYear },
      { name: 'May', year: fyEndYear },
      { name: 'June', year: fyEndYear }
    ];
  };

  const periodMonths = getPeriodMonths();

  // 1. Active registry for clients QFR
  // Clients are active & operational if they are operating, and marked QFR
  const qfrActiveClients = clients.filter(c => 
    c.levyInfo === 'QFR' && 
    c.operationalStatus === 'operating'
  );
  const activeRegistryCount = qfrActiveClients.length;

  // 2. compliant filings - submitted filings for the active period by QFR active clients
  const periodReturns = returns.filter(r => 
    periodMonths.some(pm => pm.name.toLowerCase() === r.period.toLowerCase() && r.year === pm.year)
  );

  const compliantFilings = periodReturns.filter(r => {
    const matchedClient = qfrActiveClients.find(c => c.id === r.clientId);
    return !!matchedClient;
  }).length;

  // 3. non compliant filings
  const nonCompliantFilings = Math.max(0, (activeRegistryCount * periodMonths.length) - compliantFilings);

  // 4. total submitted filings
  const totalSubmitted = periodReturns.length;

  // 5. fully paid filings
  const fullyPaidFilings = periodReturns.filter(r => r.outstandingBalance <= 0).length;

  // 6. filed with balances due
  const filedWithBalancesDue = periodReturns.filter(r => r.outstandingBalance > 0).length;

  // 7. arrears settled (prior period filings paid during this timeline)
  // An arrear payment is defined as a return where return period is PRIOR to this timeline's months, but paymentDate falls within this timeline's months.
  // Let's identify timeline month-year bounds to see if payment was made in this period.
  const isInPeriod = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return false;
    const mName = MONTHS_LIST[dateObj.getMonth()];
    const yr = dateObj.getFullYear();
    return periodMonths.some(pm => pm.name.toLowerCase() === mName.toLowerCase() && pm.year === yr);
  };

  const priorArrearsPaidReturns = returns.filter(r => {
    // Return period must be prior to the selected periods
    const isPrior = !periodMonths.some(pm => pm.name.toLowerCase() === r.period.toLowerCase() && r.year === pm.year);
    if (!isPrior) return false;

    // Payment must fall within this period
    return isInPeriod(r.paymentDate);
  });

  const arrearsSettledCount = priorArrearsPaidReturns.length;

  // 8. total paid dbos
  // Distinct clients who paid in this period (either current period return or prior arrears return)
  const currentPeriodPayingClientIds = periodReturns.filter(r => r.paymentAmount > 0).map(r => r.clientId);
  const arrearsPayingClientIds = priorArrearsPaidReturns.map(r => r.clientId);
  const distinctPaidDbos = new Set([...currentPeriodPayingClientIds, ...arrearsPayingClientIds]).size;

  // 9. arrears recovered (prior period payments amount)
  const arrearsRecoveredAmount = priorArrearsPaidReturns.reduce((sum, r) => sum + (r.paymentAmount || 0), 0);

  // 10. Gross Revenue (Current collection + Arrears recovered)
  const currentPeriodCollection = periodReturns.reduce((sum, r) => sum + (r.paymentAmount || 0), 0);
  const grossRevenue = currentPeriodCollection + arrearsRecoveredAmount;

  // 11. closing receivables (outstanding balance for returns in this period)
  const closingReceivables = periodReturns.reduce((sum, r) => sum + (r.outstandingBalance || 0), 0);

  // 12. cumulative debt balance (total arrears of all active/past clients of the branch up to the end of this period)
  // Sum of outstanding balance of all returns up to the latest month in this period
  const latestMonthIndexInPeriod = Math.max(...periodMonths.map(pm => MONTHS_LIST.indexOf(pm.name)));
  const latestYearInPeriod = Math.max(...periodMonths.map(pm => pm.year));

  const cumulativeDebtBalance = returns.filter(r => {
    const returnMonthIndex = MONTHS_LIST.indexOf(r.period);
    const isPastOrSameYear = r.year < latestYearInPeriod || 
      (r.year === latestYearInPeriod && returnMonthIndex <= latestMonthIndexInPeriod);
    return isPastOrSameYear && r.outstandingBalance > 0;
  }).reduce((sum, r) => sum + r.outstandingBalance, 0);

  // 13. Target calculation & collection target %
  const getPeriodTarget = (): number => {
    if (timeline === 'monthly') return annualTarget / 12;
    if (timeline === 'quarterly') return annualTarget / 4;
    if (timeline === 'half-yearly') return annualTarget / 2;
    return annualTarget;
  };
  const periodTarget = getPeriodTarget();
  const collectionTargetPercentage = periodTarget > 0 ? (grossRevenue / periodTarget) * 100 : 0;

  // 14. budget variance
  const budgetVariance = periodTarget - grossRevenue;

  // 15. validations submitted & approved in this period
  const validationsSubmitted = validations.filter(v => {
    return periodMonths.some(pm => pm.name.toLowerCase() === v.period.toLowerCase() && Number(v.year) === pm.year) && v.status === 'Approved';
  }).length;

  const formatCurrency = (val: number) => {
    return `KES ${val.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Selector controls card */}
      <div className="bg-slate-900 text-white p-6 rounded-[32px] border border-slate-800 shadow-2xl space-y-4 print:hidden">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <BarChart2 className="text-emerald-500" size={24} />
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">Collection Analysis Module</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Financial Compliance & Debt Analysis</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* Timeline filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analysis Timeline</label>
            <select
              value={timeline}
              onChange={e => {
                setTimeline(e.target.value as any);
              }}
              className="w-full bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl outline-none text-xs font-bold text-white cursor-pointer hover:bg-slate-750 transition-all"
            >
              <option value="monthly">Monthly Timeline</option>
              <option value="quarterly">Quarterly Timeline</option>
              <option value="half-yearly">Half-Year Timeline</option>
              <option value="annual">Annual Timeline</option>
            </select>
          </div>

          {/* FY selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Year</label>
            <select
              value={selectedFY}
              onChange={e => setSelectedFY(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl outline-none text-xs font-bold text-white cursor-pointer hover:bg-slate-750 transition-all"
            >
              <option value="2025/2026">FY 2025/2026</option>
              <option value="2024/2025">FY 2024/2025</option>
              <option value="2023/2024">FY 2023/2024</option>
            </select>
          </div>

          {/* Timeline Period selections */}
          {timeline === 'monthly' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Month</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl outline-none text-xs font-bold text-white cursor-pointer hover:bg-slate-750 transition-all"
              >
                {MONTHS_LIST.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {timeline === 'quarterly' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Quarter</label>
              <select
                value={selectedQuarter}
                onChange={e => setSelectedQuarter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl outline-none text-xs font-bold text-white cursor-pointer hover:bg-slate-750 transition-all"
              >
                <option value="Q1">Q1 (Jul - Sep)</option>
                <option value="Q2">Q2 (Oct - Dec)</option>
                <option value="Q3">Q3 (Jan - Mar)</option>
                <option value="Q4">Q4 (Apr - Jun)</option>
              </select>
            </div>
          )}

          {timeline === 'half-yearly' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Half-Year</label>
              <select
                value={selectedHalf}
                onChange={e => setSelectedHalf(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl outline-none text-xs font-bold text-white cursor-pointer hover:bg-slate-750 transition-all"
              >
                <option value="H1">H1 (Jul - Dec)</option>
                <option value="H2">H2 (Jan - Jun)</option>
              </select>
            </div>
          )}

          {/* KPI Target preview */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period Revenue Target</label>
            <div className="bg-slate-800 px-4 py-3 rounded-xl border border-slate-700 font-mono text-xs text-emerald-400 font-black flex items-center h-[42px]">
              {formatCurrency(periodTarget)}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Gross Revenue card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-[24px] shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">Gross Revenue</span>
            <DollarSign size={18} className="opacity-80" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black font-mono block">{formatCurrency(grossRevenue)}</span>
            <span className="text-[9px] text-emerald-100 font-bold uppercase tracking-widest block mt-1">CSL + ARREARS RECOVERED</span>
          </div>
        </div>

        {/* Collection Target Card */}
        <div className={`p-6 rounded-[24px] shadow-lg flex flex-col justify-between ${collectionTargetPercentage >= 100 ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800 border border-slate-100'}`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">Collection Performance</span>
            {collectionTargetPercentage >= 100 ? <TrendingUp size={18} className="text-emerald-400" /> : <TrendingDown size={18} className="text-rose-500" />}
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black font-mono block text-emerald-500">{collectionTargetPercentage.toFixed(1)}%</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mt-1">OF TARGET: {formatCurrency(periodTarget)}</span>
          </div>
        </div>

        {/* Closing Receivables Card */}
        <div className="bg-rose-50 border border-rose-100 text-rose-900 p-6 rounded-[24px] shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Closing Receivables</span>
            <ShieldAlert size={18} className="text-rose-600" />
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black font-mono block text-rose-600">{formatCurrency(closingReceivables)}</span>
            <span className="text-[9px] text-rose-400 font-bold uppercase tracking-widest block mt-1">FOR FILINGS IN THIS PERIOD</span>
          </div>
        </div>

        {/* Validations Counter Card */}
        <div className="bg-slate-50 border border-slate-100 text-slate-800 p-6 rounded-[24px] shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">Validations Counter</span>
            <FileText size={18} className="text-slate-600" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black font-mono block text-slate-800">{validationsSubmitted}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mt-1">APPROVED FOR THIS TIMELINE</span>
          </div>
        </div>
      </div>

      {/* Main Breakdown Summary Table */}
      <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Collection & Registry Analysis Summary</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Timeline: {timeline.toUpperCase()} ({selectedMonth} / {selectedQuarter} / {selectedHalf} {selectedFY})</p>
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white border px-3 py-1.5 rounded-full">
            Active Registry: <span className="font-extrabold text-slate-800">{activeRegistryCount} QFR</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                <th className="p-4 border-r">ANALYSIS METRIC FIELD</th>
                <th className="p-4 text-center">VALUE / METRIC STATUS</th>
                <th className="p-4">DESCRIPTION / EXPLANATORY DEFINITION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-semibold text-slate-700">
              {/* Active registry for clients QFR */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Active Registry (QFR Clients)</td>
                <td className="p-4 text-center font-mono text-emerald-600 font-bold bg-slate-50/40">{activeRegistryCount} clients</td>
                <td className="p-4 text-slate-500 text-[10px]">Count of licensed operating clients marked as QFR (Qualifying to File Returns).</td>
              </tr>

              {/* compliant filings */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Compliant Filings (Submitted)</td>
                <td className="p-4 text-center font-mono text-emerald-600 font-bold bg-slate-50/40">{compliantFilings} filings</td>
                <td className="p-4 text-slate-500 text-[10px]">Filings submitted by active QFR registry clients within this timeline boundary.</td>
              </tr>

              {/* non compliant filings */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Non-Compliant Filings (Defaulters)</td>
                <td className="p-4 text-center font-mono text-rose-600 font-bold bg-slate-50/40">{nonCompliantFilings} filings</td>
                <td className="p-4 text-slate-500 text-[10px]">Expected filings from active QFR registry clients that have not been submitted.</td>
              </tr>

              {/* total submitted */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Total Submitted Filings</td>
                <td className="p-4 text-center font-mono text-slate-800 font-bold bg-slate-50/40">{totalSubmitted} filings</td>
                <td className="p-4 text-slate-500 text-[10px]">Total number of returns recorded in this branch for the period.</td>
              </tr>

              {/* fully paid filings */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Fully Paid Filings</td>
                <td className="p-4 text-center font-mono text-emerald-600 font-bold bg-slate-50/40">{fullyPaidFilings} filings</td>
                <td className="p-4 text-slate-500 text-[10px]">Filings from the current period that have no outstanding balance.</td>
              </tr>

              {/* filed with balances due */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Filed with Balances Due</td>
                <td className="p-4 text-center font-mono text-rose-500 font-bold bg-slate-50/40">{filedWithBalancesDue} filings</td>
                <td className="p-4 text-slate-500 text-[10px]">Filings recorded with unpaid or partially paid outstanding balances.</td>
              </tr>

              {/* arrears settled (prior) */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Arrears Settled (Prior Periods)</td>
                <td className="p-4 text-center font-mono text-emerald-600 font-bold bg-slate-50/40">{arrearsSettledCount} records</td>
                <td className="p-4 text-slate-500 text-[10px]">Returns from prior periods whose payments were successfully settled during this timeline.</td>
              </tr>

              {/* total paid dbos */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Total Paid DBOs</td>
                <td className="p-4 text-center font-mono text-indigo-600 font-bold bg-slate-50/40">{distinctPaidDbos} DBOs</td>
                <td className="p-4 text-slate-500 text-[10px]">Unique count of Dairy Business Operators who made payments in this timeline.</td>
              </tr>

              {/* arrears recovered (amount) */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Arrears Recovered (Amount)</td>
                <td className="p-4 text-center font-mono text-emerald-600 font-bold bg-slate-50/40">{formatCurrency(arrearsRecoveredAmount)}</td>
                <td className="p-4 text-slate-500 text-[10px]">Sum of money collected towards resolving historic outstanding debts.</td>
              </tr>

              {/* Gross Revenue */}
              <tr className="bg-emerald-50/30">
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Gross Revenue</td>
                <td className="p-4 text-center font-mono text-emerald-700 font-black bg-emerald-50/50">{formatCurrency(grossRevenue)}</td>
                <td className="p-4 text-slate-500 text-[10px]">Total revenue recognized (Current Month Collections + Prior Arrears Collected).</td>
              </tr>

              {/* closing receivables */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Closing Receivables</td>
                <td className="p-4 text-center font-mono text-rose-600 font-bold bg-slate-50/40">{formatCurrency(closingReceivables)}</td>
                <td className="p-4 text-slate-500 text-[10px]">Total outstanding uncollected balance accrued from this specific period's filings.</td>
              </tr>

              {/* cumulative debt balance */}
              <tr className="bg-rose-50/10">
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Cumulative Debt Balance</td>
                <td className="p-4 text-center font-mono text-rose-700 font-black bg-rose-50/20">{formatCurrency(cumulativeDebtBalance)}</td>
                <td className="p-4 text-slate-500 text-[10px]">Total historical outstanding branch debt remaining uncollected up to this period.</td>
              </tr>

              {/* collection target % */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Collection Target %</td>
                <td className="p-4 text-center font-mono text-emerald-600 font-extrabold bg-slate-50/40">{collectionTargetPercentage.toFixed(2)}%</td>
                <td className="p-4 text-slate-500 text-[10px]">Actual collections efficiency rate compared against the target.</td>
              </tr>

              {/* budget variance */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Budget Variance</td>
                <td className={`p-4 text-center font-mono font-bold bg-slate-50/40 ${budgetVariance <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {budgetVariance <= 0 ? '-' : ''}{formatCurrency(Math.abs(budgetVariance))}
                </td>
                <td className="p-4 text-slate-500 text-[10px]">The variance against budget. Negative indicates surplus; positive indicates deficit.</td>
              </tr>

              {/* validations submitted */}
              <tr>
                <td className="p-4 border-r font-bold text-slate-900 uppercase tracking-tight text-[10px]">Validations Submitted</td>
                <td className="p-4 text-center font-mono text-slate-800 font-bold bg-slate-50/40">{validationsSubmitted} approved</td>
                <td className="p-4 text-slate-500 text-[10px]">Total validation forms successfully completed and submitted within this period.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
