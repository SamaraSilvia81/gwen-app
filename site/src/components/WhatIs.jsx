import { Timer, Kanban, Heartbeat, HardDrive } from '@phosphor-icons/react'
import { useReveal } from '../hooks'

const PILLARS = [
  { Icon: Timer,     title: 'Tempo real por projeto',      text: 'Sessões com frentes simultâneas, histórico completo, relatório de onde seu tempo foi. Sem timers manuais.' },
  { Icon: Kanban,    title: 'Tarefas integradas',          text: 'Kanban próprio dentro do projeto. Importa Issues do GitHub para acompanhar sem sair do app.' },
  { Icon: Heartbeat, title: 'Modo saúde',                  text: 'Pausas guiadas, alongamentos e alertas baseados em evidências publicadas. Avisa antes do burnout, não depois.' },
  { Icon: HardDrive, title: 'Seus dados, no seu computador', text: 'SQLite local por padrão. Nuvem é opcional. Funciona offline, sempre.' },
]

export default function WhatIs() {
  const ref = useReveal()
  return (
    <section id="o-que-e" ref={ref} className="reveal" style={{ borderBottom: '1px solid var(--c-rule)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
      <div className="mx-auto px-[var(--gutter)]" style={{ maxWidth: 'var(--max-w)' }}>

        <div className="grid gap-16 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))' }}>
          <div>
            <p className="eyebrow mb-4 prompt">gwen · o que é</p>
            <h2 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 'clamp(1.75rem,4vw,2.75rem)', lineHeight: 1.1, letterSpacing: '-.02em', color: 'var(--c-bone)', marginBottom: '1rem', maxWidth: '18ch' }}>
              Um app que trabalha enquanto você trabalha
            </h2>
            <p style={{ color: 'var(--c-muted)', fontSize: '1.0625rem', lineHeight: 1.8, maxWidth: '42ch' }}>
              Ferramentas de produtividade que prometem organizar sua vida, mas que você abandona em duas semanas porque são complicadas demais. A G.W.E.N. é simples por design — você abre, começa uma sessão e vai trabalhar.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {PILLARS.map(({ Icon, title, text }) => (
              <div key={title} className="card" style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr', gap: '0.875rem', alignItems: 'start', padding: '1.125rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)', color: 'var(--c-phosphor)', flexShrink: 0 }}>
                  <Icon size={18} weight="regular" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--f-display)', fontWeight: 600, fontSize: '.9375rem', color: 'var(--c-bone)', marginBottom: '.25rem' }}>{title}</div>
                  <div style={{ fontSize: '.875rem', color: 'var(--c-muted)', lineHeight: 1.65 }}>{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
