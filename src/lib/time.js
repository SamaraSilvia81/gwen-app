/** Utilitários de tempo. Durações sempre em segundos. */

export function formatDuration(totalSeconds, { short = false } = {}) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (short) {
    if (h === 0) return `${m}min`;
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
  }
  if (h === 0 && m === 0) return `${s}s`;
  if (h === 0) return `${m}min`;
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

/** Relógio HH:MM:SS para timers ao vivo */
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export const formatHour = (date) =>
  new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const formatDay = (date) =>
  new Date(date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

export function startOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Semana começa na segunda */
export function startOfWeek(now = new Date()) {
  const d = startOfToday(now);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export const secondsBetween = (a, b) => (new Date(b).getTime() - new Date(a).getTime()) / 1000;

/**
 * Tempo efetivo de uma sessão: duração menos pausas.
 * Se houver uma pausa em andamento dentro da sessão, ela também é descontada.
 */
export function sessionSeconds(session, now = new Date(), activeBreak = null) {
  const end = session.ended_at ? new Date(session.ended_at) : now;
  let total = secondsBetween(session.started_at, end) - (session.paused_seconds || 0);
  // desde a 0.8 uma pausa vale para todas as sessões abertas: desconta o trecho em comum
  if (!session.ended_at && activeBreak && !activeBreak.ended_at) {
    const from = Math.max(new Date(activeBreak.started_at).getTime(), new Date(session.started_at).getTime());
    total -= Math.max(0, (new Date(now).getTime() - from) / 1000);
  }
  return Math.max(0, total);
}

/**
 * Tempo de relógio de um conjunto de sessões entre `from` e `to` (0.8).
 * Com sessões em paralelo, a mesma hora não conta duas vezes: soma a união dos
 * intervalos e desconta as pausas na mesma proporção das sessões.
 */
export function unionSeconds(sessions, from, to, now = new Date(), activeBreak = null) {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  const parts = [];
  let span = 0;
  let effective = 0;
  for (const s of sessions) {
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : new Date(now).getTime();
    const lo = Math.max(start, a);
    const hi = Math.min(end, b);
    if (hi <= lo || end <= start) continue;
    const part = (hi - lo) / 1000;
    span += part;
    effective += sessionSeconds(s, now, activeBreak) * (part / ((end - start) / 1000));
    parts.push([lo, hi]);
  }
  if (!parts.length) return 0;
  parts.sort((x, y) => x[0] - y[0]);
  let union = 0;
  let [curLo, curHi] = parts[0];
  for (const [lo, hi] of parts.slice(1)) {
    if (lo > curHi) {
      union += curHi - curLo;
      [curLo, curHi] = [lo, hi];
    } else curHi = Math.max(curHi, hi);
  }
  union += curHi - curLo;
  return (union / 1000) * (span > 0 ? effective / span : 0);
}

/** Parte da sessão que caiu depois de `from` (para somar só o tempo de hoje/semana) */
export function sessionSecondsSince(session, from, now = new Date(), activeBreak = null) {
  const total = sessionSeconds(session, now, activeBreak);
  const start = new Date(session.started_at);
  if (start >= from) return total;
  const end = session.ended_at ? new Date(session.ended_at) : now;
  const span = secondsBetween(start, end);
  if (span <= 0 || end <= from) return 0;
  // proporcional: pausas assumidas distribuídas ao longo da sessão
  return total * (secondsBetween(from, end) / span);
}
