import { Drop, Eye, PersonSimpleTaiChi } from '@phosphor-icons/react';
import { isTauri } from './native';

/**
 * Lembretes do modo saúde.
 * O intervalo conta TEMPO DE TRABALHO, não relógio: só anda com sessão ativa
 * (ou com o app aberto, se "só durante sessões" estiver desligado) e para
 * durante as pausas. Fechar o app também não conta.
 */
export const REMINDERS = {
  agua: {
    label: 'Água',
    counted: (n) => (n === 1 ? "copo d'água" : "copos d'água"),
    icon: Drop,
    every: 45,
    on: true,
    title: 'Hora da água',
    body: 'Um copo agora. Seu foco agradece.',
    done: 'Bebi',
  },
  alongamento: {
    label: 'Alongamento',
    counted: (n) => (n === 1 ? 'alongamento' : 'alongamentos'),
    icon: PersonSimpleTaiChi,
    every: 90,
    on: true,
    title: 'Levanta um pouco',
    body: 'Tempo demais na mesma posição. Cinco minutos de alongamento resolvem.',
    done: 'Alongar agora',
  },
  olhos: {
    label: 'Olhos',
    counted: (n) => (n === 1 ? 'pausa para os olhos' : 'pausas para os olhos'),
    icon: Eye,
    every: 20,
    on: false,
    title: 'Descanso dos olhos',
    body: 'Olhe para algo a uns 6 metros de distância por 20 segundos.',
    done: 'Feito',
  },
};

export const SNOOZE_MIN = 10;
export const MIN_INTERVAL = 5;

export const DEFAULT_WELLNESS = {
  enabled: false,
  onlyInSession: true,
  reminders: Object.fromEntries(Object.entries(REMINDERS).map(([k, r]) => [k, { on: r.on, every: r.every }])),
};

/** Junta o que está salvo no perfil com os padrões (campos novos aparecem sozinhos) */
export function resolveWellness(saved) {
  const out = { ...DEFAULT_WELLNESS, ...(saved || {}), reminders: { ...DEFAULT_WELLNESS.reminders } };
  for (const k of Object.keys(REMINDERS)) {
    const r = saved?.reminders?.[k];
    if (r) {
      out.reminders[k] = {
        on: typeof r.on === 'boolean' ? r.on : DEFAULT_WELLNESS.reminders[k].on,
        every: Math.max(MIN_INTERVAL, Number(r.every) || DEFAULT_WELLNESS.reminders[k].every),
      };
    }
  }
  return out;
}

/* ─── contadores locais (sobrevivem a fechar o app) ─── */
const KEY = 'gwen.wellness.state';

export function loadCounters() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.counters) return s;
  } catch {
    /* sem storage */
  }
  return { counters: { agua: 0, alongamento: 0, olhos: 0 }, due: [] };
}

export function saveCounters(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sem storage */
  }
}

/* ─── notificação do sistema ─── */

export async function ensureNotificationPermission() {
  try {
    if (isTauri) {
      const n = await import('@tauri-apps/plugin-notification');
      if (await n.isPermissionGranted()) return true;
      return (await n.requestPermission()) === 'granted';
    }
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export async function notify(title, body) {
  try {
    if (!(await ensureNotificationPermission())) return;
    if (isTauri) {
      const { sendNotification } = await import('@tauri-apps/plugin-notification');
      sendNotification({ title, body });
    } else {
      new Notification(title, { body });
    }
  } catch {
    /* sem notificação: o lembrete continua aparecendo dentro do app */
  }
}
