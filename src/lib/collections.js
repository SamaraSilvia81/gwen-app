import { ClockCounterClockwise, Hourglass, Play, PushPin } from '@phosphor-icons/react';

/**
 * Coleções do painel de projetos (0.7).
 *
 * - Categorias são as coleções que a pessoa cria (Mestrado, Freela...).
 * - Coleções inteligentes se montam sozinhas a partir dos dados do projeto.
 *
 * O filtro do painel é um texto: 'all', 'none' (sem categoria), o id de uma
 * categoria ou 'smart:<id>' de uma coleção inteligente.
 */
const DAY = 86_400_000;
export const STALE_DAYS = 30;
const RECENT_DAYS = 7;

const lastOpen = (p) => new Date(p.last_opened_at || p.created_at || 0).getTime();

export const SMART = {
  fixados: {
    label: 'Fixados',
    icon: PushPin,
    hint: 'Projetos que você fixou',
    match: (p) => !!p.pinned,
  },
  recentes: {
    label: 'Recentes',
    icon: ClockCounterClockwise,
    hint: `Abertos nos últimos ${RECENT_DAYS} dias`,
    match: (p, now) => !!p.last_opened_at && now - lastOpen(p) <= RECENT_DAYS * DAY,
  },
  andamento: {
    label: 'Em andamento',
    icon: Play,
    hint: 'Status em andamento',
    match: (p) => p.status === 'andamento',
  },
  parados: {
    label: 'Parados',
    icon: Hourglass,
    hint: `Em andamento e sem abrir há ${STALE_DAYS} dias ou mais`,
    match: (p, now) => p.status === 'andamento' && now - lastOpen(p) >= STALE_DAYS * DAY,
  },
};

export const smartId = (filter) => (String(filter).startsWith('smart:') ? filter.slice(6) : null);

/** O projeto entra no filtro escolhido no painel? */
export function matchFilter(project, filter, now = Date.now()) {
  if (filter === 'all') return true;
  const smart = smartId(filter);
  if (smart) return SMART[smart]?.match(project, now) ?? true;
  return (project.category_id || 'none') === filter;
}

export function filterLabel(filter, categories) {
  if (filter === 'all') return 'Todos os projetos';
  if (filter === 'none') return 'Sem categoria';
  const smart = smartId(filter);
  if (smart) return SMART[smart]?.label || 'Projetos';
  return categories.find((c) => c.id === filter)?.name || 'Projetos';
}
