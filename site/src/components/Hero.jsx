import { ArrowRight } from '@phosphor-icons/react'
import { BrandArt, Logo } from './Brand'

export default function Hero({ version }) {
  return (
    <header id="topo" className="relative overflow-hidden" style={{ borderBottom: '1px solid var(--c-rule)' }}>
      {/* wallpaper como textura — igual à home-hero do app */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(180deg, color-mix(in srgb, var(--c-void) 45%, transparent) 0%, color-mix(in srgb, var(--c-void) 80%, transparent) 55%, var(--c-void) 100%), url(/prints/inicio.png)',
        backgroundSize: 'cover', backgroundPosition: 'center 30%',
        opacity: .35,
      }} />

      {/* grade sutil — identidade do sistema */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(var(--c-rule) 1px, transparent 1px), linear-gradient(90deg, var(--c-rule) 1px, transparent 1px)',
        backgroundSize: '40px 40px', opacity: .18,
      }} />

      <div className="relative mx-auto px-[var(--gutter)] py-20 md:py-28" style={{ maxWidth: 'var(--max-w)' }}>
        <div className="grid gap-12 items-center" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>

          {/* ─── texto ─── */}
          <div className="anim-rise">
            {/* eyebrow — identidade do sistema */}
            <div className="eyebrow mb-5 flex items-center gap-3">
              <span className="chip">v{version}</span>
              <span>· beta fechado · Windows</span>
            </div>

            <h1 style={{
              fontFamily: 'var(--f-display)', fontWeight: 700,
              fontSize: 'clamp(3rem, 8vw, 6rem)',
              lineHeight: .93, letterSpacing: '-.03em',
              color: 'var(--c-bone)',
              marginBottom: '1.5rem',
            }}>
              Trabalhe.<br />
              Descanse.<br />
              <span style={{ color: 'var(--c-phosphor)' }}>Repita.</span>
            </h1>

            <p style={{ color: 'var(--c-muted)', fontSize: '1.125rem', lineHeight: 1.7, maxWidth: '40ch', marginBottom: '2rem' }}>
              App desktop para quem trabalha com projetos. Mede onde seu tempo vai, cuida para você não passar do limite — e mantém tudo no lugar, mesmo sem internet.
            </p>

            {/* barra de energia — assinatura visual do app */}
            <div className="mb-8" style={{ maxWidth: 320 }}>
              <div className="eyebrow mb-2">energia da semana</div>
              <div className="energy-track">
                <div className="energy-fill" style={{ width: '68%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--c-muted)', marginTop: 4 }}>
                <span>0h</span><span>68% · dentro do limite</span><span>44h</span>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <a href="#acesso" className="btn btn-primary btn-lg">
                Pedir acesso beta <ArrowRight size={16} weight="bold" />
              </a>
              <a href="#o-que-e" className="btn btn-ghost btn-lg">
                Ver como funciona
              </a>
            </div>

            <p className="eyebrow mt-5">Gratuito para uso local · Dados no seu computador</p>
          </div>

          {/* ─── BrandArt ─── */}
          <div className="hidden lg:flex items-center justify-center" style={{ width: 340, position: 'relative' }}>
            <div className="brand-ring" style={{ position: 'relative' }}>
              <BrandArt style={{ width: 300, height: 'auto', opacity: .92 }} />
            </div>
          </div>
        </div>

        {/* plataformas — como no Noveling */}
        <div className="eyebrow mt-16 flex items-center gap-2" style={{ opacity: .7 }}>
          Windows ·&nbsp;
          <span style={{ textDecoration: 'line-through', opacity: .5 }}>macOS</span>
          &nbsp;·&nbsp;
          <span style={{ textDecoration: 'line-through', opacity: .5 }}>Linux</span>
          &nbsp;— em breve
        </div>
      </div>
    </header>
  )
}
