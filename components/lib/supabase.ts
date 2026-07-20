import { createClient } from '@supabase/supabase-js';

let supabaseInstance: any = null;

const getSupabaseInstance = () => {
  if (supabaseInstance) return supabaseInstance;

  const env = (window as any)._env_ || {};
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
      console.error("[Supabase Proxy] Init error:", e);
    }
  }
  return supabaseInstance;
};

export const supabase = new Proxy({}, {
  get(target, prop) {
    const instance = getSupabaseInstance();
    if (!instance) {
      // If supabase is not yet configured, return a dummy function/object to prevent crashing
      return (...args: any[]) => {
        const nextInstance = getSupabaseInstance();
        if (nextInstance && typeof nextInstance[prop] === 'function') {
          return nextInstance[prop](...args);
        }
        return {
          from: () => ({
            select: () => ({
              ilike: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [], error: null })
                })
              }),
              or: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [], error: null })
                })
              })
            })
          }),
          storage: {
            from: () => ({
              upload: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
              createSignedUrl: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
            })
          }
        };
      };
    }
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
}) as any;
