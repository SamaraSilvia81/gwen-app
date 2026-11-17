/**
 * Ambientes de uso (0.9.2, ADR-015).
 *
 * Cada ambiente diz o que a G.W.E.N. oferece: ações ao abrir uma pasta, apps
 * sugeridos, exemplos de texto e dois recursos de TI (comando ao começar e
 * Issues do GitHub). As telas consultam este arquivo; nenhuma decide sozinha
 * o que é "de TI". O núcleo (sessões, tempo, tarefas, pausa, status) é igual
 * para todos. O ambiente só filtra o que é oferecido: nenhum dado é apagado.
 *
 * A pessoa marca um ou mais ambientes (`profile.environments`, lista de ids).
 * Sem nada marcado, vale Geral.
 */

/** Ordem em que as ações aparecem ao abrir uma pasta */
const ACTION_ORDER = ['vscode', 'explorer', 'gitbash', 'terminal', 'powershell'];

export const ENVIRONMENTS = {
  geral: {
    id: 'geral',
    label: 'Geral',
    hint: 'Usar o computador para trabalhar no geral',
    adds: 'Pastas no Explorer; apps como Word, Excel e WhatsApp',
    folderActions: ['explorer'],
    startCommand: false,
    githubIssues: false,
    apps: ['word', 'excel', 'edge', 'whatsapp', 'spotify', 'canva', 'discord', 'slack', 'teams'],
    examples: { project: 'Relatório do mês', path: 'C:\\Trabalho\\...' },
  },
  ti: {
    id: 'ti',
    label: 'TI',
    hint: 'Desenvolvimento, dados, infraestrutura e suporte',
    adds: 'VS Code e terminais nas pastas; comando ao começar; Issues do GitHub nas tarefas',
    folderActions: ['vscode', 'explorer', 'gitbash', 'terminal', 'powershell'],
    startCommand: true,
    githubIssues: true,
    apps: ['vscode', 'windows-terminal', 'docker', 'dbeaver', 'postman', 'powerbi', 'discord', 'slack', 'teams'],
    examples: { project: 'CuraData', path: 'C:\\Projetos\\...' },
  },
  design: {
    id: 'design',
    label: 'Design',
    hint: 'Interface, gráfico e vídeo',
    adds: 'Pastas no Explorer; apps como Figma, Photoshop e Premiere',
    folderActions: ['explorer'],
    startCommand: false,
    githubIssues: false,
    apps: ['figma', 'photoshop', 'illustrator', 'premiere', 'blender', 'canva'],
    examples: { project: 'Identidade visual', path: 'C:\\Design\\...' },
  },
  academico: {
    id: 'academico',
    label: 'Acadêmico',
    hint: 'Estudo, pesquisa e pós-graduação',
    adds: 'Pastas no Explorer; apps como Zotero, Overleaf, Obsidian e Notion',
    folderActions: ['explorer'],
    startCommand: false,
    githubIssues: false,
    apps: ['zotero', 'word', 'overleaf', 'obsidian', 'notion', 'canva'],
    examples: { project: 'Capítulo 2', path: 'C:\\Mestrado\\...' },
  },
};

export const ENVIRONMENT_ORDER = ['geral', 'ti', 'design', 'academico'];

/** Ids válidos, sem repetir, na ordem em que foram marcados. Vazio vira Geral. */
export function resolveEnvironments(saved) {
  const ids = Array.isArray(saved) ? saved.filter((id) => ENVIRONMENTS[id]) : [];
  const unique = [...new Set(ids)];
  return unique.length ? unique : ['geral'];
}

/**
 * O que os ambientes marcados oferecem, juntos:
 * - folderActions: união das ações (o Explorer sempre existe)
 * - defaultAction: VS Code se TI estiver marcado; senão, Explorer
 * - startCommand / githubIssues: ligados se algum ambiente ligar
 * - apps: união dos ids de apps sugeridos, sem repetir
 * - examples: os do primeiro ambiente marcado
 */
export function environmentTraits(saved) {
  const ids = resolveEnvironments(saved);
  const envs = ids.map((id) => ENVIRONMENTS[id]);
  const wanted = new Set(['explorer', ...envs.flatMap((e) => e.folderActions)]);
  return {
    ids,
    folderActions: ACTION_ORDER.filter((a) => wanted.has(a)),
    defaultAction: ids.includes('ti') ? 'vscode' : 'explorer',
    startCommand: envs.some((e) => e.startCommand),
    githubIssues: envs.some((e) => e.githubIssues),
    apps: [...new Set(envs.flatMap((e) => e.apps))],
    examples: envs[0].examples,
  };
}
