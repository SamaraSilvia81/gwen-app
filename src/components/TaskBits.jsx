import {
  CalendarBlank, CellSignalHigh, CellSignalLow, CellSignalMedium, CheckCircle, Circle, CircleDashed, CircleHalf, GithubLogo,
  Minus, WarningOctagon,
} from '@phosphor-icons/react';
import { TASK_PRIORITY, TASK_STATUS } from '../data/repository';

/** Pedacinhos visuais das tarefas (0.9), usados no kanban, na lista e no Início */
export const STATUS_ORDER = ['todo', 'doing', 'review', 'done'];

const STATUS_ICON = { todo: Circle, doing: CircleHalf, review: CircleDashed, done: CheckCircle };

export function StatusIcon({ status, size = 15 }) {
  const Icon = STATUS_ICON[status] || Circle;
  return (
    <Icon
      size={size}
      weight={status === 'done' ? 'fill' : status === 'doing' ? 'fill' : 'bold'}
      className={`task-status task-status-${status}`}
      aria-label={TASK_STATUS[status]?.label}
    />
  );
}

const PRIORITY_ICON = [Minus, CellSignalLow, CellSignalMedium, CellSignalHigh, WarningOctagon];

export function PriorityIcon({ priority = 0, size = 14 }) {
  const Icon = PRIORITY_ICON[priority] || Minus;
  return <Icon size={size} weight={priority === 4 ? 'fill' : 'bold'} className={`task-priority task-priority-${priority}`} aria-label={TASK_PRIORITY[priority]} />;
}

/** "hoje", "amanhã", "atrasada há 3 dias", "12 out" */
export function dueInfo(due, now = new Date()) {
  if (!due) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${due}T00:00:00`);
  const days = Math.round((d - today) / 86_400_000);
  if (days === 0) return { label: 'hoje', tone: 'soon' };
  if (days === 1) return { label: 'amanhã', tone: 'soon' };
  if (days < 0) return { label: days === -1 ? 'ontem' : `há ${-days} dias`, tone: 'late' };
  return { label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), tone: 'later' };
}

export function DueChip({ due, done }) {
  const info = dueInfo(due);
  if (!info) return null;
  return (
    <span className={`task-due ${done ? '' : `is-${info.tone}`}`} title={`Prazo: ${new Date(`${due}T00:00:00`).toLocaleDateString('pt-BR')}`}>
      <CalendarBlank size={11} />
      {info.label}
    </span>
  );
}

export function GithubChip({ github }) {
  if (!github?.url) return null;
  return (
    <span className="task-gh" title={`${github.repo} #${github.number} (${github.state === 'closed' ? 'fechada' : 'aberta'} no GitHub)`}>
      <GithubLogo size={11} />#{github.number}
    </span>
  );
}
