import { useEffect, useRef } from 'react';
import { Briefcase, ChatsCircle, Code, DotsThreeCircle, GameController, Globe, MusicNotes, PaintBrush, PencilLine } from '@phosphor-icons/react';
import { isTauri } from './native';
import { deviceStore, nowIso } from '../data/store';
import { dayKey } from './habits';

/**
 * Mapeamento de apps e jogos (0.8).
 *
 * A cada 15 s a G.W.E.N. pergunta ao Windows qual app está em primeiro plano
 * (só o executável, nunca o título da janela), soma o tempo por app e por dia
 * e guarda neste computador (tabela app_usage), mesmo no modo conta.
 * Sem teclado e mouse por alguns minutos, o tempo para de contar.
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

/** Categoria do app: a escolha da pessoa vence a regra automática */
export function classify(exe, path = '', overrides = {}) {
  const key = String(exe || '').toLowerCase();
  if (overrides[key]) return overrides[key];
  if (GAME_FOLDERS.test(path || '')) return 'jogos';
  return EXE_CATEGORY[key] || 'outros';
}

/** Nome amigável a partir do executável: "Code.exe" -> "Code" */
export const appName = (exe) => String(exe || '').replace(/\.exe$/i, '');

const TICK_MS = 15_000;
const FLUSH_MS = 60_000;
/** sem trocar de categoria por mais que isso, a sequência (jogo, trabalho) recomeça */
const STREAK_GAP_S = 5 * 60;

async function foreground() {
  if (!isTauri) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke('foreground_app');
}

/**
 * Liga o mapeamento na janela principal. `config` é o launcher.tracking do perfil.
 * `onAlert(kind, minutes)` dispara quando passa do limite de jogo ou de trabalho.
 */
export function useActivityTracker({ tracking, overrides, onAlert }) {
  const pending = useRef(new Map()); // id -> { day, exe, path, category, seconds }
  const known = useRef(new Map()); // id -> seconds já gravados
  const streak = useRef({ game: 0, work: 0, lastGameAt: 0, lastWorkAt: 0, gameAlerted: 0, workAlerted: 0 });
  const latest = useRef({});
  latest.current = { tracking, overrides, onAlert };

  useEffect(() => {
    if (!tracking.enabled || !isTauri) return;
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
      try {
        fg = await foreground();
      } catch {
        return;
      }
      if (!alive || !fg?.exe) return;
      const now = Date.now();
      const idle = fg.idle_seconds >= (cfg.idleMin || 5) * 60;
      const exe = fg.exe.toLowerCase();
      if (idle || IGNORE.has(exe)) return;
      const category = classify(exe, fg.path, ov);
      const day = dayKey(new Date());
      const id = `${day}::${exe}`;
      const row = pending.current.get(id) || { id, day, exe: fg.exe, path: fg.path, category, seconds: 0 };
      row.seconds += TICK_MS / 1000;
      row.category = category;
      pending.current.set(id, row);

      // sequências para os alertas: jogo e trabalho (código + trabalho + design + escrita)
      const s = streak.current;
      const step = TICK_MS / 1000;
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
}

/** Lê o tempo por app entre duas datas (dias no formato AAAA-MM-DD, inclusive) */
export async function usageBetween(fromDay, toDay, overrides = {}) {
  const rows = await deviceStore.all('app_usage').catch(() => []);
  return rows
    .filter((r) => r.day >= fromDay && r.day <= toDay)
    .map((r) => ({ ...r, category: overrides[String(r.exe).toLowerCase()] || r.category || classify(r.exe, r.path) }));
}
