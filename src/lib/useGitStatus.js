import { useEffect, useState } from 'react';
import { gitInfo } from './native';

/**
 * Situação do Git das pastas de um projeto.
 * Lê de novo quando a janela volta ao foco e a cada 2 minutos, com um cache
 * curto por pasta para vários cards não chamarem o Git ao mesmo tempo.
 */
const CACHE_MS = 30_000;
const REFRESH_MS = 120_000;
const cache = new Map(); // path -> { at, promise }

function read(path, force) {
  const hit = cache.get(path);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.promise;
  const promise = gitInfo(path).catch(() => null);
  cache.set(path, { at: Date.now(), promise });
  return promise;
}

/** Devolve [{ label, path, info }] só das pastas que são repositórios */
export function useGitStatus(folders) {
  const paths = [...new Set((folders || []).map((f) => f.path).filter(Boolean))];
  const key = paths.join('|');
  const [repos, setRepos] = useState([]);

  useEffect(() => {
    if (!paths.length) {
      setRepos([]);
      return;
    }
    let alive = true;
    const load = async (force = false) => {
      const infos = await Promise.all(paths.map((p) => read(p, force)));
      if (!alive) return;
      setRepos(
        paths
          .map((path, i) => ({ path, label: folders.find((f) => f.path === path)?.label || '', info: infos[i] }))
          .filter((r) => r.info),
      );
    };
    load();
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    const id = setInterval(() => load(true), REFRESH_MS);
    return () => {
      alive = false;
      window.removeEventListener('focus', onFocus);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return repos;
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias", "há 4 meses" */
export function timeAgo(iso, now = new Date()) {
  if (!iso) return '';
  const min = Math.max(0, Math.round((now - new Date(iso)) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  const m = Math.round(d / 30);
  if (m < 12) return `há ${m} ${m === 1 ? 'mês' : 'meses'}`;
  const y = Math.round(m / 12);
  return `há ${y} ${y === 1 ? 'ano' : 'anos'}`;
}
