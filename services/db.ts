
import { createClient } from '@supabase/supabase-js';
import { AgreementData, DebtorRecord, StaffConfig, getEnv } from '../types.ts';

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

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
    let cloudData: AgreementData[] = [];
    let cloudSuccess = false;

    console.log("[DBService] Fetching agreements...");

    try {
      if (supabase) {
        const { data, error } = await supabase.from('agreements').select('*');
        if (error) {
          console.error("[DBService] Supabase fetch error:", error);
        } else if (data) {
          cloudData = data.map(item => ({
            ...(item.full_data || {}),
            id: item.id,
            status: item.status || (item.full_data?.status) || 'submitted'
          }));
          cloudSuccess = true;
          console.log(`[DBService] Cloud fetch success: ${cloudData.length} records`);
        }
      } else {
        console.warn("[DBService] Supabase client not initialized (missing keys)");
      }
    } catch (e) {
      console.warn("[DBService] Cloud DB fetch exception:", e);
    }
    
    const localRaw = localStorage.getItem(STORAGE_KEYS.AGREEMENTS);
    const localData: AgreementData[] = localRaw ? JSON.parse(localRaw) : [];
    console.log(`[DBService] Local storage: ${localData.length} records`);

    if (cloudSuccess) {
      const merged = [...cloudData];
      localData.forEach(l => {
        if (!merged.some(c => c.id === l.id)) {
          merged.push(l);
        }
      });
      console.log(`[DBService] Merged total: ${merged.length} records`);
      // Sync merged back to local for offline resilience
      localStorage.setItem(STORAGE_KEYS.AGREEMENTS, JSON.stringify(merged));
      return merged;
    }

    return localData;
  },

  async saveAgreement(agreement: AgreementData): Promise<void> {
    console.log("[DBService] Saving agreement:", agreement.id);
    
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
        if (error) {
          console.error("[DBService] Cloud insert error:", error);
        } else {
          console.log("[DBService] Cloud insert success");
        }
      } catch (e) {
        console.error("[DBService] Cloud sync exception:", e);
      }
    }

    // Update local storage immediately to avoid race conditions
    const localRaw = localStorage.getItem(STORAGE_KEYS.AGREEMENTS);
    const localData: AgreementData[] = localRaw ? JSON.parse(localRaw) : [];
    
    const exists = localData.some(a => a.id === agreement.id);
    let updated: AgreementData[];
    if (exists) {
      updated = localData.map(a => a.id === agreement.id ? agreement : a);
    } else {
      updated = [...localData, agreement];
    }
    
    localStorage.setItem(STORAGE_KEYS.AGREEMENTS, JSON.stringify(updated));
    console.log("[DBService] Local storage updated");
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
  },

  async getDebtors(): Promise<DebtorRecord[]> {
    let cloudData: DebtorRecord[] = [];
    let cloudSuccess = false;

    try {
      if (supabase) {
        const { data, error } = await supabase.from('debtors').select('*');
        if (!error && data && data.length > 0) {
           cloudData = data.map(d => ({
             ...d,
             dboName: d.dbo_name,
             permitNo: d.permit_no,
             totalArrears: d.total_arrears,
             arrearsBreakdown: [],
             totalArrearsWords: '',
             arrearsPeriod: 'Current',
             debitNoteNo: '',
             installments: []
           }));
           cloudSuccess = true;
        }
      }
    } catch (e) {
      console.warn("Debtor ledger fetch failed.");
    }

    const localRaw = localStorage.getItem(STORAGE_KEYS.DEBTORS);
    const localData: DebtorRecord[] = localRaw ? JSON.parse(localRaw) : [];

    if (cloudSuccess && cloudData.length > 0) {
      const merged = [...cloudData];
      localData.forEach(l => {
        if (!merged.some(c => c.id === l.id)) {
          merged.push(l);
        }
      });
      return merged;
    }

    return localData;
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
