import { useState } from 'react';
import { Stop } from '@phosphor-icons/react';
import Modal, { Label } from './Modal';
import { useWorkspace, useNow } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { formatClock, sessionSeconds } from '../lib/time';

/**
 * "Onde parei?": aparece ao encerrar uma sessão pela interface.
 * A nota volta no card e no próximo Começar agora do projeto.
 * Pular encerra sem mexer na nota anterior; apagar o texto e salvar limpa a nota.
 * Com várias sessões abertas (0.8), começa perguntando qual encerrar.
 */
export default function EndSessionModal() {
  const { endingSession, cancelEnd, endSession, activeSessions, activeBreak, projects, notes } = useWorkspace();
  const toast = useToast();
  const now = useNow(1000);
  const [pick, setPick] = useState(() => (endingSession && endingSession !== 'escolher' ? endingSession : activeSessions[0]?.id));
  const session = activeSessions.find((s) => s.id === pick) || null;
  const project = session && projects.find((p) => p.id === session.project_id);
  const [texts, setTexts] = useState({});
  const text = session ? texts[session.id] ?? (notes.get(session.project_id)?.note || '') : '';
  const setText = (v) => session && setTexts((t) => ({ ...t, [session.id]: v }));
  const [busy, setBusy] = useState(false);

  if (!endingSession || !activeSessions.length) return null;
  const choosing = endingSession === 'escolher' && activeSessions.length > 1;
  const nameOf = (s) => {
    const p = projects.find((x) => x.id === s.project_id);
    return `${p?.name || 'Projeto'}${s.front ? ` · ${s.front}` : ''}`;
  };

  async function finish(note) {
    if (!session) return;
    setBusy(true);
    try {
      await endSession(new Date(), note, session.id);
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
      title={choosing ? 'Qual sessão encerrar?' : `Onde você parou${project ? ` em ${project.name}` : ''}?`}
      onClose={cancelEnd}
      width={520}
      footer={
        <>
          <button className="btn btn-ghost mr-auto" onClick={cancelEnd} disabled={busy}>
            <Label>Continuar trabalhando</Label>
          </button>
          <button className="btn btn-ghost" onClick={() => finish(undefined)} disabled={busy || !session}>
            <Label>Pular</Label>
          </button>
          <button className="btn btn-primary" onClick={() => finish(text)} disabled={busy || !session}>
            <Stop size={12} weight="fill" />
            <Label>Encerrar</Label>
          </button>
        </>
      }
    >
      {choosing && (
        <div className="flex flex-col gap-1.5 mb-5" role="radiogroup" aria-label="Sessões abertas">
          {activeSessions.map((s) => (
            <label key={s.id} className={`card flex items-center gap-3 px-3.5 py-2.5 cursor-pointer ${pick === s.id ? 'is-active' : ''}`}>
              <input type="radio" className="accent-[var(--c-phosphor)]" checked={pick === s.id} onChange={() => setPick(s.id)} />
              <span className="flex-1 truncate text-[13px] font-medium">{nameOf(s)}</span>
              <span className="mono text-[12px] text-phosphor tabular">{formatClock(sessionSeconds(s, now, activeBreak))}</span>
            </label>
          ))}
        </div>
      )}
      <label className="field">
        <span className="field-label">Próximo passo{choosing && session ? ` em ${nameOf(session)}` : ''}</span>
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
      <p className="text-[12px] text-muted mt-2">
        Aparece no card e quando você começar de novo. Ctrl + Enter encerra.
        {activeSessions.length > 1 && ' As outras sessões continuam rodando.'}
      </p>
    </Modal>
  );
}
