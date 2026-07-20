import * as XLSX from 'xlsx';

/**
 * Common Helper to write sheets to an excel file.
 */
function downloadWorkbook(sheets: { [name: string]: any[][] }, fileName: string) {
  const wb = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const safeSheetName = sheetName.substring(0, 31).replace(/[\\*?:/[\]]/g, '_');
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  }
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Monthly Report Excel Export
 */
export interface MonthlyExportData {
  selectedBranch: string;
  selectedMonth: string;
  selectedYear: number;
  reportingDate: string;
  weeklyTargets: number[];
  totalTargetCSL: number;
  currentMonthCSLGrossByWeek: { 1: number; 2: number; 3: number; 4: number };
  totalCurrentMonthCSL: number;
  varianceCSLByWeek: { 1: number; 2: number; 3: number; 4: number };
  totalVarianceCSL: number;
  debtCollectedAmountByWeek: { 1: number; 2: number; 3: number; 4: number };
  totalDebtRecovery: number;
  totalCollectionByWeek: { 1: number; 2: number; 3: number; 4: number };
  grandTotalCollection: number;
  varianceCollByWeek: { 1: number; 2: number; 3: number; 4: number };
  totalVarianceColl: number;
  proportionData: Array<{
    category: string;
    activeCount: number;
    makingCount: number;
    notMakingCount: number;
    percentageMaking: number;
    debtPayingCount: number;
    totalLitres: number;
  }>;
  totalsProportion: {
    activeCount: number;
    makingCount: number;
    notMakingCount: number;
    debtPayingCount: number;
    totalLitres: number;
  };
  totalPercentageMaking: number;
  totalPercentageNotMaking: number;
  pendingPayments: Array<{
    clientName: string;
    permitNo: string;
    premiseCategory: string;
    qty: number;
    paymentAmount: number;
    outstandingBalance: number;
  }>;
  nonFilers: Array<{
    clientName: string;
    permitNo: string;
    premiseCategory: string;
    phone: string;
    contactPerson: string;
  }>;
  nonReflectiveEntries: Array<{
    dboName: string;
    mpesa: string;
    amount: number;
  }>;
}

export function exportMonthlyReportToExcel(data: MonthlyExportData) {
  const {
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
    pendingPayments,
    nonFilers,
    nonReflectiveEntries
  } = data;

  const formattedRepDate = new Date(reportingDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
  const periodStr = `${selectedMonth.toUpperCase()} ${selectedYear}`;

  // === SHEET 1: Weekly Revenue Summary ===
  const sheet1Rows: any[][] = [
    [`${selectedBranch.toUpperCase()} REVENUE COLLECTION AND BUDGET EXECUTION REPORT (WEEKLY SUMMARY)`],
    [`REPORTING DATE: ${formattedRepDate}`, `PERIOD: ${periodStr}`],
    [],
    ['MONTH', 'REVENUE HEAD', 'WEEK 1', 'WEEK 2', 'WEEK 3', 'WEEK 4', 'TOTAL AMOUNT'],
    [
      selectedMonth.toUpperCase(),
      'CSL Collection Target',
      weeklyTargets[0],
      weeklyTargets[1],
      weeklyTargets[2],
      weeklyTargets[3],
      totalTargetCSL
    ],
    [
      '',
      'Gross Month CSL Collections',
      currentMonthCSLGrossByWeek[1],
      currentMonthCSLGrossByWeek[2],
      currentMonthCSLGrossByWeek[3],
      currentMonthCSLGrossByWeek[4],
      totalCurrentMonthCSL
    ],
    [
      '',
      'Monthly CSL Collections Variance',
      varianceCSLByWeek[1],
      varianceCSLByWeek[2],
      varianceCSLByWeek[3],
      varianceCSLByWeek[4],
      totalVarianceCSL
    ],
    [
      '',
      'Debt Collected (Arrears)',
      debtCollectedAmountByWeek[1],
      debtCollectedAmountByWeek[2],
      debtCollectedAmountByWeek[3],
      debtCollectedAmountByWeek[4],
      totalDebtRecovery
    ],
    [
      '',
      'Total Gross Collections (CSL + Debt)',
      totalCollectionByWeek[1],
      totalCollectionByWeek[2],
      totalCollectionByWeek[3],
      totalCollectionByWeek[4],
      grandTotalCollection
    ],
    [
      '',
      'Total Collections Variance',
      varianceCollByWeek[1],
      varianceCollByWeek[2],
      varianceCollByWeek[3],
      varianceCollByWeek[4],
      totalVarianceColl
    ],
    [
      '',
      'Target Execution Rate (%)',
      totalTargetCSL > 0 ? `${((currentMonthCSLGrossByWeek[1] / weeklyTargets[0]) * 100).toFixed(1)}%` : '-',
      totalTargetCSL > 0 ? `${((currentMonthCSLGrossByWeek[2] / weeklyTargets[1]) * 100).toFixed(1)}%` : '-',
      totalTargetCSL > 0 ? `${((currentMonthCSLGrossByWeek[3] / weeklyTargets[2]) * 100).toFixed(1)}%` : '-',
      totalTargetCSL > 0 ? `${((currentMonthCSLGrossByWeek[4] / weeklyTargets[3]) * 100).toFixed(1)}%` : '-',
      totalTargetCSL > 0 ? `${((totalCurrentMonthCSL / totalTargetCSL) * 100).toFixed(1)}%` : '-'
    ],
    [
      '',
      'Overall Execution Rate (%)',
      totalTargetCSL > 0 ? `${((totalCollectionByWeek[1] / weeklyTargets[0]) * 100).toFixed(1)}%` : '-',
      totalTargetCSL > 0 ? `${((totalCollectionByWeek[2] / weeklyTargets[1]) * 100).toFixed(1)}%` : '-',
      totalTargetCSL > 0 ? `${((totalCollectionByWeek[3] / weeklyTargets[2]) * 100).toFixed(1)}%` : '-',
      totalTargetCSL > 0 ? `${((totalCollectionByWeek[4] / weeklyTargets[3]) * 100).toFixed(1)}%` : '-',
      totalTargetCSL > 0 ? `${((grandTotalCollection / totalTargetCSL) * 100).toFixed(1)}%` : '-'
    ]
  ];

  // === SHEET 2: Category Statistics ===
  const sheet2Rows: any[][] = [
    [`${selectedBranch.toUpperCase()} PROPORTION OF DBOS SUMMARY & STATISTICS`],
    [`PERIOD: ${periodStr}`],
    [],
    [
      'PREMISE CATEGORY',
      'ACTIVE DBOs (A)',
      'DBOs FILING (B)',
      'DBOs NOT FILING (C = A - B)',
      'FILING COMPLIANCE RATE (%)',
      'DEBT PAYING DBOs',
      'TOTAL LITRES DECLARED'
    ]
  ];

  proportionData.forEach(row => {
    sheet2Rows.push([
      row.category,
      row.activeCount,
      row.makingCount,
      row.notMakingCount,
      `${row.percentageMaking}%`,
      row.debtPayingCount,
      row.totalLitres
    ]);
  });

  // Totals Row
  sheet2Rows.push([
    'TOTALS',
    totalsProportion.activeCount,
    totalsProportion.makingCount,
    totalsProportion.notMakingCount,
    `${totalPercentageMaking}%`,
    totalsProportion.debtPayingCount,
    totalsProportion.totalLitres
  ]);

  // === SHEET 3: Filing Compliance Details ===
  const sheet3Rows: any[][] = [
    [`${selectedBranch.toUpperCase()} INDIVIDUAL DBO FILING & OUTSTANDING LEVIES`],
    [`PERIOD: ${periodStr}`],
    [],
    ['DBO NAME', 'PERMIT NUMBER', 'CATEGORY', 'LITRES DECLARED', 'LEVY PAID (KES)', 'OUTSTANDING BAL (KES)', 'STATUS']
  ];

  pendingPayments.forEach(row => {
    sheet3Rows.push([
      row.clientName,
      row.permitNo,
      row.premiseCategory,
      row.qty,
      row.paymentAmount,
      row.outstandingBalance,
      'Outstanding Balance'
    ]);
  });

  if (pendingPayments.length === 0) {
    sheet3Rows.push(['No outstanding levies registered for this Month!']);
  }

  // === SHEET 4: Non Filers ===
  const sheet4Rows: any[][] = [
    [`${selectedBranch.toUpperCase()} OUTSTANDING NON-FILERS LIST`],
    [`PERIOD: ${periodStr}`],
    [],
    ['DBO NAME', 'PERMIT NO', 'PREMISE CATEGORY', 'CONTACT MOBILE', 'REPRESENTATIVE']
  ];

  nonFilers.forEach(row => {
    sheet4Rows.push([
      row.clientName,
      row.permitNo,
      row.premiseCategory,
      row.phone,
      row.contactPerson
    ]);
  });

  if (nonFilers.length === 0) {
    sheet4Rows.push(['All operating DBOs filed successfully. Perfect compliance!']);
  }

  // === SHEET 5: Non-Reflective Payments ===
  const sheet5Rows: any[][] = [
    [`${selectedBranch.toUpperCase()} NON-REFLECTIVE MPESA PAYMENTS & RECEIPTS`],
    [`PERIOD: ${periodStr}`],
    [],
    ['DBO NAME', 'M-PESA REFERENCE CODE', 'AMOUNT PAID (KES)']
  ];

  nonReflectiveEntries.forEach(row => {
    sheet5Rows.push([
      row.dboName,
      row.mpesa,
      row.amount
    ]);
  });

  if (nonReflectiveEntries.length === 0) {
    sheet5Rows.push(['No non-reflective transactions registered.']);
  }

  // Compile and download Workbook
  downloadWorkbook(
    {
      'Weekly Summary': sheet1Rows,
      'Category Stats': sheet2Rows,
      'Outstanding Balances': sheet3Rows,
      'Non-Filers List': sheet4Rows,
      'Non-Reflective Payments': sheet5Rows
    },
    `${selectedBranch.replace(/\s+/g, '_')}_Monthly_Report_${selectedMonth}_${selectedYear}`
  );
}

/**
 * Quarterly Report Excel Export
 */
export interface QuarterlyExportData {
  selectedBranch: string;
  selectedQuarter: string;
  selectedFY: string;
  reportingDate: string;
  quarterTarget: number;
  quarterGross: number;
  quarterDebt: number;
  quarterTotal: number;
  varianceCSL: number;
  varianceTotal: number;
  rateExclDebt: number;
  rateInclDebt: number;
  proportionData: Array<{
    category: string;
    activeCount: number;
    makingCount: number;
    percentageMaking: number;
    expectedSubmissions: number;
    actualSubmissions: number;
    submissionRate: number;
    totalLitres: number;
    totalLevy: number;
  }>;
  totalsProportion: {
    activeCount: number;
    makingCount: number;
    expectedSubmissions: number;
    actualSubmissions: number;
    totalLitres: number;
    totalLevy: number;
  };
  totalPercentageMaking: number;
  totalSubmissionRate: number;
  nonFilers: Array<{
    clientName: string;
    permitNo: string;
    premiseCategory: string;
    period: string;
    phone: string;
    contactPerson: string;
  }>;
  pendingReturns: Array<{
    clientName: string;
    permitNo: string;
    period: string;
    qty: number;
    paymentAmount: number;
    outstandingBalance: number;
    phone: string;
    contactPerson: string;
  }>;
}

export function exportQuarterlyReportToExcel(data: QuarterlyExportData) {
  const {
    selectedBranch,
    selectedQuarter,
    selectedFY,
    reportingDate,
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
    nonFilers,
    pendingReturns
  } = data;

  const formattedRepDate = new Date(reportingDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
  const periodStr = `${selectedQuarter} (FY ${selectedFY})`;

  // === Sheet 1: Executive Summary ===
  const summaryRows: any[][] = [
    [`${selectedBranch.toUpperCase()} QUARTERLY REVENUE EXECUTIVE SUMMARY`],
    [`REPORTING DATE: ${formattedRepDate}`, `PERIOD: ${periodStr}`],
    [],
    ['REVENUE METRIC', 'TARGET (KES)', 'ACTUALS (KES)', 'VARIANCE (KES)', 'EXECUTION RATE (%)'],
    ['Consumer Safety Levy (CSL Gross)', quarterTarget, quarterGross, varianceCSL, `${rateExclDebt.toFixed(1)}%`],
    ['Debt Recovery / Arrears', '-', quarterDebt, '-', '-'],
    ['Grand Total Revenue', quarterTarget, quarterTotal, varianceTotal, `${rateInclDebt.toFixed(1)}%`]
  ];

  // === Sheet 2: Category Statistics ===
  const statsRows: any[][] = [
    [`${selectedBranch.toUpperCase()} PROPORTION OF DBOS AND SUBMISSIONS BY CATEGORY`],
    [`PERIOD: ${periodStr}`],
    [],
    [
      'PREMISE CATEGORY',
      'ACTIVE DBOs (A)',
      'DBOs FILING (B)',
      '% ACTIVE FILING',
      'EXPECTED SUBMISSIONS (C)',
      'ACTUAL SUBMISSIONS (D)',
      'SUBMISSION RATE (D/C)',
      'TOTAL LITRES DECLARED',
      'TOTAL LEVY COLLECTED (KES)'
    ]
  ];

  proportionData.forEach(row => {
    statsRows.push([
      row.category,
      row.activeCount,
      row.makingCount,
      `${row.percentageMaking}%`,
      row.expectedSubmissions,
      row.actualSubmissions,
      `${row.submissionRate.toFixed(1)}%`,
      row.totalLitres,
      row.totalLevy
    ]);
  });

  statsRows.push([
    'TOTALS',
    totalsProportion.activeCount,
    totalsProportion.makingCount,
    `${totalPercentageMaking}%`,
    totalsProportion.expectedSubmissions,
    totalsProportion.actualSubmissions,
    `${totalSubmissionRate}%`,
    totalsProportion.totalLitres,
    totalsProportion.totalLevy
  ]);

  // === Sheet 3: Non-Filers ===
  const nonFilersRows: any[][] = [
    [`${selectedBranch.toUpperCase()} QUARTERLY NON-FILERS REPORT`],
    [`PERIOD: ${periodStr}`],
    [],
    ['DBO NAME', 'PERMIT NUMBER', 'PREMISE CATEGORY', 'MISSING PERIOD', 'CONTACT PHONE', 'REPRESENTATIVE']
  ];

  nonFilers.forEach(row => {
    nonFilersRows.push([
      row.clientName,
      row.permitNo,
      row.premiseCategory,
      row.period,
      row.phone,
      row.contactPerson
    ]);
  });

  if (nonFilers.length === 0) {
    nonFilersRows.push(['All qualifying clients are fully compliant for this Quarter!']);
  }

  // === Sheet 4: Outstanding Levies ===
  const outstandingRows: any[][] = [
    [`${selectedBranch.toUpperCase()} QUARTERLY OUTSTANDING LEVIES AND ARREARS`],
    [`PERIOD: ${periodStr}`],
    [],
    ['DBO NAME', 'PERMIT NUMBER', 'PERIOD', 'LITRES DECLARED', 'LEVY PAID (KES)', 'OUTSTANDING BAL (KES)', 'CONTACT PHONE', 'REPRESENTATIVE']
  ];

  pendingReturns.forEach(row => {
    outstandingRows.push([
      row.clientName,
      row.permitNo,
      row.period,
      row.qty,
      row.paymentAmount,
      row.outstandingBalance,
      row.phone,
      row.contactPerson
    ]);
  });

  if (pendingReturns.length === 0) {
    outstandingRows.push(['No outstanding levies registered for this Quarter!']);
  }

  downloadWorkbook(
    {
      'Executive Summary': summaryRows,
      'Category Stats': statsRows,
      'Non-Filers': nonFilersRows,
      'Outstanding Levies': outstandingRows
    },
    `${selectedBranch.replace(/\s+/g, '_')}_Quarterly_Report_${selectedQuarter}_FY_${selectedFY.replace('/', '_')}`
  );
}

/**
 * Half-Yearly Report Excel Export
 */
export interface HalfYearlyExportData {
  selectedBranch: string;
  selectedHalf: string;
  selectedFY: string;
  reportingDate: string;
  halfTarget: number;
  halfGross: number;
  halfDebt: number;
  halfTotal: number;
  varianceCSL: number;
  varianceTotal: number;
  rateExclDebt: number;
  rateInclDebt: number;
  proportionData: Array<{
    category: string;
    activeCount: number;
    makingCount: number;
    percentageMaking: number;
    expectedSubmissions: number;
    actualSubmissions: number;
    submissionRate: number;
    totalLitres: number;
    totalLevy: number;
  }>;
  totalsProportion: {
    activeCount: number;
    makingCount: number;
    expectedSubmissions: number;
    actualSubmissions: number;
    totalLitres: number;
    totalLevy: number;
  };
  totalPercentageMaking: number;
  totalSubmissionRate: number;
  nonFilers: Array<{
    clientName: string;
    permitNo: string;
    premiseCategory: string;
    period: string;
    phone: string;
    contactPerson: string;
  }>;
  pendingReturns: Array<{
    clientName: string;
    permitNo: string;
    period: string;
    qty: number;
    paymentAmount: number;
    outstandingBalance: number;
    phone: string;
    contactPerson: string;
  }>;
}

export function exportHalfYearlyReportToExcel(data: HalfYearlyExportData) {
  const {
    selectedBranch,
    selectedHalf,
    selectedFY,
    reportingDate,
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
    nonFilers,
    pendingReturns
  } = data;

  const formattedRepDate = new Date(reportingDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
  const periodStr = `${selectedHalf} (FY ${selectedFY})`;

  const summaryRows: any[][] = [
    [`${selectedBranch.toUpperCase()} HALF-YEARLY REVENUE EXECUTIVE SUMMARY`],
    [`REPORTING DATE: ${formattedRepDate}`, `PERIOD: ${periodStr}`],
    [],
    ['REVENUE METRIC', 'TARGET (KES)', 'ACTUALS (KES)', 'VARIANCE (KES)', 'EXECUTION RATE (%)'],
    ['Consumer Safety Levy (CSL Gross)', halfTarget, halfGross, varianceCSL, `${rateExclDebt.toFixed(1)}%`],
    ['Debt Recovery / Arrears', '-', halfDebt, '-', '-'],
    ['Grand Total Revenue', halfTarget, halfTotal, varianceTotal, `${rateInclDebt.toFixed(1)}%`]
  ];

  const statsRows: any[][] = [
    [`${selectedBranch.toUpperCase()} PROPORTION OF DBOS AND SUBMISSIONS BY CATEGORY`],
    [`PERIOD: ${periodStr}`],
    [],
    [
      'PREMISE CATEGORY',
      'ACTIVE DBOs (A)',
      'DBOs FILING (B)',
      '% ACTIVE FILING',
      'EXPECTED SUBMISSIONS (C)',
      'ACTUAL SUBMISSIONS (D)',
      'SUBMISSION RATE (D/C)',
      'TOTAL LITRES DECLARED',
      'TOTAL LEVY COLLECTED (KES)'
    ]
  ];

  proportionData.forEach(row => {
    statsRows.push([
      row.category,
      row.activeCount,
      row.makingCount,
      `${row.percentageMaking}%`,
      row.expectedSubmissions,
      row.actualSubmissions,
      `${row.submissionRate.toFixed(1)}%`,
      row.totalLitres,
      row.totalLevy
    ]);
  });

  statsRows.push([
    'TOTALS',
    totalsProportion.activeCount,
    totalsProportion.makingCount,
    `${totalPercentageMaking}%`,
    totalsProportion.expectedSubmissions,
    totalsProportion.actualSubmissions,
    `${totalSubmissionRate}%`,
    totalsProportion.totalLitres,
    totalsProportion.totalLevy
  ]);

  // === Sheet 3: Non-Filers ===
  const nonFilersRows: any[][] = [
    [`${selectedBranch.toUpperCase()} HALF-YEARLY NON-FILERS REPORT`],
    [`PERIOD: ${periodStr}`],
    [],
    ['DBO NAME', 'PERMIT NUMBER', 'PREMISE CATEGORY', 'MISSING PERIOD', 'CONTACT PHONE', 'REPRESENTATIVE']
  ];

  nonFilers.forEach(row => {
    nonFilersRows.push([
      row.clientName,
      row.permitNo,
      row.premiseCategory,
      row.period,
      row.phone,
      row.contactPerson
    ]);
  });

  if (nonFilers.length === 0) {
    nonFilersRows.push(['All qualifying clients are fully compliant for this Half Year!']);
  }

  const outstandingRows: any[][] = [
    [`${selectedBranch.toUpperCase()} HALF-YEARLY OUTSTANDING LEVIES AND ARREARS`],
    [`PERIOD: ${periodStr}`],
    [],
    ['DBO NAME', 'PERMIT NUMBER', 'PERIOD', 'LITRES DECLARED', 'LEVY PAID (KES)', 'OUTSTANDING BAL (KES)', 'CONTACT PHONE', 'REPRESENTATIVE']
  ];

  pendingReturns.forEach(row => {
    outstandingRows.push([
      row.clientName,
      row.permitNo,
      row.period,
      row.qty,
      row.paymentAmount,
      row.outstandingBalance,
      row.phone,
      row.contactPerson
    ]);
  });

  if (pendingReturns.length === 0) {
    outstandingRows.push(['No outstanding levies registered for this Half Year!']);
  }

  downloadWorkbook(
    {
      'Executive Summary': summaryRows,
      'Category Stats': statsRows,
      'Non-Filers': nonFilersRows,
      'Outstanding Levies': outstandingRows
    },
    `${selectedBranch.replace(/\s+/g, '_')}_HalfYear_Report_${selectedHalf}_FY_${selectedFY.replace('/', '_')}`
  );
}

/**
 * Annual Report Excel Export
 */
export interface AnnualExportData {
  selectedBranch: string;
  selectedFY: string;
  reportingDate: string;
  annualTarget: number;
  annualGross: number;
  annualDebt: number;
  annualTotal: number;
  varianceCSL: number;
  varianceTotal: number;
  rateExclDebt: number;
  rateInclDebt: number;
  proportionData: Array<{
    category: string;
    activeCount: number;
    makingCount: number;
    percentageMaking: number;
    expectedSubmissions: number;
    actualSubmissions: number;
    submissionRate: number;
    totalLitres: number;
    totalLevy: number;
  }>;
  totalsProportion: {
    activeCount: number;
    makingCount: number;
    expectedSubmissions: number;
    actualSubmissions: number;
    totalLitres: number;
    totalLevy: number;
  };
  totalPercentageMaking: number;
  totalSubmissionRate: number;
  nonFilers: Array<{
    clientName: string;
    permitNo: string;
    premiseCategory: string;
    period: string;
    phone: string;
    contactPerson: string;
  }>;
  pendingReturns: Array<{
    clientName: string;
    permitNo: string;
    period: string;
    qty: number;
    paymentAmount: number;
    outstandingBalance: number;
    phone: string;
    contactPerson: string;
  }>;
}

export function exportAnnualReportToExcel(data: AnnualExportData) {
  const {
    selectedBranch,
    selectedFY,
    reportingDate,
    annualTarget,
    annualGross,
    annualDebt,
    annualTotal,
    varianceCSL,
    varianceTotal,
    rateExclDebt,
    rateInclDebt,
    proportionData,
    totalsProportion,
    totalPercentageMaking,
    totalSubmissionRate,
    nonFilers,
    pendingReturns
  } = data;

  const formattedRepDate = new Date(reportingDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
  const periodStr = `FY ${selectedFY}`;

  const summaryRows: any[][] = [
    [`${selectedBranch.toUpperCase()} ANNUAL REVENUE EXECUTIVE SUMMARY`],
    [`REPORTING DATE: ${formattedRepDate}`, `PERIOD: ${periodStr}`],
    [],
    ['REVENUE METRIC', 'TARGET (KES)', 'ACTUALS (KES)', 'VARIANCE (KES)', 'EXECUTION RATE (%)'],
    ['Consumer Safety Levy (CSL Gross)', annualTarget, annualGross, varianceCSL, `${rateExclDebt.toFixed(1)}%`],
    ['Debt Recovery / Arrears', '-', annualDebt, '-', '-'],
    ['Grand Total Revenue', annualTarget, annualTotal, varianceTotal, `${rateInclDebt.toFixed(1)}%`]
  ];

  const statsRows: any[][] = [
    [`${selectedBranch.toUpperCase()} PROPORTION OF DBOS AND SUBMISSIONS BY CATEGORY`],
    [`PERIOD: ${periodStr}`],
    [],
    [
      'PREMISE CATEGORY',
      'ACTIVE DBOs (A)',
      'DBOs FILING (B)',
      '% ACTIVE FILING',
      'EXPECTED SUBMISSIONS (C)',
      'ACTUAL SUBMISSIONS (D)',
      'SUBMISSION RATE (D/C)',
      'TOTAL LITRES DECLARED',
      'TOTAL LEVY COLLECTED (KES)'
    ]
  ];

  proportionData.forEach(row => {
    statsRows.push([
      row.category,
      row.activeCount,
      row.makingCount,
      `${row.percentageMaking}%`,
      row.expectedSubmissions,
      row.actualSubmissions,
      `${row.submissionRate.toFixed(1)}%`,
      row.totalLitres,
      row.totalLevy
    ]);
  });

  statsRows.push([
    'TOTALS',
    totalsProportion.activeCount,
    totalsProportion.makingCount,
    `${totalPercentageMaking}%`,
    totalsProportion.expectedSubmissions,
    totalsProportion.actualSubmissions,
    `${totalSubmissionRate}%`,
    totalsProportion.totalLitres,
    totalsProportion.totalLevy
  ]);

  // === Sheet 3: Non-Filers ===
  const nonFilersRows: any[][] = [
    [`${selectedBranch.toUpperCase()} ANNUAL NON-FILERS REPORT`],
    [`PERIOD: ${periodStr}`],
    [],
    ['DBO NAME', 'PERMIT NUMBER', 'PREMISE CATEGORY', 'MISSING PERIOD', 'CONTACT PHONE', 'REPRESENTATIVE']
  ];

  nonFilers.forEach(row => {
    nonFilersRows.push([
      row.clientName,
      row.permitNo,
      row.premiseCategory,
      row.period,
      row.phone,
      row.contactPerson
    ]);
  });

  if (nonFilers.length === 0) {
    nonFilersRows.push(['All qualifying clients are fully compliant for this Financial Year!']);
  }

  const outstandingRows: any[][] = [
    [`${selectedBranch.toUpperCase()} ANNUAL OUTSTANDING LEVIES AND ARREARS`],
    [`PERIOD: ${periodStr}`],
    [],
    ['DBO NAME', 'PERMIT NUMBER', 'PERIOD', 'LITRES DECLARED', 'LEVY PAID (KES)', 'OUTSTANDING BAL (KES)', 'CONTACT PHONE', 'REPRESENTATIVE']
  ];

  pendingReturns.forEach(row => {
    outstandingRows.push([
      row.clientName,
      row.permitNo,
      row.period,
      row.qty,
      row.paymentAmount,
      row.outstandingBalance,
      row.phone,
      row.contactPerson
    ]);
  });

  if (pendingReturns.length === 0) {
    outstandingRows.push(['No outstanding levies registered for this Financial Year!']);
  }

  downloadWorkbook(
    {
      'Executive Summary': summaryRows,
      'Category Stats': statsRows,
      'Non-Filers': nonFilersRows,
      'Outstanding Levies': outstandingRows
    },
    `${selectedBranch.replace(/\s+/g, '_')}_Annual_Report_FY_${selectedFY.replace('/', '_')}`
  );
}
