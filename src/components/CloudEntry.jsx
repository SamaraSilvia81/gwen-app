import { useEffect, useState } from 'react';
import Modal from './Modal';
import CloudSignIn from './CloudSignIn';
import ConnectionForm from './ConnectionForm';
import { identityOf } from '../lib/cloudAuth';
import { loadConnection, setAccountMode, PENDING_KEY, WELCOME_KEY } from '../lib/cloudConfig';

/** Liga o modo conta e recarrega: toda a camada de dados troca */
export function enterAccount(session) {
  sessionStorage.removeItem(PENDING_KEY);
  sessionStorage.setItem(WELCOME_KEY, JSON.stringify(identityOf(session)));
  setAccountMode(true);
  window.location.reload();
}

/**
 * Janela de entrada com conta. Se ainda não há conexão com o Supabase, pede a URL e a
 * chave primeiro; depois mostra Google e e-mail. Usada na primeira abertura e em Configurações.
 */
export default function CloudEntry({ onClose }) {
  const [conn, setConn] = useState(() => loadConnection());
  const [editing, setEditing] = useState(false);
  const showForm = !conn || editing;

  // No navegador o Google recarrega a página; este marcador avisa o app ao voltar.
  useEffect(() => {
    if (conn && !editing) sessionStorage.setItem(PENDING_KEY, '1');
    return () => sessionStorage.removeItem(PENDING_KEY);
  }, [conn, editing]);

  return (
    <Modal eyebrow="conta na nuvem" title={showForm ? 'Conectar ao Supabase' : 'Entrar na sua conta'} onClose={onClose} width={440}>
      {showForm ? (
        <ConnectionForm
          initial={conn}
          onSaved={(saved) => {
            setConn(saved);
            setEditing(false);
          }}
          onCancel={conn ? () => setEditing(false) : undefined}
        />
      ) : (
        <>
          <p className="text-[13px] text-muted leading-relaxed mb-5">
            Depois de entrar, a G.W.E.N. passa a usar os dados da nuvem e recarrega. Os dados deste computador não são apagados.
          </p>
          <CloudSignIn onSession={enterAccount} />
          <button type="button" className="btn btn-quiet btn-sm mt-5" onClick={() => setEditing(true)}>
            Trocar a conexão com o Supabase
          </button>
        </>
      )}
    </Modal>
  );
}
