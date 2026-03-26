import { AgreementData, DebtorRecord, StaffConfig } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client if environment variables are present
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("[DBService] Supabase init error:", e);
  }
}

export const DBService = {
  async getAgreements(): Promise<AgreementData[]> {
    if (!supabase) {
      console.warn("[DBService] Supabase not initialized, using localStorage");
      const local = localStorage.getItem('kdb_agreements_cache');
      return local ? JSON.parse(local) : [];
    }

    try {
      const { data, error } = await supabase
        .from('agreements')
        .select('*')
        .order('submittedAt', { ascending: false });
      
      if (error) throw error;
      
      const agreements = data as AgreementData[];
      localStorage.setItem('kdb_agreements_cache', JSON.stringify(agreements));
      return agreements;
    } catch (error) {
      console.error("[DBService] getAgreements error:", error);
      const local = localStorage.getItem('kdb_agreements_cache');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveAgreement(agreement: AgreementData): Promise<void> {
    if (!supabase) throw new Error("Supabase not initialized");

    try {
      const { error } = await supabase
        .from('agreements')
        .upsert(agreement);
      
      if (error) throw error;
      
      // Update local cache
      const current = await this.getAgreements();
      localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
    } catch (error) {
      console.error("[DBService] saveAgreement error:", error);
      throw error;
    }
  },

  async updateAgreement(id: string, updates: Partial<AgreementData>): Promise<void> {
    if (!supabase) throw new Error("Supabase not initialized");

    try {
      const { error } = await supabase
        .from('agreements')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local cache
      const current = await this.getAgreements();
      localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
    } catch (error) {
      console.error("[DBService] updateAgreement error:", error);
      throw error;
    }
  },

  async deleteAgreement(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase not initialized");

    try {
      const { error } = await supabase
        .from('agreements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local cache
      const current = await this.getAgreements();
      localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
    } catch (error) {
      console.error("[DBService] deleteAgreement error:", error);
      throw error;
    }
  },

  async getDebtors(): Promise<DebtorRecord[]> {
    if (!supabase) {
      const local = localStorage.getItem('kdb_debtors_cache');
      return local ? JSON.parse(local) : [];
    }

    try {
      const { data, error } = await supabase
        .from('debtors')
        .select('*')
        .order('dboName', { ascending: true });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        localStorage.setItem('kdb_debtors_cache', JSON.stringify(data));
        return data as DebtorRecord[];
      }
      return [];
    } catch (error) {
      console.error("[DBService] getDebtors error:", error);
      const local = localStorage.getItem('kdb_debtors_cache');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveDebtors(debtors: DebtorRecord[]): Promise<void> {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('debtors')
        .upsert(debtors);
      
      if (error) throw error;
      localStorage.setItem('kdb_debtors_cache', JSON.stringify(debtors));
    } catch (error) {
      console.error("[DBService] saveDebtors error:", error);
      throw error;
    }
  },

  async getStaffConfig(): Promise<StaffConfig> {
    if (!supabase) {
      const local = localStorage.getItem('kdb_staff_cache');
      return local ? JSON.parse(local) : { officialSignature: '' };
    }

    try {
      const { data, error } = await supabase
        .from('staff_config')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        localStorage.setItem('kdb_staff_cache', JSON.stringify(data));
        return data as StaffConfig;
      }
      return { officialSignature: '' };
    } catch (error) {
      console.error("[DBService] getStaffConfig error:", error);
      const local = localStorage.getItem('kdb_staff_cache');
      return local ? JSON.parse(local) : { officialSignature: '' };
    }
  },

  async saveStaffConfig(config: StaffConfig): Promise<void> {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('staff_config')
        .upsert({ id: 1, ...config });
      
      if (error) throw error;
      localStorage.setItem('kdb_staff_cache', JSON.stringify(config));
    } catch (error) {
      console.error("[DBService] saveStaffConfig error:", error);
      throw error;
    }
  }
};
