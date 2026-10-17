import { useState } from 'react';
import { ArrowRight, Eye, EyeSlash } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { Wordmark } from '../components/Logo';
import wallpaper from '../assets/wallpaper.webp';
import { Label } from '../components/Modal';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const isSignup = mode === 'criar';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (isSignup) {
        const { needsConfirmation } = await signUp(email.trim(), password, name.trim());
        if (needsConfirmation) {
          setInfo('Conta criada. Confirme pelo link que chegou no seu e-mail e depois entre aqui.');
          setMode('entrar');
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full grid grid-cols-[1.1fr_1fr] max-[900px]:grid-cols-1">
      {/* lado da marca: o wallpaper é identidade do sistema, fica igual em qualquer tema */}
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
            by <span className="text-bone">@devs_sam</span> · v0.1 beta
          </p>
        </div>
      </section>

      {/* formulário */}
      <section className="flex items-center justify-center px-8">
        <form onSubmit={handleSubmit} className="w-full max-w-[360px] anim-rise">
          <p className="eyebrow mb-3">{isSignup ? 'nova conta' : 'que bom te ver de novo'}</p>
          <h1 className="font-display text-3xl font-bold leading-tight mb-2">
            {isSignup ? 'Vamos preparar seu espaço.' : 'Bora começar?'}
          </h1>
          <p className="text-muted mb-8 leading-relaxed">
            {isSignup
              ? 'Seus projetos, tempos e preferências ficam salvos na nuvem.'
              : 'Entre para abrir seus projetos e retomar de onde parou.'}
          </p>

          <div className="segmented mb-6 w-full">
            <button type="button" className={`flex-1 ${!isSignup ? 'active' : ''}`} onClick={() => setMode('entrar')}>
              Entrar
            </button>
            <button type="button" className={`flex-1 ${isSignup ? 'active' : ''}`} onClick={() => setMode('criar')}>
              Criar conta
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {isSignup && (
              <label className="field">
                <span className="field-label">Como quer ser chamada</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sams" required />
              </label>
            )}
            <label className="field">
              <span className="field-label">E-mail</span>
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Senha</span>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-bone p-1"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </div>

          {error && <p className="mt-4 text-[13px] text-ember">{error}</p>}
          {info && <p className="mt-4 text-[13px] text-phosphor">{info}</p>}

          <button type="submit" className="btn btn-primary btn-lg w-full mt-6" disabled={busy}>
            <Label>{busy ? 'Aguarde...' : isSignup ? 'Criar conta' : 'Entrar'}</Label>
            {!busy && <ArrowRight size={16} weight="bold" />}
          </button>
        </form>
      </section>
    </div>
  );
}
