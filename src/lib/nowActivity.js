/**
 * "Agora" do mapeamento de apps e jogos: o que a topbar e a bolha mostram.
 *
 * Sem dependências de propósito: a janela da bolha importa este arquivo e não
 * pode puxar o banco nem o resto do app.
 *   - jogo na frente vence (é o que pede atenção: alerta de horas jogando)
 *   - senão, a mídia tocando (YouTube minimizado, Spotify por baixo)
 */

/** "YouTube (app web)" -> "YouTube", "Netflix (app)" -> "Netflix", "cs2.exe" -> "cs2" */
export const shortName = (n) =>
  String(n || '')
    .replace(/\.exe$/i, '')
    .replace(/ \((app web|app)\)$/i, '');

/**
 * `game` e cada item de `playing` são { name, seconds, at }: tempo de hoje do app
 * no instante `at`. Devolve { kind: 'jogos' | 'midia', name, seconds, at, more } ou null.
 */
export function currentActivity({ playing = [], game = null } = {}) {
  if (game) return { kind: 'jogos', name: shortName(game.name), seconds: game.seconds, at: game.at, more: 0 };
  if (playing.length) {
    const p = playing[0];
    return { kind: 'midia', name: shortName(p.name), seconds: p.seconds, at: p.at, more: playing.length - 1 };
  }
  return null;
}

/** Tempo de hoje andando por segundo entre um ciclo do mapeamento (15 s) e outro */
export const activitySeconds = (a, now = Date.now()) => (a?.seconds || 0) + Math.max(0, Math.floor((now - (a?.at || now)) / 1000));

export const ACTIVITY_LABEL = { jogos: 'Jogando', midia: 'Tocando' };
