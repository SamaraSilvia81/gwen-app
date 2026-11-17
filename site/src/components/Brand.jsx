/* Logo simples — igual ao Logo.jsx do app */
export function Logo({ size = 28, charge = 0.65, animated = false }) {
  const c = Math.max(0, Math.min(1, charge))
  return (
    <svg width={size} height={size} viewBox="14 14 36 36" aria-label="G.W.E.N.">
      <g fill="var(--c-logo)">
        <path d="M32 19 A13 13 0 0 0 32 45" fill="none" stroke="var(--c-logo)" strokeWidth="10" />
        <rect x="32" y="14" width="18" height="10" />
        <rect x="32" y="40" width="18" height="10" />
        <rect x="40" y="30" width="10" height="20" />
        <rect x="30" y="30" width="20" height="8" />
      </g>
      <rect
        x="30" y="30" width="20" height="8"
        fill="var(--c-logo-charge)"
        className={animated ? 'logo-charge-anim' : ''}
        style={!animated ? { transform: `scaleX(${c})`, transformOrigin: 'left center' } : {}}
      />
    </svg>
  )
}

export function Wordmark({ size = 22 }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo size={size} />
      <span style={{ fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: size * .62, letterSpacing: '.18em', color: 'var(--c-bone)' }}>
        G.W.E.N.
      </span>
    </span>
  )
}

/* BrandArt expressivo — igual ao BrandArt.jsx do app, com ID únicos para a LP */
export function BrandArt({ className = '' }) {
  return (
    <svg viewBox="0 0 400 520" className={className} role="img" aria-label="G.W.E.N.">
      <defs>
        <pattern id="lp-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="3" fill="var(--c-bone)" />
        </pattern>
        <pattern id="lp-hatch-v" width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="2" height="9" fill="var(--c-phosphor)" />
        </pattern>
        <linearGradient id="lp-charge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--c-phosphor)" />
          <stop offset="1" stopColor="var(--c-ember)" />
        </linearGradient>
      </defs>

      {/* círculo de respiro */}
      <circle cx="270" cy="330" r="118" fill="var(--c-ember)" opacity="0.9" />

      {/* meio círculo esquerdo do G */}
      <path d="M200 100 A160 160 0 0 0 200 420 L200 340 A80 80 0 0 1 200 180 Z" fill="var(--c-phosphor)" />
      <path d="M200 100 A160 160 0 0 0 58 186 L200 186 Z" fill="url(#lp-hatch)" opacity="0.85" />

      {/* barra de cima */}
      <rect x="200" y="100" width="160" height="80" fill="var(--c-surface-alt)" />
      <rect x="200" y="100" width="160" height="80" fill="url(#lp-hatch-v)" />

      {/* barra de baixo e haste direita */}
      <rect x="200" y="340" width="160" height="80" fill="var(--c-bone)" />
      <rect x="280" y="250" width="80" height="170" fill="var(--c-bone)" />

      {/* barra de energia */}
      <rect x="170" y="250" width="190" height="56" fill="var(--c-surface-alt)" />
      <rect x="170" y="250" width="132" height="56" fill="url(#lp-charge)" />
      <g fill="var(--c-void)" opacity="0.35">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={178 + i * 16} y="258" width="6" height="40" />
        ))}
      </g>

      <text x="200" y="490" textAnchor="middle" fontFamily="var(--f-mono)" fontSize="11" letterSpacing="1.8" fill="var(--c-muted)">
        GESTÃO · WELLNESS · EFICIÊNCIA · NAVEGAÇÃO
      </text>
    </svg>
  )
}
