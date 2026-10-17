import { useEffect, useState } from 'react';
import { CloudCheck, SignOut, SignIn, LinkBreak, PencilSimple } from '@phosphor-icons/react';
import Modal, { Label } from './Modal';
import CloudEntry from './CloudEntry';
import ConnectionForm from './ConnectionForm';
import { currentSession, signOutCloud } from '../lib/cloudAuth';
import { connectSupabase, supabase } from '../lib/supabase';
import { clearConnection, connectionHost, isAccountMode, loadConnection, setAccountMode } from '../lib/cloudConfig';

/**
 * Conta na nuvem (avançado): conectar ao próprio Supabase, entrar e sair.
 * Ligar ou desligar o modo conta recarrega o app, porque toda a camada de dados troca.
 */
export default function CloudAccountSection() {
  const [conn, setConn] = useState(() => loadConnection());
  const [signing, setSigning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const account = isAccountMode();

  useEffect(() => {
    if (!account || !supabase) return;
    currentSession().then((s) => setEmail(s?.user?.email || ''));
  }, [account]);

  function removeConnection() {
    clearConnection();
    connectSupabase(null);
    setConn(null);
  }

  async function leaveAccount() {
    try {
      await signOutCloud();
    } finally {
      setAccountMode(false);
      window.location.reload();
    }
  }

  if (account) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <CloudCheck size={20} className="text-phosphor shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Dados na nuvem{email ? ` · ${email}` : ''}</p>
            <p className="text-[12px] text-muted">Projetos, sessões e pausas ficam no seu Supabase. Nada fica neste computador.</p>
          </div>
          <button className="btn btn-ghost" onClick={leaveAccount}>
            <SignOut size={14} />
            <Label>Sair da conta</Label>
          </button>
        </div>
        <p className="text-[12px] text-muted mt-3 leading-relaxed">
          Ao sair, a G.W.E.N. volta para o modo local deste computador, que começa vazio. Os dados na nuvem continuam intactos e
          voltam quando você entrar de novo.
        </p>
      </div>
    );
  }

  if (!conn || editing) {
    return (
      <div className="card p-4">
        <ConnectionForm
          initial={conn}
          onSaved={(saved) => {
            setConn(saved);
            setEditing(false);
          }}
          onCancel={conn ? () => setEditing(false) : undefined}
        />
      </div>
    );
  }

  return (
    <>
      <div className="card p-4 flex items-center gap-4">
        <CloudCheck size={20} className="text-muted shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">Conectado a {connectionHost(conn)}</p>
          <p className="text-[12px] text-muted">Seus dados continuam neste computador até você entrar na conta.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
          <PencilSimple size={13} />
          <Label>Trocar</Label>
        </button>
        <button className="btn btn-ghost btn-sm" onClick={removeConnection}>
          <LinkBreak size={13} />
          <Label>Remover conexão</Label>
        </button>
        <button className="btn btn-primary" onClick={() => setSigning(true)}>
          <SignIn size={14} />
          <Label>Entrar na conta</Label>
        </button>
      </div>
      {signing && <CloudEntry onClose={() => setSigning(false)} />}
    </>
  );
}
