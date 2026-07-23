
export interface Installment {
  no: number;
  period: string;
  dueDate: string;
  amount: number;
}

export interface ArrearItem {
  id: string;
  month: string;
  amount: number;
}

export interface DebtorRecord {
  id: string;
  dboName: string;
  premiseName: string;
  permitNo: string;
  location: string;
  county: string;
  arrearsBreakdown: ArrearItem[];
  totalArrears: number;
  totalArrearsWords: string;
  arrearsPeriod: string;
  debitNoteNo: string;
  tel: string;
  installments: Installment[];
}

export interface StaffConfig {
  officialSignature: string; // Base64
}

export interface AgreementData extends DebtorRecord {
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'resubmission_requested';
  date: string;
  clientEmail: string;
  poBox: string;
  code: string;
  clientSignature: string; 
  officialSignature?: string; 
  officialName?: string;
  rejectionReason?: string;
  resubmissionReason?: string;
  clientName: string;
  clientTitle: string;
  submittedAt?: string;
  approvedAt?: string;
  adminBypassed?: boolean;
}

export interface ClosureNotificationData {
  id: string;
  status: 'submitted' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt?: string;
  dboName: string;
  permitNo: string;
  premiseName: string;
  permitType: string;
  county: string;
  subCounty: string;
  location: string;
  tel: string;
  closureDate: string;
  closureReason: string;
  permitStatusIntent: string;
  declarationAgreed: boolean;
  clientSignature: string;
  clientName: string;
  clientTitle?: string;
  officialSignature?: string;
  officialName?: string;
  officialTitle?: string;
  officialComments?: string;
  rejectionReason?: string;
}

export interface ComplaintData {
  id: string; // Reference No.
  status: 'submitted' | 'resolved' | 'pending' | 'referred' | 'closed' | 'investigating' | 'rejected';
  submittedAt: string;
  dateReceived?: string;
  receivedBy?: string;
  
  // 1. Complainant Details
  clientName: string; // Full Name / Company Name
  idNumber: string; // ID Number / Registration Number
  stakeholderCategory: string; // Farmer, Milk Trader, Processor, Transporter, Cooperative Society, Input Supplier, Distributor, Consumer, Other
  otherStakeholderCategory?: string;
  postalAddress: string;
  tel: string;
  email: string;
  county: string;
  
  // 2. Complaint Details
  natureOfComplaint: string; // Licensing Issues, Delayed Services, Quality/Standards Concerns, Inspection/Compliance Issues, Milk Pricing Disputes, Staff Conduct, Corruption or Misconduct, Regulatory Enforcement Concern, Other
  otherNatureOfComplaint?: string;
  location: string; // Location Where Issue Occurred (County/Sub-County)
  incidentDate: string; // Date Incident Occurred
  complaintDescription: string; // Detailed Description of Complaint
  
  // 3. Supporting Documents
  attachments: string[]; // License Copy, Payment Receipt, Correspondence, Inspection Report, Photos, Other
  otherAttachment?: string;
  numAttachments: number;
  
  // 4. Desired Resolution
  desiredResolution: string;
  
  // 5. Declaration
  declarationAgreed: boolean;
  clientSignature: string; // Base64
  clientNameDeclaration: string;
  
  // 6. For Official Use Only
  complaintCategoryCode?: string;
  assignedTo?: string;
  investigationFindings?: string;
  actionTaken?: string;
  officialStatus?: 'Resolved' | 'Pending' | 'Referred' | 'Closed';
  dateClosed?: string;
  officialSignature?: string; // Base64
  officialName?: string;
  officialTitle?: string;
  officialComments?: string;
  rejectionReason?: string;
  complainantName?: string;
  complainantCategory?: string;
  telephone?: string;
  complaintDetails?: string;
  actionDate?: string;
  dateReplied?: string;
  referenceNumber?: string;
}

export interface InquiryData {
  id: string; // Inquiry Reference Number
  status: 'submitted' | 'resolved' | 'closed' | 'pending' | 'referred';
  submittedAt: string;
  
  // 1. CLIENT INFORMATION
  clientName: string; // Full Name / Company Name
  contactPerson?: string; // Contact Person (if company)
  idPassportNo?: string; // ID/Passport No. (if applicable)
  kdbLicenseNo?: string; // KDB License Number (if applicable)
  postalAddress: string;
  cityTown: string;
  tel: string;
  mobileNumber: string;
  email: string;
  
  // 2. TYPE OF CLIENT
  clientType: string; // Dairy Farmer, Milk Transporter, Milk Processor, Milk Vendor/Trader, Cooperative Society, Equipment Supplier, Exporter/Importer, Prospective Investor, Member of Public, Other
  otherClientType?: string;
  
  // 3. NATURE OF INQUIRY
  natureOfInquiry: string; // Licensing & Registration, License Renewal, Compliance Requirements, Inspection & Certification, Dairy Imports/Exports, Market Information, Training & Capacity Building, Complaint Submission, Product Standards, Other
  otherNatureOfInquiry?: string;
  
  // 4. DETAILS OF INQUIRY
  inquiryDetails: string;
  
  // 5. SUPPORTING DOCUMENTS
  supportingDocsStatus: 'Attached' | 'To be submitted later';
  attachedDocsList?: string;
  
  // 6. PREFERRED MODE OF RESPONSE
  preferredResponseMode: string; // Email, Phone Call, In-person Appointment, Written Letter
  
  // 7. DECLARATION
  declarationAgreed: boolean;
  clientSignature: string; // Base64
  
  // OFFICIAL USE ONLY (Kenya Dairy Board)
  receivedBy?: string;
  dateReceived?: string;
  departmentAssigned?: string;
  actionTaken?: string;
  dateClosed?: string;
  officialSignature?: string; // Base64
  officialName?: string;
  officialTitle?: string;
  officialComments?: string;
  rejectionReason?: string;
  county?: string;
  clientCategory?: string;
  telephone?: string;
  location?: string;
  message?: string;
  referredTo?: string;
  actionDate?: string;
  responseDetails?: string;
  dateReplied?: string;
  referenceNumber?: string;
}

// Helper to resolve environment variables in various browser environments
export const getEnv = (key: string, fallback: string = ''): string => {
  return import.meta.env[key] || fallback;
};

// Category Short Codes: CP (Cooling Plant), CI (Cottage Industry), MB (Milk Bar), DP (Dispenser), PR (Processor), MD (Mini Dairy)
export const getCategoryShortCode = (category?: string): string => {
  if (!category) return 'MB';
  const c = category.toLowerCase().trim();
  if (c.includes('cooling') || c === 'cp') return 'CP';
  if (c.includes('cottage') || c === 'ci') return 'CI';
  if (c.includes('milk bar') || c === 'mb' || c.includes('bar')) return 'MB';
  if (c.includes('dispenser') || c === 'dp') return 'DP';
  if (c.includes('processor') || c === 'pr' || c.includes('process')) return 'PR';
  if (c.includes('mini') || c === 'md' || c.includes('dairy')) return 'MD';
  return 'MB';
};

export const formatPermitNumber = (permitNo: string | undefined | null, category?: string, year?: number | string): string => {
  const code = getCategoryShortCode(category);
  const yr = year || new Date().getFullYear();

  if (!permitNo || !permitNo.trim()) {
    const seq = Math.floor(10000 + Math.random() * 90000);
    return `KDB/${code}/${seq}/${yr}`;
  }
  
  const trimmed = permitNo.trim();
  // Check if it already matches KDB/XX/12345/YYYY
  const match = trimmed.match(/^KDB\/(CP|CI|MB|DP|PR|MD)\/(\d+)\/(\d{4})$/i);
  if (match) {
    return `KDB/${match[1].toUpperCase()}/${match[2].padStart(5, '0')}/${match[3]}`;
  }

  // Handle KDB/LC/12345 or KDB/MB/12345 or other variations
  if (trimmed.startsWith('KDB/')) {
    const parts = trimmed.split('/');
    if (parts.length === 4) {
      const numDigits = parts[2].replace(/\D/g, '');
      const num = numDigits ? numDigits.padStart(5, '0').slice(-5) : '10001';
      const y = parts[3].match(/\d{4}/) ? parts[3] : yr;
      return `KDB/${code}/${num}/${y}`;
    } else if (parts.length === 3) {
      const numDigits = parts[1].replace(/\D/g, '');
      const num = numDigits ? numDigits.padStart(5, '0').slice(-5) : '10001';
      const y = parts[2].match(/\d{4}/) ? parts[2] : yr;
      return `KDB/${code}/${num}/${y}`;
    }
  }

  // Extract digits for sequence
  const digits = trimmed.replace(/\D/g, '');
  const seq = digits.length >= 5 ? digits.slice(-5) : (digits ? digits.padStart(5, '0') : '10001');
  return `KDB/${code}/${seq}/${yr}`;
};

export const formatDateToDDMMYYYY = (dateStr: string | Date | undefined | null): string => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string') {
    const s = dateStr.trim();
    if (!s) return '';
    if (s.toLowerCase() === 'not filed' || s.toLowerCase() === 'n/a') return s;
    // If already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    // If in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const [y, m, d] = s.split('T')[0].split('-');
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDDMMYYYYToYYYYMMDD = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  const s = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.split('T')[0];
  }
  return '';
};

export interface ClientBranch {
  id: string; // unique ID or permit number
  premiseName: string;
  permitNumber: string;
  premiseCategory: 'Milk Bar' | 'Dispenser' | 'Cooling Plant' | 'Mini Dairy' | 'Cottage Industry' | 'Processor' | string;
  location: string;
  county: string;
  expiryDate?: string;
  operationalStatus: 'closed' | 'operating';
}

export interface LicensedClient {
  id: string;
  clientName: string;
  premiseName: string;
  startYear: number;
  startMonth: string;
  endYear: number | null;
  endMonth: string | null;
  startDate?: string; // Full Start Date in DD/MM/YYYY format
  endDate?: string;   // Full End Date in DD/MM/YYYY format
  tel: string;
  contactPerson: string;
  location: string;
  premiseCategory: 'Milk Bar' | 'Dispenser' | 'Cooling Plant' | 'Mini Dairy' | 'Cottage Industry' | 'Processor';
  county: string;
  coolingCapacity?: number; // for cooling plants and processors
  permitStatus: 'active' | 'inactive';
  operationalStatus: 'closed' | 'operating';
  levyInfo: 'QFR' | 'DNQ-R';
  expiryDate?: string;
  permitNumber?: string;
  branches?: ClientBranch[];
}

export interface ClientReturn {
  id: string;
  clientId: string;
  clientName: string;
  year: number;
  period: string; // e.g., Month name or description
  qty: number; // QTY (Kgs/Litres)
  invoiceAmount: number;
  returnDate: string;
  paymentAmount: number;
  paymentDate: string;
  txnRef: string; // Txn ref no./MR No
  lessCF: number;
  outstandingBalance: number;
  agingDays: number;
  paymentStatus: 'Fully Paid' | 'Partially Paid' | 'Unpaid';
  comments: string;
}

export interface DataValidation {
  id: string;
  clientId: string;
  clientName: string; // name of dbo
  premiseName: string; // premise name
  permitNo: string; // permit number
  location: string;
  category: string;
  contacts: string;
  expiryDate: string; // expiry date
  year: number;
  period: string; // e.g., 'January', 'February', etc.
  quantityDeclared: number | string; // quantity declared (or "Not Filed")
  unitPrice: number;
  totalSales: number;
  validatorName: string;
  validatedAt: string;
  status: 'Approved' | 'Pending' | 'Action Required';
  remarks?: string;
}

