/**
 * Registro de quem usa a G.W.E.N. (0.9.2).
 *
 * Serve para a autora saber quantas instalações existem, quantas estão ativas
 * e em qual versão. Vai isto: um código aleatório gerado neste computador,
 * o nome e a foto escolhidos na abertura, a versão da G.W.E.N., o sistema
 * (ex.: Windows 11), o idioma e se a abertura já foi concluída. Nunca vão
 * projetos, tempos, pastas ou e-mail.
 *
 * O destino é o Supabase da autora (VITE_TELEMETRY_URL e VITE_TELEMETRY_KEY no
 * build), não a conexão de nuvem que a pessoa configura em Ajustes. A chave é a
 * anon: só consegue chamar gwen.heartbeat e gwen.forget_install (009).
 *
 * Desligar em Ajustes > Dados para de enviar e apaga o registro lá.
 */
import { isTauri } from './native';
import { currentVersion } from './updater';

const URL_ = import.meta.env.VITE_TELEMETRY_URL;
const KEY = import.meta.env.VITE_TELEMETRY_KEY;

const ID_KEY = 'gwen.installId';
const OFF_KEY = 'gwen.telemetry.off';
const DAY_MS = 24 * 3600 * 1000;

export const telemetryAvailable = Boolean(URL_ && KEY);

/** De onde vem o registro: o app instalado, o app em `tauri dev` ou o navegador */
export const ORIGIN = isTauri ? (import.meta.env.DEV ? 'app-dev' : 'app') : 'web-dev';

const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* sem storage: segue sem id fixo */
    }
  },
  del: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* idem */
    }
  },
};

export const telemetryEnabled = () => store.get(OFF_KEY) !== '1';

/** Código aleatório desta instalação. Criado na primeira vez, nunca ligado à pessoa. */
export function installId() {
  let id = store.get(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    store.set(ID_KEY, id);
  }
  return id;
}

/** O código já criado, sem criar um novo (para mostrar em Ajustes) */
export const storedInstallId = () => store.get(ID_KEY);

/** "Windows 11", "Windows 10", "macOS"... O WebView2 é Chromium, então dá para separar 10 de 11. */
async function osName() {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) {
    try {
      const { platformVersion } = await navigator.userAgentData.getHighEntropyValues(['platformVersion']);
      return Number(platformVersion.split('.')[0]) >= 13 ? 'Windows 11' : 'Windows 10';
    } catch {
      return 'Windows';
    }
  }
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'outro';
}

async function rpc(fn, body) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'gwen',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${await res.text()}`);
}

/** Avisa que esta instalação está viva. Nunca lança: sem internet ou sem config, só não envia. */
export async function sendHeartbeat({ onboarded, name = null, avatar = null }) {
  if (!telemetryAvailable || !telemetryEnabled()) return;
  try {
    await rpc('heartbeat', {
      p_id: installId(),
      p_origin: ORIGIN,
      p_version: await currentVersion(),
      p_os: await osName(),
      p_locale: navigator.language || null,
      p_onboarded: !!onboarded,
      p_name: name,
      p_avatar: avatar,
    });
    if (import.meta.env.DEV) console.info('[gwen] heartbeat enviado', installId(), ORIGIN);
  } catch (err) {
    console.warn('[gwen] heartbeat', err);
  }
}

/** Liga ou desliga. Desligar apaga o registro no servidor e o código local. */
export async function setTelemetry(on) {
  if (on) {
    store.del(OFF_KEY);
    // religar só acontece em Ajustes, então a abertura já foi concluída
    await sendHeartbeat({ ...lastState, onboarded: true });
    return;
  }
  const id = store.get(ID_KEY);
  store.set(OFF_KEY, '1');
  store.del(ID_KEY);
  if (telemetryAvailable && id) await rpc('forget_install', { p_id: id });
}

let lastState = {};
let lastKey = null;
let timer = null;

/**
 * Envia ao abrir, de novo quando a abertura é concluída ou o nome/foto mudam,
 * e depois uma vez por dia enquanto o app fica aberto. Chamar várias vezes com
 * o mesmo estado não reenvia (o StrictMode monta duas vezes em dev).
 */
export function trackInstall({ onboarded, name, avatar }) {
  const state = { onboarded, name: name && name !== 'você' ? name : null, avatar: avatar || null };
  const key = `${state.onboarded}|${state.name}|${state.avatar?.length || 0}|${state.avatar?.slice(-32) || ''}`;
  if (key === lastKey) return;
  lastKey = key;
  lastState = state;
  sendHeartbeat(state);
  if (!timer) timer = setInterval(() => sendHeartbeat(lastState), DAY_MS);
}
