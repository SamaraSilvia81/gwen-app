import { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { formatDay, formatDuration, formatHour, secondsBetween } from '../lib/time';
import Modal, { Label } from './Modal';

/**
 * Aparece quando o app abre e encontra uma sessão que ficou rodando
 * com a G.W.E.N. fechada. Evita registrar horas fantasmas.
 */
export default function StaleSessionModal() {
  const { staleSession, projects, resolveStale } = useWorkspace();
  const toast = useToast();
  const [choice, setChoice] = useState('last_seen');
  const [minutes, setMinutes] = useState('');
  const [busy, setBusy] = useState(false);

  if (!staleSession) return null;

  const project = projects.find((p) => p.id === staleSession.project_id);
  const lastSeenWorked =
    secondsBetween(staleSession.started_at, staleSession.last_seen_at) - (staleSession.paused_seconds || 0);

  async function confirm() {
    if (choice === 'manual' && !(Number(minutes) > 0)) {
      toast('Informe quantos minutos você trabalhou.', 'error');
      return;
    }
    setBusy(true);
    try {
      await resolveStale(choice, Number(minutes));
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  }

  const Option = ({ id, title, detail, children }) => (
    <label
      className={`card flex gap-3 p-3.5 cursor-pointer ${choice === id ? 'is-active' : ''}`}
      onClick={() => setChoice(id)}
    >
      <input type="radio" className="mt-1 accent-[var(--c-phosphor)]" checked={choice === id} onChange={() => setChoice(id)} />
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        {detail && <span className="block text-[12px] text-muted mt-0.5">{detail}</span>}
        {children}
      </span>
    </label>
  );

  return (
    <Modal
      eyebrow="sessão esquecida"
      title={`A sessão de ${project?.name || 'um projeto'} ficou aberta`}
      dismissable={false}
      footer={
        <button className="btn btn-primary" onClick={confirm} disabled={busy}>
          <Label>Confirmar</Label>
        </button>
      }
    >
      <p className="text-muted leading-relaxed mb-5">
        Ela começou {formatDay(staleSession.started_at)} às {formatHour(staleSession.started_at)}, e a última vez que a
        G.W.E.N. estava aberta foi às {formatHour(staleSession.last_seen_at)}. Quanto tempo foi de verdade?
      </p>
      <div className="flex flex-col gap-2">
        <Option
          id="last_seen"
          title={`Encerrar às ${formatHour(staleSession.last_seen_at)}`}
          detail={`Registra ${formatDuration(lastSeenWorked)} de trabalho.`}
        />
        <Option id="manual" title="Eu sei quanto foi" detail="Informe o total trabalhado, sem contar pausas.">
          {choice === 'manual' && (
            <span className="flex items-center gap-2 mt-2.5">
              <input
                className="input w-28"
                type="number"
                min="1"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="90"
                autoFocus
              />
              <span className="text-[13px] text-muted">minutos</span>
            </span>
          )}
        </Option>
        <Option id="continue" title="Ainda estou nesse projeto" detail="Continua a sessão. O tempo com a G.W.E.N. fechada não conta." />
      </div>
    </Modal>
  );
}
