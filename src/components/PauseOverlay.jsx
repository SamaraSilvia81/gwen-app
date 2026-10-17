import { useState } from 'react';
import { ArrowArcLeft } from '@phosphor-icons/react';
import { useWorkspace, useNow } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { BREAK_KINDS } from '../lib/breaks';
import { formatClock, formatDuration, secondsBetween } from '../lib/time';
import Logo from './Logo';
import { Label } from './Modal';

/**
 * Modo pausa: a tela escurece e a barra enche.
 * A barra é de recarga, não de contagem regressiva: ela mostra o quanto você
 * já descansou, e chegar a 100% não te expulsa da pausa.
 */
export default function PauseOverlay() {
  const { activeBreak, activeSession, projects, endBreak } = useWorkspace();
  const toast = useToast();
  const now = useNow(1000);
  const [leaving, setLeaving] = useState(false);

  if (!activeBreak) return null;

  const kind = BREAK_KINDS[activeBreak.kind] || BREAK_KINDS.outro;
  const elapsed = secondsBetween(activeBreak.started_at, now);
  const charge = Math.min(1, elapsed / (kind.target * 60));
  const pct = Math.floor(charge * 100);
  const project = activeSession && projects.find((p) => p.id === activeSession.project_id);
  const Icon = kind.icon;

  async function handleBack() {
    setLeaving(true);
    try {
      await endBreak();
      toast(`Pausa de ${formatDuration(elapsed)} registrada.`);
    } catch (err) {
      toast(err.message, 'error');
      setLeaving(false);
    }
  }

  return (
    <div
      className="glass fixed inset-0 z-[150] flex flex-col items-center justify-center anim-fade"
      style={{ background: 'var(--c-pause-veil)' }}
    >
      <div className="flex flex-col items-center w-full max-w-[520px] px-8">
        <div className="relative mb-10">
          {activeBreak.kind === 'respiro' && (
            <span
              className="absolute inset-[-28px] rounded-full anim-breathe"
              style={{ border: '1px solid var(--c-phosphor-40)', animationDuration: '8s' }}
            />
          )}
          <Logo size={112} charge={charge} />
        </div>

        <p className="eyebrow flex items-center gap-2 mb-3">
          <Icon size={14} /> {kind.label}
        </p>
        <h2 className="font-display text-2xl font-semibold text-center mb-8">
          {charge >= 1 ? 'Bateria cheia. Volte quando quiser.' : kind.phrase}
        </h2>

        <div className="w-full flex items-center gap-4">
          <div className="energy-track flex-1">
            <div className="energy-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="mono text-sm tabular w-12 text-right text-ember">{pct}%</span>
        </div>

        <div className="w-full flex justify-between mt-3 mono text-[12px] text-muted">
          <span>
            descansando há <span className="text-bone tabular">{formatClock(elapsed)}</span>
          </span>
          <span>recarga completa em {kind.target}min</span>
        </div>

        <button className="btn btn-ghost btn-lg mt-12" onClick={handleBack} disabled={leaving}>
          <ArrowArcLeft size={16} />
          <Label>{project ? `Voltar para ${project.name}` : 'Voltar'}</Label>
        </button>
        {project && (
          <p className="mt-3 text-[12px] text-muted">O tempo da pausa não conta na sessão.</p>
        )}
      </div>
    </div>
  );
}
