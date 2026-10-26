import { useEffect, useRef, useState } from 'react';
import { MusicNotes } from '@phosphor-icons/react';
import Logo from '../components/Logo';
import { isTauri } from '../lib/native';
import { formatClock } from '../lib/time';
import { POS_KEY } from '../lib/bubble';

/**
 * Conteúdo da janela da bolha (0.7). Roda numa janela própria, sem os
 * contextos do app: recebe o estado da sessão por evento e conta os segundos sozinha.
 * Arrastar move a bolha; clicar sem arrastar devolve a janela principal.
 */
const DRAG_PX = 4;
/** a janela cresce para baixo quando há mídia tocando, sem mexer no círculo */
const SIZE = 76;
const SIZE_WITH_MEDIA = 100;

export default function Bubble() {
  const [state, setState] = useState(null);
  const [, tick] = useState(0);
  const down = useRef(null);

  useEffect(() => {
    if (!isTauri) {
      // navegador: estado de exemplo para ver o visual
      setState({ active: true, label: 'Projeto de exemplo', paused: false, elapsed: 1234, sentAt: Date.now() });
      return;
    }
    let offs = [];
    let alive = true;
    (async () => {
      const { listen, emitTo } = await import('@tauri-apps/api/event');
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      const list = await Promise.all([
        listen('bolha://estado', ({ payload }) => setState({ ...payload, sentAt: Date.now() })),
        // lembra onde a bolha ficou para a próxima vez
        win.onMoved(({ payload }) => {
          try {
            localStorage.setItem(POS_KEY, JSON.stringify({ x: payload.x, y: payload.y }));
          } catch {
            /* sem armazenamento */
          }
        }),
      ]);
      if (alive) offs = list;
      else list.forEach((off) => off());
      emitTo('main', 'bolha://pronta').catch(() => {});
    })();
    return () => {
      alive = false;
      offs.forEach((off) => off());
    };
  }, []);

  // segundos andam aqui, sem depender da janela principal
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = state?.active ? state.elapsed + (state.paused ? 0 : Math.floor((Date.now() - state.sentAt) / 1000)) : 0;
  const media = state?.media || null;
  const mediaSeconds = media ? media.seconds + Math.floor((Date.now() - state.sentAt) / 1000) : 0;

  // espaço para a pílula da mídia: a janela cresce para baixo (o canto de cima fica parado)
  const hasMedia = !!media;
  useEffect(() => {
    if (!isTauri) return;
    (async () => {
      const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
      await getCurrentWindow().setSize(new LogicalSize(SIZE, hasMedia ? SIZE_WITH_MEDIA : SIZE)).catch(() => {});
    })();
  }, [hasMedia]);
  const minuteOfHour = (elapsed % 3600) / 3600;

  async function onPointerDown(e) {
    if (e.button !== 0) return;
    down.current = { x: e.screenX, y: e.screenY, dragging: false };
  }
  async function onPointerMove(e) {
    const d = down.current;
    if (!d || d.dragging) return;
    if (Math.abs(e.screenX - d.x) + Math.abs(e.screenY - d.y) < DRAG_PX) return;
    d.dragging = true;
    if (isTauri) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().startDragging().catch(() => {});
    }
  }
  async function onPointerUp() {
    const d = down.current;
    down.current = null;
    if (!d || d.dragging) return;
    if (isTauri) {
      const { emitTo } = await import('@tauri-apps/api/event');
      emitTo('main', 'bolha://abrir').catch(() => {});
    }
  }

  // anel: quanto da hora atual já passou na sessão
  const R = 30;
  const C = 2 * Math.PI * R;
  const mediaLine = media ? `\nTocando: ${media.name}${media.more > 0 ? ` (+${media.more})` : ''} · ${formatClock(mediaSeconds)} hoje` : '';
  const title = state?.active
    ? `${state.label || 'Sessão'} · ${formatClock(elapsed)}${state.paused ? ' (em pausa)' : ''}${mediaLine}\nClique para abrir · arraste para mover`
    : `G.W.E.N. · nenhuma sessão ativa${mediaLine}\nClique para abrir · arraste para mover`;

  return (
    <div className="bubble-stage">
      <button
        className={`bubble ${state?.active ? 'is-active' : ''} ${state?.paused ? 'is-paused' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        title={title}
        aria-label="Abrir a G.W.E.N."
      >
        <svg className="bubble-ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r={R} className="bubble-ring-track" />
          {state?.active && (
            <circle
              cx="32"
              cy="32"
              r={R}
              className="bubble-ring-fill"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - minuteOfHour)}
              transform="rotate(-90 32 32)"
            />
          )}
        </svg>
        <Logo size={state?.active ? 20 : 26} charge={state?.active ? Math.max(0.08, minuteOfHour) : 0.65} />
        {state?.active && <span className="bubble-time tabular">{formatClock(elapsed)}</span>}
        {state?.active && <span className="bubble-rec" />}
      </button>
      {media && (
        <span className="bubble-media tabular" title={`${media.name} · ${formatClock(mediaSeconds)} hoje`}>
          <MusicNotes size={9} weight="fill" />
          {formatClock(mediaSeconds)}
        </span>
      )}
    </div>
  );
}
