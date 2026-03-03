import { AgreementData, DebtorRecord, StaffConfig } from '../types.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const API_BASE = '/api';

// Initialize Supabase client if environment variables are present
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[DBService] Supabase initialized");
  } catch (e) {
    console.error("[DBService] Failed to initialize Supabase:", e);
  }
}

export const DBService = {
  async getAgreements(): Promise<AgreementData[]> {
    let agreements: AgreementData[] = [];

    // 1. Try Local API first (Source of Truth for this session)
    try {
      const response = await fetch(`${API_BASE}/agreements`);
      if (response.ok) {
        agreements = await response.json();
        localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
      }
    } catch (error) {
      console.error("[DBService] Local API getAgreements error:", error);
      const local = localStorage.getItem('kdb_agreements_fallback');
      if (local) agreements = JSON.parse(local);
    }

    // 2. If local is empty and Supabase is available, try Supabase
    if (agreements.length === 0) {
      // Try localStorage fallback first if local API returned nothing
      const local = localStorage.getItem('kdb_agreements_fallback');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.length > 0) {
          agreements = parsed;
          console.log("[DBService] Restored agreements from localStorage");
          // Try to sync this back to the server
          this.syncAgreementsToLocal(agreements);
        }
      }

      // Then try Supabase if still empty
      if (agreements.length === 0 && supabase) {
        try {
          const { data, error } = await supabase
            .from('agreements')
            .select('*')
            .order('submittedAt', { ascending: false });
          
          if (!error && data && data.length > 0) {
            agreements = data as AgreementData[];
            console.log("[DBService] Restored agreements from Supabase");
            this.syncAgreementsToLocal(agreements);
          }
        } catch (error) {
          console.error("[DBService] Supabase getAgreements error:", error);
        }
      }
    }

    return agreements;
  },

  async forceSync(): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    
    console.log("[DBService] Force syncing from Supabase...");
    const { data: agreements, error: aError } = await supabase.from('agreements').select('*');
    const { data: debtors, error: dError } = await supabase.from('debtors').select('*');
    
    if (aError) throw aError;
    if (dError) throw dError;

    if (agreements) await this.syncAgreementsToLocal(agreements);
    if (debtors) {
      await fetch(`${API_BASE}/debtors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtors)
      });
    }
    console.log("[DBService] Force sync complete");
  },

  async syncAgreementsToLocal(agreements: AgreementData[]): Promise<void> {
    try {
      await fetch(`${API_BASE}/agreements/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agreements)
      });
    } catch (e) {
      console.error("[DBService] Sync to local failed:", e);
    }
  },

  async saveAgreement(agreement: AgreementData): Promise<void> {
    // 1. Local API first (Immediate)
    try {
      const response = await fetch(`${API_BASE}/agreements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agreement)
      });
      if (!response.ok) throw new Error('Failed to save agreement locally');
      
      const agreements = await this.getAgreements();
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
    } catch (error) {
      console.error("[DBService] Local API saveAgreement error:", error);
      throw error;
    }

    // 2. Supabase in background
    if (supabase) {
      supabase.from('agreements').upsert(agreement).then(({ error }) => {
        if (error) console.error("[DBService] Supabase saveAgreement background error:", error);
      });
    }
  },

  async updateAgreement(id: string, updates: Partial<AgreementData>): Promise<void> {
    // 1. Try Supabase first
    if (supabase) {
      try {
        const { error } = await supabase
          .from('agreements')
          .update(updates)
          .eq('id', id);
        
        if (error) throw error;
      } catch (error) {
        console.error("[DBService] Supabase updateAgreement error:", error);
      }
    }

    // 2. Local API
    try {
      const response = await fetch(`${API_BASE}/agreements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update agreement');
      
      // Update local fallback
      const agreements = await this.getAgreements();
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
    } catch (error) {
      console.error("[DBService] Local API updateAgreement error:", error);
      throw error;
    }
  },

  async deleteAgreement(id: string): Promise<void> {
    // 1. Try Supabase first
    if (supabase) {
      try {
        const { error } = await supabase
          .from('agreements')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } catch (error) {
        console.error("[DBService] Supabase deleteAgreement error:", error);
      }
    }

    // 2. Local API
    try {
      const response = await fetch(`${API_BASE}/agreements/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete agreement');
      
      // Update local fallback
      const agreements = await this.getAgreements();
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
    } catch (error) {
      console.error("[DBService] Local API deleteAgreement error:", error);
      throw error;
    }
  },

  async getDebtors(): Promise<DebtorRecord[]> {
    let debtors: DebtorRecord[] = [];

    // 1. Local API first
    try {
      const response = await fetch(`${API_BASE}/debtors`);
      if (response.ok) {
        debtors = await response.json();
        localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
      }
    } catch (error) {
      console.error("[DBService] Local API getDebtors error:", error);
      const local = localStorage.getItem('kdb_debtors_fallback');
      if (local) debtors = JSON.parse(local);
    }

    // 2. Supabase fallback
    if (debtors.length <= 1 && supabase) { // <= 1 because initial debtor is always there
      try {
        const { data, error } = await supabase
          .from('debtors')
          .select('*')
          .order('dboName', { ascending: true });
        
        if (!error && data && data.length > 0) {
          debtors = data as DebtorRecord[];
          console.log("[DBService] Restored debtors from Supabase");
          this.saveDebtors(debtors); // Sync to local
        }
      } catch (error) {
        console.error("[DBService] Supabase getDebtors error:", error);
      }
    }

    return debtors;
  },

  async saveDebtors(debtors: DebtorRecord[]): Promise<void> {
    // 1. Local API first
    try {
      const response = await fetch(`${API_BASE}/debtors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtors)
      });
      if (!response.ok) throw new Error('Failed to save debtors locally');
      localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
    } catch (error) {
      console.error("[DBService] Local API saveDebtors error:", error);
      throw error;
    }

    // 2. Supabase background
    if (supabase) {
      supabase.from('debtors').upsert(debtors).then(({ error }) => {
        if (error) console.error("[DBService] Supabase saveDebtors background error:", error);
      });
    }
  },

  async getStaffConfig(): Promise<StaffConfig> {
    // 1. Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('staff_config')
          .select('*')
          .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
        if (data) return data as StaffConfig;
      } catch (error) {
        console.error("[DBService] Supabase getStaffConfig error:", error);
      }
    }

    // 2. Local API
    try {
      const response = await fetch(`${API_BASE}/staff`);
      if (!response.ok) throw new Error('Failed to fetch staff config');
      const data = await response.json();
      localStorage.setItem('kdb_staff_fallback', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error("[DBService] Local API getStaffConfig error:", error);
      const local = localStorage.getItem('kdb_staff_fallback');
      return local ? JSON.parse(local) : { officialSignature: '' };
    }
  },

  async saveStaffConfig(config: StaffConfig): Promise<void> {
    // 1. Try Supabase first
    if (supabase) {
      try {
        // We assume there's only one config row
        const { error } = await supabase
          .from('staff_config')
          .upsert({ id: 1, ...config });
        
        if (error) throw error;
      } catch (error) {
        console.error("[DBService] Supabase saveStaffConfig error:", error);
      }
    }

    // 2. Local API
    try {
      const response = await fetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to save staff config');
      
      localStorage.setItem('kdb_staff_fallback', JSON.stringify(config));
    } catch (error) {
      console.error("[DBService] Local API saveStaffConfig error:", error);
      throw error;
    }
  }
};

