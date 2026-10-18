import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { WorkspaceProvider, useNow, useWorkspace } from './context/WorkspaceContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { WellnessProvider } from './context/WellnessContext';
import { computeStats } from './lib/stats';
import { useTray } from './lib/useTray';
import Onboarding, { OPEN_IMPORT_FLAG } from './pages/Onboarding';
import CloudImport from './components/CloudImport';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Report from './pages/Report';
import Sidebar from './components/Sidebar';
import Rail from './components/Rail';
import SettingsNav from './components/SettingsNav';
import Home from './pages/Home';
import Profile from './pages/Profile';
import { useBubble } from './lib/bubble';
import { NARROW_QUERY, useMediaQuery, useStoredState } from './lib/layout';
import { useZoomHotkeys } from './lib/zoom';
import Topbar from './components/Topbar';
import PauseOverlay from './components/PauseOverlay';
import StaleSessionModal from './components/StaleSessionModal';
import EndSessionModal from './components/EndSessionModal';
import QuickLaunch from './components/QuickLaunch';
import ReminderStack from './components/ReminderStack';
import UpdateBar from './components/UpdateBar';
import Logo from './components/Logo';
import AccountGate from './components/AccountGate';
import { isAccountMode, setAccountMode, WELCOME_KEY } from './lib/cloudConfig';
import { fileToAvatar } from './lib/avatar';
import { MISSING_MIGRATION_EVENT } from './data/cloudStore';

export default function App() {
  return (
    <ToastProvider>
      <ZoomKeys />
      <AccountGate>
        <ProfileProvider>
          <Gate />
        </ProfileProvider>
      </AccountGate>
    </ToastProvider>
  );
}

/** Ctrl + / Ctrl - / Ctrl 0 valem em qualquer tela, até na abertura */
function ZoomKeys() {
  const toast = useToast();
  useZoomHotkeys(toast);
  return null;
}

function Gate() {
  const { loading, error, needsOnboarding } = useProfile();
  // a abertura roda inteira uma vez por inicialização, mesmo que os dados carreguem antes
  const [intro, setIntro] = useState(true);
  if (loading || intro) return <Splash ready={!loading} onDone={() => setIntro(false)} />;
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
  const [view, setView] = useState('inicio');
  const [filter, setFilter] = useState('all');
  const [focusId, setFocusId] = useState(null);
  // Configurações: seção marcada, pedido de rolagem e a tela para onde o Voltar leva
  const [cfgSection, setCfgSection] = useState('perfil');
  const [cfgJump, setCfgJump] = useState(0);
  const [backTo, setBackTo] = useState('inicio');
  const narrow = useMediaQuery(NARROW_QUERY);
  // painel fixo: preferência guardada; em janela estreita vira gaveta e começa fechado
  const [docked, setDocked] = useStoredState('gwen.painel', true);
  const [drawer, setDrawer] = useState(false);
  const panelOpen = narrow ? drawer : docked;
  const togglePanel = useCallback(() => (narrow ? setDrawer((v) => !v) : setDocked((v) => !v)), [narrow, setDocked]);
  const { sessions, projects, activeBreak, activeSession, launchProject, requestEnd, refresh } = useWorkspace();
  const { profile, updateProfile, reload } = useProfile();
  const toast = useToast();

  useEffect(() => {
    if (!narrow) setDrawer(false);
  }, [narrow]);

  // nuvem sem uma migração nova: o dado foi salvo sem a coluna; avisa uma vez por coluna
  useEffect(() => {
    const warned = new Set();
    const on = ({ detail }) => {
      if (warned.has(detail.column)) return;
      warned.add(detail.column);
      toast(`Sua nuvem está sem uma migração: rode supabase/migrations/${detail.file} no SQL Editor. Até lá, isso fica sem ser salvo.`, 'error');
    };
    window.addEventListener(MISSING_MIGRATION_EVENT, on);
    return () => window.removeEventListener(MISSING_MIGRATION_EVENT, on);
  }, [toast]);

  // Ctrl + B abre e fecha o painel, como no VS Code
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        togglePanel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePanel]);

  const navigate = useCallback((next) => {
    setView((prev) => {
      if (next === 'config' && prev !== 'config') {
        setBackTo(prev);
        setCfgSection('perfil');
      }
      return next;
    });
    if (next !== 'projetos') setFocusId(null);
  }, []);
  const goSection = useCallback((id) => {
    setCfgSection(id);
    setCfgJump((n) => n + 1);
  }, []);
  // a rolagem da página marca a seção; nas abas (janela estreita) também pula até ela
  const spySection = useCallback((id, jump = false) => {
    setCfgSection(id);
    if (jump) setCfgJump((n) => n + 1);
  }, []);
  const openProject = useCallback((p) => {
    setFilter(p.category_id || 'none');
    setFocusId(p.id);
    setView('projetos');
  }, []);
  const changeFilter = useCallback((f) => {
    setFilter(f);
    setFocusId(null);
  }, []);

  // acabou de entrar na conta: confirma e, se faltar, traz nome e foto da conta Google
  useEffect(() => {
    const raw = sessionStorage.getItem(WELCOME_KEY);
    if (!raw) return;
    sessionStorage.removeItem(WELCOME_KEY);
    let who;
    try {
      who = JSON.parse(raw);
    } catch {
      return;
    }
    (async () => {
      const patch = {};
      if (!profile?.avatar && who.picture) {
        try {
          patch.avatar = await fileToAvatar(await (await fetch(who.picture)).blob());
        } catch {
          /* sem foto: segue sem */
        }
      }
      if ((!profile?.display_name || profile.display_name === 'você') && who.name) patch.display_name = who.name;
      if (Object.keys(patch).length) await updateProfile(patch).catch(() => {});
      toast(`Você entrou como ${who.email}. Seus dados agora estão na nuvem.`);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
  useTray({ projects, activeSession, activeBreak, now, launchProject, requestEnd, toast });
  useBubble({ projects, activeSession, activeBreak });

  let page;
  if (view === 'config') page = <Settings section={cfgSection} jump={cfgJump} onSpy={spySection} narrow={narrow} />;
  else if (view === 'relatorio') page = <Report />;
  else if (view === 'perfil') page = <Profile onNavigate={navigate} />;
  else if (view === 'inicio') page = <Home stats={stats} onNavigate={navigate} onOpenProject={openProject} />;
  else page = <Dashboard filter={filter} stats={stats} focusId={focusId} />;

  return (
    <div className="h-full flex">
      <Rail view={view} onNavigate={navigate} panelOpen={panelOpen} onTogglePanel={togglePanel} />
      {/* em Ajustes, a navegação das seções toma o lugar do painel de projetos (como no CuraData) */}
      {view === 'config' && !narrow ? (
        <SettingsNav section={cfgSection} onSection={goSection} onBack={() => navigate(backTo)} />
      ) : panelOpen && (
        <>
          {narrow && <div className="panel-scrim anim-fade" onMouseDown={() => setDrawer(false)} />}
          <Sidebar
            view={view}
            filter={filter}
            onFilter={changeFilter}
            onNavigate={navigate}
            onOpenProject={openProject}
            focusId={focusId}
            stats={stats}
            overlay={narrow}
            onClose={() => setDrawer(false)}
          />
        </>
      )}
      <main className="flex-1 min-w-0 flex flex-col">
        <Topbar view={view} filter={filter} />
        <UpdateBar />
        <div className="flex-1 min-h-0">{page}</div>
      </main>
      <ReminderStack />
      <PauseOverlay />
      <StaleSessionModal />
      <EndSessionModalHost />
      <QuickLaunch />
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

/**
 * Abertura: o G aparece, a barra do logo carrega em etapas (a mesma barra da
 * tela de pausa), o nome se forma e a tela some quando os dados estão prontos.
 * Dura ~1,6 s; com "reduzir movimento" do sistema, quase nada.
 */
const SPLASH_STEPS = [
  { at: 0, charge: 0, text: 'iniciando' },
  { at: 280, charge: 0.3, text: 'abrindo seus dados' },
  { at: 700, charge: 0.7, text: 'lendo projetos' },
  { at: 1150, charge: 1, text: 'pronto' },
];
const SPLASH_MIN_MS = 1600;

function Splash({ ready = false, onDone }) {
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const [step, setStep] = useState(reduced ? SPLASH_STEPS.length - 1 : 0);
  const [minDone, setMinDone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timers = reduced ? [] : SPLASH_STEPS.slice(1).map((s, i) => setTimeout(() => setStep(i + 1), s.at));
    timers.push(setTimeout(() => setMinDone(true), reduced ? 300 : SPLASH_MIN_MS));
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  // dados prontos e animação completa: some e entrega a tela
  useEffect(() => {
    if (!ready || !minDone) return;
    setLeaving(true);
    const id = setTimeout(() => onDone?.(), reduced ? 0 : 320);
    return () => clearTimeout(id);
  }, [ready, minDone, onDone, reduced]);

  // dados demorando (nuvem lenta): a barra fica em 70% esperando
  const current = SPLASH_STEPS[!ready && step === SPLASH_STEPS.length - 1 ? step - 1 : step];

  return (
    <div className={`splash h-full flex flex-col items-center justify-center gap-6 ${leaving ? 'is-leaving' : ''}`}>
      <div className="splash-logo">
        <Logo size={76} charge={current.charge} />
      </div>
      <p className="splash-word font-display font-bold text-bone text-[20px]">G.W.E.N.</p>
      <p className="mono text-[12px] text-muted h-4">
        {current.text}
        <span className="blink">_</span>
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

/** Remonta o modal a cada pedido, para o texto começar com a nota atual do projeto */
function EndSessionModalHost() {
  const { endingSession, activeSession } = useWorkspace();
  if (!endingSession || !activeSession) return null;
  return <EndSessionModal key={activeSession.id} />;
}
