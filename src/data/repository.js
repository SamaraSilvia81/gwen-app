/**
 * Camada de dados da G.W.E.N.
 * Desde a 0.4 tudo fica no computador (store.js: SQLite no app, localStorage no
 * navegador). A interface dos repositórios é a mesma da versão com Supabase,
 * então contextos e componentes não mudaram. Ver ADR-010.
 */
import { store, newId, nowIso } from './store';
import { cleanFolder, cleanLink } from '../lib/projectModel';

const LOCAL_ID = 'local';
const byDesc = (key) => (a, b) => String(b[key] || '').localeCompare(String(a[key] || ''));

/* ─── PERFIL (um só, local) ─── */
export const profileRepo = {
  async get() {
    const rows = await store.all('profiles');
    return rows.find((p) => p.id === LOCAL_ID) || null;
  },
  async create(displayName, avatar = null) {
    const now = nowIso();
    return store.insert('profiles', {
      id: LOCAL_ID,
      display_name: displayName,
      theme: 'noir',
      style: 'moderno',
      mode: 'escuro',
      custom_colors: null,
      wellness: null,
      git_bash_path: null,
      avatar,
      created_at: now,
      updated_at: now,
    });
  },
  async update(_id, patch) {
    await store.update('profiles', LOCAL_ID, { ...patch, updated_at: nowIso() });
    return this.get();
  },
};

/* ─── CATEGORIAS ─── */
export const categoryRepo = {
  async list() {
    const rows = await store.all('categories');
    return rows.sort((a, b) => a.position - b.position || String(a.created_at).localeCompare(String(b.created_at)));
  },
  async create(name, position = 0) {
    return store.insert('categories', { id: newId(), name, position, created_at: nowIso() });
  },
  async update(id, patch) {
    await store.update('categories', id, patch);
    return (await store.all('categories')).find((c) => c.id === id);
  },
  async remove(id) {
    // projetos da categoria vão para "Sem categoria", não são apagados
    for (const p of await store.all('projects')) {
      if (p.category_id === id) await store.update('projects', p.id, { category_id: null });
    }
    await store.remove('categories', id);
  },
};

/* ─── PROJETOS ─── */
const cleanProject = (p) => ({
  name: p.name.trim(),
  description: p.description?.trim() || null,
  status: p.status,
  category_id: p.category_id || null,
  folders: (p.folders || []).filter((f) => f.path?.trim()).map(cleanFolder),
  links: (p.links || []).filter((l) => l.url?.trim()).map(cleanLink),
  // só grava quando vem no rascunho: a nuvem sem a migração 006 segue aceitando projetos
  ...(p.pinned !== undefined && p.pinned !== null ? { pinned: !!p.pinned } : {}),
});

const getProject = async (id) => (await store.all('projects')).find((p) => p.id === id);

export const projectRepo = {
  async list() {
    return (await store.all('projects')).sort(byDesc('updated_at'));
  },
  async create(project) {
    const now = nowIso();
    const row = {
      id: newId(),
      ...cleanProject(project),
      completed_at: project.status === 'concluido' ? now : null,
      last_opened_at: null,
      created_at: now,
      updated_at: now,
    };
    return store.insert('projects', row);
  },
  async update(id, project, previousStatus) {
    const row = { ...cleanProject(project), updated_at: nowIso() };
    if (row.status === 'concluido' && previousStatus !== 'concluido') row.completed_at = nowIso();
    if (row.status !== 'concluido') row.completed_at = null;
    await store.update('projects', id, row);
    return getProject(id);
  },
  /** Fixar ou soltar do topo do painel (0.7) */
  async setPinned(id, on) {
    await store.update('projects', id, { pinned: !!on });
    return getProject(id);
  },
  async touchOpened(id) {
    const now = nowIso();
    await store.update('projects', id, { last_opened_at: now, updated_at: now });
    return getProject(id);
  },
  async remove(id) {
    // sessões do projeto saem junto; pausas e eventos só perdem o vínculo
    const sessions = (await store.all('sessions')).filter((s) => s.project_id === id);
    const ids = new Set(sessions.map((s) => s.id));
    for (const b of await store.all('breaks')) if (ids.has(b.session_id)) await store.update('breaks', b.id, { session_id: null });
    for (const e of await store.all('wellness_events')) if (ids.has(e.session_id)) await store.update('wellness_events', e.id, { session_id: null });
    for (const s of sessions) await store.remove('sessions', s.id);
    await store.remove('projects', id);
  },
};

/* ─── SESSÕES ─── */
const getSession = async (id) => (await store.all('sessions')).find((s) => s.id === id);

export const sessionRepo = {
  async active() {
    return (await store.all('sessions')).find((s) => !s.ended_at) || null;
  },
  /** Sessões que começaram depois de `from` ou ainda estavam abertas nesse momento */
  async since(from) {
    const iso = from.toISOString();
    return (await store.all('sessions'))
      .filter((s) => s.started_at >= iso || !s.ended_at || s.ended_at >= iso)
      .sort(byDesc('started_at'));
  },
  /** `front`: frente aberta (opcional). Só vai no registro quando existe, para
   *  a nuvem sem a migração 005 continuar aceitando sessões sem frente. */
  async start(projectId, front = null) {
    // garante uma sessão ativa por vez (no Supabase era um índice único)
    const current = await this.active();
    if (current) await this.end(current.id);
    const now = nowIso();
    const row = {
      id: newId(),
      project_id: projectId,
      started_at: now,
      ended_at: null,
      last_seen_at: now,
      paused_seconds: 0,
      note: null,
      created_at: now,
    };
    if (front) row.front = front;
    return store.insert('sessions', row);
  },
  async heartbeat(id) {
    await store.update('sessions', id, { last_seen_at: nowIso() });
  },
  async end(id, endedAt = new Date(), note = undefined) {
    const patch = { ended_at: new Date(endedAt).toISOString() };
    // '' = apagou a nota de propósito (diferente de null, que é "não respondeu")
    if (note !== undefined) patch.note = (note || '').trim();
    await store.update('sessions', id, patch);
    return getSession(id);
  },
  /** "Onde parei": a nota mais recente de cada projeto (Map project_id -> { note, at, front }).
   *  Sessões encerradas sem responder (note null) não apagam a nota anterior; nota vazia ('') apaga. */
  async latestNotes() {
    const seen = new Set();
    const out = new Map();
    const answered = (await store.all('sessions')).filter((s) => s.ended_at && s.note != null).sort(byDesc('ended_at'));
    for (const s of answered) {
      if (seen.has(s.project_id)) continue;
      seen.add(s.project_id);
      if (s.note) out.set(s.project_id, { note: s.note, at: s.ended_at, front: s.front || null });
    }
    return out;
  },
  /** Todas as sessões a partir de uma data (perfil e hábitos) */
  async from(from) {
    const iso = from.toISOString();
    return (await store.all('sessions')).filter((s) => s.started_at >= iso || !s.ended_at).sort(byDesc('started_at'));
  },
  /** Sessões entre duas datas (relatório) */
  async between(from, to) {
    const a = from.toISOString();
    const b = to.toISOString();
    return (await store.all('sessions'))
      .filter((s) => s.started_at < b && (!s.ended_at || s.ended_at >= a))
      .sort(byDesc('started_at'));
  },
  async addPaused(id, seconds) {
    const s = await getSession(id);
    await store.update('sessions', id, {
      paused_seconds: Math.round((s?.paused_seconds || 0) + seconds),
      last_seen_at: nowIso(),
    });
    return getSession(id);
  },
};

/* ─── PAUSAS ─── */
const getBreak = async (id) => (await store.all('breaks')).find((b) => b.id === id);

export const breakRepo = {
  async active() {
    return (await store.all('breaks')).find((b) => !b.ended_at) || null;
  },
  async since(from) {
    const iso = from.toISOString();
    return (await store.all('breaks')).filter((b) => b.started_at >= iso).sort(byDesc('started_at'));
  },
  async start(kind, sessionId = null) {
    const current = await this.active();
    if (current) await this.end(current.id);
    const now = nowIso();
    return store.insert('breaks', { id: newId(), session_id: sessionId, kind, started_at: now, ended_at: null, created_at: now });
  },
  async end(id, endedAt = new Date()) {
    await store.update('breaks', id, { ended_at: new Date(endedAt).toISOString() });
    return getBreak(id);
  },
};

/* ─── MODO SAÚDE ─── */
export const wellnessRepo = {
  async since(from) {
    const iso = from.toISOString();
    return (await store.all('wellness_events')).filter((e) => e.created_at >= iso).sort(byDesc('created_at'));
  },
  async log(kind, action, sessionId = null) {
    return store.insert('wellness_events', { id: newId(), kind, action, session_id: sessionId, created_at: nowIso() });
  },
};
