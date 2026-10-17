/**
 * Camada de dados da G.W.E.N.
 * Toda conversa com o Supabase passa por aqui, então trocar de backend
 * (ou adicionar um cache local depois) mexe só neste arquivo.
 */
import { supabase, unwrap } from '../lib/supabase';

/* ─── PERFIL ─── */
export const profileRepo = {
  async get(userId) {
    return unwrap(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle());
  },
  async update(userId, patch) {
    return unwrap(await supabase.from('profiles').update(patch).eq('id', userId).select().single());
  },
  /** Sem trigger no auth.users (o projeto pode ser compartilhado), o perfil nasce no primeiro login */
  async ensure(user) {
    const existing = await this.get(user.id);
    if (existing) return existing;
    const display_name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'dev';
    // upsert ignorando duplicado: o login pode chamar isto duas vezes ao mesmo tempo
    unwrap(await supabase.from('profiles').upsert({ id: user.id, display_name }, { onConflict: 'id', ignoreDuplicates: true }));
    return this.get(user.id);
  },
};

/* ─── CATEGORIAS ─── */
export const categoryRepo = {
  async list() {
    return unwrap(await supabase.from('categories').select('*').order('position').order('created_at'));
  },
  async create(name, position = 0) {
    return unwrap(await supabase.from('categories').insert({ name, position }).select().single());
  },
  async update(id, patch) {
    return unwrap(await supabase.from('categories').update(patch).eq('id', id).select().single());
  },
  async remove(id) {
    unwrap(await supabase.from('categories').delete().eq('id', id));
  },
};

/* ─── PROJETOS ─── */
const cleanProject = (p) => ({
  name: p.name.trim(),
  description: p.description?.trim() || null,
  status: p.status,
  category_id: p.category_id || null,
  folders: (p.folders || []).filter((f) => f.path?.trim()),
  links: (p.links || []).filter((l) => l.url?.trim()),
});

export const projectRepo = {
  async list() {
    return unwrap(await supabase.from('projects').select('*').order('updated_at', { ascending: false }));
  },
  async create(project) {
    const row = cleanProject(project);
    if (row.status === 'concluido') row.completed_at = new Date().toISOString();
    return unwrap(await supabase.from('projects').insert(row).select().single());
  },
  async update(id, project, previousStatus) {
    const row = cleanProject(project);
    if (row.status === 'concluido' && previousStatus !== 'concluido') row.completed_at = new Date().toISOString();
    if (row.status !== 'concluido') row.completed_at = null;
    return unwrap(await supabase.from('projects').update(row).eq('id', id).select().single());
  },
  async touchOpened(id) {
    return unwrap(
      await supabase.from('projects').update({ last_opened_at: new Date().toISOString() }).eq('id', id).select().single(),
    );
  },
  async remove(id) {
    unwrap(await supabase.from('projects').delete().eq('id', id));
  },
};

/* ─── SESSÕES ─── */
export const sessionRepo = {
  async active() {
    return unwrap(await supabase.from('sessions').select('*').is('ended_at', null).maybeSingle());
  },
  /** Sessões que começaram depois de `from` ou ainda estavam abertas nesse momento */
  async since(from) {
    const iso = from.toISOString();
    return unwrap(
      await supabase
        .from('sessions')
        .select('*')
        .or(`started_at.gte.${iso},ended_at.gte.${iso},ended_at.is.null`)
        .order('started_at', { ascending: false }),
    );
  },
  async start(projectId) {
    return unwrap(await supabase.from('sessions').insert({ project_id: projectId }).select().single());
  },
  async heartbeat(id) {
    unwrap(await supabase.from('sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', id));
  },
  async end(id, endedAt = new Date()) {
    return unwrap(
      await supabase
        .from('sessions')
        .update({ ended_at: new Date(endedAt).toISOString() })
        .eq('id', id)
        .select()
        .single(),
    );
  },
  async addPaused(id, seconds) {
    const current = unwrap(await supabase.from('sessions').select('paused_seconds').eq('id', id).single());
    return unwrap(
      await supabase
        .from('sessions')
        .update({ paused_seconds: Math.round((current.paused_seconds || 0) + seconds), last_seen_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single(),
    );
  },
};

/* ─── PAUSAS ─── */
export const breakRepo = {
  async active() {
    return unwrap(await supabase.from('breaks').select('*').is('ended_at', null).maybeSingle());
  },
  async since(from) {
    return unwrap(
      await supabase.from('breaks').select('*').gte('started_at', from.toISOString()).order('started_at', { ascending: false }),
    );
  },
  async start(kind, sessionId = null) {
    return unwrap(await supabase.from('breaks').insert({ kind, session_id: sessionId }).select().single());
  },
  async end(id, endedAt = new Date()) {
    return unwrap(
      await supabase.from('breaks').update({ ended_at: new Date(endedAt).toISOString() }).eq('id', id).select().single(),
    );
  },
};

/* ─── MODO SAÚDE ─── */
export const wellnessRepo = {
  async since(from) {
    return unwrap(
      await supabase
        .from('wellness_events')
        .select('*')
        .gte('created_at', from.toISOString())
        .order('created_at', { ascending: false }),
    );
  },
  async log(kind, action, sessionId = null) {
    return unwrap(
      await supabase.from('wellness_events').insert({ kind, action, session_id: sessionId }).select().single(),
    );
  },
};
