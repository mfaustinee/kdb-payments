import { AgreementData, DebtorRecord, StaffConfig, ClosureNotificationData } from '../types';
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
      
      if (error) {
        console.warn("[DBService] Supabase getAgreements failed, falling back to local API. Error:", error);
        throw error;
      }
      
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
      console.warn("[DBService] Supabase getAgreements exception, trying local API fallback. Error:", error);
      try {
        const response = await fetch('/api/agreements');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('kdb_agreements_cache', JSON.stringify(data));
          return data;
        }
      } catch (localErr) {
        console.error("[DBService] Local API fallback error during getAgreements:", localErr);
      }
      const local = localStorage.getItem('kdb_agreements_cache');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveAgreement(agreement: AgreementData): Promise<void> {
    const saveLocal = async () => {
      console.log("[DBService] Saving agreement to local API...");
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
    };

    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        await saveLocal();
        return;
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
        console.warn("[DBService] Supabase agreement upsert failed, falling back to local API. Error details:", error);
        await saveLocal();
        return;
      }
      
      console.log("[DBService] Agreement saved to Supabase successfully");
      const current = await this.getAgreements();
      localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase saveAgreement exception, falling back to local API. Error:", error);
      try {
        await saveLocal();
      } catch (localErr: any) {
        console.error("[DBService] Both Supabase and Local API failed for saveAgreement:", localErr);
        throw new Error(`Submission failed. Supabase Error: ${error.message}. Local API Error: ${localErr.message}`);
      }
    }
  },

  async updateAgreement(id: string, updates: Partial<AgreementData>): Promise<void> {
    const updateLocal = async () => {
      console.log("[DBService] Updating agreement via local API...");
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
      const errData = await response.json();
      throw new Error(errData.error || "Failed to update via local API");
    };

    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        await updateLocal();
        return;
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
        console.warn("[DBService] Supabase updateAgreement failed, falling back to local API. Error details:", error);
        await updateLocal();
        return;
      }
      
      console.log("[DBService] Agreement updated in Supabase successfully");
      const current = await this.getAgreements();
      localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase updateAgreement exception, falling back to local API. Error:", error);
      try {
        await updateLocal();
      } catch (localErr: any) {
        console.error("[DBService] Both Supabase and Local API failed for updateAgreement:", localErr);
        throw new Error(`Update failed. Supabase Error: ${error.message}. Local API Error: ${localErr.message}`);
      }
    }
  },

  async deleteAgreement(id: string): Promise<void> {
    const deleteLocal = async () => {
      console.log("[DBService] Deleting agreement via local API...");
      const response = await fetch(`/api/agreements/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const current = await this.getAgreements();
        localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
        return;
      }
      throw new Error("Failed to delete via local API");
    };

    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        await deleteLocal();
        return;
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
        console.warn("[DBService] Supabase deleteAgreement failed, falling back to local API. Error details:", error);
        await deleteLocal();
        return;
      }
      
      // Update local cache
      const current = await this.getAgreements();
      localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase deleteAgreement exception, falling back to local API. Error:", error);
      try {
        await deleteLocal();
      } catch (localErr: any) {
        console.error("[DBService] Both Supabase and Local API failed for deleteAgreement:", localErr);
        throw error;
      }
    }
  },

  async getClosures(): Promise<ClosureNotificationData[]> {
    const client = await getSupabase();
    
    // Helper to decode clientTitle out of clientName dynamically
    // and officialTitle / officialComments out of officialName dynamically
    const decodeClosures = (list: any[]) => {
      return list.map(c => {
        let name = c.clientName || '';
        let title = c.clientTitle || '';
        if (name.includes(' |Title:')) {
          const parts = name.split(' |Title:');
          name = parts[0];
          title = parts[1];
        }

        let offName = c.officialName || '';
        let offTitle = c.officialTitle || '';
        let offComments = c.officialComments || '';
        
        if (offName.includes(' |Title:')) {
          const partsTitle = offName.split(' |Title:');
          offName = partsTitle[0];
          const remaining = partsTitle[1];
          if (remaining.includes(' |Comments:')) {
            const partsComments = remaining.split(' |Comments:');
            offTitle = partsComments[0];
            offComments = partsComments[1];
          } else {
            offTitle = remaining;
          }
        } else if (offName.includes(' |Comments:')) {
          const partsComments = offName.split(' |Comments:');
          offName = partsComments[0];
          offComments = partsComments[1];
        }

        return {
          ...c,
          clientName: name,
          clientTitle: title,
          officialName: offName,
          officialTitle: offTitle,
          officialComments: offComments
        };
      });
    };

    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API for closures");
      try {
        const response = await fetch('/api/closures');
        if (response.ok) {
          const data = await response.json();
          const decoded = decodeClosures(data);
          localStorage.setItem('kdb_closures_cache', JSON.stringify(decoded));
          return decoded;
        }
      } catch (e) {
        console.error("[DBService] Local API error:", e);
      }
      
      const local = localStorage.getItem('kdb_closures_cache');
      return local ? decodeClosures(JSON.parse(local)) : [];
    }

    try {
      const { data, error } = await client
        .from('closures')
        .select('*')
        .order('submittedat', { ascending: false });
      
      if (error) {
        console.warn("[DBService] Supabase getClosures failed, falling back to local API. Error details:", error);
        throw error;
      }
      
      const closures = (data || []).map(b => fromDb(b, {
        id: '', status: '', submittedAt: '', approvedAt: '', dboName: '',
        permitNo: '', premiseName: '', permitType: '', county: '',
        subCounty: '', location: '', tel: '', closureDate: '',
        closureReason: '', permitStatusIntent: '', declarationAgreed: false,
        clientSignature: '', clientName: '', clientTitle: '', officialSignature: '',
        officialName: '', officialTitle: '', officialComments: '', rejectionReason: ''
      })) as ClosureNotificationData[];
      
      const decoded = decodeClosures(closures);
      localStorage.setItem('kdb_closures_cache', JSON.stringify(decoded));
      return decoded;
    } catch (error) {
      console.warn("[DBService] Supabase getClosures exception, trying local API. Error:", error);
      try {
        const response = await fetch('/api/closures');
        if (response.ok) {
          const data = await response.json();
          const decoded = decodeClosures(data);
          localStorage.setItem('kdb_closures_cache', JSON.stringify(decoded));
          return decoded;
        }
      } catch (localErr) {
        console.error("[DBService] Local API fallback error during getClosures:", localErr);
      }
      const local = localStorage.getItem('kdb_closures_cache');
      return local ? decodeClosures(JSON.parse(local)) : [];
    }
  },

  async saveClosure(closure: ClosureNotificationData): Promise<void> {
    const formattedClosure = {
      ...closure,
      clientName: closure.clientTitle ? `${closure.clientName} |Title:${closure.clientTitle}` : closure.clientName
    };

    const saveLocal = async () => {
      console.log("[DBService] Saving closure to local API...");
      const response = await fetch('/api/closures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedClosure)
      });
      if (response.ok) {
        const current = await this.getClosures();
        localStorage.setItem('kdb_closures_cache', JSON.stringify(current));
        return;
      }
      const errData = await response.json();
      throw new Error(errData.error || "Failed to save to local API");
    };

    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API for save closure");
      try {
        await saveLocal();
        return;
      } catch (e: any) {
        console.error("[DBService] Local API save error:", e);
        throw e;
      }
    }

    try {
      console.log("[DBService] Attempting Supabase upsert to 'closures' table...", { id: closure.id });
      const dbClosure = toDb(formattedClosure);
      // Remove unneeded column properties that don't exist in Supabase to prevent Postgrest 42703 error
      delete dbClosure.clienttitle;
      delete dbClosure.officialtitle;
      delete dbClosure.officialcomments;

      const { error } = await client
        .from('closures')
        .upsert(dbClosure);
      
      if (error) {
        console.warn("[DBService] Supabase upsert failed, falling back to local API. Error details:", error);
        await saveLocal();
        return;
      }
      
      const current = await this.getClosures();
      localStorage.setItem('kdb_closures_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase saveClosure exception, falling back to local API. Error:", error);
      try {
        await saveLocal();
      } catch (localErr: any) {
        console.error("[DBService] Both Supabase and Local API failed for saveClosure:", localErr);
        throw new Error(`Submission failed. Supabase Error: ${error.message}. Local API Error: ${localErr.message}`);
      }
    }
  },

  async updateClosure(id: string, updates: Partial<ClosureNotificationData>): Promise<void> {
    const updatesCopy = { ...updates };
    if (updatesCopy.clientName && updatesCopy.clientTitle) {
      updatesCopy.clientName = `${updatesCopy.clientName} |Title:${updatesCopy.clientTitle}`;
    }

    if (updatesCopy.officialName) {
      let name = updatesCopy.officialName;
      if (updatesCopy.officialTitle) {
        name = `${name} |Title:${updatesCopy.officialTitle}`;
      }
      if (updatesCopy.officialComments) {
        name = `${name} |Comments:${updatesCopy.officialComments}`;
      }
      updatesCopy.officialName = name;
    }

    const updateLocal = async () => {
      console.log("[DBService] Updating closure via local API...");
      const response = await fetch(`/api/closures/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatesCopy)
      });
      if (response.ok) {
        const current = await this.getClosures();
        localStorage.setItem('kdb_closures_cache', JSON.stringify(current));
        return;
      }
      const errData = await response.json();
      throw new Error(errData.error || "Failed to update via local API");
    };

    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API for update closure");
      try {
        await updateLocal();
        return;
      } catch (e: any) {
        console.error("[DBService] Local API update error:", e);
        throw e;
      }
    }

    try {
      console.log("[DBService] Attempting Supabase update to 'closures' table...", { id, updates: updatesCopy });
      const dbUpdates = toDb(updatesCopy);
      // Remove untyped column properties that don't exist in Supabase to prevent Postgrest 42703 error
      delete dbUpdates.clienttitle;
      delete dbUpdates.officialtitle;
      delete dbUpdates.officialcomments;

      const { error } = await client
        .from('closures')
        .update(dbUpdates)
        .eq('id', id);
      
      if (error) {
        console.warn("[DBService] Supabase updateClosure failed, falling back to local API. Error details:", error);
        await updateLocal();
        return;
      }
      
      const current = await this.getClosures();
      localStorage.setItem('kdb_closures_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase updateClosure exception, falling back to local API. Error:", error);
      try {
        await updateLocal();
      } catch (localErr: any) {
        console.error("[DBService] Both Supabase and Local API failed for updateClosure:", localErr);
        throw new Error(`Update failed. Supabase Error: ${error.message}. Local API Error: ${localErr.message}`);
      }
    }
  },

  async deleteClosure(id: string): Promise<void> {
    const deleteLocal = async () => {
      console.log("[DBService] Deleting closure via local API...");
      const response = await fetch(`/api/closures/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const current = await this.getClosures();
        localStorage.setItem('kdb_closures_cache', JSON.stringify(current));
        return;
      }
      throw new Error("Failed to delete via local API");
    };

    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API for delete closure");
      try {
        await deleteLocal();
        return;
      } catch (e: any) {
        console.error("[DBService] Local API delete error:", e);
        throw e;
      }
    }

    try {
      const { error } = await client
        .from('closures')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.warn("[DBService] Supabase deleteClosure failed, falling back to local API. Error details:", error);
        await deleteLocal();
        return;
      }
      
      const current = await this.getClosures();
      localStorage.setItem('kdb_closures_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase deleteClosure exception, falling back to local API. Error:", error);
      try {
        await deleteLocal();
      } catch (localErr: any) {
        console.error("[DBService] Both Supabase and Local API failed for deleteClosure:", localErr);
        throw error;
      }
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
