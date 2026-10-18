import { useEffect, useRef } from 'react';
import { isTauri } from './native';
import { projectFronts } from './projectModel';
import { formatDuration, sessionSeconds } from './time';

/**
 * Mantém a bandeja em dia: lista de projetos para começar (com as frentes),
 * sessão ativa e tooltip com o tempo. Recebe os cliques do menu.
 * Fechar a janela esconde na bandeja; a opção fica no localStorage do computador.
 */
export const CLOSE_TO_TRAY_KEY = 'gwen:fechar-para-bandeja';
const MAX_ITEMS = 12;

export function closeToTrayEnabled() {
  try {
    return localStorage.getItem(CLOSE_TO_TRAY_KEY) !== '0';
  } catch {
    return true;
  }
}

export async function setCloseToTray(on) {
  try {
    localStorage.setItem(CLOSE_TO_TRAY_KEY, on ? '1' : '0');
  } catch {
    /* sem armazenamento: vale só nesta abertura */
  }
  if (!isTauri) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('set_close_to_tray', { on });
}

function trayItems(projects) {
  const items = [];
  const open = projects
    .filter((p) => p.status !== 'concluido')
    .sort((a, b) => String(b.last_opened_at || '').localeCompare(String(a.last_opened_at || '')));
  for (const p of open) {
    const fronts = projectFronts(p);
    if (fronts.length > 1) for (const f of fronts) items.push({ key: `${p.id}::${f}`, label: `${p.name} · ${f}` });
    else items.push({ key: p.id, label: p.name });
    if (items.length >= MAX_ITEMS) break;
  }
  return items.slice(0, MAX_ITEMS);
}

export function useTray({ projects, activeSession, activeBreak, now, launchProject, requestEnd, toast }) {
  // os handlers mudam a cada render; os listeners leem sempre a versão atual
  const latest = useRef({});
  latest.current = { projects, launchProject, requestEnd, toast };

  // aplica a preferência de fechar para a bandeja ao abrir
  useEffect(() => {
    if (isTauri) setCloseToTray(closeToTrayEnabled()).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    let unlisten = [];
    let alive = true;
    (async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const offs = await Promise.all([
        listen('tray://launch', async ({ payload }) => {
          const [id, front] = String(payload).split('::');
          const { projects: list, launchProject: launch, toast: say } = latest.current;
          const project = list.find((p) => p.id === id);
          if (!project) return;
          try {
            await launch(project, front || null);
          } catch (err) {
            say?.(err?.message || String(err), 'error');
          }
        }),
        listen('tray://end', () => latest.current.requestEnd()),
      ]);
      if (alive) unlisten = offs;
      else offs.forEach((off) => off());
    })();
    return () => {
      alive = false;
      unlisten.forEach((off) => off());
    };
  }, []);

  const project = activeSession && projects.find((p) => p.id === activeSession.project_id);
  const activeLabel = project ? `${project.name}${activeSession.front ? ` · ${activeSession.front}` : ''}` : null;
  const minutes = activeSession ? Math.floor(sessionSeconds(activeSession, now, activeBreak) / 60) : 0;
  const itemsKey = JSON.stringify(trayItems(projects));

  useEffect(() => {
    if (!isTauri) return;
    const tooltip = activeLabel
      ? `G.W.E.N. · ${activeLabel} · ${formatDuration(minutes * 60)}${activeBreak ? ' (em pausa)' : ''}`
      : 'G.W.E.N. · nenhuma sessão ativa';
    import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke('update_tray', { items: JSON.parse(itemsKey), active: activeLabel, tooltip }))
      .catch(() => {});
  }, [itemsKey, activeLabel, minutes, activeBreak]);
}
