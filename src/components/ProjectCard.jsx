import { useEffect, useRef, useState } from 'react';
import {
  ArrowBendDownRight, ArrowSquareOut, CaretDown, Code, FolderOpen, GitBranch, Hourglass, Lightning, PencilSimple, PushPin, Stop,
  Terminal, TerminalWindow,
} from '@phosphor-icons/react';
import { appIcon, launchApp, resolveLauncher } from '../lib/launcher';
import { Kanban } from '@phosphor-icons/react';
import { useTasks } from '../context/TasksContext';
import { openTasks } from '../lib/tasksNav';
import { useWorkspace } from '../context/WorkspaceContext';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { openFolder, openLink, normalizeUrl } from '../lib/native';
import { formatDuration } from '../lib/time';
import { STATUS } from '../lib/stats';
import { folderActions, projectFronts } from '../lib/projectModel';
import { timeAgo, useGitStatus } from '../lib/useGitStatus';
import { Label } from './Modal';

import { STALE_DAYS } from '../lib/collections';

const ACTION_ICON = { vscode: Code, explorer: FolderOpen, gitbash: TerminalWindow, terminal: Terminal, powershell: TerminalWindow };
const ACTION_NAME = { vscode: 'VS Code', explorer: 'Explorer', gitbash: 'Git Bash', terminal: 'Windows Terminal', powershell: 'PowerShell' };

/** Uma linha por repositório: branch, alterações, commits sem push, último commit */
function GitLine({ repo, showLabel }) {
  const { branch, changes, ahead, behind, has_upstream: upstream, last_commit_at: last } = repo.info;
  const parts = [];
  if (changes) parts.push({ text: `${changes} ${changes === 1 ? 'alteração' : 'alterações'}`, warn: true });
  if (ahead) parts.push({ text: `${ahead} sem push`, warn: true });
  if (behind) parts.push({ text: `${behind} para puxar`, warn: true });
  if (branch && !upstream) parts.push({ text: 'sem remoto', warn: false });
  if (!changes && !ahead && !behind && upstream) parts.push({ text: 'em dia', warn: false });
  if (last) parts.push({ text: `último commit ${timeAgo(last)}`, warn: false });

  return (
    <p className="flex items-center gap-1.5 mono text-[11px] text-muted min-w-0" title={repo.path}>
      <GitBranch size={12} className="shrink-0" />
      {showLabel && repo.label && <span className="truncate max-w-[90px]">{repo.label}:</span>}
      <span className="text-bone truncate max-w-[110px]">{branch || 'sem branch'}</span>
      {parts.map((p, i) => (
        <span key={i} className={`whitespace-nowrap ${p.warn ? 'text-phosphor' : ''}`}>· {p.text}</span>
      ))}
    </p>
  );
}

export default function ProjectCard({ project, time, frontTimes, categoryName, onEdit, focused = false }) {
  const { activeSessions, launchProject, requestEnd, notes, togglePin } = useWorkspace();
  const { profile } = useProfile();
  const { tasks } = useTasks();
  const openTaskCount = tasks.filter((t) => t.project_id === project.id && t.status !== 'done').length;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  // pode haver mais de uma sessão aberta (0.8): esta é a do projeto, se houver
  const mySessions = activeSessions.filter((s) => s.project_id === project.id);
  const activeSession = mySessions[0] || null;
  const isActive = !!activeSession;

  const folders = project.folders || [];
  const links = project.links || [];
  // apps cadastrados em Ajustes que este projeto abre (0.8)
  const registered = resolveLauncher(profile?.launcher).apps;
  const projectApps = (project.apps || []).map((id) => registered.find((a) => a.id === id)).filter(Boolean);
  const fronts = projectFronts(project);
  const repos = useGitStatus(folders);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

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

  async function openFolderAll(f) {
    for (const action of folderActions(f)) await openFolder(action, f.path, profile?.git_bash_path);
  }

  function launch(front = null) {
    setMenuOpen(false);
    run(() => launchProject(project, front));
  }

  const where = notes?.get(project.id);

  // projeto parado: em andamento e sem atividade (abertura ou commit) há STALE_DAYS
  const lastActivity = Math.max(
    ...[project.last_opened_at, project.created_at, ...repos.map((r) => r.info.last_commit_at)]
      .filter(Boolean)
      .map((d) => new Date(d).getTime()),
  );
  const idleDays = Math.floor((Date.now() - lastActivity) / 86_400_000);
  const stale = project.status === 'andamento' && !isActive && Number.isFinite(idleDays) && idleDays >= STALE_DAYS;

  const frontTime = (front) => frontTimes?.get(`${project.id}::${front.toLowerCase()}`) || 0;

  return (
    <article
      data-project-id={project.id}
      className={`card project-card flex flex-col p-4 gap-3.5 cursor-pointer ${isActive ? 'is-active' : ''} ${focused ? 'is-focused' : ''}`}
      // clicar em qualquer parte do card abre o projeto; botões e menus continuam com a própria ação
      onClick={(e) => !e.target.closest('button, a, input, [role="menu"]') && onEdit()}
    >
      <header className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`chip status-${project.status}`}>
              <span className="chip-dot" />
              {STATUS[project.status]?.label}
            </span>
            {categoryName && <span className="mono text-[11px] text-muted truncate">{categoryName}</span>}
            {isActive && activeSession.front && <span className="mono text-[11px] text-phosphor truncate">{activeSession.front}</span>}
            {stale && (
              <span className="chip text-phosphor" title="Em andamento, mas sem abrir nem commitar há um tempo. Retomar, pausar ou concluir?">
                <Hourglass size={11} />
                parado há {idleDays} dias
              </span>
            )}
          </div>
          <h3 className="font-display text-[16px] font-semibold leading-tight truncate" title={project.name}>
            {project.name}
          </h3>
        </div>
        <div className="flex -mr-1">
          <button
            className={`btn btn-quiet btn-icon btn-sm ${project.pinned ? 'text-phosphor' : ''}`}
            onClick={() => run(() => togglePin(project))}
            title={project.pinned ? 'Soltar do topo' : 'Fixar no painel'}
            aria-label={project.pinned ? 'Soltar do topo' : 'Fixar no painel'}
            aria-pressed={!!project.pinned}
          >
            <PushPin size={14} weight={project.pinned ? 'fill' : 'regular'} />
          </button>
          <button className="btn btn-quiet btn-icon btn-sm" onClick={onEdit} title="Editar projeto" aria-label="Editar projeto">
            <PencilSimple size={14} />
          </button>
        </div>
      </header>

      {project.description && <p className="text-[13px] text-muted leading-relaxed line-clamp-2">{project.description}</p>}

      {where && (
        <p
          className="flex items-start gap-2 text-[12.5px] leading-snug px-2.5 py-2 rounded-ui-sm bg-[var(--c-phosphor-8)]"
          title={`Anotado ${timeAgo(where.at)}${where.front ? ` · ${where.front}` : ''}`}
        >
          <ArrowBendDownRight size={13} className="text-phosphor shrink-0 mt-[2px]" />
          <span className="line-clamp-2">
            <span className="text-muted">onde parei: </span>
            {where.note}
          </span>
        </p>
      )}

      {(folders.length > 0 || links.length > 0 || projectApps.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {folders.map((f, i) => {
            const actions = folderActions(f);
            return (
              <button
                key={`f${i}`}
                className="btn btn-ghost btn-sm"
                title={`${f.path}\n${actions.map((a) => ACTION_NAME[a]).join(' + ')}${f.command ? `\nComando: ${f.command}` : ''}${f.front ? `\nFrente: ${f.front}` : ''}`}
                disabled={busy}
                onClick={() => run(() => openFolderAll(f))}
              >
                {actions.map((a) => {
                  const Icon = ACTION_ICON[a] || FolderOpen;
                  return <Icon key={a} size={13} />;
                })}
                <span className="max-w-[120px] truncate">{f.label || 'Pasta'}</span>
              </button>
            );
          })}
          {links.map((l, i) => (
            <button
              key={`l${i}`}
              className="btn btn-ghost btn-sm"
              title={`${l.url}${l.front ? `\nFrente: ${l.front}` : ''}`}
              disabled={busy}
              onClick={() => run(() => openLink(normalizeUrl(l.url)))}
            >
              <ArrowSquareOut size={13} />
              <span className="max-w-[120px] truncate">{l.label || 'Link'}</span>
            </button>
          ))}
          {projectApps.map((a) => {
            const Icon = appIcon(a);
            return (
              <button key={`a${a.id}`} className="btn btn-ghost btn-sm" title={`${a.name}: ${a.target}`} disabled={busy} onClick={() => run(() => launchApp(a))}>
                <Icon size={13} />
                <span className="max-w-[120px] truncate">{a.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {repos.length > 0 && (
        <div className="flex flex-col gap-1">
          {repos.map((r) => (
            <GitLine key={r.path} repo={r} showLabel={repos.length > 1} />
          ))}
        </div>
      )}

      <footer className="flex items-center justify-between gap-3 mt-auto pt-3 border-t border-rule">
        <span className="flex items-center gap-2 min-w-0">
          <span className="mono text-[11px] text-muted tabular truncate">
            {time > 0 ? `${formatDuration(time, { short: true })} na semana` : 'sem tempo na semana'}
          </span>
          <button className="task-label hover:text-bone" onClick={() => openTasks(project.id)} title="Abrir as tarefas deste projeto">
            <Kanban size={11} />
            {openTaskCount ? `${openTaskCount} ${openTaskCount === 1 ? 'tarefa' : 'tarefas'}` : 'tarefas'}
          </button>
        </span>
        {isActive ? (
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => requestEnd(activeSession.id)}>
            <Stop size={12} weight="fill" />
            <Label>Encerrar</Label>
          </button>
        ) : fronts.length > 1 ? (
          <div className="relative" ref={menuRef}>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
              <Lightning size={13} weight="fill" />
              <Label>Começar agora</Label>
              <CaretDown size={11} />
            </button>
            {menuOpen && (
              <div className="card absolute right-0 bottom-[calc(100%+6px)] w-[220px] p-1.5 shadow-2xl anim-rise z-50">
                <p className="eyebrow px-2.5 pt-1 pb-1.5">qual frente?</p>
                {fronts.map((front) => (
                  <button
                    key={front}
                    onClick={() => launch(front)}
                    className="w-full flex items-center gap-3 h-9 px-2.5 rounded-ui-sm text-left hover:bg-[var(--c-phosphor-8)]"
                  >
                    <span className="flex-1 text-[13px] truncate">{front}</span>
                    {frontTime(front) > 0 && <span className="mono text-[10px] text-muted">{formatDuration(frontTime(front))}</span>}
                  </button>
                ))}
                <button
                  onClick={() => launch(null)}
                  className="w-full flex items-center gap-3 h-9 px-2.5 rounded-ui-sm text-left text-muted hover:bg-[var(--c-phosphor-8)] border-t border-rule mt-1"
                >
                  <span className="flex-1 text-[13px]">Tudo junto</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => launch(fronts[0] || null)}>
            <Lightning size={13} weight="fill" />
            <Label>Começar agora</Label>
          </button>
        )}
      </footer>
    </article>
  );
}
