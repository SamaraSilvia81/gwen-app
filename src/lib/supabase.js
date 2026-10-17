import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// as tabelas ficam num schema próprio para dividir um projeto Supabase com outros apps
export const DB_SCHEMA = import.meta.env.VITE_SUPABASE_SCHEMA || 'gwen';

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('SEU-PROJETO'));

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'gwen.auth' },
      db: { schema: DB_SCHEMA },
    })
  : null;

/** Lança o erro do Supabase com mensagem legível, ou devolve os dados */
export function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}
