import { useEffect, useMemo, useState } from 'react';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { WorkspaceProvider, useNow, useWorkspace } from './context/WorkspaceContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { WellnessProvider } from './context/WellnessContext';
import { computeStats } from './lib/stats';
import Onboarding, { OPEN_IMPORT_FLAG } from './pages/Onboarding';
import CloudImport from './components/CloudImport';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import PauseOverlay from './components/PauseOverlay';
import StaleSessionModal from './components/StaleSessionModal';
import ReminderStack from './components/ReminderStack';
import UpdateBar from './components/UpdateBar';
import Logo from './components/Logo';
import AccountGate from './components/AccountGate';
import { isAccountMode, setAccountMode } from './lib/cloudConfig';

export default function App() {
  return (
    <ToastProvider>
      <AccountGate>
        <ProfileProvider>
          <Gate />
        </ProfileProvider>
      </AccountGate>
    </ToastProvider>
  );
}

function Gate() {
  const { loading, error, needsOnboarding } = useProfile();
  if (loading) return <Splash />;
  if (error) return <DataError message={error} />;
  if (needsOnboarding) return <Onboarding />;
  return (
    <WorkspaceProvider>
      <WellnessProvider>
        <Shell />
      </WellnessProvider>
    </WorkspaceProvider>
  );
}

function Shell() {
  const [view, setView] = useState('projetos');
  const [filter, setFilter] = useState('all');
  const { sessions, projects, activeBreak, refresh } = useWorkspace();
  const { reload } = useProfile();
  const toast = useToast();
  // pedido de importação vindo da primeira abertura
  const [importing, setImporting] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem(OPEN_IMPORT_FLAG)) {
      sessionStorage.removeItem(OPEN_IMPORT_FLAG);
      setImporting(true);
    }
  }, []);
  // números andam a cada 30s; o relógio da sessão na topbar anda por segundo
  const now = useNow(30_000);
  const stats = useMemo(
    () => computeStats({ sessions, projects, now, activeBreak }),
    [sessions, projects, now, activeBreak],
  );

  return (
    <div className="h-full flex">
      <Sidebar view={view} onNavigate={setView} filter={filter} onFilter={setFilter} stats={stats} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Topbar title={view === 'config' ? 'Configurações' : null} />
        <UpdateBar />
        <div className="flex-1 min-h-0">
          {view === 'config' ? <Settings /> : <Dashboard filter={filter} stats={stats} />}
        </div>
      </main>
      <ReminderStack />
      <PauseOverlay />
      <StaleSessionModal />
      {importing && (
        <CloudImport
          onClose={() => setImporting(false)}
          onImported={async () => {
            await Promise.all([refresh(), reload()]);
            toast('Dados da nuvem importados.');
          }}
        />
      )}
    </div>
  );
}

function Splash() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 anim-fade">
      <Logo size={64} charge={0.65} />
      <p className="mono text-[12px] text-muted">
        iniciando a G.W.E.N.<span className="blink">_</span>
      </p>
    </div>
  );
}

function DataError({ message }) {
  const cloud = isAccountMode();
  return (
    <div className="h-full flex items-center justify-center px-8">
      <div className="card max-w-[520px] p-8">
        <Logo size={44} />
        <h1 className="font-display text-2xl font-bold mt-5 mb-2">
          {cloud ? 'Não consegui falar com a nuvem.' : 'Não consegui abrir seus dados.'}
        </h1>
        <p className="text-muted leading-relaxed mb-5">
          {cloud
            ? 'Confira a internet e tente abrir de novo. Seus dados na nuvem não foram alterados. Se faltar uma migração no Supabase, a mensagem abaixo costuma dizer qual coluna ou tabela.'
            : 'O banco local não abriu. Nada foi apagado. Feche e abra a G.W.E.N. de novo; se continuar, a mensagem abaixo ajuda a entender o que houve.'}
        </p>
        <pre className="mono text-[12px] bg-surface-alt border border-rule rounded-ui-sm p-4 overflow-x-auto whitespace-pre-wrap">{message}</pre>
        {cloud && (
          <button
            className="btn btn-ghost w-full mt-5"
            onClick={() => {
              setAccountMode(false);
              window.location.reload();
            }}
          >
            Usar o modo local por enquanto
          </button>
        )}
      </div>
    </div>
  );
}
