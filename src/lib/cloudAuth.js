/**
 * Login na nuvem, usado só para importar dados do Supabase (e, no futuro, para sincronizar).
 * O fluxo do Google volta para o app pelo deep link gwen://auth/callback (ADR-006).
 */
import { supabase, isSupabaseConfigured, OAUTH_REDIRECT } from './supabase';
import { isTauri, openLink } from './native';

export { isSupabaseConfigured };

export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
  return data.session;
}

/** Abre o Google no navegador. A sessão chega depois, por `listenOAuthReturn`. */
export async function startGoogleSignIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: OAUTH_REDIRECT, skipBrowserRedirect: isTauri },
  });
  if (error) throw new Error(error.message);
  if (isTauri && data?.url) await openLink(data.url);
}

/** Escuta o retorno do Google. Chama onSession(session) quando a troca do código der certo. */
export async function listenOAuthReturn(onSession, onError) {
  // no navegador, o Supabase lê o código da URL sozinho
  const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => session && onSession(session));
  let unlisten = () => {};
  if (isTauri) {
    const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
    unlisten = await onOpenUrl(async (urls) => {
      const raw = (urls || []).find((u) => u.startsWith('gwen://'));
      if (!raw) return;
      const url = new URL(raw);
      const err = url.searchParams.get('error_description') || url.searchParams.get('error');
      if (err) return onError?.(err);
      const code = url.searchParams.get('code');
      if (!code) return;
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) onError?.(error.message);
    });
  }
  return () => {
    sub.subscription.unsubscribe();
    unlisten();
  };
}

/** Nome, foto e e-mail da conta, como o provedor (Google) informou */
export function identityOf(session) {
  const u = session?.user;
  const m = u?.user_metadata || {};
  return { email: u?.email || '', name: m.full_name || m.name || '', picture: m.avatar_url || m.picture || '' };
}

export async function currentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOutCloud() {
  await supabase.auth.signOut();
}
