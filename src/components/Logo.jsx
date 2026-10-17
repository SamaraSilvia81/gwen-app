/**
 * Marca da G.W.E.N.: um G geométrico cuja barra central é a barra de energia.
 * `charge` (0 a 1) controla quanto da barra está carregada, então o mesmo
 * componente serve de logo estático e de indicador no modo pausa.
 * As cores vêm dos tokens do tema ativo.
 */
export default function Logo({ size = 28, charge = 0.65, className = '', title = 'G.W.E.N.' }) {
  const c = Math.max(0, Math.min(1, charge));
  return (
    <svg
      width={size}
      height={size}
      viewBox="14 14 36 36"
      role="img"
      aria-label={title}
      className={className}
    >
      <g fill="var(--c-phosphor)">
        <path d="M32 19 A13 13 0 0 0 32 45" fill="none" stroke="var(--c-phosphor)" strokeWidth="10" />
        <rect x="32" y="14" width="18" height="10" />
        <rect x="32" y="40" width="18" height="10" />
        <rect x="40" y="30" width="10" height="20" />
        <rect x="30" y="30" width="20" height="8" />
      </g>
      <rect
        x="30"
        y="30"
        width={20 * c}
        height="8"
        fill="var(--c-ember)"
        style={{ transition: 'width 0.8s var(--ease-out)' }}
      />
    </svg>
  );
}

/** Logo + nome, usado na sidebar e no login */
export function Wordmark({ size = 24 }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo size={size} />
      <span className="font-display font-bold tracking-[0.18em] text-bone" style={{ fontSize: size * 0.62 }}>
        G.W.E.N.
      </span>
    </span>
  );
}
