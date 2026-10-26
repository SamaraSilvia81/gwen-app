import { useEffect, useRef } from 'react';
import { isTauri } from './native';
import { sessionSeconds } from './time';
import { bubbleEnabled } from './layout';
import { currentActivity } from './nowActivity';
import { LAYOUT_KEY } from './bubbleOrbit';

/**
 * Bolha flutuante (0.7).
 *
 * Ao minimizar a G.W.E.N., aparece uma bolha redonda com o logo e o tempo da
 * sessão, sempre no topo e arrastável. Clicar nela traz a janela de volta.
 * A bolha é uma segunda janela do Tauri (label "bubble", ver tauri.conf.json),
 * transparente e sem borda. As duas conversam por eventos:
 *   main -> bolha: 'bolha://estado' com { label, paused, elapsed, activity: { kind, name, seconds, more } | null }
 *   bolha -> main: 'bolha://pronta' (pede o estado), 'bolha://abrir' (clique no círculo)
 *                  e 'bolha://apps' (clique na bolinha de Apps e jogos)
 *
 * Com jogo ou mídia, a janela cresce para caber a bolinha de Apps e jogos (no lado que a
 * pessoa escolheu, ver bubbleOrbit.js) e anda o mesmo tanto, então o círculo não sai do
 * lugar. A posição salva é sempre a do círculo.
 */
export const BUBBLE_LABEL = 'bubble';

export const POS_KEY = 'gwen.bolha.pos';
const MARGIN = 24;

async function bubbleWindow() {
  const { Window } = await import('@tauri-apps/api/window');
  return Window.getByLabel(BUBBLE_LABEL);
}

/** Coloca a bolha onde ela estava, ou no canto inferior direito do monitor */
async function placeBubble(bubble) {
  const { PhysicalPosition, currentMonitor } = await import('@tauri-apps/api/window');
  try {
    const saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      // a posição salva é a do círculo; com a bolinha de Apps e jogos aberta, a janela começa antes dele
      const scale = (await bubble.scaleFactor().catch(() => 1)) || 1;
      let off = { ox: 0, oy: 0 };
      try {
        off = { ...off, ...JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}') };
      } catch {
        /* sem layout salvo: só o círculo */
      }
      await bubble.setPosition(new PhysicalPosition(saved.x - Math.round(off.ox * scale), saved.y - Math.round(off.oy * scale)));
      return;
    }
  } catch {
    /* posição inválida: usa o canto */
  }
  // chamado da janela principal: o monitor é o dela
  const monitor = await currentMonitor();
  if (!monitor) return;
  const size = await bubble.outerSize();
  const scale = monitor.scaleFactor || 1;
  const x = monitor.position.x + monitor.size.width - size.width - MARGIN * scale;
  const y = monitor.position.y + monitor.size.height - size.height - (MARGIN + 48) * scale; // acima da barra de tarefas
  await bubble.setPosition(new PhysicalPosition(Math.round(x), Math.round(y)));
}

/** Na janela principal: mostra a bolha ao minimizar e manda o estado da sessão */
export function useBubble({ projects, activeSessions = [], activeBreak, playing = [], game = null, onOpenApps }) {
  // a bolha mostra a sessão aberta há mais tempo; com várias, o rótulo diz quantas
  const activeSession = activeSessions[activeSessions.length - 1] || null;
  const state = useRef(null);
  const project = activeSession && projects.find((p) => p.id === activeSession.project_id);
  state.current = {
    active: !!activeSession,
    label: project
      ? `${project.name}${activeSession.front ? ` · ${activeSession.front}` : ''}${activeSessions.length > 1 ? ` (+${activeSessions.length - 1} em paralelo)` : ''}`
      : null,
    count: activeSessions.length,
    paused: !!activeBreak,
    elapsed: activeSession ? Math.floor(sessionSeconds(activeSession, new Date(), activeBreak)) : 0,
    // agora no mapeamento (jogo na frente ou mídia tocando): a bolinha de cima
    activity: (() => {
      const a = currentActivity({ playing, game });
      return a ? { kind: a.kind, name: a.name, seconds: a.seconds + Math.floor((Date.now() - a.at) / 1000), more: a.more } : null;
    })(),
    sentAt: Date.now(),
  };

  // estado para a bolha: a cada mudança e a cada 15 s (a bolha conta os segundos sozinha)
  const openApps = useRef(onOpenApps);
  openApps.current = onOpenApps;
  const send = useRef(async () => {});
  send.current = async () => {
    if (!isTauri) return;
    try {
      const { emitTo } = await import('@tauri-apps/api/event');
      await emitTo(BUBBLE_LABEL, 'bolha://estado', { ...state.current, sentAt: Date.now() });
    } catch {
      /* bolha fechada: tudo bem */
    }
  };
  const key = `${activeSessions.map((s) => s.id).join(',')}|${activeBreak?.id}|${state.current.label}|${state.current.activity?.kind || ''}:${state.current.activity?.name || ''}`;
  useEffect(() => {
    send.current();
    const id = setInterval(() => send.current(), 15_000);
    return () => clearInterval(id);
  }, [key]);

  useEffect(() => {
    if (!isTauri) return;
    let offs = [];
    let alive = true;
    (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { listen } = await import('@tauri-apps/api/event');
      const main = getCurrentWindow();

      const sync = async () => {
        const bubble = await bubbleWindow().catch(() => null);
        if (!bubble) return;
        const minimized = await main.isMinimized().catch(() => false);
        if (minimized && bubbleEnabled()) {
          if (!(await bubble.isVisible())) {
            await placeBubble(bubble).catch(() => {});
            await bubble.show();
          }
          send.current();
        } else if (await bubble.isVisible()) {
          await bubble.hide();
        }
      };

      const restore = async () => {
        await main.unminimize().catch(() => {});
        await main.show().catch(() => {});
        await main.setFocus().catch(() => {});
        const bubble = await bubbleWindow().catch(() => null);
        await bubble?.hide().catch(() => {});
      };

      const list = await Promise.all([
        main.onResized(sync),
        main.onFocusChanged(sync),
        listen('bolha://abrir', restore),
        listen('bolha://pronta', () => send.current()),
        listen('bolha://apps', async () => {
          await restore();
          openApps.current?.();
        }),
      ]);
      if (alive) offs = list;
      else list.forEach((off) => off());
    })();
    return () => {
      alive = false;
      offs.forEach((off) => off());
    };
  }, []);
}
