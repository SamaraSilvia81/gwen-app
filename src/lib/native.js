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

/** Pasta de dados do app (onde fica o banco local) */
export async function dataDir() {
  if (!isTauri) return '';
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('data_dir');
}

/** Salva um JSON onde a pessoa escolher. Devolve true se salvou. */
export async function saveJsonFile(defaultName, contents) {
  if (!isTauri) {
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: defaultName });
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }
  const { save } = await import('@tauri-apps/plugin-dialog');
  const path = await save({ defaultPath: defaultName, filters: [{ name: 'Backup da G.W.E.N.', extensions: ['json'] }] });
  if (!path) return false;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('write_text_file', { path, contents });
  return true;
}

/** Abre um JSON escolhido pela pessoa. Devolve o texto ou null. */
export async function openJsonFile() {
  if (!isTauri) {
    return new Promise((resolve) => {
      const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
      input.onchange = () => (input.files[0] ? input.files[0].text().then(resolve) : resolve(null));
      input.click();
    });
  }
  const { open } = await import('@tauri-apps/plugin-dialog');
  const path = await open({ multiple: false, filters: [{ name: 'Backup da G.W.E.N.', extensions: ['json'] }] });
  if (typeof path !== 'string') return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('read_text_file', { path });
}

/**
 * Situação do Git de uma pasta: branch, alterações, commits sem push e remoto.
 * Devolve null se a pasta não for um repositório ou se o Git não estiver instalado.
 */
export async function gitInfo(path) {
  if (!isTauri || !path) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('git_info', { path });
}

/** Converte o remote do Git (https ou ssh) no endereço da página do repositório. */
export function remoteToWebUrl(remote) {
  const r = String(remote || '').trim();
  if (!r) return null;
  const ssh = r.match(/^(?:ssh:\/\/)?git@([^:/]+)[:/](.+?)(?:\.git)?\/?$/);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`;
  const http = r.match(/^https?:\/\/(?:[^@/]+@)?([^/]+)\/(.+?)(?:\.git)?\/?$/);
  if (http) return `https://${http[1]}/${http[2]}`;
  return null;
}

/** Nome amigável do serviço pelo endereço do repositório */
export function repoHostLabel(url) {
  if (/github\.com/i.test(url)) return 'GitHub';
  if (/gitlab/i.test(url)) return 'GitLab';
  if (/bitbucket/i.test(url)) return 'Bitbucket';
  return 'Repositório';
}
