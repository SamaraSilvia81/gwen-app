import { useEffect, useRef, useState } from 'react';
import { CaretDown, Pause, Stop } from '@phosphor-icons/react';
import { useWorkspace, useNow } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatClock, formatHour, sessionSeconds } from '../lib/time';
import { BREAK_KINDS } from '../lib/breaks';
import { Label } from './Modal';

function greeting(date) {
  const h = date.getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Topbar({ title }) {
  const { profile } = useAuth();
  const { activeSession, activeBreak, projects, endSession, startBreak } = useWorkspace();
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

  async function handleEnd() {
    try {
      await endSession();
      toast('Sessão encerrada. Bom trabalho.');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <header className="glass h-[52px] shrink-0 flex items-center justify-between gap-4 px-6 border-b border-rule relative z-20">
      <div className="min-w-0">
        <p className="font-display font-semibold truncate">
          {title || `${greeting(now)}, ${profile?.display_name || 'dev'}.`}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {activeSession ? (
          <div className="flex items-center gap-3 h-9 pl-3 pr-1 rounded-ui-sm border border-[var(--c-phosphor-40)] bg-[var(--c-phosphor-8)]">
            <span className="w-2 h-2 rounded-full bg-phosphor anim-breathe" />
            <span className="text-[13px] font-medium max-w-[180px] truncate" title={project?.name}>
              {project?.name || 'Projeto'}
            </span>
            <span className="mono text-[13px] tabular text-phosphor" title={`Desde ${formatHour(activeSession.started_at)}`}>
              {formatClock(elapsed)}
            </span>
            <button className="btn btn-quiet btn-icon btn-sm" onClick={handleEnd} title="Encerrar sessão" aria-label="Encerrar sessão">
              <Stop size={14} weight="fill" />
            </button>
          </div>
        ) : (
          <span className="mono text-[12px] text-muted hidden md:inline">nenhuma sessão ativa</span>
        )}

        <div className="relative" ref={menuRef}>
          <button className="btn btn-ghost" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen}>
            <Pause size={14} weight="bold" />
            <Label>Pausa</Label>
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
