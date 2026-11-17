import { Sun, Moon, GithubLogo } from '@phosphor-icons/react'
import { Wordmark } from './Brand'

const LINKS = [
  ['#o-que-e', 'O que é'],
  ['#telas', 'Telas'],
  ['#historia', 'História'],
  ['#precos', 'Preços'],
  ['#faq', 'FAQ'],
]

export default function Nav({ mode, onToggle }) {
  return (
    <nav className="sticky top-0 z-50 border-b glass" style={{ borderColor: 'var(--c-rule)' }}>
      <div className="flex items-center gap-6 h-[52px] mx-auto px-[var(--gutter)]" style={{ maxWidth: 'var(--max-w)' }}>
        <a href="#topo"><Wordmark size={20} /></a>

        <ul className="hidden md:flex gap-6 list-none p-0 mr-auto">
          {LINKS.map(([href, label]) => (
            <li key={href}>
              <a href={href} className="prompt text-xs" style={{ fontFamily: 'var(--f-mono)', color: 'var(--c-muted)', transition: 'color .2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--c-bone)'}
                onMouseLeave={e => e.target.style.color = 'var(--c-muted)'}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 ml-auto md:ml-0">
          {/* toggle dark/light — mesmo comportamento do app */}
          <button
            onClick={onToggle}
            aria-label={mode === 'escuro' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            style={{ color: 'var(--c-muted)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', transition: 'background .2s, color .2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-phosphor-8)'; e.currentTarget.style.color = 'var(--c-bone)' }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--c-muted)' }}
          >
            {mode === 'escuro' ? <Sun size={16} weight="regular" /> : <Moon size={16} weight="regular" />}
          </button>

          <a href="https://github.com/SamaraSilvia81/gwen-app" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--c-muted)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', transition: 'background .2s, color .2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-phosphor-8)'; e.currentTarget.style.color = 'var(--c-bone)' }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--c-muted)' }}
          >
            <GithubLogo size={16} weight="regular" />
          </a>

          <a href="#acesso" className="btn btn-primary" style={{ height: 30, padding: '0 14px', fontSize: 12.5 }}>
            Pedir acesso
          </a>
        </div>
      </div>
    </nav>
  )
}
