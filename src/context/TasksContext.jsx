import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { taskRepo } from '../data/repository';
import { useToast } from './ToastContext';
import { fetchIssues } from '../lib/github';

/**
 * Tarefas (0.9): por projeto, em quatro colunas (A fazer, Fazendo, Revisão, Feito).
 * Ficam no mesmo armazenamento dos projetos (SQLite local ou nuvem).
 */
const TasksContext = createContext(null);

export function TasksProvider({ children }) {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setTasks(await taskRepo.list());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createTask = useCallback(async (draft) => {
    const t = await taskRepo.create(draft);
    setTasks((list) => [...list, t]);
    return t;
  }, []);

  const updateTask = useCallback(
    async (task, patch) => {
      // otimista: a tela muda na hora, e volta se o banco recusar
      setTasks((list) => list.map((x) => (x.id === task.id ? { ...x, ...patch } : x)));
      try {
        const saved = await taskRepo.update(task.id, patch, task);
        setTasks((list) => list.map((x) => (x.id === task.id ? { ...x, ...saved } : x)));
        return saved;
      } catch (err) {
        setTasks((list) => list.map((x) => (x.id === task.id ? task : x)));
        toast(err.message, 'error');
        throw err;
      }
    },
    [toast],
  );

  const deleteTask = useCallback(async (task) => {
    await taskRepo.remove(task.id);
    setTasks((list) => list.filter((x) => x.id !== task.id));
  }, []);

  /**
   * Move para uma coluna, antes de outra tarefa (ou no fim).
   * A posição é o meio entre as vizinhas, então só a tarefa movida é gravada.
   */
  const moveTask = useCallback(
    async (task, status, beforeId = null) => {
      const column = tasks.filter((t) => t.status === status && t.id !== task.id).sort((a, b) => a.position - b.position);
      let position;
      const idx = beforeId ? column.findIndex((t) => t.id === beforeId) : -1;
      if (idx === -1) position = (column.at(-1)?.position ?? 0) + 1000;
      else {
        const prev = column[idx - 1]?.position ?? column[idx].position - 2000;
        position = (prev + column[idx].position) / 2;
      }
      if (task.status === status && task.position === position) return;
      return updateTask(task, { status, position });
    },
    [tasks, updateTask],
  );

  /** Importa e atualiza as Issues de um repositório como tarefas do projeto */
  const importIssues = useCallback(
    async (project, repo) => {
      const issues = await fetchIssues(repo);
      const byUrl = new Map(tasks.filter((t) => t.github?.url).map((t) => [t.github.url, t]));
      let added = 0;
      let updated = 0;
      for (const issue of issues) {
        const github = { repo: `${repo.owner}/${repo.repo}`, number: issue.number, url: issue.html_url, state: issue.state };
        const labels = (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean);
        const existing = byUrl.get(issue.html_url);
        if (existing) {
          const patch = { title: issue.title, github, labels };
          // fechada no GitHub vira Feito; reaberta volta para A fazer
          if (issue.state === 'closed' && existing.status !== 'done') patch.status = 'done';
          if (issue.state === 'open' && existing.status === 'done' && existing.github?.state === 'closed') patch.status = 'todo';
          const changed =
            patch.title !== existing.title ||
            patch.status ||
            existing.github?.state !== issue.state ||
            JSON.stringify(existing.labels || []) !== JSON.stringify(labels);
          if (changed) {
            await updateTask(existing, patch);
            updated += 1;
          }
        } else {
          await createTask({
            project_id: project.id,
            title: issue.title,
            description: (issue.body || '').slice(0, 4000) || null,
            status: issue.state === 'closed' ? 'done' : 'todo',
            labels,
            github,
            position: Date.now() + issue.number,
          });
          added += 1;
        }
      }
      return { added, updated, total: issues.length };
    },
    [tasks, createTask, updateTask],
  );

  const value = useMemo(
    () => ({ tasks, loading, error, reload, createTask, updateTask, deleteTask, moveTask, importIssues }),
    [tasks, loading, error, reload, createTask, updateTask, deleteTask, moveTask, importIssues],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export const useTasks = () => useContext(TasksContext);
