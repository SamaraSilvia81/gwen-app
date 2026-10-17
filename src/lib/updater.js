/**
 * Atualização pelo próprio app.
 *
 * O instalador novo vem das Releases do GitHub (latest.json), assinado com a
 * chave privada da autora. O app só aceita o que bate com a chave pública
 * configurada em tauri.conf.json.
 *
 * Os dados não são tocados pela atualização: ficam fora da pasta do programa,
 * na pasta de dados do usuário, ligados ao identificador do app. Ver ADR-009.
 */
import { isTauri } from './native';

export async function currentVersion() {
  if (!isTauri) return import.meta.env.VITE_APP_VERSION || 'dev';
  const { getVersion } = await import('@tauri-apps/api/app');
  return getVersion();
}

/** Devolve a atualização disponível ou null. Nunca lança: sem internet, só não acha. */
export async function findUpdate() {
  if (!isTauri) return null;
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    return (await check()) || null;
  } catch (err) {
    console.warn('[gwen] atualização', err);
    return null;
  }
}

/** Baixa, instala e reinicia. `onProgress` recebe de 0 a 1. */
export async function installUpdate(update, onProgress) {
  let total = 0;
  let done = 0;
  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') total = event.data.contentLength || 0;
    if (event.event === 'Progress') {
      done += event.data.chunkLength;
      if (total) onProgress?.(done / total);
    }
    if (event.event === 'Finished') onProgress?.(1);
  });
  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}

const SNOOZE_KEY = 'gwen.update.snooze';

export function isSnoozed(version) {
  try {
    const s = JSON.parse(localStorage.getItem(SNOOZE_KEY) || 'null');
    return s && s.version === version && Date.now() < s.until;
  } catch {
    return false;
  }
}

/** "Depois": não pergunta de novo sobre essa versão por 24 horas */
export function snooze(version) {
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify({ version, until: Date.now() + 24 * 3600 * 1000 }));
  } catch {
    /* sem storage */
  }
}
