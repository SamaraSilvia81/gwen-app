import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { breakRepo, categoryRepo, projectRepo, sessionRepo } from '../data/repository';
import { useProfile } from './ProfileContext';
import { useToast } from './ToastContext';
import { openFolder, openLink, normalizeUrl, runCommand } from '../lib/native';
import { secondsBetween, startOfWeek } from '../lib/time';
import { folderActions, inFront } from '../lib/projectModel';

/** Sessão sem sinal do app há mais que isso é considerada esquecida */
const STALE_AFTER_MIN = 15;
const HEARTBEAT_MS = 60_000;

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user, profile } = useProfile();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sessions, setSessions] = useState([]); // desta semana
  const [activeSession, setActiveSession] = useState(null);
  const [activeBreak, setActiveBreak] = useState(null);
  const [staleSession, setStaleSession] = useState(null);
  const [notes, setNotes] = useState(() => new Map()); // "onde parei" por projeto
  const [endingSession, setEndingSession] = useState(false); // pergunta do "onde parei" aberta
  const [loading, setLoading] = useState(true);
  const checkedStale = useRef(false);

  const refresh = useCallback(async () => {
    const [cats, projs, week, current, brk, lastNotes] = await Promise.all([
      categoryRepo.list(),
      projectRepo.list(),
      sessionRepo.since(startOfWeek()),
      sessionRepo.active(),
      breakRepo.active(),
      sessionRepo.latestNotes().catch(() => new Map()),
    ]);
    setNotes(lastNotes);
    setCategories(cats);
    setProjects(projs);
    setSessions(week);
    setActiveSession(current);
    setActiveBreak(brk);
    return { current };
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    setLoading(true);
    refresh()
      .then(({ current }) => {
        if (!alive) return;
        // sessão aberta sem sinal recente = o app foi fechado com ela rodando
        if (!checkedStale.current && current) {
          const idleMin = secondsBetween(current.last_seen_at, new Date()) / 60;
          if (idleMin > STALE_AFTER_MIN) setStaleSession(current);
        }
        checkedStale.current = true;
      })
      .catch((err) => toast(`Não consegui carregar seus dados: ${err.message}`, 'error'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user, refresh, toast]);

  // sinal de vida enquanto a G.W.E.N. está aberta
  useEffect(() => {
    if (!activeSession || staleSession) return;
    const id = setInterval(() => sessionRepo.heartbeat(activeSession.id).catch(() => {}), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [activeSession, staleSession]);

  const replaceSession = (s) =>
    setSessions((list) => {
      const others = list.filter((x) => x.id !== s.id);
      return [s, ...others];
    });

  /* ─── CATEGORIAS ─── */
  const createCategory = useCallback(async (name) => {
    const cat = await categoryRepo.create(name.trim(), categories.length);
    setCategories((c) => [...c, cat]);
    return cat;
  }, [categories.length]);

  const renameCategory = useCallback(async (id, name) => {
    const cat = await categoryRepo.update(id, { name: name.trim() });
    setCategories((c) => c.map((x) => (x.id === id ? cat : x)));
  }, []);

  const deleteCategory = useCallback(async (id) => {
    await categoryRepo.remove(id);
    setCategories((c) => c.filter((x) => x.id !== id));
    setProjects((p) => p.map((x) => (x.category_id === id ? { ...x, category_id: null } : x)));
  }, []);

  /* ─── PROJETOS ─── */
  const saveProject = useCallback(async (draft, existing) => {
    const saved = existing ? await projectRepo.update(existing.id, draft, existing.status) : await projectRepo.create(draft);
    setProjects((list) => [saved, ...list.filter((p) => p.id !== saved.id)]);
    return saved;
  }, []);

  const deleteProject = useCallback(async (id) => {
    await projectRepo.remove(id);
    setProjects((list) => list.filter((p) => p.id !== id));
    setSessions((list) => list.filter((s) => s.project_id !== id));
    setActiveSession((s) => (s?.project_id === id ? null : s));
  }, []);

  /* ─── PAUSAS ─── */
  const endBreak = useCallback(async (endedAt = new Date()) => {
    if (!activeBreak) return;
    const ended = await breakRepo.end(activeBreak.id, endedAt);
    if (ended.session_id) {
      const seconds = secondsBetween(ended.started_at, ended.ended_at);
      const s = await sessionRepo.addPaused(ended.session_id, seconds);
      setActiveSession((cur) => (cur?.id === s.id ? s : cur));
      replaceSession(s);
    }
    setActiveBreak(null);
    return ended;
  }, [activeBreak]);

  const startBreak = useCallback(async (kind) => {
    if (activeBreak) await endBreak();
    const brk = await breakRepo.start(kind, activeSession?.id ?? null);
    setActiveBreak(brk);
  }, [activeBreak, activeSession, endBreak]);

  /* ─── SESSÕES ─── */
  const endSession = useCallback(async (endedAt = new Date(), note = undefined) => {
    if (!activeSession) return;
    if (activeBreak?.session_id === activeSession.id) await endBreak(endedAt);
    const ended = await sessionRepo.end(activeSession.id, endedAt, note);
    replaceSession(ended);
    setActiveSession(null);
    if (note !== undefined) {
      setNotes((m) => {
        const next = new Map(m);
        if (ended.note) next.set(ended.project_id, { note: ended.note, at: ended.ended_at, front: ended.front || null });
        else next.delete(ended.project_id);
        return next;
      });
    }
    return ended;
  }, [activeSession, activeBreak, endBreak]);

  /** Encerrar pela interface: abre a pergunta "onde parei?" antes */
  const requestEnd = useCallback(() => {
    if (activeSession) setEndingSession(true);
  }, [activeSession]);
  const cancelEnd = useCallback(() => setEndingSession(false), []);

  const startSession = useCallback(async (projectId, front = null) => {
    if (activeSession?.project_id === projectId && (activeSession.front || null) === (front || null)) return activeSession;
    if (activeSession) await endSession();
    if (activeBreak) await endBreak();
    const s = await sessionRepo.start(projectId, front);
    setActiveSession(s);
    replaceSession(s);
    return s;
  }, [activeSession, activeBreak, endSession, endBreak]);

  /** "Começar agora": abre o que está marcado para abrir e inicia a sessão.
   *  Com `front`, abre só os itens dessa frente (e os que valem para todas). */
  const launchProject = useCallback(async (project, front = null) => {
    const errors = [];
    for (const folder of project.folders || []) {
      if (!folder.on_launch || !inFront(folder, front)) continue;
      for (const action of folderActions(folder)) {
        try {
          await openFolder(action, folder.path, profile?.git_bash_path);
        } catch (err) {
          errors.push(`${folder.label || folder.path}: ${err?.message || err}`);
        }
      }
      if (folder.command?.trim()) {
        try {
          await runCommand(folder.path, folder.command, `${project.name} · ${folder.label || 'comando'}`);
        } catch (err) {
          errors.push(`${folder.command}: ${err?.message || err}`);
        }
      }
    }
    for (const link of project.links || []) {
      if (!link.on_launch || !inFront(link, front)) continue;
      try {
        await openLink(normalizeUrl(link.url));
      } catch (err) {
        errors.push(`${link.label || link.url}: ${err?.message || err}`);
      }
    }

    await startSession(project.id, front);

    // abrir pelo launcher significa que o projeto está em andamento
    let updated = await projectRepo.touchOpened(project.id);
    if (project.status === 'ideia' || project.status === 'pausado') {
      updated = await projectRepo.update(project.id, { ...updated, status: 'andamento' }, project.status);
    }
    setProjects((list) => [updated, ...list.filter((p) => p.id !== updated.id)]);

    const where = notes.get(project.id);
    if (errors.length) toast(`Sessão iniciada, mas falhou ao abrir: ${errors.join(' · ')}`, 'error');
    else if (where) toast(`Onde você parou: ${where.note}`);
    else toast(`Sessão de ${project.name}${front ? ` · ${front}` : ''} iniciada.`);
  }, [profile, startSession, toast, notes]);

  /* ─── SESSÃO ESQUECIDA ─── */
  const resolveStale = useCallback(async (choice, minutes) => {
    const s = staleSession;
    if (!s) return;
    if (choice === 'continue') {
      // o tempo com o app fechado não conta: entra como pausa
      const gap = secondsBetween(s.last_seen_at, new Date());
      const updated = await sessionRepo.addPaused(s.id, gap);
      setActiveSession(updated);
      replaceSession(updated);
      setStaleSession(null);
      return;
    }
    let endedAt;
    if (choice === 'last_seen') endedAt = new Date(s.last_seen_at);
    else endedAt = new Date(new Date(s.started_at).getTime() + (minutes * 60 + (s.paused_seconds || 0)) * 1000);

    if (activeBreak) {
      const breakEnd = endedAt < new Date(activeBreak.started_at) ? new Date(activeBreak.started_at) : endedAt;
      await endBreak(breakEnd);
    }
    const ended = await sessionRepo.end(s.id, endedAt);
    replaceSession(ended);
    setActiveSession(null);
    setStaleSession(null);
    toast('Sessão corrigida.');
  }, [staleSession, activeBreak, endBreak, toast]);

  const value = useMemo(
    () => ({
      loading,
      categories,
      projects,
      sessions,
      activeSession,
      activeBreak,
      staleSession,
      notes,
      endingSession,
      requestEnd,
      cancelEnd,
      refresh,
      createCategory,
      renameCategory,
      deleteCategory,
      saveProject,
      deleteProject,
      launchProject,
      startSession,
      endSession,
      startBreak,
      endBreak,
      resolveStale,
    }),
    [loading, categories, projects, sessions, activeSession, activeBreak, staleSession, notes, endingSession, requestEnd,
      cancelEnd, refresh, createCategory,
      renameCategory, deleteCategory, saveProject, deleteProject, launchProject, startSession, endSession,
      startBreak, endBreak, resolveStale],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = () => useContext(WorkspaceContext);

/** Re-renderiza a cada `ms` para timers ao vivo */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
