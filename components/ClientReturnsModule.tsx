import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DBService } from '../services/db';
import { LicensedClient, ClientReturn, DebtorRecord, Installment, ArrearItem } from '../types';
import { numberToWords } from '../utils/numberToWords';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Database, 
  Upload, 
  Download, 
  Search, 
  X, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Briefcase, 
  MapPin, 
  Phone, 
  Loader2, 
  Printer, 
  ChevronRight, 
  FileSpreadsheet, 
  HelpCircle,
  Clock,
  ArrowUpRight,
  Filter,
  DollarSign,
  ExternalLink,
  UserPlus,
  PenTool
} from 'lucide-react';

interface ClientReturnsModuleProps {
  debtors?: DebtorRecord[];
  onDebtorUpdate?: (updated: DebtorRecord[]) => void;
  onRefresh?: () => void;
}

export const ClientReturnsModule: React.FC<ClientReturnsModuleProps> = ({
  debtors: propDebtors,
  onDebtorUpdate,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<LicensedClient[]>([]);
  const [returns, setReturns] = useState<ClientReturn[]>([]);
  const [localDebtors, setLocalDebtors] = useState<DebtorRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'registry' | 'debtors' | 'statements'>('registry');

  // Search & Filter state for returns registry
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // New/Edit Return modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingReturn, setEditingReturn] = useState<ClientReturn | null>(null);

  // Form Fields
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [returnYear, setReturnYear] = useState<number>(new Date().getFullYear());
  const [returnPeriod, setReturnPeriod] = useState<string>('January');
  const [qty, setQty] = useState<number>(0);
  const [invoiceAmount, setInvoiceAmount] = useState<number>(0);
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [txnRef, setTxnRef] = useState<string>('');
  const [lessCF, setLessCF] = useState<number>(0);
  const [comments, setComments] = useState<string>('');
  const [overrideStatus, setOverrideStatus] = useState<'Fully Paid' | 'Partially Paid' | 'Unpaid' | 'Auto'>('Auto');
  const [overrideReason, setOverrideReason] = useState<string>('');

  // CSV Bulk Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedReturns, setParsedReturns] = useState<ClientReturn[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState<boolean>(false);

  // Debtor Determination state
  const [debtorFilterYear, setDebtorFilterYear] = useState<string>('All');
  const [debtorFilterMonth, setDebtorFilterMonth] = useState<string>('All');
  const [debtorSearchQuery, setDebtorSearchQuery] = useState<string>('');
  const [debtorSubView, setDebtorSubView] = useState<'non-filers' | 'debtors-ledger'>('non-filers');

  // Statement client selection state
  const [selectedStatementClientId, setSelectedStatementClientId] = useState<string>('');
  const [statementFilterYear, setStatementFilterYear] = useState<string>('All');
  const [statementSearchQuery, setStatementSearchQuery] = useState<string>('');

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  // Ensure we cover up to currentYear + 2 so future years are always active and ready as soon as we cross over, down to 2022
  const yearsList = Array.from(
    { length: Math.max(5, (currentYear + 2) - 2022 + 1) },
    (_, i) => (currentYear + 2) - i
  );

  const getIntegratedDebtors = (): DebtorRecord[] => {
    const baseDebtors = propDebtors || localDebtors;
    const outstandingByClient: Record<string, ClientReturn[]> = {};
    
    returns.forEach(ret => {
      if (ret.outstandingBalance > 0) {
        if (!outstandingByClient[ret.clientId]) {
          outstandingByClient[ret.clientId] = [];
        }
        outstandingByClient[ret.clientId].push(ret);
      }
    });

    const integrated: DebtorRecord[] = JSON.parse(JSON.stringify(baseDebtors));

    Object.entries(outstandingByClient).forEach(([clientId, rets]) => {
      const client = clients.find(c => c.id === clientId);
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

    return Array.from(new Map(integrated.map(d => [d.id, d])).values());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedClients, fetchedReturns, fetchedDebtors] = await Promise.all([
        DBService.getClients(),
        DBService.getReturns(),
        DBService.getDebtors()
      ]);
      setClients(fetchedClients);
      setReturns(fetchedReturns);
      setLocalDebtors(fetchedDebtors);
      
      if (fetchedClients.length > 0 && !selectedStatementClientId) {
        setSelectedStatementClientId(fetchedClients[0].id);
      }
      onRefresh?.();
    } catch (error) {
      console.error("Error fetching returns dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill return values based on select client in the form
  useEffect(() => {
    if (selectedClientId && !editingReturn) {
      // Find latest return for client to help autocomplete fields
      const clientReturns = returns.filter(r => r.clientId === selectedClientId);
      if (clientReturns.length > 0) {
        // Sort by date/year/period descending
        const latest = clientReturns[0]; // just as a reference
        setComments(`Return for ${latest.clientName}`);
      }
    }
  }, [selectedClientId]);

  const openAddModal = (clientId?: string, year?: number, month?: string) => {
    setEditingReturn(null);
    setSelectedClientId(clientId || (clients[0]?.id || ''));
    setReturnYear(year || new Date().getFullYear());
    setReturnPeriod(month || 'January');
    setQty(0);
    setInvoiceAmount(0);
    setReturnDate(new Date().toISOString().slice(0, 10));
    setPaymentAmount(0);
    setPaymentDate('');
    setTxnRef('');
    setLessCF(0);
    setComments('');
    setOverrideStatus('Auto');
    setOverrideReason('');
    setIsModalOpen(true);
  };

  const openEditModal = (ret: ClientReturn) => {
    setEditingReturn(ret);
    setSelectedClientId(ret.clientId);
    setReturnYear(ret.year);
    setReturnPeriod(ret.period);
    setQty(ret.qty);
    setInvoiceAmount(ret.invoiceAmount);
    setReturnDate(ret.returnDate);
    setPaymentAmount(ret.paymentAmount);
    setPaymentDate(ret.paymentDate || '');
    setTxnRef(ret.txnRef);
    setLessCF(ret.lessCF);
    setComments(ret.comments);
    
    const calculatedOutstanding = ret.invoiceAmount - ret.paymentAmount - ret.lessCF;
    if (calculatedOutstanding > 0 && calculatedOutstanding < 100) {
      const defaultStatus = ret.paymentAmount > 0 ? 'Partially Paid' : 'Unpaid';
      if (ret.paymentStatus !== defaultStatus) {
        setOverrideStatus(ret.paymentStatus);
        const match = ret.comments.match(/\[Override Reason: (.*?)\]/);
        setOverrideReason(match ? match[1] : '');
      } else {
        setOverrideStatus('Auto');
        setOverrideReason('');
      }
    } else {
      setOverrideStatus('Auto');
      setOverrideReason('');
    }
    
    setIsModalOpen(true);
  };

  const handleDeleteReturn = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this return record?")) return;
    try {
      await DBService.deleteReturn(id);
      await fetchData();
    } catch (error) {
      console.error("Failed to delete return:", error);
      alert("Error deleting return record.");
    }
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Please select a client.");
      return;
    }

    const clientObj = clients.find(c => c.id === selectedClientId);
    if (!clientObj) {
      alert("Selected client is invalid.");
      return;
    }

    // Dynamic calculations
    let outstanding = invoiceAmount - paymentAmount - lessCF;
    const calculatedOutstanding = outstanding;
    const isEligibleForOverride = calculatedOutstanding > 0 && calculatedOutstanding < 100;
    
    // Determine payment status
    let status: 'Fully Paid' | 'Partially Paid' | 'Unpaid' = 'Unpaid';
    if (outstanding <= 0) {
      status = 'Fully Paid';
    } else if (paymentAmount > 0) {
      status = 'Partially Paid';
    }

    let finalComments = comments || `Filing return for ${returnPeriod} ${returnYear}`;
    if (isEligibleForOverride && overrideStatus !== 'Auto') {
      status = overrideStatus as 'Fully Paid' | 'Partially Paid' | 'Unpaid';
      if (overrideStatus === 'Fully Paid') {
        outstanding = 0; // write off the small balance!
      }
      
      const overrideTag = `[Override Status: ${overrideStatus}] [Override Reason: ${overrideReason}]`;
      if (!finalComments.includes(overrideTag)) {
        finalComments = finalComments ? `${finalComments} ${overrideTag}` : overrideTag;
      }
    }

    // Calculate aging days
    let aging = 0;
    if (outstanding > 0 && returnDate) {
      const retDateObj = new Date(returnDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - retDateObj.getTime());
      aging = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const returnObj: ClientReturn = {
      id: editingReturn ? editingReturn.id : `RET-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      clientId: selectedClientId,
      clientName: clientObj.clientName,
      year: returnYear,
      period: returnPeriod,
      qty,
      invoiceAmount,
      returnDate,
      paymentAmount,
      paymentDate,
      txnRef,
      lessCF,
      outstandingBalance: outstanding,
      agingDays: aging,
      paymentStatus: status,
      comments: finalComments
    };

    try {
      await DBService.saveReturn(returnObj);
      setIsModalOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Failed to save return:", error);
      alert("Error saving return details. Please try again.");
    }
  };

  // CSV Parsing
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        setImportErrors(["The uploaded file is empty or missing data lines."]);
        setParsedReturns([]);
        return;
      }

      const expectedHeaders = [
        'clientname',
        'year',
        'period',
        'qty',
        'invoiceamount',
        'returndate',
        'paymentamount',
        'paymentdate',
        'txnref',
        'lesscf',
        'outstandingbalance',
        'agingdays',
        'paymentstatus',
        'comments'
      ];

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
      
      if (headers.length < expectedHeaders.length || !expectedHeaders.every((h, idx) => headers[idx] === h)) {
        setImportErrors([
          `Invalid CSV columns or order. The CSV must contain these exact columns in this specific order and spelling:\n` +
          expectedHeaders.join(', ')
        ]);
        setParsedReturns([]);
        return;
      }

      const records: ClientReturn[] = [];
      const errors: string[] = [];
      const csvKeys = new Set<string>();

      // Helper to normalize strings for comparison (removes all spacing, punctuation, non-breaking spaces)
      const normalizeForMatching = (str: string): string => {
        if (!str) return '';
        return str
          .toLowerCase()
          .replace(/[\s\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/g, '')
          .replace(/[^a-z0-9]/g, '');
      };

      // Helper to match full month names
      const normalizePeriod = (val: string): string => {
        if (!val) return 'January';
        const trimmed = val.trim().toLowerCase();
        const match = monthsList.find(m => m.toLowerCase() === trimmed || m.toLowerCase().slice(0, 3) === trimmed);
        return match || 'January';
      };

      const parseCleanFloat = (val: string): number => {
        if (!val) return 0;
        const clean = val.replace(/,/g, '').trim();
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
      };

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]).map(v => v.replace(/^["']|["']$/g, '').trim());
        if (values.length < expectedHeaders.length) continue;

        const rowNum = i + 1;
        const csvClientName = values[0];
        
        const rawYear = values[1];
        let yearVal = parseInt(rawYear.replace(/,/g, ''));
        if (isNaN(yearVal)) {
          const match = rawYear.match(/\b(19|20)\d{2}\b/);
          if (match) {
            yearVal = parseInt(match[0]);
          }
        }

        const rawPeriod = values[2];
        const periodVal = normalizePeriod(rawPeriod);

        const qtyVal = parseCleanFloat(values[3]);
        const invoiceVal = parseCleanFloat(values[4]);
        const retDateVal = values[5] || new Date().toISOString().slice(0, 10);
        const payVal = parseCleanFloat(values[6]);
        const payDateVal = values[7] || null;
        const refVal = values[8];
        const cfVal = parseCleanFloat(values[9]);
        const rawOutstanding = values[10];
        const rawAging = values[11];
        const rawPayStatus = values[12];
        const commsVal = values[13];

        if (!csvClientName) {
          errors.push(`Row ${rowNum}: Client Name is required.`);
          continue;
        }

        // Match against existing licensed clients (highly robust case-insensitive & fuzzy)
        const csvClientNameClean = csvClientName.toLowerCase();
        let matchedClient = clients.find(c => 
          (c.clientName || '').trim().toLowerCase() === csvClientNameClean ||
          (c.premiseName || '').trim().toLowerCase() === csvClientNameClean
        );

        if (!matchedClient) {
          // Try normalized match (no spacing, punctuation, or special spaces)
          const csvClientNameNorm = normalizeForMatching(csvClientName);
          matchedClient = clients.find(c => 
            normalizeForMatching(c.clientName) === csvClientNameNorm ||
            normalizeForMatching(c.premiseName) === csvClientNameNorm
          );
        }

        if (!matchedClient) {
          // Try fuzzy includes/included match (if clean key has length >= 4)
          const csvClientNameNorm = normalizeForMatching(csvClientName);
          if (csvClientNameNorm.length >= 4) {
            matchedClient = clients.find(c => {
              const cNameNorm = normalizeForMatching(c.clientName);
              const pNameNorm = normalizeForMatching(c.premiseName);
              return (
                cNameNorm.includes(csvClientNameNorm) || 
                csvClientNameNorm.includes(cNameNorm) ||
                pNameNorm.includes(csvClientNameNorm) ||
                csvClientNameNorm.includes(pNameNorm)
              );
            });
          }
        }

        if (!matchedClient) {
          // Token/Word overlap match
          const stopWords = ['dairy', 'dairies', 'cooperative', 'co-op', 'coop', 'ltd', 'limited', 'society', 'fc', 'group', 'plant', 'bar', 'dispenser', 'outlet', 'depot', 'station'];
          const getWords = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stopWords.includes(w));
          const csvWords = getWords(csvClientName);
          if (csvWords.length > 0) {
            matchedClient = clients.find(c => {
              const clientWords = getWords(c.clientName);
              const premiseWords = getWords(c.premiseName);
              // Check if any significant word intersects
              const hasClientOverlap = csvWords.some(w => clientWords.includes(w));
              const hasPremiseOverlap = csvWords.some(w => premiseWords.includes(w));
              return hasClientOverlap || hasPremiseOverlap;
            });
          }
        }

        if (!matchedClient) {
          errors.push(`Row ${rowNum}: Could not find a registered client matching "${csvClientName}". Go to the Clients tab to add them first.`);
          continue;
        }

        if (isNaN(yearVal) || yearVal < 1980 || yearVal > 2030) {
          errors.push(`Row ${rowNum}: Invalid Year "${rawYear}". Must be a number between 1980 and 2030.`);
          continue;
        }

        if (!monthsList.includes(periodVal)) {
          errors.push(`Row ${rowNum}: Invalid Period "${rawPeriod}". Must be a valid month (e.g., January, February).`);
          continue;
        }

        const uniqueKey = `${matchedClient.id}-${yearVal}-${periodVal}`;
        if (csvKeys.has(uniqueKey)) {
          errors.push(`Row ${rowNum}: Duplicate entry within the CSV file for "${matchedClient.clientName}" - ${periodVal} ${yearVal}.`);
          continue;
        }
        csvKeys.add(uniqueKey);

        const dbDuplicateExists = returns.some(r => 
          r.clientId === matchedClient.id && 
          r.year === yearVal && 
          r.period.toLowerCase() === periodVal.toLowerCase()
        );
        if (dbDuplicateExists) {
          errors.push(`Row ${rowNum}: Duplicate entry. A return for "${matchedClient.clientName}" - ${periodVal} ${yearVal} already exists in the database.`);
          continue;
        }

        // Outstanding balance calculation
        const outstanding = rawOutstanding ? parseCleanFloat(rawOutstanding) : (invoiceVal - payVal - cfVal);
        
        // Aging Days calculation
        let aging = 0;
        if (rawAging) {
          aging = parseInt(rawAging.replace(/,/g, '')) || 0;
        } else if (outstanding > 0 && retDateVal) {
          const retDateObj = new Date(retDateVal);
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - retDateObj.getTime());
          aging = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Payment status calculation
        let status: 'Fully Paid' | 'Partially Paid' | 'Unpaid' = 'Unpaid';
        if (rawPayStatus && ['Fully Paid', 'Partially Paid', 'Unpaid'].includes(rawPayStatus)) {
          status = rawPayStatus as any;
        } else {
          if (outstanding <= 0) {
            status = 'Fully Paid';
          } else if (payVal > 0) {
            status = 'Partially Paid';
          }
        }

        const returnId = `RET-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        records.push({
          id: returnId,
          clientId: matchedClient.id,
          clientName: matchedClient.clientName,
          year: yearVal,
          period: periodVal,
          qty: isNaN(qtyVal) ? 0 : qtyVal,
          invoiceAmount: isNaN(invoiceVal) ? 0 : invoiceVal,
          returnDate: retDateVal,
          paymentAmount: isNaN(payVal) ? 0 : payVal,
          paymentDate: payDateVal,
          txnRef: refVal,
          lessCF: isNaN(cfVal) ? 0 : cfVal,
          outstandingBalance: outstanding,
          agingDays: aging,
          paymentStatus: status,
          comments: commsVal || `Imported return for ${periodVal} ${yearVal}`
        });
      }

      setParsedReturns(records);
      setImportErrors(errors);
    };
    reader.readAsText(file);
  };

  const downloadReturnsTemplate = () => {
    const headers = [
      'clientname',
      'year',
      'period',
      'qty',
      'invoiceamount',
      'returndate',
      'paymentamount',
      'paymentdate',
      'txnref',
      'lesscf',
      'outstandingbalance',
      'agingdays',
      'paymentstatus',
      'comments'
    ];
    const rows = [
      [
        'Brookside Kericho Depot',
        '2026',
        'March',
        '12000',
        '24000',
        '2026-03-15',
        '24000',
        '2026-03-20',
        'MPESA-REF123',
        '0',
        '0',
        '0',
        'Fully Paid',
        'Paid in full'
      ],
      [
        'Kapsoit Milk Bar',
        '2026',
        'April',
        '4500',
        '9000',
        '2026-04-10',
        '5000',
        '2026-04-12',
        'MR-10022',
        '0',
        '4000',
        '15',
        'Partially Paid',
        'Balance outstanding'
      ]
    ];
    const csvRows = [headers.join(',')];
    rows.forEach(row => {
      const formatted = row.map(val => {
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(formatted.join(','));
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "kdb_returns_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImportSubmit = async () => {
    if (parsedReturns.length === 0) {
      alert("No valid records to import.");
      return;
    }
    setImporting(true);
    try {
      await DBService.saveReturnsBulk(parsedReturns);
      setIsImportModalOpen(false);
      setCsvFile(null);
      setParsedReturns([]);
      setImportErrors([]);
      await fetchData();
      alert(`Successfully imported ${parsedReturns.length} returns!`);
    } catch (error) {
      console.error("Bulk import failed:", error);
      alert("Failed to complete bulk import. Please check connection and try again.");
    } finally {
      setImporting(false);
    }
  };

  const exportAllReturnsCSV = () => {
    if (returns.length === 0) {
      alert("No returns to export.");
      return;
    }
    const headers = [
      'id',
      'clientId',
      'clientName',
      'year',
      'period',
      'qty',
      'invoiceAmount',
      'returnDate',
      'paymentAmount',
      'paymentDate',
      'txnRef',
      'lessCF',
      'outstandingBalance',
      'agingDays',
      'paymentStatus',
      'comments'
    ];
    const rows = returns.map(ret => [
      ret.id,
      ret.clientId,
      ret.clientName,
      ret.year,
      ret.period,
      ret.qty,
      ret.invoiceAmount,
      ret.returnDate,
      ret.paymentAmount,
      ret.paymentDate || '',
      ret.txnRef,
      ret.lessCF,
      ret.outstandingBalance,
      ret.agingDays,
      ret.paymentStatus,
      ret.comments
    ]);
    const csvRows = [headers.join(',')];
    rows.forEach(row => {
      const formatted = row.map(val => {
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(formatted.join(','));
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kdb_returns_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportNonFilersCSV = (missingList: { client: LicensedClient; missingPeriods: { year: number; month: string }[] }[]) => {
    if (missingList.length === 0) {
      alert("No non-filers to export.");
      return;
    }
    const headers = [
      'Client Name',
      'Premise Name',
      'Contact Person',
      'Phone Number',
      'Location',
      'County',
      'Premise Category',
      'Missing Periods'
    ];
    const rows = missingList.map(item => [
      item.client.clientName,
      item.client.premiseName,
      item.client.contactPerson,
      item.client.tel || '',
      item.client.location,
      item.client.county,
      item.client.premiseCategory,
      item.missingPeriods.map(p => `${p.month} ${p.year}`).join(', ')
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
    link.setAttribute("download", `kdb_non_filers_${debtorFilterMonth}_${debtorFilterYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportReturnsDebtorsCSV = () => {
    const debtorClients: { clientName: string; premiseName: string; tel: string; location: string; county: string; outstandingBalance: number; periods: string }[] = [];
    
    const outstandingByClient: Record<string, any[]> = {};
    returns.forEach(r => {
      if (r.outstandingBalance > 0) {
        if (!outstandingByClient[r.clientId]) {
          outstandingByClient[r.clientId] = [];
        }
        outstandingByClient[r.clientId].push(r);
      }
    });

    Object.entries(outstandingByClient).forEach(([clientId, rets]) => {
      const client = clients.find(c => c.id === clientId);
      const totalOutstanding = rets.reduce((sum, r) => sum + r.outstandingBalance, 0);
      if (totalOutstanding > 0) {
        debtorClients.push({
          clientName: client ? client.clientName : rets[0].clientName,
          premiseName: client ? client.premiseName : 'Unknown Premise',
          tel: client ? client.tel : 'No Phone',
          location: client ? client.location : 'Unknown Location',
          county: client ? client.county : 'Unknown County',
          outstandingBalance: totalOutstanding,
          periods: rets.map(r => `${r.period} ${r.year}`).join('; ')
        });
      }
    });

    if (debtorClients.length === 0) {
      alert("No returns debtors to export.");
      return;
    }

    const headers = [
      'Client Name',
      'Premise Name',
      'Phone Number',
      'Location',
      'County',
      'Outstanding Balance (KES)',
      'Debtor Periods'
    ];

    const rows = debtorClients.map(d => [
      d.clientName,
      d.premiseName,
      d.tel,
      d.location,
      d.county,
      d.outstandingBalance,
      d.periods
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
    link.setAttribute("download", `kdb_returns_debtors_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Determine Unfiled Periods for a client
  const getUnfiledPeriodsForClient = (client: LicensedClient) => {
    if (client.levyInfo !== 'QFR') return [];

    let startY = client.startYear || 2024;
    if (startY < 2015 || startY > new Date().getFullYear() + 2) {
      startY = 2024; // Guard against crazy start years like 0 or 202
    }
    const startMIdx = Math.max(0, monthsList.indexOf(client.startMonth || 'January'));
    
    const today = new Date();
    const currentY = today.getFullYear();
    const currentMIdx = today.getMonth(); // 0 - 11

    const endY = currentY;
    const endMIdx = currentMIdx;

    const unfiledList: { year: number; month: string }[] = [];

    // Loop through year by year, month by month since client start
    for (let y = startY; y <= endY; y++) {
      const startM = (y === startY) ? startMIdx : 0;
      const endM = (y === endY) ? endMIdx : 11;

      for (let m = startM; m <= endM; m++) {
        const monthName = monthsList[m];
        
        // Check if there is a filed return for this client, year, month
        const returnExists = returns.some(r => 
          r.clientId === client.id && 
          r.year === y && 
          r.period === monthName
        );

        if (!returnExists) {
          unfiledList.push({ year: y, month: monthName });
        }
      }
    }

    return unfiledList;
  };

  // Determine ALL clients who have not filed returns for a specific target Year and Month
  const getUnfiledReturnsByPeriod = (year: number, month: string) => {
    const qfrClients = clients.filter(c => c.levyInfo === 'QFR' && c.operationalStatus === 'operating');
    
    return qfrClients.filter(client => {
      // Ensure client had started operations by this period
      let startY = client.startYear || 2024;
      if (startY < 2015 || startY > new Date().getFullYear() + 2) {
        startY = 2024;
      }
      const startMIdx = Math.max(0, monthsList.indexOf(client.startMonth || 'January'));
      const targetMIdx = monthsList.indexOf(month);

      const hasStarted = (year > startY) || (year === startY && targetMIdx >= startMIdx);
      if (!hasStarted) return false;

      // Ensure client has not closed operations by this period
      if (client.endYear) {
        const endY = client.endYear;
        const endMIdx = Math.max(0, monthsList.indexOf(client.endMonth || 'December'));
        const hasClosed = (year > endY) || (year === endY && targetMIdx > endMIdx);
        if (hasClosed) return false;
      }

      // If they have not filed a return in our registry, they are a debtor/non-filer
      const returnExists = returns.some(r => 
        r.clientId === client.id && 
        r.year === year && 
        (month === 'All' ? true : r.period === month)
      );

      return !returnExists;
    });
  };

  // Filter returns for general display table
  const filteredReturns = returns.filter(ret => {
    if (!ret) return false;
    const qSafe = String(searchQuery || '').trim().toLowerCase();
    const matchesSearch = !qSafe ||
      String(ret.clientName || '').toLowerCase().includes(qSafe) ||
      String(ret.txnRef || '').toLowerCase().includes(qSafe) ||
      String(ret.comments || '').toLowerCase().includes(qSafe);
    
    const matchesYear = filterYear === 'All' || ret.year.toString() === filterYear;
    const matchesMonth = filterMonth === 'All' || ret.period === filterMonth;
    const matchesStatus = filterStatus === 'All' || ret.paymentStatus === filterStatus;

    return matchesSearch && matchesYear && matchesMonth && matchesStatus;
  });

  // Group returns by client for the single-entry Returns Registry view
  const clientSummaries = clients.map(client => {
    const clientReturns = returns.filter(ret => {
      if (ret.clientId !== client.id) return false;
      const matchesYear = filterYear === 'All' || ret.year.toString() === filterYear;
      const matchesMonth = filterMonth === 'All' || ret.period === filterMonth;
      return matchesYear && matchesMonth;
    });

    const totalQty = clientReturns.reduce((sum, r) => sum + r.qty, 0);
    const totalInvoicedAmt = clientReturns.reduce((sum, r) => sum + r.invoiceAmount, 0);
    const totalPaidAmt = clientReturns.reduce((sum, r) => sum + r.paymentAmount, 0);
    const totalLessCFAmt = clientReturns.reduce((sum, r) => sum + r.lessCF, 0);
    const outstandingBal = clientReturns.reduce((sum, r) => sum + r.outstandingBalance, 0);

    return {
      client,
      returnsCount: clientReturns.length,
      totalQty,
      totalInvoicedAmt,
      totalPaidAmt,
      totalLessCFAmt,
      outstandingBal,
      clientReturns
    };
  });

  const filteredClientSummaries = clientSummaries.filter(summary => {
    if (!summary || !summary.client) return false;
    const qSafe = String(searchQuery || '').trim().toLowerCase();
    const matchesSearch = !qSafe ||
      String(summary.client.clientName || '').toLowerCase().includes(qSafe) ||
      String(summary.client.premiseName || '').toLowerCase().includes(qSafe) ||
      String(summary.client.location || '').toLowerCase().includes(qSafe) ||
      String(summary.client.id || '').toLowerCase().includes(qSafe);

    let matchesStatusFilter = true;
    if (filterStatus !== 'All') {
      if (filterStatus === 'Fully Paid') {
        matchesStatusFilter = summary.outstandingBal <= 0 && summary.returnsCount > 0;
      } else if (filterStatus === 'Partially Paid') {
        matchesStatusFilter = summary.outstandingBal > 0 && summary.totalPaidAmt > 0;
      } else if (filterStatus === 'Unpaid') {
        matchesStatusFilter = summary.outstandingBal > 0 && summary.totalPaidAmt === 0;
      }
    }

    return matchesSearch && matchesStatusFilter;
  });

  const handleViewStatement = (clientId: string) => {
    setSelectedStatementClientId(clientId);
    setActiveSubTab('statements');
  };

  // Calculations for registry sub-tab summary
  const totalInvoiced = filteredReturns.reduce((sum, r) => sum + r.invoiceAmount, 0);
  const totalPaid = filteredReturns.reduce((sum, r) => sum + r.paymentAmount, 0);
  const totalLessCF = filteredReturns.reduce((sum, r) => sum + r.lessCF, 0);
  const totalOutstanding = filteredReturns.reduce((sum, r) => sum + r.outstandingBalance, 0);

  // Client Statement calculations
  const statementClientObj = clients.find(c => c.id === selectedStatementClientId);
  const statementReturns = returns
    .filter(r => r.clientId === selectedStatementClientId)
    .sort((a, b) => b.year - a.year || monthsList.indexOf(b.period) - monthsList.indexOf(a.period));

  const filteredStatementReturns = statementReturns.filter(r => {
    const matchesYear = statementFilterYear === 'All' || r.year.toString() === statementFilterYear;
    if (!matchesYear) return false;

    const qSafe = (statementSearchQuery || '').trim().toLowerCase();
    if (qSafe === '') return true;
    return (
      (r.period || '').toLowerCase().includes(qSafe) ||
      (r.year || '').toString().includes(qSafe) ||
      (r.txnRef && r.txnRef.toLowerCase().includes(qSafe)) ||
      (r.comments && r.comments.toLowerCase().includes(qSafe)) ||
      (r.qty || '').toString().includes(qSafe) ||
      (r.invoiceAmount || '').toString().includes(qSafe) ||
      (r.paymentAmount || '').toString().includes(qSafe) ||
      (r.paymentDate && r.paymentDate.toLowerCase().includes(qSafe))
    );
  });

  const stmtTotalQty = filteredStatementReturns.reduce((sum, r) => sum + r.qty, 0);
  const stmtTotalInvoiced = filteredStatementReturns.reduce((sum, r) => sum + r.invoiceAmount, 0);
  const stmtTotalPaid = filteredStatementReturns.reduce((sum, r) => sum + r.paymentAmount, 0);
  const stmtTotalLessCF = filteredStatementReturns.reduce((sum, r) => sum + r.lessCF, 0);
  const stmtTotalOutstanding = filteredStatementReturns.reduce((sum, r) => sum + r.outstandingBalance, 0);
  
  const stmtUnfiledPeriods = statementClientObj ? getUnfiledPeriodsForClient(statementClientObj) : [];
  const stmtTotalMonths = (statementReturns.length + stmtUnfiledPeriods.length) || 1;
  const complianceRate = Math.round((statementReturns.length / stmtTotalMonths) * 100);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(amount);
  };

  // Debtor/Ledger CRUD states and handlers
  const [isAddingDebtor, setIsAddingDebtor] = useState(false);
  const [editingDebtorId, setEditingDebtorId] = useState<string | null>(null);
  const [isSavingDebtor, setIsSavingDebtor] = useState(false);
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
    const renumbered = current.map((inst, i) => ({ ...inst, no: i + 1 }));
    setNewDebtor({ ...newDebtor, installments: renumbered });
  };

  const updateInstallmentRow = (index: number, field: keyof Installment, value: any) => {
    const current = [...(newDebtor.installments || [])];
    current[index] = { ...current[index], [field]: value };
    setNewDebtor({ ...newDebtor, installments: current });
  };

  const handleEditDebtor = (debtor: DebtorRecord) => {
    setEditingDebtorId(debtor.id);
    setNewDebtor(debtor);
    setIsAddingDebtor(true);
  };

  const handleAddDebtor = async () => {
    if (!newDebtor.dboName || !newDebtor.permitNo || !newDebtor.totalArrears) {
      return alert("Please fill in all required fields (DBO Name, Permit No, and Total Arrears).");
    }

    setIsSavingDebtor(true);
    try {
      const finalInstallments = newDebtor.installments || [];
      const totalFromInst = finalInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
      const totalArrears = totalFromInst || newDebtor.totalArrears || 0;
      
      const arrearsPeriod = finalInstallments.map(i => i.period).filter(Boolean).join(', ') || 'Current';
      
      const manualDebtors = propDebtors || localDebtors;

      if (editingDebtorId) {
        const exists = manualDebtors.some(d => d.id === editingDebtorId);
        let updatedDebtors;
        if (exists) {
          updatedDebtors = manualDebtors.map(d => d.id === editingDebtorId ? {
            ...(newDebtor as DebtorRecord),
            id: editingDebtorId,
            totalArrears,
            totalArrearsWords: numberToWords(totalArrears),
            installments: finalInstallments,
            arrearsPeriod
          } : d);
        } else {
          updatedDebtors = [
            ...manualDebtors,
            {
              ...(newDebtor as DebtorRecord),
              id: editingDebtorId,
              totalArrears,
              totalArrearsWords: numberToWords(totalArrears),
              installments: finalInstallments,
              arrearsPeriod
            }
          ];
        }
        if (onDebtorUpdate) {
          await onDebtorUpdate(updatedDebtors);
        } else {
          setLocalDebtors(updatedDebtors);
        }
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
        const updatedDebtors = [...manualDebtors, debtor];
        if (onDebtorUpdate) {
          await onDebtorUpdate(updatedDebtors);
        } else {
          setLocalDebtors(updatedDebtors);
        }
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

  const exportLedgerCSV = () => {
    const activeDebtors = getIntegratedDebtors();
    if (activeDebtors.length === 0) {
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
    const rows = activeDebtors.map(d => [
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
        const escaped = ('' + (val ?? '')).replace(/"/g, '""');
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

  // Excel Export for client statement
  const exportStatementToCSV = () => {
    if (!statementClientObj || filteredStatementReturns.length === 0) {
      alert("No returns found to export for this client.");
      return;
    }
    const headers = [
      'Client Name',
      'Filing Period',
      'Return Date',
      'Quantity (Ltrs)',
      'Invoice Amount (KES)',
      'Payment Amount (KES)',
      'Payment Date',
      'CF Adjustment (KES)',
      'Outstanding Balance (KES)',
      'Ref/MR No'
    ];
    const rows = filteredStatementReturns.map(r => [
      statementClientObj.clientName,
      `${r.period} ${r.year}`,
      r.returnDate,
      r.qty,
      r.invoiceAmount,
      r.paymentAmount,
      r.paymentDate || '',
      r.lessCF,
      r.outstandingBalance,
      r.txnRef || ''
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
    link.setAttribute("download", `Statement_${statementClientObj.clientName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-indigo-500" /> Returns & Ledger Module
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            File monthly levy, monitor collections, generate client statements, and track unfiled debtors
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 border border-slate-200">
          <button
            onClick={() => setActiveSubTab('registry')}
            className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeSubTab === 'registry' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Database size={14} /> Returns Registry
          </button>
          <button
            onClick={() => setActiveSubTab('debtors')}
            className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeSubTab === 'debtors' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <AlertTriangle size={14} className="text-amber-500" /> Non-Filers & Debtors
          </button>
          <button
            onClick={() => setActiveSubTab('statements')}
            className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeSubTab === 'statements' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <FileText size={14} /> Client Statements
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-lg p-20 text-center space-y-4">
          <Loader2 className="w-12 h-12 text-slate-400 animate-spin mx-auto" />
          <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Loading records & database configurations...</p>
        </div>
      ) : (
        <>
          {/* ==================== SUB-TAB: REGISTRY ==================== */}
          {activeSubTab === 'registry' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="bg-indigo-50 p-3.5 rounded-2xl text-indigo-500">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Invoiced</div>
                    <div className="text-xl font-black text-slate-800 mt-0.5">{formatCurrency(totalInvoiced)}</div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="bg-emerald-50 p-3.5 rounded-2xl text-emerald-500">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Collections</div>
                    <div className="text-xl font-black text-slate-800 mt-0.5">{formatCurrency(totalPaid)}</div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="bg-amber-50 p-3.5 rounded-2xl text-amber-500">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding Balance</div>
                    <div className="text-xl font-black text-slate-800 mt-0.5">{formatCurrency(totalOutstanding)}</div>
                  </div>
                </div>
              </div>

              {/* Action Bar & Filters */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col xl:flex-row justify-between gap-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-grow">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Client Name / Txn ref..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 focus:bg-white transition-all outline-none"
                    />
                  </div>

                  {/* Year filter */}
                  <div>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none"
                    >
                      <option value="All">All Years</option>
                      {yearsList.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Month filter */}
                  <div>
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none"
                    >
                      <option value="All">All Months</option>
                      {monthsList.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Payment status filter */}
                  <div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Fully Paid">Fully Paid</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Unpaid">Unpaid</option>
                    </select>
                  </div>
                </div>

                {/* Import/Export buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setCsvFile(null);
                      setParsedReturns([]);
                      setImportErrors([]);
                      setIsImportModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-sm border border-slate-200"
                  >
                    <Upload size={14} /> Import returns CSV
                  </button>
                  <button
                    onClick={exportAllReturnsCSV}
                    className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-sm border border-slate-200"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                  <button
                    onClick={() => openAddModal()}
                    className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all shadow-md"
                  >
                    <Plus size={14} /> File Return
                  </button>
                </div>
              </div>

              {/* Main Registry Table */}
              <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                {filteredClientSummaries.length === 0 ? (
                  <div className="p-20 text-center space-y-4">
                    <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">No clients matched your filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                          <th className="px-6 py-4">Client / Premise details</th>
                          <th className="px-6 py-4">Location</th>
                          <th className="px-6 py-4 text-center">Returns Filed</th>
                          <th className="px-6 py-4 text-right">Aggregated QTY</th>
                          <th className="px-6 py-4 text-right">Invoiced Amt</th>
                          <th className="px-6 py-4 text-right">Paid Amt</th>
                          <th className="px-6 py-4 text-right">Outstanding Bal</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                        {filteredClientSummaries.map(({ client, returnsCount, totalQty, totalInvoicedAmt, totalPaidAmt, totalLessCFAmt, outstandingBal }) => (
                          <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4.5">
                              <div className="text-slate-900 font-black">{client.clientName}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold">{client.premiseCategory}</span>
                                <span>• {client.premiseName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="text-slate-800 font-medium">{client.location || 'N/A'}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Permit: {client.permitNumber || client.id}</div>
                            </td>
                            <td className="px-6 py-4.5 text-center">
                              <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full text-[10px] font-black">
                                {returnsCount}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-right text-slate-900 font-extrabold">
                              {totalQty.toLocaleString()}
                            </td>
                            <td className="px-6 py-4.5 text-right font-black text-slate-900">
                              {formatCurrency(totalInvoicedAmt)}
                            </td>
                            <td className="px-6 py-4.5 text-right font-bold text-emerald-600">
                              {formatCurrency(totalPaidAmt)}
                            </td>
                            <td className={`px-6 py-4.5 text-right font-black ${outstandingBal > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                              {formatCurrency(outstandingBal)}
                            </td>
                            <td className="px-6 py-4.5">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                outstandingBal <= 0 && returnsCount > 0
                                  ? 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                                  : outstandingBal > 0
                                  ? 'bg-rose-50 border border-rose-100 text-rose-600'
                                  : 'bg-slate-50 border border-slate-100 text-slate-500'
                              }`}>
                                {outstandingBal <= 0 && returnsCount > 0 ? 'Up to Date' : outstandingBal > 0 ? 'Arrears' : 'No filings'}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleViewStatement(client.id)}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-lg text-[10px] uppercase tracking-wider transition-all"
                                  title="View detailed transaction statement for this client"
                                >
                                  View Statement
                                </button>
                                <button
                                  onClick={() => openAddModal(client.id)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"
                                  title="File Return"
                                >
                                  <Plus size={14} className="text-slate-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== SUB-TAB: NON-FILERS / DEBTORS ==================== */}
          {activeSubTab === 'debtors' && (
            <div className="space-y-6 animate-in fade-in duration-300 print:hidden">
              
              {/* Filter Panel */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-slate-50">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Identify Non-Filers & Debtors</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Configure multi-year, multi-month filters and search options to audit compliance</p>
                  </div>
                  
                  {/* Sub-view toggle */}
                  <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/50 w-full md:w-auto">
                    <button
                      onClick={() => setDebtorSubView('non-filers')}
                      className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${debtorSubView === 'non-filers' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Non-Filers
                    </button>
                    <button
                      onClick={() => setDebtorSubView('debtors-ledger')}
                      className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${debtorSubView === 'debtors-ledger' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Returns Debtors
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 items-center">
                  {/* Left Column (Col-span-12) for filters - Compliance tracking notice removed */}
                  <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Search Bar */}
                    <div className="md:col-span-4 space-y-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Directory</span>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search client, premise, location..."
                          value={debtorSearchQuery}
                          onChange={(e) => setDebtorSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-slate-300 bg-slate-50"
                        />
                        {debtorSearchQuery && (
                          <button onClick={() => setDebtorSearchQuery('')} className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Years dropdown */}
                    <div className="md:col-span-4 space-y-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Year</span>
                      <select
                        value={debtorFilterYear}
                        onChange={(e) => setDebtorFilterYear(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-black text-slate-700 bg-slate-50 outline-none focus:bg-white focus:border-slate-300 transition-all cursor-pointer"
                      >
                        <option value="All">All Years</option>
                        {yearsList.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    {/* Months dropdown */}
                    <div className="md:col-span-4 space-y-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Month</span>
                      <select
                        value={debtorFilterMonth}
                        onChange={(e) => setDebtorFilterMonth(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-black text-slate-700 bg-slate-50 outline-none focus:bg-white focus:border-slate-300 transition-all cursor-pointer"
                      >
                        <option value="All">All Months</option>
                        {monthsList.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Debtor list */}
              <div className="w-full">
                
                {/* List of outstanding records */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                  
                  {(() => {
                    // Filter years to scan
                    const yearsToScan = debtorFilterYear === 'All' 
                      ? yearsList 
                      : [parseInt(debtorFilterYear)];

                    // Filter months to scan
                    const monthsToScan = debtorFilterMonth === 'All'
                      ? monthsList
                      : [debtorFilterMonth];

                    if (debtorSubView === 'non-filers') {
                      // Gather unfiled across multiple years and months grouped by client
                      let missingList: { client: LicensedClient; missingPeriods: { year: number; month: string }[] }[] = [];

                      // We scan active QFR operating clients
                      const activeQfrClients = clients.filter(c => c.levyInfo === 'QFR' && c.operationalStatus === 'operating');

                      activeQfrClients.forEach(client => {
                        const periods = getUnfiledPeriodsForClient(client);
                        const filteredPeriods = periods.filter(p => yearsToScan.includes(p.year) && monthsToScan.includes(p.month));
                        if (filteredPeriods.length > 0) {
                          missingList.push({ client, missingPeriods: filteredPeriods });
                        }
                      });

                      // Apply search query
                      const qSafe = (debtorSearchQuery || '').trim().toLowerCase();
                      if (qSafe !== '') {
                        missingList = missingList.filter(item => 
                          (item.client?.clientName || '').toLowerCase().includes(qSafe) ||
                          (item.client?.premiseName || '').toLowerCase().includes(qSafe) ||
                          (item.client?.location || '').toLowerCase().includes(qSafe) ||
                          (item.client?.county || '').toLowerCase().includes(qSafe) ||
                          (item.client?.premiseCategory || '').toLowerCase().includes(qSafe)
                        );
                      }

                      return (
                        <>
                          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <h4 className="text-base font-black text-slate-800">
                                Non-Filers Audit Registry ({missingList.length})
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                Active clients qualifying for returns with missing filing periods (consolidated)
                              </p>
                            </div>
                            <button
                              onClick={() => exportNonFilersCSV(missingList)}
                              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow-sm"
                              title="Download Excel list of clients who have not filed returns for the filtered periods"
                            >
                              <Download size={13} className="text-rose-500" /> Export Excel
                            </button>
                          </div>

                          {missingList.length === 0 ? (
                            <div className="p-20 text-center space-y-4">
                              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">No missing filings found for current selection!</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white z-10">
                                    <th className="px-6 py-3">Client details</th>
                                    <th className="px-6 py-3">Premise Name</th>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3">Missing Periods</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                  {missingList.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-6 py-3.5">
                                        <div className="text-slate-900 font-black">{item.client.clientName}</div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                          <Phone size={10} /> {item.client.tel || 'No phone'}
                                        </div>
                                      </td>
                                      <td className="px-6 py-3.5">
                                        <div className="text-slate-800">{item.client.premiseName}</div>
                                        <div className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                                          <MapPin size={10} /> {item.client.location}, {item.client.county || 'N/A'}
                                        </div>
                                      </td>
                                      <td className="px-6 py-3.5">
                                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                                          {item.client.premiseCategory}
                                        </span>
                                      </td>
                                      <td className="px-6 py-3.5">
                                        <div className="flex flex-wrap gap-1 max-w-sm">
                                          {item.missingPeriods.map((p, pIdx) => (
                                            <button
                                              key={pIdx}
                                              onClick={() => openAddModal(item.client.id, p.year, p.month)}
                                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 px-2 py-1 rounded-md text-[9px] font-black tracking-wide transition-all whitespace-nowrap flex items-center gap-1"
                                              title={`Click to file for ${p.month} ${p.year}`}
                                            >
                                              {p.month.substring(0,3)} {p.year} ✎
                                            </button>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="px-6 py-3.5 text-right">
                                        <button
                                          onClick={() => openAddModal(item.client.id, item.missingPeriods[0].year, item.missingPeriods[0].month)}
                                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                                        >
                                          File Return
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      );
                    } else {
                      // Gather combined debtors ledger (manual and returns-based)
                      const activeDebtors = getIntegratedDebtors();
                      
                      let filteredLedger = activeDebtors;
                      const qSafe = (debtorSearchQuery || '').trim().toLowerCase();
                      if (qSafe !== '') {
                        filteredLedger = activeDebtors.filter(d => 
                          (d.dboName || '').toLowerCase().includes(qSafe) || 
                          (d.permitNo || '').toLowerCase().includes(qSafe) ||
                          (d.premiseName && d.premiseName.toLowerCase().includes(qSafe)) ||
                          (d.county && d.county.toLowerCase().includes(qSafe)) ||
                          (d.location && d.location.toLowerCase().includes(qSafe))
                        );
                      }

                      // Filter by selected year
                      if (debtorFilterYear !== 'All') {
                        filteredLedger = filteredLedger.filter(d => {
                          const hasYearInInstallment = d.installments?.some(inst => (inst.period || '').includes(debtorFilterYear));
                          const hasYearInPeriod = (d.arrearsPeriod || '').includes(debtorFilterYear);
                          return hasYearInInstallment || hasYearInPeriod;
                        });
                      }

                      // Filter by selected month
                      if (debtorFilterMonth !== 'All') {
                        filteredLedger = filteredLedger.filter(d => {
                          const monthShort = debtorFilterMonth.slice(0, 3);
                          const hasMonthInInstallment = d.installments?.some(inst => 
                            (inst.period || '').toLowerCase().includes(debtorFilterMonth.toLowerCase()) || 
                            (inst.period || '').toLowerCase().includes(monthShort.toLowerCase())
                          );
                          const hasMonthInPeriod = (d.arrearsPeriod || '').toLowerCase().includes(debtorFilterMonth.toLowerCase()) || 
                            (d.arrearsPeriod || '').toLowerCase().includes(monthShort.toLowerCase());
                          return hasMonthInInstallment || hasMonthInPeriod;
                        });
                      }

                      return (
                        <>
                          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <h4 className="text-base font-black text-slate-800">
                                Debtors Ledger ({filteredLedger.length})
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                Consolidated record of dairy operators in arrears, payment plans, and active debt agreements
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={exportLedgerCSV}
                                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow-sm"
                                title="Download Excel list of clients with outstanding debts"
                              >
                                <Download size={13} className="text-amber-500" /> Export Excel
                              </button>
                              <button
                                onClick={() => setIsAddingDebtor(true)}
                                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow-md"
                                title="Add a new custom entry to the debtors ledger"
                              >
                                <Plus size={13} /> Add Entry
                              </button>
                            </div>
                          </div>

                          {filteredLedger.length === 0 ? (
                            <div className="p-20 text-center space-y-4">
                              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                              <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">No debtors found matching criteria!</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white z-10">
                                    <th className="px-6 py-3">Client details</th>
                                    <th className="px-6 py-3">Premise & Location</th>
                                    <th className="px-6 py-3">Permit No</th>
                                    <th className="px-6 py-3">Arrears Period(s)</th>
                                    <th className="px-6 py-3 text-right">Balance Due</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                  {filteredLedger.map((item, idx) => {
                                    const matchingClient = clients.find(c => 
                                      c.id === item.id || 
                                      String(c.clientName || '').toLowerCase() === String(item.dboName || '').toLowerCase()
                                    );
                                    return (
                                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3.5">
                                          <div className="text-slate-900 font-black">{item.dboName}</div>
                                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                            <Phone size={10} /> {item.tel || 'No phone'}
                                          </div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                          <div className="text-slate-800">{item.premiseName || 'N/A'}</div>
                                          <div className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                                            <MapPin size={10} /> {item.location || 'N/A'}, {item.county || 'N/A'}
                                          </div>
                                        </td>
                                        <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px]">
                                          {item.permitNo}
                                        </td>
                                        <td className="px-6 py-3.5 text-slate-500 font-medium">
                                          {item.arrearsPeriod || 'Current'}
                                        </td>
                                        <td className="px-6 py-3.5 text-right text-rose-600 font-black">
                                          {formatCurrency(item.totalArrears)}
                                        </td>
                                        <td className="px-6 py-3.5 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            {matchingClient && (
                                              <button
                                                onClick={() => {
                                                  setSelectedStatementClientId(matchingClient.id);
                                                  setActiveSubTab('statements');
                                                }}
                                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all"
                                                title="View Client Statement"
                                              >
                                                Statement
                                              </button>
                                            )}
                                            {item.debitNoteNo?.startsWith('DN/RET/') ? (
                                              <>
                                                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1">
                                                  <CheckCircle2 size={10} className="text-emerald-500 shrink-0" /> Derived
                                                </span>
                                                <button
                                                  onClick={() => handleEditDebtor(item)}
                                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                                                  title="Edit Ledger Entry"
                                                >
                                                  <PenTool className="w-3.5 h-3.5" />
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <button
                                                  onClick={() => handleEditDebtor(item)}
                                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                                                  title="Edit Ledger Entry"
                                                >
                                                  <PenTool className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={async () => {
                                                    if (confirm("Are you sure you want to delete this ledger entry?")) {
                                                      const activeList = getIntegratedDebtors();
                                                      const updated = activeList.filter(d => d.id !== item.id);
                                                      const manualOnly = updated.filter(x => !x.debitNoteNo?.startsWith('DN/RET/'));
                                                      if (onDebtorUpdate) {
                                                        await onDebtorUpdate(manualOnly);
                                                      } else {
                                                        setLocalDebtors(manualOnly);
                                                      }
                                                    }
                                                  }}
                                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                                                  title="Delete Ledger Entry"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </>
                                            )}
                                            <button
                                              onClick={() => {
                                                navigate(`/payment-agreement?bypassPermit=${encodeURIComponent(item.permitNo)}`);
                                              }}
                                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all"
                                              title="Bypass login & create debt agreement from admin side"
                                            >
                                              <ExternalLink className="w-3 h-3 animate-pulse" /> Bypass & Create Agreement
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      );
                    }
                  })()}
                </div>

              </div>

              {/* Add/Edit Debtor Modal */}
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

            </div>
          )}

          {/* ==================== SUB-TAB: CLIENT STATEMENTS ==================== */}
          {activeSubTab === 'statements' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Selector Bar */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 print:hidden">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full lg:w-auto">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0 self-center">Select Client:</span>
                  <select
                    value={selectedStatementClientId}
                    onChange={(e) => setSelectedStatementClientId(e.target.value)}
                    className="w-full md:w-80 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 outline-none"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.clientName} ({c.premiseName})</option>
                    ))}
                  </select>

                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0 self-center">Year:</span>
                  <select
                    value={statementFilterYear}
                    onChange={(e) => setStatementFilterYear(e.target.value)}
                    className="w-full md:w-32 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 outline-none"
                  >
                    <option value="All">All Years</option>
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Search option for statements ledger */}
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search client statement..."
                    value={statementSearchQuery}
                    onChange={(e) => setStatementSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-slate-300 bg-slate-50"
                  />
                  {statementSearchQuery && (
                    <button onClick={() => setStatementSearchQuery('')} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <button
                    onClick={exportStatementToCSV}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-sm border border-emerald-500"
                  >
                    <Download size={14} /> Export Excel
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-sm border border-slate-200"
                  >
                    <Printer size={14} /> Print Ledger (PDF)
                  </button>
                </div>
              </div>

              {statementClientObj ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
                  
                  {/* Left Column: Client profile, compliance, and list of unfiled months */}
                  <div className="space-y-6">
                    {/* Profile */}
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-4">
                      <div className="text-[10px] bg-slate-100 border text-slate-600 font-black px-2.5 py-1 rounded-full uppercase tracking-wider w-fit">
                        {statementClientObj.premiseCategory}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-800">{statementClientObj.clientName}</h4>
                        <p className="text-xs font-semibold text-slate-400 mt-1">{statementClientObj.premiseName}</p>
                      </div>

                      <div className="divide-y divide-slate-100 text-xs font-bold text-slate-600">
                        <div className="py-2.5 flex justify-between">
                          <span>Permit Status</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${statementClientObj.permitStatus === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {statementClientObj.permitStatus === 'active' ? 'VALID' : 'EXPIRED'}
                          </span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span>Levy Qualification</span>
                          <span className="font-extrabold text-indigo-600">{statementClientObj.levyInfo}</span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span>Operational Start</span>
                          <span className="text-slate-800">{statementClientObj.startMonth} {statementClientObj.startYear}</span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span>Location</span>
                          <span className="text-slate-800">{statementClientObj.location}, {statementClientObj.county}</span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span>Contact Person</span>
                          <span className="text-slate-800">{statementClientObj.contactPerson}</span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span>Phone Number</span>
                          <span className="text-slate-800">{statementClientObj.tel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Compliance KPI Card */}
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-3">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Filing Compliance</h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-800">{complianceRate}%</span>
                        <span className="text-xs font-bold text-slate-400">({statementReturns.length} of {stmtTotalMonths} periods filed)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            complianceRate >= 90 ? 'bg-emerald-500' : complianceRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${complianceRate}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Spotlight: Unfiled periods specifically for this client */}
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Missing / Unfiled Periods</h4>
                        <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full font-black">
                          {stmtUnfiledPeriods.length} months
                        </span>
                      </div>

                      {stmtUnfiledPeriods.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-xs font-bold">
                          🎉 This client's returns ledger is up to date!
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                          {stmtUnfiledPeriods.map((period, idx) => (
                            <div key={idx} className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-3 flex justify-between items-center text-xs font-bold text-rose-700">
                              <span>{period.month} {period.year}</span>
                              <button
                                onClick={() => openAddModal(statementClientObj.id, period.year, period.month)}
                                className="bg-white hover:bg-rose-100 border border-rose-200 text-rose-700 px-2 py-1 rounded-lg text-[9px] uppercase tracking-wider transition-all"
                              >
                                File Now
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (Col-span-2): Filed Returns Ledger Statement */}
                  <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden print:shadow-none print:border-none">
                    
                    {/* Header Details */}
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-black text-slate-800">Client Account Ledger</h3>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Detailed transaction statements from filed returns
                          </p>
                        </div>
                        <div className="text-right">
                          {/* Statement date on right side */}
                          <div className="text-[9px] text-slate-400 font-bold mt-0.5">Statement Date: {new Date().toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Summary Widgets Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-3xl border border-slate-100">
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Qty</div>
                          <div className="text-sm font-extrabold text-slate-800 mt-0.5">{stmtTotalQty.toLocaleString()} Ltrs</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Invoiced</div>
                          <div className="text-sm font-black text-slate-800 mt-0.5">{formatCurrency(stmtTotalInvoiced)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Paid</div>
                          <div className="text-sm font-extrabold text-emerald-600 mt-0.5">{formatCurrency(stmtTotalPaid)}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance Due</div>
                          <div className="text-sm font-black text-amber-600 mt-0.5">{formatCurrency(stmtTotalOutstanding)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Table of transactions */}
                    {filteredStatementReturns.length === 0 ? (
                      <div className="p-20 text-center text-slate-400 text-xs font-bold space-y-2">
                        <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                        <div>No returns have been filed for this client yet.</div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                              <th className="px-4 py-4">Client Name</th>
                              <th className="px-4 py-4">Premise Name</th>
                              <th className="px-4 py-4">Location</th>
                              <th className="px-4 py-4">Permit No</th>
                              <th className="px-4 py-4">Filing Period</th>
                              <th className="px-4 py-4 text-right">Qty</th>
                              <th className="px-4 py-4 text-right">Invoice Amount</th>
                              <th className="px-4 py-4 text-right">Paid Amount</th>
                              <th className="px-4 py-4 text-right">CJ Adj</th>
                              <th className="px-4 py-4 text-right">Outstanding Balance</th>
                              <th className="px-4 py-4">Status</th>
                              <th className="px-4 py-4">Missing Periods</th>
                              <th className="px-4 py-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                            {filteredStatementReturns.map((ret, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/20 text-xs">
                                <td className="px-4 py-3.5 font-bold text-slate-900">{statementClientObj.clientName}</td>
                                <td className="px-4 py-3.5 text-slate-700">{statementClientObj.premiseName}</td>
                                <td className="px-4 py-3.5 text-slate-500">{statementClientObj.location}</td>
                                <td className="px-4 py-3.5 text-slate-500 font-mono text-[10px]">{statementClientObj.permitNumber || statementClientObj.id}</td>
                                <td className="px-4 py-3.5 font-extrabold text-slate-800">{ret.period} {ret.year}</td>
                                <td className="px-4 py-3.5 text-right font-mono">{ret.qty.toLocaleString()}</td>
                                <td className="px-4 py-3.5 text-right font-black text-slate-900">{formatCurrency(ret.invoiceAmount)}</td>
                                <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{formatCurrency(ret.paymentAmount)}</td>
                                <td className="px-4 py-3.5 text-right text-slate-500">{formatCurrency(ret.lessCF)}</td>
                                <td className={`px-4 py-3.5 text-right font-black ${ret.outstandingBalance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                  {formatCurrency(ret.outstandingBalance)}
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                    ret.paymentStatus === 'Fully Paid' 
                                      ? 'bg-emerald-50 text-emerald-600'
                                      : ret.paymentStatus === 'Partially Paid'
                                      ? 'bg-blue-50 text-blue-600'
                                      : 'bg-rose-50 text-rose-600'
                                  }`}>
                                    {ret.paymentStatus}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  {stmtUnfiledPeriods.length > 0 ? (
                                    <span className="bg-rose-50 border border-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
                                      {stmtUnfiledPeriods.length} Missing
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
                                      Up to Date
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => openEditModal(ret)}
                                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase tracking-wider transition-all"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReturn(ret.id)}
                                      className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                  </div>

                  {/* PRINT-ONLY LEDGER STATEMENT PDF */}
                  <div className="hidden print:block bg-white text-slate-950 p-4 font-sans text-xs">
                    {/* KDB Logo & Header */}
                    <div className="text-center border-b-2 border-slate-950 pb-4 mb-6">
                      <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">KENYA DAIRY BOARD</h1>
                      <p className="text-[10px] text-slate-500 mt-1">Statement Date: {new Date().toLocaleDateString()}</p>
                    </div>

                    {/* Client details header */}
                    <div className="space-y-1 mb-6">
                      <div><span className="font-bold text-slate-600">Statement For:</span> <span className="font-extrabold text-slate-950">{statementClientObj.clientName}</span></div>
                      <div><span className="font-bold text-slate-600">Permit No:</span> <span className="font-mono font-extrabold text-slate-950">{statementClientObj.permitNumber || statementClientObj.id}</span></div>
                      <div><span className="font-bold text-slate-600">Premise Name:</span> <span className="text-slate-800">{statementClientObj.premiseName}</span></div>
                      <div><span className="font-bold text-slate-600">Location:</span> <span className="text-slate-800">{statementClientObj.location}, {statementClientObj.county}</span></div>
                    </div>

                    {/* Table of transactions */}
                    {filteredStatementReturns.length === 0 ? (
                      <div className="p-10 text-center text-slate-500 font-bold border border-dashed border-slate-200 rounded-xl mb-6">
                        No returns found for the selected filter.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse border border-slate-300 mb-6">
                        <thead>
                          <tr className="bg-slate-100 text-[9px] font-black uppercase tracking-wider border-b-2 border-slate-300">
                            <th className="border border-slate-300 px-3 py-2">Filing Period</th>
                            <th className="border border-slate-300 px-3 py-2 text-right">Qty</th>
                            <th className="border border-slate-300 px-3 py-2 text-right">Invoice Amount</th>
                            <th className="border border-slate-300 px-3 py-2 text-right">Paid Amount</th>
                            <th className="border border-slate-300 px-3 py-2 text-right">Outstanding Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[10px] text-slate-800">
                          {filteredStatementReturns.map((ret, idx) => {
                            // paid amount (match invoiced amount where CF is present. dont show CF)
                            const displayPaid = ret.lessCF && ret.lessCF !== 0 ? ret.invoiceAmount : ret.paymentAmount;
                            const displayOutstanding = ret.lessCF && ret.lessCF !== 0 ? 0 : ret.outstandingBalance;

                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="border border-slate-300 px-3 py-2 font-black">
                                  {ret.period} {ret.year}
                                </td>
                                <td className="border border-slate-300 px-3 py-2 text-right font-mono">{ret.qty.toLocaleString()}</td>
                                <td className="border border-slate-300 px-3 py-2 text-right font-extrabold">{formatCurrency(ret.invoiceAmount)}</td>
                                <td className="border border-slate-300 px-3 py-2 text-right font-black text-slate-900">
                                  {formatCurrency(displayPaid)}
                                </td>
                                <td className={`border border-slate-300 px-3 py-2 text-right font-black ${displayOutstanding > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                                  {formatCurrency(displayOutstanding)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* Summary Totals block */}
                    <div className="flex justify-end mb-8 break-inside-avoid">
                      <div className="w-1/2 border border-slate-300 rounded-xl bg-slate-50 p-4 space-y-2">
                        <div className="flex justify-between font-bold text-slate-600">
                          <span>Total Invoiced:</span>
                          <span className="font-extrabold text-slate-950">{formatCurrency(stmtTotalInvoiced)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-600">
                          <span>Total Paid (Adj):</span>
                          <span className="font-extrabold text-slate-950">
                            {formatCurrency(
                              statementReturns.reduce((sum, r) => {
                                const displayPaid = r.lessCF && r.lessCF !== 0 ? r.invoiceAmount : r.paymentAmount;
                                return sum + displayPaid;
                              }, 0)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between font-black text-slate-900 border-t pt-2 text-sm">
                          <span>Outstanding Balance:</span>
                          <span className="text-amber-800">
                            {formatCurrency(
                              statementReturns.reduce((sum, r) => {
                                const displayOutstanding = r.lessCF && r.lessCF !== 0 ? 0 : r.outstandingBalance;
                                return sum + displayOutstanding;
                              }, 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Missing / Unfiled Periods (MUST BE LAST ITEM) */}
                    <div className="mt-8 border border-slate-300 rounded-xl p-5 break-inside-avoid bg-rose-50/20">
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-900 mb-3 flex justify-between items-center border-b pb-1.5">
                        <span>Missing / Unfiled Periods</span>
                        <span className="text-[9px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-black">
                          {stmtUnfiledPeriods.length} Outstanding Periods
                        </span>
                      </h3>

                      {stmtUnfiledPeriods.length === 0 ? (
                        <p className="text-[10px] font-bold text-slate-500">
                          🎉 All operations periods from {statementClientObj.startMonth} {statementClientObj.startYear} are fully filed and up-to-date. Compliant!
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-3 text-[10px] font-bold text-rose-800">
                          {stmtUnfiledPeriods.map((period, idx) => (
                            <div key={idx} className="bg-white border border-rose-200 rounded-lg p-2 flex justify-between items-center">
                              <span>{period.month} {period.year}</span>
                              <span className="text-[8px] bg-rose-50 text-rose-600 px-1 py-0.5 rounded border border-rose-100 font-extrabold uppercase">Unfiled</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Signature Section */}
                    <div className="mt-12 grid grid-cols-2 gap-10 break-inside-avoid">
                      <div className="text-center pt-8 border-t border-slate-300">
                        <p className="font-bold text-[9px] text-slate-500 uppercase tracking-widest">Client Signature</p>
                        <div className="h-12 flex items-center justify-center">
                          <span className="text-slate-300 italic text-xs">Acknowledge Statement</span>
                        </div>
                        <div className="border-t border-dashed w-3/4 mx-auto mt-2"></div>
                        <p className="text-[8px] text-slate-400 mt-1 font-bold">Date: ____/____/20___</p>
                      </div>
                      <div className="text-center pt-8 border-t border-slate-300">
                        <p className="font-bold text-[9px] text-slate-500 uppercase tracking-widest">KDB Authorized Official</p>
                        <div className="h-12 flex items-center justify-center">
                          <span className="text-slate-400 font-extrabold tracking-widest text-[8px] uppercase">Verified and Seal Approved</span>
                        </div>
                        <div className="border-t border-dashed w-3/4 mx-auto mt-2"></div>
                        <p className="text-[8px] text-slate-400 mt-1 font-bold">Branch Stamp</p>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-white rounded-[40px] border border-slate-100 p-20 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                  No registered clients available to generate statement
                </div>
              )}

            </div>
          )}
        </>
      )}

      {/* ==================== MODAL: ADD / EDIT RETURN ==================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-800">{editingReturn ? 'Edit Return Details' : 'File Monthly Return'}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {editingReturn ? `Editing record for ${editingReturn.clientName}` : 'Enter return numbers, invoices, and payments'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 font-bold text-sm uppercase tracking-widest bg-white border border-slate-150 px-3 py-1.5 rounded-xl shadow-sm transition-all"
              >
                Close
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitReturn} className="flex-grow overflow-y-auto p-8 space-y-6">
              
              {/* Select Client */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Client / DBO Name</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  disabled={editingReturn !== null}
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-slate-400 focus:bg-white transition-all"
                  required
                >
                  <option value="" disabled>-- Select Licensed Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.clientName} ({c.premiseName})</option>
                  ))}
                </select>
              </div>

              {/* Period / Year Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Filing Period / Month</label>
                  <select
                    value={returnPeriod}
                    onChange={(e) => setReturnPeriod(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-slate-400 focus:bg-white transition-all"
                    required
                  >
                    {monthsList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Filing Year</label>
                  <select
                    value={returnYear}
                    onChange={(e) => setReturnYear(parseInt(e.target.value))}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-slate-400 focus:bg-white transition-all"
                    required
                  >
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Return Date / QTY Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">QTY (Kgs / Litres)</label>
                  <input
                    type="number"
                    value={qty || ''}
                    onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 5000"
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-slate-400 focus:bg-white transition-all"
                    required
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Invoice Amount (KES)</label>
                  <input
                    type="number"
                    value={invoiceAmount || ''}
                    onChange={(e) => setInvoiceAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 10000"
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-slate-400 focus:bg-white transition-all"
                    required
                    min="0"
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt & Payment Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Paid Amount (KES)</label>
                    <input
                      type="number"
                      value={paymentAmount === 0 ? '0' : (paymentAmount || '')}
                      onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      placeholder="e.g., 8000"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none focus:border-slate-400 transition-all"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Less CF Adj (KES)</label>
                    <input
                      type="number"
                      value={lessCF === 0 ? '0' : (lessCF || '')}
                      onChange={(e) => setLessCF(parseFloat(e.target.value) || 0)}
                      placeholder="e.g., 500"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none focus:border-slate-400 transition-all"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Txn Ref / MR No.</label>
                    <input
                      type="text"
                      value={txnRef}
                      onChange={(e) => setTxnRef(e.target.value)}
                      placeholder="e.g., MPESA-REF / MR-X"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none focus:border-slate-400 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Return Filing Date</label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none focus:border-slate-400 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Payment Date (Optional)</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none focus:border-slate-400 transition-all"
                    />
                  </div>
                </div>

                {/* Display Instant Balance */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Estimated Balance Due:</span>
                  <span className={`text-sm font-black ${(invoiceAmount - paymentAmount - lessCF) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(invoiceAmount - paymentAmount - lessCF)}
                  </span>
                </div>

                {/* Manual Status Override (Eligible for balance < 100) */}
                {invoiceAmount - paymentAmount - lessCF > 0 && invoiceAmount - paymentAmount - lessCF < 100 && (
                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 text-amber-800">
                      <AlertTriangle size={14} />
                      <span className="text-[10px] font-black uppercase tracking-wider">Manual Balance Override (Small Balance &lt; 100 KES)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Override Status</label>
                        <select
                          value={overrideStatus}
                          onChange={(e) => setOverrideStatus(e.target.value as any)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none focus:border-slate-300 transition-all cursor-pointer"
                        >
                          <option value="Auto">Auto (Unpaid / Partially Paid)</option>
                          <option value="Fully Paid">Fully Paid</option>
                          <option value="Partially Paid">Partially Paid</option>
                          <option value="Unpaid">Unpaid</option>
                        </select>
                      </div>
                      {overrideStatus !== 'Auto' && (
                        <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Override Reason</label>
                          <input
                            type="text"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="Reason for change..."
                            required
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none focus:border-slate-300 transition-all"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Filing Comments / Remarks</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Remarks on milk volume, payments, or late returns..."
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 outline-none focus:border-slate-400 focus:bg-white transition-all h-24 resize-none"
                ></textarea>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-150 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-xl border text-slate-500 hover:bg-slate-50 font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md"
                >
                  {editingReturn ? 'Update Filing' : 'Save Return'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CSV BULK IMPORT FOR RETURNS ==================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-800">Returns CSV Bulk Importer</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Import multiple returns across various clients in one single spreadsheet file
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 font-bold text-sm uppercase tracking-widest bg-white border border-slate-150 px-3 py-1.5 rounded-xl shadow-sm transition-all"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-grow overflow-y-auto p-8 space-y-6">
              
              {/* Instructions and template download */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" /> Bulk Returns Import Instructions
                </h4>
                <ul className="list-disc pl-5 text-slate-600 text-xs space-y-2 leading-relaxed">
                  <li>Download the pre-formatted returns CSV template below.</li>
                  <li>The <strong>clientName</strong> column must match a client exactly as registered in the <em>Clients Tab</em> (case-insensitive).</li>
                  <li>Ensure <strong>period</strong> values are written in full (e.g., <em>January</em>, <em>February</em>, etc).</li>
                  <li>Numerical fields like <strong>qty</strong>, <strong>invoiceAmount</strong>, and <strong>paymentAmount</strong> must contain positive numbers only.</li>
                </ul>

                <div className="pt-2">
                  <button
                    onClick={downloadReturnsTemplate}
                    className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm"
                  >
                    <Download size={14} className="text-emerald-500" /> Download Returns Template (.csv)
                  </button>
                </div>
              </div>

              {/* File input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Select Completed CSV File</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-3xl p-8 text-center transition-all bg-slate-50/50 relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 pointer-events-none">
                    <Upload size={32} className="mx-auto text-slate-400" />
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      {csvFile ? csvFile.name : 'Click to select or drag & drop CSV file here'}
                    </p>
                    <p className="text-[10px] text-slate-400">Supported format: standard comma-separated files (.csv)</p>
                  </div>
                </div>
              </div>

              {/* Parsing status / Warning messages */}
              {(parsedReturns.length > 0 || importErrors.length > 0) && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Upload Parsing Results</h4>
                    <span className="text-[10px] bg-slate-100 border text-slate-600 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {parsedReturns.length} Valid Returns Found
                    </span>
                  </div>

                  {/* Errors panel */}
                  {importErrors.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-xs space-y-1.5">
                      <p className="font-black uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle size={14} /> Validation Errors Found in CSV File
                      </p>
                      <div className="max-h-24 overflow-y-auto space-y-1 font-semibold pl-4 list-decimal">
                        {importErrors.map((err, idx) => (
                          <div key={idx}>{err}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valid returns preview list */}
                  {parsedReturns.length > 0 && (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                            <th className="px-4 py-2.5">Client</th>
                            <th className="px-4 py-2.5">Period</th>
                            <th className="px-4 py-2.5 text-right">Invoiced</th>
                            <th className="px-4 py-2.5 text-right">Paid</th>
                            <th className="px-4 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                          {parsedReturns.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2">{item.clientName}</td>
                              <td className="px-4 py-2 text-slate-500">{item.period} {item.year}</td>
                              <td className="px-4 py-2 text-right text-slate-900">{formatCurrency(item.invoiceAmount)}</td>
                              <td className="px-4 py-2 text-right text-emerald-600">{formatCurrency(item.paymentAmount)}</td>
                              <td className="px-4 py-2">
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${
                                  item.paymentStatus === 'Fully Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                }`}>
                                  {item.paymentStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-slate-100 flex justify-between items-center bg-slate-50/30 shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {parsedReturns.length > 0 ? `${parsedReturns.length} returns ready to save` : 'No file loaded'}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-5 py-3 rounded-xl border text-slate-500 hover:bg-slate-50 font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={parsedReturns.length === 0 || importing}
                  onClick={handleBulkImportSubmit}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  {importing ? 'Saving records...' : `Save ${parsedReturns.length} Returns`}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
