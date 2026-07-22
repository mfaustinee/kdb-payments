import { AgreementData, DebtorRecord, StaffConfig, ClosureNotificationData, LicensedClient, ClientReturn, DataValidation, ComplaintData, InquiryData } from '../types';
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
        if ((window as any).__supabaseInstance) {
          supabase = (window as any).__supabaseInstance;
        } else {
          const client = createClient(supabaseUrl, supabaseKey);
          supabase = client;
          (window as any).__supabaseInstance = client;
        }
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

// Custom translators for LicensedClient to reconcile differences between live database columns and frontend types
const clientToDb = (client: any) => {
  if (!client) return client;
  const out = toDb(client);
  
  if (client.premiseName !== undefined) {
    out.premises = client.premiseName;
    delete out.premisename;
  }
  if (client.permitNumber !== undefined) {
    out.permit_number = client.permitNumber;
    delete out.permitnumber;
  }
  if (client.premiseCategory !== undefined) {
    out.category = client.premiseCategory;
    delete out.premisecategory;
  }
  if (client.contactPerson !== undefined) {
    out.contacts = client.contactPerson;
    delete out.contactperson;
  }
  if (client.expiryDate !== undefined) {
    out.expiry_date = client.expiryDate;
    delete out.expirydate;
  }
  return out;
};

const clientFromDb = (dbObj: any): LicensedClient => {
  if (!dbObj) return dbObj;
  const out: any = { ...dbObj };
  
  if (dbObj.clientname !== undefined) out.clientName = dbObj.clientname;
  if (dbObj.premises !== undefined) out.premiseName = dbObj.premises;
  if (dbObj.startyear !== undefined) out.startYear = Number(dbObj.startyear);
  if (dbObj.startmonth !== undefined) out.startMonth = dbObj.startmonth;
  if (dbObj.endyear !== undefined) out.endYear = dbObj.endyear ? Number(dbObj.endyear) : null;
  if (dbObj.endmonth !== undefined) out.endMonth = dbObj.endmonth;
  if (dbObj.tel !== undefined) out.tel = dbObj.tel;
  if (dbObj.contacts !== undefined) out.contactPerson = dbObj.contacts;
  if (dbObj.location !== undefined) out.location = dbObj.location;
  if (dbObj.category !== undefined) out.premiseCategory = dbObj.category;
  if (dbObj.county !== undefined) out.county = dbObj.county;
  if (dbObj.coolingcapacity !== undefined) out.coolingCapacity = dbObj.coolingcapacity ? Number(dbObj.coolingcapacity) : undefined;
  if (dbObj.permitstatus !== undefined) out.permitStatus = dbObj.permitstatus;
  if (dbObj.operationalstatus !== undefined) out.operationalStatus = dbObj.operationalstatus;
  if (dbObj.levyinfo !== undefined) out.levyInfo = dbObj.levyinfo;
  if (dbObj.expiry_date !== undefined) out.expiryDate = dbObj.expiry_date;
  if (dbObj.permit_number !== undefined) out.permitNumber = dbObj.permit_number;
  
  if (dbObj.branches !== undefined) {
    if (typeof dbObj.branches === 'string') {
      try {
        out.branches = JSON.parse(dbObj.branches);
      } catch {
        out.branches = [];
      }
    } else {
      out.branches = dbObj.branches || [];
    }
  }
  return out as LicensedClient;
};

const safeJson = async (response: Response): Promise<any> => {
  try {
    const text = await response.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text);
  } catch (e: any) {
    console.error("[DBService] safeJson failed:", e);
    return null;
  }
};

const safeParseError = async (response: Response, defaultMessage: string): Promise<string> => {
  try {
    const text = await response.text();
    if (!text || text.trim() === '') return defaultMessage;
    try {
      const parsed = JSON.parse(text);
      return parsed.error || parsed.message || defaultMessage;
    } catch {
      if (text.includes("<!DOCTYPE") || text.includes("<html") || text.includes("<head")) {
        return defaultMessage;
      }
      return text || defaultMessage;
    }
  } catch (e: any) {
    return `${defaultMessage} (${e.message})`;
  }
};

const updateLocalStorageCollection = <T extends Record<string, any>>(key: string, item: T, idField: string = 'id') => {
  try {
    const raw = localStorage.getItem(key);
    let items: T[] = raw ? JSON.parse(raw) : [];
    const itemId = item[idField] || item.id || item.referenceNumber;
    const idx = items.findIndex(i => (i[idField] || i.id || i.referenceNumber) === itemId);
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...item };
    } else {
      items.unshift(item);
    }
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error(`[DBService] Error updating localStorage collection ${key}:`, e);
  }
};

const removeFromLocalStorageCollection = <T extends Record<string, any>>(key: string, id: string, idField: string = 'id') => {
  try {
    const raw = localStorage.getItem(key);
    let items: T[] = raw ? JSON.parse(raw) : [];
    items = items.filter(i => (i[idField] || i.id || i.referenceNumber) !== id);
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error(`[DBService] Error removing from localStorage collection ${key}:`, e);
  }
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
      console.log("[DBService] Saving agreement to local API / storage...");
      try {
        const response = await fetch('/api/agreements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(agreement)
        });
        if (response.ok) {
          const current = await this.getAgreements();
          localStorage.setItem('kdb_agreements_cache', JSON.stringify(current));
          return;
        }
      } catch (e) {
        console.warn("[DBService] Local API saveAgreement error:", e);
      }
      updateLocalStorageCollection('kdb_agreements_cache', agreement);
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
      console.log("[DBService] Updating agreement via local API / storage...");
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
      } catch (e) {
        console.warn("[DBService] Local API updateAgreement error:", e);
      }
      const raw = localStorage.getItem('kdb_agreements_cache');
      let items: AgreementData[] = raw ? JSON.parse(raw) : [];
      const idx = items.findIndex(i => i.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...updates };
        localStorage.setItem('kdb_agreements_cache', JSON.stringify(items));
      }
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
      console.log("[DBService] Saving closure to local API / storage...");
      try {
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
      } catch (e) {
        console.warn("[DBService] Local API saveClosure fetch error:", e);
      }
      updateLocalStorageCollection('kdb_closures_cache', formattedClosure);
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
      console.log("[DBService] Updating closure via local API / storage...");
      try {
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
      } catch (e) {
        console.warn("[DBService] Local API updateClosure fetch error:", e);
      }
      const raw = localStorage.getItem('kdb_closures_cache');
      let items: ClosureNotificationData[] = raw ? JSON.parse(raw) : [];
      const idx = items.findIndex(i => i.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...updatesCopy };
        localStorage.setItem('kdb_closures_cache', JSON.stringify(items));
      }
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

  async getComplaints(): Promise<ComplaintData[]> {
    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API for complaints");
      try {
        const response = await fetch('/api/complaints');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('kdb_complaints_cache', JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.error("[DBService] Local API error:", e);
      }
      const local = localStorage.getItem('kdb_complaints_cache');
      return local ? JSON.parse(local) : [];
    }

    try {
      const { data, error } = await client
        .from('complaints')
        .select('*')
        .order('submittedat', { ascending: false });
      
      if (error) {
        console.warn("[DBService] Supabase getComplaints failed, falling back to local API. Error:", error);
        throw error;
      }
      
      const complaints = (data || []).map(b => fromDb(b, {
        id: '', status: '', submittedAt: '', dateReceived: '', receivedBy: '',
        clientName: '', idNumber: '', stakeholderCategory: '', otherStakeholderCategory: '',
        postalAddress: '', tel: '', email: '', county: '',
        natureOfComplaint: '', otherNatureOfComplaint: '', location: '',
        incidentDate: '', complaintDescription: '', attachments: [], otherAttachment: '',
        numAttachments: 0, desiredResolution: '', declarationAgreed: false,
        clientSignature: '', clientNameDeclaration: '', complaintCategoryCode: '',
        assignedTo: '', investigationFindings: '', actionTaken: '', officialStatus: '',
        dateClosed: '', officialSignature: '', officialName: '', officialTitle: '',
        officialComments: '', rejectionReason: '',
        complainantName: '', complainantCategory: '', telephone: '', complaintDetails: '',
        actionDate: '', dateReplied: '', referenceNumber: ''
      })) as ComplaintData[];
      
      localStorage.setItem('kdb_complaints_cache', JSON.stringify(complaints));
      return complaints;
    } catch (error) {
      console.warn("[DBService] Supabase getComplaints exception, trying local API. Error:", error);
      try {
        const response = await fetch('/api/complaints');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('kdb_complaints_cache', JSON.stringify(data));
          return data;
        }
      } catch (localErr) {
        console.error("[DBService] Local API fallback error during getComplaints:", localErr);
      }
      const local = localStorage.getItem('kdb_complaints_cache');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveComplaint(complaint: ComplaintData): Promise<void> {
    const populatedComplaint = {
      ...complaint,
      complainantName: complaint.complainantName || complaint.clientName,
      complainantCategory: complaint.complainantCategory || complaint.stakeholderCategory,
      telephone: complaint.telephone || complaint.tel,
      complaintDetails: complaint.complaintDetails || complaint.complaintDescription,
      referenceNumber: complaint.referenceNumber || complaint.id,
      actionDate: complaint.actionDate || (complaint.dateClosed ? complaint.dateClosed : undefined)
    };

    const saveLocal = async () => {
      console.log("[DBService] Saving complaint to local API / storage...");
      try {
        const response = await fetch('/api/complaints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(populatedComplaint)
        });
        if (response.ok) {
          const data = await safeJson(response);
          if (Array.isArray(data)) {
            localStorage.setItem('kdb_complaints_cache', JSON.stringify(data));
            return;
          }
        }
      } catch (e) {
        console.warn("[DBService] Local API saveComplaint fetch error:", e);
      }
      updateLocalStorageCollection('kdb_complaints_cache', populatedComplaint, 'id');
    };

    const client = await getSupabase();
    if (!client) {
      await saveLocal();
      return;
    }

    try {
      const dbComplaint = toDb(populatedComplaint);
      const { error } = await client
        .from('complaints')
        .upsert(dbComplaint);
      
      if (error) {
        console.warn("[DBService] Supabase upsert complaint failed, falling back to local API. Error:", error);
        await saveLocal();
        return;
      }
      
      const current = await this.getComplaints();
      localStorage.setItem('kdb_complaints_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase saveComplaint exception, falling back to local API. Error:", error);
      await saveLocal();
    }
  },

  async updateComplaint(id: string, updates: Partial<ComplaintData>): Promise<void> {
    const populatedUpdates = {
      ...updates,
    };
    if (updates.clientName) populatedUpdates.complainantName = updates.clientName;
    if (updates.stakeholderCategory) populatedUpdates.complainantCategory = updates.stakeholderCategory;
    if (updates.tel) populatedUpdates.telephone = updates.tel;
    if (updates.complaintDescription) populatedUpdates.complaintDetails = updates.complaintDescription;
    if (updates.id) populatedUpdates.referenceNumber = updates.id;

    const updateLocal = async () => {
      console.log("[DBService] Updating complaint via local API / storage...");
      try {
        const response = await fetch(`/api/complaints/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(populatedUpdates)
        });
        if (response.ok) {
          const current = await this.getComplaints();
          localStorage.setItem('kdb_complaints_cache', JSON.stringify(current));
          return;
        }
      } catch (e) {
        console.warn("[DBService] Local API updateComplaint fetch error:", e);
      }
      const raw = localStorage.getItem('kdb_complaints_cache');
      let items: ComplaintData[] = raw ? JSON.parse(raw) : [];
      const idx = items.findIndex(i => i.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...populatedUpdates };
        localStorage.setItem('kdb_complaints_cache', JSON.stringify(items));
      }
    };

    const client = await getSupabase();
    if (!client) {
      await updateLocal();
      return;
    }

    try {
      const dbUpdates = toDb(populatedUpdates);
      const { error } = await client
        .from('complaints')
        .update(dbUpdates)
        .eq('id', id);
      
      if (error) {
        console.warn("[DBService] Supabase updateComplaint failed, falling back to local API. Error:", error);
        await updateLocal();
        return;
      }
      
      const current = await this.getComplaints();
      localStorage.setItem('kdb_complaints_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase updateComplaint exception, falling back to local API. Error:", error);
      await updateLocal();
    }
  },

  async deleteComplaint(id: string): Promise<void> {
    const deleteLocal = async () => {
      const response = await fetch(`/api/complaints/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const current = await this.getComplaints();
        localStorage.setItem('kdb_complaints_cache', JSON.stringify(current));
        return;
      }
      throw new Error("Failed to delete via local API");
    };

    const client = await getSupabase();
    if (!client) {
      await deleteLocal();
      return;
    }

    try {
      const { error } = await client
        .from('complaints')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.warn("[DBService] Supabase deleteComplaint failed, falling back to local API. Error:", error);
        await deleteLocal();
        return;
      }
      
      const current = await this.getComplaints();
      localStorage.setItem('kdb_complaints_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase deleteComplaint exception, falling back to local API. Error:", error);
      await deleteLocal();
    }
  },

  async getInquiries(): Promise<InquiryData[]> {
    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API for inquiries");
      try {
        const response = await fetch('/api/inquiries');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('kdb_inquiries_cache', JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.error("[DBService] Local API error:", e);
      }
      const local = localStorage.getItem('kdb_inquiries_cache');
      return local ? JSON.parse(local) : [];
    }

    try {
      const { data, error } = await client
        .from('inquiries')
        .select('*')
        .order('submittedat', { ascending: false });
      
      if (error) {
        console.warn("[DBService] Supabase getInquiries failed, falling back to local API. Error:", error);
        throw error;
      }
      
      const inquiries = (data || []).map(b => fromDb(b, {
        id: '', status: '', submittedAt: '',
        clientName: '', contactPerson: '', idPassportNo: '', kdbLicenseNo: '',
        postalAddress: '', cityTown: '', tel: '', mobileNumber: '', email: '',
        clientType: '', otherClientType: '', natureOfInquiry: '', otherNatureOfInquiry: '',
        inquiryDetails: '', supportingDocsStatus: '', attachedDocsList: '',
        preferredResponseMode: '', declarationAgreed: false, clientSignature: '',
        receivedBy: '', dateReceived: '', departmentAssigned: '', actionTaken: '',
        dateClosed: '', officialSignature: '', officialName: '', officialTitle: '',
        officialComments: '', rejectionReason: '',
        county: '', clientCategory: '', telephone: '', location: '', message: '',
        referredTo: '', actionDate: '', responseDetails: '', dateReplied: '', referenceNumber: ''
      })) as InquiryData[];
      
      localStorage.setItem('kdb_inquiries_cache', JSON.stringify(inquiries));
      return inquiries;
    } catch (error) {
      console.warn("[DBService] Supabase getInquiries exception, trying local API. Error:", error);
      try {
        const response = await fetch('/api/inquiries');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('kdb_inquiries_cache', JSON.stringify(data));
          return data;
        }
      } catch (localErr) {
        console.error("[DBService] Local API fallback error during getInquiries:", localErr);
      }
      const local = localStorage.getItem('kdb_inquiries_cache');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveInquiry(inquiry: InquiryData): Promise<void> {
    const populatedInquiry = {
      ...inquiry,
      telephone: inquiry.telephone || inquiry.tel || inquiry.mobileNumber,
      clientCategory: inquiry.clientCategory || inquiry.clientType,
      location: inquiry.location || inquiry.cityTown,
      referenceNumber: inquiry.referenceNumber || inquiry.id,
      county: inquiry.county || inquiry.cityTown
    };

    const saveLocal = async () => {
      console.log("[DBService] Saving inquiry to local API / storage...");
      try {
        const response = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(populatedInquiry)
        });
        if (response.ok) {
          const data = await safeJson(response);
          if (Array.isArray(data)) {
            localStorage.setItem('kdb_inquiries_cache', JSON.stringify(data));
            return;
          }
        }
      } catch (e) {
        console.warn("[DBService] Local API saveInquiry fetch error:", e);
      }
      updateLocalStorageCollection('kdb_inquiries_cache', populatedInquiry, 'id');
    };

    const client = await getSupabase();
    if (!client) {
      await saveLocal();
      return;
    }

    try {
      const dbInquiry = toDb(populatedInquiry);
      const { error } = await client
        .from('inquiries')
        .upsert(dbInquiry);
      
      if (error) {
        console.warn("[DBService] Supabase upsert inquiry failed, falling back to local API. Error:", error);
        await saveLocal();
        return;
      }
      
      const current = await this.getInquiries();
      localStorage.setItem('kdb_inquiries_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase saveInquiry exception, falling back to local API. Error:", error);
      await saveLocal();
    }
  },

  async updateInquiry(id: string, updates: Partial<InquiryData>): Promise<void> {
    const populatedUpdates = {
      ...updates,
    };
    if (updates.tel || updates.mobileNumber) populatedUpdates.telephone = updates.tel || updates.mobileNumber;
    if (updates.clientType) populatedUpdates.clientCategory = updates.clientType;
    if (updates.cityTown) {
      populatedUpdates.location = updates.cityTown;
      populatedUpdates.county = updates.cityTown;
    }
    if (updates.id) populatedUpdates.referenceNumber = updates.id;

    const updateLocal = async () => {
      console.log("[DBService] Updating inquiry via local API / storage...");
      try {
        const response = await fetch(`/api/inquiries/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(populatedUpdates)
        });
        if (response.ok) {
          const current = await this.getInquiries();
          localStorage.setItem('kdb_inquiries_cache', JSON.stringify(current));
          return;
        }
      } catch (e) {
        console.warn("[DBService] Local API updateInquiry fetch error:", e);
      }
      const raw = localStorage.getItem('kdb_inquiries_cache');
      let items: InquiryData[] = raw ? JSON.parse(raw) : [];
      const idx = items.findIndex(i => (i.id || i.referenceNumber) === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...populatedUpdates };
        localStorage.setItem('kdb_inquiries_cache', JSON.stringify(items));
      }
    };

    const client = await getSupabase();
    if (!client) {
      await updateLocal();
      return;
    }

    try {
      const dbUpdates = toDb(populatedUpdates);
      const { error } = await client
        .from('inquiries')
        .update(dbUpdates)
        .eq('id', id);
      
      if (error) {
        console.warn("[DBService] Supabase updateInquiry failed, falling back to local API. Error:", error);
        await updateLocal();
        return;
      }
      
      const current = await this.getInquiries();
      localStorage.setItem('kdb_inquiries_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase updateInquiry exception, falling back to local API. Error:", error);
      await updateLocal();
    }
  },

  async deleteInquiry(id: string): Promise<void> {
    const deleteLocal = async () => {
      const response = await fetch(`/api/inquiries/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const current = await this.getInquiries();
        localStorage.setItem('kdb_inquiries_cache', JSON.stringify(current));
        return;
      }
      throw new Error("Failed to delete via local API");
    };

    const client = await getSupabase();
    if (!client) {
      await deleteLocal();
      return;
    }

    try {
      const { error } = await client
        .from('inquiries')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.warn("[DBService] Supabase deleteInquiry failed, falling back to local API. Error:", error);
        await deleteLocal();
        return;
      }
      
      const current = await this.getInquiries();
      localStorage.setItem('kdb_inquiries_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase deleteInquiry exception, falling back to local API. Error:", error);
      await deleteLocal();
    }
  },

  async getDebtors(): Promise<DebtorRecord[]> {
    const cached = localStorage.getItem('kdb_debtors_cache');

    const fetchLocal = async () => {
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
    };

    const revalidate = async () => {
      try {
        const client = await getSupabase();
        if (client) {
          const { data, error } = await client
            .from('debtors')
            .select('*')
            .order('dboname', { ascending: true });
          if (!error && data) {
            const debtors = data.map(d => fromDb(d, {
              id: '', dboName: '', premiseName: '', permitNo: '', location: '',
              county: '', totalArrears: 0, totalArrearsWords: '', arrearsPeriod: '',
              debitNoteNo: '', tel: '', arrearsBreakdown: null, installments: []
            })) as DebtorRecord[];
            localStorage.setItem('kdb_debtors_cache', JSON.stringify(debtors));
          }
        } else {
          await fetchLocal();
        }
      } catch (e) {
        console.warn("[DBService] Background revalidation of debtors failed:", e);
      }
    };

    if (cached) {
      setTimeout(revalidate, 50);
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fall through
      }
    }

    const client = await getSupabase();
    if (!client) {
      return await fetchLocal();
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
  },

  async getClients(): Promise<LicensedClient[]> {
    const cached = localStorage.getItem('kdb_clients_cache');
    
    const revalidate = async () => {
      try {
        const client = await getSupabase();
        if (client) {
          const { data, error } = await client
            .from('licensed_clients')
            .select('*')
            .order('clientname', { ascending: true });
          if (!error && data) {
            const clients = data.map(c => clientFromDb(c));
            localStorage.setItem('kdb_clients_cache', JSON.stringify(clients));
          }
        } else {
          const response = await fetch('/api/clients');
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('kdb_clients_cache', JSON.stringify(data));
          }
        }
      } catch (e) {
        console.warn("[DBService] Background clients sync failed:", e);
      }
    };

    if (cached) {
      setTimeout(revalidate, 50);
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fall through
      }
    }

    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      try {
        const response = await fetch('/api/clients');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('kdb_clients_cache', JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.error("[DBService] Local API error:", e);
      }
      const local = localStorage.getItem('kdb_clients_cache');
      return local ? JSON.parse(local) : [];
    }

    try {
      const { data, error } = await client
        .from('licensed_clients')
        .select('*')
        .order('clientname', { ascending: true });
      
      if (error) {
        console.warn("[DBService] Supabase getClients failed, falling back to local API. Error:", error);
        throw error;
      }
      
      const clients = (data || []).map(c => clientFromDb(c));
      
      localStorage.setItem('kdb_clients_cache', JSON.stringify(clients));
      return clients;
    } catch (error) {
      console.warn("[DBService] Supabase getClients exception, trying local API. Error:", error);
      try {
        const response = await fetch('/api/clients');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('kdb_clients_cache', JSON.stringify(data));
          return data;
        }
      } catch (localErr) {
        console.error("[DBService] Local API fallback error during getClients:", localErr);
      }
      const local = localStorage.getItem('kdb_clients_cache');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveClient(clientRecord: LicensedClient): Promise<void> {
    const saveLocal = async () => {
      console.log("[DBService] Saving client to local API / storage...");
      try {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientRecord)
        });
        if (response.ok) {
          const data = await safeJson(response);
          if (Array.isArray(data)) {
            localStorage.setItem('kdb_clients_cache', JSON.stringify(data));
            return;
          }
        }
      } catch (e) {
        console.warn("[DBService] Local API saveClient fetch error:", e);
      }
      updateLocalStorageCollection('kdb_clients_cache', clientRecord, 'id');
    };

    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      await saveLocal();
      return;
    }

    try {
      console.log("[DBService] Attempting Supabase upsert to 'licensed_clients' table...", { id: clientRecord.id });
      const dbClient = clientToDb(clientRecord);
      const { error } = await client
        .from('licensed_clients')
        .upsert(dbClient);
      
      if (error) {
        console.warn("[DBService] Supabase client upsert failed, falling back to local API. Error details:", error);
        await saveLocal();
        return;
      }
      
      const current = await this.getClients();
      localStorage.setItem('kdb_clients_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase saveClient exception, falling back to local API. Error:", error);
      await saveLocal();
    }
  },

  async deleteClient(id: string): Promise<void> {
    const deleteLocal = async () => {
      console.log("[DBService] Deleting client via local API / storage...");
      try {
        const response = await fetch(`/api/clients/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          const current = await this.getClients();
          localStorage.setItem('kdb_clients_cache', JSON.stringify(current));
          return;
        }
      } catch (e) {
        console.warn("[DBService] Local API deleteClient error:", e);
      }
      removeFromLocalStorageCollection('kdb_clients_cache', id, 'id');
    };

    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, deleting from local storage");
      await deleteLocal();
      return;
    }

    try {
      const { error } = await client
        .from('licensed_clients')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.warn("[DBService] Supabase deleteClient failed, falling back to local storage. Error details:", error);
        await deleteLocal();
        return;
      }
      
      const current = await this.getClients();
      localStorage.setItem('kdb_clients_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase deleteClient exception, falling back to local storage. Error:", error);
      await deleteLocal();
    }
  },

  async saveClientsBulk(clientsList: LicensedClient[]): Promise<void> {
    const saveLocal = async () => {
      console.log("[DBService] Saving clients bulk to local API / storage...");
      const currentClients = await this.getClients();
      
      const merged = [...currentClients];
      clientsList.forEach(newC => {
        const idx = merged.findIndex(c => c.id === newC.id);
        if (idx !== -1) {
          merged[idx] = newC;
        } else {
          merged.push(newC);
        }
      });

      try {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
        if (response.ok) {
          localStorage.setItem('kdb_clients_cache', JSON.stringify(merged));
          return;
        }
      } catch (e) {
        console.warn("[DBService] Local API saveClientsBulk error:", e);
      }
      localStorage.setItem('kdb_clients_cache', JSON.stringify(merged));
    };

    const client = await getSupabase();
    if (!client) {
      console.warn("[DBService] Supabase not initialized, trying local API");
      await saveLocal();
      return;
    }

    try {
      console.log("[DBService] Attempting Supabase bulk upsert...", clientsList.length);
      const dbClients = clientsList.map(c => clientToDb(c));
      const { error } = await client
        .from('licensed_clients')
        .upsert(dbClients);
      
      if (error) {
        console.warn("[DBService] Supabase bulk upsert failed, falling back to local API. Error:", error);
        await saveLocal();
        return;
      }
      
      const current = await this.getClients();
      localStorage.setItem('kdb_clients_cache', JSON.stringify(current));
    } catch (error: any) {
      console.warn("[DBService] Supabase bulk upsert exception, falling back to local API. Error:", error);
      await saveLocal();
    }
  },

  async getReturns(): Promise<ClientReturn[]> {
    const cached = localStorage.getItem('kdb_returns_cache');

    const template: ClientReturn = {
      id: '',
      clientId: '',
      clientName: '',
      year: 2026,
      period: '',
      qty: 0,
      invoiceAmount: 0,
      returnDate: '',
      paymentAmount: 0,
      paymentDate: '',
      txnRef: '',
      lessCF: 0,
      outstandingBalance: 0,
      agingDays: 0,
      paymentStatus: 'Unpaid',
      comments: ''
    };

    const fetchLocal = async () => {
      const response = await fetch('/api/returns');
      if (response.ok) {
        const data = await response.json();
        return data as ClientReturn[];
      }
      return [];
    };

    const revalidate = async () => {
      try {
        const client = await getSupabase();
        if (client) {
          const { data, error } = await client.from('client_returns').select('*');
          if (!error && data) {
            const mapped = data.map(r => fromDb(r, template));
            localStorage.setItem('kdb_returns_cache', JSON.stringify(mapped));
          }
        } else {
          const local = await fetchLocal();
          localStorage.setItem('kdb_returns_cache', JSON.stringify(local));
        }
      } catch (e) {
        console.warn("[DBService] Background revalidation of returns failed:", e);
      }
    };

    if (cached) {
      setTimeout(revalidate, 50);
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fall through
      }
    }

    const client = await getSupabase();
    if (!client) {
      const local = await fetchLocal();
      localStorage.setItem('kdb_returns_cache', JSON.stringify(local));
      return local;
    }

    try {
      const { data, error } = await client
        .from('client_returns')
        .select('*');
      
      if (error) {
        console.warn("[DBService] Supabase getReturns failed, falling back to local. Error:", error);
        return await fetchLocal();
      }

      const mapped = (data || []).map(r => fromDb(r, template));
      localStorage.setItem('kdb_returns_cache', JSON.stringify(mapped));
      return mapped;
    } catch (e) {
      console.warn("[DBService] Supabase getReturns exception, falling back to local. Error:", e);
      return await fetchLocal();
    }
  },

  async saveReturn(clientReturn: ClientReturn): Promise<void> {
    const saveLocal = async () => {
      try {
        const response = await fetch('/api/returns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientReturn)
        });
        if (response.ok) return;
      } catch (e) {
        console.warn("[DBService] Local API saveReturn error:", e);
      }
      updateLocalStorageCollection('kdb_returns_cache', clientReturn, 'id');
    };

    const client = await getSupabase();
    if (!client) {
      await saveLocal();
      return;
    }

    try {
      const dbObj = toDb(clientReturn);
      const { error } = await client
        .from('client_returns')
        .upsert(dbObj);

      if (error) {
        console.warn("[DBService] Supabase saveReturn failed, falling back to local.", error);
        await saveLocal();
        return;
      }
    } catch (e) {
      console.warn("[DBService] Supabase saveReturn exception, falling back to local.", e);
      await saveLocal();
    }
  },

  async deleteReturn(id: string): Promise<void> {
    const deleteLocal = async () => {
      try {
        const response = await fetch(`/api/returns/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) return;
      } catch (e) {
        console.warn("[DBService] Local API deleteReturn error:", e);
      }
      removeFromLocalStorageCollection('kdb_returns_cache', id, 'id');
    };

    const client = await getSupabase();
    if (!client) {
      await deleteLocal();
      return;
    }

    try {
      const { error } = await client
        .from('client_returns')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn("[DBService] Supabase deleteReturn failed, falling back to local.", error);
        await deleteLocal();
        return;
      }
    } catch (e) {
      console.warn("[DBService] Supabase deleteReturn exception, falling back to local.", e);
      await deleteLocal();
    }
  },

  async saveReturnsBulk(returnsList: ClientReturn[]): Promise<void> {
    const saveLocal = async () => {
      const current = await this.getReturns();
      const merged = [...current];
      returnsList.forEach(newR => {
        const idx = merged.findIndex(r => r.id === newR.id);
        if (idx !== -1) {
          merged[idx] = newR;
        } else {
          merged.push(newR);
        }
      });

      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });
      if (!response.ok) {
        const errMessage = await safeParseError(response, "Failed to save returns bulk");
        throw new Error(errMessage);
      }
    };

    const client = await getSupabase();
    if (!client) {
      await saveLocal();
      return;
    }

    try {
      const dbObjs = returnsList.map(r => toDb(r));
      const { error } = await client
        .from('client_returns')
        .upsert(dbObjs);

      if (error) {
        console.warn("[DBService] Supabase saveReturnsBulk failed, falling back to local.", error);
        await saveLocal();
        return;
      }
    } catch (e) {
      console.warn("[DBService] Supabase saveReturnsBulk exception, falling back to local.", e);
      await saveLocal();
    }
  },

  async getValidations(): Promise<DataValidation[]> {
    const cached = localStorage.getItem('kdb_validations_cache');

    const template: DataValidation = {
      id: '',
      clientId: '',
      clientName: '',
      premiseName: '',
      permitNo: '',
      location: '',
      category: '',
      contacts: '',
      expiryDate: '',
      year: 2026,
      period: '',
      quantityDeclared: '',
      unitPrice: 0,
      totalSales: 0,
      validatorName: '',
      validatedAt: '',
      status: 'Approved',
      remarks: ''
    };

    const fetchLocal = async () => {
      try {
        const response = await fetch('/api/validations');
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('kdb_validations_cache', JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.error("[DBService] Local validations API error:", e);
      }
      const local = localStorage.getItem('kdb_validations_cache');
      return local ? JSON.parse(local) : [];
    };

    const revalidate = async () => {
      try {
        const client = await getSupabase();
        if (client) {
          const [res1, res2] = await Promise.allSettled([
            client.from('data_validations').select('*'),
            client.from('kdb_validations').select('*')
          ]);

          const list1: any[] = res1.status === 'fulfilled' && !res1.value.error ? (res1.value.data || []) : [];
          const list2: any[] = res2.status === 'fulfilled' && !res2.value.error ? (res2.value.data || []) : [];

          const mapped1 = list1.map(r => fromDb(r, template));
          const mapped2 = list2.map(r => {
            let year = 2026;
            let period = r.validation_period || '';
            
            if (r.validation_period) {
              const parts = r.validation_period.split(' ');
              if (parts.length >= 2) {
                period = parts[0];
                year = Number(parts[1]) || 2026;
              }
            } else if (r.date) {
              const d = new Date(r.date);
              if (!isNaN(d.getTime())) {
                period = d.toLocaleString('default', { month: 'long' });
                year = d.getFullYear();
              }
            }

            const raw = r.raw_data || {};
            const qDeclared = raw.sales?.[0]?.qtyDeclared || '';
            const bPrice = parseFloat(raw.sales?.[0]?.buyingPrice) || 0;
            const total = raw.sales?.reduce((sum: number, s: any) => sum + (parseFloat(s.qtyDeclared) || 0) * (parseFloat(s.buyingPrice) || 0), 0) || 0;

            return {
              id: r.id || `${r.permit_no || ''}-${r.validation_period || ''}`,
              clientId: r.permit_no || '',
              clientName: r.dbo_name || '',
              premiseName: r.premise_name || '',
              permitNo: r.permit_no || '',
              location: r.location || '',
              category: r.category || '',
              contacts: r.contacts || raw.contacts || '',
              expiryDate: raw.expiryDate || '',
              year,
              period,
              quantityDeclared: qDeclared,
              unitPrice: bPrice,
              totalSales: total,
              validatorName: raw.complianceOfficer || '',
              validatedAt: r.date || '',
              status: 'Approved' as const,
              remarks: raw.comments || ''
            };
          });

          const combined = [...mapped1];
          mapped2.forEach(m => {
            const exists = combined.some(c => 
              c.id === m.id || 
              (c.permitNo === m.permitNo && c.period.toLowerCase() === m.period.toLowerCase() && Number(c.year) === m.year)
            );
            if (!exists) {
              combined.push(m);
            }
          });

          localStorage.setItem('kdb_validations_cache', JSON.stringify(combined));
        } else {
          await fetchLocal();
        }
      } catch (e) {
        console.warn("[DBService] Background validations sync failed:", e);
      }
    };

    if (cached) {
      setTimeout(revalidate, 50);
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fall through
      }
    }

    const client = await getSupabase();
    if (!client) {
      return await fetchLocal();
    }

    try {
      const [res1, res2] = await Promise.allSettled([
        client.from('data_validations').select('*'),
        client.from('kdb_validations').select('*')
      ]);

      const list1: any[] = res1.status === 'fulfilled' && !res1.value.error ? (res1.value.data || []) : [];
      const list2: any[] = res2.status === 'fulfilled' && !res2.value.error ? (res2.value.data || []) : [];

      const mapped1 = list1.map(r => fromDb(r, template));

      const mapped2 = list2.map(r => {
        let year = 2026;
        let period = r.validation_period || '';
        
        if (r.validation_period) {
          const parts = r.validation_period.split(' ');
          if (parts.length >= 2) {
            period = parts[0];
            year = Number(parts[1]) || 2026;
          }
        } else if (r.date) {
          const d = new Date(r.date);
          if (!isNaN(d.getTime())) {
            period = d.toLocaleString('default', { month: 'long' });
            year = d.getFullYear();
          }
        }

        const raw = r.raw_data || {};
        const qDeclared = raw.sales?.[0]?.qtyDeclared || '';
        const bPrice = parseFloat(raw.sales?.[0]?.buyingPrice) || 0;
        const total = raw.sales?.reduce((sum: number, s: any) => sum + (parseFloat(s.qtyDeclared) || 0) * (parseFloat(s.buyingPrice) || 0), 0) || 0;

        return {
          id: r.id || `${r.permit_no || ''}-${r.validation_period || ''}`,
          clientId: r.permit_no || '',
          clientName: r.dbo_name || '',
          premiseName: r.premise_name || '',
          permitNo: r.permit_no || '',
          location: r.location || '',
          category: r.category || '',
          contacts: r.contacts || raw.contacts || '',
          expiryDate: raw.expiryDate || '',
          year,
          period,
          quantityDeclared: qDeclared,
          unitPrice: bPrice,
          totalSales: total,
          validatorName: raw.complianceOfficer || '',
          validatedAt: r.date || '',
          status: 'Approved' as const,
          remarks: raw.comments || ''
        };
      });

      const combined = [...mapped1];
      mapped2.forEach(m => {
        const exists = combined.some(c => 
          c.id === m.id || 
          (c.permitNo === m.permitNo && c.period.toLowerCase() === m.period.toLowerCase() && Number(c.year) === m.year)
        );
        if (!exists) {
          combined.push(m);
        }
      });

      localStorage.setItem('kdb_validations_cache', JSON.stringify(combined));
      return combined;
    } catch (e) {
      console.warn("[DBService] Supabase getValidations exception, falling back to local. Error:", e);
      return await fetchLocal();
    }
  },

  async saveValidation(validation: DataValidation): Promise<void> {
    const saveLocal = async () => {
      try {
        const response = await fetch('/api/validations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validation)
        });
        if (response.ok) return;
      } catch (e) {
        console.warn("[DBService] Local API saveValidation error:", e);
      }
      updateLocalStorageCollection('kdb_validations_cache', validation, 'id');
    };

    // Update local validations cache immediately to prevent layout shifts or stale loads
    const currentCache = localStorage.getItem('kdb_validations_cache');
    if (currentCache) {
      try {
        const list = JSON.parse(currentCache) as DataValidation[];
        const index = list.findIndex(v => v.id === validation.id);
        if (index > -1) list[index] = validation;
        else list.push(validation);
        localStorage.setItem('kdb_validations_cache', JSON.stringify(list));
      } catch (e) {
        console.error("[DBService] Error writing to validation cache", e);
      }
    }

    const client = await getSupabase();
    if (!client) {
      await saveLocal();
      return;
    }

    try {
      const dbObj = toDb(validation);
      const { error } = await client
        .from('data_validations')
        .upsert(dbObj);

      if (error) {
        console.warn("[DBService] Supabase saveValidation failed, falling back to local.", error);
        await saveLocal();
        return;
      }
    } catch (e) {
      console.warn("[DBService] Supabase saveValidation exception, falling back to local.", e);
      await saveLocal();
    }
  },

  async deleteValidation(id: string): Promise<void> {
    const deleteLocal = async () => {
      try {
        const response = await fetch(`/api/validations/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) return;
      } catch (e) {
        console.warn("[DBService] Local API deleteValidation error:", e);
      }
      removeFromLocalStorageCollection('kdb_validations_cache', id, 'id');
    };

    const client = await getSupabase();
    if (!client) {
      await deleteLocal();
      return;
    }

    try {
      const { error } = await client
        .from('data_validations')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn("[DBService] Supabase deleteValidation failed, falling back to local.", error);
        await deleteLocal();
        return;
      }
    } catch (e) {
      console.warn("[DBService] Supabase deleteValidation exception, falling back to local.", e);
      await deleteLocal();
    }
  },

  async saveValidationsBulk(validationsList: DataValidation[]): Promise<void> {
    const saveLocal = async () => {
      const current = await this.getValidations();
      const merged = [...current];
      validationsList.forEach(newV => {
        const idx = merged.findIndex(v => v.id === newV.id);
        if (idx !== -1) {
          merged[idx] = newV;
        } else {
          merged.push(newV);
        }
      });

      const response = await fetch('/api/validations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });
      if (!response.ok) {
        const errMessage = await safeParseError(response, "Failed to save validations bulk");
        throw new Error(errMessage);
      }
    };

    const client = await getSupabase();
    if (!client) {
      await saveLocal();
      return;
    }

    try {
      const dbObjs = validationsList.map(v => toDb(v));
      const { error } = await client
        .from('data_validations')
        .upsert(dbObjs);

      if (error) {
        console.warn("[DBService] Supabase saveValidationsBulk failed, falling back to local.", error);
        await saveLocal();
        return;
      }
    } catch (e) {
      console.warn("[DBService] Supabase saveValidationsBulk exception, falling back to local.", e);
      await saveLocal();
    }
  }
};
