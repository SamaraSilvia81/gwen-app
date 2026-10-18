import { level } from '../lib/habits';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS = ['seg', '', 'qua', '', 'sex', '', ''];

/**
 * Mapa de calor estilo GitHub (0.7): colunas são semanas, linhas são dias (seg a dom).
 * A cor vem do acento do tema (--c-phosphor) em quatro intensidades, então
 * no Noir fica em cinzas e no tema personalizado ganha a cor da pessoa.
 */
export default function Heatmap({ cols, map, levels, unit = (v) => String(v), gap = 3, showMonths = true, showDays = true, label }) {
  const monthOf = (i) => cols[i]?.[0].date.getMonth();
  const monthLabels = cols.map((col, i) => {
    const m = monthOf(i);
    if (i > 0 && monthOf(i - 1) === m) return '';
    // a primeira coluna só ganha rótulo se o mês dela durar pelo menos 3 semanas na grade
    if (i === 0 && (monthOf(1) !== m || monthOf(2) !== m)) return '';
    return MONTHS[m];
  });

  return (
    <div className="heatmap" style={{ '--gap': `${gap}px`, '--weeks': cols.length }} role="img" aria-label={label}>
      {showDays && (
        <div className="heatmap-days" aria-hidden="true">
          {showMonths && <span className="heatmap-month" />}
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="heatmap-daylabel">{d}</span>
          ))}
        </div>
      )}
      <div className="heatmap-grid">
        {cols.map((col, i) => (
          <div key={col[0].key} className="heatmap-col">
            {showMonths && <span className="heatmap-month">{monthLabels[i]}</span>}
            {col.map((d) => {
              const v = map.get(d.key) || 0;
              const l = d.future ? -1 : level(v, levels);
              const when = d.date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
              return (
                <span
                  key={d.key}
                  className="heatmap-cell"
                  data-level={l}
                  title={d.future ? '' : `${when}: ${v ? unit(v) : 'nada'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeatLegend() {
  return (
    <span className="inline-flex items-center gap-1 mono text-[10px] text-muted">
      menos
      {[0, 1, 2, 3, 4].map((l) => (
        <span key={l} className="heatmap-cell" data-level={l} style={{ '--cell': '9px' }} />
      ))}
      mais
    </span>
  );
}
