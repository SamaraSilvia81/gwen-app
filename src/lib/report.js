import { sessionSeconds, startOfToday, startOfWeek } from './time';

/** Períodos do relatório: [início, fim) */
export const PERIODS = {
  semana: { label: 'Esta semana', range: (now) => [startOfWeek(now), now] },
  mes: { label: 'Este mês', range: (now) => [new Date(now.getFullYear(), now.getMonth(), 1), now] },
  mesPassado: {
    label: 'Mês passado',
    range: (now) => [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 1)],
  },
  dias30: {
    label: 'Últimos 30 dias',
    range: (now) => {
      const from = startOfToday(now);
      from.setDate(from.getDate() - 29);
      return [from, now];
    },
  },
};

/** Tempo da sessão que caiu dentro de [from, to), descontando pausas na proporção */
export function secondsIn(session, from, to, now, activeBreak) {
  const start = new Date(session.started_at);
  const end = session.ended_at ? new Date(session.ended_at) : now;
  const span = (end - start) / 1000;
  if (span <= 0) return 0;
  const a = Math.max(start, from);
  const b = Math.min(end, to);
  if (b <= a) return 0;
  return sessionSeconds(session, now, activeBreak) * (((b - a) / 1000) / span);
}

/**
 * Agrupa por categoria > projeto > frente.
 * Devolve { total, count, days, groups: [{ id, name, seconds, projects: [{ project, seconds, count, fronts: [{name, seconds}] }] }] }
 */
export function buildReport({ sessions, projects, categories, from, to, now, activeBreak }) {
  const projById = new Map(projects.map((p) => [p.id, p]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const groups = new Map();
  const days = new Set();
  let total = 0;
  let count = 0;

  for (const s of sessions) {
    const sec = secondsIn(s, from, to, now, activeBreak);
    if (sec < 1) continue;
    total += sec;
    count += 1;
    days.add(new Date(s.started_at).toDateString());
    const p = projById.get(s.project_id);
    const catId = p?.category_id || 'none';
    if (!groups.has(catId)) {
      groups.set(catId, { id: catId, name: catId === 'none' ? 'Sem categoria' : catName.get(catId) || 'Categoria', seconds: 0, projects: new Map() });
    }
    const g = groups.get(catId);
    g.seconds += sec;
    const key = s.project_id;
    if (!g.projects.has(key)) g.projects.set(key, { project: p || { id: key, name: 'Projeto excluído' }, seconds: 0, count: 0, fronts: new Map() });
    const e = g.projects.get(key);
    e.seconds += sec;
    e.count += 1;
    if (s.front) e.fronts.set(s.front, (e.fronts.get(s.front) || 0) + sec);
  }

  const bySeconds = (a, b) => b.seconds - a.seconds;
  return {
    total,
    count,
    days: days.size,
    groups: [...groups.values()]
      .map((g) => ({
        ...g,
        projects: [...g.projects.values()]
          .map((e) => ({ ...e, fronts: [...e.fronts.entries()].map(([name, seconds]) => ({ name, seconds })).sort(bySeconds) }))
          .sort(bySeconds),
      }))
      .sort(bySeconds),
  };
}

/** CSV com uma linha por sessão, separado por ";" e com BOM (abre certo no Excel em português) */
export function reportCsv({ sessions, projects, categories, from, to, now, activeBreak }) {
  const projById = new Map(projects.map((p) => [p.id, p]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const esc = (v) => {
    const s = String(v ?? '');
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const day = (d) => new Date(d).toLocaleDateString('pt-BR');
  const hour = (d) => (d ? new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
  const rows = [['data', 'inicio', 'fim', 'minutos', 'projeto', 'frente', 'categoria', 'onde parei']];
  const ordered = [...sessions].sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)));
  for (const s of ordered) {
    const sec = secondsIn(s, from, to, now, activeBreak);
    if (sec < 1) continue;
    const p = projById.get(s.project_id);
    rows.push([
      day(s.started_at),
      hour(s.started_at),
      s.ended_at ? hour(s.ended_at) : 'em andamento',
      Math.round(sec / 60),
      p?.name || 'Projeto excluído',
      s.front || '',
      p?.category_id ? catName.get(p.category_id) || '' : 'Sem categoria',
      s.note || '',
    ]);
  }
  return `﻿${rows.map((r) => r.map(esc).join(';')).join('\r\n')}\r\n`;
}
