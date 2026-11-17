import { useMemo } from 'react';
import { useProfile } from '../context/ProfileContext';
import { environmentTraits } from './environments';

/** O que os ambientes do perfil oferecem (ver environments.js e ADR-015) */
export function useEnvironments() {
  const { profile } = useProfile();
  return useMemo(() => environmentTraits(profile?.environments), [profile?.environments]);
}
