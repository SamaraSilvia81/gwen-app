import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CloudArrowDown, Desktop, HardDrives, Moon, Sun } from '@phosphor-icons/react';
import { useProfile } from '../context/ProfileContext';
import { isSupabaseConfigured } from '../lib/cloudAuth';
import { Wordmark } from '../components/Logo';
import { Label } from '../components/Modal';
import { AvatarPicker } from '../components/Avatar';
import EnvironmentPicker from '../components/EnvironmentPicker';
import wallpaper from '../assets/wallpaper.webp';
import { openLink } from '../lib/native';
import { ENVIRONMENTS, environmentTraits } from '../lib/environments';
import { appIcon, newAppId, suggestionsFor } from '../lib/launcher';
import { applyAppearance, MODES, STYLES } from '../lib/themes';
import { REMINDERS, ensureNotificationPermission } from '../lib/wellness';

const SITE = 'https://gwenapp.vercel.app';

export const OPEN_IMPORT_FLAG = 'gwen.openCloudImport';

/** As etapas ficam à vista desde a primeira tela, para ninguém ser pego de surpresa */
const STEPS = [
  { id: 'voce', label: 'Você' },
  { id: 'ambientes', label: 'Ambientes' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'apps', label: 'Apps' },
  { id: 'saude', label: 'Saúde' },
  { id: 'pronto', label: 'Pronto' },
];
const LAST = STEPS.length;

const MODE_ICON = { escuro: Moon, claro: Sun, sistema: Desktop };

/** Linha do topo: onde a pessoa está e o que vem depois. Etapas anteriores voltam ao clicar. */
function Stepper({ step, onGo }) {
  return (
    <ol className="flex items-center gap-1.5 mb-9 flex-wrap" aria-label="Etapas da primeira configuração">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={s.id} className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={n > step}
              onClick={() => onGo(n)}
              aria-current={current ? 'step' : undefined}
              className={`mono text-[12px] px-2.5 py-1 rounded-full border transition-colors ${
                current ? 'border-phosphor text-bone' : done ? 'border-rule text-bone/80 hover:text-bone' : 'border-rule text-muted opacity-60'
              }`}
            >
              {done ? <Check size={11} weight="bold" className="inline mr-1 -mt-px" /> : `${n} `}
              {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="w-3 h-px" style={{ background: 'var(--c-rule)' }} />}
          </li>
        );
      })}
    </ol>
  );
}

/** Cartão de escolha única ou de marcar, no mesmo jeito dos ambientes */
function Choice({ on, onClick, icon: Icon, title, children, disabled }) {
  return (
    <button
      type="button"
      className="card p-4 text-left flex items-start gap-3"
      style={on ? { borderColor: 'var(--c-phosphor)' } : undefined}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
    >
      {Icon && <Icon size={22} weight={on ? 'fill' : 'regular'} className={`shrink-0 mt-0.5 ${on ? 'text-phosphor' : 'text-muted'}`} />}
      <span className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="flex items-center gap-2 font-medium text-[16px]">
          {title}
          {on && <Check size={14} weight="bold" className="text-phosphor" />}
        </span>
        {children && <span className="text-[13.5px] text-muted leading-snug">{children}</span>}
      </span>
    </button>
  );
}

/**
 * Primeira abertura: sem conta, sem senha. Seis etapas curtas, todas à vista no
 * topo: você, ambientes (ADR-015), aparência, apps, saúde e um resumo. Tudo é
 * opcional e muda depois em Ajustes. Se o app tiver nuvem configurada, a etapa 1
 * oferece trazer os dados que estavam lá e pular o resto.
 */
export default function Onboarding() {
  const { createProfile } = useProfile();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [environments, setEnvironments] = useState([]);
  const [mode, setMode] = useState('escuro');
  const [style, setStyle] = useState('moderno');
  const [appIds, setAppIds] = useState([]);
  const [wellnessOn, setWellnessOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (setter) => (id) => setter((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const traits = environmentTraits(environments);
  // sugestões sem protocolo conhecido pedem o caminho do .exe, então ficam para Ajustes
  const suggestions = suggestionsFor(traits.apps);
  const quickApps = suggestions.filter((a) => !a.needsPath);
  const hasPathApps = suggestions.some((a) => a.needsPath);
  const pickedApps = quickApps.filter((a) => appIds.includes(a.id));
  const displayName = name.trim() || 'você';
  const firstName = name.trim().split(/\s+/)[0];

  /** Mostra o modo e o estilo na hora, antes de salvar */
  function preview(next) {
    applyAppearance({ theme: 'noir', custom: null, mode, style, ...next });
  }

  async function start(withImport) {
    setBusy(true);
    setError('');
    try {
      if (withImport) sessionStorage.setItem(OPEN_IMPORT_FLAG, '1');
      const extras = withImport
        ? {}
        : {
            environments,
            mode,
            style,
            ...(wellnessOn ? { wellness: { enabled: true } } : {}),
            ...(pickedApps.length
              ? { launcher: { apps: pickedApps.map((a) => ({ id: newAppId(), name: a.name, target: a.target, args: '' })) } }
              : {}),
          };
      if (!withImport && wellnessOn) ensureNotificationPermission();
      await createProfile(displayName, avatar, extras);
    } catch (err) {
      setError(err?.message || String(err));
      setBusy(false);
    }
  }

  const version = import.meta.env.VITE_APP_VERSION;
  const site = (path = '') => (e) => {
    e.preventDefault();
    openLink(`${SITE}${path}`);
  };

  const wide = step > 1 && step < LAST;
  const summary = [
    ['nome', displayName],
    ['ambientes', traits.ids.map((id) => ENVIRONMENTS[id].label).join(', ')],
    ['aparência', `${MODES[mode].label.toLowerCase()}, ${STYLES[style].label.toLowerCase()}`],
    ['apps', pickedApps.length ? `${pickedApps.length} adicionado${pickedApps.length > 1 ? 's' : ''}` : 'nenhum por enquanto'],
    ['modo saúde', wellnessOn ? 'ligado' : 'desligado'],
  ];

  return (
    <div className="h-full grid grid-cols-[0.82fr_1fr] max-[900px]:grid-cols-1">
      <section className="relative overflow-hidden border-r border-rule max-[900px]:hidden" style={{ background: '#0A0A0B' }}>
        <img src={wallpaper} alt="" className="absolute inset-0 w-full h-full object-cover anim-fade" draggable="false" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0) 18%, rgba(10,10,11,0) 70%, rgba(10,10,11,0.6) 100%)' }}
        />
        {/* mancha escura atrás do logo e do texto, como no hero do site, para a leitura não brigar com a arte */}
        <div
          aria-hidden="true"
          className="absolute -left-[12%] -bottom-[14%] w-[95%] h-[52%] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 38% 62%, rgba(10,10,11,0.94) 0%, rgba(10,10,11,0.82) 34%, rgba(10,10,11,0) 70%)', filter: 'blur(18px)' }}
        />
        <span className="noir absolute top-8 right-10 mono text-[11px] text-bone/80 border border-white/20 rounded-full px-3 py-1 backdrop-blur-sm">
          v{version} beta
        </span>
        <div className="noir absolute bottom-10 left-10 right-10">
          <Wordmark size={46} />
          <p className="font-display text-[22px] font-medium text-bone leading-snug max-w-[340px] mt-2.5">
            Gestão de Wellness, Eficiência e Navegação.
          </p>
        </div>
      </section>

      <section className="relative flex flex-col overflow-y-auto">
        <div className="flex-1 flex items-center justify-center px-10 py-12">
          <form
            className="w-full anim-rise"
            // o bloco inteiro em 85%, para não ficar tão em cima de quem lê
            style={{ zoom: 0.85, maxWidth: wide ? 600 : 480 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (step < LAST) setStep(step + 1);
              else start(false);
            }}
          >
            <Stepper step={step} onGo={setStep} />

            {step === 1 && (
              <>
                <p className="mono text-[17px] text-muted mb-6">
                  $ gwen <span className="text-bone font-semibold">--boas-vindas</span>
                </p>
                <h1 className="font-display font-bold leading-[0.95] tracking-[-0.04em] text-[clamp(40px,4.4vw,58px)]">
                  Como devemos
                  <span className="block onb-out">te chamar?</span>
                </h1>
                <p className="text-[16px] text-muted mt-5 mb-9 leading-relaxed">
                  Olá, eu sou a <span className="text-bone font-medium">G.W.E.N.</span>, sua assistente desktop. Não é preciso ter conta nem
                  senha. São <span className="text-bone">6 passos rápidos</span>, em menos de um minuto, e dá para pular o que quiser: tudo muda depois em Ajustes.
                </p>

                <div className="mb-6">
                  <span className="field-label block mb-2.5 !text-[12.5px]">Foto (opcional)</span>
                  <AvatarPicker avatar={avatar} name={name} onChange={setAvatar} disabled={busy} />
                </div>

                <label className="field mb-2">
                  <span className="field-label !text-[12.5px]">Seu nome</span>
                  <input
                    className="input"
                    style={{ height: 50, padding: '0 16px', fontSize: 16 }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como você prefere ser chamado(a)?"
                    autoFocus
                  />
                </label>
              </>
            )}

            {step === 2 && (
              <>
                <p className="mono text-[17px] text-muted mb-6">
                  $ gwen <span className="text-bone font-semibold">--ambientes</span>
                </p>
                <h1 className="font-display font-bold leading-[0.95] tracking-[-0.04em] text-[clamp(36px,4vw,52px)]">
                  O que você faz
                  <span className="block onb-out">por aqui?</span>
                </h1>
                <p className="text-[16px] text-muted mt-5 mb-7 leading-relaxed">
                  {firstName ? `Prazer, ${firstName}. ` : ''}Marque um ou mais. Eu adapto as pastas, os apps sugeridos e os exemplos. Sem escolher, começo no Geral.
                </p>
                <EnvironmentPicker selected={environments} onToggle={toggle(setEnvironments)} disabled={busy} large />
              </>
            )}

            {step === 3 && (
              <>
                <p className="mono text-[17px] text-muted mb-6">
                  $ gwen <span className="text-bone font-semibold">--aparencia</span>
                </p>
                <h1 className="font-display font-bold leading-[0.95] tracking-[-0.04em] text-[clamp(36px,4vw,52px)]">
                  Como você quer
                  <span className="block onb-out">me ver?</span>
                </h1>
                <p className="text-[16px] text-muted mt-5 mb-7 leading-relaxed">A mudança aparece na hora. Cores personalizadas ficam em Ajustes, Aparência.</p>

                <span className="field-label block mb-2.5 !text-[12.5px]">Modo</span>
                <div className="grid grid-cols-3 max-[720px]:grid-cols-1 gap-3 mb-6">
                  {Object.entries(MODES).map(([id, m]) => (
                    <Choice
                      key={id}
                      on={mode === id}
                      icon={MODE_ICON[id]}
                      title={m.label}
                      onClick={() => {
                        setMode(id);
                        preview({ mode: id });
                      }}
                    />
                  ))}
                </div>

                <span className="field-label block mb-2.5 !text-[12.5px]">Estilo</span>
                <div className="grid grid-cols-2 max-[720px]:grid-cols-1 gap-3">
                  {Object.entries(STYLES).map(([id, st]) => (
                    <Choice
                      key={id}
                      on={style === id}
                      title={st.label}
                      onClick={() => {
                        setStyle(id);
                        preview({ style: id });
                      }}
                    >
                      {st.description}
                    </Choice>
                  ))}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <p className="mono text-[17px] text-muted mb-6">
                  $ gwen <span className="text-bone font-semibold">--apps</span>
                </p>
                <h1 className="font-display font-bold leading-[0.95] tracking-[-0.04em] text-[clamp(36px,4vw,52px)]">
                  Quais apps eu
                  <span className="block onb-out">abro pra você?</span>
                </h1>
                <p className="text-[16px] text-muted mt-5 mb-7 leading-relaxed">
                  Sugestões para {traits.ids.map((id) => ENVIRONMENTS[id].label).join(' + ')}. Eu abro pelo Início, pelo Ctrl + K ou junto com um projeto. Precisam estar instalados.
                </p>
                <div className="grid grid-cols-2 max-[720px]:grid-cols-1 gap-3">
                  {quickApps.map((a) => (
                    <Choice key={a.id} on={appIds.includes(a.id)} icon={appIcon(a)} title={a.name} onClick={() => toggle(setAppIds)(a.id)} />
                  ))}
                </div>
                {hasPathApps && (
                  <p className="text-[13px] text-muted mt-4 leading-relaxed">
                    Os que pedem o caminho do executável (como Docker, DBeaver e Photoshop) você adiciona depois em Ajustes, Apps.
                  </p>
                )}
              </>
            )}

            {step === 5 && (
              <>
                <p className="mono text-[17px] text-muted mb-6">
                  $ gwen <span className="text-bone font-semibold">--saude</span>
                </p>
                <h1 className="font-display font-bold leading-[0.95] tracking-[-0.04em] text-[clamp(36px,4vw,52px)]">
                  Quer que eu cuide
                  <span className="block onb-out">de você?</span>
                </h1>
                <p className="text-[16px] text-muted mt-5 mb-7 leading-relaxed">
                  O modo saúde manda lembretes no meio do trabalho. Eles contam o tempo que você trabalhou, não o relógio, e param nas pausas.
                </p>
                <div className="grid grid-cols-2 max-[720px]:grid-cols-1 gap-3">
                  <Choice on={wellnessOn} title="Ligar o modo saúde" onClick={() => setWellnessOn(true)}>
                    {Object.values(REMINDERS)
                      .filter((r) => r.on)
                      .map((r) => `${r.label.toLowerCase()} a cada ${r.every} min`)
                      .join(', ')}
                    . Os intervalos mudam em Ajustes.
                  </Choice>
                  <Choice on={!wellnessOn} title="Agora não" onClick={() => setWellnessOn(false)}>
                    Dá para ligar quando quiser, em Ajustes, Modo saúde.
                  </Choice>
                </div>
              </>
            )}

            {step === 6 && (
              <>
                <p className="mono text-[17px] text-muted mb-6 anim-rise" style={{ animationFillMode: 'both' }}>
                  $ gwen <span className="text-bone font-semibold">--iniciar</span>
                </p>
                <div className="card p-5 mono text-[14px] leading-loose">
                  {summary.map(([k, v], i) => (
                    <p key={k} className="anim-rise" style={{ animationDelay: `${150 + i * 170}ms`, animationFillMode: 'both' }}>
                      <span className="text-phosphor">✓</span> <span className="text-muted">{k}:</span> <span className="text-bone">{v}</span>
                    </p>
                  ))}
                  <p className="anim-rise mt-2 text-bone font-semibold" style={{ animationDelay: `${150 + summary.length * 170 + 120}ms`, animationFillMode: 'both' }}>
                    G.W.E.N. pronta{firstName ? `, ${firstName}` : ''}.
                  </p>
                </div>
                <div className="card p-4 mt-6 flex gap-3.5">
                  <HardDrives size={20} className="text-phosphor shrink-0 mt-0.5" />
                  <p className="text-[14px] text-muted leading-relaxed">
                    Vou guardar seus projetos, tempos e pausas aqui, <span className="text-bone">neste computador</span>. Seu nome e sua foto ficam
                    registrados com a G.W.E.N., junto da versão e do sistema, para sabermos quem está usando. Dá para desligar em Ajustes.
                  </p>
                </div>
              </>
            )}

            {error && <p className="mt-4 text-[14px] text-ember">{error}</p>}

            <div className="flex items-center gap-3 mt-9">
              {step > 1 && (
                <button type="button" className="btn btn-quiet" onClick={() => setStep(step - 1)} disabled={busy}>
                  <ArrowLeft size={15} />
                  <Label>Voltar</Label>
                </button>
              )}
              <button type="submit" className="btn btn-primary btn-lg ml-auto min-w-[200px] text-[15px]" disabled={busy}>
                <Label>{step === LAST ? 'Começar a usar' : 'Continuar'}</Label>
                <ArrowRight size={16} weight="bold" />
              </button>
            </div>

            {step === 1 && isSupabaseConfigured && (
              <button type="button" className="btn btn-ghost btn-lg w-full mt-3" onClick={() => start(true)} disabled={busy}>
                <CloudArrowDown size={16} />
                <Label>Já uso a nuvem: importar e pular o resto</Label>
              </button>
            )}
          </form>
        </div>

        <footer className="px-10 py-5 border-t border-rule flex items-center justify-between gap-4 flex-wrap text-[13px]">
          <p className="text-muted">
            por <span className="text-bone">Samara Silvia Sabino</span>
          </p>
          <nav className="flex items-center gap-5 text-muted">
            <a href={SITE} onClick={site()} className="hover:text-bone transition-colors">Site</a>
            <a href={`${SITE}/novidades`} onClick={site('/novidades')} className="hover:text-bone transition-colors">Novidades</a>
            <a href={`${SITE}/#privacidade`} onClick={site('/#privacidade')} className="hover:text-bone transition-colors">Privacidade</a>
            <a href={`${SITE}/contato`} onClick={site('/contato')} className="hover:text-bone transition-colors">Ajuda</a>
          </nav>
        </footer>
      </section>
    </div>
  );
}
