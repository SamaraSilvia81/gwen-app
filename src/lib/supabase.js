import { createClient } from '@supabase/supabase-js';
import { isTauri } from './native';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// as tabelas ficam num schema próprio para dividir um projeto Supabase com outros apps
export const DB_SCHEMA = import.meta.env.VITE_SUPABASE_SCHEMA || 'gwen';

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('SEU-PROJETO'));

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'gwen.auth',
        // PKCE: o login com Google volta com um ?code= que o app troca pela sessão
        flowType: 'pkce',
        // no navegador o Supabase lê o code da URL sozinho; no app ele chega pelo deep link
        detectSessionInUrl: !isTauri,
      },
      db: { schema: DB_SCHEMA },
    })
  : null;

/** Lança o erro do Supabase com mensagem legível, ou devolve os dados */
export function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

/** Para onde o Google devolve depois do login */
export const OAUTH_REDIRECT = isTauri ? 'gwen://auth/callback' : `${window.location.origin}/`;
