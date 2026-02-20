
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

export type ViewState = 'CLIENT_PORTAL' | 'ADMIN_DASHBOARD' | 'SUCCESS_SCREEN';

// Helper to resolve environment variables in various browser environments
export const getEnv = (key: string, fallback: string = ''): string => {
  return import.meta.env[key] || fallback;
};

export const KDB_ADMIN_EMAIL = getEnv('VITE_KDB_ADMIN_EMAIL', 'kigunda.faustine@kdb.co.ke');
