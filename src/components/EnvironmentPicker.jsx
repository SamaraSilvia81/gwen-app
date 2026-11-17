import { Check } from '@phosphor-icons/react';
import { ENVIRONMENTS, ENVIRONMENT_ORDER } from '../lib/environments';

/**
 * Cartões dos ambientes de uso (ADR-015), de marcar e desmarcar. Usado no
 * onboarding e em Ajustes, Ambientes. Quem usa decide o que fazer ao marcar:
 * aqui só se mostra o estado e se avisa o clique.
 */
export default function EnvironmentPicker({ selected, onToggle, disabled = false, single = false }) {
  return (
    <div
      role="group"
      aria-label="Ambientes de uso"
      className={single ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 max-[720px]:grid-cols-1 gap-2'}
    >
      {ENVIRONMENT_ORDER.map((id) => {
        const e = ENVIRONMENTS[id];
        const on = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            className="card p-3 text-left flex flex-col gap-1"
            style={on ? { borderColor: 'var(--c-phosphor)' } : undefined}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onToggle(id)}
          >
            <span className="flex items-center gap-2 font-medium">
              {e.label}
              {on && <Check size={13} weight="bold" className="text-phosphor" />}
            </span>
            <span className="text-[12px] text-muted">{e.hint}</span>
            <span className="text-[11px] text-muted">{e.adds}</span>
          </button>
        );
      })}
    </div>
  );
}
