/**
 * Issues do GitHub nas tarefas (0.9).
 *
 * Leitura só: a G.W.E.N. importa e atualiza as Issues como tarefas, mas não
 * escreve no GitHub. O token é opcional (repositórios públicos funcionam sem,
 * com limite de 60 consultas por hora) e fica só neste computador.
 */
const TOKEN_KEY = 'gwen.github.token';

export function githubToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setGithubToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token.trim());
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sem armazenamento */
  }
}

/** "https://github.com/dona/repo(.git)" -> { owner, repo } */
export function parseRepo(url) {
  const m = String(url || '').match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/#?].*)?$/i);
  return m ? { owner: m[1], repo: m[2] } : null;
}

/** Repositório do GitHub de um projeto, pelos links cadastrados */
export function projectRepo(project) {
  for (const l of project?.links || []) {
    const r = parseRepo(l.url);
    if (r) return r;
  }
  return null;
}

/** Busca as Issues (sem pull requests), até 300 */
export async function fetchIssues({ owner, repo }) {
  const token = githubToken();
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const out = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}`, { headers });
    if (res.status === 404) throw new Error(`Não achei ${owner}/${repo}. Se o repositório for privado, cole um token em Ajustes, Integrações.`);
    if (res.status === 401) throw new Error('O token do GitHub foi recusado. Confira em Ajustes, Integrações.');
    if (res.status === 403) throw new Error('O GitHub limitou as consultas. Com um token em Ajustes, Integrações, o limite sobe.');
    if (!res.ok) throw new Error(`GitHub respondeu ${res.status}.`);
    const list = await res.json();
    out.push(...list.filter((i) => !i.pull_request));
    if (list.length < 100) break;
  }
  return out;
}
