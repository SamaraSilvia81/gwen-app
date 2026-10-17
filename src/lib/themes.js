/**
 * Temas de cor da G.W.E.N.
 *
 * Os nomes dos tokens seguem o padrão do globals.css da devs_sam
 * (--c-void, --c-surface, --c-phosphor, --c-ember...), então qualquer
 * tema novo é só um objeto com estas chaves.
 *
 * Cor e estilo são eixos separados:
 *   - cor:    noir | devs_sam | custom   -> tokens --c-*
 *   - estilo: moderno | terminal         -> atributo data-style no <html>
 */

export const COLOR_TOKENS = [
  { key: 'void', label: 'Fundo', hint: 'cor de fundo da janela' },
  { key: 'surface', label: 'Superfície', hint: 'cards e painéis' },
  { key: 'surfaceAlt', label: 'Superfície alternativa', hint: 'inputs, áreas destacadas' },
  { key: 'phosphor', label: 'Acento principal', hint: 'botões, seleção, logo' },
  { key: 'ember', label: 'Acento secundário', hint: 'barra de energia, CTA principal' },
  { key: 'bone', label: 'Texto', hint: 'cor do texto principal' },
  { key: 'muted', label: 'Texto apagado', hint: 'legendas e metadados' },
  { key: 'rule', label: 'Linhas', hint: 'bordas e divisores' },
  { key: 'ruleLight', label: 'Linhas em destaque', hint: 'bordas no hover/foco' },
];

export const PRESETS = {
  noir: {
    label: 'Noir',
    description: 'Padrão da G.W.E.N. Preto, grafite e branco.',
    colors: {
      void: '#0A0A0B',
      surface: '#121214',
      surfaceAlt: '#19191C',
      phosphor: '#9A9AA3',
      ember: '#FFFFFF',
      bone: '#EDEBE7',
      muted: '#77777F',
      rule: '#26262A',
      ruleLight: '#34343A',
    },
  },
  devs_sam: {
    label: 'devs_sam',
    description: 'Identidade da Sams. Roxo, magenta e bone sobre void.',
    colors: {
      void: '#0B0B0B',
      surface: '#141413',
      surfaceAlt: '#1A1A18',
      phosphor: '#972fff',
      ember: '#ff22d6',
      bone: '#E8E4DE',
      muted: '#6B6B63',
      rule: '#252523',
      ruleLight: '#2E2E2A',
      // decisão da identidade: texto branco sobre o magenta, como no portfólio
      onEmber: '#FFFFFF',
      onPhosphor: '#FFFFFF',
    },
  },
};

export const STYLES = {
  moderno: { label: 'Moderno', description: 'Cantos arredondados, vidro na navegação e no modo pausa.' },
  terminal: { label: 'Terminal', description: 'Tudo em mono, cantos retos, sem vidro. Vibe dev.' },
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export const isHex = (v) => HEX.test(String(v || '').trim());

function expandHex(hex) {
  const h = hex.replace('#', '');
  return h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
}

/** Luminância relativa (WCAG) para decidir se o texto sobre o acento é claro ou escuro */
function luminance(hex) {
  const h = expandHex(hex);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Escolhe texto claro ou escuro pelo maior contraste (WCAG) */
export function onColor(hex) {
  const l = luminance(hex);
  const withWhite = 1.05 / (l + 0.05);
  const withDark = (l + 0.05) / (luminance('#0A0A0B') + 0.05);
  return withDark >= withWhite ? '#0A0A0B' : '#FFFFFF';
}

/** Resolve as cores finais: preset ou personalizado (com fallback para o devs_sam) */
export function resolveColors(themeId, custom) {
  if (themeId === 'custom') {
    const { onEmber, onPhosphor, ...base } = PRESETS.devs_sam.colors;
    const merged = { ...base };
    for (const { key } of COLOR_TOKENS) {
      if (custom && isHex(custom[key])) merged[key] = custom[key];
    }
    return merged;
  }
  return (PRESETS[themeId] || PRESETS.noir).colors;
}

const toVar = (key) => '--c-' + key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

/** Aplica tema e estilo no <html>. Os tokens derivados (color-mix) recalculam sozinhos. */
export function applyAppearance({ theme = 'noir', style = 'moderno', custom = null } = {}) {
  const root = document.documentElement;
  const colors = resolveColors(theme, custom);
  for (const { key } of COLOR_TOKENS) root.style.setProperty(toVar(key), colors[key]);
  root.style.setProperty('--c-on-phosphor', colors.onPhosphor || onColor(colors.phosphor));
  root.style.setProperty('--c-on-ember', colors.onEmber || onColor(colors.ember));
  root.dataset.theme = theme;
  root.dataset.style = STYLES[style] ? style : 'moderno';
}

const STORAGE_KEY = 'gwen.appearance';

export function loadLocalAppearance() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalAppearance(appearance) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    /* sem storage: segue só com o perfil */
  }
}
