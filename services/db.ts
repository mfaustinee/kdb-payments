import { AgreementData, DebtorRecord, StaffConfig } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;
let isFetchingConfig = false;
let configPromise: Promise<any> | null = null;

const fetchConfig = async () => {
  if (configPromise) return configPromise;
  isFetchingConfig = true;
  configPromise = (async () => {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const text = await response.text();
        try {
          const config = JSON.parse(text);
          (window as any)._env_ = config;
          console.log("[DBService] Config loaded from server");
          return config;
        } catch (jsonErr) {
          console.error("[DBService] Invalid JSON from /api/config:", text.substring(0, 100));
        }
      } else {
        console.error(`[DBService] Failed to fetch config (${response.status})`);
      }
    } catch (e) {
      console.error("[DBService] Network error fetching config:", e);
    } finally {
      isFetchingConfig = false;
    }
    return null;
  })();
  return configPromise;
};

const getSupabase = async () => {
  if (supabase) return supabase;

  let env = (window as any)._env_;
  
  // If env is not available, try to fetch it
  if (!env && !isFetchingConfig) {
    await fetchConfig();
    env = (window as any)._env_;
  } else if (isFetchingConfig && configPromise) {
    // Wait for the existing fetch to complete
    await configPromise;
    env = (window as any)._env_;
  }

  env = env || {};
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
      console.log("[DBService] Supabase initialized successfully");
      return supabase;
    } catch (e) {
      console.error("[DBService] Supabase init error:", e);
    }
  }
  
  return null;
};

export const DBService = {
  async fetchConfig() {
    return await fetchConfig();
  },
  async getAgreements(): Promise<AgreementData[]> {
    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        const response = await fetch('/api/agreements');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('kdb_agreements_cache', JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.error("[DBService] Local API error:", e);
      }
      
      const local = localStorage.getItem('kdb_agreements_cache');
      return local ? JSON.parse(local) : [];
    }

    try {
      const { data, error } = await client
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
    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        const response = await fetch('/api/agreements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agreement)
        });
        if (response.ok) {
          // Update local cache
          const current = await this.getAgreements();
          localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
          return;
        }
        const errData = await response.json();
        throw new Error(errData.error || "Failed to save to local API");
      } catch (e: any) {
        console.error("[DBService] Local API save error:", e);
        const missing = [];
        const sUrl = import.meta.env.VITE_SUPABASE_URL || (window as any)._env_?.VITE_SUPABASE_URL;
        const sKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (window as any)._env_?.VITE_SUPABASE_ANON_KEY;
        if (!sUrl) missing.push("VITE_SUPABASE_URL");
        if (!sKey) missing.push("VITE_SUPABASE_ANON_KEY");
        throw new Error(`Submission failed. Supabase not initialized (Missing: ${missing.join(", ")}) and Local API failed: ${e.message}`);
      }
    }

    try {
      const { error } = await client
        .from('agreements')
        .upsert(agreement);
      
      if (error) {
        console.error("[DBService] Supabase upsert error:", error);
        throw new Error(`Supabase Error: ${error.message} (Code: ${error.code})`);
      }
      
      // Update local cache
      const current = await this.getAgreements();
      localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
    } catch (error: any) {
      console.error("[DBService] saveAgreement error:", error);
      throw error;
    }
  },

  async updateAgreement(id: string, updates: Partial<AgreementData>): Promise<void> {
    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        const response = await fetch(`/api/agreements/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (response.ok) {
          const current = await this.getAgreements();
          localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
          return;
        }
        throw new Error("Failed to update via local API");
      } catch (e: any) {
        console.error("[DBService] Local API update error:", e);
        throw new Error(`Update failed: ${e.message}`);
      }
    }

    try {
      const { error } = await client
        .from('agreements')
        .update(updates)
        .eq('id', id);
      
      if (error) {
        console.error("[DBService] Supabase update error:", error);
        throw new Error(`Supabase Error: ${error.message} (Code: ${error.code})`);
      }
      
      // Update local cache
      const current = await this.getAgreements();
      localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
    } catch (error: any) {
      console.error("[DBService] updateAgreement error:", error);
      throw error;
    }
  },

  async deleteAgreement(id: string): Promise<void> {
    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        const response = await fetch(`/api/agreements/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          const current = await this.getAgreements();
          localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
          return;
        }
        throw new Error("Failed to delete via local API");
      } catch (e: any) {
        console.error("[DBService] Local API delete error:", e);
        throw new Error(`Delete failed: ${e.message}`);
      }
    }

    try {
      const { error } = await client
        .from('agreements')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error("[DBService] Supabase delete error:", error);
        throw new Error(`Supabase Error: ${error.message} (Code: ${error.code})`);
      }
      
      // Update local cache
      const current = await this.getAgreements();
      localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
    } catch (error: any) {
      console.error("[DBService] deleteAgreement error:", error);
      throw error;
    }
  },

  async getDebtors(): Promise<DebtorRecord[]> {
    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        const response = await fetch('/api/debtors');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('kdb_debtors_cache', JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.error("[DBService] Local API error:", e);
      }
      const local = localStorage.getItem('kdb_debtors_cache');
      return local ? JSON.parse(local) : [];
    }

    try {
      const { data, error } = await client
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
    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        const response = await fetch('/api/debtors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(debtors)
        });
        if (response.ok) {
          localStorage.setItem('kdb_debtors_cache', JSON.stringify(debtors));
          return;
        }
      } catch (e) {
        console.error("[DBService] Local API error:", e);
      }
      return;
    }

    try {
      const { error } = await client
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
    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        const response = await fetch('/api/staff');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('kdb_staff_cache', JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.error("[DBService] Local API error:", e);
      }
      const local = localStorage.getItem('kdb_staff_cache');
      return local ? JSON.parse(local) : { officialSignature: '' };
    }

    try {
      const { data, error } = await client
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
    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        const response = await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        if (response.ok) {
          localStorage.setItem('kdb_staff_cache', JSON.stringify(config));
          return;
        }
      } catch (e) {
        console.error("[DBService] Local API error:", e);
      }
      return;
    }

    try {
      const { error } = await client
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
