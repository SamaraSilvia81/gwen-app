/**
 * Armazenamento local da G.W.E.N.
 *
 * No app: SQLite (plugin sql do Tauri), num arquivo na pasta de dados do usuário.
 * No navegador (yarn dev): localStorage, só para trabalhar na interface.
 *
 * A interface é mínima de propósito (all / insert / update / remove / meta):
 * os dados de uma pessoa cabem em memória, então filtrar e ordenar fica no
 * repositório, em JavaScript. Ver ADR-010.
 */
import { isTauri } from '../lib/native';

export const TABLES = ['profiles', 'categories', 'projects', 'sessions', 'breaks', 'wellness_events'];

/** Colunas guardadas como texto JSON no SQLite */
const JSON_COLUMNS = {
  profiles: ['custom_colors', 'wellness'],
  projects: ['folders', 'links'],
};

const parseRow = (table, row) => {
  const out = { ...row };
  for (const col of JSON_COLUMNS[table] || []) {
    if (typeof out[col] === 'string') {
      try {
        out[col] = JSON.parse(out[col]);
      } catch {
        out[col] = null;
      }
    }
  }
  return out;
};

const serialize = (table, row) => {
  const out = { ...row };
  for (const col of JSON_COLUMNS[table] || []) {
    if (col in out) out[col] = out[col] == null ? null : JSON.stringify(out[col]);
  }
  return out;
};

/* ─── SQLite ─── */
let dbPromise = null;
async function db() {
  if (!dbPromise) {
    dbPromise = import('@tauri-apps/plugin-sql').then(({ default: Database }) => Database.load('sqlite:gwen.db'));
  }
  return dbPromise;
}

const sqlStore = {
  async all(table) {
    const rows = await (await db()).select(`SELECT * FROM ${table}`);
    return rows.map((r) => parseRow(table, r));
  },
  async insert(table, row) {
    const r = serialize(table, row);
    const cols = Object.keys(r);
    const marks = cols.map((_, i) => `$${i + 1}`).join(', ');
    await (await db()).execute(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${marks})`, cols.map((c) => r[c]));
    return { ...row };
  },
  async update(table, id, patch) {
    const r = serialize(table, patch);
    const cols = Object.keys(r);
    if (!cols.length) return;
    const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    await (await db()).execute(`UPDATE ${table} SET ${sets} WHERE id = $${cols.length + 1}`, [...cols.map((c) => r[c]), id]);
  },
  async remove(table, id) {
    await (await db()).execute(`DELETE FROM ${table} WHERE id = $1`, [id]);
  },
  async getMeta(key) {
    const rows = await (await db()).select('SELECT value FROM meta WHERE key = $1', [key]);
    return rows[0]?.value ?? null;
  },
  async setMeta(key, value) {
    await (await db()).execute(
      'INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value],
    );
  },
};

/* ─── localStorage (navegador) ─── */
const lsKey = (t) => `gwen.db.${t}`;
const lsRead = (t) => {
  try {
    return JSON.parse(localStorage.getItem(lsKey(t)) || '[]');
  } catch {
    return [];
  }
};
const lsWrite = (t, rows) => localStorage.setItem(lsKey(t), JSON.stringify(rows));

const browserStore = {
  async all(table) {
    return lsRead(table);
  },
  async insert(table, row) {
    lsWrite(table, [...lsRead(table), row]);
    return { ...row };
  },
  async update(table, id, patch) {
    lsWrite(table, lsRead(table).map((r) => (r.id === id ? { ...r, ...patch } : r)));
  },
  async remove(table, id) {
    lsWrite(table, lsRead(table).filter((r) => r.id !== id));
  },
  async getMeta(key) {
    return localStorage.getItem(`gwen.meta.${key}`);
  },
  async setMeta(key, value) {
    localStorage.setItem(`gwen.meta.${key}`, value);
  },
};

export const store = isTauri ? sqlStore : browserStore;

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();
