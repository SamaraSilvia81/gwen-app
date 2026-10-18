import { useEffect, useRef, useState } from 'react';
import {
  ArrowBendDownRight, ArrowSquareOut, CaretDown, Code, FolderOpen, GitBranch, Hourglass, Lightning, PencilSimple, Stop,
  TerminalWindow,
} from '@phosphor-icons/react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { openFolder, openLink, normalizeUrl } from '../lib/native';
import { formatDuration } from '../lib/time';
import { STATUS } from '../lib/stats';
import { folderActions, projectFronts } from '../lib/projectModel';
import { timeAgo, useGitStatus } from '../lib/useGitStatus';
import { Label } from './Modal';

/** Em andamento, sem Começar agora nem commit há mais que isso = parado */
const STALE_DAYS = 30;

const ACTION_ICON = { vscode: Code, explorer: FolderOpen, gitbash: TerminalWindow };
const ACTION_NAME = { vscode: 'VS Code', explorer: 'Explorer', gitbash: 'Git Bash' };

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

export default function ProjectCard({ project, time, frontTimes, categoryName, onEdit }) {
  const { activeSession, launchProject, requestEnd, notes } = useWorkspace();
  const { profile } = useProfile();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isActive = activeSession?.project_id === project.id;

  const folders = project.folders || [];
  const links = project.links || [];
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
      className={`card flex flex-col p-4 gap-3.5 cursor-pointer hover:border-[var(--c-phosphor-40)] transition-colors ${isActive ? 'is-active' : ''}`}
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
        <button className="btn btn-quiet btn-icon btn-sm" onClick={onEdit} title="Editar projeto" aria-label="Editar projeto">
          <PencilSimple size={14} />
        </button>
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

      {(folders.length > 0 || links.length > 0) && (
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
        <span className="mono text-[11px] text-muted tabular">
          {time > 0 ? `${formatDuration(time)} esta semana` : 'sem tempo esta semana'}
        </span>
        {isActive ? (
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={requestEnd}>
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
