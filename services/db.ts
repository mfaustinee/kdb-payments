import { AgreementData, DebtorRecord, StaffConfig } from '../types.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const API_BASE = '/api';

// Helper to safely fetch JSON
async function fetchJSON(url: string, options?: RequestInit) {
  // Ensure we are using a relative path if it starts with the current origin
  let targetUrl = url;
  if (typeof window !== 'undefined' && url.startsWith(window.location.origin)) {
    targetUrl = url.replace(window.location.origin, '');
  }

  const response = await fetch(targetUrl, options);
  const contentType = response.headers.get("content-type");
  
  if (!response.ok) {
    let errorDetail = '';
    try {
      const data = await response.json();
      errorDetail = data.error || data.message || '';
    } catch (e) {
      errorDetail = await response.text();
    }
    throw new Error(`Server Error (${response.status}): ${errorDetail.substring(0, 100)}`);
  }
  
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    console.error("[DBService] Expected JSON but got:", text.substring(0, 200));
    throw new Error(`Invalid Response: Expected JSON but received ${contentType || 'unknown content'}. This often happens if the server is restarting or the API route is incorrect.`);
  }
  
  return response.json();
}

// Initialize Supabase client if environment variables are present
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
let isSupabaseConnected = false;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    isSupabaseConnected = true;
  } catch (e) {
    console.error("[DBService] Supabase init error:", e);
  }
}

export const DBService = {
  isCloudEnabled(): boolean {
    return isSupabaseConnected && !!supabase;
  },

  async getAgreements(): Promise<AgreementData[]> {
    let agreements: AgreementData[] = [];
    const isCloud = this.isCloudEnabled();

    // 1. Try Cloud FIRST (Source of truth)
    if (isCloud) {
      try {
        const { data, error } = await supabase!
          .from('agreements')
          .select('*')
          .order('submittedAt', { ascending: false });
        
        if (!error && data && data.length > 0) {
          agreements = data as AgreementData[];
          // Sync to local in background
          this.syncAgreementsToLocal(agreements).catch(e => console.error("[DBService] Background sync failed:", e));
          localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
          return agreements;
        }
      } catch (error) {
        console.error("[DBService] Cloud fetch error:", error);
      }
    }

    // 2. Fallback to Local API
    try {
      const data = await fetchJSON(`${API_BASE}/agreements?t=${Date.now()}`);
      agreements = data;
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
    } catch (error) {
      console.error("[DBService] Local fetch error:", error);
      const local = localStorage.getItem('kdb_agreements_fallback');
      if (local) agreements = JSON.parse(local);
    }

    return agreements;
  },

  async syncAgreementsToLocal(agreements: AgreementData[]): Promise<void> {
    try {
      await fetch(`${API_BASE}/agreements/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agreements)
      });
    } catch (e) {}
  },

  async saveAgreement(agreement: AgreementData): Promise<void> {
    // 1. Local Save FIRST (Blocking for UI feedback)
    try {
      await fetchJSON(`${API_BASE}/agreements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agreement)
      });
    } catch (error) {
      console.error("[DBService] Local save failed:", error);
      // Try with trailing slash fallback
      try {
        await fetchJSON(`${API_BASE}/agreements/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agreement)
        });
      } catch (e2) {
        console.error("[DBService] Local save fallback failed:", e2);
      }
    }

    // 2. Cloud Sync (NON-BLOCKING background task)
    if (this.isCloudEnabled()) {
      console.log("[DBService] Attempting background Cloud sync for:", agreement.id);
      supabase!.from('agreements').upsert(agreement).then(({ error }) => {
        if (error) {
          console.error("[DBService] Background Cloud sync error:", error.message, error.details, error.hint);
          // If it's a permission error, it's likely RLS
          if (error.code === '42501') {
            console.error("[DBService] SECURITY ERROR: Row Level Security (RLS) is likely blocking this insert. Please check your Supabase policies.");
          }
        } else {
          console.log("[DBService] Background Cloud sync successful for:", agreement.id);
        }
      });
    }

    // Update local fallback
    const local = localStorage.getItem('kdb_agreements_fallback');
    let agreements = local ? JSON.parse(local) : [];
    const index = agreements.findIndex((a: any) => a.id === agreement.id);
    if (index !== -1) agreements[index] = agreement;
    else agreements.push(agreement);
    localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
  },

  async updateAgreement(id: string, updates: Partial<AgreementData>): Promise<void> {
    // 1. Local Update FIRST
    try {
      await fetchJSON(`${API_BASE}/agreements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error("[DBService] Local update failed:", error);
      // Try POST fallback
      try {
        await fetchJSON(`${API_BASE}/agreements/${id}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      } catch (e2) {}
    }

    // 2. Cloud Update (NON-BLOCKING)
    if (this.isCloudEnabled()) {
      supabase!.from('agreements').update(updates).eq('id', id).then(({ error }) => {
        if (error) console.error("[DBService] Background Cloud update error:", error);
      });
    }

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
  },

  async deleteAgreement(id: string): Promise<void> {
    // Local Delete
    await fetch(`${API_BASE}/agreements/${id}`, { method: 'DELETE' });
    
    // Cloud Delete (Background)
    if (supabase) {
      supabase.from('agreements').delete().eq('id', id).then(({ error }) => {
        if (error) console.error("[DBService] Cloud delete error:", error);
      });
    }

    const local = localStorage.getItem('kdb_agreements_fallback');
    if (local) {
      let agreements = JSON.parse(local);
      agreements = agreements.filter((a: any) => a.id !== id);
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
    }
  },

  async forceSync(): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    
    console.log("[DBService] Starting Force Sync...");
    
    // 1. Pull from Cloud (Source of Truth)
    const { data: cloudAgreements } = await supabase.from('agreements').select('*');
    const { data: cloudDebtors } = await supabase.from('debtors').select('*');
    
    // 2. Sync Cloud -> Local
    if (cloudAgreements) {
      await this.syncAgreementsToLocal(cloudAgreements);
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(cloudAgreements));
    }
    
    if (cloudDebtors) {
      await this.saveDebtors(cloudDebtors);
      localStorage.setItem('kdb_debtors_fallback', JSON.stringify(cloudDebtors));
    }

    console.log("[DBService] Force Sync Complete");
  },

  async syncLocalToCloud(): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    
    console.log("[DBService] Pushing local data to Cloud...");
    
    // Get local data with cache busting
    const timestamp = Date.now();
    
    try {
      // 1. Verify API is reachable
      console.log("[DBService] Verifying API health...");
      await fetchJSON(`${API_BASE}/health?t=${timestamp}`);
      
      // 2. Fetch local data
      console.log("[DBService] Fetching local agreements...");
      const agreements = await fetchJSON(`${API_BASE}/agreements?t=${timestamp}`);
      
      console.log("[DBService] Fetching local debtors...");
      const debtors = await fetchJSON(`${API_BASE}/debtors?t=${timestamp}`);
      
      // 3. Push to Cloud
      if (agreements && agreements.length > 0) {
        console.log(`[DBService] Pushing ${agreements.length} agreements to Supabase...`);
        const { error } = await supabase.from('agreements').upsert(agreements);
        if (error) throw error;
      }
      
      if (debtors && debtors.length > 0) {
        console.log(`[DBService] Pushing ${debtors.length} debtors to Supabase...`);
        const { error } = await supabase.from('debtors').upsert(debtors);
        if (error) throw error;
      }
      
      console.log("[DBService] Local -> Cloud Push Complete");
    } catch (error: any) {
      console.error("[DBService] Push failed:", error);
      throw error;
    }
  },

  // Removed Realtime Subscriptions as per user request for performance

  async getDebtors(): Promise<DebtorRecord[]> {
    let debtors: DebtorRecord[] = [];
    const isCloud = this.isCloudEnabled();

    if (isCloud) {
      try {
        const { data, error } = await supabase!.from('debtors').select('*').order('dboName', { ascending: true });
        if (!error && data && data.length > 0) {
          debtors = data as DebtorRecord[];
          this.saveDebtors(debtors).catch(() => {});
          localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
          return debtors;
        }
      } catch (error) {}
    }

    try {
      const response = await fetch(`${API_BASE}/debtors`);
      if (response.ok) {
        debtors = await response.json();
        localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
      } else {
        const local = localStorage.getItem('kdb_debtors_fallback');
        if (local) debtors = JSON.parse(local);
      }
    } catch (error) {
      const local = localStorage.getItem('kdb_debtors_fallback');
      if (local) debtors = JSON.parse(local);
    }

    return debtors;
  },

  async saveDebtors(debtors: DebtorRecord[]): Promise<void> {
    await fetch(`${API_BASE}/debtors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debtors)
    });
    if (supabase) {
      await supabase.from('debtors').upsert(debtors);
    }
    localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
  },

  async getStaffConfig(): Promise<StaffConfig> {
    if (supabase) {
      const { data } = await supabase.from('staff_config').select('*').single();
      if (data) return data as StaffConfig;
    }
    try {
      const response = await fetch(`${API_BASE}/staff`);
      if (response.ok) return await response.json();
    } catch (error) {}
    return { officialSignature: '' };
  },

  async saveStaffConfig(config: StaffConfig): Promise<void> {
    if (supabase) {
      await supabase.from('staff_config').upsert({ id: 1, ...config });
    }
    await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  }
};
