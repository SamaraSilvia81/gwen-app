import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { profileRepo } from '../data/repository';
import { applyAppearance, loadLocalAppearance, saveLocalAppearance } from '../lib/themes';

/**
 * Perfil local. Desde a 0.4 não há login: a G.W.E.N. abre direto, e o perfil
 * (nome, aparência, modo saúde) fica no banco do computador. Ver ADR-010.
 */
const ProfileContext = createContext(null);

const appearanceOf = (p) => ({ theme: p.theme, style: p.style, custom: p.custom_colors, mode: p.mode });

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // aparência guardada no navegador entra antes do banco abrir, para não piscar o tema
  useEffect(() => {
    const local = loadLocalAppearance();
    if (local) applyAppearance(local);
  }, []);

  const apply = (p) => {
    if (!p) return;
    applyAppearance(appearanceOf(p));
    saveLocalAppearance(appearanceOf(p));
  };

  const reload = useCallback(async () => {
    const p = await profileRepo.get();
    setProfile(p);
    apply(p);
    return p;
  }, []);

  useEffect(() => {
    reload()
      .catch((err) => {
        console.error('[gwen] banco local', err);
        setError(err?.message || String(err));
      })
      .finally(() => setLoading(false));
  }, [reload]);

  const createProfile = useCallback(async (displayName, avatar = null) => {
    await profileRepo.create(displayName.trim(), avatar);
    return reload();
  }, [reload]);

  const updateProfile = useCallback(async (patch) => {
    const next = await profileRepo.update('local', patch);
    setProfile(next);
    apply(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({
      loading,
      error,
      profile,
      // compatibilidade com quem ainda espera um "usuário"
      user: profile ? { id: 'local' } : null,
      needsOnboarding: !loading && !error && !profile,
      createProfile,
      updateProfile,
      reload,
    }),
    [loading, error, profile, createProfile, updateProfile, reload],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);
