/**
 * Ponte com o sistema operacional.
 * Dentro do Tauri usa os comandos Rust; no navegador (yarn dev) cai num
 * fallback para dar para trabalhar na interface sem abrir o app.
 */
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const FOLDER_ACTIONS = {
  vscode: { label: 'VS Code' },
  explorer: { label: 'Explorer' },
  gitbash: { label: 'Git Bash' },
};

export async function openFolder(action, path, gitBashPath) {
  if (!isTauri) {
    console.info(`[gwen] (navegador) abriria ${action}: ${path}`);
    return;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('open_folder', { action, path, gitBashPath: gitBashPath || null });
}

export async function pathExists(path) {
  if (!isTauri || !path) return true;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('path_exists', { path });
}

export async function openLink(url) {
  if (!isTauri) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(url);
}

/** Abre o seletor de pasta do Windows. Devolve o caminho ou null. */
export async function pickFolder() {
  if (!isTauri) {
    return window.prompt('Caminho da pasta (no app, aqui abre o seletor do Windows):') || null;
  }
  const { open } = await import('@tauri-apps/plugin-dialog');
  const result = await open({ directory: true, multiple: false, title: 'Escolha a pasta do projeto' });
  return typeof result === 'string' ? result : null;
}

/** Garante que o link tenha protocolo */
export function normalizeUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  return /^[a-z]+:\/\//i.test(u) || u.startsWith('mailto:') ? u : `https://${u}`;
}
