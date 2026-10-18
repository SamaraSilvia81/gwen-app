/**
 * Regras das pastas, links e frentes de um projeto.
 *
 * Pastas e links ficam em JSON no próprio projeto. Desde a 0.5:
 * - uma pasta pode ter várias ações (`actions`: VS Code, Explorer, Git Bash).
 *   Projetos antigos têm só `action`; o campo continua sendo gravado com a
 *   primeira ação, para versões anteriores do app seguirem lendo.
 * - pastas e links podem ter uma `front` (frente). Sem frente, o item vale
 *   para todas. As frentes do projeto são as que aparecem nos itens.
 * - uma pasta pode ter um `command` (ex.: yarn dev), rodado num terminal
 *   novo dentro dela no Começar agora (0.6).
 */

export const folderActions = (f) => (f?.actions?.length ? f.actions : [f?.action || 'vscode']);

export function projectFronts(project) {
  const seen = [];
  for (const item of [...(project?.folders || []), ...(project?.links || [])]) {
    const name = item.front?.trim();
    if (name && !seen.some((s) => s.toLowerCase() === name.toLowerCase())) seen.push(name);
  }
  return seen;
}

/** O item abre nessa frente? `front` vazio/null = abrir tudo. */
export const inFront = (item, front) => !front || !item.front?.trim() || item.front.trim().toLowerCase() === front.toLowerCase();

/** Limpa uma pasta para gravar */
export function cleanFolder(f) {
  const actions = folderActions(f);
  return {
    label: f.label?.trim() || '',
    path: f.path.trim(),
    actions,
    action: actions[0],
    on_launch: !!f.on_launch,
    front: f.front?.trim() || '',
    command: f.command?.trim() || '',
  };
}

export const cleanLink = (l) => ({
  label: l.label?.trim() || '',
  url: l.url.trim(),
  on_launch: !!l.on_launch,
  front: l.front?.trim() || '',
});
