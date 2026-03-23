import { AgreementData, DebtorRecord, StaffConfig } from '../types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const API_BASE = '/api';

// Helper to safely fetch JSON
async function fetchJSON(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type");
  const text = await response.text();
  
  if (!response.ok) {
    let errorDetail = text;
    try {
      const data = JSON.parse(text);
      errorDetail = data.error || data.message || text;
    } catch (e) {}
    throw new Error(`Server Error (${response.status}): ${errorDetail.substring(0, 100)}`);
  }
  
  if (!contentType || !contentType.includes("application/json")) {
    console.error("[DBService] Expected JSON but got:", text.substring(0, 200));
    throw new Error(`Invalid Response: Expected JSON but received ${contentType || 'unknown content'}. 
    This usually means the request hit a webpage instead of an API. 
    URL: ${url}
    Status: ${response.status}
    Body Preview: ${text.substring(0, 100)}...`);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON Parse Error: ${text.substring(0, 100)}`);
  }
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
    const isCloud = this.isCloudEnabled();

    // 1. Try Local API first (usually faster than Cloud)
    try {
      const localData = await fetchJSON(`${API_BASE}/agreements?t=${Date.now()}`);
      if (localData && localData.length > 0) {
        localStorage.setItem('kdb_agreements_fallback', JSON.stringify(localData));
        // Sync to cloud in background if needed
        return localData;
      }
    } catch (error) {
      console.warn("[DBService] Local fetch failed:", error);
    }

    // 2. If Local fails or is empty, try Cloud
    if (isCloud) {
      try {
        const { data, error } = await supabase!
          .from('agreements')
          .select('*')
          .order('submittedAt', { ascending: false });
        
        if (!error && data) {
          localStorage.setItem('kdb_agreements_fallback', JSON.stringify(data));
          return data as AgreementData[];
        }
      } catch (error) {
        console.error("[DBService] Cloud fetch error:", error);
      }
    }

    // 3. Final Fallback to localStorage
    const cached = localStorage.getItem('kdb_agreements_fallback');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }

    return [];
  },

  async syncAgreementsToLocal(agreements: AgreementData[]): Promise<void> {
    try {
      await fetchJSON(`${API_BASE}/agreements/sync`, {
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
    
    // Update local fallback cache immediately (Optimistic)
    const local = localStorage.getItem('kdb_agreements_fallback');
    let agreements = local ? JSON.parse(local) : [];
    const index = agreements.findIndex((a: any) => a.id === agreement.id);
    if (index !== -1) agreements[index] = agreement;
    else agreements.push(agreement);
    localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));

    // 1. Cloud Save (Non-blocking background task)
    if (isCloud) {
      (async () => {
        try {
          const { error } = await supabase!.from('agreements').upsert(agreement);
          if (error) console.error("[DBService] Background Cloud save failed:", error.message);
          else console.log("[DBService] Background Cloud save successful:", agreement.id);
        } catch (e) {
          console.error("[DBService] Background Cloud save error:", e);
        }
      })();
    }

    // 2. Local Save (Non-blocking background task)
    (async () => {
      try {
        await fetchJSON(`${API_BASE}/agreements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agreement)
        });
      } catch (error) {
        console.warn("[DBService] Local save failed (expected on Vercel):", error);
      }
    })();
  },

  async updateAgreement(id: string, updates: Partial<AgreementData>): Promise<void> {
    const isCloud = this.isCloudEnabled();

    // Update local fallback immediately
    const local = localStorage.getItem('kdb_agreements_fallback');
    if (local) {
      try {
        let agreements = JSON.parse(local);
        const index = agreements.findIndex((a: any) => a.id === id);
        if (index !== -1) {
          agreements[index] = { ...agreements[index], ...updates };
          localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
        }
      } catch (e) {}
    }

    // 1. Cloud Update (Background)
    if (isCloud) {
      (async () => {
        try {
          const { error } = await supabase!.from('agreements').update(updates).eq('id', id);
          if (error) console.error("[DBService] Background Cloud update failed:", error.message);
        } catch (e) {
          console.error("[DBService] Background Cloud update error:", e);
        }
      })();
    }

    // 2. Local Update (Background)
    (async () => {
      try {
        await fetchJSON(`${API_BASE}/agreements/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      } catch (error) {
        console.warn("[DBService] Local update failed:", error);
      }
    })();
  },

  async deleteAgreement(id: string): Promise<void> {
    const isCloud = this.isCloudEnabled();

    // 1. Cloud Delete First
    if (isCloud) {
      try {
        const { error } = await supabase!.from('agreements').delete().eq('id', id);
        if (error) throw error;
      } catch (error) {
        console.error("[DBService] Cloud delete failed:", error);
        throw error;
      }
    }

    // 2. Local Delete (Background)
    const localDeletePromise = (async () => {
      try {
        await fetchJSON(`${API_BASE}/agreements/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.warn("[DBService] Local delete failed (expected on Vercel):", error);
      }
    })();

    if (!isCloud) {
      await localDeletePromise;
    }

    const local = localStorage.getItem('kdb_agreements_fallback');
    if (local) {
      try {
        let agreements = JSON.parse(local);
        agreements = agreements.filter((a: any) => a.id !== id);
        localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
      } catch (e) {}
    }
  },

  async forceSync(): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    
    console.log("[DBService] Starting Optimized Force Sync...");
    
    // 1. Pull from Cloud in Parallel
    const [agreementsRes, debtorsRes] = await Promise.all([
      supabase.from('agreements').select('*'),
      supabase.from('debtors').select('*')
    ]);

    const cloudAgreements = agreementsRes.data;
    const cloudDebtors = debtorsRes.data;
    
    // 2. Sync Cloud -> Local in Parallel
    const syncTasks: Promise<any>[] = [];

    if (cloudAgreements) {
      syncTasks.push(
        this.syncAgreementsToLocal(cloudAgreements).then(() => {
          localStorage.setItem('kdb_agreements_fallback', JSON.stringify(cloudAgreements));
        })
      );
    }
    
    if (cloudDebtors) {
      syncTasks.push(
        this.syncDebtorsToLocal(cloudDebtors).then(() => {
          localStorage.setItem('kdb_debtors_fallback', JSON.stringify(cloudDebtors));
        })
      );
    }

    await Promise.all(syncTasks);

    console.log("[DBService] Force Sync Complete");
  },

  async syncDebtorsToLocal(debtors: DebtorRecord[]): Promise<void> {
    try {
      await fetchJSON(`${API_BASE}/debtors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtors)
      });
    } catch (error) {
      console.error("[DBService] Local debtors sync failed:", error);
    }
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
    const isCloud = this.isCloudEnabled();

    // 1. Try Local API first
    try {
      const localData = await fetchJSON(`${API_BASE}/debtors?t=${Date.now()}`);
      if (localData && localData.length > 0) {
        localStorage.setItem('kdb_debtors_fallback', JSON.stringify(localData));
        return localData;
      }
    } catch (error) {
      console.warn("[DBService] Local debtors fetch failed:", error);
    }

    // 2. Try Cloud
    if (isCloud) {
      try {
        const { data, error } = await supabase!
          .from('debtors')
          .select('*')
          .order('dboName', { ascending: true });
        
        if (!error && data) {
          localStorage.setItem('kdb_debtors_fallback', JSON.stringify(data));
          return data as DebtorRecord[];
        }
      } catch (error) {
        console.error("[DBService] Cloud debtors fetch error:", error);
      }
    }

    // 3. Fallback to localStorage
    const cached = localStorage.getItem('kdb_debtors_fallback');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }

    return [];
  },

  async saveDebtors(debtors: DebtorRecord[]): Promise<void> {
    try {
      await fetchJSON(`${API_BASE}/debtors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtors)
      });
    } catch (error) {
      console.error("[DBService] Local debtors save failed:", error);
    }
    
    if (supabase) {
      await supabase.from('debtors').upsert(debtors);
    }
    localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
  },

  async getStaffConfig(): Promise<StaffConfig> {
    const isCloud = this.isCloudEnabled();
    
    // 1. If Cloud is enabled, it's primary
    if (isCloud) {
      try {
        const { data } = await supabase!.from('staff_config').select('*').single();
        if (data) {
          localStorage.setItem('kdb_staff_fallback', JSON.stringify(data));
          // Sync to local in background
          fetchJSON(`${API_BASE}/staff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          }).catch(() => {});
          return data as StaffConfig;
        }
      } catch (error) {
        console.error("[DBService] Cloud staff fetch error:", error);
      }
    }

    // 2. Try Local API
    try {
      const localData = await fetchJSON(`${API_BASE}/staff?t=${Date.now()}`);
      if (localData) {
        localStorage.setItem('kdb_staff_fallback', JSON.stringify(localData));
        return localData;
      }
    } catch (error) {
      console.warn("[DBService] Local staff fetch failed (expected on Vercel):", error);
    }

    // 3. Fallback to localStorage
    const cached = localStorage.getItem('kdb_staff_fallback');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return { officialSignature: '' };
      }
    }

    return { officialSignature: '' };
  },

  async saveStaffConfig(config: StaffConfig): Promise<void> {
    const isCloud = this.isCloudEnabled();

    // 1. Cloud Save First
    if (isCloud) {
      try {
        await supabase!.from('staff_config').upsert({ id: 1, ...config });
      } catch (error) {
        console.error("[DBService] Cloud staff save failed:", error);
        throw error;
      }
    }

    // 2. Local Save (Background)
    const localSavePromise = (async () => {
      try {
        await fetchJSON(`${API_BASE}/staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
      } catch (error) {
        console.warn("[DBService] Local staff save failed (expected on Vercel):", error);
      }
    })();

    if (!isCloud) {
      await localSavePromise;
    }

    localStorage.setItem('kdb_staff_fallback', JSON.stringify(config));
  }
};
