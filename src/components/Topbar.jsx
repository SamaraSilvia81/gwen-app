import { useEffect, useRef, useState } from 'react';
import { CaretDown, GameController, Lightning, Moon, MusicNotes, Pause, Stop, Sun } from '@phosphor-icons/react';
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
import { ACTIVITY_LABEL, activitySeconds, currentActivity } from '../lib/nowActivity';

export function greeting(date) {
  const h = date.getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Barra de cima (0.7): caminho da tela à esquerda, sessão e ações à direita. */
export default function Topbar({ view = 'inicio', filter = 'all', playing = [], game = null, onOpenApps }) {
  const { profile, updateProfile } = useProfile();
  const { activeSession, activeSessions, activeBreak, projects, categories, requestEnd, startBreak } = useWorkspace();
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const sessionsRef = useRef(null);
  useEffect(() => {
    if (!sessionsOpen) return;
    const close = (e) => !sessionsRef.current?.contains(e.target) && setSessionsOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [sessionsOpen]);
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
  const activity = currentActivity({ playing, game });
  // com várias sessões, o relógio da pílula é o da aberta há mais tempo
  const oldest = activeSessions[activeSessions.length - 1] || null;
  const elapsed = activeSessions.length > 1 ? sessionSeconds(oldest, now, activeBreak) : activeSession ? sessionSeconds(activeSession, now, activeBreak) : 0;

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

  function handleEnd(id) {
    requestEnd(id);
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
        {activeSessions.length > 1 ? (
          // várias sessões em paralelo (0.8): a pílula mostra quantas e abre a lista
          <div className="relative" ref={sessionsRef}>
            <button className="session-pill pr-2.5" onClick={() => setSessionsOpen((v) => !v)} aria-expanded={sessionsOpen}>
              <span className="w-2 h-2 rounded-full bg-phosphor anim-breathe shrink-0" />
              <span className="text-[13px] font-medium">{activeSessions.length} sessões</span>
              <span className="mono text-[13px] tabular text-phosphor">{formatClock(elapsed)}</span>
              <CaretDown size={11} />
            </button>
            {sessionsOpen && (
              <div className="card absolute right-0 top-[calc(100%+6px)] w-[300px] p-1.5 shadow-2xl anim-rise z-50">
                <p className="eyebrow px-2.5 pt-1 pb-1.5">em andamento</p>
                {activeSessions.map((s) => {
                  const p = projects.find((x) => x.id === s.project_id);
                  return (
                    <div key={s.id} className="flex items-center gap-2 h-10 px-2.5 rounded-ui-sm hover:bg-[var(--c-phosphor-8)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-phosphor shrink-0" />
                      <span className="flex-1 min-w-0 text-[13px] truncate">
                        {p?.name || 'Projeto'}
                        {s.front && <span className="text-muted"> · {s.front}</span>}
                      </span>
                      <span className="mono text-[12px] tabular text-phosphor">{formatClock(sessionSeconds(s, now, activeBreak))}</span>
                      <button
                        className="btn btn-quiet btn-icon btn-xs"
                        onClick={() => {
                          setSessionsOpen(false);
                          requestEnd(s.id);
                        }}
                        title="Encerrar esta sessão"
                        aria-label={`Encerrar ${p?.name || 'sessão'}`}
                      >
                        <Stop size={12} weight="fill" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeSession ? (
          <div className="session-pill">
            <span className="w-2 h-2 rounded-full bg-phosphor anim-breathe shrink-0" />
            <span className="text-[13px] font-medium max-w-[200px] truncate max-[760px]:hidden" title={project?.name}>
              {project?.name || 'Projeto'}
              {activeSession.front && <span className="text-muted font-normal"> · {activeSession.front}</span>}
            </span>
            <span className="mono text-[13px] tabular text-phosphor" title={`Desde ${formatHour(activeSession.started_at)}`}>
              {formatClock(elapsed)}
            </span>
            <button className="btn btn-quiet btn-icon btn-sm" onClick={() => handleEnd(activeSession.id)} title="Encerrar sessão" aria-label="Encerrar sessão">
              <Stop size={14} weight="fill" />
            </button>
          </div>
        ) : (
          <span className="mono text-[11px] text-muted hidden lg:inline mr-1">nenhuma sessão ativa</span>
        )}

        {activity && (
          // agora no mapeamento: jogo na frente ou mídia tocando, com o tempo de hoje desse app.
          // Some quando para; o clique abre Relatório, Apps e jogos. Relógio com largura fixa para não pular.
          <button
            className="btn btn-ghost gap-1.5 px-2.5"
            onClick={onOpenApps}
            title={`${ACTIVITY_LABEL[activity.kind]}: ${activity.name}${activity.more > 0 ? ` (+${activity.more})` : ''} · ${formatClock(activitySeconds(activity, now.getTime()))} hoje. Clique para ver Apps e jogos.`}
            aria-label={`${ACTIVITY_LABEL[activity.kind]}: ${activity.name}`}
          >
            {activity.kind === 'jogos' ? (
              <GameController size={14} weight="fill" className="text-phosphor anim-breathe" />
            ) : (
              <MusicNotes size={14} weight="fill" className="text-phosphor anim-breathe" />
            )}
            <span className="text-[13px] max-w-[120px] truncate max-[760px]:hidden">{activity.name}</span>
            <span className="mono text-[12px] tabular text-phosphor text-right min-w-[5ch]">{formatClock(activitySeconds(activity, now.getTime()))}</span>
            {activity.more > 0 && <span className="mono text-[11px] text-muted max-[760px]:hidden">+{activity.more}</span>}
          </button>
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
