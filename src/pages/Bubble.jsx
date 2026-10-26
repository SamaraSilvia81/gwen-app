import { useEffect, useRef, useState } from 'react';
import { GameController, MusicNotes } from '@phosphor-icons/react';
import Logo from '../components/Logo';
import { isTauri } from '../lib/native';
import { formatClock } from '../lib/time';
import { BUBBLE_EXTRA, BUBBLE_SIZE, POS_KEY } from '../lib/bubble';
import { ACTIVITY_LABEL } from '../lib/nowActivity';

/**
 * Conteúdo da janela da bolha (0.7). Roda numa janela própria, sem os
 * contextos do app: recebe o estado da sessão por evento e conta os segundos sozinha.
 * Arrastar move a bolha; clicar sem arrastar devolve a janela principal.
 *
 * Com jogo na frente ou mídia tocando, aparece uma bolinha de Apps e jogos acima
 * do círculo (ícone + tempo de hoje). Clicar nela abre o Relatório em Apps e jogos.
 */
const DRAG_PX = 4;
/** relógio curto para a bolinha (46 px): 05:12 até 1 hora, depois 1h23 */
const shortClock = (secs) => (secs >= 3600 ? `${Math.floor(secs / 3600)}h${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}` : formatClock(secs));

export default function Bubble() {
  const [state, setState] = useState(null);
  const [, tick] = useState(0);
  const down = useRef(null);
  /** janela crescida para cima (bolinha de Apps e jogos aberta) */
  const lifted = useRef(false);

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
        win.onMoved(async ({ payload }) => {
          try {
            // guarda a posição do círculo: com a janela crescida, ele fica BUBBLE_EXTRA mais abaixo
            const scale = lifted.current ? (await win.scaleFactor().catch(() => 1)) || 1 : 1;
            const y = payload.y + (lifted.current ? Math.round(BUBBLE_EXTRA * scale) : 0);
            localStorage.setItem(POS_KEY, JSON.stringify({ x: payload.x, y }));
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
  const activity = state?.activity || null;
  const activitySecs = activity ? activity.seconds + Math.floor((Date.now() - state.sentAt) / 1000) : 0;

  // bolinha de Apps e jogos: a janela cresce para cima e sobe o mesmo tanto, então o círculo fica parado
  const hasActivity = !!activity;
  useEffect(() => {
    if (!isTauri || hasActivity === lifted.current) return;
    (async () => {
      const { getCurrentWindow, LogicalSize, PhysicalPosition } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      try {
        const scale = (await win.scaleFactor()) || 1;
        const pos = await win.outerPosition();
        const dy = Math.round(BUBBLE_EXTRA * scale);
        lifted.current = hasActivity;
        if (hasActivity) {
          await win.setPosition(new PhysicalPosition(pos.x, pos.y - dy));
          await win.setSize(new LogicalSize(BUBBLE_SIZE, BUBBLE_SIZE + BUBBLE_EXTRA));
        } else {
          await win.setSize(new LogicalSize(BUBBLE_SIZE, BUBBLE_SIZE));
          await win.setPosition(new PhysicalPosition(pos.x, pos.y + dy));
        }
      } catch {
        /* sem permissão ou janela fechando: fica como está */
      }
    })();
  }, [hasActivity]);
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
  const activityLine = activity
    ? `\n${ACTIVITY_LABEL[activity.kind]}: ${activity.name}${activity.more > 0 ? ` (+${activity.more})` : ''} · ${formatClock(activitySecs)} hoje`
    : '';
  const title = state?.active
    ? `${state.label || 'Sessão'} · ${formatClock(elapsed)}${state.paused ? ' (em pausa)' : ''}${activityLine}\nClique para abrir · arraste para mover`
    : `G.W.E.N. · nenhuma sessão ativa${activityLine}\nClique para abrir · arraste para mover`;

  async function openApps() {
    if (!isTauri) return;
    const { emitTo } = await import('@tauri-apps/api/event');
    emitTo('main', 'bolha://apps').catch(() => {});
  }

  return (
    <div className={`bubble-stage ${activity ? 'has-activity' : ''}`}>
      {activity && (
        <button
          className="bubble-sat"
          onClick={openApps}
          title={`${ACTIVITY_LABEL[activity.kind]}: ${activity.name} · ${formatClock(activitySecs)} hoje\nClique para ver Apps e jogos`}
          aria-label={`${ACTIVITY_LABEL[activity.kind]}: ${activity.name}. Abrir Apps e jogos`}
        >
          {activity.kind === 'jogos' ? <GameController size={13} weight="fill" /> : <MusicNotes size={13} weight="fill" />}
          <span className="bubble-sat-time tabular">{shortClock(activitySecs)}</span>
        </button>
      )}
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
    </div>
  );
}
