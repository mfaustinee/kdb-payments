import { AgreementData, DebtorRecord, StaffConfig } from '../types.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const API_BASE = '/api';

// Initialize Supabase client if environment variables are present
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
let isSupabaseConnected = false;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[DBService] Supabase initialized");
    isSupabaseConnected = true;
  } catch (e) {
    console.error("[DBService] Failed to initialize Supabase:", e);
  }
}

export const DBService = {
  isCloudEnabled(): boolean {
    return isSupabaseConnected && !!supabase;
  },

  async getAgreements(): Promise<AgreementData[]> {
    let agreements: AgreementData[] = [];
    const isCloud = this.isCloudEnabled();

    // 1. If Cloud is enabled, try Cloud FIRST (Source of truth)
    if (isCloud) {
      try {
        console.log("[DBService] Fetching agreements from Cloud...");
        const { data, error } = await supabase!
          .from('agreements')
          .select('*')
          .order('submittedAt', { ascending: false });
        
        if (error) {
          console.error("[DBService] Supabase getAgreements error:", error.message);
        } else if (data && data.length > 0) {
          agreements = data as AgreementData[];
          console.log(`[DBService] Synced ${agreements.length} agreements from Cloud`);
          // Update local cache and server in background
          this.syncAgreementsToLocal(agreements).catch(e => console.error("[DBService] Background sync to local failed:", e));
          localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
          return agreements; // Return early if cloud succeeded
        }
      } catch (error) {
        console.error("[DBService] Cloud sync error:", error);
      }
    }

    // 2. Fallback to Local API
    try {
      console.log("[DBService] Fetching agreements from Local API...");
      const response = await fetch(`${API_BASE}/agreements?t=${Date.now()}`);
      if (response.ok) {
        agreements = await response.json();
        localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
      } else {
        console.warn(`[DBService] Local API getAgreements returned ${response.status}`);
        const local = localStorage.getItem('kdb_agreements_fallback');
        if (local) agreements = JSON.parse(local);
      }
    } catch (error) {
      console.error("[DBService] Local API getAgreements network error:", error);
      const local = localStorage.getItem('kdb_agreements_fallback');
      if (local) agreements = JSON.parse(local);
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
    const isCloud = this.isCloudEnabled();
    let cloudSuccess = false;

    // 1. Try Cloud (Supabase) FIRST if enabled - this bypasses local 405 errors
    if (isCloud) {
      try {
        console.log("[DBService] Saving to cloud first...");
        const { error } = await supabase!.from('agreements').insert(agreement);
        
        if (error) {
          if (error.code === '23505') { // Unique violation
            console.warn("[DBService] Agreement already exists in cloud, treating as success");
            cloudSuccess = true;
          } else {
            console.error("[DBService] Supabase saveAgreement error:", error.message);
          }
        } else {
          console.log("[DBService] Cloud save successful");
          cloudSuccess = true;
        }
      } catch (e) {
        console.error("[DBService] Supabase save exception:", e);
      }
    }

    // 2. Local API (Now secondary/background if cloud succeeded)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      console.log(`[DBService] Attempting to save agreement ${agreement.id} locally...`);
      const response = await fetch(`${API_BASE}/agreements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agreement),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 405) {
          console.warn("[DBService] POST /api/agreements returned 405, retrying with trailing slash...");
          const retryResponse = await fetch(`${API_BASE}/agreements/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agreement)
          });
          if (!retryResponse.ok && !cloudSuccess) throw new Error(`Retry failed: ${retryResponse.status}`);
        } else if (!cloudSuccess) {
          throw new Error(`HTTP ${response.status}`);
        }
      }
      
      console.log("[DBService] Local save successful");
      
      // Update local fallback
      const local = localStorage.getItem('kdb_agreements_fallback');
      let agreements = local ? JSON.parse(local) : [];
      const index = agreements.findIndex((a: any) => a.id === agreement.id);
      if (index !== -1) agreements[index] = agreement;
      else agreements.push(agreement);
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("[DBService] Local API saveAgreement error:", error);
      
      // If cloud succeeded, we don't throw, we just log the local failure
      if (cloudSuccess) {
        console.warn("[DBService] Local save failed but Cloud succeeded. Continuing.");
      } else {
        if (error.name === 'AbortError') {
          throw new Error("Connection timed out. The server is taking too long to respond.");
        }
        throw new Error(`Save failed: ${error.message || "Connection error"}. Please check your internet.`);
      }
    }
  },

  async updateAgreement(id: string, updates: Partial<AgreementData>): Promise<void> {
    const isCloud = this.isCloudEnabled();
    let cloudSuccess = false;

    // 1. Try Cloud (Supabase) FIRST
    if (isCloud) {
      try {
        console.log("[DBService] Updating cloud first...");
        const { error } = await supabase!.from('agreements').update(updates).eq('id', id);
        if (error) {
          console.error("[DBService] Supabase updateAgreement error:", error.message);
        } else {
          console.log("[DBService] Cloud update successful");
          cloudSuccess = true;
        }
      } catch (e) {
        console.error("[DBService] Supabase update exception:", e);
      }
    }

    // 2. Local API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      console.log(`[DBService] Attempting to update agreement ${id} locally...`);
      const response = await fetch(`${API_BASE}/agreements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 405) {
        console.warn("[DBService] PATCH not allowed, trying POST fallback...");
        const fallbackResponse = await fetch(`${API_BASE}/agreements/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        
        if (fallbackResponse.status === 405) {
          console.warn("[DBService] POST /api/agreements/:id returned 405, retrying with trailing slash...");
          const slashResponse = await fetch(`${API_BASE}/agreements/${id}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          if (!slashResponse.ok && !cloudSuccess) throw new Error(`Slash retry failed: ${slashResponse.status}`);
        } else if (!fallbackResponse.ok && !cloudSuccess) {
          throw new Error(`Fallback POST failed: ${fallbackResponse.status}`);
        }
      } else if (!response.ok && !cloudSuccess) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      console.log("[DBService] Local update successful");
      
      // Update local fallback
      const local = localStorage.getItem('kdb_agreements_fallback');
      if (local) {
        let agreements = JSON.parse(local);
        const index = agreements.findIndex((a: any) => a.id === id);
        if (index !== -1) {
          agreements[index] = { ...agreements[index], ...updates };
          localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
        }
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("[DBService] Local API updateAgreement error:", error);
      
      if (cloudSuccess) {
        console.warn("[DBService] Local update failed but Cloud succeeded. Continuing.");
      } else {
        if (error.name === 'AbortError') {
          throw new Error("Connection timed out.");
        }
        throw new Error(`Update failed: ${error.message || "Connection error"}`);
      }
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
    const isCloud = this.isCloudEnabled();

    // 1. Try Cloud FIRST (Ultimate source of truth)
    if (isCloud) {
      try {
        console.log("[DBService] Fetching debtors from Cloud...");
        const { data, error } = await supabase!
          .from('debtors')
          .select('*')
          .order('dboName', { ascending: true });
        
        if (!error && data && data.length > 0) {
          debtors = data as DebtorRecord[];
          console.log(`[DBService] Synced ${debtors.length} debtors from Cloud`);
          // Sync back to local server in background
          this.saveDebtors(debtors).catch(e => console.error("[DBService] Background debtors sync failed:", e));
          localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
          return debtors;
        }
      } catch (error) {
        console.error("[DBService] Cloud getDebtors error:", error);
      }
    }

    // 2. Fallback to Local API
    try {
      console.log("[DBService] Fetching debtors from Local API...");
      const response = await fetch(`${API_BASE}/debtors?t=${Date.now()}`);
      if (response.ok) {
        debtors = await response.json();
        localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
      }
    } catch (error) {
      console.error("[DBService] Local API getDebtors error:", error);
      const local = localStorage.getItem('kdb_debtors_fallback');
      if (local) debtors = JSON.parse(local);
    }

    return debtors;
  },

  async saveDebtors(debtors: DebtorRecord[]): Promise<void> {
    console.log(`[DBService] Saving ${debtors.length} debtors locally...`);
    // 1. Local API first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${API_BASE}/debtors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtors),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // If 405, try with trailing slash
        if (response.status === 405) {
          console.warn("[DBService] POST /api/debtors returned 405, retrying with trailing slash...");
          const retryResponse = await fetch(`${API_BASE}/debtors/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(debtors)
          });
          if (!retryResponse.ok) throw new Error(`Retry failed: ${retryResponse.status}`);
        } else {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }
      }
      console.log("[DBService] Local API saveDebtors success");
      localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("[DBService] Local API saveDebtors error:", error);
      // Still save to localStorage even if API fails
      localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
      if (error.name === 'AbortError') {
        throw new Error("Connection timed out saving debtors.");
      }
    }

    // 2. Supabase background
    if (supabase) {
      console.log("[DBService] Syncing debtors to Supabase...");
      supabase.from('debtors').upsert(debtors).then(({ error }) => {
        if (error) console.error("[DBService] Supabase saveDebtors background error:", error);
        else console.log("[DBService] Supabase sync success");
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
      
      if (!response.ok) {
        if (response.status === 405) {
          console.warn("[DBService] POST /api/staff returned 405, retrying with trailing slash...");
          const retryResponse = await fetch(`${API_BASE}/staff/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          });
          if (!retryResponse.ok) throw new Error(`Retry failed: ${retryResponse.status}`);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      }
      
      localStorage.setItem('kdb_staff_fallback', JSON.stringify(config));
    } catch (error) {
      console.error("[DBService] Local API saveStaffConfig error:", error);
      localStorage.setItem('kdb_staff_fallback', JSON.stringify(config));
      throw error;
    }
  }
};

