import { Coffee, Drop, Eye, Laptop, PersonSimpleTaiChi } from '@phosphor-icons/react';
import { sessionSeconds } from './time';

/**
 * Hábitos e atividade por dia (0.7), para os mapas de calor do perfil e da home.
 * Tudo sai do que a G.W.E.N. já registra: sessões, pausas e respostas do modo saúde.
 */

/** Chave do dia no fuso do computador: '2026-10-18' */
export function dayKey(date) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Segunda-feira da semana de `d` */
const mondayOf = (d) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

/**
 * Grade de semanas (colunas) por dias (linhas, seg a dom) terminando hoje.
 * Devolve [{ key, date, future }][] por coluna.
 */
export function weekGrid(weeks, today = new Date()) {
  const end = startOfDay(today);
  const first = mondayOf(end);
  first.setDate(first.getDate() - (weeks - 1) * 7);
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(first);
      date.setDate(first.getDate() + w * 7 + d);
      col.push({ key: dayKey(date), date, future: date > end });
    }
    cols.push(col);
  }
  return cols;
}

/** Minutos trabalhados por dia (a sessão conta no dia em que começou) */
export function minutesByDay(sessions, now = new Date(), activeBreak = null) {
  const map = new Map();
  for (const s of sessions) {
    const k = dayKey(s.started_at);
    map.set(k, (map.get(k) || 0) + sessionSeconds(s, now, activeBreak) / 60);
  }
  return map;
}

/** Quantas vezes por dia algo aconteceu */
export function countByDay(items, dateField = 'created_at', filter = () => true) {
  const map = new Map();
  for (const it of items) {
    if (!filter(it)) continue;
    const k = dayKey(it[dateField]);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

/**
 * Sequência atual e maior sequência de dias com valor > 0.
 * A atual começa ontem se hoje ainda está vazio: o dia não acabou.
 */
export function streaks(map, today = new Date()) {
  const has = (d) => (map.get(dayKey(d)) || 0) > 0;
  let current = 0;
  const cursor = startOfDay(today);
  if (!has(cursor)) cursor.setDate(cursor.getDate() - 1);
  while (has(cursor)) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const keys = [...map.entries()].filter(([, v]) => v > 0).map(([k]) => k).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of keys) {
    const d = new Date(`${k}T12:00:00`);
    if (prev && Math.round((d - prev) / 86_400_000) === 1) run += 1;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best, days: keys.length };
}

/** Nível 0 a 4 para pintar o quadradinho */
export function level(value, thresholds) {
  if (!value) return 0;
  let l = 1;
  for (const t of thresholds) if (value >= t) l += 1;
  return Math.min(4, l);
}

/** Limites dos níveis: minutos de trabalho e contagem de vezes */
export const WORK_LEVELS = [60, 180, 300];
export const COUNT_LEVELS = [2, 4, 6];

/** Hábitos mostrados no perfil, cada um com a fonte dos dados */
export const HABITS = {
  trabalho: { label: 'Trabalho', icon: Laptop, unit: (v) => `${Math.round(v)}min`, levels: WORK_LEVELS, hint: 'dias com sessão' },
  pausas: { label: 'Pausas', icon: Coffee, unit: (v) => `${v} ${v === 1 ? 'pausa' : 'pausas'}`, levels: COUNT_LEVELS, hint: 'pausas registradas' },
  agua: { label: 'Água', icon: Drop, unit: (v) => `${v} ${v === 1 ? 'copo' : 'copos'}`, levels: [3, 5, 7], hint: 'lembretes de água feitos' },
  alongamento: { label: 'Alongamento', icon: PersonSimpleTaiChi, unit: (v) => `${v}x`, levels: COUNT_LEVELS, hint: 'alongamentos feitos' },
  olhos: { label: 'Olhos', icon: Eye, unit: (v) => `${v}x`, levels: [3, 6, 9], hint: 'pausas 20-20-20 feitas' },
};

/** Monta os mapas de cada hábito a partir dos dados brutos */
export function habitMaps({ sessions, breaks, events, now = new Date(), activeBreak = null }) {
  const done = (kind) => (e) => e.kind === kind && e.action === 'feito';
  return {
    trabalho: minutesByDay(sessions, now, activeBreak),
    pausas: countByDay(breaks, 'started_at'),
    agua: countByDay(events, 'created_at', done('agua')),
    alongamento: countByDay(events, 'created_at', done('alongamento')),
    olhos: countByDay(events, 'created_at', done('olhos')),
  };
}
