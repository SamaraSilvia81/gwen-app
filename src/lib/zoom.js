import { useEffect } from 'react';
import { isTauri } from './native';

/**
 * Escala da interface (0.7).
 *
 * No app usa o zoom da própria webview (setZoom do Tauri): tudo escala junto,
 * inclusive as quebras de layout, como o Ctrl + / Ctrl - de um navegador.
 * No navegador (yarn dev) cai no `zoom` do CSS, só para trabalhar na interface.
 *
 * A escala vale para este computador (localStorage), não para o perfil: a mesma
 * pessoa pode querer 85% no notebook e 100% no monitor grande.
 */
export const ZOOM_STEPS = [0.75, 0.8, 0.85, 0.9, 1, 1.1, 1.25];
export const DEFAULT_ZOOM = 0.9;
const KEY = 'gwen.zoom';
export const ZOOM_EVENT = 'gwen:zoom';

export function loadZoom() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return ZOOM_STEPS.includes(v) ? v : DEFAULT_ZOOM;
  } catch {
    return DEFAULT_ZOOM;
  }
}

export async function applyZoom(value) {
  const z = ZOOM_STEPS.includes(value) ? value : DEFAULT_ZOOM;
  try {
    localStorage.setItem(KEY, String(z));
  } catch {
    /* sem armazenamento: vale só nesta abertura */
  }
  if (isTauri) {
    try {
      const { getCurrentWebview } = await import('@tauri-apps/api/webview');
      await getCurrentWebview().setZoom(z);
    } catch (err) {
      console.warn('[gwen] zoom', err);
    }
  } else {
    document.documentElement.style.zoom = String(z);
  }
  window.dispatchEvent(new CustomEvent(ZOOM_EVENT, { detail: z }));
  return z;
}

/** Passo seguinte (+1) ou anterior (-1) da escala */
export function stepZoom(current, dir) {
  const i = ZOOM_STEPS.indexOf(current);
  const at = i === -1 ? ZOOM_STEPS.indexOf(DEFAULT_ZOOM) : i;
  return ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, at + dir))];
}

export const zoomLabel = (z) => `${Math.round(z * 100)}%`;

/**
 * Ctrl + = (ou +) aumenta, Ctrl + - diminui, Ctrl + 0 volta para o padrão.
 * Ctrl + roda do mouse também. Avisa a escala nova com um toast.
 */
export function useZoomHotkeys(toast) {
  useEffect(() => {
    let current = loadZoom();
    applyZoom(current);

    const set = (z) => {
      if (z === current) return;
      current = z;
      applyZoom(z);
      toast?.(`Escala ${zoomLabel(z)}${z === DEFAULT_ZOOM ? ' (padrão)' : ''}`);
    };
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd') {
        e.preventDefault();
        set(stepZoom(current, 1));
      } else if (e.key === '-' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        set(stepZoom(current, -1));
      } else if (e.key === '0' || e.code === 'Numpad0') {
        e.preventDefault();
        set(DEFAULT_ZOOM);
      }
    };
    let wheelLock = 0;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const t = Date.now();
      if (t - wheelLock < 120) return;
      wheelLock = t;
      set(stepZoom(current, e.deltaY < 0 ? 1 : -1));
    };
    // mudança vinda das Configurações
    const onExternal = (e) => {
      current = e.detail;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener(ZOOM_EVENT, onExternal);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener(ZOOM_EVENT, onExternal);
    };
  }, [toast]);
}
