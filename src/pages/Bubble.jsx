import { useEffect, useRef, useState } from 'react';
import { GameController, MusicNotes } from '@phosphor-icons/react';
import Logo from '../components/Logo';
import { isTauri } from '../lib/native';
import { formatClock } from '../lib/time';
import { POS_KEY } from '../lib/bubble';
import { ACTIVITY_LABEL } from '../lib/nowActivity';
import { CIRCLE, FRAME, LAYOUT_KEY, ORBIT, ORBIT_KEY, SAT, SLOTS, layoutFor, pointerAngle, satCenter, savedSlot, snap } from '../lib/bubbleOrbit';

/**
 * Conteúdo da janela da bolha (0.7). Roda numa janela própria, sem os
 * contextos do app: recebe o estado da sessão por evento e conta os segundos sozinha.
 * Arrastar move a bolha; clicar sem arrastar devolve a janela principal.
 *
 * Com jogo na frente ou mídia tocando, aparece uma bolinha de Apps e jogos colada
 * no círculo (ícone + tempo de hoje). Clicar nela abre o Relatório em Apps e jogos;
 * arrastar gira ela em volta do círculo e, ao soltar, encaixa no ponto mais perto
 * entre 8 (ver bubbleOrbit.js). O lugar fica salvo.
 */
const DRAG_PX = 4;
/** relógio curto para a bolinha (46 px): 05:12 até 1 hora, depois 1h23 */
const shortClock = (secs) => (secs >= 3600 ? `${Math.floor(secs / 3600)}h${String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}` : formatClock(secs));

const saveLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem armazenamento */
  }
};

export default function Bubble() {
  const [state, setState] = useState(null);
  const [, tick] = useState(0);
  const down = useRef(null);
  /** onde a bolinha encaixa (graus) e o ângulo ao vivo enquanto arrasta */
  const [slot, setSlot] = useState(savedSlot);
  const [dragAngle, setDragAngle] = useState(null);
  const satDown = useRef(null);
  /** layout aplicado na janela agora (a moldura do círculo dentro dela) */
  const layoutRef = useRef(layoutFor(null));
  const [layout, setLayout] = useState(layoutRef.current);

  useEffect(() => {
    if (!isTauri) {
      // navegador: estado de exemplo para ver o visual
      setState({ active: true, label: 'Projeto de exemplo', paused: false, elapsed: 1234, sentAt: Date.now(), activity: { kind: 'midia', name: 'YouTube', seconds: 754, more: 0 } });
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
        // lembra onde a bolha ficou: sempre a posição da moldura do círculo, não a da janela
        win.onMoved(async ({ payload }) => {
          const { ox, oy } = layoutRef.current;
          const scale = ox || oy ? (await win.scaleFactor().catch(() => 1)) || 1 : 1;
          saveLocal(POS_KEY, { x: payload.x + Math.round(ox * scale), y: payload.y + Math.round(oy * scale) });
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

  // tamanho da janela: só o círculo, o círculo + bolinha no encaixe, ou a volta inteira enquanto arrasta.
  // A janela anda o mesmo tanto que cresce, então o círculo fica parado na tela.
  const wanted = !activity ? null : dragAngle !== null ? 'drag' : slot;
  useEffect(() => {
    const next = layoutFor(wanted);
    const prev = layoutRef.current;
    if (next.width === prev.width && next.height === prev.height && next.ox === prev.ox && next.oy === prev.oy) return;
    layoutRef.current = next;
    setLayout(next);
    saveLocal(LAYOUT_KEY, { ox: next.ox, oy: next.oy });
    if (!isTauri) return;
    (async () => {
      const { getCurrentWindow, LogicalSize, PhysicalPosition } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      try {
        const scale = (await win.scaleFactor()) || 1;
        const pos = await win.outerPosition();
        const x = pos.x + Math.round((prev.ox - next.ox) * scale);
        const y = pos.y + Math.round((prev.oy - next.oy) * scale);
        const growing = next.width * next.height >= prev.width * prev.height;
        // crescendo: move antes; encolhendo: encolhe antes (evita um quadro com o círculo fora do lugar)
        if (growing) await win.setPosition(new PhysicalPosition(x, y));
        await win.setSize(new LogicalSize(next.width, next.height));
        if (!growing) await win.setPosition(new PhysicalPosition(x, y));
      } catch {
        /* sem permissão ou janela fechando: fica como está */
      }
    })();
  }, [wanted]);

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

  // bolinha: clique abre Apps e jogos; arrastar gira em volta do círculo
  function onSatDown(e) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    satDown.current = { x: e.clientX, y: e.clientY, orbiting: false };
  }
  function onSatMove(e) {
    const d = satDown.current;
    if (!d) return;
    if (!d.orbiting) {
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < DRAG_PX) return;
      d.orbiting = true;
    }
    setDragAngle(pointerAngle(e.clientX, e.clientY, layoutRef.current));
  }
  async function onSatUp(e) {
    const d = satDown.current;
    satDown.current = null;
    if (!d) return;
    if (d.orbiting) {
      const next = snap(pointerAngle(e.clientX, e.clientY, layoutRef.current));
      setSlot(next);
      setDragAngle(null);
      saveLocal(ORBIT_KEY, next);
      return;
    }
    if (isTauri) {
      const { emitTo } = await import('@tauri-apps/api/event');
      emitTo('main', 'bolha://apps').catch(() => {});
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

  // posições dentro da janela (px lógicos)
  const frameX = layout.ox;
  const frameY = layout.oy;
  const circleOffset = (FRAME - CIRCLE) / 2;
  const sat = activity ? satCenter(dragAngle ?? slot) : null;
  const center = FRAME / 2;

  return (
    <div className="bubble-stage">
      {dragAngle !== null && (
        // guia da órbita enquanto arrasta: o caminho e os 8 encaixes
        <svg className="bubble-orbit" style={{ left: frameX + center - ORBIT, top: frameY + center - ORBIT, width: ORBIT * 2, height: ORBIT * 2 }} viewBox={`0 0 ${ORBIT * 2} ${ORBIT * 2}`} aria-hidden="true">
          <circle cx={ORBIT} cy={ORBIT} r={ORBIT - 1} className="bubble-orbit-path" />
          {SLOTS.map((a) => {
            const rad = (a * Math.PI) / 180;
            return <circle key={a} cx={ORBIT + (ORBIT - 1) * Math.sin(rad)} cy={ORBIT - (ORBIT - 1) * Math.cos(rad)} r={a === snap(dragAngle) ? 3 : 1.6} className={`bubble-orbit-slot ${a === snap(dragAngle) ? 'is-target' : ''}`} />;
          })}
        </svg>
      )}
      <button
        className={`bubble ${state?.active ? 'is-active' : ''} ${state?.paused ? 'is-paused' : ''}`}
        style={{ left: frameX + circleOffset, top: frameY + circleOffset }}
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
      {activity && (
        <button
          className={`bubble-sat ${dragAngle !== null ? 'is-orbiting' : ''}`}
          style={{ left: frameX + sat.x - SAT / 2, top: frameY + sat.y - SAT / 2 }}
          onPointerDown={onSatDown}
          onPointerMove={onSatMove}
          onPointerUp={onSatUp}
          onPointerCancel={() => {
            satDown.current = null;
            setDragAngle(null);
          }}
          title={`${ACTIVITY_LABEL[activity.kind]}: ${activity.name} · ${formatClock(activitySecs)} hoje\nClique para ver Apps e jogos · arraste em volta para mudar de lado`}
          aria-label={`${ACTIVITY_LABEL[activity.kind]}: ${activity.name}. Abrir Apps e jogos`}
        >
          {activity.kind === 'jogos' ? <GameController size={13} weight="fill" /> : <MusicNotes size={13} weight="fill" />}
          <span className="bubble-sat-time tabular">{shortClock(activitySecs)}</span>
        </button>
      )}
    </div>
  );
}
