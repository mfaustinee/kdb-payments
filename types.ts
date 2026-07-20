
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

