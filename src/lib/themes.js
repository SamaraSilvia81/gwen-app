/**
 * Temas de cor da G.W.E.N.
 *
 * A identidade do sistema é Noir: preto, branco e cinzas, inclusive no logo.
 * Qualquer outra identidade é do usuário, criada no tema Personalizado
 * (e pode ser exportada/importada em JSON para compartilhar).
 *
 * Os nomes dos tokens seguem o padrão --c-void, --c-surface, --c-phosphor,
 * --c-ember... São três eixos independentes:
 *   - cor:    noir | custom              -> tokens --c-*
 *   - modo:   escuro | claro | sistema   -> qual paleta da cor (data-mode no <html>)
 *   - estilo: moderno | terminal         -> atributo data-style no <html>
 */

export const COLOR_TOKENS = [
  { key: 'void', label: 'Fundo', hint: 'cor de fundo da janela' },
  { key: 'surface', label: 'Superfície', hint: 'cards e painéis' },
  { key: 'surfaceAlt', label: 'Superfície alternativa', hint: 'inputs, áreas destacadas' },
  { key: 'phosphor', label: 'Acento principal', hint: 'seleção, status ativo, logo' },
  { key: 'ember', label: 'Acento secundário', hint: 'Codar agora, barra de energia' },
  { key: 'bone', label: 'Texto', hint: 'cor do texto principal' },
  { key: 'muted', label: 'Texto apagado', hint: 'legendas e metadados' },
  { key: 'rule', label: 'Linhas', hint: 'bordas e divisores' },
  { key: 'ruleLight', label: 'Linhas em destaque', hint: 'bordas no hover/foco' },
];

/** Chaves opcionais, aceitas só via JSON: forçam a cor do texto sobre os acentos */
const OPTIONAL_KEYS = ['onPhosphor', 'onEmber'];

export const NOIR = {
  label: 'Noir',
  description: 'A identidade da G.W.E.N. Preto, branco e cinzas.',
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
  // no Noir o logo é branco com a carga em cinza
  logo: { body: '#EDEBE7', charge: '#77777F' },
};

/** Noir claro: mesma identidade, papel em vez de tinta */
export const NOIR_LIGHT = {
  colors: {
    void: '#F4F3F0',
    surface: '#FFFFFF',
    surfaceAlt: '#ECEAE6',
    phosphor: '#5E5E66',
    ember: '#0A0A0B',
    bone: '#0A0A0B',
    muted: '#74747C',
    rule: '#DAD8D3',
    ruleLight: '#C6C3BD',
  },
  logo: { body: '#0A0A0B', charge: '#8A8A90' },
};

export const MODES = {
  escuro: { label: 'Escuro' },
  claro: { label: 'Claro' },
  sistema: { label: 'Sistema' },
};

export const THEMES = {
  noir: NOIR,
  custom: { label: 'Personalizado', description: 'Sua identidade. Cada cor por HEX, ou importe um tema em JSON.' },
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

/** Luminância relativa (WCAG) */
function luminance(hex) {
  const h = expandHex(hex);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Escolhe texto claro ou escuro pelo maior contraste */
export function onColor(hex) {
  const l = luminance(hex);
  const withWhite = 1.05 / (l + 0.05);
  const withDark = (l + 0.05) / (luminance('#0A0A0B') + 0.05);
  return withDark >= withWhite ? '#0A0A0B' : '#FFFFFF';
}

const ALL_KEYS = () => [...COLOR_TOKENS.map((t) => t.key), ...OPTIONAL_KEYS];

function pickHex(obj) {
  const out = {};
  if (!obj) return out;
  for (const key of ALL_KEYS()) if (isHex(obj[key])) out[key] = obj[key];
  return out;
}

/** escuro | claro, resolvendo "sistema" pela preferência do Windows */
export function effectiveMode(mode) {
  if (mode === 'claro' || mode === 'escuro') return mode;
  const prefersLight = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'claro' : 'escuro';
}

/**
 * Cores finais.
 * - Noir: paleta escura ou clara do sistema.
 * - Personalizado escuro: Noir escuro + as cores do usuário.
 * - Personalizado claro: Noir claro + a paleta clara do usuário (custom.light).
 *   Sem paleta clara definida, usa os acentos da escura sobre o papel do Noir claro.
 */
export function resolveColors(themeId, custom, mode = 'escuro') {
  const light = effectiveMode(mode) === 'claro';
  const base = light ? NOIR_LIGHT.colors : NOIR.colors;
  if (themeId !== 'custom') return { ...base };
  if (!light) return { ...base, ...pickHex(custom) };
  const lightPalette = pickHex(custom?.light);
  if (Object.keys(lightPalette).length) return { ...base, ...lightPalette };
  const dark = pickHex(custom);
  const accents = {};
  for (const k of ['phosphor', 'ember', 'onPhosphor', 'onEmber']) if (dark[k]) accents[k] = dark[k];
  return { ...base, ...accents };
}

const toVar = (key) => '--c-' + key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

/** Aplica tema e estilo no <html>. Os tokens derivados (color-mix) recalculam sozinhos. */
let lastAppearance = null;

export function applyAppearance({ theme = 'noir', style = 'moderno', custom = null, mode = 'escuro' } = {}) {
  lastAppearance = { theme, style, custom, mode };
  const root = document.documentElement;
  const t = THEMES[theme] ? theme : 'noir';
  const m = effectiveMode(mode);
  const colors = resolveColors(t, custom, m);
  for (const { key } of COLOR_TOKENS) root.style.setProperty(toVar(key), colors[key]);
  root.style.setProperty('--c-on-phosphor', colors.onPhosphor || onColor(colors.phosphor));
  root.style.setProperty('--c-on-ember', colors.onEmber || onColor(colors.ember));
  const noirLogo = m === 'claro' ? NOIR_LIGHT.logo : NOIR.logo;
  const logo = t === 'noir' ? noirLogo : { body: colors.phosphor, charge: colors.ember };
  root.style.setProperty('--c-logo', logo.body);
  root.style.setProperty('--c-logo-charge', logo.charge);
  root.dataset.theme = t;
  root.dataset.mode = m;
  root.style.colorScheme = m === 'claro' ? 'light' : 'dark';
  root.dataset.style = STYLES[style] ? style : 'moderno';
}

// no modo "sistema", acompanha a troca de tema do Windows sem precisar reabrir
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => {
    if (lastAppearance?.mode === 'sistema') applyAppearance(lastAppearance);
  });
}

/* ─── IMPORTAR / EXPORTAR ─── */

export function exportTheme(name, colors, lightColors) {
  const out = { gwenTheme: 1, name: name || 'Meu tema', ...pickHex(colors) };
  const light = pickHex(lightColors);
  if (Object.keys(light).length) out.light = light;
  return JSON.stringify(out, null, 2);
}

/** Lê um tema colado. Lança erro legível se não for válido. */
export function parseTheme(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Isso não é um JSON válido.');
  }
  const colors = pickHex(data);
  const light = pickHex(data.light);
  if (Object.keys(colors).length === 0) throw new Error('Nenhuma cor válida encontrada no JSON.');
  return { name: typeof data.name === 'string' ? data.name : '', colors, light };
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
