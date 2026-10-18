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
  ...(Array.isArray(p.apps) ? { apps: p.apps } : {}),
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
    return (await this.activeAll())[0] || null;
  },
  /** Todas as sessões abertas, da mais recente para a mais antiga (0.8: várias ao mesmo tempo) */
  async activeAll() {
    return (await store.all('sessions')).filter((s) => !s.ended_at).sort(byDesc('started_at'));
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
  async start(projectId, front = null, { exclusive = false } = {}) {
    const open = await this.activeAll();
    // a mesma frente do mesmo projeto já está rodando: reaproveita
    const same = open.find((s) => s.project_id === projectId && (s.front || null) === (front || null));
    if (same) return same;
    // modo "uma de cada vez" (opção em Ajustes > Sistema): encerra as outras antes
    if (exclusive) for (const s of open) await this.end(s.id);
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
    try {
      return await store.insert('sessions', row);
    } catch (err) {
      // nuvem ainda com o índice de "uma sessão por vez"
      if (/sessions_one_active|duplicate key/i.test(err?.message || '')) {
        throw new Error('Sua nuvem ainda aceita uma sessão por vez. Rode supabase/migrations/007_gwen_v08.sql no SQL Editor para ter sessões em paralelo.');
      }
      throw err;
    }
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

/* ─── TAREFAS (0.9) ─── */
export const TASK_STATUS = {
  todo: { label: 'A fazer' },
  doing: { label: 'Fazendo' },
  review: { label: 'Revisão' },
  done: { label: 'Feito' },
};
export const TASK_PRIORITY = ['Sem prioridade', 'Baixa', 'Média', 'Alta', 'Urgente'];

const cleanTask = (t) => {
  const out = {};
  if ('title' in t) out.title = String(t.title || '').trim() || 'Sem título';
  if ('description' in t) out.description = t.description?.trim() || null;
  if ('project_id' in t) out.project_id = t.project_id || null;
  if ('status' in t) out.status = TASK_STATUS[t.status] ? t.status : 'todo';
  if ('priority' in t) out.priority = Math.max(0, Math.min(4, Number(t.priority) || 0));
  if ('labels' in t) out.labels = (t.labels || []).map((l) => String(l).trim()).filter(Boolean);
  if ('due_date' in t) out.due_date = t.due_date || null;
  if ('position' in t) out.position = Number(t.position) || 0;
  if ('github' in t) out.github = t.github || null;
  return out;
};

/** Nuvem sem a migração 008: mensagem que diz o que fazer */
const tasksError = (err) => {
  if (/tasks|relation|schema cache/i.test(err?.message || '')) {
    return new Error('Sua nuvem ainda não tem a tabela de tarefas. Rode supabase/migrations/008_gwen_tarefas.sql no SQL Editor.');
  }
  return err;
};

export const taskRepo = {
  async list() {
    try {
      return (await store.all('tasks')).sort((a, b) => (a.position || 0) - (b.position || 0));
    } catch (err) {
      throw tasksError(err);
    }
  },
  async create(task) {
    const now = nowIso();
    const row = {
      id: newId(),
      title: 'Sem título',
      description: null,
      project_id: null,
      status: 'todo',
      priority: 0,
      labels: [],
      due_date: null,
      position: Date.now(),
      github: null,
      ...cleanTask(task),
      completed_at: task.status === 'done' ? now : null,
      created_at: now,
      updated_at: now,
    };
    try {
      return await store.insert('tasks', row);
    } catch (err) {
      throw tasksError(err);
    }
  },
  async update(id, patch, previous = null) {
    const row = { ...cleanTask(patch), updated_at: nowIso() };
    if (row.status === 'done' && previous?.status !== 'done') row.completed_at = nowIso();
    if (row.status && row.status !== 'done') row.completed_at = null;
    try {
      await store.update('tasks', id, row);
    } catch (err) {
      throw tasksError(err);
    }
    return { ...(previous || {}), ...row, id };
  },
  async remove(id) {
    await store.remove('tasks', id);
  },
};
