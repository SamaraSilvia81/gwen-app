/**
 * Armazenamento na nuvem (modo conta). Mesma interface do SQLite em store.js:
 * all / insert / update / remove. Os repositórios não sabem a diferença.
 *
 * Aqui nada fica no computador: cada operação vai direto para o schema gwen
 * do Supabase, e as regras de acesso (RLS por user_id) garantem que a conta
 * só enxerga os próprios dados.
 */
import { supabase } from '../lib/supabase';

const PAGE = 1000; // limite de linhas por requisição do Supabase

async function userId() {
  if (!supabase) throw new Error('Sem conexão com o Supabase configurada.');
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('Sua sessão na nuvem expirou. Entre na conta de novo.');
  return id;
}

/** O perfil local tem id fixo "local"; na nuvem o id do perfil é o id do usuário. */
const toLocal = (table, row) => (table === 'profiles' ? { ...row, id: 'local' } : row);
const remoteId = (table, id, uid) => (table === 'profiles' ? uid : id);

const check = ({ error }) => {
  if (error) throw new Error(error.message);
};

/**
 * Colunas novas que dependem de uma migração da nuvem. Se a migração não foi
 * rodada, o Supabase recusa o registro inteiro ("Could not find the 'front'
 * column..."). Em vez de perder a sessão, grava sem a coluna e avisa qual
 * migração falta (o App mostra o aviso uma vez).
 */
export const OPTIONAL_COLUMNS = {
  front: '005_gwen_frentes.sql',
  pinned: '006_gwen_fixados.sql',
};
export const MISSING_MIGRATION_EVENT = 'gwen:migracao-faltando';
const missingColumn = (error) => error?.message?.match(/Could not find the '(\w+)' column/)?.[1] || null;

async function withoutMissingColumns(payload, run) {
  let body = { ...payload };
  for (let tries = 0; tries < 3; tries++) {
    const res = await run(body);
    const col = missingColumn(res.error);
    if (!col || !(col in body) || !OPTIONAL_COLUMNS[col]) return res;
    const { [col]: _dropped, ...rest } = body;
    body = rest;
    window.dispatchEvent(new CustomEvent(MISSING_MIGRATION_EVENT, { detail: { column: col, file: OPTIONAL_COLUMNS[col] } }));
  }
  return run(body);
}

export const cloudStore = {
  async all(table) {
    const uid = await userId();
    const out = [];
    for (let from = 0; ; from += PAGE) {
      let q = supabase.from(table).select('*').order('id');
      q = table === 'profiles' ? q.eq('id', uid) : q.eq('user_id', uid);
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      out.push(...data);
      if (data.length < PAGE) break;
    }
    return out.map((r) => toLocal(table, r));
  },

  async insert(table, row) {
    const uid = await userId();
    const payload = table === 'profiles' ? { ...row, id: uid } : row;
    check(await withoutMissingColumns(payload, (body) => supabase.from(table).insert(body)));
    return { ...row };
  },

  async update(table, id, patch) {
    const uid = await userId();
    const res = await withoutMissingColumns(patch, (body) =>
      Object.keys(body).length ? supabase.from(table).update(body).eq('id', remoteId(table, id, uid)) : { error: null },
    );
    check(res);
  },

  async remove(table, id) {
    const uid = await userId();
    check(await supabase.from(table).delete().eq('id', remoteId(table, id, uid)));
  },
};
