import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from './lib/supabase';
import { DBService } from '../services/db';
import { LicensedClient, ClientReturn } from '../types';
import { 
  ClipboardCheck, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  FileText,
  ChevronRight,
  ChevronLeft,
  Save,
  Trash2,
  PenTool,
  Image as ImageIcon,
  History,
  Info,
  Edit2
} from 'lucide-react';

// Replace this with your actual Supabase public URL
const KDB_LOGO_URL = "https://odolazcniphinupgyaqo.supabase.co/storage/v1/object/sign/Pdf%20logo/KDB-LOGOx100h.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8zNDNkNjNiOC1jY2RlLTQwYTgtOGVmMS1lN2UyY2NjNzQ0NjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJQZGYgbG9nby9LREItTE9HT3gxMDBoLnBuZyIsImlhdCI6MTc3NDQwODY3MywiZXhwIjoyMDg5NzY4NjczfQ.r_8Gre72kWfCNdIGpiNEePogU0ieuPOJYqAyvqJ7YsQ";

interface IntakeEntry {
  month: string;
  year: string;
  quantity: string;
  farmerPrice: string;
  processor: string;
  processorPrice: string;
  avgVolPerDay: string;
}

interface SalesEntry {
  month: string;
  year: string;
  qtyDeclared: string;
  verifiedQty: string;
  projectedQty: string;
  underDeclared: string;
  buyingPrice: string;
  sellingPrice: string;
  avgVolPerDay: string;
}

interface NonComplianceEntry {
  month: string;
  litres: string;
  amount: string;
  paymentMonthYear: string;
  mpesaRef: string;
}

interface OutletEntry {
  location: string;
  volPerDay: string;
  permitStatus: 'Valid' | 'Expired' | 'None';
  levyInfo: string;
}

interface DistributorEntry {
  name: string;
  contacts: string;
  volPerDay: string;
  permitNo: string;
  areaOfSale: string;
  outlets: OutletEntry[];
  natureOfProduce: string[];
  prices: Record<string, string>;
}

interface FormData {
  branch: string;
  date: string;
  startTime: string;
  endTime: string;
  permitNo: string;
  expiryDate: string;
  dboName: string;
  premiseName: string;
  category: string;
  contacts: string;
  validationPeriod: string;
  location: string;
  county: string;
  // Table Data (Now part of sales)
  traceability: string;
  natureOfProduce: string[];
  source: string;
  complianceOfficer: string;
  complianceSignature: string; // Base64
  confirmationName: string;
  dboSignature: string; // Base64
  dboStamp: string; // Base64
  designation: string;
  hasLocalSales: boolean;
  // Dynamic sections
  intakes: IntakeEntry[];
  sales: SalesEntry[];
  nonCompliance: NonComplianceEntry[];
  comments: string;
  // Distribution Details (Mini Dairy & Cottage Industry)
  distName: string;
  distContacts: string;
  distVolPerDay: string;
  distPermitNo: string;
  distAreaOfSale: string;
  distOutlets: OutletEntry[];
  distNatureOfProduce: string[];
  distPrice: string;
  distributors: DistributorEntry[];
}

const parseSellingPrices = (sellingPriceStr: string): Record<string, string> => {
  const prices: Record<string, string> = {};
  if (!sellingPriceStr) return prices;
  
  try {
    const parsed = JSON.parse(sellingPriceStr);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch (e) {
    // Ignore JSON error
  }

  const parts = sellingPriceStr.split(/[|,]/);
  parts.forEach(part => {
    const colonIdx = part.indexOf(':');
    if (colonIdx !== -1) {
      const product = part.substring(0, colonIdx).trim();
      const price = part.substring(colonIdx + 1).trim();
      if (product) {
        prices[product] = price;
      }
    }
  });
  return prices;
};

const formatSellingPrices = (prices: Record<string, string>): string => {
  return Object.entries(prices)
    .filter(([_, val]) => val !== undefined && val !== '')
    .map(([prod, val]) => `${prod}: ${val}`)
    .join(' | ');
};

const getLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const initialData: FormData = {
  branch: 'Kericho',
  date: getLocalDate(),
  startTime: '',
  endTime: '',
  permitNo: '',
  expiryDate: '',
  dboName: '',
  premiseName: '',
  category: '',
  contacts: '',
  validationPeriod: '',
  location: '',
  county: 'Kericho',
  traceability: 'Yes',
  natureOfProduce: [],
  source: '',
  complianceOfficer: '',
  complianceSignature: '',
  confirmationName: '',
  dboSignature: '',
  dboStamp: '',
  designation: '',
  hasLocalSales: true,
  intakes: [{ month: new Date().toLocaleString('default', { month: 'long' }), year: new Date().getFullYear().toString(), quantity: '', farmerPrice: '', processor: '', processorPrice: '', avgVolPerDay: '' }],
  sales: [{ 
    month: new Date().toLocaleString('default', { month: 'long' }), 
    year: new Date().getFullYear().toString(),
    qtyDeclared: '', 
    verifiedQty: '', 
    projectedQty: '', 
    underDeclared: '0', 
    buyingPrice: '', 
    sellingPrice: '', 
    avgVolPerDay: '' 
  }],
  nonCompliance: [],
  comments: '',
  distName: '',
  distContacts: '',
  distVolPerDay: '',
  distPermitNo: '',
  distAreaOfSale: '',
  distOutlets: [{ location: '', volPerDay: '', permitStatus: 'None', levyInfo: 'Does not Qualify' }],
  distNatureOfProduce: [],
  distPrice: '',
  distributors: [{
    name: '',
    contacts: '',
    volPerDay: '',
    permitNo: '',
    areaOfSale: '',
    outlets: [{ location: '', volPerDay: '', permitStatus: 'None', levyInfo: 'Does not Qualify' }],
    natureOfProduce: [],
    prices: {}
  }]
};

const getMirroredSellingPrice = (product: string, sales: SalesEntry[]): string => {
  if (!sales || sales.length === 0) return '';
  const lastSale = sales[sales.length - 1];
  if (lastSale && lastSale.sellingPrice) {
    const prices = parseSellingPrices(lastSale.sellingPrice);
    if (prices[product]) {
      return prices[product];
    }
  }
  for (let i = sales.length - 1; i >= 0; i--) {
    const prices = parseSellingPrices(sales[i].sellingPrice || '');
    if (prices[product]) {
      return prices[product];
    }
  }
  return '';
};

export function DataValidationModule() {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [clients, setClients] = useState<LicensedClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState<LicensedClient | null>(null);
  const [validationPremiseMode, setValidationPremiseMode] = useState<string>('main');
  const [mismatchFields, setMismatchFields] = useState<{
    key: string;
    label: string;
    validationVal: string;
    clientVal: string;
    selectedVal?: 'validation' | 'client';
  }[]>([]);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [reconciliationResolved, setReconciliationResolved] = useState(true);
  const [returnsData, setReturnsData] = useState<ClientReturn[]>([]);

  const [isConnected, setIsConnected] = useState(true); // Default to true for Service Account mode
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [step, setStep] = useState(0);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [lastCollections, setLastCollections] = useState<{ month: string, year: string, date: string, fullPeriod: string, displayString: string, matchedPremise?: string, pdfPath?: string, rawData?: any }[]>([]);
  const [isCheckingHistory, setIsCheckingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  
  const [lastDboRecords, setLastDboRecords] = useState<any[]>([]);
  const [isCheckingDbo, setIsCheckingDbo] = useState(false);
  const [dboError, setDboError] = useState<string | null>(null);

  const [distributorRecords, setDistributorRecords] = useState<Record<number, any[]>>({});
  const [isCheckingDist, setIsCheckingDist] = useState<Record<number, boolean>>({});
  const [declarations, setDeclarations] = useState({
    accurate: false,
    offense: false,
    awareness: false
  });

  const [isValidationPeriodEdited, setIsValidationPeriodEdited] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [failedFields, setFailedFields] = useState<string[]>([]);
  const [isAmendment, setIsAmendment] = useState(false);

  const [globalUnit, setGlobalUnit] = useState<'L' | 'Kg'>('L');

  const handleGlobalUnitChange = (targetUnit: 'L' | 'Kg') => {
    if (globalUnit === targetUnit) return;

    const conversionFactor = targetUnit === 'Kg' ? 1.03 : (1 / 1.03);

    setFormData(prev => {
      // Convert intakes quantity
      const updatedIntakes = prev.intakes.map(intake => {
        const qty = parseFloat(intake.quantity);
        if (isNaN(qty) || intake.quantity.trim() === '') return intake;
        const convertedQty = (qty * conversionFactor).toFixed(2).replace(/\.?0+$/, '');
        const convertedAvg = (parseFloat(convertedQty) / 30).toFixed(2).replace(/\.?0+$/, '');
        return {
          ...intake,
          quantity: convertedQty,
          avgVolPerDay: convertedAvg
        };
      });

      // Convert sales quantities
      const updatedSales = prev.sales.map(sale => {
        const convertField = (val: string) => {
          const num = parseFloat(val);
          if (isNaN(num) || val.trim() === '') return val;
          return (num * conversionFactor).toFixed(2).replace(/\.?0+$/, '');
        };

        const qtyDeclared = convertField(sale.qtyDeclared);
        const verifiedQty = convertField(sale.verifiedQty);
        const projectedQty = convertField(sale.projectedQty);
        const underDeclared = convertField(sale.underDeclared);
        const avgVolPerDay = (parseFloat(verifiedQty) / 30).toFixed(2).replace(/\.?0+$/, '');

        return {
          ...sale,
          qtyDeclared,
          verifiedQty,
          projectedQty,
          underDeclared,
          avgVolPerDay
        };
      });

      return {
        ...prev,
        intakes: updatedIntakes,
        sales: updatedSales
      };
    });

    setGlobalUnit(targetUnit);
  };

  const getInputClass = (name: string, extraClasses: string = '', basePadding: string = 'px-4 py-2 rounded-xl') => {
    const isFailed = failedFields.includes(name);
    const borderClass = isFailed
      ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200';
    return `w-full border transition-all outline-none ${basePadding} ${borderClass} ${extraClasses}`;
  };

  useEffect(() => {
    // Auto calculate under declared volume and mirror farmerPrice to buyingPrice for each sales entry
    const isMirroredCategory = formData.category === 'CP>5,000 L/D' || formData.category === 'CP<5,000 L/D' || formData.category === 'Processor';

    const updatedSales = formData.sales.map(sale => {
      const declared = parseFloat(sale.qtyDeclared) || 0;
      const verified = parseFloat(sale.verifiedQty) || 0;
      const diff = Math.max(0, verified - declared);
      
      // Mirror farmerPrice to buyingPrice if there is a matching intake month and year and the category is mirrored
      const match = isMirroredCategory ? formData.intakes.find(
        i => i.month && i.year && i.month === sale.month && i.year === sale.year
      ) : null;
      const buyingPrice = match ? match.farmerPrice : sale.buyingPrice;

      return { 
        ...sale, 
        underDeclared: diff.toString(),
        buyingPrice
      };
    });

    // Auto populate non-compliance based on under-declaration
    const newNonCompliance = formData.hasLocalSales 
      ? updatedSales
        .filter(sale => parseFloat(sale.underDeclared) > 0 && sale.month.trim() !== '')
        .map(sale => {
          const displayMonth = `${sale.month} ${sale.year}`;
          // Find existing entry to preserve data
          const existing = formData.nonCompliance.find(nc => nc.month === displayMonth);
          
          return {
            month: displayMonth,
            litres: sale.underDeclared,
            amount: existing?.amount || '', // Manual entry now
            paymentMonthYear: existing?.paymentMonthYear || '',
            mpesaRef: existing?.mpesaRef || ''
          };
        })
      : [];

    const salesChanged = JSON.stringify(updatedSales) !== JSON.stringify(formData.sales);
    const ncChanged = JSON.stringify(newNonCompliance) !== JSON.stringify(formData.nonCompliance);

    if (salesChanged || ncChanged) {
      setFormData(prev => ({ 
        ...prev, 
        sales: updatedSales,
        nonCompliance: newNonCompliance 
      }));
    }
  }, [formData.sales, formData.intakes, formData.category]);

  const totalPenalty = formData.nonCompliance.reduce((sum, nc) => sum + (parseFloat(nc.amount) || 0), 0);

  useEffect(() => {
    const verifyApi = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data: any = await res.json();
          console.log('API is healthy', data);
          setIsConnected(data.configured);
        } else {
          console.log('API health check failed:', res.status);
          setIsConnected(false);
        }
      } catch (err) {
        console.error('API unreachable:', err);
        setIsConnected(false);
      }
    };
    verifyApi();
  }, []);

  // Fetch last 3 months history for the Premise
  useEffect(() => {
    const fetchHistory = async () => {
      if (!supabase || !formData.premiseName || formData.premiseName.trim().length < 3) {
        setLastCollections([]);
        setHistoryError(null);
        return;
      }

      setIsCheckingHistory(true);
      setHistoryError(null);
      try {
        const searchTerm = formData.premiseName.trim();
        // Use partial matching with wildcards for long names
        const { data, error } = await supabase
          .from('kdb_validations')
          .select('validation_period, date, premise_name, raw_data, pdf_path')
          .ilike('premise_name', `%${searchTerm}%`)
          .order('date', { ascending: false })
          .limit(50); // Fetch more records to ensure we get all historical months

        if (error) throw error;

        if (data) {
          const allExtractedMonths: { period: string; pdfPath?: string; score: number; rawData?: any }[] = [];
          
          const extractPeriodsFromString = (str: string): { period: string; score: number }[] => {
            if (!str) return [];
            const results: { period: string; score: number }[] = [];
            
            const fullMonths = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
            const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            
            // Clean up and lowercase to keep parsing simple
            const cleanStr = str.toLowerCase().replace(/[^a-z0-9]/g, ' ');
            const words = cleanStr.split(/\s+/).filter(Boolean);
            
            // Find 4-digit years or 2-digit years
            const years: number[] = [];
            words.forEach(w => {
              const num = parseInt(w, 10);
              if (!isNaN(num)) {
                if (num >= 2000 && num <= 2100) {
                  years.push(num);
                } else if (num >= 20 && num <= 99 && w.length === 2) {
                  years.push(2000 + num);
                }
              }
            });

            const defaultYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();
            
            // Find all month words
            const foundMonths: { name: string; index: number; wordPosition: number }[] = [];
            words.forEach((w, idx) => {
              let mIdx = fullMonths.indexOf(w);
              if (mIdx === -1) {
                if (w === 'sept') {
                  mIdx = 8;
                } else {
                  mIdx = shortMonths.indexOf(w);
                }
              }
              if (mIdx !== -1) {
                foundMonths.push({
                  name: fullMonths[mIdx],
                  index: mIdx,
                  wordPosition: idx
                });
              }
            });

            if (foundMonths.length === 0) {
              return [];
            }

            const isRange = str.includes('-') || str.toLowerCase().includes('to') || str.toLowerCase().includes('through');
            
            // Handle cross-year and single-year ranges like "Oct - Dec 24" or "Oct 24 to Feb 25"
            if (foundMonths.length === 2 && isRange) {
              const m1 = foundMonths[0];
              const m2 = foundMonths[1];
              
              const getYearForMonth = (wordPos: number) => {
                if (years.length === 0) return defaultYear;
                let closestYear = years[0];
                let minDistance = Infinity;
                words.forEach((w, wIdx) => {
                  const num = parseInt(w, 10);
                  if (!isNaN(num)) {
                    let yVal = num;
                    if (num >= 20 && num <= 99 && w.length === 2) {
                      yVal = 2000 + num;
                    }
                    if (yVal >= 2000 && yVal <= 2100) {
                      const dist = Math.abs(wIdx - wordPos);
                      if (dist < minDistance) {
                        minDistance = dist;
                        closestYear = yVal;
                      }
                    }
                  }
                });
                return closestYear;
              };

              const y1 = getYearForMonth(m1.wordPosition);
              const y2 = getYearForMonth(m2.wordPosition);
              const score1 = y1 * 12 + m1.index;
              const score2 = y2 * 12 + m2.index;
              
              if (score1 <= score2) {
                for (let s = score1; s <= score2; s++) {
                  const y = Math.floor(s / 12);
                  const mIdx = s % 12;
                  const monthName = fullMonths[mIdx];
                  const capMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                  results.push({
                    period: `${capMonthName} ${y}`,
                    score: s
                  });
                }
                return results;
              }
            }

            // Normal individual mapping
            foundMonths.forEach((m) => {
              let associatedYear = defaultYear;
              if (years.length > 0) {
                let minDistance = Infinity;
                words.forEach((w, wIdx) => {
                  const num = parseInt(w, 10);
                  if (!isNaN(num)) {
                    let yVal = num;
                    if (num >= 20 && num <= 99 && w.length === 2) {
                      yVal = 2000 + num;
                    }
                    if (yVal >= 2000 && yVal <= 2100) {
                      const dist = Math.abs(wIdx - m.wordPosition);
                      if (dist < minDistance) {
                        minDistance = dist;
                        associatedYear = yVal;
                      }
                    }
                  }
                });
              }

              const capMonthName = m.name.charAt(0).toUpperCase() + m.name.slice(1);
              results.push({
                period: `${capMonthName} ${associatedYear}`,
                score: associatedYear * 12 + m.index
              });
            });

            return results;
          };

          data.forEach(item => {
            const raw = item.raw_data as any;
            const periodsInThisRecord: string[] = [];
            
            if (raw) {
              const isCoolingPlant = raw.category === 'CP>5,000 L/D' || raw.category === 'CP<5,000 L/D' || raw.category === 'Processor';
              
              if (isCoolingPlant && !raw.hasLocalSales && raw.intakes && raw.intakes.length > 0) {
                raw.intakes.forEach((i: any) => {
                  if (i.month && i.year) {
                    periodsInThisRecord.push(`${i.month} ${i.year}`);
                  }
                });
              } else if (raw.sales && raw.sales.length > 0) {
                raw.sales.forEach((s: any) => {
                  if (s.month && s.year) {
                    periodsInThisRecord.push(`${s.month} ${s.year}`);
                  }
                });
              }
            }
            
            // Always fallback / include the validation_period itself
            if (item.validation_period) {
              periodsInThisRecord.push(item.validation_period);
            }
            
            // Score and parse each period
            periodsInThisRecord.forEach(p => {
              const parsed = extractPeriodsFromString(p);
              parsed.forEach(res => {
                allExtractedMonths.push({ 
                  period: res.period, 
                  pdfPath: item.pdf_path, 
                  score: res.score,
                  rawData: item.raw_data
                });
              });
            });
          });

          // Deduplicate based on period, keeping the one with a PDF if possible
          const deduplicated: Record<string, { period: string; pdfPath?: string; score: number; rawData?: any }> = {};
          allExtractedMonths.forEach(m => {
            const key = m.period.toLowerCase();
            if (!deduplicated[key] || (!deduplicated[key].pdfPath && m.pdfPath)) {
              deduplicated[key] = m;
            }
          });

          // Convert to array and sort descending by chronological score (newest first)
          const sortedList = Object.values(deduplicated).sort((a, b) => b.score - a.score);

          // Get absolute top 3 newest months
          const top3 = sortedList.slice(0, 3);

          const history = top3.map(m => ({
            month: '', 
            year: '',
            date: '',
            fullPeriod: m.period,
            displayString: m.period,
            matchedPremise: data[0]?.premise_name,
            pdfPath: m.pdfPath,
            rawData: m.rawData
          }));
          setLastCollections(history);
        }
      } catch (err: any) {
        console.error('Error fetching history:', err);
        setHistoryError(err.message || 'Failed to fetch history');
      } finally {
        setIsCheckingHistory(false);
      }
    };

    const timer = setTimeout(fetchHistory, 800); // Debounce lookup
    return () => clearTimeout(timer);
  }, [formData.premiseName]);

  // Fetch previous validations by DBO Name
  useEffect(() => {
    const fetchDboHistory = async () => {
      if (!supabase || !formData.dboName || formData.dboName.trim().length < 3) {
        setLastDboRecords([]);
        setDboError(null);
        return;
      }

      setIsCheckingDbo(true);
      setDboError(null);
      try {
        const searchTerm = formData.dboName.trim();
        const { data, error } = await supabase
          .from('kdb_validations')
          .select('dbo_name, premise_name, category, permit_no, location, county, raw_data, date')
          .ilike('dbo_name', `%${searchTerm}%`)
          .order('date', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        // Deduplicate records by unique premise, permit to yield cleanest autofill options
        if (data) {
          const uniqueMap: Record<string, any> = {};
          data.forEach(item => {
            const key = `${item.premise_name || ''}-${item.permit_no || ''}`.toLowerCase().trim();
            if (!uniqueMap[key]) {
              uniqueMap[key] = item;
            }
          });
          setLastDboRecords(Object.values(uniqueMap).slice(0, 5));
        } else {
          setLastDboRecords([]);
        }
      } catch (err: any) {
        console.error('Error fetching DBO history:', err);
        setDboError(err.message || 'Failed to fetch DBO history');
      } finally {
        setIsCheckingDbo(false);
      }
    };

    const timer = setTimeout(fetchDboHistory, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [formData.dboName]);

  // Load saved draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('kdb_validation_form_draft');
    if (draft) {
      try {
        JSON.parse(draft);
        setHasDraft(true);
      } catch (e) {
        localStorage.removeItem('kdb_validation_form_draft');
        localStorage.removeItem('kdb_validation_form_draft_step');
      }
    }
  }, []);

  // Save draft when form data changes
  useEffect(() => {
    // Prevent overwriting existing draft on page load before user decides to restore/discard it
    if (hasDraft) return;

    const hasPopulatedInput = 
      formData.dboName || 
      formData.premiseName || 
      formData.permitNo || 
      formData.validationPeriod || 
      formData.sales.some(s => s.qtyDeclared || s.verifiedQty) ||
      formData.intakes.some(i => i.quantity);

    if (hasPopulatedInput) {
      localStorage.setItem('kdb_validation_form_draft', JSON.stringify(formData));
      localStorage.setItem('kdb_validation_form_draft_step', step.toString());
    }
  }, [formData, step, hasDraft]);

  const handleRestoreDraft = () => {
    const draft = localStorage.getItem('kdb_validation_form_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(parsed);
        setFailedFields([]);
        // Restore step from localStorage if available, otherwise fallback
        const savedStep = localStorage.getItem('kdb_validation_form_draft_step');
        if (savedStep) {
          setStep(parseInt(savedStep, 10));
        } else if (parsed.branch) {
          setStep(1); // Resume at step 1 if the user started
        }
        setStatus({ type: 'success', message: 'Unsaved draft successfully restored!' });
      } catch (e) {
        console.error(e);
      }
    }
    setHasDraft(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('kdb_validation_form_draft');
    localStorage.removeItem('kdb_validation_form_draft_step');
    setHasDraft(false);
    setStatus({ type: 'success', message: 'Draft cleared.' });
  };

  const handleDboAutofill = (record: any) => {
    const raw = record.raw_data || {};
    const permitNo = raw.permitNo || record.permit_no || '';
    const nextForm = {
      ...formData,
      dboName: record.dbo_name || formData.dboName,
      permitNo: permitNo || formData.permitNo,
      premiseName: raw.premiseName || record.premise_name || formData.premiseName,
      category: raw.category || record.category || formData.category,
      contacts: raw.contacts || formData.contacts,
      county: raw.county || record.county || formData.county,
      location: raw.location || record.location || formData.location,
      expiryDate: raw.expiryDate || formData.expiryDate || '',
      validationPeriod: raw.validationPeriod || formData.validationPeriod || '',
      distPermitNo: raw.distPermitNo || permitNo || formData.distPermitNo || '',
    };
    setFormData(nextForm);
    
    // Once they autofill, allow override and prevent background useEffect from overriding it
    setIsValidationPeriodEdited(true);

    // Clear matches to hide suggestions
    setLastDboRecords([]);
    
    // Clear any failed fields
    setFailedFields(prev => prev.filter(f => ![
      'dboName', 'permitNo', 'premiseName', 'category', 'contacts', 'county', 'location', 'expiryDate'
    ].includes(f)));

    // Trigger reconciliation check with clients table
    if (clients.length > 0) {
      const matched = findMatchingClient(permitNo, record.dbo_name || '');
      if (matched) {
        setSelectedClient(matched);
        setValidationPremiseMode('main');
        checkReconciliation(matched, nextForm);
      }
    }
  };

  const handleInputBlur = () => {
    if (clients.length === 0) return;
    
    const termPermit = (formData.permitNo || '').trim();
    const termDbo = (formData.dboName || '').trim();

    if (!termPermit && !termDbo) {
      setSelectedClient(null);
      setValidationPremiseMode('main');
      return;
    }

    const matched = findMatchingClient(termPermit, termDbo);

    if (matched) {
      setSelectedClient(matched);
      setValidationPremiseMode('main');
      checkReconciliation(matched, formData);
    }
  };

  const handlePremiseModeChange = (mode: string) => {
    setValidationPremiseMode(mode);
    if (!selectedClient) return;

    if (mode === 'main') {
      // Revert form fields to main client profile
      setFormData(prev => ({
        ...prev,
        premiseName: selectedClient.premiseName || '',
        permitNo: selectedClient.id || '',
        category: selectedClient.premiseCategory || 'Milk Bar',
        location: selectedClient.location || '',
        county: selectedClient.county || 'Kericho',
        expiryDate: (selectedClient as any).expiryDate || (selectedClient as any).expiry_date || ''
      }));
      // Trigger reconciliation check
      checkReconciliation(selectedClient, {
        ...formData,
        premiseName: selectedClient.premiseName || '',
        permitNo: selectedClient.id || '',
        category: selectedClient.premiseCategory || 'Milk Bar',
        location: selectedClient.location || '',
        county: selectedClient.county || 'Kericho',
        expiryDate: (selectedClient as any).expiryDate || (selectedClient as any).expiry_date || ''
      });
    } else if (mode.startsWith('branch-')) {
      // Find branch
      const branchId = mode.replace('branch-', '');
      const branch = (selectedClient.branches || []).find(b => b.id === branchId);
      if (branch) {
        setFormData(prev => ({
          ...prev,
          premiseName: branch.premiseName,
          permitNo: branch.permitNumber,
          category: branch.premiseCategory,
          location: branch.location,
          county: branch.county,
          expiryDate: branch.expiryDate || ''
        }));
      }
      // Since it's an existing branch being validated, clear reconciliation screen for parent profile
      setShowReconciliation(false);
      setReconciliationResolved(true);
    } else if (mode === 'new') {
      // It's a new branch, clear fields or keep them so they can edit
      setShowReconciliation(false);
      setReconciliationResolved(true);
    }
  };

  const handleDistributorAutofill = (idx: number, record: any) => {
    const raw = record.raw_data || {};
    const permitNo = raw.permitNo || record.permit_no || '';
    const contacts = raw.contacts || record.contacts || '';
    const name = record.dbo_name || record.premise_name || '';

    setFormData(prev => {
      const updatedDistributors = [...prev.distributors];
      if (updatedDistributors[idx]) {
        updatedDistributors[idx] = {
          ...updatedDistributors[idx],
          name: name,
          contacts: contacts,
          permitNo: permitNo,
        };
      }
      return {
        ...prev,
        distributors: updatedDistributors
      };
    });

    // Clear matches for this index to hide suggestions
    setDistributorRecords(prev => ({ ...prev, [idx]: [] }));
    setFailedFields(prev => prev.filter(f => ![
      `dist-${idx}-name`, `dist-${idx}-contacts`, `dist-${idx}-permitNo`
    ].includes(f)));
  };

  const handleRecallSubmission = (rawData: any) => {
    if (rawData) {
      setFormData({
        ...initialData,
        ...rawData,
        distOutlets: rawData.distOutlets || [{ location: '', volPerDay: '', permitStatus: 'None', levyInfo: '' }],
        distNatureOfProduce: rawData.distNatureOfProduce || []
      });
      setIsAmendment(true);
      setIsValidationPeriodEdited(true);
      setStep(1); // Go to general info step for amendment
      setFailedFields([]);
      setStatus({ 
        type: 'success', 
        message: `Amending validation for ${rawData.validationPeriod}. You can now correct and resubmit.` 
      });
    }
  };

  // Auto-populate validation period from table data
  useEffect(() => {
    if (isValidationPeriodEdited) return;

    const isCoolingPlant = formData.category === 'CP>5,000 L/D' || formData.category === 'CP<5,000 L/D' || formData.category === 'Processor';
    
    let period = '';
    if (isCoolingPlant) {
      // For cooling plants, prioritize intakes if local sales are disabled
      if (!formData.hasLocalSales && formData.intakes.length > 0) {
        const lastIntake = formData.intakes[formData.intakes.length - 1];
        if (lastIntake.month && lastIntake.year) period = `${lastIntake.month} ${lastIntake.year}`;
      } else if (formData.sales.length > 0) {
        const lastSale = formData.sales[formData.sales.length - 1];
        if (lastSale.month && lastSale.year) period = `${lastSale.month} ${lastSale.year}`;
      }
    } else {
      // For other categories, check sales
      if (formData.sales.length > 0) {
        const lastSale = formData.sales[formData.sales.length - 1];
        if (lastSale.month && lastSale.year) period = `${lastSale.month} ${lastSale.year}`;
      }
    }

    if (period && period !== formData.validationPeriod) {
      setFormData(prev => ({ ...prev, validationPeriod: period }));
    } else if (!formData.validationPeriod && formData.date) {
      // If period is empty, default to the month of the validation date
      const d = new Date(formData.date);
      if (!isNaN(d.getTime())) {
        const m = d.toLocaleString('default', { month: 'long' });
        const y = d.getFullYear().toString();
        setFormData(prev => ({ ...prev, validationPeriod: `${m} ${y}` }));
      }
    }
  }, [formData.sales, formData.intakes, formData.hasLocalSales, formData.category, formData.date, isValidationPeriodEdited]);

  // Fetch licensed clients and returns data on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingClients(true);
      try {
        const [clientsList, returnsList] = await Promise.all([
          DBService.getClients(),
          DBService.getReturns()
        ]);
        setClients(clientsList);
        setReturnsData(returnsList);
      } catch (e) {
        console.error('[DataValidationModule] Error fetching initial data:', e);
      } finally {
        setIsLoadingClients(false);
      }
    };
    fetchInitialData();
  }, []);

  const findMatchingClient = (pNo: string, name: string) => {
    if (clients.length === 0) return null;
    const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPermit = (s: string) => (s || '').toLowerCase().replace(/kdb|lc/g, '').replace(/[^a-z0-9]/g, '');

    const pTerm = cleanPermit(pNo);
    const nTerm = cleanStr(name);

    if (!pTerm && !nTerm) return null;

    // 1. Try to find exact permit match (excluding non-alphas)
    if (pTerm) {
      const match = clients.find(c => cleanPermit(c.id) === pTerm);
      if (match) return match;
    }

    // 2. Try to find exact name match (excluding spaces/case)
    if (nTerm) {
      const match = clients.find(c => cleanStr(c.clientName) === nTerm);
      if (match) return match;
    }

    // 3. Try partial/relaxed permit match
    if (pTerm) {
      const match = clients.find(c => {
        const cP = cleanPermit(c.id);
        return cP.includes(pTerm) || pTerm.includes(cP);
      });
      if (match) return match;
    }

    // 4. Try partial/relaxed name match
    if (nTerm) {
      const match = clients.find(c => {
        const cN = cleanStr(c.clientName);
        return cN.includes(nTerm) || nTerm.includes(cN);
      });
      if (match) return match;
    }

    return null;
  };

  // 7-point split-screen mismatch checker logic
  const checkReconciliation = (client: LicensedClient, currentForm: FormData) => {
    const isMatch = (key: string, vVal: string, cVal: string) => {
      const v = (vVal || '').trim();
      const c = (cVal || '').trim();
      
      if (!v && !c) return true; // both empty or null is a match
      if (!v || !c) return false; // one is empty and other isn't, so mismatch
      
      const cleanStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanPermit = (s: string) => s.toLowerCase().replace(/kdb|lc/g, '').replace(/[^a-z0-9]/g, '');

      if (key === 'category') {
        const normV = v.toLowerCase().includes('cooling plant') || v.toLowerCase().includes('cp>') || v.toLowerCase().includes('cp<') || v.toLowerCase().includes('cp ') ? 'coolingplant' : cleanStr(v);
        const normC = c.toLowerCase().includes('cooling plant') || c.toLowerCase().includes('cp>') || c.toLowerCase().includes('cp<') || c.toLowerCase().includes('cp ') ? 'coolingplant' : cleanStr(c);
        return normV === normC;
      }
      
      if (key === 'permitNo') {
        const pV = cleanPermit(v);
        const pC = cleanPermit(c);
        return pV === pC || pV.includes(pC) || pC.includes(pV);
      }

      if (key === 'contacts') {
        // Strip non-numeric characters for phone numbers
        const pV = v.replace(/[^0-9]/g, '');
        const pC = c.replace(/[^0-9]/g, '');
        if (pV && pC) {
          // Compare last 9 digits to ignore country codes (e.g., +254 vs 07)
          return pV.slice(-9) === pC.slice(-9);
        }
      }

      if (key === 'expiryDate') {
        const dV = v.replace(/[^0-9]/g, '');
        const dC = c.replace(/[^0-9]/g, '');
        return dV === dC || v.toLowerCase().trim() === c.toLowerCase().trim();
      }
      
      return cleanStr(v) === cleanStr(c);
    };

    const points = [
      { key: 'dboName', label: 'Name of DBO (clientname)', validationVal: currentForm.dboName || '', clientVal: client.clientName || '' },
      { key: 'premiseName', label: 'Premise Name (premises)', validationVal: currentForm.premiseName || '', clientVal: client.premiseName || '' },
      { key: 'permitNo', label: 'Permit Number (permit_number)', validationVal: currentForm.permitNo || '', clientVal: client.id || '' },
      { key: 'location', label: 'Location (location)', validationVal: currentForm.location || '', clientVal: client.location || '' },
      { key: 'category', label: 'Category (category)', validationVal: currentForm.category || '', clientVal: client.premiseCategory || '' },
      { key: 'contacts', label: 'Contacts (contacts)', validationVal: currentForm.contacts || '', clientVal: client.tel || '' },
      { key: 'expiryDate', label: 'Expiry Date (expiry_date)', validationVal: currentForm.expiryDate || '', clientVal: (client as any).expiryDate || (client as any).expiry_date || '' }
    ];

    const mismatches = points.filter(p => !isMatch(p.key, p.validationVal, p.clientVal));
    
    if (mismatches.length > 0) {
      setMismatchFields(mismatches.map(m => ({ ...m, selectedVal: undefined })));
      setShowReconciliation(true);
      setReconciliationResolved(false);
    } else {
      setMismatchFields([]);
      setShowReconciliation(false);
      setReconciliationResolved(true);
    }
  };

  const handleResolveReconciliation = async () => {
    if (!selectedClient) return;

    const unresolved = mismatchFields.some(m => !m.selectedVal);
    if (unresolved) {
      alert("Please select the latest source of truth for all mismatch fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedForm = { ...formData };
      const updatedClient = { ...selectedClient };

      mismatchFields.forEach(item => {
        const chosenVal = item.selectedVal === 'validation' ? item.validationVal : item.clientVal;
        
        // Update form data state
        (updatedForm as any)[item.key] = chosenVal;

        // Update client object
        if (item.key === 'dboName') {
          updatedClient.clientName = chosenVal;
        } else if (item.key === 'premiseName') {
          updatedClient.premiseName = chosenVal;
        } else if (item.key === 'permitNo') {
          updatedClient.id = chosenVal;
        } else if (item.key === 'location') {
          updatedClient.location = chosenVal;
        } else if (item.key === 'category') {
          updatedClient.premiseCategory = chosenVal as any;
        } else if (item.key === 'contacts') {
          updatedClient.tel = chosenVal;
        } else if (item.key === 'expiryDate') {
          (updatedClient as any).expiryDate = chosenVal;
          (updatedClient as any).expiry_date = chosenVal;
        }
      });

      // Save client to licensed_clients table in Supabase via DBService
      await DBService.saveClient(updatedClient);

      // Update local states
      setFormData(updatedForm);
      setSelectedClient(updatedClient);
      setShowReconciliation(false);
      setReconciliationResolved(true);
      
      // Refresh clients list from database to ensure absolute source of truth
      const refreshedClients = await DBService.getClients();
      setClients(refreshedClients);

      setStatus({ type: 'success', message: 'Reconciliation completed. Client profile and Data Validation fields are synchronized.' });
    } catch (err: any) {
      console.error("Reconciliation save error:", err);
      setStatus({ type: 'error', message: `Failed to synchronize reconciliation: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Returns quantity injection pipeline
  useEffect(() => {
    if (!formData.dboName || returnsData.length === 0) return;

    setFormData(prev => {
      let hasChanged = false;
      const updatedSales = prev.sales.map(sale => {
        if (!sale.month || !sale.year) {
          return sale;
        }

        const cleanDboName = prev.dboName.toLowerCase().trim();
        const cleanMonth = sale.month.toLowerCase().trim();
        const yearNum = Number(sale.year);

        const matchingReturn = returnsData.find(r => {
          const clientMatches = r.clientName.toLowerCase().trim() === cleanDboName ||
            (selectedClient && r.clientId === selectedClient.id);
          const periodMatches = r.period.toLowerCase().trim() === cleanMonth;
          const yearMatches = Number(r.year) === yearNum;
          return clientMatches && periodMatches && yearMatches;
        });

        const targetQty = matchingReturn && matchingReturn.qty !== undefined && matchingReturn.qty !== null
          ? matchingReturn.qty.toString()
          : 'Not Filed';

        if (sale.qtyDeclared !== targetQty) {
          hasChanged = true;
          // Mirror to verifiedQty too so calculations work out-of-the-box
          return { 
            ...sale, 
            qtyDeclared: targetQty,
            verifiedQty: targetQty === 'Not Filed' ? '0' : targetQty,
            avgVolPerDay: targetQty === 'Not Filed' ? '0' : (parseFloat(targetQty) / 30).toFixed(2).replace(/\.?0+$/, '')
          };
        }
        return sale;
      });

      if (hasChanged) {
        return { ...prev, sales: updatedSales };
      }
      return prev;
    });
  }, [formData.dboName, selectedClient, returnsData, formData.sales]);

  // Keep distPermitNo in sync with permitNo if empty
  useEffect(() => {
    if (formData.permitNo && !formData.distPermitNo) {
      setFormData(prev => ({ ...prev, distPermitNo: prev.permitNo }));
    }
  }, [formData.permitNo]);

  // Sync first distributor fields to individual legacy form fields
  useEffect(() => {
    if (formData.category === 'Mini Dairy' || formData.category === 'Cottage Industry') {
      const firstDist = formData.distributors?.[0];
      if (firstDist) {
        setFormData(prev => {
          const firstPriceKey = firstDist.natureOfProduce?.[0] || '';
          const firstPrice = firstDist.prices[firstPriceKey] !== undefined
            ? firstDist.prices[firstPriceKey]
            : getMirroredSellingPrice(firstPriceKey, prev.sales);
          if (
            prev.distName !== firstDist.name ||
            prev.distContacts !== firstDist.contacts ||
            prev.distVolPerDay !== firstDist.volPerDay ||
            prev.distPermitNo !== firstDist.permitNo ||
            prev.distAreaOfSale !== firstDist.areaOfSale ||
            prev.distPrice !== firstPrice ||
            JSON.stringify(prev.distOutlets) !== JSON.stringify(firstDist.outlets) ||
            JSON.stringify(prev.distNatureOfProduce) !== JSON.stringify(firstDist.natureOfProduce)
          ) {
            return {
              ...prev,
              distName: firstDist.name,
              distContacts: firstDist.contacts,
              distVolPerDay: firstDist.volPerDay,
              distPermitNo: firstDist.permitNo,
              distAreaOfSale: firstDist.areaOfSale,
              distPrice: firstPrice,
              distOutlets: firstDist.outlets,
              distNatureOfProduce: firstDist.natureOfProduce
            };
          }
          return prev;
        });
      }
    }
  }, [formData.distributors, formData.sales, formData.category]);

  // Fetch previous validations by Distributor Name (Debounced)
  useEffect(() => {
    if (!supabase) return;

    const timers: NodeJS.Timeout[] = [];

    formData.distributors.forEach((dist, idx) => {
      const name = dist.name || '';
      if (name.trim().length < 3) {
        setDistributorRecords(prev => {
          if (prev[idx] && prev[idx].length > 0) {
            return { ...prev, [idx]: [] };
          }
          return prev;
        });
        return;
      }

      setIsCheckingDist(prev => {
        if (!prev[idx]) {
          return { ...prev, [idx]: true };
        }
        return prev;
      });

      const timer = setTimeout(async () => {
        try {
          const searchTerm = name.trim();
          const { data, error } = await supabase
            .from('kdb_validations')
            .select('dbo_name, premise_name, permit_no, contacts, raw_data, date')
            .or(`dbo_name.ilike.%${searchTerm}%,premise_name.ilike.%${searchTerm}%`)
            .order('date', { ascending: false })
            .limit(10);

          if (error) throw error;

          if (data) {
            const uniqueMap: Record<string, any> = {};
            data.forEach(item => {
              const key = `${item.premise_name || ''}-${item.permit_no || ''}`.toLowerCase().trim();
              if (!uniqueMap[key]) {
                uniqueMap[key] = item;
              }
            });
            const results = Object.values(uniqueMap).slice(0, 5);
            setDistributorRecords(prev => ({ ...prev, [idx]: results }));
          } else {
            setDistributorRecords(prev => ({ ...prev, [idx]: [] }));
          }
        } catch (err) {
          console.error('Error fetching distributor lookup:', err);
        } finally {
          setIsCheckingDist(prev => ({ ...prev, [idx]: false }));
        }
      }, 500);

      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [formData.distributors.map(d => d.name).join(',')]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFailedFields(prev => prev.filter(f => f !== name));
    if (name === 'validationPeriod') {
      setIsValidationPeriodEdited(true);
    }
  };

  const validateStep = (s: number) => {
    const missing: string[] = [];

    if (s === 1) {
      const required = ['branch', 'date', 'permitNo', 'expiryDate', 'dboName', 'premiseName', 'category', 'contacts', 'validationPeriod', 'county', 'location'];
      for (const field of required) {
        const value = formData[field as keyof FormData];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          missing.push(field);
        }
      }

      if (missing.length > 0) {
        setFailedFields(prev => Array.from(new Set([...prev, ...missing])));
        const firstFieldLabel = missing[0].replace(/([A-Z])/g, ' $1').toLowerCase();
        setStatus({ type: 'error', message: `Please fill in all general information fields (missing: ${firstFieldLabel}).` });
        return false;
      }
    } else if (s === 2) {
      if (formData.category === 'CP>5,000 L/D' || formData.category === 'CP<5,000 L/D' || formData.category === 'Processor') {
        formData.intakes.forEach((intake, idx) => {
          if (!intake.month) missing.push(`intake-${idx}-month`);
          if (!intake.year) missing.push(`intake-${idx}-year`);
          if (!intake.quantity || intake.quantity.trim() === '') missing.push(`intake-${idx}-quantity`);
          if (!intake.farmerPrice || intake.farmerPrice.trim() === '') missing.push(`intake-${idx}-farmerPrice`);
          if (!intake.processor || intake.processor.trim() === '') missing.push(`intake-${idx}-processor`);
          if (!intake.processorPrice || intake.processorPrice.trim() === '') missing.push(`intake-${idx}-processorPrice`);
        });
      }
      if (formData.hasLocalSales) {
        formData.sales.forEach((sale, idx) => {
          if (!sale.month) missing.push(`sale-${idx}-month`);
          if (!sale.year) missing.push(`sale-${idx}-year`);
          if (!sale.qtyDeclared || sale.qtyDeclared.trim() === '') missing.push(`sale-${idx}-qtyDeclared`);
          if (!sale.verifiedQty || sale.verifiedQty.trim() === '') missing.push(`sale-${idx}-verifiedQty`);
          
          const isLastMonth = idx === formData.sales.length - 1;
          if (isLastMonth) {
            if (!sale.projectedQty || sale.projectedQty.trim() === '') missing.push(`sale-${idx}-projectedQty`);
          }
          
          if (!sale.buyingPrice || sale.buyingPrice.trim() === '') missing.push(`sale-${idx}-buyingPrice`);
          
          if (formData.natureOfProduce.length > 0) {
            const currentPrices = parseSellingPrices(sale.sellingPrice || '');
            const allFilled = formData.natureOfProduce.every(prod => currentPrices[prod] && currentPrices[prod].trim() !== '');
            if (!allFilled) {
              missing.push(`sale-${idx}-sellingPrice`);
            }
          } else if (!sale.sellingPrice || sale.sellingPrice.trim() === '') {
            missing.push(`sale-${idx}-sellingPrice`);
          }
        });
      }
      if (formData.natureOfProduce.length === 0) {
        missing.push('natureOfProduce');
      }
      if (!formData.source || formData.source.trim() === '') {
        missing.push('source');
      }

      if (formData.category === 'Mini Dairy' || formData.category === 'Cottage Industry') {
        formData.distributors.forEach((dist, dIdx) => {
          if (!dist.name || dist.name.trim() === '') missing.push(`dist-${dIdx}-name`);
          if (!dist.contacts || dist.contacts.trim() === '') missing.push(`dist-${dIdx}-contacts`);
          if (!dist.volPerDay || dist.volPerDay.trim() === '') missing.push(`dist-${dIdx}-volPerDay`);
          if (!dist.permitNo || dist.permitNo.trim() === '') missing.push(`dist-${dIdx}-permitNo`);
          if (!dist.areaOfSale || dist.areaOfSale.trim() === '') missing.push(`dist-${dIdx}-areaOfSale`);
          if (!dist.natureOfProduce || dist.natureOfProduce.length === 0) missing.push(`dist-${dIdx}-natureOfProduce`);

          if (dist.natureOfProduce && dist.natureOfProduce.length > 0) {
            dist.natureOfProduce.forEach(product => {
              const price = dist.prices[product] !== undefined ? dist.prices[product] : getMirroredSellingPrice(product, formData.sales);
              if (!price || price.trim() === '') {
                missing.push(`dist-${dIdx}-price-${product}`);
              }
            });
          }

          if (dist.outlets) {
            dist.outlets.forEach((outlet, oIdx) => {
              if (!outlet.location || outlet.location.trim() === '') missing.push(`dist-${dIdx}-outlet-${oIdx}-location`);
              if (!outlet.volPerDay || outlet.volPerDay.trim() === '') missing.push(`dist-${dIdx}-outlet-${oIdx}-volPerDay`);
            });
          }
        });
      }

      if (missing.length > 0) {
        setFailedFields(prev => Array.from(new Set([...prev, ...missing])));
        if (missing.includes('natureOfProduce')) {
          setStatus({ type: 'error', message: 'Please select at least one nature of produce.' });
        } else if (missing.includes('source')) {
          setStatus({ type: 'error', message: 'Please fill in the source field.' });
        } else if (missing.some(m => m.startsWith('intake-'))) {
          setStatus({ type: 'error', message: 'Please complete all fields in the monthly intake section.' });
        } else if (missing.some(m => m.startsWith('sale-'))) {
          setStatus({ type: 'error', message: 'Please complete all fields in the local sales section.' });
        } else if (missing.some(m => m.startsWith('distOutlet-'))) {
          setStatus({ type: 'error', message: 'Please complete all outlet details in the distribution section.' });
        } else if (missing.some(m => m.startsWith('dist'))) {
          setStatus({ type: 'error', message: 'Please complete all required fields in the Distribution Details section.' });
        } else {
          setStatus({ type: 'error', message: 'Please complete all required fields.' });
        }
        return false;
      }
    }

    setFailedFields(prev => prev.filter(f => {
      if (s === 1) {
        const required = ['branch', 'date', 'permitNo', 'expiryDate', 'dboName', 'premiseName', 'category', 'contacts', 'validationPeriod', 'county', 'location'];
        return !required.includes(f);
      }
      if (s === 2) {
        return f.startsWith('intake-') || f.startsWith('sale-') || f === 'natureOfProduce' || f === 'source' || f.startsWith('dist');
      }
      return true;
    }));
    setStatus({ type: null, message: '' });
    return true;
  };

  const handleStart = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setFormData(prev => ({ 
      ...prev, 
      startTime: timeStr,
      date: getLocalDate()
    }));
    setStep(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const generatePDF = async (data: FormData = formData) => {
    const doc = new jsPDF();
    let currentY = 130;

    // Helper to load image
    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = url;
      });
    };

    try {
      const logo = await loadImage(KDB_LOGO_URL);
      // Center the logo (x, y, width, height)
      doc.addImage(logo, 'PNG', 85, 10, 40, 25);
    } catch (e) {
      console.error("Could not load KDB logo for PDF", e);
    }

    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > 275) {
        doc.addPage();
        currentY = 20;
        return true;
      }
      return false;
    };

    const writeField = (label: string, value: string, x: number, y: number) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, x, y);
      const labelWidth = doc.getTextWidth(label);
      doc.setFont("helvetica", "normal");
      doc.text(` ${value || ''}`, x + labelWidth, y);
    };
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Data Validation Form", 105, 45, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(45, 47, 165, 47);
    doc.setFont("helvetica", "normal");
    
    doc.setFontSize(10);
    writeField("Branch:", data.branch, 20, 65);
    writeField("Date:", formatDate(data.date), 20, 73);
    writeField("Start Time:", data.startTime, 20, 81);
    writeField("End Time:", data.endTime, 20, 89);
    
    writeField("Dairy Business Operator (DBO) Name:", data.dboName, 20, 101);
    writeField("Premise Name:", data.premiseName, 20, 109);
    writeField("Category:", data.category, 20, 117);
    writeField("Permit No:", data.permitNo, 110, 117);
    writeField("Contacts:", data.contacts, 20, 125);
    writeField("Expiry Date:", formatDate(data.expiryDate), 110, 125);
    writeField("Location:", data.location, 20, 133);
    writeField("County:", data.county, 110, 133);
    writeField("Validation Period:", data.validationPeriod, 20, 141);

    currentY = 150;

    // Intakes Table
    if (data.category === 'CP>5,000 L/D' || data.category === 'CP<5,000 L/D' || data.category === 'Processor') {
      checkPageBreak(25);
      doc.setFontSize(12);
      doc.text("Total Monthly Intakes", 20, currentY);
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Month/Year', `Qty (${globalUnit})`, 'Farmer Price', 'Processor', 'Proc. Price', `Avg Collection/Day (${globalUnit}/Day)`]],
        body: data.intakes.map(i => [`${i.month} ${i.year}`, i.quantity, i.farmerPrice, i.processor, i.processorPrice, i.avgVolPerDay]),
        styles: { fontSize: 8 }
      });
      currentY = (doc as any).lastAutoTable.finalY;
      currentY += 10;
    }

    // Sales Table
    if (data.hasLocalSales) {
      checkPageBreak(25);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Local Sales Data", 20, currentY);
      doc.setFont("helvetica", "normal");
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Month/Year', `Declared (${globalUnit})`, `Verified (${globalUnit})`, `Projected (${globalUnit})`, `Under Declared (${globalUnit})`, 'Buying Price', 'Selling Price', `Avg Vol/Day (${globalUnit}/Day)`]],
        body: data.sales.map(s => [`${s.month} ${s.year}`, s.qtyDeclared, s.verifiedQty, s.projectedQty, s.underDeclared, s.buyingPrice, s.sellingPrice, s.avgVolPerDay]),
        styles: { fontSize: 7 }
      });
      currentY = (doc as any).lastAutoTable.finalY;
      currentY += 10;
    }

    // Distribution Details Table (for Mini Dairy & Cottage Industry)
    if (data.category === 'Mini Dairy' || data.category === 'Cottage Industry') {
      const distributors = Array.isArray((data as any).distributors) && (data as any).distributors.length > 0
        ? (data as any).distributors
        : [{
            name: data.distName,
            contacts: data.distContacts,
            volPerDay: data.distVolPerDay,
            permitNo: data.distPermitNo,
            areaOfSale: data.distAreaOfSale,
            outlets: data.distOutlets,
            natureOfProduce: data.distNatureOfProduce,
            prices: { [data.distNatureOfProduce?.[0] || 'Produce']: data.distPrice }
          }];

      distributors.forEach((dist: any, dIdx: number) => {
        checkPageBreak(55);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Distributor Details #${dIdx + 1}: ${dist.name || 'Unnamed'}`, 20, currentY);
        doc.setFont("helvetica", "normal");
        
        const outletsText = Array.isArray(dist.outlets) && dist.outlets.length > 0
          ? dist.outlets.map((o: any, index: number) => `#${index+1}: Loc: ${o.location || 'N/A'}, Vol: ${o.volPerDay || 'N/A'}, Permit: ${o.permitStatus || 'N/A'}, Levy: ${o.levyInfo || 'N/A'}`).join('\n')
          : 'None';

        const natureText = Array.isArray(dist.natureOfProduce) ? dist.natureOfProduce.join(', ') : 'N/A';

        const pricesText = dist.prices && Object.keys(dist.prices).length > 0
          ? Object.entries(dist.prices).map(([prod, price]) => `${prod}: ${price}`).join(', ')
          : (data.distPrice || 'N/A');

        autoTable(doc, {
          startY: currentY + 4,
          head: [['Field', 'Detail']],
          body: [
            ['Distributor Name', dist.name || 'N/A'],
            ['Distributor Contacts', dist.contacts || 'N/A'],
            ['Volume per Day', dist.volPerDay || 'N/A'],
            ['Permit Number', dist.permitNo || 'N/A'],
            ['Area of Sale', dist.areaOfSale || 'N/A'],
            ['Nature of Produce', natureText],
            ['Prices (Kshs)', pricesText],
            ['List of Outlets', outletsText]
          ],
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 120 }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY;
        currentY += 10;
      });
    }

    // Summary Data
    checkPageBreak(35);
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Detail', 'Value']],
      body: [
        ['Are Traceability & Records Available', data.traceability],
        ['Nature of Produce?', data.natureOfProduce.join(', ')],
        ['Source', data.source],
      ],
      styles: { fontSize: 8 }
    });
    currentY = (doc as any).lastAutoTable.finalY;
    currentY += 10;

    // Compliance Section
    checkPageBreak(25);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Compliance Commitment:", 20, currentY);
    doc.setFont("helvetica", "normal");
    
    if (data.nonCompliance.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(0, 128, 0); // Green
      doc.text("No under-declaration was witnessed.", 20, currentY + 7);
      doc.setTextColor(0, 0, 0); // Reset to black
      currentY += 15;
    } else {
      autoTable(doc, {
        startY: currentY + 5,
        head: [['CSL Period (Month/Year)', globalUnit === 'L' ? 'Litres' : 'Kilograms', 'Amount (Kshs)', 'Month/Year to Pay', 'MPESA REF']],
        body: [
          ...data.nonCompliance.map(nc => [nc.month, nc.litres, nc.amount, nc.paymentMonthYear, nc.mpesaRef]),
          [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, '', { content: totalPenalty.toFixed(2), styles: { fontStyle: 'bold' } }, '', '']
        ],
        styles: { fontSize: 8 }
      });
      currentY = (doc as any).lastAutoTable.finalY;
      currentY += 10;
    }

    if (data.comments) {
      checkPageBreak(25);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Comments:", 20, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(data.comments, 20, currentY + 5, { maxWidth: 170 });
      currentY += 20;
    }

    // Declarations
    checkPageBreak(45);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Declarations:", 20, currentY);
    doc.setFont("helvetica", "normal");
    currentY += 7;
    const hasUnderDeclaration = data.sales.some(sale => (parseFloat(sale.underDeclared) || 0) > 0);
    const declarationTexts = [
      "I/We confirm that the information provided is true and accurate to the best of my/our knowledge.",
      ...(hasUnderDeclaration ? ["I/We understand that under-declaration of milk volumes is an offense under the Dairy Industry Act and agree to pay the calculated under declared volumes and monies within the specified periods."] : []),
      "I/We confirm that I/We have been informed/presented with, read and understood the KDB Premise Inspection Scope Disclosure, including the legal obligations to maintain records and traceability of the same as stipulated under the Dairy Industry Act (Cap 336), Laws of Kenya."
    ];
    declarationTexts.forEach((text, i) => {
      const splitText = doc.splitTextToSize(text, 164);
      const itemHeight = Math.max(splitText.length * 5.5, 7);
      checkPageBreak(itemHeight + 3);
      
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}.`, 20, currentY);
      
      doc.setFont("helvetica", "normal");
      doc.text(splitText, 26, currentY);
      
      currentY += itemHeight + 2;
    });
    currentY += 3;

    // Signatures
    checkPageBreak(45);
    doc.setFontSize(11);
    doc.text(`Compliance Officer: ${data.complianceOfficer}`, 20, currentY);
    if (data.complianceSignature && data.complianceSignature.startsWith('data:image')) {
      try {
        const format = data.complianceSignature.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(data.complianceSignature, format, 20, currentY + 2, 40, 15);
      } catch (e) {
        console.error('Error adding compliance signature:', e);
      }
    }
    
    doc.text(`For DBO; Name: ${data.confirmationName} (${data.designation})`, 110, currentY);
    if (data.dboSignature && data.dboSignature.startsWith('data:image')) {
      try {
        const format = data.dboSignature.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(data.dboSignature, format, 110, currentY + 2, 40, 15);
      } catch (e) {
        console.error('Error adding DBO signature:', e);
      }
    }
    if (data.dboStamp && data.dboStamp.startsWith('data:image')) {
      try {
        const format = data.dboStamp.includes('png') ? 'PNG' : 'JPEG';
        doc.addImage(data.dboStamp, format, 110, currentY + 18, 40, 15);
      } catch (e) {
        console.error('Error adding DBO stamp:', e);
      }
    }

    return doc.output('datauristring');
  };

  const handlePreview = async () => {
    const pdf = await generatePDF();
    setPdfPreview(pdf);
  };

  const viewPdf = async (path: string) => {
    if (!supabase) return;
    // Create a signed URL that expires in 60 seconds for security
    const { data, error } = await supabase.storage
      .from('validation-pdfs')
      .createSignedUrl(path, 60);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return;
    }

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const dataURIToBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    // Validation
    if (!isConnected) {
      setStatus({ type: 'error', message: 'Google Sheets integration is not configured. Please check your environment variables.' });
      setIsSubmitting(false);
      return;
    }
    if (!validateStep(1) || !validateStep(2)) {
      setIsSubmitting(false);
      return;
    }
    if (!formData.complianceOfficer || !formData.complianceSignature || !formData.confirmationName || !formData.designation || !formData.dboSignature) {
      setStatus({ type: 'error', message: 'Please complete all signature fields before submitting.' });
      setIsSubmitting(false);
      return;
    }
    const hasUnderDeclaration = formData.sales.some(sale => (parseFloat(sale.underDeclared) || 0) > 0);
    const isOffenseRequired = hasUnderDeclaration;

    if (!declarations.accurate || (isOffenseRequired && !declarations.offense) || !declarations.awareness) {
      setStatus({ type: 'error', message: 'Please check all required declaration boxes below before submitting.' });
      setIsSubmitting(false);
      return;
    }

    // Duplicate check
    if (!isAmendment) {
      const isDuplicate = lastCollections.some(c => c.fullPeriod.toLowerCase() === formData.validationPeriod.toLowerCase());
      if (isDuplicate) {
        setStatus({ type: 'error', message: `Data for ${formData.validationPeriod} has already been collected for this Premise. Please verify the validation period.` });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updatedData = { ...formData, endTime };
      setFormData(updatedData);

      const pdf = await generatePDF(updatedData);

      // Handle manual branches addition/update on submission if a client is selected
      if (selectedClient) {
        let clientUpdated = false;
        const updatedClient = { ...selectedClient };
        
        if (validationPremiseMode === 'new') {
          // Register as a NEW branch
          const newBranch = {
            id: updatedData.permitNo.trim() || `branch-${Date.now()}`,
            premiseName: updatedData.premiseName.trim(),
            permitNumber: updatedData.permitNo.trim(),
            premiseCategory: updatedData.category,
            location: updatedData.location.trim(),
            county: updatedData.county.trim(),
            expiryDate: updatedData.expiryDate || undefined,
            operationalStatus: 'operating' as const
          };
          const currentBranches = updatedClient.branches || [];
          if (!currentBranches.some(b => b.permitNumber === newBranch.permitNumber)) {
            updatedClient.branches = [...currentBranches, newBranch];
            clientUpdated = true;
          }
        } else if (validationPremiseMode.startsWith('branch-')) {
          // Update an existing branch
          const branchId = validationPremiseMode.replace('branch-', '');
          const currentBranches = updatedClient.branches || [];
          updatedClient.branches = currentBranches.map(b => {
            if (b.id === branchId) {
              return {
                ...b,
                premiseName: updatedData.premiseName.trim(),
                permitNumber: updatedData.permitNo.trim(),
                premiseCategory: updatedData.category,
                location: updatedData.location.trim(),
                county: updatedData.county.trim(),
                expiryDate: updatedData.expiryDate || undefined
              };
            }
            return b;
          });
          clientUpdated = true;
        }

        if (clientUpdated) {
          await DBService.saveClient(updatedClient);
          // Refresh clients list from database to ensure absolute source of truth
          const refreshedClients = await DBService.getClients();
          setClients(refreshedClients);
        }
      }

      // 1. Submit to Supabase (New)
      if (supabase) {
        try {
          // Upload PDF to Supabase Storage
          let pdfPath = null;
          try {
            const pdfBlob = dataURIToBlob(pdf);
            const fileName = isAmendment
              ? `${updatedData.premiseName.replace(/\s+/g, '_')}_${updatedData.validationPeriod.replace(/\s+/g, '_')}_Amended_v2_${Date.now()}.pdf`
              : `${updatedData.premiseName.replace(/\s+/g, '_')}_${updatedData.validationPeriod.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('validation-pdfs')
              .upload(fileName, pdfBlob, {
                contentType: 'application/pdf',
                upsert: false
              });
            
            if (uploadError) {
              console.error('Supabase PDF upload error:', uploadError);
            } else {
              pdfPath = uploadData.path;
            }
          } catch (uploadErr) {
            console.error('PDF upload process failed:', uploadErr);
          }

          let supabaseError;
          if (isAmendment) {
            const { error } = await supabase
              .from('kdb_validations')
              .update({
                dbo_name: updatedData.dboName,
                branch: updatedData.branch,
                date: updatedData.date,
                category: updatedData.category,
                permit_no: updatedData.permitNo,
                location: updatedData.location,
                county: updatedData.county,
                total_penalty: totalPenalty,
                pdf_path: pdfPath, // Store reference to updated file
                raw_data: updatedData // Store full JSON for backup
              })
              .match({
                premise_name: updatedData.premiseName,
                validation_period: updatedData.validationPeriod
              });
            supabaseError = error;
          } else {
            const { error } = await supabase
              .from('kdb_validations')
              .insert([{
                dbo_name: updatedData.dboName,
                premise_name: updatedData.premiseName,
                branch: updatedData.branch,
                date: updatedData.date,
                validation_period: updatedData.validationPeriod,
                category: updatedData.category,
                permit_no: updatedData.permitNo,
                location: updatedData.location,
                county: updatedData.county,
                total_penalty: totalPenalty,
                pdf_path: pdfPath, // Store reference to the file
                raw_data: updatedData // Store full JSON for backup
              }]);
            supabaseError = error;
          }
          
          if (supabaseError) console.error('Supabase save error:', supabaseError);
        } catch (err) {
          console.error('Supabase integration failed:', err);
        }
      }

      // 2. Submit to Google Sheets (Original)
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedData, pdf, isAmendment }),
      });

      if (res.ok) {
        setStatus({ type: 'success', message: 'Data successfully synced! Your PDF is downloading...' });
        
        // Trigger PDF Download
        const link = document.createElement('a');
        link.href = pdf;
        const downloadName = isAmendment 
          ? `KDB_Validation_${formData.dboName}_${formData.date}_Amended_v2.pdf`
          : `KDB_Validation_${formData.dboName}_${formData.date}.pdf`;
        link.download = downloadName;
        link.click();

        // Clear local storage draft and manual override edits
        localStorage.removeItem('kdb_validation_form_draft');
        localStorage.removeItem('kdb_validation_form_draft_step');
        setIsValidationPeriodEdited(false);
        setIsAmendment(false);

        setFormData(initialData);
        setStep(0); // Go back to start
      } else {
        const error: any = await res.json();
        throw new Error(error.error || 'Submission failed');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    'CP>5,000 L/D', 'CP<5,000 L/D', 'Cottage Industry', 'Milk Bar', 
    'Mini Dairy', 'Dispenser', 'Processor'
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = ['2025', '2026', '2027'];

  const dboSigPad = useRef<SignatureCanvas>(null);

  const compressImage = (base64: string, maxWidth = 800, maxHeight = 800, transparent = false): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          if (!transparent) {
            // Fill with white background to avoid black background on JPEGs with transparency
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL(transparent ? 'image/png' : 'image/jpeg', 0.8));
      };
      img.onerror = () => resolve(base64); // Fallback
    });
  };

  const extractStamp = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(base64);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate brightness
          const brightness = (r + g + b) / 3;
          
          // If the pixel is bright (white-ish background), make it transparent
          // We use a threshold to remove shadows on paper
          if (brightness > 170) {
            data[i + 3] = 0; 
          } else {
            // Ensure the ink is fully opaque and slightly enhanced
            data[i + 3] = 255;
            // Optional: darken dark pixels to make stamp crisper
            if (brightness < 100) {
              data[i] = Math.max(0, r - 20);
              data[i+1] = Math.max(0, g - 20);
              data[i+2] = Math.max(0, b - 20);
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(base64);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'complianceSignature' | 'dboSignature' | 'dboStamp') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        let result = reader.result as string;
        if (field === 'dboStamp') {
          // First extract the stamp (remove background)
          result = await extractStamp(result);
          // Then compress/resize while keeping transparency
          const processed = await compressImage(result, 800, 800, true);
          setFormData(prev => ({ ...prev, [field]: processed }));
        } else {
          const compressed = await compressImage(result);
          setFormData(prev => ({ ...prev, [field]: compressed }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearField = (field: 'complianceSignature' | 'dboSignature' | 'dboStamp') => {
    setFormData(prev => ({ ...prev, [field]: '' }));
  };

  const saveDboSignature = async () => {
    if (dboSigPad.current && !dboSigPad.current.isEmpty()) {
      const sigData = dboSigPad.current.getTrimmedCanvas().toDataURL('image/png');
      const compressed = await compressImage(sigData);
      setFormData(prev => ({ ...prev, dboSignature: compressed }));
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#1a1a1a] font-sans p-2 md:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-4 text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-white p-2 md:p-3 rounded-xl shadow-sm border border-black/5 flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold tracking-tight uppercase">Kenya Dairy Board</h1>
            </div>
          </div>
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Data Validation Form</p>
        </header>

        {/* Draft Restore Alert */}
        <AnimatePresence>
          {hasDraft && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-4 overflow-hidden"
              id="draft-restore-alert"
            >
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                    <FileText className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Unsaved Data Found</p>
                    <p className="text-xs text-amber-700 font-medium">You have an unfinished validation draft. Would you like to restore it?</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0 self-end sm:self-auto shrink-0">
                  <button
                    onClick={handleRestoreDraft}
                    className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                    id="restore-draft-btn"
                  >
                    Restore Draft
                  </button>
                  <button
                    onClick={handleDiscardDraft}
                    className="px-3 py-1.5 rounded-lg border border-amber-200 bg-white hover:bg-amber-100 text-amber-700 text-[11px] font-bold transition-all cursor-pointer"
                    id="discard-draft-btn"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Amendment Mode Alert */}
        <AnimatePresence>
          {isAmendment && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-4 overflow-hidden"
              id="amendment-mode-alert"
            >
              <div className="p-4 bg-amber-100 border border-amber-300 text-amber-950 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-amber-200 flex items-center justify-center text-amber-800">
                    <Edit2 className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-900">✏️ Amendment Mode Active</p>
                    <p className="text-xs text-amber-800 font-medium">
                      You are amending the validation report for <span className="font-bold">{formData.premiseName || 'this Premise'}</span> ({formData.validationPeriod}). Saving will overwrite the previous submission and sheets record.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(initialData);
                      setIsAmendment(false);
                      setStep(0);
                      setStatus({ type: 'success', message: 'Amendment cancelled.' });
                    }}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-800 text-[11px] font-bold transition-all cursor-pointer shadow-sm"
                    id="cancel-amendment-btn"
                  >
                    Cancel Amendment
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Status Message */}
        <AnimatePresence>
          {status.message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className={`p-4 rounded-xl flex items-center gap-3 border ${
                status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
              }`}>
                {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <p className="text-sm font-medium">{status.message}</p>
                <button onClick={() => setStatus({ type: null, message: '' })} className="ml-auto text-gray-400 hover:text-gray-600">
                  &times;
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection Status */}
        <div className="mb-4 bg-white rounded-xl p-4 shadow-sm border border-black/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <div>
                <p className="text-xs font-semibold">Google Sheets Sync</p>
                <p className="text-[10px] text-gray-500">{isConnected ? 'Service Account Active' : 'Credentials Missing'}</p>
              </div>
            </div>
            {isConnected && (
              <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Ready to Sync</span>
              </div>
            )}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-black/5 overflow-hidden">
          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-gray-100">
            <motion.div 
              className="h-full bg-blue-600"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 space-y-6"
                >
                  <ClipboardCheck className="w-20 h-20 text-blue-600" />
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Ready to start validation?</h2>
                    <p className="text-gray-500">Click the button below to begin the data collection process.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStart}
                    className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Start New Validation
                  </button>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">1</div>
                    <h2 className="text-lg font-bold">General Information</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Branch</label>
                      <input
                        type="text"
                        name="branch"
                        value={formData.branch}
                        onChange={handleChange}
                        className={getInputClass('branch')}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleChange}
                          className={getInputClass('date')}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Start Time</label>
                        <input
                          type="text"
                          name="startTime"
                          readOnly
                          value={formData.startTime}
                          className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Permit No</label>
                      <input
                        type="text"
                        name="permitNo"
                        placeholder="KDB / ..."
                        value={formData.permitNo}
                        onChange={handleChange}
                        onBlur={handleInputBlur}
                        className={getInputClass('permitNo')}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expiry Date</label>
                      <input
                        type="date"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleChange}
                        className={getInputClass('expiryDate')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name of DBO</label>
                      <input
                        type="text"
                        name="dboName"
                        value={formData.dboName}
                        onChange={handleChange}
                        onBlur={handleInputBlur}
                        list="clients-names"
                        className={getInputClass('dboName')}
                        placeholder="Enter DBO name..."
                      />
                      <datalist id="clients-names">
                        {clients.map(c => (
                          <option key={c.id} value={c.clientName} />
                        ))}
                      </datalist>
                      {isCheckingDbo && (
                        <p className="text-[10px] text-blue-500 font-medium mt-1 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Checking previous validations...
                        </p>
                      )}
                      
                      <AnimatePresence>
                        {lastDboRecords.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 space-y-2 overflow-hidden"
                          >
                            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight flex items-center gap-1">
                              <Database className="w-3.5 h-3.5 text-emerald-600" />
                              Previous Validations Found: Click to Autofill
                            </p>
                            <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                              {lastDboRecords.map((record, index) => {
                                const raw = record.raw_data || {};
                                const premise = record.premise_name || 'Unknown Premise';
                                const category = record.category || 'Unknown';
                                const location = record.location || 'Unknown';
                                const pNo = record.permit_no || 'N/A';
                                
                                return (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleDboAutofill(record)}
                                    className="w-full text-left p-2 rounded-lg bg-white border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-[11px] group flex flex-col gap-0.5"
                                  >
                                    <div className="flex justify-between items-center w-full">
                                      <span className="font-bold text-gray-800 group-hover:text-emerald-900 truncate">
                                        {premise}
                                      </span>
                                      <span className="text-[9px] font-mono text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded-md">
                                        {category}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex justify-between items-center mt-0.5">
                                      <span>Permit: {pNo} | Loc: {location}</span>
                                      <span className="text-[9px] text-gray-400 font-mono italic">
                                        {new Date(record.date).toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {lastCollections.length > 0 && (() => {
                        const latest = lastCollections[0].fullPeriod;
                        const parts = latest.split(' ');
                        if (parts.length >= 2) {
                          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                          const monthIndex = months.indexOf(parts[0]);
                          if (monthIndex !== -1) {
                            let nextMonthIndex = monthIndex + 1;
                            let nextYear = parseInt(parts[1]);
                            if (nextMonthIndex > 11) {
                              nextMonthIndex = 0;
                              nextYear += 1;
                            }
                            return (
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Next month to validate: {months[nextMonthIndex]} {nextYear}
                              </p>
                            );
                          }
                        }
                        return null;
                      })()}

                      {selectedClient && (
                        <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                          <div className="flex items-center gap-1.5">
                            <Database className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Validation Premise Mode</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                            This client has multiple branches or premises. Choose which premise is being validated:
                          </p>
                          <div className="relative">
                            <select
                              value={validationPremiseMode}
                              onChange={e => handlePremiseModeChange(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px] cursor-pointer appearance-none"
                            >
                              <option value="main">Main Premise ({selectedClient.premiseName || 'No Name'})</option>
                              {selectedClient.branches && selectedClient.branches.map(br => (
                                <option key={br.id} value={`branch-${br.id}`}>
                                  Branch: {br.premiseName} ({br.location}, Permit: {br.permitNumber})
                                </option>
                              ))}
                              <option value="new">+ Register as a NEW branch/premise under this client</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[10px] font-black uppercase">
                              Select ▾
                            </div>
                          </div>
                          {validationPremiseMode === 'new' && (
                            <div className="bg-amber-50 text-amber-700 border border-amber-100 p-3 rounded-xl text-[10px] font-bold leading-relaxed">
                              ⚠️ You are validating a NEW branch. When you submit this validation form, this branch will be automatically added to the client's profile in the registry!
                            </div>
                          )}
                          {validationPremiseMode.startsWith('branch-') && (
                            <div className="bg-blue-50 text-blue-700 border border-blue-100 p-3 rounded-xl text-[10px] font-bold leading-relaxed">
                              ℹ️ You are validating an existing branch. Submitting this form will update this branch's information in the client's profile with any changes made below.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Premise Name</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="premiseName"
                          value={formData.premiseName}
                          onChange={handleChange}
                          className={getInputClass('premiseName', 'pr-10')}
                          placeholder="Type premise name to check history..."
                        />
                        {isCheckingHistory && (
                          <div className="absolute right-3 top-2.5">
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      {/* History Banner */}
                      <AnimatePresence>
                        {historyError && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-2 p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 text-[10px] flex items-center gap-1.5"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {historyError}
                          </motion.div>
                        )}
                        {lastCollections.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2"
                          >
                            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                            <div>
                                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-tight">
                                  Recent History for {lastCollections[0]?.matchedPremise || formData.premiseName}
                                </p>
                                <div className="text-[10px] text-blue-600 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                                  Last 3 validated months: {lastCollections.map((c, i) => (
                                    <div key={i} className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold">{c.displayString}</span>
                                      <div className="flex items-center gap-1">
                                        {c.pdfPath && (
                                          <button
                                            type="button"
                                            onClick={() => viewPdf(c.pdfPath!)}
                                            className="text-[9px] bg-blue-100 hover:bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors"
                                            title="View PDF"
                                          >
                                            <FileText className="w-2.5 h-2.5" />
                                            PDF
                                          </button>
                                        )}
                                        {c.rawData && (
                                          <button
                                            type="button"
                                            onClick={() => handleRecallSubmission(c.rawData)}
                                            className="text-[9px] bg-amber-100 hover:bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors font-medium"
                                            title="Amend this submission"
                                          >
                                            <Edit2 className="w-2.5 h-2.5" />
                                            Amend
                                          </button>
                                        )}
                                      </div>
                                      {i < lastCollections.length - 1 && <span className="text-blue-300">|</span>}
                                    </div>
                                  ))}
                                </div>
                            </div>
                          </motion.div>
                        )}
                        {!isCheckingHistory && formData.premiseName.length >= 3 && lastCollections.length === 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-[10px] font-medium flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            No previous records found for this Premise.
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, category: cat }));
                          setFailedFields(prev => prev.filter(f => f !== 'category'));
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                          formData.category === cat 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                            : `bg-white text-gray-600 hover:border-blue-300 ${failedFields.includes('category') ? 'border-red-500 bg-red-50/20 ring-2 ring-red-100' : 'border-gray-200'}`
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contacts</label>
                      <input
                        type="text"
                        name="contacts"
                        value={formData.contacts}
                        onChange={handleChange}
                        className={getInputClass('contacts')}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Validation Period</label>
                      <input
                        type="text"
                        name="validationPeriod"
                        value={formData.validationPeriod}
                        onChange={handleChange}
                        className={getInputClass('validationPeriod')}
                      />
                      {formData.validationPeriod && !isAmendment && lastCollections.some(c => c.fullPeriod.toLowerCase() === formData.validationPeriod.toLowerCase()) && (() => {
                        const matchingCollection = lastCollections.find(c => c.fullPeriod.toLowerCase() === formData.validationPeriod.toLowerCase());
                        return (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1.5 p-2 bg-amber-50 rounded-lg border border-amber-200 flex flex-col gap-1.5 text-[11px]"
                          >
                            <p className="text-amber-800 font-medium flex items-center gap-1">
                              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              This period has already been validated.
                            </p>
                            {matchingCollection?.rawData && (
                              <button
                                type="button"
                                onClick={() => handleRecallSubmission(matchingCollection.rawData)}
                                className="self-start text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                Load & Amend Submission
                              </button>
                            )}
                          </motion.div>
                        );
                      })()}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">County</label>
                      <input
                        type="text"
                        name="county"
                        value={formData.county}
                        onChange={handleChange}
                        className={getInputClass('county', '', 'px-4 py-2 rounded-xl text-xs')}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className={getInputClass('location', '', 'px-4 py-2 rounded-xl text-xs')}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => validateStep(1) && setStep(2)}
                      className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                    >
                      Next Step
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">2</div>
                      <h2 className="text-lg font-bold">Volume & Sales Data</h2>
                    </div>
                    {/* General Unit Toggle */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 w-fit">
                      <span className="text-[10px] font-bold text-gray-500 uppercase px-2">Active Unit:</span>
                      <button
                        type="button"
                        onClick={() => handleGlobalUnitChange('L')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                          globalUnit === 'L'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Litres (L)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGlobalUnitChange('Kg')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                          globalUnit === 'Kg'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Kilograms (Kg)
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Intake Section - Conditional based on category */}
                  {(formData.category === 'CP>5,000 L/D' || formData.category === 'CP<5,000 L/D' || formData.category === 'Processor') && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-blue-600 uppercase text-xs tracking-widest">Total Monthly Intake</h3>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, intakes: [...prev.intakes, { month: '', year: new Date().getFullYear().toString(), quantity: '', farmerPrice: '', processor: '', processorPrice: '', avgVolPerDay: '' }] }))}
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          + Add Month
                        </button>
                      </div>
                      
                      {formData.intakes.map((intake, idx) => (
                        <div key={idx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4 relative">
                            <button 
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, intakes: prev.intakes.filter((_, i) => i !== idx) }))}
                              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-lg font-bold"
                            >
                              &times;
                            </button>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Month</label>
                              <select
                                value={intake.month}
                                onChange={(e) => {
                                  const newIntakes = [...formData.intakes];
                                  newIntakes[idx].month = e.target.value;
                                  setFormData(prev => ({ ...prev, intakes: newIntakes }));
                                  setFailedFields(prev => prev.filter(f => f !== `intake-${idx}-month`));
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg border outline-none text-[11px] bg-white transition-all ${
                                  failedFields.includes(`intake-${idx}-month`)
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                                    : 'border-gray-200 focus:border-blue-500'
                                }`}
                              >
                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Year</label>
                              <select
                                value={intake.year}
                                onChange={(e) => {
                                  const newIntakes = [...formData.intakes];
                                  newIntakes[idx].year = e.target.value;
                                  setFormData(prev => ({ ...prev, intakes: newIntakes }));
                                  setFailedFields(prev => prev.filter(f => f !== `intake-${idx}-year`));
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg border outline-none text-[11px] bg-white transition-all ${
                                  failedFields.includes(`intake-${idx}-year`)
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                                    : 'border-gray-200 focus:border-blue-500'
                                }`}
                              >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Quantity ({globalUnit})</label>
                              <input
                                placeholder="0.00"
                                value={intake.quantity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newIntakes = [...formData.intakes];
                                  newIntakes[idx].quantity = val;
                                  // Formula: Quantity / 30
                                  const num = parseFloat(val);
                                  if (!isNaN(num)) {
                                    newIntakes[idx].avgVolPerDay = (num / 30).toFixed(2);
                                  }
                                  setFormData(prev => ({ ...prev, intakes: newIntakes }));
                                  setFailedFields(prev => prev.filter(f => f !== `intake-${idx}-quantity`));
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg border outline-none text-[11px] transition-all ${
                                  failedFields.includes(`intake-${idx}-quantity`)
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                                    : 'border-gray-200 focus:border-blue-500'
                                }`}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Farmer Price (Kshs)</label>
                              <input
                                placeholder="0.00"
                                value={intake.farmerPrice}
                                onChange={(e) => {
                                  const newIntakes = [...formData.intakes];
                                  newIntakes[idx].farmerPrice = e.target.value;
                                  setFormData(prev => ({ ...prev, intakes: newIntakes }));
                                  setFailedFields(prev => prev.filter(f => f !== `intake-${idx}-farmerPrice`));
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg border outline-none text-[11px] transition-all ${
                                  failedFields.includes(`intake-${idx}-farmerPrice`)
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                                    : 'border-gray-200 focus:border-blue-500'
                                }`}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Processor</label>
                              <input
                                placeholder="Name"
                                value={intake.processor}
                                onChange={(e) => {
                                  const newIntakes = [...formData.intakes];
                                  newIntakes[idx].processor = e.target.value;
                                  setFormData(prev => ({ ...prev, intakes: newIntakes }));
                                  setFailedFields(prev => prev.filter(f => f !== `intake-${idx}-processor`));
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg border outline-none text-[11px] transition-all ${
                                  failedFields.includes(`intake-${idx}-processor`)
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                                    : 'border-gray-200 focus:border-blue-500'
                                }`}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Processor Price (Kshs)</label>
                              <input
                                placeholder="0.00"
                                value={intake.processorPrice}
                                onChange={(e) => {
                                  const newIntakes = [...formData.intakes];
                                  newIntakes[idx].processorPrice = e.target.value;
                                  setFormData(prev => ({ ...prev, intakes: newIntakes }));
                                  setFailedFields(prev => prev.filter(f => f !== `intake-${idx}-processorPrice`));
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg border outline-none text-[11px] transition-all ${
                                  failedFields.includes(`intake-${idx}-processorPrice`)
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                                    : 'border-gray-200 focus:border-blue-500'
                                }`}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Average Collection/Day ({globalUnit}/Day)</label>
                              <input
                                placeholder="0.00"
                                value={intake.avgVolPerDay}
                                onChange={(e) => {
                                  const newIntakes = [...formData.intakes];
                                  newIntakes[idx].avgVolPerDay = e.target.value;
                                  setFormData(prev => ({ ...prev, intakes: newIntakes }));
                                }}
                                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 outline-none text-[11px] bg-gray-50 font-bold text-blue-600"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* General Compliance / Produce Metadata Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Traceability & Records Available</label>
                      <div className="flex gap-4">
                        {['Yes', 'No'].map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, traceability: opt }))}
                            className={`flex-1 py-2 rounded-xl border font-bold text-xs transition-all ${
                              formData.traceability === opt 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                                : 'bg-white border-gray-200 text-gray-600'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={`space-y-2 p-2.5 rounded-2xl transition-all ${failedFields.includes('natureOfProduce') ? 'bg-red-50/50 border border-red-300 ring-2 ring-red-100' : 'border border-transparent'}`}>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nature of Produce?</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Pasteurized Milk', 'Raw Milk', 'Cultured Milk', 'Yoghurt', 'UHT', 'Ghee', 'Butter', 'Cheese', 'Milk Shake'].map(opt => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={formData.natureOfProduce.includes(opt)}
                              onChange={(e) => {
                                const newProduce = e.target.checked 
                                  ? [...formData.natureOfProduce, opt]
                                  : formData.natureOfProduce.filter(p => p !== opt);
                                setFormData(prev => ({ ...prev, natureOfProduce: newProduce }));
                                setFailedFields(prev => prev.filter(f => f !== 'natureOfProduce'));
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[11px] text-gray-600 group-hover:text-gray-900 transition-colors">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Source</label>
                      <input
                        type="text"
                        name="source"
                        value={formData.source}
                        onChange={handleChange}
                        className={`w-full px-4 py-2 rounded-xl border outline-none text-xs transition-all ${
                          failedFields.includes('source')
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                            : 'border-gray-200 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Merged Local Sales Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-blue-600 uppercase text-xs tracking-widest">Local Sales Data</h3>
                        {(formData.category === 'CP>5,000 L/D' || formData.category === 'CP<5,000 L/D' || formData.category === 'Processor') && (
                          <label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                            <input
                              type="checkbox"
                              checked={formData.hasLocalSales}
                              onChange={(e) => setFormData(prev => ({ ...prev, hasLocalSales: e.target.checked }))}
                              className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-bold text-blue-700 uppercase">Has Local Sales?</span>
                          </label>
                        )}
                      </div>
                      {formData.hasLocalSales && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, sales: [...prev.sales, { 
                            month: '', 
                            year: new Date().getFullYear().toString(),
                            qtyDeclared: '', 
                            verifiedQty: '', 
                            projectedQty: '', 
                            underDeclared: '0', 
                            buyingPrice: '', 
                            sellingPrice: '', 
                            avgVolPerDay: '' 
                          }] }))}
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          + Add Month
                        </button>
                      )}
                    </div>

                    {!formData.hasLocalSales ? (
                      <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                        <p className="text-sm text-gray-500 italic">Local sales section is locked/disabled for this entity.</p>
                      </div>
                    ) : (
                      formData.sales.map((sale, idx) => (
                        <div key={idx} className="p-6 bg-white rounded-2xl border border-gray-200 space-y-4 relative shadow-sm">
                          <button 
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, sales: prev.sales.filter((_, i) => i !== idx) }))}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-lg font-bold"
                          >
                            &times;
                          </button>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Month</label>
                            <select
                              value={sale.month}
                              onChange={(e) => {
                                const newSales = [...formData.sales];
                                newSales[idx].month = e.target.value;
                                setFormData(prev => ({ ...prev, sales: newSales }));
                                setFailedFields(prev => prev.filter(f => f !== `sale-${idx}-month`));
                              }}
                              className={`w-full px-3 py-1.5 rounded-xl border outline-none text-[11px] font-bold appearance-none bg-white transition-all ${
                                failedFields.includes(`sale-${idx}-month`)
                                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20 text-red-600'
                                  : 'border-blue-100 focus:border-blue-500 text-blue-600'
                              }`}
                            >
                              {months.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Year</label>
                            <select
                              value={sale.year}
                              onChange={(e) => {
                                const newSales = [...formData.sales];
                                newSales[idx].year = e.target.value;
                                setFormData(prev => ({ ...prev, sales: newSales }));
                                setFailedFields(prev => prev.filter(f => f !== `sale-${idx}-year`));
                              }}
                              className={`w-full px-3 py-1.5 rounded-xl border outline-none text-[11px] font-bold appearance-none bg-white transition-all ${
                                failedFields.includes(`sale-${idx}-year`)
                                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20 text-red-600'
                                  : 'border-blue-100 focus:border-blue-500 text-blue-600'
                              }`}
                            >
                              {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Details</th>
                                <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Unit</th>
                                <th className="p-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {[
                                { label: 'Quantity Declared', name: 'qtyDeclared', unit: globalUnit === 'L' ? 'Litres' : 'Kgs' },
                                { label: 'Witnessed/Verified Quantity', name: 'verifiedQty', unit: globalUnit === 'L' ? 'Litres' : 'Kgs' },
                                { label: 'Projected Quantity for Month', name: 'projectedQty', unit: globalUnit === 'L' ? 'Litres' : 'Kgs' },
                                { label: 'Under Declared Volume (Auto)', name: 'underDeclared', unit: globalUnit === 'L' ? 'Litres' : 'Kgs', readOnly: true },
                                { label: 'Buying Price (Per Records)', name: 'buyingPrice', unit: 'Kshs' },
                                { label: 'Selling Price (Per Records)', name: 'sellingPrice', unit: 'Kshs' },
                                { label: 'Avg Volume per Day', name: 'avgVolPerDay', unit: globalUnit === 'L' ? 'Litres' : 'Kgs' },
                              ].map((row) => {
                                const isMirroredCategory = formData.category === 'CP>5,000 L/D' || formData.category === 'CP<5,000 L/D' || formData.category === 'Processor';
                                const hasMatchingIntake = isMirroredCategory && row.name === 'buyingPrice' && formData.intakes.some(
                                  i => i.month && i.year && i.month === sale.month && i.year === sale.year
                                );
                                const isLastMonth = idx === formData.sales.length - 1;
                                const isReadOnly = row.readOnly || hasMatchingIntake || (row.name === 'projectedQty' && !isLastMonth);
                                const label = hasMatchingIntake ? 'Buying Price (Mirrored)' : row.label;

                                return (
                                  <React.Fragment key={row.name}>
                                    {row.name === 'sellingPrice' && formData.natureOfProduce.length > 0 ? (
                                      <tr>
                                        <td className="p-3 text-xs font-medium text-gray-700">{label}</td>
                                        <td className="p-3 text-[10px] text-gray-400">{row.unit}</td>
                                        <td className="p-1">
                                          <div className="flex flex-col gap-1.5 py-1">
                                            {formData.natureOfProduce.map((product) => {
                                              const currentPrices = parseSellingPrices(sale.sellingPrice || '');
                                              const priceVal = currentPrices[product] || '';
                                              const hasError = failedFields.includes(`sale-${idx}-sellingPrice`) && !priceVal;
                                              return (
                                                <div key={product} className="flex items-center gap-2 justify-between">
                                                  <span className="text-[10px] font-semibold text-gray-500 whitespace-nowrap">{product}:</span>
                                                  <div className="flex items-center gap-1">
                                                    <input
                                                      type="text"
                                                      placeholder="Price"
                                                      value={priceVal}
                                                      onChange={(e) => {
                                                        const val = e.target.value;
                                                        const newPrices = { ...currentPrices, [product]: val };
                                                        const formatted = formatSellingPrices(newPrices);
                                                        
                                                        const newSales = [...formData.sales];
                                                        newSales[idx].sellingPrice = formatted;
                                                        setFormData(prev => ({ ...prev, sales: newSales }));
                                                        
                                                        const updatedPrices = parseSellingPrices(formatted);
                                                        const allFilled = formData.natureOfProduce.every(prod => updatedPrices[prod] && updatedPrices[prod].trim() !== '');
                                                        if (allFilled) {
                                                          setFailedFields(prev => prev.filter(f => f !== `sale-${idx}-sellingPrice`));
                                                        }
                                                      }}
                                                      className={`w-28 px-2 py-1 rounded border outline-none text-xs text-right transition-all ${
                                                        hasError
                                                          ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20 text-red-600 font-bold'
                                                          : 'border-gray-200 focus:border-blue-500'
                                                      }`}
                                                    />
                                                    <span className="text-[9px] text-gray-400">Kshs</span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </td>
                                      </tr>
                                    ) : (
                                      <tr>
                                        <td className={`p-3 text-xs font-medium ${hasMatchingIntake ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>{label}</td>
                                        <td className="p-3 text-[10px] text-gray-400">{row.unit}</td>
                                        <td className="p-1">
                                          <input
                                            type="text"
                                            readOnly={isReadOnly}
                                            value={(sale as any)[row.name]}
                                            onChange={(e) => {
                                              if (isReadOnly) return;
                                              const val = e.target.value;
                                              const newSales = [...formData.sales];
                                              (newSales[idx] as any)[row.name] = val;
                                              
                                              // Mirror qtyDeclared to verifiedQty, but allow independent edit
                                              if (row.name === 'qtyDeclared') {
                                                newSales[idx].verifiedQty = val;
                                                const num = parseFloat(val);
                                                if (!isNaN(num)) {
                                                  newSales[idx].avgVolPerDay = (num / 30).toFixed(2);
                                                }
                                                // Clear both from failedFields
                                                setFailedFields(prev => prev.filter(f => f !== `sale-${idx}-qtyDeclared` && f !== `sale-${idx}-verifiedQty`));
                                              } else {
                                                // Clear current from failedFields
                                                setFailedFields(prev => prev.filter(f => f !== `sale-${idx}-${row.name}`));
                                              }
                                              
                                              // Formula for Avg Volume per Day based on Verified Quantity
                                              if (row.name === 'verifiedQty') {
                                                const num = parseFloat(val);
                                                if (!isNaN(num)) {
                                                  newSales[idx].avgVolPerDay = (num / 30).toFixed(2);
                                                }
                                              }
                                              
                                              setFormData(prev => ({ ...prev, sales: newSales }));
                                            }}
                                            className={`w-full px-3 py-1.5 rounded-lg border outline-none text-xs transition-all ${
                                              isReadOnly || row.name === 'avgVolPerDay' 
                                                ? 'bg-gray-100/70 border-gray-150 text-blue-600 font-bold' 
                                                : failedFields.includes(`sale-${idx}-${row.name}`)
                                                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20 text-red-600 font-bold'
                                                  : 'border-gray-50 focus:border-blue-500'
                                            }`}
                                          />
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )))}
                  </div>

                  {/* Distribution Details Section (Mini Dairy and Cottage Industry only) */}
                  {(formData.category === 'Mini Dairy' || formData.category === 'Cottage Industry') && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6 border border-gray-100 bg-white p-6 rounded-3xl shadow-sm"
                    >
                      <div className="border-b border-gray-100 pb-4">
                        <h3 className="font-bold text-gray-900 text-sm tracking-wide uppercase">Distributor Details</h3>
                        <p className="text-[10px] text-gray-500 mt-1">Please provide distribution channels, outlet network, and regulatory information for all distributors.</p>
                      </div>

                      <div className="space-y-8">
                        {formData.distributors.map((dist, dIdx) => {
                          return (
                            <div key={dIdx} className="p-6 bg-slate-50/40 border border-slate-100 rounded-3xl relative space-y-5">
                              <div className="flex justify-between items-center border-b border-slate-100/60 pb-3">
                                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                                  Distributor #{dIdx + 1}: {dist.name || 'Unnamed'}
                                </h4>
                                {formData.distributors.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        distributors: prev.distributors.filter((_, i) => i !== dIdx)
                                      }));
                                    }}
                                    className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100/50 px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    Remove Distributor
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1 relative">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Distributor Name</label>
                                  <input
                                    type="text"
                                    value={dist.name}
                                    onChange={(e) => {
                                      const next = [...formData.distributors];
                                      next[dIdx].name = e.target.value;
                                      setFormData(prev => ({ ...prev, distributors: next }));
                                      setFailedFields(prev => prev.filter(f => f !== `dist-${dIdx}-name`));
                                    }}
                                    className={`w-full px-4 py-2 rounded-xl border outline-none text-xs transition-all ${
                                      failedFields.includes(`dist-${dIdx}-name`)
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                                        : 'border-gray-200 focus:border-blue-500 bg-white'
                                    }`}
                                    placeholder="Enter distributor name to search..."
                                  />
                                  {isCheckingDist[dIdx] && (
                                    <p className="text-[10px] text-blue-500 font-medium mt-1 flex items-center gap-1 animate-pulse">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Searching previous validations...
                                    </p>
                                  )}
                                  
                                  <AnimatePresence>
                                    {distributorRecords[dIdx] && distributorRecords[dIdx].length > 0 && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="absolute z-50 w-full mt-2 p-3 bg-white rounded-xl border border-blue-100 space-y-2 shadow-xl max-h-56 overflow-y-auto"
                                      >
                                        <p className="text-[10px] font-bold text-blue-800 uppercase tracking-tight flex items-center gap-1">
                                          <Database className="w-3.5 h-3.5 text-blue-600" />
                                          Previous Distributor Found: Click to Autofill
                                        </p>
                                        <div className="flex flex-col gap-1.5">
                                          {distributorRecords[dIdx].map((record, rIdx) => {
                                            const raw = record.raw_data || {};
                                            const name = record.dbo_name || record.premise_name || 'Unknown';
                                            const pNo = record.permit_no || 'N/A';
                                            const contacts = raw.contacts || record.contacts || 'N/A';
                                            
                                            return (
                                              <button
                                                key={rIdx}
                                                type="button"
                                                onClick={() => handleDistributorAutofill(dIdx, record)}
                                                className="w-full text-left p-2 rounded-lg bg-white border border-slate-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-[11px] group flex flex-col gap-0.5 cursor-pointer"
                                              >
                                                <div className="flex justify-between items-center w-full">
                                                  <span className="font-bold text-gray-800 group-hover:text-blue-900 truncate">
                                                    {name}
                                                  </span>
                                                  <span className="text-[9px] font-mono text-blue-700 bg-blue-100/50 px-1.5 py-0.5 rounded-md">
                                                    Permit: {pNo}
                                                  </span>
                                                </div>
                                                <div className="text-[10px] text-gray-500 flex justify-between items-center mt-0.5">
                                                  <span>Contacts: {contacts}</span>
                                                  <span className="text-[9px] text-gray-400 font-mono italic">
                                                    {new Date(record.date).toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                                                  </span>
                                                </div>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contacts</label>
                                  <input
                                    type="text"
                                    value={dist.contacts}
                                    onChange={(e) => {
                                      const next = [...formData.distributors];
                                      next[dIdx].contacts = e.target.value;
                                      setFormData(prev => ({ ...prev, distributors: next }));
                                      setFailedFields(prev => prev.filter(f => f !== `dist-${dIdx}-contacts`));
                                    }}
                                    className={`w-full px-4 py-2 rounded-xl border outline-none text-xs transition-all ${
                                      failedFields.includes(`dist-${dIdx}-contacts`)
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                                        : 'border-gray-200 focus:border-blue-500 bg-white'
                                    }`}
                                    placeholder="Enter contact details"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Volume / Day ({globalUnit}/Day)</label>
                                  <input
                                    type="text"
                                    value={dist.volPerDay}
                                    onChange={(e) => {
                                      const next = [...formData.distributors];
                                      next[dIdx].volPerDay = e.target.value;
                                      setFormData(prev => ({ ...prev, distributors: next }));
                                      setFailedFields(prev => prev.filter(f => f !== `dist-${dIdx}-volPerDay`));
                                    }}
                                    className={`w-full px-4 py-2 rounded-xl border outline-none text-xs transition-all ${
                                      failedFields.includes(`dist-${dIdx}-volPerDay`)
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                                        : 'border-gray-200 focus:border-blue-500 bg-white'
                                    }`}
                                    placeholder="0.00"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Permit No</label>
                                  <input
                                    type="text"
                                    value={dist.permitNo}
                                    onChange={(e) => {
                                      const next = [...formData.distributors];
                                      next[dIdx].permitNo = e.target.value;
                                      setFormData(prev => ({ ...prev, distributors: next }));
                                      setFailedFields(prev => prev.filter(f => f !== `dist-${dIdx}-permitNo`));
                                    }}
                                    className={`w-full px-4 py-2 rounded-xl border outline-none text-xs transition-all ${
                                      failedFields.includes(`dist-${dIdx}-permitNo`)
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                                        : 'border-gray-200 focus:border-blue-500 bg-white font-mono text-blue-700'
                                    }`}
                                    placeholder="KDB / ..."
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Area of Sale</label>
                                  <input
                                    type="text"
                                    value={dist.areaOfSale}
                                    onChange={(e) => {
                                      const next = [...formData.distributors];
                                      next[dIdx].areaOfSale = e.target.value;
                                      setFormData(prev => ({ ...prev, distributors: next }));
                                      setFailedFields(prev => prev.filter(f => f !== `dist-${dIdx}-areaOfSale`));
                                    }}
                                    className={`w-full px-4 py-2 rounded-xl border outline-none text-xs transition-all ${
                                      failedFields.includes(`dist-${dIdx}-areaOfSale`)
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200 ring-2 ring-red-100 bg-red-50/20'
                                        : 'border-gray-200 focus:border-blue-500 bg-white'
                                    }`}
                                    placeholder="Enter geographic sales area"
                                  />
                                </div>
                              </div>

                              {/* Nature of produce and prices combined */}
                              <div className={`space-y-3 p-4 rounded-2xl border transition-all ${
                                failedFields.includes(`dist-${dIdx}-natureOfProduce`)
                                  ? 'bg-red-50/50 border-red-300 ring-2 ring-red-100'
                                  : 'bg-slate-50/30 border-slate-100'
                              }`}>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                                  <span>Nature of Produce & Distributor Price (Kshs)</span>
                                  <span className="text-[9px] text-gray-400 font-medium normal-case">Select distributed products and enter their prices</span>
                                </label>
                                {formData.natureOfProduce.length === 0 ? (
                                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-[11px] font-medium">
                                    No products selected in the "Nature of Produce?" section above. Please check at least one product above first.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-100">
                                    {formData.natureOfProduce.map(opt => {
                                      const isChecked = dist.natureOfProduce?.includes(opt);
                                      const mirroredPrice = getMirroredSellingPrice(opt, formData.sales);
                                      const hasCustomPrice = dist.prices[opt] !== undefined;
                                      const displayPrice = hasCustomPrice ? dist.prices[opt] : mirroredPrice;

                                      return (
                                        <div key={opt} className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                                          isChecked 
                                            ? 'bg-blue-50/20 border-blue-100' 
                                            : 'bg-gray-50/30 border-gray-100 opacity-70 hover:opacity-100'
                                        }`}>
                                          <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                const currentList = dist.natureOfProduce || [];
                                                const nextList = isChecked
                                                  ? currentList.filter(x => x !== opt)
                                                  : [...currentList, opt];
                                                const next = [...formData.distributors];
                                                next[dIdx].natureOfProduce = nextList;
                                                setFormData(prev => ({ ...prev, distributors: next }));
                                                setFailedFields(prev => prev.filter(f => f !== `dist-${dIdx}-natureOfProduce`));
                                              }}
                                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                            />
                                            <span className={`text-[11px] font-semibold ${isChecked ? 'text-blue-900' : 'text-gray-500'}`}>
                                              {opt}
                                            </span>
                                          </label>

                                          <div className="space-y-0.5">
                                            <span className="text-[8px] font-semibold text-slate-400 block truncate">
                                              {!hasCustomPrice && mirroredPrice ? 'Price (Mirrored)' : 'Price (Custom)'}
                                            </span>
                                            <div className="relative">
                                              <input
                                                type="text"
                                                value={displayPrice}
                                                onChange={(e) => {
                                                  const next = [...formData.distributors];
                                                  next[dIdx].prices = {
                                                    ...next[dIdx].prices,
                                                    [opt]: e.target.value
                                                  };
                                                  // Automatically check the product checkbox if user types a price
                                                  const currentList = dist.natureOfProduce || [];
                                                  if (!currentList.includes(opt)) {
                                                    next[dIdx].natureOfProduce = [...currentList, opt];
                                                  }
                                                  setFormData(prev => ({ ...prev, distributors: next }));
                                                  setFailedFields(prev => prev.filter(f => f !== `dist-${dIdx}-price-${opt}`));
                                                }}
                                                className={`w-full pl-2 pr-7 py-1 rounded-lg border outline-none text-[11px] transition-all ${
                                                  failedFields.includes(`dist-${dIdx}-price-${opt}`)
                                                    ? 'border-red-500 ring-2 ring-red-100 bg-red-50/10'
                                                    : 'border-slate-200 focus:border-blue-400 bg-white'
                                                }`}
                                                placeholder={mirroredPrice || "0.00"}
                                              />
                                              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[8px] font-bold text-slate-400">
                                                Ksh
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* List of Outlets */}
                              <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">List of Outlets</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...formData.distributors];
                                      next[dIdx].outlets = [
                                        ...(next[dIdx].outlets || []),
                                        { location: '', volPerDay: '', permitStatus: 'None', levyInfo: 'Does not Qualify' }
                                      ];
                                      setFormData(prev => ({ ...prev, distributors: next }));
                                    }}
                                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    + Add Outlet
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  {(dist.outlets || []).map((outlet, oIdx) => (
                                    <div key={oIdx} className="p-4 bg-white border border-slate-100 rounded-2xl relative space-y-3">
                                      {dist.outlets.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = [...formData.distributors];
                                            next[dIdx].outlets = next[dIdx].outlets.filter((_, i) => i !== oIdx);
                                            setFormData(prev => ({ ...prev, distributors: next }));
                                          }}
                                          className="absolute top-2 right-3 text-slate-400 hover:text-red-500 font-bold text-base cursor-pointer"
                                        >
                                          &times;
                                        </button>
                                      )}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-gray-400 uppercase">Outlet Location</label>
                                          <input
                                            type="text"
                                            placeholder="e.g. Town Center"
                                            value={outlet.location}
                                            onChange={(e) => {
                                              const next = [...formData.distributors];
                                              next[dIdx].outlets[oIdx].location = e.target.value;
                                              setFormData(prev => ({ ...prev, distributors: next }));
                                              setFailedFields(prev => prev.filter(f => f !== `dist-${dIdx}-outlet-${oIdx}-location`));
                                            }}
                                            className={`w-full px-3 py-1.5 rounded-lg border outline-none text-xs transition-all bg-white ${
                                              failedFields.includes(`dist-${dIdx}-outlet-${oIdx}-location`)
                                                ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                                                : 'border-slate-200 focus:border-blue-500'
                                            }`}
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-gray-400 uppercase">Vol / Day ({globalUnit})</label>
                                          <input
                                            type="text"
                                            placeholder="0.00"
                                            value={outlet.volPerDay}
                                            onChange={(e) => {
                                              const next = [...formData.distributors];
                                              next[dIdx].outlets[oIdx].volPerDay = e.target.value;
                                              setFormData(prev => ({ ...prev, distributors: next }));
                                              setFailedFields(prev => prev.filter(f => f !== `dist-${dIdx}-outlet-${oIdx}-volPerDay`));
                                            }}
                                            className={`w-full px-3 py-1.5 rounded-lg border outline-none text-xs transition-all bg-white ${
                                              failedFields.includes(`dist-${dIdx}-outlet-${oIdx}-volPerDay`)
                                                ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                                                : 'border-slate-200 focus:border-blue-500'
                                            }`}
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-gray-400 uppercase">Permit Status</label>
                                          <select
                                            value={outlet.permitStatus}
                                            onChange={(e) => {
                                              const next = [...formData.distributors];
                                              const nextStatus = e.target.value as any;
                                              next[dIdx].outlets[oIdx].permitStatus = nextStatus;
                                              if (nextStatus === 'None') {
                                                next[dIdx].outlets[oIdx].levyInfo = 'Does not Qualify';
                                              }
                                              setFormData(prev => ({ ...prev, distributors: next }));
                                            }}
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-xs bg-white text-gray-700 font-semibold"
                                          >
                                            <option value="None">None</option>
                                            <option value="Valid">Valid</option>
                                            <option value="Expired">Expired</option>
                                          </select>
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-gray-400 uppercase">Levy Info</label>
                                          <input
                                            type="text"
                                            placeholder="Paid / Unpaid / Details"
                                            value={outlet.levyInfo}
                                            onChange={(e) => {
                                              const next = [...formData.distributors];
                                              next[dIdx].outlets[oIdx].levyInfo = e.target.value;
                                              setFormData(prev => ({ ...prev, distributors: next }));
                                            }}
                                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs bg-white"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            distributors: [
                              ...prev.distributors,
                              {
                                name: '',
                                contacts: '',
                                volPerDay: '',
                                permitNo: '',
                                areaOfSale: '',
                                outlets: [{ location: '', volPerDay: '', permitStatus: 'None', levyInfo: 'Does not Qualify' }],
                                natureOfProduce: [],
                                prices: {}
                              }
                            ]
                          }));
                        }}
                        className="w-full py-3.5 border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 text-slate-500 hover:text-blue-600 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        + Add Distributor
                      </button>
                    </motion.div>
                  )}

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 px-8 py-3 text-gray-500 font-bold hover:text-black transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => validateStep(2) && setStep(3)}
                      className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                    >
                      Next Step
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">3</div>
                    <h2 className="text-lg font-bold">Compliance & Confirmation</h2>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4">
                    <div className="overflow-x-auto rounded-xl border border-blue-100">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-blue-100/50">
                            <th className="p-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider">CSL Period</th>
                            <th className="p-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider">{globalUnit === 'L' ? 'Litres' : 'Kilograms'}</th>
                            <th className="p-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider">Amount (Kshs)</th>
                            <th className="p-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider">Month/Year to Pay</th>
                            <th className="p-3 text-[10px] font-bold text-blue-600 uppercase tracking-wider">Paid/MPESA REF No:</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                          {formData.nonCompliance.map((nc, idx) => (
                            <tr key={idx}>
                              <td className="p-3 text-xs font-bold text-blue-800">{nc.month}</td>
                              <td className="p-3 text-xs text-blue-700">{nc.litres}</td>
                              <td className="p-1">
                                <input
                                  type="text"
                                  placeholder="0.00"
                                  value={nc.amount}
                                  onChange={(e) => {
                                    const newNC = [...formData.nonCompliance];
                                    newNC[idx].amount = e.target.value;
                                    setFormData(prev => ({ ...prev, nonCompliance: newNC }));
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg border border-blue-100 outline-none text-xs font-mono"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  placeholder="MM/YYYY"
                                  value={nc.paymentMonthYear}
                                  onChange={(e) => {
                                    const newNC = [...formData.nonCompliance];
                                    newNC[idx].paymentMonthYear = e.target.value;
                                    setFormData(prev => ({ ...prev, nonCompliance: newNC }));
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg border border-blue-100 outline-none text-xs"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  placeholder="REF NO"
                                  value={nc.mpesaRef}
                                  onChange={(e) => {
                                    const newNC = [...formData.nonCompliance];
                                    newNC[idx].mpesaRef = e.target.value;
                                    setFormData(prev => ({ ...prev, nonCompliance: newNC }));
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg border border-blue-100 outline-none text-xs"
                                />
                              </td>
                            </tr>
                          ))}
                          {formData.nonCompliance.length > 0 && (
                            <tr className="bg-blue-50/50">
                              <td className="p-3 text-xs font-bold text-blue-900">TOTAL</td>
                              <td className="p-3 text-xs text-blue-700"></td>
                              <td className="p-3 text-xs font-bold text-blue-900">
                                {totalPenalty.toFixed(2)}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          )}
                          {formData.nonCompliance.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-xs text-blue-400 italic">No under-declaration detected.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
                    <h3 className="text-sm font-bold text-gray-900">Declarations</h3>
                    <div className="space-y-3">
                      {/* Accept All Declarations */}
                      <label className="flex items-center gap-3 cursor-pointer group pb-3 border-b border-gray-100">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={
                              declarations.accurate && 
                              (!formData.sales.some(sale => (parseFloat(sale.underDeclared) || 0) > 0) || declarations.offense) && 
                              declarations.awareness
                            }
                            onChange={(e) => {
                              const val = e.target.checked;
                              const hasUnderDecl = formData.sales.some(sale => (parseFloat(sale.underDeclared) || 0) > 0);
                              setDeclarations({
                                accurate: val,
                                offense: hasUnderDecl ? val : false,
                                awareness: val
                              });
                            }}
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-emerald-600 checked:bg-emerald-600"
                          />
                          <CheckCircle2 className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5" />
                        </div>
                        <span className="text-xs font-bold text-gray-800 leading-relaxed group-hover:text-emerald-700 transition-colors">
                          Accept All Declarations
                        </span>
                      </label>

                      {/* First Declaration */}
                      <label className="flex items-start gap-3 cursor-pointer group pt-1">
                        <div className="relative flex items-center mt-0.5">
                          <input
                            type="checkbox"
                            checked={declarations.accurate}
                            onChange={(e) => setDeclarations(prev => ({ ...prev, accurate: e.target.checked }))}
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-blue-600 checked:bg-blue-600"
                          />
                          <CheckCircle2 className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5" />
                        </div>
                        <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-900 transition-colors">
                          I/We confirm that the information provided is true and accurate to the best of my/our knowledge.
                        </span>
                      </label>

                      {/* Second Declaration (Conditional) */}
                      {formData.sales.some(sale => (parseFloat(sale.underDeclared) || 0) > 0) && (
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative flex items-center mt-0.5">
                            <input
                              type="checkbox"
                              checked={declarations.offense}
                              onChange={(e) => setDeclarations(prev => ({ ...prev, offense: e.target.checked }))}
                              className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-blue-600 checked:bg-blue-600"
                            />
                            <CheckCircle2 className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5" />
                          </div>
                          <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-900 transition-colors">
                            I/We understand that under-declaration of milk volumes is an offense under the Dairy Industry Act and agree to pay the calculated under declared volumes and monies within the specified periods.
                          </span>
                        </label>
                      )}

                      {/* Third Declaration (Originally Awareness) */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center mt-0.5">
                          <input
                            type="checkbox"
                            checked={declarations.awareness}
                            onChange={(e) => setDeclarations(prev => ({ ...prev, awareness: e.target.checked }))}
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-blue-600 checked:bg-blue-600"
                          />
                          <CheckCircle2 className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5" />
                        </div>
                        <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-900 transition-colors">
                          I/We confirm that I/We have been informed/presented with, read and understood the KDB Premise Inspection Scope Disclosure, including the legal obligations to maintain records and traceability of the same as stipulated under the Dairy Industry Act (Cap 336), Laws of Kenya.
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Comments</label>
                    <textarea
                      name="comments"
                      value={formData.comments}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-sm"
                      placeholder="Enter any additional comments here..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Compliance Officer Name</label>
                        <input
                          type="text"
                          name="complianceOfficer"
                          value={formData.complianceOfficer}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Compliance Officer Signature</label>
                        <div className="flex flex-col gap-2">
                          {!formData.complianceSignature ? (
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, 'complianceSignature')}
                              className="text-xs"
                            />
                          ) : (
                            <div className="relative group">
                              <img src={formData.complianceSignature} alt="Compliance Signature" className="h-20 object-contain border rounded-lg bg-white" />
                              <button
                                type="button"
                                onClick={() => clearField('complianceSignature')}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">For DBO; Name</label>
                        <input
                          type="text"
                          name="confirmationName"
                          value={formData.confirmationName}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Designation</label>
                        <input
                          type="text"
                          name="designation"
                          value={formData.designation}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">DBO Signature</label>
                        <div className="flex flex-col gap-2">
                          {!formData.dboSignature ? (
                            <div className="space-y-3">
                              <div className="border-2 border-dashed border-gray-200 rounded-xl p-2 bg-gray-50">
                                <SignatureCanvas
                                  ref={dboSigPad}
                                  penColor="black"
                                  canvasProps={{
                                    className: "w-full h-32 rounded-lg cursor-crosshair",
                                    style: { background: 'white' }
                                  }}
                                />
                                <div className="flex justify-between mt-2">
                                  <button
                                    type="button"
                                    onClick={() => dboSigPad.current?.clear()}
                                    className="text-[10px] font-bold text-gray-500 hover:text-red-500 flex items-center gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" /> Clear Pad
                                  </button>
                                  <button
                                    type="button"
                                    onClick={saveDboSignature}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                  >
                                    <PenTool className="w-3 h-3" /> Save Signature
                                  </button>
                                </div>
                              </div>
                              <div className="text-center">
                                <span className="text-[10px] text-gray-400 uppercase font-bold">OR UPLOAD IMAGE</span>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'dboSignature')}
                                className="text-xs"
                              />
                            </div>
                          ) : (
                            <div className="relative group">
                              <img src={formData.dboSignature} alt="DBO Signature" className="h-20 object-contain border rounded-lg bg-white" />
                              <button
                                type="button"
                                onClick={() => clearField('dboSignature')}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">DBO Stamp</label>
                        <div className="flex flex-col gap-2">
                          {!formData.dboStamp ? (
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, 'dboStamp')}
                              className="text-xs"
                            />
                          ) : (
                            <div className="relative group">
                              <img src={formData.dboStamp} alt="DBO Stamp" className="h-20 object-contain border rounded-lg bg-white" />
                              <button
                                type="button"
                                onClick={() => clearField('dboStamp')}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-6">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="flex items-center gap-2 px-6 py-3 text-gray-500 font-bold hover:text-black transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handlePreview}
                          className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                        >
                          <FileText className="w-4 h-4" />
                          Preview PDF
                        </button>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`flex items-center gap-2 px-10 py-4 rounded-2xl font-bold transition-all shadow-lg ${
                          isSubmitting
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Syncing & Generating PDF...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            {isAmendment ? 'Submit Amendment & Overwrite' : 'Submit & Sync to Sheet'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* PDF Preview Modal */}
        <AnimatePresence>
          {pdfPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                  <h3 className="text-xl font-bold">PDF Preview</h3>
                  <button
                    onClick={() => setPdfPreview(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    &times;
                  </button>
                </div>
                <div className="flex-1 bg-gray-100">
                  <iframe
                    src={pdfPreview}
                    className="w-full h-full border-none"
                    title="PDF Preview"
                  />
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-end bg-white">
                  <button
                    onClick={() => setPdfPreview(null)}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                  >
                    Close Preview
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 7-Point Split-Screen Reconciliation Overlay */}
        <AnimatePresence>
          {showReconciliation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 text-white">
                  <h3 className="text-lg font-black tracking-tight">7-Point Profile Reconciliation Required</h3>
                  <p className="text-xs text-amber-100 font-medium">Conflicting data points identified between Data Validation input and core Clients database.</p>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6 flex-grow">
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    The following fields do not match. For each mismatch, select which value is the absolute latest source of truth. 
                    Selecting a value will update BOTH this validation form and the core licensed clients registry in Supabase.
                  </p>

                  <div className="space-y-4">
                    {mismatchFields.map((item, idx) => (
                      <div key={item.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-left">
                        <span className="text-xs font-bold text-slate-800 tracking-tight block uppercase">{item.label}</span>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Validation Value Option */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...mismatchFields];
                              updated[idx].selectedVal = 'validation';
                              setMismatchFields(updated);
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 relative overflow-hidden ${
                              item.selectedVal === 'validation'
                                ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Data Validation Form State</span>
                            <span className="text-sm font-semibold text-slate-800">{item.validationVal || '(Empty)'}</span>
                            {item.selectedVal === 'validation' && (
                              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600" />
                            )}
                          </button>

                          {/* Client Value Option */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...mismatchFields];
                              updated[idx].selectedVal = 'client';
                              setMismatchFields(updated);
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1 relative overflow-hidden ${
                              item.selectedVal === 'client'
                                ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-100'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Licensed Clients Registry</span>
                            <span className="text-sm font-semibold text-slate-800">{item.clientVal || '(Empty)'}</span>
                            {item.selectedVal === 'client' && (
                              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setShowReconciliation(false);
                    }}
                    className="px-5 py-2.5 rounded-xl border bg-white hover:bg-slate-50 font-semibold text-xs text-slate-600 transition-all"
                  >
                    Cancel Selection
                  </button>
                  <button
                    type="button"
                    disabled={mismatchFields.some(m => !m.selectedVal) || isSubmitting}
                    onClick={handleResolveReconciliation}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Synchronizing...
                      </>
                    ) : (
                      'Resolve & Synchronize'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        <footer className="mt-12 text-center text-gray-400 text-[10px] uppercase tracking-widest pb-8">
          &copy; {new Date().getFullYear()} Kenya Dairy Board &bull; Quality Milk for Health and Wealth
        </footer>
      </div>
    </div>
  );
}

export default DataValidationModule;
