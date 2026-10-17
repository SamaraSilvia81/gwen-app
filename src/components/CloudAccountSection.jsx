import { useEffect, useState } from 'react';
import { CloudCheck, SignOut, SignIn, LinkBreak } from '@phosphor-icons/react';
import Modal, { Label } from './Modal';
import CloudSignIn from './CloudSignIn';
import { currentSession, signOutCloud } from '../lib/cloudAuth';
import { connectSupabase, supabase } from '../lib/supabase';
import {
  clearConnection,
  connectionHost,
  isAccountMode,
  loadConnection,
  saveConnection,
  setAccountMode,
} from '../lib/cloudConfig';

/**
 * Conta na nuvem (avançado): conectar ao próprio Supabase, entrar e sair.
 * Ligar ou desligar o modo conta recarrega o app, porque toda a camada de dados troca.
 */
export default function CloudAccountSection() {
  const [conn, setConn] = useState(() => loadConnection());
  const [form, setForm] = useState({ url: '', anonKey: '', schema: 'gwen' });
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [email, setEmail] = useState('');
  const account = isAccountMode();

  useEffect(() => {
    if (!account || !supabase) return;
    currentSession().then((s) => setEmail(s?.user?.email || ''));
  }, [account]);

  function connect(e) {
    e.preventDefault();
    setError('');
    try {
      const saved = saveConnection(form);
      connectSupabase(saved);
      setConn(saved);
    } catch (err) {
      setError(err.message);
    }
  }

  function removeConnection() {
    clearConnection();
    connectSupabase(loadConnection());
    setConn(loadConnection());
  }

  function enterAccount() {
    setAccountMode(true);
    window.location.reload();
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

  if (!conn) {
    return (
      <form onSubmit={connect} className="card p-4 flex flex-col gap-3">
        <p className="text-[13px] text-muted leading-relaxed">
          Use o seu próprio projeto Supabase. Antes, rode as migrações da pasta{' '}
          <span className="mono text-bone">supabase/migrations</span> no SQL Editor e adicione o schema em Project Settings, Data
          API. A URL e a chave anon ficam só neste computador.
        </p>
        <label className="field">
          <span className="field-label">URL do projeto</span>
          <input className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://abcd1234.supabase.co" required />
        </label>
        <label className="field">
          <span className="field-label">Chave anon</span>
          <input className="input mono" value={form.anonKey} onChange={(e) => setForm({ ...form, anonKey: e.target.value })} placeholder="eyJ..." required />
        </label>
        <label className="field">
          <span className="field-label">Schema</span>
          <input className="input" value={form.schema} onChange={(e) => setForm({ ...form, schema: e.target.value })} />
        </label>
        {error && <p className="text-[13px] text-ember">{error}</p>}
        <div>
          <button type="submit" className="btn btn-ghost">
            <Label>Salvar conexão</Label>
          </button>
        </div>
      </form>
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
        {!conn.fromEnv && (
          <button className="btn btn-ghost btn-sm" onClick={removeConnection}>
            <LinkBreak size={13} />
            <Label>Remover conexão</Label>
          </button>
        )}
        <button className="btn btn-primary" onClick={() => setSigning(true)}>
          <SignIn size={14} />
          <Label>Entrar na conta</Label>
        </button>
      </div>
      {signing && (
        <Modal eyebrow="conta na nuvem" title="Entrar na sua conta" onClose={() => setSigning(false)} width={440}>
          <p className="text-[13px] text-muted leading-relaxed mb-5">
            Depois de entrar, a G.W.E.N. passa a usar os dados da nuvem e recarrega. Os dados deste computador não são apagados.
          </p>
          <CloudSignIn onSession={enterAccount} />
        </Modal>
      )}
    </>
  );
}
