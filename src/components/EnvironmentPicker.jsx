import { Check, Code, GraduationCap, PenNib, SquaresFour } from '@phosphor-icons/react';
import { ENVIRONMENTS, ENVIRONMENT_ORDER } from '../lib/environments';

const ICONS = { geral: SquaresFour, ti: Code, design: PenNib, academico: GraduationCap };

/**
 * Cartões dos ambientes de uso (ADR-015), de marcar e desmarcar. Usado no
 * onboarding (`large`) e em Ajustes, Ambientes. Quem usa decide o que fazer ao
 * marcar: aqui só se mostra o estado e se avisa o clique.
 */
export default function EnvironmentPicker({ selected, onToggle, disabled = false, large = false }) {
  return (
    <div role="group" aria-label="Ambientes de uso" className="grid grid-cols-2 max-[720px]:grid-cols-1 gap-3">
      {ENVIRONMENT_ORDER.map((id) => {
        const e = ENVIRONMENTS[id];
        const on = selected.includes(id);
        const Icon = ICONS[id];
        return (
          <button
            key={id}
            type="button"
            className={`card text-left flex items-start gap-3 ${large ? 'p-5 min-h-[170px]' : 'p-3'}`}
            style={on ? { borderColor: 'var(--c-phosphor)' } : undefined}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onToggle(id)}
          >
            {large && <Icon size={32} weight={on ? 'fill' : 'regular'} className={`shrink-0 mt-0.5 ${on ? 'text-phosphor' : 'text-muted'}`} />}
            <span className="flex flex-col gap-1.5 flex-1 min-w-0">
              <span className={`flex items-center gap-2 font-medium ${large ? 'text-[21px]' : ''}`}>
                {e.label}
                {on && <Check size={large ? 17 : 13} weight="bold" className="text-phosphor" />}
              </span>
              <span className={`${large ? 'text-[16px]' : 'text-[12px]'} text-muted`}>{e.hint}</span>
              <span className={`${large ? 'text-[15px] leading-snug' : 'text-[11px]'} text-muted`}>{e.adds}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
