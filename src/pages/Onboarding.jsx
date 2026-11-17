import { useState } from 'react';
import { ArrowLeft, ArrowRight, CloudArrowDown, HardDrives } from '@phosphor-icons/react';
import { useProfile } from '../context/ProfileContext';
import { isSupabaseConfigured } from '../lib/cloudAuth';
import { Wordmark } from '../components/Logo';
import { Label } from '../components/Modal';
import { AvatarPicker } from '../components/Avatar';
import EnvironmentPicker from '../components/EnvironmentPicker';
import wallpaper from '../assets/wallpaper.webp';
import { openLink } from '../lib/native';

const SITE = 'https://gwenapp.vercel.app';

export const OPEN_IMPORT_FLAG = 'gwen.openCloudImport';

/**
 * Primeira abertura: sem conta, sem senha. Duas etapas curtas: o nome e, depois,
 * o que a pessoa faz no computador (ambientes, ADR-015). Sem escolher, vale Geral.
 * Se o app tiver nuvem configurada, oferece trazer os dados que estavam lá.
 */
export default function Onboarding() {
  const { createProfile } = useProfile();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [step, setStep] = useState(1);
  const [environments, setEnvironments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start(withImport) {
    setBusy(true);
    setError('');
    try {
      if (withImport) sessionStorage.setItem(OPEN_IMPORT_FLAG, '1');
      await createProfile(name.trim() || 'você', avatar, withImport ? null : environments);
    } catch (err) {
      setError(err?.message || String(err));
      setBusy(false);
    }
  }

  const toggleEnvironment = (id) => setEnvironments((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const firstName = name.trim().split(/\s+/)[0];

  const version = import.meta.env.VITE_APP_VERSION;
  const site = (path = '') => (e) => {
    e.preventDefault();
    openLink(`${SITE}${path}`);
  };

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
            className="w-full max-w-[440px] anim-rise"
            // o bloco inteiro em 85%, para não ficar tão em cima de quem lê
            style={{ zoom: 0.85 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 1) setStep(2);
              else start(false);
            }}
          >
            {step === 2 ? (
              <>
                <p className="mono text-[17px] text-muted mb-6">
                  $ gwen <span className="text-bone font-semibold">--ambientes</span>
                </p>
                <h1 className="font-display font-bold leading-[0.95] tracking-[-0.04em] text-[clamp(40px,4.4vw,58px)]">
                  O que você faz
                  <span className="block onb-out">por aqui?</span>
                </h1>
                <p className="text-[16px] text-muted mt-5 mb-7 leading-relaxed">
                  {firstName ? `Prazer, ${firstName}. ` : ''}Marque um ou mais. Eu adapto as pastas, os apps sugeridos e os exemplos. Sem escolher,
                  eu começo no Geral. Dá para mudar depois em Ajustes, Ambientes.
                </p>

                <div className="mb-7">
                  <EnvironmentPicker selected={environments} onToggle={toggleEnvironment} disabled={busy} single />
                </div>

                <button type="submit" className="btn btn-primary btn-lg w-full text-[15px]" disabled={busy}>
                  <Label>Começar</Label>
                  <ArrowRight size={16} weight="bold" />
                </button>
                <button type="button" className="btn btn-quiet btn-lg w-full mt-3" onClick={() => setStep(1)} disabled={busy}>
                  <ArrowLeft size={16} />
                  <Label>Voltar</Label>
                </button>

                {error && <p className="mt-4 text-[14px] text-ember">{error}</p>}
              </>
            ) : (
              <>
                <p className="mono text-[17px] text-muted mb-6">
                  $ gwen <span className="text-bone font-semibold">--boas-vindas</span>
                </p>
                <h1 className="font-display font-bold leading-[0.95] tracking-[-0.04em] text-[clamp(40px,4.4vw,58px)]">
                  Como devemos
                  <span className="block onb-out">te chamar?</span>
                </h1>
                <p className="text-[16px] text-muted mt-5 mb-9 leading-relaxed">
                  Olá, eu sou a <span className="text-bone font-medium">G.W.E.N.</span>, sua assistente desktop. Não é preciso ter conta nem senha,
                  é só me dizer seu nome e podemos começar.
                </p>

                <div className="mb-6">
                  <span className="field-label block mb-2.5 !text-[12.5px]">Foto (opcional)</span>
                  <AvatarPicker avatar={avatar} name={name} onChange={setAvatar} disabled={busy} />
                </div>

                <label className="field mb-7">
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

                <button type="submit" className="btn btn-primary btn-lg w-full text-[15px]" disabled={busy}>
                  <Label>Continuar</Label>
                  <ArrowRight size={16} weight="bold" />
                </button>

                {isSupabaseConfigured && (
                  <button type="button" className="btn btn-ghost btn-lg w-full mt-3" onClick={() => start(true)} disabled={busy}>
                    <CloudArrowDown size={16} />
                    <Label>Começar e importar da nuvem</Label>
                  </button>
                )}

                {error && <p className="mt-4 text-[14px] text-ember">{error}</p>}

                <div className="card p-4 mt-8 flex gap-3.5">
                  <HardDrives size={20} className="text-phosphor shrink-0 mt-0.5" />
                  <p className="text-[14px] text-muted leading-relaxed">
                    Vou guardar seus projetos, tempos e pausas aqui, <span className="text-bone">neste computador</span>. Seu nome e sua foto
                    ficam registrados com a G.W.E.N., junto da versão e do sistema, para sabermos quem está usando. Dá para desligar em Ajustes.
                  </p>
                </div>
              </>
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
