import { useEffect, useState } from 'react';
import { ArrowCircleUp, X } from '@phosphor-icons/react';
import { findUpdate, installUpdate, isSnoozed, snooze } from '../lib/updater';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import Modal, { Label } from './Modal';

const FIRST_CHECK_MS = 8_000;
const EVERY_MS = 6 * 3600 * 1000;

/**
 * Faixa discreta avisando que há versão nova. Nada instala sem você clicar.
 * Durante uma sessão ativa, avisa que reiniciar encerra o timer na hora do clique.
 */
export default function UpdateBar() {
  const { activeSession, endSession } = useWorkspace();
  const toast = useToast();
  const [update, setUpdate] = useState(null);
  const [notes, setNotes] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const u = await findUpdate();
      if (alive && u && !isSnoozed(u.version)) setUpdate(u);
    };
    const first = setTimeout(run, FIRST_CHECK_MS);
    const id = setInterval(run, EVERY_MS);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (!update) return null;

  async function handleInstall() {
    try {
      // a sessão é encerrada antes, para o tempo não ficar "esquecido" durante o reinício
      if (activeSession) await endSession();
      setProgress(0);
      await installUpdate(update, setProgress);
    } catch (err) {
      setProgress(null);
      toast(`Não consegui atualizar: ${err?.message || err}`, 'error');
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 px-6 h-10 border-b border-rule bg-[var(--c-phosphor-8)] text-[13px] anim-fade">
        <ArrowCircleUp size={16} className="text-phosphor" weight="bold" />
        <span className="flex-1">
          <b className="font-semibold">G.W.E.N. {update.version}</b> disponível.{' '}
          <span className="text-muted">Seus projetos, tempos e configurações continuam onde estão.</span>
        </span>
        {progress !== null ? (
          <span className="mono text-[12px] text-muted tabular">baixando {Math.round(progress * 100)}%</span>
        ) : (
          <>
            {update.body && (
              <button className="btn btn-quiet btn-sm" onClick={() => setNotes(true)}>
                Novidades
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleInstall}>
              <Label>Atualizar e reiniciar</Label>
            </button>
            <button
              className="btn btn-quiet btn-icon btn-sm"
              onClick={() => {
                snooze(update.version);
                setUpdate(null);
              }}
              title="Depois"
              aria-label="Lembrar depois"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
      {activeSession && progress === null && (
        <p className="sr-only">Atualizar encerra a sessão ativa no momento do clique.</p>
      )}
      {notes && (
        <Modal eyebrow="novidades" title={`G.W.E.N. ${update.version}`} onClose={() => setNotes(false)}>
          <pre className="whitespace-pre-wrap font-body text-[13px] leading-relaxed">{update.body}</pre>
        </Modal>
      )}
    </>
  );
}
