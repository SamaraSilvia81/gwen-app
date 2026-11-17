import { useState } from 'react'
import { useReveal } from '../hooks'
import { Wordmark } from './Brand'
import { EnvelopeSimple, DiscordLogo, GithubLogo } from '@phosphor-icons/react'

/* ── helper ── */
function Section({ id, label, title, children, style }) {
  const ref = useReveal()
  return (
    <section id={id} ref={ref} className="reveal" style={{ borderBottom: '1px solid var(--c-rule)', padding: 'clamp(4rem,8vw,7rem) 0', ...style }}>
      <div className="mx-auto px-[var(--gutter)]" style={{ maxWidth: 'var(--max-w)' }}>
        <p className="eyebrow mb-4 prompt">{label}</p>
        <h2 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 'clamp(1.75rem,4vw,2.75rem)', lineHeight: 1.1, letterSpacing: '-.02em', color: 'var(--c-bone)', marginBottom: '2.5rem' }}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  )
}

/* ── HISTÓRIA ── */
export function Story() {
  return (
    <Section id="historia" label="gwen · história" title="Por que isso existe">
      <div className="grid gap-16 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: 'var(--c-muted)', fontSize: '1.0625rem', lineHeight: 1.8 }}>
          <p>
            A G.W.E.N. começou como solução para um problema pessoal.{' '}
            <strong style={{ color: 'var(--c-bone)', fontWeight: 500 }}>Samara Silvia Sabino</strong>, estudante do CIn-UFPE em Recife, trabalhava em múltiplos projetos ao mesmo tempo — acadêmicos, freelance, pessoais — e não encontrava uma ferramenta que fizesse o que ela precisava sem exigir que ela se adaptasse a ela.
          </p>
          <p>
            As ferramentas existentes eram complexas demais, pensadas para times, ou simplesmente feias. E nenhuma cuidava de quem usava — só de quanto a pessoa produzia.
          </p>
          <p>
            A primeira linha de código foi escrita em outubro de 2026. Em menos de duas semanas o app já tinha SQLite local, sessões com tempo real e modo saúde com pausas guiadas. Tudo documentado desde o início: cada decisão técnica virou um ADR, cada problema real virou um FBK.
          </p>
          <p>
            O nome vem do que ela faz:{' '}
            <strong style={{ color: 'var(--c-bone)', fontWeight: 500 }}>G</strong>estão de{' '}
            <strong style={{ color: 'var(--c-bone)', fontWeight: 500 }}>W</strong>ellness,{' '}
            <strong style={{ color: 'var(--c-bone)', fontWeight: 500 }}>E</strong>ficiência e{' '}
            <strong style={{ color: 'var(--c-bone)', fontWeight: 500 }}>N</strong>avegação. O G no logo é uma barra de energia — porque medir o que você tem de sobra é tão importante quanto medir o que produziu.
          </p>
        </div>

        {/* stats no estilo dos cards do app */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { label: 'versão atual', value: 'v0.9.1', sub: 'outubro de 2026' },
            { label: 'decisões documentadas', value: '14 ADRs', sub: 'cada escolha técnica registrada' },
            { label: 'feito em', value: 'Recife, PE', sub: 'CIn-UFPE · Brasil' },
          ].map(s => (
            <div key={s.value} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <p className="eyebrow" style={{ marginBottom: '.5rem' }}>{s.label}</p>
              <p style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1.75rem', color: 'var(--c-bone)', lineHeight: 1, marginBottom: '.25rem' }}>{s.value}</p>
              <p style={{ fontSize: '.875rem', color: 'var(--c-muted)' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ── DEPOIMENTOS ── */
export function Testimonials() {
  return (
    <Section id="depoimentos" label="gwen · quem usa" title="O que estão dizendo">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))' }}>
        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ color: 'var(--c-bone)', fontStyle: 'italic', lineHeight: 1.75, fontSize: '1rem' }}>
            "Finalmente um app que me lembra de parar. Trabalhei três semanas sem burnout — e eu tenho histórico. A parte de saúde não é decoração, ela funciona de verdade."
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginTop: 'auto' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--c-surface-alt)', border: '1px solid var(--c-rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-mono)', fontSize: '.875rem', color: 'var(--c-phosphor)' }}>S</div>
            <div>
              <div style={{ fontFamily: 'var(--f-display)', fontWeight: 600, fontSize: '.875rem', color: 'var(--c-bone)' }}>Samara Silvia</div>
              <div style={{ fontSize: '.75rem', color: 'var(--c-muted)' }}>Criadora · CIn-UFPE, Recife</div>
            </div>
          </div>
        </div>

        {['Beta FBK-002 em andamento', 'Quer aparecer aqui?'].map((txt, i) => (
          <div key={i} className="card" style={{ padding: '1.75rem', opacity: .45, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--c-muted)', fontSize: '.9375rem', lineHeight: 1.65 }}>{txt}</p>
            {i === 1 && <a href="#acesso" style={{ fontFamily: 'var(--f-mono)', fontSize: '.75rem', color: 'var(--c-phosphor)', textDecoration: 'underline', textUnderlineOffset: 3, pointerEvents: 'all', opacity: 2 }}>Pedir acesso →</a>}
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ── ROADMAP ── */
const ROADMAP = [
  { ver: 'em desenvolvimento', name: 'Mapeamento completo',      desc: 'PWAs pelo AppUserModelID, mídia em segundo plano, launchers de jogos. O YouTube minimizado conta.', current: true },
  { ver: 'v0.10',              name: 'Calendário',               desc: 'Google Calendar integrado. Bloqueie tempo para projetos sem sair do app.' },
  { ver: 'v0.11',              name: 'Finanças',                 desc: 'Valor da hora, receita por período. Para quem faz freelance e quer saber se está no lucro.' },
  { ver: 'v0.12',              name: 'Caderno',                  desc: 'Playbook de padrões, modelos e editor de documentação dentro do projeto.' },
  { ver: 'v1.0',               name: 'Assistente local',         desc: 'IA que conversa com seus dados, sem mandar nada pra fora. Roda com Ollama local.' },
  { ver: 'ecossistema',        name: 'TrackFox',                 desc: 'Diário de trabalho inteligente em PT-BR, cálculo em R$. Integração opcional com a G.W.E.N.' },
]

export function Roadmap() {
  return (
    <Section id="roadmap" label="gwen · o que vem" title="Próximas versões">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))' }}>
        {ROADMAP.map(r => (
          <div key={r.name} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <p className="eyebrow" style={{ marginBottom: '.75rem' }}>{r.ver}</p>
            <p style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--c-bone)', marginBottom: '.5rem' }}>{r.name}</p>
            <p style={{ fontSize: '.875rem', color: 'var(--c-muted)', lineHeight: 1.65 }}>{r.desc}</p>
            <div className="chip" style={{ marginTop: '1rem', ...(r.current ? { color: 'var(--c-bone)', borderColor: 'var(--c-rule-light)' } : {}) }}>
              {r.current ? 'em breve' : r.ver === 'ecossistema' ? 'ecossistema' : 'planejado'}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ── PREÇOS ── */
const PLANS = [
  {
    name: 'Local', price: 'Grátis', sub: 'para sempre',
    desc: 'Tudo que a G.W.E.N. tem, no seu computador, sem conta, sem limite de tempo.',
    features: [
      [true,  'Projetos, sessões e tempo ilimitados'],
      [true,  'Tarefas e kanban'],
      [true,  'Modo saúde completo'],
      [true,  'Mapeamento de apps e jogos'],
      [true,  'SQLite local · offline total'],
      [false, 'Sincronização entre computadores'],
      [false, 'Backup automático na nuvem'],
    ],
    cta: { label: 'Pedir acesso beta', href: '#acesso', primary: false },
    highlight: false,
  },
  {
    name: 'Nuvem', price: 'Em breve', sub: '',
    desc: 'Tudo do Local mais sincronização entre dispositivos e backup. Você decide quando migrar.',
    features: [
      [true,  'Tudo do plano Local'],
      [true,  'Sincronização entre computadores'],
      [true,  'Backup automático'],
      [true,  'Supabase como backend · dados seus'],
      [false, 'macOS · Linux (em desenvolvimento)'],
    ],
    cta: { label: 'Entrar na lista de espera', href: '#acesso', primary: true },
    highlight: true,
  },
]

export function Pricing() {
  return (
    <Section id="precos" label="gwen · preços" title="Simples assim">
      <p style={{ color: 'var(--c-muted)', fontSize: '1.0625rem', maxWidth: '44ch', marginTop: '-1.5rem', marginBottom: '2.5rem' }}>
        O app é seu. Os dados são seus. A nuvem é opcional — modelo inspirado no Obsidian.
      </p>
      <div className="grid gap-3 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))' }}>
        {PLANS.map(p => (
          <div key={p.name} className="card" style={{ padding: '2rem', background: p.highlight ? 'var(--c-surface-alt)' : 'var(--c-surface)', borderColor: p.highlight ? 'var(--c-rule-light)' : 'var(--c-rule)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, color: 'var(--c-bone)', fontSize: '1.05rem', marginBottom: '.5rem' }}>{p.name}</div>
              <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '2.25rem', color: 'var(--c-bone)', lineHeight: 1 }}>
                {p.price}{p.sub && <sub style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--c-muted)', verticalAlign: 'middle', marginLeft: '.35rem' }}>{p.sub}</sub>}
              </div>
              <p style={{ fontSize: '.875rem', color: 'var(--c-muted)', marginTop: '.5rem', lineHeight: 1.6 }}>{p.desc}</p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {p.features.map(([on, txt]) => (
                <li key={txt} style={{ fontSize: '.875rem', color: on ? 'var(--c-bone)' : 'var(--c-muted)', paddingLeft: '1.25rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: on ? 'var(--c-phosphor)' : 'var(--c-rule-light)' }}>{on ? '✓' : '—'}</span>
                  {txt}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 'auto' }}>
              <a href={p.cta.href} className={`btn ${p.cta.primary ? 'btn-primary' : 'btn-ghost'}`} style={{ width: '100%', justifyContent: 'center' }}>
                {p.cta.label}
              </a>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ── FAQ ── */
const FAQS = [
  ['Funciona sem internet?', 'Sim. O plano Local usa SQLite diretamente no computador. Nenhuma funcionalidade depende de internet.'],
  ['Preciso criar uma conta?', 'Não. No plano Local você cria um perfil local, sem email e sem senha. A conta Google é usada apenas para a futura sincronização em nuvem.'],
  ['Meus dados ficam onde?', 'Na pasta de dados do seu usuário no Windows (AppData/Roaming/gwen). O app nunca lê nem envia código dos seus projetos.'],
  ['É só para Windows?', 'Por enquanto sim. O app é feito com Tauri 2. macOS e Linux estão no roadmap.'],
  ['O que é o modo saúde?', 'Alertas baseados em evidências: semana acima de 44h (limite constitucional), 55h (OMS/OIT), pausa a cada 90 min contínuos, aviso de madrugada em dias consecutivos. Cada alerta mostra a referência científica.'],
  ['Como funciona o beta?', 'Você pede acesso pelo email gwen.app.contato@gmail.com com o assunto "Acesso beta". O Discord abre junto com a v0.10.'],
  ['Posso usar no trabalho do dia a dia?', 'Sim — a própria criadora usa. Está em v0.9.1, estável para uso real. Lembre que é beta: bugs podem aparecer e atualizações chegam frequentemente.'],
  ['O que é o TrackFox?', 'Sistema separado em desenvolvimento — diário de trabalho inteligente em PT-BR, cálculo em R$, integração com GitHub. Vai se integrar com a G.W.E.N. futuramente como ecossistema.'],
]

export function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <Section id="faq" label="gwen · perguntas" title="Perguntas frequentes">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', maxWidth: 720 }}>
        {FAQS.map(([ q, a ], i) => (
          <div key={i} className="card" style={{ overflow: 'hidden', borderColor: open === i ? 'var(--c-rule-light)' : 'var(--c-rule)' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.125rem 1.375rem', fontFamily: 'var(--f-display)', fontWeight: 600, fontSize: '.9375rem', color: 'var(--c-bone)', textAlign: 'left' }}
            >
              <span className="prompt">{q}</span>
              <span style={{ color: 'var(--c-muted)', fontSize: '1.25rem', transition: 'transform .2s', transform: open === i ? 'rotate(45deg)' : 'none', flexShrink: 0 }}>+</span>
            </button>
            {open === i && (
              <div style={{ padding: '0 1.375rem 1.125rem', fontSize: '.9375rem', color: 'var(--c-muted)', lineHeight: 1.7 }}>{a}</div>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ── ACESSO ── */
export function Access() {
  return (
    <Section id="acesso" label="gwen · acesso" title="Junte-se ao beta">
      <p style={{ color: 'var(--c-muted)', fontSize: '1.0625rem', maxWidth: '44ch', marginTop: '-1.5rem', marginBottom: '2.5rem' }}>
        Beta fechado. Mande um email e a gente entra em contato.
      </p>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))' }}>
        <div className="card" style={{ padding: '2rem', background: 'var(--c-surface-alt)', borderColor: 'var(--c-rule-light)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <EnvelopeSimple size={28} color="var(--c-phosphor)" weight="regular" />
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--c-bone)' }}>Pedir acesso beta</div>
          <div style={{ color: 'var(--c-muted)', fontSize: '.9375rem', lineHeight: 1.65, flex: 1 }}>
            Mande email para <strong style={{ color: 'var(--c-bone)' }}>gwen.app.contato@gmail.com</strong> com o assunto "Acesso beta" e nos conta como você trabalha.
          </div>
          <a href="mailto:gwen.app.contato@gmail.com?subject=Acesso%20beta%20G.W.E.N." className="btn btn-primary">
            Enviar email →
          </a>
          <p className="eyebrow">Windows 10/11 · gratuito durante o beta</p>
        </div>

        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <DiscordLogo size={28} color="var(--c-muted)" weight="regular" />
          <div style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--c-bone)' }}>Comunidade no Discord</div>
          <div style={{ color: 'var(--c-muted)', fontSize: '.9375rem', lineHeight: 1.65, flex: 1 }}>
            Suporte, feedback, sugestões e conversa sobre o app. Por enquanto o contato é direto por email.
          </div>
          <div className="btn btn-ghost" style={{ opacity: .5, cursor: 'default', justifyContent: 'center' }}>Em breve</div>
          <p className="eyebrow">Abre junto com a v0.10</p>
        </div>
      </div>
    </Section>
  )
}

/* ── DOWNLOAD ── */
export function Download({ version }) {
  const ref = useReveal()
  return (
    <section ref={ref} className="reveal" id="download" style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
      <div className="mx-auto px-[var(--gutter)]" style={{ maxWidth: 'var(--max-w)' }}>
        <p className="eyebrow mb-4 prompt">gwen · download</p>
        <div className="card" style={{ padding: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: '.5rem' }}>v{version} · outubro de 2026</p>
            <h3 style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: 'clamp(1.5rem,3vw,2.25rem)', color: 'var(--c-bone)', marginBottom: '.75rem' }}>G.W.E.N. para Windows</h3>
            <p style={{ color: 'var(--c-muted)', fontSize: '.9375rem' }}>Beta fechado. Acesso por convite.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[
              { icon: '🪟', label: 'Windows 10/11', tag: 'beta', available: true },
              { icon: '🍎', label: 'macOS',          tag: 'em breve', available: false },
              { icon: '🐧', label: 'Linux',          tag: 'em breve', available: false },
            ].map(p => p.available ? (
              <a key={p.label} href="mailto:gwen.app.contato@gmail.com?subject=Acesso%20beta%20G.W.E.N."
                className="btn btn-primary"
                style={{ minWidth: 200, justifyContent: 'space-between' }}>
                <span>{p.icon} {p.label}</span>
                <span className="chip" style={{ fontSize: 10, height: 18, color: 'var(--c-void)', background: 'var(--c-void)', borderColor: 'transparent', opacity: .7 }}>{p.tag}</span>
              </a>
            ) : (
              <div key={p.label} className="btn btn-ghost"
                style={{ minWidth: 200, justifyContent: 'space-between', opacity: .45, cursor: 'default' }}>
                <span>{p.icon} {p.label}</span>
                <span className="chip" style={{ fontSize: 10, height: 18 }}>{p.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── FOOTER ── */
export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--c-rule)', padding: '2rem 0' }}>
      <div className="mx-auto px-[var(--gutter)]" style={{ maxWidth: 'var(--max-w)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
        <Wordmark size={18} />
        <p style={{ fontSize: '.8125rem', color: 'var(--c-muted)' }}>
          © 2026 G.W.E.N. All rights reserved. Made with 🤍 for a developer.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {[
            { label: 'GitHub', href: 'https://github.com/SamaraSilvia81/gwen-app', Icon: GithubLogo },
            { label: 'Contato', href: 'mailto:gwen.app.contato@gmail.com', Icon: EnvelopeSimple },
          ].map(({ label, href, Icon }) => (
            <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8125rem', color: 'var(--c-muted)', transition: 'color .2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--c-bone)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--c-muted)'}
            >
              <Icon size={14} /> {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
