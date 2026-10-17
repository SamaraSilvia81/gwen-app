import { useState } from 'react';
import { ArrowSquareOut, Code, FolderOpen, Lightning, PencilSimple, Stop, TerminalWindow } from '@phosphor-icons/react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { openFolder, openLink, normalizeUrl } from '../lib/native';
import { formatDuration } from '../lib/time';
import { STATUS } from '../lib/stats';
import { Label } from './Modal';

const ACTION_ICON = { vscode: Code, explorer: FolderOpen, gitbash: TerminalWindow };

export default function ProjectCard({ project, time, categoryName, onEdit }) {
  const { activeSession, launchProject, endSession } = useWorkspace();
  const { profile } = useProfile();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isActive = activeSession?.project_id === project.id;

  async function run(fn) {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast(err?.message || String(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const folders = project.folders || [];
  const links = project.links || [];

  return (
    <article className={`card flex flex-col p-4 gap-3.5 ${isActive ? 'is-active' : ''}`}>
      <header className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`chip status-${project.status}`}>
              <span className="chip-dot" />
              {STATUS[project.status]?.label}
            </span>
            {categoryName && <span className="mono text-[11px] text-muted truncate">{categoryName}</span>}
          </div>
          <h3 className="font-display text-[16px] font-semibold leading-tight truncate" title={project.name}>
            {project.name}
          </h3>
        </div>
        <button className="btn btn-quiet btn-icon btn-sm" onClick={onEdit} title="Editar projeto" aria-label="Editar projeto">
          <PencilSimple size={14} />
        </button>
      </header>

      {project.description && <p className="text-[13px] text-muted leading-relaxed line-clamp-2">{project.description}</p>}

      {(folders.length > 0 || links.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {folders.map((f, i) => {
            const Icon = ACTION_ICON[f.action] || FolderOpen;
            return (
              <button
                key={`f${i}`}
                className="btn btn-ghost btn-sm"
                title={f.path}
                disabled={busy}
                onClick={() => run(() => openFolder(f.action, f.path, profile?.git_bash_path))}
              >
                <Icon size={13} />
                <span className="max-w-[120px] truncate">{f.label || 'Pasta'}</span>
              </button>
            );
          })}
          {links.map((l, i) => (
            <button
              key={`l${i}`}
              className="btn btn-ghost btn-sm"
              title={l.url}
              disabled={busy}
              onClick={() => run(() => openLink(normalizeUrl(l.url)))}
            >
              <ArrowSquareOut size={13} />
              <span className="max-w-[120px] truncate">{l.label || 'Link'}</span>
            </button>
          ))}
        </div>
      )}

      <footer className="flex items-center justify-between gap-3 mt-auto pt-3 border-t border-rule">
        <span className="mono text-[11px] text-muted tabular">
          {time > 0 ? `${formatDuration(time)} esta semana` : 'sem tempo esta semana'}
        </span>
        {isActive ? (
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(() => endSession())}>
            <Stop size={12} weight="fill" />
            <Label>Encerrar</Label>
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(() => launchProject(project))}>
            <Lightning size={13} weight="fill" />
            <Label>Codar agora</Label>
          </button>
        )}
      </footer>
    </article>
  );
}
