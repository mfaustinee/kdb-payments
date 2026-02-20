
import { createClient } from '@supabase/supabase-js';
import { AgreementData, DebtorRecord, StaffConfig, getEnv } from '../types.ts';
import { EmailService } from './email.ts';

const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY');

// Initialize only if keys are present to prevent crashes
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

const STORAGE_KEYS = {
  AGREEMENTS: 'kdb_agreements_prod_v1',
  DEBTORS: 'kdb_debtors_prod_v1',
  STAFF: 'kdb_staff_prod_v1'
};

export const DBService = {
  async getAgreements(): Promise<AgreementData[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('agreements').select('*');
        if (!error && data) {
          return data.map(item => ({
            ...(item.full_data || {}),
            id: item.id,
            status: item.status || (item.full_data?.status) || 'submitted'
          }));
        }
      }
    } catch (e) {
      console.warn("Cloud DB unavailable or keys missing. Using local ledger.");
    }
    
    const data = localStorage.getItem(STORAGE_KEYS.AGREEMENTS);
    return data ? JSON.parse(data) : [];
  },

  async saveAgreement(agreement: AgreementData): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('agreements').insert({
          id: agreement.id,
          dbo_name: agreement.dboName,
          permit_no: agreement.permitNo,
          county: agreement.county,
          total_arrears: agreement.totalArrears,
          status: agreement.status,
          client_email: agreement.clientEmail,
          full_data: agreement
        });
        if (error) throw error;
      } catch (e) {
        console.error("Cloud sync failed:", e);
      }
    }

    const existing = await this.getAgreements();
    const isDuplicate = existing.some(a => a.id === agreement.id);
    if (isDuplicate) {
      return this.updateAgreement(agreement.id, agreement);
    }
    const updated = [...existing, agreement];
    localStorage.setItem(STORAGE_KEYS.AGREEMENTS, JSON.stringify(updated));
    
    try {
      await EmailService.sendAdminNotification(agreement);
    } catch (e) {
      console.error("Notification dispatch failed.");
    }
  },

  async updateAgreement(id: string, updates: Partial<AgreementData>): Promise<void> {
    const existing = await this.getAgreements();
    const updatedAgreement = existing.find(a => a.id === id);
    const merged = { ...(updatedAgreement || {}), ...updates } as AgreementData;

    if (supabase) {
      try {
        const { error } = await supabase.from('agreements').update({
          status: updates.status,
          official_signature: updates.officialSignature,
          approved_at: updates.approvedAt,
          full_data: merged
        }).eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error("Cloud update failed.");
      }
    }

    const updated = existing.map(a => a.id === id ? merged : a);
    localStorage.setItem(STORAGE_KEYS.AGREEMENTS, JSON.stringify(updated));
    
    if (updates.status === 'approved') {
      const agreement = updated.find(a => a.id === id);
      if (agreement) {
        await EmailService.sendClientApproval(agreement);
      }
    } else if (updates.status === 'rejected') {
      const agreement = updated.find(a => a.id === id);
      if (agreement) {
        await EmailService.sendClientRejection(agreement);
      }
    }
  },

  async getDebtors(): Promise<DebtorRecord[]> {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('debtors').select('*');
        if (!error && data && data.length > 0) {
           // Mapping from DB columns to frontend keys
           return data.map(d => ({
             ...d,
             dboName: d.dbo_name,
             permitNo: d.permit_no,
             totalArrears: d.total_arrears,
             // Fallbacks for missing frontend fields in DB
             arrearsBreakdown: [],
             totalArrearsWords: '',
             arrearsPeriod: 'Current',
             debitNoteNo: '',
             installments: []
           }));
        }
      }
    } catch (e) {
      console.warn("Debtor ledger fetch failed.");
    }
    const data = localStorage.getItem(STORAGE_KEYS.DEBTORS);
    return data ? JSON.parse(data) : [];
  },

  async saveDebtors(debtors: DebtorRecord[]): Promise<void> {
    if (supabase) {
      try {
        await supabase.from('debtors').upsert(debtors.map(d => ({
          id: d.id,
          dbo_name: d.dboName,
          permit_no: d.permitNo,
          total_arrears: d.totalArrears,
          tel: d.tel,
          county: d.county
        })));
      } catch (e) {
        console.error("Cloud debtor sync failed.");
      }
    }
    localStorage.setItem(STORAGE_KEYS.DEBTORS, JSON.stringify(debtors));
  },

  async getStaffConfig(): Promise<StaffConfig> {
    const data = localStorage.getItem(STORAGE_KEYS.STAFF);
    return data ? JSON.parse(data) : { officialSignature: '' };
  },

  async saveStaffConfig(config: StaffConfig): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(config));
  }
};
