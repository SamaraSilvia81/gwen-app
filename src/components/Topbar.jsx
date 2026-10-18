import { useEffect, useRef, useState } from 'react';
import { CaretDown, Lightning, Moon, Pause, Stop, Sun } from '@phosphor-icons/react';
import { openQuickLaunch } from './QuickLaunch';
import { useWorkspace, useNow } from '../context/WorkspaceContext';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { formatClock, formatHour, sessionSeconds } from '../lib/time';
import { BREAK_KINDS } from '../lib/breaks';
import { effectiveMode } from '../lib/themes';
import { Label } from './Modal';
import { VIEWS } from './Rail';
import { filterLabel } from '../lib/collections';

export function greeting(date) {
  const h = date.getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Barra de cima (0.7): caminho da tela à esquerda, sessão e ações à direita. */
export default function Topbar({ view = 'inicio', filter = 'all' }) {
  const { profile, updateProfile } = useProfile();
  const { activeSession, activeBreak, projects, categories, requestEnd, startBreak } = useWorkspace();
  const toast = useToast();
  const now = useNow(1000);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const project = activeSession && projects.find((p) => p.id === activeSession.project_id);
  const elapsed = activeSession ? sessionSeconds(activeSession, now, activeBreak) : 0;

  async function handleBreak(kind) {
    setMenuOpen(false);
    try {
      await startBreak(kind);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  const isLight = effectiveMode(profile?.mode) === 'claro';
  async function toggleMode() {
    try {
      await updateProfile({ mode: isLight ? 'escuro' : 'claro' });
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function handleEnd() {
    requestEnd();
  }

  return (
    <header className="topbar glass">
      <nav className="min-w-0 flex items-center gap-1.5 text-[13px]" aria-label="Você está em">
        <span className="text-muted hidden sm:inline">G.W.E.N.</span>
        <span className="text-muted hidden sm:inline">/</span>
        <span className={`font-medium truncate ${view === 'projetos' ? 'text-muted' : 'text-bone'}`}>{VIEWS[view]?.title || VIEWS[view]?.label}</span>
        {view === 'projetos' && (
          <>
            <span className="text-muted">/</span>
            <span className="font-medium text-bone truncate">{filterLabel(filter, categories)}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-1.5 shrink-0">
        {activeSession ? (
          <div className="session-pill">
            <span className="w-2 h-2 rounded-full bg-phosphor anim-breathe shrink-0" />
            <span className="text-[13px] font-medium max-w-[200px] truncate max-[760px]:hidden" title={project?.name}>
              {project?.name || 'Projeto'}
              {activeSession.front && <span className="text-muted font-normal"> · {activeSession.front}</span>}
            </span>
            <span className="mono text-[13px] tabular text-phosphor" title={`Desde ${formatHour(activeSession.started_at)}`}>
              {formatClock(elapsed)}
            </span>
            <button className="btn btn-quiet btn-icon btn-sm" onClick={handleEnd} title="Encerrar sessão" aria-label="Encerrar sessão">
              <Stop size={14} weight="fill" />
            </button>
          </div>
        ) : (
          <span className="mono text-[11px] text-muted hidden lg:inline mr-1">nenhuma sessão ativa</span>
        )}

        <button className="btn btn-ghost btn-icon" onClick={openQuickLaunch} title="Começar um projeto (Ctrl + K)" aria-label="Começar um projeto">
          <Lightning size={15} />
        </button>

        {/* nas Configurações o modo é escolhido lá dentro, com prévia */}
        {view !== 'config' && (
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleMode}
            title={isLight ? 'Mudar para o modo escuro' : 'Mudar para o modo claro'}
            aria-label={isLight ? 'Mudar para o modo escuro' : 'Mudar para o modo claro'}
          >
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button className="btn btn-ghost" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
            <Pause size={14} weight="bold" />
            <span className="max-[760px]:hidden"><Label>Pausa</Label></span>
            <CaretDown size={12} />
          </button>
          {menuOpen && (
            <div className="card absolute right-0 top-[calc(100%+6px)] w-[230px] p-1.5 shadow-2xl anim-rise z-50">
              {Object.entries(BREAK_KINDS).map(([kind, k]) => (
                <button
                  key={kind}
                  onClick={() => handleBreak(kind)}
                  className="w-full flex items-center gap-3 h-10 px-2.5 rounded-ui-sm text-left hover:bg-[var(--c-phosphor-8)]"
                >
                  <k.icon size={17} className="text-phosphor" />
                  <span className="flex-1 text-[13px]">{k.label}</span>
                  <span className="mono text-[10px] text-muted">{k.target}min</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
