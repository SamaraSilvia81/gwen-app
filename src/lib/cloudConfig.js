/**
 * Conexão com o Supabase e modo conta (0.4).
 *
 * O instalador público não leva chave nenhuma. Quem quiser usar a própria
 * nuvem cola a URL e a chave anon em Configurações, uma vez, e elas ficam
 * guardadas neste computador (o armazenamento do app não é tocado por
 * atualizações, ver ADR-009). O .env não é usado.
 *
 * Duas coisas separadas:
 *  - conexão: para onde o app fala (URL, chave anon, schema)
 *  - modo conta: se os dados da pessoa ficam na nuvem (em vez do SQLite)
 */
const CONN_KEY = 'gwen.cloud.conn';
const ACCOUNT_KEY = 'gwen.cloud.account';

/** Guarda quem acabou de entrar, para o app mostrar a confirmação depois de recarregar */
export const WELCOME_KEY = 'gwen.welcomeAccount';

/**
 * Pedido de entrada na conta em andamento. No navegador, o login com Google sai da
 * página e volta recarregando tudo; este marcador (que sobrevive à ida e volta)
 * diz ao app que, ao voltar com sessão, deve ligar o modo conta.
 */
export const PENDING_KEY = 'gwen.pendingAccount';

const get = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

/**
 * Conexão guardada neste computador, ou null. O .env não é lido: a URL e a chave
 * vêm só do que a pessoa colou em Configurações (ou na entrada com conta).
 */
export function loadConnection() {
  try {
    const stored = JSON.parse(get(CONN_KEY) || 'null');
    if (stored?.url && stored?.anonKey) return { url: stored.url, anonKey: stored.anonKey, schema: stored.schema || 'gwen' };
  } catch {
    /* conexão corrompida: trata como sem conexão */
  }
  return null;
}

export function saveConnection({ url, anonKey, schema }) {
  const cleanUrl = String(url || '').trim().replace(/\/+$/, '');
  const key = String(anonKey || '').trim();
  let parsed;
  try {
    parsed = new URL(cleanUrl);
  } catch {
    throw new Error('A URL não parece válida. Ela é algo como https://abcd1234.supabase.co');
  }
  if (parsed.protocol !== 'https:') throw new Error('A URL do Supabase começa com https://');
  if (key.length < 20) throw new Error('A chave anon parece curta demais. Copie ela inteira em Project Settings > API.');
  const conn = { url: cleanUrl, anonKey: key, schema: String(schema || '').trim() || 'gwen' };
  localStorage.setItem(CONN_KEY, JSON.stringify(conn));
  return conn;
}

export function clearConnection() {
  localStorage.removeItem(CONN_KEY);
}

export const connectionHost = (conn) => {
  try {
    return new URL(conn.url).host;
  } catch {
    return conn?.url || '';
  }
};

/** Modo conta ligado: projetos, sessões e o resto vivem no Supabase */
export const isAccountMode = () => get(ACCOUNT_KEY) === '1';

export function setAccountMode(on) {
  if (on) localStorage.setItem(ACCOUNT_KEY, '1');
  else localStorage.removeItem(ACCOUNT_KEY);
}
