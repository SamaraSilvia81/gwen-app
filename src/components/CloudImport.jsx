import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Eye, EyeSlash } from '@phosphor-icons/react';
import Modal, { Label } from './Modal';
import GoogleG from './GoogleG';
import { supabase } from '../lib/supabase';
import { listenOAuthReturn, signInWithPassword, signOutCloud, startGoogleSignIn } from '../lib/cloudAuth';
import { describeAdded, importFromCloud } from '../data/portability';

/**
 * Importação única dos dados que estavam no Supabase (versões até a 0.3).
 * Entra na conta, copia tudo para o computador e sai da conta. Nada é apagado
 * na nuvem nem aqui: só entra o que ainda não existe.
 */
export default function CloudImport({ onClose, onImported }) {
  const [step, setStep] = useState('login'); // login | waiting | importing | done
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const running = useRef(false);

  async function runImport(session) {
    if (running.current) return;
    running.current = true;
    setStep('importing');
    try {
      const added = await importFromCloud(supabase, session.user.id);
      setResult(describeAdded(added));
      await signOutCloud();
      setStep('done');
      onImported?.();
    } catch (err) {
      setError(err?.message || String(err));
      setStep('login');
      running.current = false;
    }
  }

  // retorno do login com Google
  useEffect(() => {
    let stop = () => {};
    listenOAuthReturn(runImport, (msg) => {
      setError(msg);
      setStep('login');
    }).then((fn) => (stop = fn));
    return () => stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGoogle() {
    setError('');
    try {
      setStep('waiting');
      await startGoogleSignIn();
    } catch (err) {
      setError(err.message);
      setStep('login');
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    setError('');
    try {
      const session = await signInWithPassword(email.trim(), password);
      await runImport(session);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal
      eyebrow="importar da nuvem"
      title={step === 'done' ? 'Dados importados' : 'Trazer seus dados para este computador'}
      onClose={step === 'importing' ? undefined : onClose}
      dismissable={step !== 'importing'}
      width={460}
      footer={
        step === 'done' && (
          <button className="btn btn-primary" onClick={onClose}>
            <Label>Continuar</Label>
          </button>
        )
      }
    >
      {step === 'done' ? (
        <div className="flex gap-3">
          <CheckCircle size={22} className="text-phosphor shrink-0" weight="fill" />
          <div>
            <p className="leading-relaxed">Importado: {result}.</p>
            <p className="text-[12px] text-muted mt-2 leading-relaxed">
              A conta foi desconectada. A partir de agora tudo fica neste computador. Os dados na nuvem continuam lá, intactos.
            </p>
          </div>
        </div>
      ) : step === 'importing' ? (
        <p className="mono text-muted">copiando projetos, sessões e pausas<span className="blink">_</span></p>
      ) : (
        <>
          <p className="text-[13px] text-muted leading-relaxed mb-5">
            Entre com a conta que você usava. A G.W.E.N. copia categorias, projetos, sessões, pausas e aparência, e depois sai da
            conta. Nada é apagado.
          </p>
          <button type="button" className="btn btn-google btn-lg w-full mb-2" onClick={handleGoogle} disabled={step === 'waiting'}>
            <GoogleG />
            <span>{step === 'waiting' ? 'Continue no navegador...' : 'Continuar com Google'}</span>
          </button>
          {step === 'waiting' && (
            <p className="text-[12px] text-muted mb-3 leading-relaxed">
              Depois de escolher a conta, o navegador pede para abrir a G.W.E.N.: é só permitir.
            </p>
          )}
          <div className="flex items-center gap-3 my-4">
            <span className="h-px flex-1 bg-rule" />
            <span className="mono text-[11px] text-muted">ou com e-mail</span>
            <span className="h-px flex-1 bg-rule" />
          </div>
          <form onSubmit={handlePassword} className="flex flex-col gap-3">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required />
            <div className="relative">
              <input
                className="input pr-10"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="senha"
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-bone p-1"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
              >
                {show ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button type="submit" className="btn btn-ghost">
              <Label>Entrar e importar</Label>
            </button>
          </form>
          {error && <p className="mt-4 text-[13px] text-ember">{error}</p>}
        </>
      )}
    </Modal>
  );
}
