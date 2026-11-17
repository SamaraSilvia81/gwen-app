import { useState } from 'react'
import { useReveal } from '../hooks'

const SCREENS = [
  { src: '/prints/inicio.png',              caption: 'início · dashboard com sessão ativa',   group: 'inicio' },
  { src: '/prints/dashboard-noir.png',      caption: 'início · tema Noir',                    group: 'inicio' },
  { src: '/prints/dashboard-terminal.png',  caption: 'início · tema Terminal',                group: 'inicio' },
  { src: '/prints/dashboard-personalizado.png', caption: 'início · tema personalizado',       group: 'inicio' },
  { src: '/prints/projetos-grade.png',      caption: 'projetos · vista em grade',             group: 'projetos' },
  { src: '/prints/projetos-lista.png',      caption: 'projetos · vista em lista',             group: 'projetos' },
  { src: '/prints/projeto-form.png',        caption: 'projetos · criar ou editar',            group: 'projetos' },
  { src: '/prints/tarefas-kanban.png',      caption: 'tarefas · quadro kanban',               group: 'tarefas' },
  { src: '/prints/tarefas-lista.png',       caption: 'tarefas · lista compacta',              group: 'tarefas' },
  { src: '/prints/modo-saude.png',          caption: 'saúde · visão geral da semana',         group: 'saude' },
  { src: '/prints/modo-pausa.png',          caption: 'saúde · pausa guiada',                  group: 'saude' },
  { src: '/prints/pausa-alongamento.png',   caption: 'saúde · sequência de alongamento',      group: 'saude' },
  { src: '/prints/linha-do-tempo.png',      caption: 'relatório · linha do tempo do dia',     group: 'inicio' },
  { src: '/prints/apps-e-jogos.png',        caption: 'mapeamento · apps e jogos em uso',      group: 'mais' },
  { src: '/prints/configuracoes.png',       caption: 'ajustes · aparência e launcher',        group: 'mais' },
  { src: '/prints/perfil.png',              caption: 'perfil · hábitos e estatísticas',       group: 'mais' },
]

const TABS = [
  { key: 'inicio',   label: 'Início' },
  { key: 'projetos', label: 'Projetos' },
  { key: 'tarefas',  label: 'Tarefas' },
  { key: 'saude',    label: 'Saúde' },
  { key: 'mais',     label: 'Mais' },
]

export default function Screens() {
  const [active, setActive] = useState('inicio')
  const ref = useReveal()
  const visible = SCREENS.filter(s => s.group === active)

  return (
    <section id="telas" ref={ref} className="reveal" style={{ borderBottom: '1px solid var(--c-rule)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
      <div className="mx-auto px-[var(--gutter)]" style={{ maxWidth: 'var(--max-w)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <div>
            <p className="eyebrow mb-3 prompt">gwen · telas</p>
            <h2 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 'clamp(1.75rem,4vw,2.75rem)', lineHeight: 1.1, letterSpacing: '-.02em', color: 'var(--c-bone)' }}>
              Veja o app
            </h2>
          </div>

          {/* segmented control — exato do app */}
          <div style={{ display: 'inline-flex', padding: 2, gap: 2, background: 'var(--c-surface-alt)', border: '1px solid var(--c-rule)', borderRadius: 'var(--radius-sm)' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                style={{
                  height: 28, padding: '0 12px', border: 0, borderRadius: 'calc(var(--radius-sm) - 2px)',
                  fontFamily: 'var(--f-body)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  background: active === t.key ? 'var(--c-surface)' : 'transparent',
                  color: active === t.key ? 'var(--c-bone)' : 'var(--c-muted)',
                  boxShadow: active === t.key ? '0 1px 2px rgba(0,0,0,.25), 0 0 0 1px var(--c-rule-light)' : 'none',
                  transition: 'background .2s, color .2s, box-shadow .2s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="screens-strip" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.75rem' }}>
          {visible.map(s => (
            <div key={s.src} className="screen-snap card" style={{ flexShrink: 0, width: 'min(70vw, 600px)', overflow: 'hidden' }}>
              <img src={s.src} alt={s.caption} loading="lazy" style={{ width: '100%', display: 'block' }} />
              <div className="eyebrow prompt" style={{ padding: '.75rem 1rem', borderTop: '1px solid var(--c-rule)' }}>
                {s.caption}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
