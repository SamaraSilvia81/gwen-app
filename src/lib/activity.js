import { useEffect, useRef, useState } from 'react';
import { Briefcase, ChatsCircle, Code, DotsThreeCircle, GameController, Globe, MusicNotes, PaintBrush, PencilLine } from '@phosphor-icons/react';
import { isTauri } from './native';
import { deviceStore, nowIso } from '../data/store';
import { dayKey } from './habits';

/**
 * Mapeamento de apps e jogos (0.8).
 *
 * A cada 15 s a G.W.E.N. pergunta ao Windows qual app está em primeiro plano
 * (só o executável, nunca o título da janela; num app web instalado, o id de
 * app que o navegador grava na janela), soma o tempo por app e por dia e guarda
 * neste computador (tabela app_usage), mesmo no modo conta. Sem teclado e mouse
 * por alguns minutos, o app da frente para de contar.
 *
 * Também soma o que está tocando pela mídia do Windows (YouTube minimizado,
 * Spotify por baixo), e isso conta mesmo sem teclado e mouse.
 */
export const CATEGORIES = {
  dev: { label: 'Código e terminal', icon: Code, color: 'var(--c-phosphor)' },
  trabalho: { label: 'Trabalho e docs', icon: Briefcase, color: 'color-mix(in srgb, var(--c-phosphor) 70%, var(--c-bone))' },
  navegador: { label: 'Navegador', icon: Globe, color: 'color-mix(in srgb, var(--c-phosphor) 45%, var(--c-surface-alt))' },
  design: { label: 'Design', icon: PaintBrush, color: 'color-mix(in srgb, var(--c-ember) 60%, var(--c-phosphor))' },
  escrita: { label: 'Escrita e notas', icon: PencilLine, color: 'color-mix(in srgb, var(--c-bone) 55%, var(--c-surface-alt))' },
  comunicacao: { label: 'Conversa', icon: ChatsCircle, color: 'color-mix(in srgb, var(--c-ember) 40%, var(--c-surface-alt))' },
  midia: { label: 'Música e vídeo', icon: MusicNotes, color: 'color-mix(in srgb, var(--c-muted) 70%, var(--c-surface-alt))' },
  jogos: { label: 'Jogos', icon: GameController, color: 'var(--c-ember)' },
  outros: { label: 'Outros', icon: DotsThreeCircle, color: 'var(--c-rule-light)' },
};

const BY_EXE = {
  dev: ['code.exe', 'code - insiders.exe', 'cursor.exe', 'windsurf.exe', 'zed.exe', 'idea64.exe', 'webstorm64.exe', 'pycharm64.exe', 'rider64.exe', 'devenv.exe', 'sublime_text.exe', 'notepad++.exe', 'windowsterminal.exe', 'wt.exe', 'powershell.exe', 'pwsh.exe', 'cmd.exe', 'mintty.exe', 'git-bash.exe', 'postman.exe', 'insomnia.exe', 'docker desktop.exe', 'dbeaver.exe', 'github desktop.exe', 'githubdesktop.exe', 'tableplus.exe', 'android studio.exe', 'studio64.exe'],
  trabalho: ['excel.exe', 'powerpnt.exe', 'outlook.exe', 'olk.exe', 'acrobat.exe', 'acrord32.exe', 'sumatrapdf.exe', 'zotero.exe', 'mendeley desktop.exe', 'explorer.exe'],
  navegador: ['chrome.exe', 'msedge.exe', 'firefox.exe', 'opera.exe', 'brave.exe', 'vivaldi.exe', 'arc.exe', 'zen.exe', 'librewolf.exe'],
  design: ['figma.exe', 'photoshop.exe', 'illustrator.exe', 'afterfx.exe', 'premiere pro.exe', 'adobe premiere pro.exe', 'blender.exe', 'krita.exe', 'inkscape.exe', 'gimp-2.10.exe', 'clipstudiopaint.exe', 'penpot.exe'],
  escrita: ['winword.exe', 'obsidian.exe', 'notion.exe', 'onenote.exe', 'typora.exe', 'logseq.exe', 'notepad.exe', 'texstudio.exe', 'overleaf.exe'],
  comunicacao: ['discord.exe', 'whatsapp.exe', 'whatsapp.root.exe', 'slack.exe', 'teams.exe', 'ms-teams.exe', 'telegram.exe', 'zoom.exe', 'signal.exe'],
  midia: ['spotify.exe', 'vlc.exe', 'mpc-hc64.exe', 'music.ui.exe', 'obs64.exe', 'deezer.exe', 'tidal.exe'],
  jogos: ['league of legends.exe', 'leagueclient.exe', 'valorant.exe', 'valorant-win64-shipping.exe', 'robloxplayerbeta.exe', 'minecraft.exe', 'genshinimpact.exe', 'zenlesszonezero.exe', 'starrail.exe', 'osu!.exe', 'fortniteclient-win64-shipping.exe', 'cs2.exe', 'dota2.exe', 'r5apex.exe', 'overwatch.exe', 'eldenring.exe', 'stardew valley.exe', 'hollow knight.exe', 'steam.exe', 'epicgameslauncher.exe', 'battle.net.exe', 'riotclientservices.exe'],
};
const EXE_CATEGORY = Object.fromEntries(Object.entries(BY_EXE).flatMap(([cat, list]) => list.map((exe) => [exe, cat])));
const GAME_FOLDERS = /\\(steamapps\\common|epic games|riot games|xboxgames|gog galaxy\\games|ea games|ubisoft game launcher\\games|hoyoplay\\games)\\/i;
/** a própria G.W.E.N. não conta (ela fica aberta o tempo todo) */
const IGNORE = new Set(['gwen.exe', 'searchhost.exe', 'shellexperiencehost.exe', 'startmenuexperiencehost.exe', 'lockapp.exe', 'applicationframehost.exe']);

/**
 * Apps web instalados (PWA) e apps da Microsoft Store.
 *
 * A janela de um PWA é do msedge.exe/chrome.exe, então o nativo manda junto o
 * AppUserModelID dela (nunca o título). Os formatos que aparecem:
 *   Edge   www.youtube.com-54E21B02_pd8mbgmqs65xy!App   -> "YouTube (app web)"
 *   Chrome Chrome._crx_agimnkijcaahngcdmfeangaknmldooml -> "YouTube (app web)"
 *   Store  4DF9E0F8.Netflix_mcm4njqhnhss8!Netflix.App   -> "Netflix (app)"
 *   Mídia  Spotify.exe                                   -> "Spotify.exe"
 * O ID padrão do navegador (MSEdge, Chrome...) não vira app: é aba comum.
 */
export const WEB_APP_SUFFIX = ' (app web)';
export const STORE_APP_SUFFIX = ' (app)';
/** id do Chrome -> nome, quando o navegador não informa */
const KNOWN_CRX = {
  agimnkijcaahngcdmfeangaknmldooml: 'YouTube',
  cinhimbnkkaeohfgghhklpknlkffjgod: 'YouTube Music',
};
/** domínio do PWA no Edge -> nome */
const KNOWN_HOSTS = {
  'www.youtube.com': 'YouTube',
  'youtube.com': 'YouTube',
  'm.youtube.com': 'YouTube',
  'music.youtube.com': 'YouTube Music',
  'www.netflix.com': 'Netflix',
  'open.spotify.com': 'Spotify',
  'www.twitch.tv': 'Twitch',
  'web.whatsapp.com': 'WhatsApp',
  'discord.com': 'Discord',
  'www.figma.com': 'Figma',
  'www.primevideo.com': 'Prime Video',
  'www.crunchyroll.com': 'Crunchyroll',
  'mail.google.com': 'Gmail',
  'calendar.google.com': 'Google Agenda',
  'docs.google.com': 'Google Docs',
};
const WEB_APP_RULES = [
  [/youtube|netflix|twitch|spotify|deezer|tidal|prime video|disney|crunchyroll|soundcloud/i, 'midia'],
  [/whatsapp|discord|telegram|slack|teams|meet|messenger|instagram/i, 'comunicacao'],
  [/figma|canva|excalidraw|penpot|miro/i, 'design'],
  [/notion|obsidian|google docs|docs|keep|overleaf/i, 'escrita'],
  [/github|gitlab|vercel|supabase|stackblitz|codesandbox|replit/i, 'dev'],
  [/outlook|gmail|calendar|agenda|sheets|planilhas|jira|linear|confluence/i, 'trabalho'],
];
const BROWSER_EXES = new Set(BY_EXE.navegador);

const hostName = (host) => {
  const h = host.toLowerCase();
  if (KNOWN_HOSTS[h]) return KNOWN_HOSTS[h];
  const label = h.replace(/^(www|web|app|m)\./, '').split('.')[0];
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/**
 * Nome com que um AppUserModelID entra no mapeamento, ou null quando é o
 * próprio navegador (ou um formato desconhecido). `name` é o nome que o
 * navegador grava na janela, quando grava.
 */
export function appFromAumid(aumid, name) {
  const id = String(aumid || '').trim();
  if (!id) return null;
  const crx = id.match(/_crx_([a-p]{32})/);
  if (crx) return `${name || KNOWN_CRX[crx[1]] || `App web ${crx[1].slice(0, 6)}`}${WEB_APP_SUFFIX}`;
  const edge = id.match(/^([a-z0-9-]+(?:\.[a-z0-9-]+)+)-[0-9a-f]+_[a-z0-9]+!app$/i);
  if (edge) return `${name || hostName(edge[1])}${WEB_APP_SUFFIX}`;
  if (/\.exe$/i.test(id)) return id.split(/[\\/]/).pop();
  const store = id.match(/^([^!_]+)_[a-z0-9]{13}!/i);
  if (store) return `${name || store[1].split('.').pop()}${STORE_APP_SUFFIX}`;
  return null;
}

/** Nome do app da janela da frente: o PWA quando é um, senão o executável */
export function foregroundName(fg) {
  if (fg?.web_app?.id && BROWSER_EXES.has(String(fg.exe).toLowerCase())) {
    return appFromAumid(fg.web_app.id, fg.web_app.name) || fg.exe;
  }
  return fg.exe;
}

/** Categoria do app: a escolha da pessoa vence a regra automática */
export function classify(exe, path = '', overrides = {}) {
  const key = String(exe || '').toLowerCase();
  if (overrides[key]) return overrides[key];
  const suffix = [WEB_APP_SUFFIX, STORE_APP_SUFFIX].find((sfx) => key.endsWith(sfx));
  if (suffix) {
    const name = key.slice(0, -suffix.length);
    return WEB_APP_RULES.find(([re]) => re.test(name))?.[1] || (suffix === WEB_APP_SUFFIX ? 'navegador' : 'outros');
  }
  if (GAME_FOLDERS.test(path || '')) return 'jogos';
  return EXE_CATEGORY[key] || 'outros';
}

/** Nome amigável a partir do executável: "Code.exe" -> "Code" */
export const appName = (exe) => String(exe || '').replace(/\.exe$/i, '');

/** Nome curto para a interface: "YouTube (app web)" -> "YouTube", "Spotify.exe" -> "Spotify" */
export const shortAppName = (exe) => {
  const name = appName(exe);
  const suffix = [WEB_APP_SUFFIX, STORE_APP_SUFFIX].find((sfx) => name.endsWith(sfx));
  return suffix ? name.slice(0, -suffix.length) : name;
};

const TICK_MS = 15_000;
const FLUSH_MS = 60_000;
/** sem trocar de categoria por mais que isso, a sequência (jogo, trabalho) recomeça */
const STREAK_GAP_S = 5 * 60;

async function foreground() {
  if (!isTauri) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('foreground_app');
}

/** Mídia tocando agora pelo Windows (lista vazia se o nativo não responder) */
async function mediaSessions() {
  if (!isTauri) return [];
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('media_sessions').catch(() => []);
}

/**
 * Liga o mapeamento na janela principal. `config` é o launcher.tracking do perfil.
 * `onAlert(kind, minutes)` dispara quando passa do limite de jogo ou de trabalho.
 * Devolve `playing`: os apps tocando agora (mídia do Windows), para a topbar.
 */
export function useActivityTracker({ tracking, overrides, onAlert }) {
  const pending = useRef(new Map()); // id -> { day, exe, path, category, seconds }
  const known = useRef(new Map()); // id -> seconds já gravados
  const streak = useRef({ game: 0, work: 0, lastGameAt: 0, lastWorkAt: 0, gameAlerted: 0, workAlerted: 0 });
  const latest = useRef({});
  latest.current = { tracking, overrides, onAlert };
  /** apps tocando agora pela mídia do Windows (nomes do mapeamento), para a topbar */
  const [playing, setPlaying] = useState([]);

  useEffect(() => {
    if (!tracking.enabled || !isTauri) {
      setPlaying([]);
      return;
    }
    let alive = true;

    // linhas de hoje, para somar em cima do que já existe
    const today = dayKey(new Date());
    deviceStore
      .all('app_usage')
      .then((rows) => rows.filter((r) => r.day === today).forEach((r) => known.current.set(r.id, r.seconds || 0)))
      .catch(() => {});

    async function tick() {
      const { tracking: cfg, overrides: ov, onAlert: alert } = latest.current;
      let fg = null;
      let media = [];
      try {
        [fg, media] = await Promise.all([foreground(), mediaSessions()]);
      } catch {
        return;
      }
      if (!alive) return;
      const now = Date.now();
      const day = dayKey(new Date());
      const step = TICK_MS / 1000;
      const add = (name, path) => {
        const exe = name.toLowerCase();
        const category = classify(exe, path, ov);
        const id = `${day}::${exe}`;
        const row = pending.current.get(id) || { id, day, exe: name, path, category, seconds: 0 };
        row.seconds += step;
        row.category = category;
        pending.current.set(id, row);
        return category;
      };

      // janela da frente: o PWA (YouTube instalado etc.) conta como app próprio, não como o navegador
      const idle = !fg?.exe || fg.idle_seconds >= (cfg.idleMin || 5) * 60;
      const ignored = !fg?.exe || IGNORE.has(fg.exe.toLowerCase());
      const fgName = !idle && !ignored ? foregroundName(fg) : null;
      const category = fgName ? add(fgName, fg.path) : null;

      // mídia tocando (YouTube minimizado, Spotify por baixo): conta mesmo sem teclado e mouse,
      // uma vez por app e sem repetir o da frente. Aba comum do navegador não entra.
      const counted = new Set(fgName ? [fgName.toLowerCase()] : []);
      const nowPlaying = [];
      for (const m of media || []) {
        if (!m?.playing) continue;
        const name = appFromAumid(m.app_id);
        if (!name || IGNORE.has(name.toLowerCase()) || nowPlaying.includes(name)) continue;
        nowPlaying.push(name);
        if (counted.has(name.toLowerCase())) continue;
        counted.add(name.toLowerCase());
        add(name, '');
      }
      // só troca o estado quando muda, para a topbar não renderizar a cada 15 s à toa
      setPlaying((prev) => (prev.join('|') === nowPlaying.join('|') ? prev : nowPlaying));
      if (!category) return;

      // sequências para os alertas: jogo e trabalho (código + trabalho + design + escrita)
      const s = streak.current;
      if (category === 'jogos') {
        s.game = now - s.lastGameAt > STREAK_GAP_S * 1000 ? step : s.game + step;
        s.lastGameAt = now;
      }
      if (['dev', 'trabalho', 'design', 'escrita'].includes(category)) {
        s.work = now - s.lastWorkAt > STREAK_GAP_S * 1000 ? step : s.work + step;
        s.lastWorkAt = now;
      }
      if (s.game === step) s.gameAlerted = 0;
      if (s.work === step) s.workAlerted = 0;
      const gameMin = Math.floor(s.game / 60);
      const workMin = Math.floor(s.work / 60);
      // primeiro aviso no limite, depois a cada hora a mais
      if (cfg.gameAlertMin > 0 && gameMin >= (s.gameAlerted ? s.gameAlerted + 60 : cfg.gameAlertMin)) {
        s.gameAlerted = gameMin;
        alert?.('jogos', gameMin);
      }
      if (cfg.workAlertMin > 0 && workMin >= (s.workAlerted ? s.workAlerted + 60 : cfg.workAlertMin)) {
        s.workAlerted = workMin;
        alert?.('trabalho', workMin);
      }
    }

    async function flush() {
      const rows = [...pending.current.values()];
      pending.current.clear();
      for (const r of rows) {
        const before = known.current.get(r.id);
        const seconds = Math.round((before || 0) + r.seconds);
        try {
          if (before === undefined) {
            await deviceStore.insert('app_usage', { id: r.id, day: r.day, exe: r.exe, path: r.path, category: r.category, seconds, updated_at: nowIso() });
          } else {
            await deviceStore.update('app_usage', r.id, { seconds, category: r.category, updated_at: nowIso() });
          }
          known.current.set(r.id, seconds);
        } catch {
          // falhou (ex.: linha criada em outra janela): tenta como atualização na próxima
          known.current.set(r.id, seconds);
        }
      }
    }

    const t = setInterval(tick, TICK_MS);
    const f = setInterval(flush, FLUSH_MS);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(f);
      flush();
    };
  }, [tracking.enabled]);

  return { playing };
}

/** Lê o tempo por app entre duas datas (dias no formato AAAA-MM-DD, inclusive) */
export async function usageBetween(fromDay, toDay, overrides = {}) {
  const rows = await deviceStore.all('app_usage').catch(() => []);
  return rows
    .filter((r) => r.day >= fromDay && r.day <= toDay)
    .map((r) => ({ ...r, category: overrides[String(r.exe).toLowerCase()] || r.category || classify(r.exe, r.path) }));
}
