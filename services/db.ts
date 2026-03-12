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
      const response = await fetch(`${API_BASE}/agreements?t=${Date.now()}`);
      if (response.ok) {
        agreements = await response.json();
        localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
      } else {
        const local = localStorage.getItem('kdb_agreements_fallback');
        if (local) agreements = JSON.parse(local);
      }
    } catch (error) {
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
      const response = await fetch(`${API_BASE}/agreements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agreement)
      });
      
      if (!response.ok && response.status === 405) {
        await fetch(`${API_BASE}/agreements/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agreement)
        });
      }
    } catch (error) {
      console.error("[DBService] Local save failed:", error);
      // We continue to cloud sync even if local fails (e.g. server down)
    }

    // 2. Cloud Sync (NON-BLOCKING background task)
    if (this.isCloudEnabled()) {
      supabase!.from('agreements').insert(agreement).then(({ error }) => {
        if (error && error.code !== '23505') {
          console.error("[DBService] Background Cloud sync error:", error);
        } else {
          console.log("[DBService] Background Cloud sync successful");
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
      const response = await fetch(`${API_BASE}/agreements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (response.status === 405) {
        await fetch(`${API_BASE}/agreements/${id}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      }
    } catch (error) {
      console.error("[DBService] Local update failed:", error);
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
    
    // Get local data
    const agreementsRes = await fetch(`${API_BASE}/agreements`);
    const debtorsRes = await fetch(`${API_BASE}/debtors`);
    
    if (agreementsRes.ok) {
      const agreements = await agreementsRes.json();
      if (agreements.length > 0) {
        await supabase.from('agreements').upsert(agreements);
      }
    }
    
    if (debtorsRes.ok) {
      const debtors = await debtorsRes.json();
      if (debtors.length > 0) {
        await supabase.from('debtors').upsert(debtors);
      }
    }
    
    console.log("[DBService] Local -> Cloud Push Complete");
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
