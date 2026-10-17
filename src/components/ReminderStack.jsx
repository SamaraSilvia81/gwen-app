import { useState } from 'react';
import { Clock, X } from '@phosphor-icons/react';
import { useWellness } from '../context/WellnessContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { REMINDERS, SNOOZE_MIN } from '../lib/wellness';
import { formatDuration } from '../lib/time';

/**
 * Lembretes do modo saúde que estão vencidos.
 * Ficam na tela até você responder: fazer, adiar 10 min ou dispensar.
 * Os botões estão sempre visíveis (nada escondido no hover).
 */
export default function ReminderStack() {
  const { due, config, done, snooze, dismiss } = useWellness();
  const { activeBreak } = useWorkspace();
  const toast = useToast();
  const [busy, setBusy] = useState(null);

  // durante uma pausa os lembretes esperam
  if (!due.length || activeBreak) return null;

  async function handleDone(kind) {
    setBusy(kind);
    try {
      await done(kind);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed bottom-5 left-[268px] z-[140] flex flex-col gap-2 w-[340px]" role="region" aria-label="Lembretes de saúde">
      {due.map((kind) => {
        const r = REMINDERS[kind];
        const Icon = r.icon;
        const every = config.reminders[kind]?.every ?? r.every;
        return (
          <div key={kind} className="card glass anim-rise p-4 shadow-2xl" role="alert">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-[var(--c-phosphor-12)] text-phosphor">
                <Icon size={18} weight="bold" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold">{r.title}</p>
                <p className="text-[13px] text-muted leading-snug mt-0.5">{r.body}</p>
                <p className="mono text-[10px] text-muted mt-1.5">a cada {formatDuration(every * 60)} de trabalho</p>
              </div>
              <button className="btn btn-quiet btn-icon btn-sm -mt-1 -mr-1" onClick={() => dismiss(kind)} title="Dispensar" aria-label="Dispensar">
                <X size={14} />
              </button>
            </div>
            <div className="flex gap-2 mt-3.5">
              <button className="btn btn-primary btn-sm flex-1" onClick={() => handleDone(kind)} disabled={busy === kind}>
                <span className="btn-label">{r.done}</span>
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => snooze(kind)}>
                <Clock size={13} />
                <span className="btn-label">+{SNOOZE_MIN} min</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
