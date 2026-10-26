/**
 * Órbita da bolinha de Apps e jogos em volta do círculo da bolha.
 *
 * Tudo em px lógicos (CSS). A "moldura" é a janela da bolha sem a bolinha:
 * 76 x 76, com o círculo de 64 px a 6 px da borda. A janela cresce em volta da
 * moldura para caber a bolinha, e (ox, oy) diz onde a moldura ficou dentro dela.
 * Assim a posição salva continua sendo a da moldura e o círculo nunca sai do lugar.
 *
 * Ângulos em graus a partir de cima, no sentido do relógio: 0 em cima, 90 à direita.
 */
export const FRAME = 76;
export const CIRCLE = 64;
export const SAT = 46;
/** distância entre os centros: raio do círculo + raio da bolinha + folga */
export const ORBIT = CIRCLE / 2 + SAT / 2 + 4;
/** sobra em volta da bolinha (sombra e o zoom do hover) */
const PAD = 5;
/** 8 encaixes: em cima, cantos, lados e embaixo */
export const SLOTS = [0, 45, 90, 135, 180, 225, 270, 315];
export const DEFAULT_SLOT = 45; // em cima, à direita

export const ORBIT_KEY = 'gwen.bolha.orbita';
/** onde a moldura está dentro da janela agora; a janela principal usa ao reposicionar a bolha */
export const LAYOUT_KEY = 'gwen.bolha.layout';

const CENTER = FRAME / 2;

/** centro da bolinha relativo ao canto da moldura */
export function satCenter(angle) {
  const rad = (angle * Math.PI) / 180;
  return { x: CENTER + ORBIT * Math.sin(rad), y: CENTER - ORBIT * Math.cos(rad) };
}

/**
 * Tamanho da janela e posição da moldura dentro dela.
 * angle = null: só o círculo. 'drag': espaço para a volta inteira (enquanto arrasta).
 */
export function layoutFor(angle) {
  if (angle === null || angle === undefined) return { width: FRAME, height: FRAME, ox: 0, oy: 0 };
  const reach = ORBIT + SAT / 2 + PAD - CENTER; // quanto a bolinha passa da moldura no pior caso
  if (angle === 'drag') {
    const ext = Math.ceil(reach);
    return { width: FRAME + ext * 2, height: FRAME + ext * 2, ox: ext, oy: ext };
  }
  const c = satCenter(angle);
  const r = SAT / 2 + PAD;
  const minX = Math.floor(Math.min(0, c.x - r));
  const minY = Math.floor(Math.min(0, c.y - r));
  const maxX = Math.ceil(Math.max(FRAME, c.x + r));
  const maxY = Math.ceil(Math.max(FRAME, c.y + r));
  return { width: maxX - minX, height: maxY - minY, ox: -minX, oy: -minY };
}

/** ângulo do ponteiro em volta do centro do círculo (px da janela) */
export function pointerAngle(px, py, layout) {
  const dx = px - (layout.ox + CENTER);
  const dy = py - (layout.oy + CENTER);
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** encaixe mais próximo */
export function snap(angle) {
  return SLOTS.reduce((best, s) => {
    const d = (a) => Math.min(Math.abs(a - angle), 360 - Math.abs(a - angle));
    return d(s) < d(best) ? s : best;
  }, SLOTS[0]);
}

export function savedSlot() {
  try {
    const v = Number(localStorage.getItem(ORBIT_KEY));
    return SLOTS.includes(v) && localStorage.getItem(ORBIT_KEY) !== null ? v : DEFAULT_SLOT;
  } catch {
    return DEFAULT_SLOT;
  }
}
