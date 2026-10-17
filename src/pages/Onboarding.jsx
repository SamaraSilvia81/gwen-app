import { useState } from 'react';
import { ArrowRight, CloudArrowDown, HardDrives } from '@phosphor-icons/react';
import { useProfile } from '../context/ProfileContext';
import { isSupabaseConfigured } from '../lib/cloudAuth';
import { Wordmark } from '../components/Logo';
import { Label } from '../components/Modal';
import { AvatarPicker } from '../components/Avatar';
import wallpaper from '../assets/wallpaper.webp';

export const OPEN_IMPORT_FLAG = 'gwen.openCloudImport';

/**
 * Primeira abertura: sem conta, sem senha. Só o nome, e a G.W.E.N. já abre.
 * Se o app tiver nuvem configurada, oferece trazer os dados que estavam lá.
 */
export default function Onboarding() {
  const { createProfile } = useProfile();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start(withImport) {
    setBusy(true);
    setError('');
    try {
      if (withImport) sessionStorage.setItem(OPEN_IMPORT_FLAG, '1');
      await createProfile(name.trim() || 'você', avatar);
    } catch (err) {
      setError(err?.message || String(err));
      setBusy(false);
    }
  }

  return (
    <div className="h-full grid grid-cols-[1.1fr_1fr] max-[900px]:grid-cols-1">
      <section className="relative overflow-hidden border-r border-rule max-[900px]:hidden" style={{ background: '#0A0A0B' }}>
        <img src={wallpaper} alt="" className="absolute inset-0 w-full h-full object-cover anim-fade" draggable="false" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(10,10,11,0.85) 0%, rgba(10,10,11,0) 22%, rgba(10,10,11,0) 70%, rgba(10,10,11,0.92) 100%)' }}
        />
        <div className="noir absolute top-8 left-10">
          <Wordmark size={26} />
        </div>
        <div className="noir absolute bottom-8 left-10 right-10 flex items-end justify-between">
          <p className="font-display text-[15px] font-medium text-bone leading-snug max-w-[280px]">
            Gestão de Wellness, Eficiência e Navegação.
          </p>
          <p className="mono text-[11px] text-muted">
            by <span className="text-bone">@devs_sam</span> · v{import.meta.env.VITE_APP_VERSION} beta
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-8">
        <form
          className="w-full max-w-[380px] anim-rise"
          onSubmit={(e) => {
            e.preventDefault();
            start(false);
          }}
        >
          <p className="eyebrow mb-3">primeira vez por aqui</p>
          <h1 className="font-display text-3xl font-bold leading-tight mb-2">Como devemos te chamar?</h1>
          <p className="text-muted mb-8 leading-relaxed">Sem conta e sem senha. É só para a G.W.E.N. te cumprimentar.</p>

          <div className="mb-5">
            <span className="field-label block mb-2">Foto (opcional)</span>
            <AvatarPicker avatar={avatar} name={name} onChange={setAvatar} disabled={busy} />
          </div>

          <label className="field mb-6">
            <span className="field-label">Nome</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoFocus />
          </label>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy}>
            <Label>Começar</Label>
            <ArrowRight size={16} weight="bold" />
          </button>

          {isSupabaseConfigured && (
            <button type="button" className="btn btn-ghost btn-lg w-full mt-3" onClick={() => start(true)} disabled={busy}>
              <CloudArrowDown size={16} />
              <Label>Começar e importar da nuvem</Label>
            </button>
          )}

          {error && <p className="mt-4 text-[13px] text-ember">{error}</p>}

          <div className="card p-4 mt-8 flex gap-3">
            <HardDrives size={18} className="text-phosphor shrink-0 mt-0.5" />
            <p className="text-[12px] text-muted leading-relaxed">
              Seus projetos, tempos e pausas ficam <span className="text-bone">neste computador</span>. Dá para fazer backup em
              Configurações quando quiser.
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
