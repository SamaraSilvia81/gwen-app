/**
 * Entrada e saída de dados: backup em JSON e importação única da nuvem.
 * Nada aqui apaga dados: importar só acrescenta o que ainda não existe (mesmo id).
 */
import { store, TABLES, nowIso } from './store';
import { profileRepo } from './repository';

const DATA_TABLES = TABLES.filter((t) => t !== 'profiles');

/** Acrescenta linhas cujo id ainda não existe. Devolve quantas entraram por tabela. */
async function mergeRows(tables) {
  const added = {};
  for (const t of DATA_TABLES) {
    const incoming = tables[t] || [];
    if (!incoming.length) {
      added[t] = 0;
      continue;
    }
    const existing = new Set((await store.all(t)).map((r) => r.id));
    let n = 0;
    for (const row of incoming) {
      if (!row?.id || existing.has(row.id)) continue;
      const { user_id, ...clean } = row; // eslint-disable-line no-unused-vars
      await store.insert(t, clean);
      n += 1;
    }
    added[t] = n;
  }
  return added;
}

const PROFILE_FIELDS = ['theme', 'style', 'mode', 'custom_colors', 'wellness', 'git_bash_path', 'avatar', 'launcher'];

async function mergeProfile(remote) {
  if (!remote) return;
  const patch = {};
  for (const f of PROFILE_FIELDS) if (remote[f] != null) patch[f] = remote[f];
  const local = await profileRepo.get();
  if (!local?.display_name && remote.display_name) patch.display_name = remote.display_name;
  if (Object.keys(patch).length) await profileRepo.update('local', patch);
}

/* ─── BACKUP EM JSON ─── */
export async function exportAll(appVersion) {
  const tables = {};
  // tabela nova sem migração na nuvem (ex.: tasks antes da 008) sai vazia em vez de travar o backup
  for (const t of TABLES) tables[t] = await store.all(t).catch(() => []);
  return JSON.stringify({ gwenBackup: 1, appVersion, exportedAt: nowIso(), tables }, null, 2);
}

export async function importBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (!data?.gwenBackup || !data.tables) throw new Error('Esse arquivo não é um backup da G.W.E.N.');
  await mergeProfile(data.tables.profiles?.[0]);
  return mergeRows(data.tables);
}

/* ─── IMPORTAÇÃO DA NUVEM (uma vez) ─── */
export const CLOUD_IMPORT_KEY = 'cloud_import_at';

export async function cloudImportDoneAt() {
  return store.getMeta(CLOUD_IMPORT_KEY);
}

/** `supabase` já autenticado. Lê o schema gwen e copia para o local. */
export async function importFromCloud(supabase, userId) {
  const tables = {};
  for (const t of DATA_TABLES) {
    const { data, error } = await supabase.from(t).select('*');
    // tabela que não existe no projeto (migração não rodada) só fica vazia
    tables[t] = error ? [] : data || [];
  }
  const { data: remoteProfile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  await mergeProfile(remoteProfile);
  const added = await mergeRows(tables);
  await store.setMeta(CLOUD_IMPORT_KEY, nowIso());
  return added;
}

export function describeAdded(added) {
  const label = { categories: 'categorias', projects: 'projetos', sessions: 'sessões', breaks: 'pausas', wellness_events: 'registros do modo saúde', tasks: 'tarefas' };
  const parts = Object.entries(added).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${label[t]}`);
  return parts.length ? parts.join(', ') : 'nada novo (tudo já estava aqui)';
}
