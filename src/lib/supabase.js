import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('SEU-PROJETO'));

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'gwen.auth' },
    })
  : null;

/** Lança o erro do Supabase com mensagem legível, ou devolve os dados */
export function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}
