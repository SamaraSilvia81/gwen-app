import { useEffect, useState } from 'react';
import { Cloud } from '@phosphor-icons/react';
import Logo from './Logo';
import { Label } from './Modal';
import CloudSignIn from './CloudSignIn';
import { currentSession } from '../lib/cloudAuth';
import { supabase } from '../lib/supabase';
import { isAccountMode, setAccountMode } from '../lib/cloudConfig';

const backToLocal = () => {
  setAccountMode(false);
  window.location.reload();
};

/**
 * No modo conta, o app só abre com sessão na nuvem. Sem sessão (expirou ou saiu),
 * mostra a entrada. No modo local não faz nada e deixa o app abrir direto.
 */
export default function AccountGate({ children }) {
  const account = isAccountMode();
  const [state, setState] = useState(account ? 'checking' : 'in'); // checking | in | out | noconn

  useEffect(() => {
    if (!account) return undefined;
    if (!supabase) {
      setState('noconn');
      return undefined;
    }
    let alive = true;
    currentSession().then((s) => alive && setState(s ? 'in' : 'out'));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => alive && setState(s ? 'in' : 'out'));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [account]);

  if (!account || state === 'in') return children;

  if (state === 'checking') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 anim-fade">
        <Logo size={64} charge={0.65} />
        <p className="mono text-[12px] text-muted">
          entrando na conta<span className="blink">_</span>
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center px-8">
      <div className="card w-full max-w-[420px] p-8 anim-rise">
        <Logo size={44} />
        <h1 className="font-display text-2xl font-bold mt-5 mb-2">
          {state === 'noconn' ? 'A conexão com a nuvem sumiu.' : 'Entre na sua conta.'}
        </h1>
        {state === 'noconn' ? (
          <p className="text-muted leading-relaxed mb-5">
            O modo conta está ligado, mas a URL do Supabase não está mais guardada. Volte ao modo local e conecte de novo em Configurações.
          </p>
        ) : (
          <>
            <p className="text-muted leading-relaxed mb-5">
              Seus dados estão na nuvem. Entre para abrir seus projetos.
            </p>
            <CloudSignIn onSession={() => setState('in')} />
          </>
        )}
        <button type="button" className="btn btn-ghost w-full mt-5" onClick={backToLocal}>
          <Cloud size={14} />
          <Label>Usar o modo local neste computador</Label>
        </button>
      </div>
    </div>
  );
}
