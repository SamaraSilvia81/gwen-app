/**
 * Arte de marca expressiva (splash/login), na linha dos pôsteres de referência:
 * o G construído com peças geométricas, hachuras e um círculo sobreposto.
 * Usa só tokens, então acompanha Noir, devs_sam e o tema personalizado.
 * O ícone do app usa a versão simples (Logo.jsx), não esta.
 */
export default function BrandArt({ className = '' }) {
  return (
    <svg viewBox="0 0 400 520" className={className} role="img" aria-label="G.W.E.N.">
      <defs>
        <pattern id="ba-hatch" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="3" fill="var(--c-bone)" />
        </pattern>
        <pattern id="ba-hatch-v" width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="2" height="9" fill="var(--c-phosphor)" />
        </pattern>
        <linearGradient id="ba-charge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--c-phosphor)" />
          <stop offset="1" stopColor="var(--c-ember)" />
        </linearGradient>
        <clipPath id="ba-top">
          <rect x="200" y="60" width="160" height="80" />
        </clipPath>
      </defs>

      {/* círculo de respiro ao fundo */}
      <circle cx="270" cy="330" r="118" fill="var(--c-ember)" opacity="0.9" />

      {/* meio círculo esquerdo do G */}
      <path d="M200 100 A160 160 0 0 0 200 420 L200 340 A80 80 0 0 1 200 180 Z" fill="var(--c-phosphor)" />
      {/* hachura cobrindo a parte de cima do meio círculo */}
      <path d="M200 100 A160 160 0 0 0 58 186 L200 186 Z" fill="url(#ba-hatch)" opacity="0.85" />

      {/* barra de cima com hachura vertical */}
      <rect x="200" y="100" width="160" height="80" fill="var(--c-surface-alt)" />
      <rect x="200" y="100" width="160" height="80" fill="url(#ba-hatch-v)" />

      {/* barra de baixo e haste direita */}
      <rect x="200" y="340" width="160" height="80" fill="var(--c-bone)" />
      <rect x="280" y="250" width="80" height="170" fill="var(--c-bone)" />

      {/* barra de energia */}
      <rect x="170" y="250" width="190" height="56" fill="var(--c-surface-alt)" />
      <rect x="170" y="250" width="132" height="56" fill="url(#ba-charge)" />
      <g fill="var(--c-void)" opacity="0.35">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={178 + i * 16} y="258" width="6" height="40" />
        ))}
      </g>

      <text x="200" y="490" textAnchor="middle" fontFamily="var(--f-mono)" fontSize="11" letterSpacing="1.8" fill="var(--c-muted)">
        GESTÃO · WELLNESS · EFICIÊNCIA · NAVEGAÇÃO
      </text>
    </svg>
  );
}
