import { AgreementData, DebtorRecord, StaffConfig } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;
let supabasePromise: Promise<SupabaseClient | null> | null = null;
let isFetchingConfig = false;
let configPromise: Promise<any> | null = null;

const fetchConfig = async () => {
  if (configPromise) return configPromise;
  isFetchingConfig = true;
  configPromise = (async () => {
    try {
      console.log("[DBService] Fetching config from /api/config...");
      const response = await fetch('/api/config');
      if (response.ok) {
        try {
          const config = await response.json();
          (window as any)._env_ = config;
          console.log("[DBService] Config loaded successfully from server:", {
            hasUrl: !!config.VITE_SUPABASE_URL,
            hasKey: !!config.VITE_SUPABASE_ANON_KEY
          });
          return config;
        } catch (jsonErr) {
          console.error("[DBService] Failed to parse config JSON:", jsonErr);
          throw jsonErr;
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
  if (supabasePromise) return supabasePromise;

  supabasePromise = (async () => {
    let env = (window as any)._env_;
    
    if (!env) {
      env = await fetchConfig() || {};
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';

    if (supabaseUrl && supabaseKey) {
      try {
        const client = createClient(supabaseUrl, supabaseKey);
        supabase = client;
        console.log("[DBService] Supabase client initialized successfully (Singleton)");
        return supabase;
      } catch (e) {
        console.error("[DBService] Supabase init error:", e);
      }
    } else {
      console.warn("[DBService] Supabase credentials missing. URL:", !!supabaseUrl, "Key:", !!supabaseKey);
    }
    supabasePromise = null; // Reset if failed so we can try again
    return null;
  })();
  
  return supabasePromise;
};

// Helper to map JS camelCase to DB lowercase
const toDb = (obj: any) => {
  const out: any = {};
  for (const k in obj) {
    out[k.toLowerCase()] = obj[k];
  }
  return out;
};

// Helper to map DB lowercase back to JS camelCase (for compatibility with existing UI)
const fromDb = (obj: any, template: any) => {
  if (!obj) return obj;
  const out: any = { ...obj };
  // If the template has camelCase keys, map the lowercase DB keys back to them
  for (const k in template) {
    const lowerK = k.toLowerCase();
    if (obj[lowerK] !== undefined && k !== lowerK) {
      out[k] = obj[lowerK];
    }
  }
  return out;
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
        .order('submittedat', { ascending: false });
      
      if (error) throw error;
      
      // Map back to camelCase for the UI
      const agreements = (data || []).map(a => fromDb(a, {
        id: '', status: '', date: '', clientEmail: '', poBox: '', code: '',
        clientSignature: '', officialSignature: '', officialName: '',
        rejectionReason: '', resubmissionReason: '', clientName: '',
        clientTitle: '', submittedAt: '', approvedAt: '', dboName: '',
        premiseName: '', permitNo: '', location: '', county: '',
        totalArrears: 0, totalArrearsWords: '', arrearsPeriod: '',
        debitNoteNo: '', tel: '', arrearsBreakdown: null, installments: []
      })) as AgreementData[];
      
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
      console.log("[DBService] Attempting Supabase upsert to 'agreements' table...", { id: agreement.id });
      const dbAgreement = toDb(agreement);
      const { error } = await client
        .from('agreements')
        .upsert(dbAgreement);
      
      if (error) {
        console.error("[DBService] Supabase upsert error:", error);
        if (error.code === '42P01') {
          throw new Error("Supabase Error: The 'agreements' table does not exist. Please run the SQL setup in the Admin Dashboard Settings.");
        }
        if (error.code === 'PGRST204') {
          throw new Error(`Supabase Error: Column mismatch. Please ensure your 'agreements' table has all required columns (including clientemail, pobox, etc.) in lowercase. Error: ${error.message}`);
        }
        throw new Error(`Supabase Error: ${error.message} (Code: ${error.code}, Hint: ${error.hint || 'None'})`);
      }
      
      console.log("[DBService] Agreement saved to Supabase successfully");
      
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
      console.log("[DBService] Attempting Supabase update to 'agreements' table...", { id, updates });
      const dbUpdates = toDb(updates);
      const { error } = await client
        .from('agreements')
        .update(dbUpdates)
        .eq('id', id);
      
      if (error) {
        console.error("[DBService] Supabase update error:", error);
        throw new Error(`Supabase Error: ${error.message} (Code: ${error.code}, Hint: ${error.hint || 'None'})`);
      }
      
      console.log("[DBService] Agreement updated in Supabase successfully");
      
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
        .order('dboname', { ascending: true });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const debtors = data.map(d => fromDb(d, {
          id: '', dboName: '', premiseName: '', permitNo: '', location: '',
          county: '', totalArrears: 0, totalArrearsWords: '', arrearsPeriod: '',
          debitNoteNo: '', tel: '', arrearsBreakdown: null, installments: []
        })) as DebtorRecord[];
        localStorage.setItem('kdb_debtors_cache', JSON.stringify(debtors));
        return debtors;
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
      const dbDebtors = debtors.map(d => toDb(d));
      const { error } = await client
        .from('debtors')
        .upsert(dbDebtors);
      
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
        const config = fromDb(data, { officialSignature: '', officialName: '', officialTitle: '' }) as StaffConfig;
        localStorage.setItem('kdb_staff_cache', JSON.stringify(config));
        return config;
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
      const dbConfig = toDb(config);
      const { error } = await client
        .from('staff_config')
        .upsert({ id: 1, ...dbConfig });
      
      if (error) throw error;
      localStorage.setItem('kdb_staff_cache', JSON.stringify(config));
    } catch (error) {
      console.error("[DBService] saveStaffConfig error:", error);
      throw error;
    }
  }
};
