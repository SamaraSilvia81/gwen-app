import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useProfile } from './ProfileContext';
import { useWorkspace } from './WorkspaceContext';
import { wellnessRepo } from '../data/repository';
import { REMINDERS, SNOOZE_MIN, loadCounters, notify, resolveWellness, saveCounters } from '../lib/wellness';
import { secondsBetween, startOfToday } from '../lib/time';

const TICK_MS = 15_000;
/** Maior salto contado num tick: se o PC dormiu, esse tempo não vira "trabalho" */
const MAX_STEP_S = 60;

const WellnessContext = createContext(null);

export function WellnessProvider({ children }) {
  const { profile } = useProfile();
  const { activeSession, activeBreak, startBreak } = useWorkspace();
  const config = useMemo(() => resolveWellness(profile?.wellness), [profile?.wellness]);

  const [state, setState] = useState(loadCounters); // { counters, due }
  const [today, setToday] = useState([]); // eventos de hoje
  const lastTick = useRef(Date.now());

  // eventos de hoje, para o resumo no dashboard
  useEffect(() => {
    if (!profile) return;
    wellnessRepo.since(startOfToday()).then(setToday).catch(() => {});
  }, [profile]);

  useEffect(() => saveCounters(state), [state]);

  const counting = config.enabled && !activeBreak && (!config.onlyInSession || !!activeSession);

  // relógio de trabalho
  useEffect(() => {
    lastTick.current = Date.now();
    if (!config.enabled) return;
    const id = setInterval(() => {
      const now = Date.now();
      const step = Math.min(MAX_STEP_S, (now - lastTick.current) / 1000);
      lastTick.current = now;
      if (!counting) return;

      setState((prev) => {
        const counters = { ...prev.counters };
        const due = [...prev.due];
        for (const [kind, r] of Object.entries(config.reminders)) {
          if (!r.on) continue;
          counters[kind] = (counters[kind] || 0) + step;
          if (counters[kind] >= r.every * 60 && !due.includes(kind)) due.push(kind);
        }
        return { counters, due };
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [config, counting]);

  // lembrete novo: notificação do Windows, só quando a G.W.E.N. não está na frente
  const prevDue = useRef(state.due);
  useEffect(() => {
    const fresh = state.due.filter((k) => !prevDue.current.includes(k));
    prevDue.current = state.due;
    if (!fresh.length || !(document.hidden || !document.hasFocus())) return;
    for (const k of fresh) notify(REMINDERS[k].title, REMINDERS[k].body);
  }, [state.due]);

  // uma pausa de verdade também conta como cuidado: zera os lembretes que ela cobre
  const prevBreak = useRef(activeBreak);
  useEffect(() => {
    const before = prevBreak.current;
    prevBreak.current = activeBreak;
    if (!before || activeBreak) return;
    const seconds = secondsBetween(before.started_at, new Date());
    const covered = [];
    if (seconds >= 20) covered.push('olhos');
    if (seconds >= 300 || before.kind === 'alongamento') covered.push('alongamento');
    if (!covered.length) return;
    setState((prev) => ({
      counters: { ...prev.counters, ...Object.fromEntries(covered.map((k) => [k, 0])) },
      due: prev.due.filter((k) => !covered.includes(k)),
    }));
  }, [activeBreak]);

  const record = useCallback(
    (kind, action) => {
      wellnessRepo
        .log(kind, action, activeSession?.id ?? null)
        .then((ev) => setToday((t) => [ev, ...t]))
        .catch(() => {});
    },
    [activeSession],
  );

  const resolve = useCallback((kind, counter) => {
    setState((prev) => ({
      counters: { ...prev.counters, [kind]: counter },
      due: prev.due.filter((k) => k !== kind),
    }));
  }, []);

  const done = useCallback(
    async (kind) => {
      resolve(kind, 0);
      record(kind, 'feito');
      if (kind === 'alongamento') await startBreak('alongamento');
    },
    [resolve, record, startBreak],
  );

  const snooze = useCallback(
    (kind) => {
      const every = config.reminders[kind]?.every ?? REMINDERS[kind].every;
      resolve(kind, Math.max(0, (every - SNOOZE_MIN) * 60));
      record(kind, 'adiado');
    },
    [config, resolve, record],
  );

  const dismiss = useCallback(
    (kind) => {
      resolve(kind, 0);
      record(kind, 'dispensado');
    },
    [resolve, record],
  );

  const todayCount = useMemo(() => {
    const c = { agua: 0, alongamento: 0, olhos: 0 };
    for (const ev of today) if (ev.action === 'feito') c[ev.kind] = (c[ev.kind] || 0) + 1;
    return c;
  }, [today]);

  const value = useMemo(
    () => ({
      config,
      counting,
      due: config.enabled ? state.due.filter((k) => config.reminders[k]?.on) : [],
      counters: state.counters,
      todayCount,
      done,
      snooze,
      dismiss,
    }),
    [config, counting, state, todayCount, done, snooze, dismiss],
  );

  return <WellnessContext.Provider value={value}>{children}</WellnessContext.Provider>;
}

export const useWellness = () => useContext(WellnessContext);
