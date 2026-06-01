
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
  officialSignature?: string;
  officialName?: string;
  rejectionReason?: string;
}

// Helper to resolve environment variables in various browser environments
export const getEnv = (key: string, fallback: string = ''): string => {
  return import.meta.env[key] || fallback;
};
