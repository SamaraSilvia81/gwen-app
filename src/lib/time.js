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
  if (!session.ended_at && activeBreak && activeBreak.session_id === session.id) {
    total -= secondsBetween(activeBreak.started_at, now);
  }
  return Math.max(0, total);
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
