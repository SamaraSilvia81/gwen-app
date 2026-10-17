import { useEffect, useRef, useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import GoogleG from './GoogleG';
import { Label } from './Modal';
import { listenOAuthReturn, signInWithPassword, startGoogleSignIn } from '../lib/cloudAuth';

/**
 * Entrada na conta da nuvem: Google (volta pelo deep link, ADR-006) ou e-mail e senha.
 * Chama `onSession(session)` uma vez quando a entrada der certo.
 */
export default function CloudSignIn({ onSession }) {
  const [waiting, setWaiting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const done = useRef(false);

  const finish = (session) => {
    if (done.current) return;
    done.current = true;
    onSession(session);
  };

  useEffect(() => {
    let alive = true;
    let stop = () => {};
    listenOAuthReturn(finish, (msg) => {
      setError(msg);
      setWaiting(false);
    }).then((fn) => (alive ? (stop = fn) : fn()));
    return () => {
      alive = false;
      stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGoogle() {
    setError('');
    try {
      setWaiting(true);
      await startGoogleSignIn();
    } catch (err) {
      setError(err.message);
      setWaiting(false);
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    setError('');
    try {
      finish(await signInWithPassword(email.trim(), password));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-google btn-lg w-full mb-2" onClick={handleGoogle} disabled={waiting}>
        <GoogleG />
        <span>{waiting ? 'Continue no navegador...' : 'Continuar com Google'}</span>
      </button>
      {waiting && (
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
          <Label>Entrar</Label>
        </button>
      </form>
      {error && <p className="mt-4 text-[13px] text-ember">{error}</p>}
    </div>
  );
}
