import {
  AppWindow, ChatCircleDots, DiscordLogo, FigmaLogo, MicrosoftTeamsLogo, NotionLogo, SlackLogo, SpotifyLogo, TerminalWindow,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { isTauri } from './native';

/**
 * Lançador de apps (0.8).
 *
 * Cada app é um executável (com argumentos e pasta opcionais) ou um protocolo
 * registrado no Windows (discord://, whatsapp:, spotify:). Ficam no perfil, em
 * `launcher.apps`, junto das categorias do mapeamento e dos alertas.
 */
export const APP_SUGGESTIONS = [
  { id: 'discord', name: 'Discord', target: 'discord://' },
  { id: 'whatsapp', name: 'WhatsApp', target: 'whatsapp:' },
  { id: 'spotify', name: 'Spotify', target: 'spotify:' },
  { id: 'windows-terminal', name: 'Windows Terminal', target: 'wt.exe' },
  { id: 'notion', name: 'Notion', target: 'notion://' },
  { id: 'obsidian', name: 'Obsidian', target: 'obsidian://' },
  { id: 'figma', name: 'Figma', target: 'figma://' },
  { id: 'slack', name: 'Slack', target: 'slack://' },
  { id: 'teams', name: 'Microsoft Teams', target: 'msteams:' },
];

const ICONS = [
  [/discord/i, DiscordLogo],
  [/whatsapp/i, WhatsappLogo],
  [/spotify/i, SpotifyLogo],
  [/notion/i, NotionLogo],
  [/figma/i, FigmaLogo],
  [/slack/i, SlackLogo],
  [/teams/i, MicrosoftTeamsLogo],
  [/telegram|signal/i, ChatCircleDots],
  [/\bwt(\.exe)?$|terminal|powershell|pwsh|cmd\.exe|bash/i, TerminalWindow],
];

/** Ícone pelo nome ou pelo caminho do app */
export function appIcon(app) {
  const text = `${app?.name || ''} ${app?.target || ''}`;
  return ICONS.find(([re]) => re.test(text))?.[1] || AppWindow;
}

export const DEFAULT_TRACKING = {
  enabled: false,
  /** alerta de jogo depois de tantos minutos seguidos (0 desliga) */
  gameAlertMin: 120,
  /** alerta de trabalho no computador depois de tantos minutos sem parar (0 desliga) */
  workAlertMin: 180,
  /** sem teclado nem mouse há mais que isso, o tempo não conta */
  idleMin: 5,
};

/** Junta o que está salvo com os padrões (campos novos aparecem sozinhos) */
export function resolveLauncher(saved) {
  return {
    apps: Array.isArray(saved?.apps) ? saved.apps.filter((a) => a?.id && a?.target) : [],
    categories: saved?.categories && typeof saved.categories === 'object' ? saved.categories : {},
    tracking: { ...DEFAULT_TRACKING, ...(saved?.tracking || {}) },
  };
}

export const newAppId = () => `app-${Math.random().toString(36).slice(2, 9)}`;

/** Abre um app: aceita o objeto do app ou o id dele (com a config do perfil) */
export async function launchApp(appOrId, launcherConfig) {
  const app = typeof appOrId === 'string' ? resolveLauncher(launcherConfig).apps.find((a) => a.id === appOrId) : appOrId;
  if (!app) throw new Error('App não encontrado. Ele foi removido em Ajustes > Apps?');
  if (!isTauri) {
    console.info(`[gwen] (navegador) abriria ${app.name}: ${app.target}`);
    return;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('launch_app', { target: app.target, args: app.args || null, cwd: app.cwd || null });
}
