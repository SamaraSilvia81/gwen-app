import { createClient } from '@supabase/supabase-js';
import { isTauri } from './native';
import { loadConnection } from './cloudConfig';

/**
 * O cliente é criado a partir da conexão guardada (cloudConfig.js), não mais
 * de variáveis do build. Sem conexão, `supabase` é null e a interface de
 * nuvem não aparece. `supabase`, `isSupabaseConfigured` e `DB_SCHEMA` são
 * bindings vivos: quem importa enxerga a troca feita por `connectSupabase`.
 */
export let supabase = null;
export let isSupabaseConfigured = false;
// as tabelas ficam num schema próprio para dividir um projeto Supabase com outros apps
export let DB_SCHEMA = 'gwen';

export function connectSupabase(conn) {
  if (!conn) {
    supabase = null;
    isSupabaseConfigured = false;
    return;
  }
  DB_SCHEMA = conn.schema || 'gwen';
  supabase = createClient(conn.url, conn.anonKey, {
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
  });
  isSupabaseConfigured = true;
}

connectSupabase(loadConnection());

/** Lança o erro do Supabase com mensagem legível, ou devolve os dados */
export function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

/** Para onde o Google devolve depois do login */
export const OAUTH_REDIRECT = isTauri ? 'gwen://auth/callback' : `${window.location.origin}/`;
