import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { profileRepo } from '../data/repository';
import { applyAppearance, loadLocalAppearance, saveLocalAppearance } from '../lib/themes';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // aparência salva localmente entra antes do login, para não piscar o tema
  useEffect(() => {
    const local = loadLocalAppearance();
    if (local) applyAppearance(local);
  }, []);

  const loadProfile = useCallback(async (u) => {
    if (!u) {
      setProfile(null);
      return;
    }
    try {
      const p = await profileRepo.ensure(u);
      setProfile(p);
      if (p) {
        const appearance = { theme: p.theme, style: p.style, custom: p.custom_colors };
        applyAppearance(appearance);
        saveLocalAppearance(appearance);
      }
    } catch (err) {
      console.error('[gwen] perfil', err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const u = data.session?.user ?? null;
      setUser(u);
      await loadProfile(u);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // fora do callback para não travar o cliente do Supabase
      setTimeout(() => loadProfile(u), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateAuthError(error.message));
  }, []);

  const signUp = useCallback(async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw new Error(translateAuthError(error.message));
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateProfile = useCallback(
    async (patch) => {
      if (!user) return;
      const next = await profileRepo.update(user.id, patch);
      setProfile(next);
      const appearance = { theme: next.theme, style: next.style, custom: next.custom_colors };
      applyAppearance(appearance);
      saveLocalAppearance(appearance);
      return next;
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, profile, loading, signIn, signUp, signOut, updateProfile }),
    [user, profile, loading, signIn, signUp, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

function translateAuthError(message) {
  const map = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar (veja a caixa de entrada).',
    'User already registered': 'Já existe uma conta com esse e-mail.',
    'Password should be at least 6 characters.': 'A senha precisa ter pelo menos 6 caracteres.',
  };
  return map[message] || message;
}
