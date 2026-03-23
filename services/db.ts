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
    // 1. Try Supabase first if available
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('agreements')
          .select('*')
          .order('submittedAt', { ascending: false });
        
        if (error) throw error;
        if (data) return data as AgreementData[];
      } catch (error) {
        console.error("[DBService] Supabase getAgreements error:", error);
      }
    }

    // 2. Fallback to Local API
    try {
      const response = await fetch(`${API_BASE}/agreements`);
      if (!response.ok) throw new Error('Failed to fetch agreements');
      const data = await response.json();
      
      // Sync to local fallback
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error("[DBService] Local API getAgreements error:", error);
      
      // 3. Last resort: Local Storage
      const local = localStorage.getItem('kdb_agreements_fallback');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveAgreement(agreement: AgreementData): Promise<void> {
    // 1. Try Supabase first
    if (supabase) {
      try {
        const { error } = await supabase
          .from('agreements')
          .upsert(agreement);
        
        if (error) throw error;
      } catch (error) {
        console.error("[DBService] Supabase saveAgreement error:", error);
        // Continue to local API if Supabase fails
      }
    }

    // 2. Local API
    try {
      const response = await fetch(`${API_BASE}/agreements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agreement)
      });
      if (!response.ok) throw new Error('Failed to save agreement');
      
      // Update local fallback
      const agreements = await this.getAgreements();
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
    } catch (error) {
      console.error("[DBService] Local API saveAgreement error:", error);
      throw error;
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
    // 1. Try Supabase first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('debtors')
          .select('*')
          .order('dboName', { ascending: true });
        
        if (error) throw error;
        if (data && data.length > 0) return data as DebtorRecord[];
      } catch (error) {
        console.error("[DBService] Supabase getDebtors error:", error);
      }
    }

    // 2. Local API
    try {
      const response = await fetch(`${API_BASE}/debtors`);
      if (!response.ok) throw new Error('Failed to fetch debtors');
      const data = await response.json();
      localStorage.setItem('kdb_debtors_fallback', JSON.stringify(data));
      return data;
    } catch (error) {
      console.error("[DBService] Local API getDebtors error:", error);
      const local = localStorage.getItem('kdb_debtors_fallback');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveDebtors(debtors: DebtorRecord[]): Promise<void> {
    // 1. Try Supabase first
    if (supabase) {
      try {
        // For simplicity, we upsert the whole list or handle individually
        // Here we'll upsert all debtors
        const { error } = await supabase
          .from('debtors')
          .upsert(debtors);
        
        if (error) throw error;
      } catch (error) {
        console.error("[DBService] Supabase saveDebtors error:", error);
      }
    }

    // 2. Local API
    try {
      const response = await fetch(`${API_BASE}/debtors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtors)
      });
      if (!response.ok) throw new Error('Failed to save debtors');
      
      localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
    } catch (error) {
      console.error("[DBService] Local API saveDebtors error:", error);
      throw error;
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

