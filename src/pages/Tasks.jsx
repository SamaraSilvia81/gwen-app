import { useEffect, useMemo, useState } from 'react';
import { GithubLogo, Kanban, List, MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useTasks } from '../context/TasksContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { TASK_STATUS } from '../data/repository';
import { projectRepo } from '../lib/github';
import { useStoredState } from '../lib/layout';
import TaskModal from '../components/TaskModal';
import { DueChip, GithubChip, PriorityIcon, STATUS_ORDER, StatusIcon, dueInfo } from '../components/TaskBits';
import { Label } from '../components/Modal';

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Tarefas (0.9): kanban no jeito do Linear, com arrastar entre colunas, ou lista
 * agrupada por status. Filtra por projeto e importa as Issues do GitHub.
 */
export default function Tasks({ projectId, onProject }) {
  const { tasks, loading, error, moveTask, updateTask, createTask, importIssues } = useTasks();
  const { projects } = useWorkspace();
  const toast = useToast();
  const [view, setView] = useStoredState('gwen.tarefas.vista', 'kanban');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | { task } | { defaults }
  const [adding, setAdding] = useState(null); // status da coluna com o campo rápido aberto
  const [importing, setImporting] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dropAt, setDropAt] = useState(null); // { status, beforeId }

  const project = projects.find((p) => p.id === projectId) || null;
  const repo = project ? projectRepo(project) : null;
  const projectName = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const visible = useMemo(() => {
    const q = fold(query.trim());
    return tasks
      .filter((t) => (projectId === 'all' ? true : projectId === 'none' ? !t.project_id : t.project_id === projectId))
      .filter((t) => !q || fold(t.title).includes(q) || (t.labels || []).some((l) => fold(l).includes(q)));
  }, [tasks, projectId, query]);

  const columns = useMemo(() => {
    const map = Object.fromEntries(STATUS_ORDER.map((s) => [s, []]));
    for (const t of visible) (map[t.status] || map.todo).push(t);
    // ordem manual: quem arrastou decide; tarefa nova entra no fim da coluna
    for (const s of STATUS_ORDER) map[s].sort((a, b) => a.position - b.position);
    return map;
  }, [visible]);

  const open = visible.filter((t) => t.status !== 'done').length;
  const late = visible.filter((t) => t.status !== 'done' && dueInfo(t.due_date)?.tone === 'late').length;

  // N abre uma tarefa nova, fora de campos de texto
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      e.preventDefault();
      setEditing({ defaults: { project_id: projectId !== 'all' && projectId !== 'none' ? projectId : '' } });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [projectId]);

  async function runImport() {
    if (!project || !repo) return;
    setImporting(true);
    try {
      const r = await importIssues(project, repo);
      toast(r.total ? `${r.total} Issues lidas de ${repo.owner}/${repo.repo}: ${r.added} novas, ${r.updated} atualizadas.` : 'Nenhuma Issue nesse repositório.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setImporting(false);
    }
  }

  async function quickAdd(status, title) {
    if (!title.trim()) return;
    try {
      await createTask({ title, status, project_id: projectId !== 'all' && projectId !== 'none' ? projectId : null, position: Date.now() });
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function onDrop(status, beforeId = null, e = null) {
    // o id vem do próprio arrasto (mais confiável que o estado, que pode não ter atualizado)
    const id = e?.dataTransfer?.getData('text/plain') || dragId;
    const task = tasks.find((t) => t.id === id);
    setDragId(null);
    setDropAt(null);
    if (task) moveTask(task, status, beforeId).catch(() => {});
  }

  const cycle = (t) => {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(t.status) + 1) % STATUS_ORDER.length];
    updateTask(t, { status: next }).catch(() => {});
  };

  const Card = ({ t }) => (
    <article
      draggable
      onDragStart={(e) => {
        setDragId(t.id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', t.id);
      }}
      onDragEnd={() => {
        setDragId(null);
        setDropAt(null);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropAt?.beforeId !== t.id) setDropAt({ status: t.status, beforeId: t.id });
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(t.status, t.id, e);
      }}
      onClick={() => setEditing({ task: t })}
      className={`task-card ${dragId === t.id ? 'is-dragging' : ''} ${dropAt?.beforeId === t.id && dragId !== t.id ? 'is-drop-before' : ''} ${t.status === 'done' ? 'is-done' : ''}`}
    >
      <p className="flex items-start gap-2">
        <PriorityIcon priority={t.priority} />
        <span className="task-title">{t.title}</span>
      </p>
      <div className="task-meta">
        {projectId === 'all' && t.project_id && <span className="task-project">{projectName.get(t.project_id)}</span>}
        {(t.labels || []).slice(0, 3).map((l) => (
          <span key={l} className="task-label">
            {l}
          </span>
        ))}
        <DueChip due={t.due_date} done={t.status === 'done'} />
        <GithubChip github={t.github} />
      </div>
    </article>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="page page-wide">
        <section className="flex items-end justify-between gap-4 mb-5 flex-wrap anim-rise">
          <div className="min-w-0">
            <p className="eyebrow mb-1">tarefas</p>
            <h1 className="page-title truncate">{project ? project.name : projectId === 'none' ? 'Sem projeto' : 'Todas as tarefas'}</h1>
            <p className="text-[12.5px] text-muted mt-1 tabular">
              {open} {open === 1 ? 'aberta' : 'abertas'}
              {late > 0 && <span className="text-ember"> · {late} {late === 1 ? 'atrasada' : 'atrasadas'}</span>}
              {repo && <span> · {repo.owner}/{repo.repo}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select className="input w-[190px]" value={projectId} onChange={(e) => onProject(e.target.value)} aria-label="Projeto">
              <option value="all">Todos os projetos</option>
              <option value="none">Sem projeto</option>
              {projects
                .filter((p) => p.status !== 'concluido' || p.id === projectId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <div className="relative search">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input pl-8 w-[170px]" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" />
            </div>
            <div className="segmented" role="group" aria-label="Como mostrar">
              <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')} title="Kanban" aria-label="Kanban">
                <Kanban size={14} weight={view === 'kanban' ? 'fill' : 'regular'} />
              </button>
              <button className={view === 'lista' ? 'active' : ''} onClick={() => setView('lista')} title="Lista" aria-label="Lista">
                <List size={14} weight="bold" />
              </button>
            </div>
            {repo && (
              <button className="btn btn-ghost" onClick={runImport} disabled={importing} title={`Importar e atualizar as Issues de ${repo.owner}/${repo.repo}`}>
                <GithubLogo size={14} />
                <Label>{importing ? 'Lendo Issues...' : 'Issues do GitHub'}</Label>
              </button>
            )}
            <button className="btn btn-accent" onClick={() => setEditing({ defaults: { project_id: project ? project.id : '' } })} title="Nova tarefa (N)">
              <Plus size={14} weight="bold" />
              <Label>Nova tarefa</Label>
            </button>
          </div>
        </section>

        {error ? (
          <div className="card p-6 text-[13px]">
            <p className="font-medium mb-1">Não consegui abrir as tarefas.</p>
            <p className="text-muted">{error}</p>
          </div>
        ) : loading ? (
          <p className="mono text-[12px] text-muted">carregando<span className="blink">_</span></p>
        ) : view === 'kanban' ? (
          <section className="kanban anim-rise">
            {STATUS_ORDER.map((status) => (
              <div
                key={status}
                className={`kanban-col ${dropAt?.status === status && !dropAt.beforeId ? 'is-drop' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dropAt?.status !== status || dropAt.beforeId) setDropAt({ status, beforeId: null });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDrop(status, null, e);
                }}
              >
                <header className="kanban-head">
                  <StatusIcon status={status} />
                  <span className="font-medium">{TASK_STATUS[status].label}</span>
                  <span className="panel-meta">{columns[status].length}</span>
                  <button className="btn btn-quiet btn-icon btn-xs ml-auto" onClick={() => setAdding(status)} aria-label={`Nova tarefa em ${TASK_STATUS[status].label}`} title="Adicionar aqui">
                    <Plus size={12} />
                  </button>
                </header>
                {adding === status && (
                  <QuickAdd
                    onAdd={(title) => quickAdd(status, title)}
                    onClose={() => setAdding(null)}
                  />
                )}
                <div className="kanban-cards">
                  {columns[status].map((t) => (
                    <Card key={t.id} t={t} />
                  ))}
                  {!columns[status].length && adding !== status && <p className="kanban-empty">{status === 'done' ? 'nada concluído ainda' : 'vazio'}</p>}
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="flex flex-col gap-4 anim-rise">
            {STATUS_ORDER.map((status) =>
              columns[status].length ? (
                <div key={status}>
                  <p className="flex items-center gap-2 mb-2 text-[13px] font-medium">
                    <StatusIcon status={status} />
                    {TASK_STATUS[status].label}
                    <span className="panel-meta">{columns[status].length}</span>
                  </p>
                  <div className="card list-card">
                    {columns[status].map((t) => (
                      <div key={t.id} className={`list-row ${t.status === 'done' ? 'is-done' : ''}`} onClick={(e) => !e.target.closest('button') && setEditing({ task: t })}>
                        <button className="task-status-btn" onClick={() => cycle(t)} title="Passar para o próximo status" aria-label="Mudar status">
                          <StatusIcon status={t.status} />
                        </button>
                        <PriorityIcon priority={t.priority} />
                        <span className="flex-1 min-w-0 truncate task-title">{t.title}</span>
                        <span className="flex items-center gap-1.5 max-[700px]:hidden">
                          {(t.labels || []).slice(0, 2).map((l) => (
                            <span key={l} className="task-label">
                              {l}
                            </span>
                          ))}
                        </span>
                        {projectId === 'all' && t.project_id && <span className="task-project max-[560px]:hidden">{projectName.get(t.project_id)}</span>}
                        <DueChip due={t.due_date} done={t.status === 'done'} />
                        <GithubChip github={t.github} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
            {!visible.length && <EmptyTasks onCreate={() => setEditing({ defaults: { project_id: project ? project.id : '' } })} repo={repo} onImport={runImport} />}
          </section>
        )}

        {view === 'kanban' && !loading && !error && !visible.length && (
          <EmptyTasks onCreate={() => setEditing({ defaults: { project_id: project ? project.id : '' } })} repo={repo} onImport={runImport} />
        )}
      </div>

      {editing && <TaskModal task={editing.task} defaults={editing.defaults} onClose={() => setEditing(null)} />}
    </div>
  );
}

function QuickAdd({ onAdd, onClose }) {
  const [title, setTitle] = useState('');
  return (
    <form
      className="mb-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(title);
        setTitle('');
      }}
    >
      <input
        className="input input-sm"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        onBlur={() => !title.trim() && onClose()}
        placeholder="Título e Enter"
        autoFocus
      />
    </form>
  );
}

function EmptyTasks({ onCreate, repo, onImport }) {
  return (
    <div className="card border-dashed px-8 py-12 text-center mt-3">
      <p className="prompt mono text-[13px] text-muted mb-2">gwen tasks</p>
      <h3 className="font-display text-xl font-semibold mb-2">Nenhuma tarefa aqui.</h3>
      <p className="text-muted max-w-[440px] mx-auto mb-6 leading-relaxed">
        Crie com o botão ou com a tecla N. {repo ? 'Ou traga as Issues do repositório deste projeto.' : 'Com um link do GitHub no projeto, dá para trazer as Issues.'}
      </p>
      <div className="flex gap-2 justify-center">
        <button className="btn btn-primary" onClick={onCreate}>
          <Plus size={14} weight="bold" />
          <Label>Nova tarefa</Label>
        </button>
        {repo && (
          <button className="btn btn-ghost" onClick={onImport}>
            <GithubLogo size={14} />
            <Label>Issues do GitHub</Label>
          </button>
        )}
      </div>
    </div>
  );
}
