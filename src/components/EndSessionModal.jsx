import { useState } from 'react';
import { Stop } from '@phosphor-icons/react';
import Modal, { Label } from './Modal';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';

/**
 * "Onde parei?": aparece ao encerrar uma sessão pela interface.
 * A nota volta no card e no próximo Começar agora do projeto.
 * Pular encerra sem mexer na nota anterior; apagar o texto e salvar limpa a nota.
 */
export default function EndSessionModal() {
  const { endingSession, cancelEnd, endSession, activeSession, projects, notes } = useWorkspace();
  const toast = useToast();
  const project = activeSession && projects.find((p) => p.id === activeSession.project_id);
  const [text, setText] = useState(() => (activeSession && notes.get(activeSession.project_id)?.note) || '');
  const [busy, setBusy] = useState(false);

  if (!endingSession || !activeSession) return null;

  async function finish(note) {
    setBusy(true);
    try {
      await endSession(new Date(), note);
      toast(note ? 'Sessão encerrada. A nota fica no card.' : 'Sessão encerrada.');
      cancelEnd();
    } catch (err) {
      toast(err?.message || String(err), 'error');
      setBusy(false);
    }
  }

  return (
    <Modal
      eyebrow="encerrar sessão"
      title={`Onde você parou${project ? ` em ${project.name}` : ''}?`}
      onClose={cancelEnd}
      width={520}
      footer={
        <>
          <button className="btn btn-ghost mr-auto" onClick={cancelEnd} disabled={busy}>
            <Label>Continuar trabalhando</Label>
          </button>
          <button className="btn btn-ghost" onClick={() => finish(undefined)} disabled={busy}>
            <Label>Pular</Label>
          </button>
          <button className="btn btn-primary" onClick={() => finish(text)} disabled={busy}>
            <Stop size={12} weight="fill" />
            <Label>Encerrar</Label>
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">Próximo passo</span>
        <textarea
          className="input"
          rows={3}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && finish(text)}
          placeholder="Ex.: terminar o filtro da tabela; revisar o PR do header"
        />
      </label>
      <p className="text-[12px] text-muted mt-2">Aparece no card e quando você começar de novo. Ctrl + Enter encerra.</p>
    </Modal>
  );
}
