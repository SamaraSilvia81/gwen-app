import { useState } from 'react';
import { ArrowSquareOut, Trash } from '@phosphor-icons/react';
import Modal, { Label } from './Modal';
import { useTasks } from '../context/TasksContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { TASK_PRIORITY, TASK_STATUS } from '../data/repository';
import { openLink } from '../lib/native';
import { PriorityIcon, STATUS_ORDER, StatusIcon } from './TaskBits';

/** Criar ou editar uma tarefa (0.9) */
export default function TaskModal({ task = null, defaults = {}, onClose }) {
  const { createTask, updateTask, deleteTask } = useTasks();
  const { projects } = useWorkspace();
  const toast = useToast();
  const [draft, setDraft] = useState(() => ({
    title: task?.title || '',
    description: task?.description || '',
    project_id: task?.project_id ?? defaults.project_id ?? '',
    status: task?.status || defaults.status || 'todo',
    priority: task?.priority ?? 0,
    labels: (task?.labels || []).join(', '),
    due_date: task?.due_date || '',
  }));
  const [busy, setBusy] = useState(false);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  async function save(e) {
    e?.preventDefault();
    if (!draft.title.trim()) return;
    setBusy(true);
    const data = {
      ...draft,
      project_id: draft.project_id || null,
      labels: draft.labels.split(',').map((l) => l.trim()).filter(Boolean),
      due_date: draft.due_date || null,
    };
    try {
      if (task) await updateTask(task, data);
      else await createTask(data);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
    await deleteTask(task);
    toast('Tarefa excluída.');
    onClose();
  }

  const open = projects.filter((p) => p.status !== 'concluido' || p.id === draft.project_id);

  return (
    <Modal
      eyebrow={task ? 'editar tarefa' : 'nova tarefa'}
      title={task ? task.title : 'O que precisa ser feito?'}
      onClose={onClose}
      width={620}
      footer={
        <>
          {task && (
            <button className="btn btn-quiet mr-auto" onClick={remove} disabled={busy}>
              <Trash size={13} />
              <Label>Excluir</Label>
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            <Label>Cancelar</Label>
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !draft.title.trim()}>
            <Label>{task ? 'Salvar' : 'Criar tarefa'}</Label>
          </button>
        </>
      }
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <label className="field">
          <span className="field-label">Título</span>
          <input className="input" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex.: ajustar o filtro da tabela" autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Descrição</span>
          <textarea className="input" rows={4} value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Detalhes, links, critério de pronto..." />
        </label>

        <div>
          <p className="field-label mb-2">Status</p>
          <div className="segmented max-w-full overflow-x-auto">
            {STATUS_ORDER.map((s) => (
              <button type="button" key={s} className={draft.status === s ? 'active' : ''} onClick={() => set({ status: s })}>
                <StatusIcon status={s} size={13} />
                {TASK_STATUS[s].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="field-label mb-2">Prioridade</p>
          <div className="segmented max-w-full overflow-x-auto">
            {TASK_PRIORITY.map((label, i) => (
              <button type="button" key={label} className={draft.priority === i ? 'active' : ''} onClick={() => set({ priority: i })} title={label}>
                <PriorityIcon priority={i} size={13} />
                <span className="max-[640px]:hidden">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_170px] max-[560px]:grid-cols-1 gap-3">
          <label className="field">
            <span className="field-label">Projeto</span>
            <select className="input" value={draft.project_id || ''} onChange={(e) => set({ project_id: e.target.value })}>
              <option value="">Sem projeto</option>
              {open.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Prazo</span>
            <input className="input" type="date" value={draft.due_date} onChange={(e) => set({ due_date: e.target.value })} />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Etiquetas</span>
          <input className="input" value={draft.labels} onChange={(e) => set({ labels: e.target.value })} placeholder="front, bug, docs (separadas por vírgula)" />
        </label>

        {task?.github?.url && (
          <button type="button" className="btn btn-ghost self-start" onClick={() => openLink(task.github.url)}>
            <ArrowSquareOut size={13} />
            <Label>{`Abrir ${task.github.repo} #${task.github.number} no GitHub`}</Label>
          </button>
        )}
      </form>
    </Modal>
  );
}
