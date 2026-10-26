import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { breakRepo, categoryRepo, projectRepo, sessionRepo } from '../data/repository';
import { useProfile } from './ProfileContext';
import { useToast } from './ToastContext';
import { openFolder, openLink, normalizeUrl, runCommand } from '../lib/native';
import { secondsBetween, startOfWeek } from '../lib/time';
import { folderActions, inFront } from '../lib/projectModel';
import { launchApp } from '../lib/launcher';
import { parallelSessionsEnabled } from '../lib/layout';

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
  // 0.8: várias sessões abertas ao mesmo tempo, da mais recente para a mais antiga
  const [activeSessions, setActiveSessions] = useState([]);
  const activeSession = activeSessions[0] || null;
  const [activeBreak, setActiveBreak] = useState(null);
  const [staleSessions, setStaleSessions] = useState([]);
  const staleSession = staleSessions[0] || null;
  const [notes, setNotes] = useState(() => new Map()); // "onde parei" por projeto
  // pergunta do "onde parei" aberta: null | id da sessão | 'escolher' (várias abertas)
  const [endingSession, setEndingSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const checkedStale = useRef(false);

  const refresh = useCallback(async () => {
    const [cats, projs, week, current, brk, lastNotes] = await Promise.all([
      categoryRepo.list(),
      projectRepo.list(),
      sessionRepo.since(startOfWeek()),
      sessionRepo.activeAll(),
      breakRepo.active(),
      sessionRepo.latestNotes().catch(() => new Map()),
    ]);
    setNotes(lastNotes);
    setCategories(cats);
    setProjects(projs);
    setSessions(week);
    setActiveSessions(current);
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
        if (!checkedStale.current && current.length) {
          setStaleSessions(current.filter((s) => secondsBetween(s.last_seen_at, new Date()) / 60 > STALE_AFTER_MIN));
        }
        checkedStale.current = true;
      })
      .catch((err) => toast(`Não consegui carregar seus dados: ${err.message}`, 'error'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user, refresh, toast]);

  // sinal de vida enquanto a G.W.E.N. está aberta (para todas as sessões abertas)
  const openIds = activeSessions.map((x) => x.id).join('|');
  useEffect(() => {
    if (!openIds || staleSession) return;
    const ids = openIds.split('|');
    const id = setInterval(() => ids.forEach((sid) => sessionRepo.heartbeat(sid).catch(() => {})), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [openIds, staleSession]);

  const replaceActive = (s) =>
    setActiveSessions((list) => {
      const others = list.filter((x) => x.id !== s.id);
      return s.ended_at ? others : [s, ...others].sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)));
    });

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

  const togglePin = useCallback(async (project) => {
    const saved = await projectRepo.setPinned(project.id, !project.pinned);
    setProjects((list) => list.map((p) => (p.id === saved.id ? saved : p)));
    return saved;
  }, []);

  const deleteProject = useCallback(async (id) => {
    await projectRepo.remove(id);
    setProjects((list) => list.filter((p) => p.id !== id));
    setSessions((list) => list.filter((s) => s.project_id !== id));
    setActiveSessions((list) => list.filter((s) => s.project_id !== id));
  }, []);

  /* ─── PAUSAS ─── */
  /** A pausa vale para todas as sessões abertas: cada uma ganha o trecho em comum como pausa */
  const endBreak = useCallback(async (endedAt = new Date()) => {
    if (!activeBreak) return;
    // Guard: if the DB call hangs (e.g. during the stretch overlay), reject after
    // 6 s so the UI does not stay locked. The break row is cleared from state
    // regardless, letting the user retry or navigate away.
    const withTimeout = (promise, ms) =>
      Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
    let ended;
    try {
      ended = await withTimeout(breakRepo.end(activeBreak.id, endedAt), 6000);
    } catch {
      setActiveBreak(null);
      throw new Error('Não foi possível registrar a pausa. O banco não respondeu a tempo.');
    }
    const bStart = new Date(ended.started_at).getTime();
    const bEnd = new Date(ended.ended_at).getTime();
    for (const open of activeSessions) {
      const from = Math.max(bStart, new Date(open.started_at).getTime());
      const seconds = (bEnd - from) / 1000;
      if (seconds <= 0) continue;
      try {
        const s = await withTimeout(sessionRepo.addPaused(open.id, seconds), 4000);
        replaceActive(s);
        replaceSession(s);
      } catch {
        // session update failed — break is already closed, keep going
      }
    }
    setActiveBreak(null);
    return ended;
  }, [activeBreak, activeSessions]);

  const startBreak = useCallback(async (kind) => {
    if (activeBreak) await endBreak();
    const brk = await breakRepo.start(kind, activeSession?.id ?? null);
    setActiveBreak(brk);
  }, [activeBreak, activeSession, endBreak]);

  /* ─── SESSÕES ─── */
  /** Encerra uma sessão (por id; sem id, a mais recente). As outras continuam. */
  const endSession = useCallback(async (endedAt = new Date(), note = undefined, sessionId = null) => {
    const target = sessionId ? activeSessions.find((x) => x.id === sessionId) : activeSession;
    if (!target) return;
    // pausa aberta: esta sessão leva o trecho de pausa até agora; a pausa segue para as outras
    if (activeBreak) {
      const from = Math.max(new Date(activeBreak.started_at).getTime(), new Date(target.started_at).getTime());
      const seconds = (new Date(endedAt).getTime() - from) / 1000;
      if (seconds > 0) await sessionRepo.addPaused(target.id, seconds);
    }
    const ended = await sessionRepo.end(target.id, endedAt, note);
    replaceSession(ended);
    replaceActive(ended);
    if (note !== undefined) {
      setNotes((m) => {
        const next = new Map(m);
        if (ended.note) next.set(ended.project_id, { note: ended.note, at: ended.ended_at, front: ended.front || null });
        else next.delete(ended.project_id);
        return next;
      });
    }
    return ended;
  }, [activeSession, activeSessions, activeBreak, endBreak]);

  /** Encerrar pela interface: abre a pergunta "onde parei?" antes.
   *  Sem id e com várias abertas, a pergunta começa escolhendo qual encerrar. */
  const requestEnd = useCallback((sessionId = null) => {
    if (!activeSessions.length) return;
    const id = typeof sessionId === 'string' ? sessionId : null;
    if (id) setEndingSession(id);
    else setEndingSession(activeSessions.length === 1 ? activeSessions[0].id : 'escolher');
  }, [activeSessions]);
  const cancelEnd = useCallback(() => setEndingSession(null), []);

  const startSession = useCallback(async (projectId, front = null) => {
    const same = activeSessions.find((x) => x.project_id === projectId && (x.front || null) === (front || null));
    if (same) return same;
    const exclusive = !parallelSessionsEnabled();
    if (exclusive) for (const x of activeSessions) await endSession(new Date(), undefined, x.id);
    if (activeBreak) await endBreak();
    const s = await sessionRepo.start(projectId, front, { exclusive });
    if (exclusive) setActiveSessions([s]);
    else replaceActive(s);
    replaceSession(s);
    return s;
  }, [activeSessions, activeBreak, endSession, endBreak]);

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
    for (const appId of project.apps || []) {
      try {
        await launchApp(appId, profile?.launcher);
      } catch (err) {
        errors.push(`${appId}: ${err?.message || err}`);
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
    const next = () => setStaleSessions((list) => list.filter((x) => x.id !== s.id));
    if (choice === 'continue') {
      // o tempo com o app fechado não conta: entra como pausa
      const gap = secondsBetween(s.last_seen_at, new Date());
      const updated = await sessionRepo.addPaused(s.id, gap);
      replaceActive(updated);
      replaceSession(updated);
      next();
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
    replaceActive(ended);
    next();
    toast('Sessão corrigida.');
  }, [staleSession, activeBreak, endBreak, toast]);

  const value = useMemo(
    () => ({
      loading,
      categories,
      projects,
      sessions,
      activeSession,
      activeSessions,
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
      togglePin,
      deleteProject,
      launchProject,
      startSession,
      endSession,
      startBreak,
      endBreak,
      resolveStale,
    }),
    [loading, categories, projects, sessions, activeSession, activeSessions, activeBreak, staleSession, notes, endingSession, requestEnd,
      cancelEnd, refresh, createCategory,
      renameCategory, deleteCategory, saveProject, togglePin, deleteProject, launchProject, startSession, endSession,
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
