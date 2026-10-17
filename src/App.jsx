import { useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider, useNow, useWorkspace } from './context/WorkspaceContext';
import { ToastProvider } from './context/ToastContext';
import { WellnessProvider } from './context/WellnessContext';
import { isSupabaseConfigured } from './lib/supabase';
import { computeStats } from './lib/stats';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import PauseOverlay from './components/PauseOverlay';
import StaleSessionModal from './components/StaleSessionModal';
import ReminderStack from './components/ReminderStack';
import Logo from './components/Logo';

export default function App() {
  if (!isSupabaseConfigured) return <SetupScreen />;
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Login />;
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
  const { sessions, projects, activeBreak } = useWorkspace();
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
        <div className="flex-1 min-h-0">
          {view === 'config' ? <Settings /> : <Dashboard filter={filter} stats={stats} />}
        </div>
      </main>
      <ReminderStack />
      <PauseOverlay />
      <StaleSessionModal />
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

function SetupScreen() {
  return (
    <div className="h-full flex items-center justify-center px-8">
      <div className="card max-w-[520px] p-8">
        <Logo size={44} />
        <h1 className="font-display text-2xl font-bold mt-5 mb-2">Falta conectar o Supabase.</h1>
        <p className="text-muted leading-relaxed mb-5">
          Crie um arquivo <span className="mono text-bone">.env</span> na raiz do projeto, copiando o{' '}
          <span className="mono text-bone">.env.example</span>, preencha a URL e a anon key do seu projeto e reinicie o app.
        </p>
        <pre className="mono text-[12px] bg-surface-alt border border-rule rounded-ui-sm p-4 overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
        </pre>
      </div>
    </div>
  );
}
