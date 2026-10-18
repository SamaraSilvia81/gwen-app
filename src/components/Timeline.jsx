import { useMemo } from 'react';
import { formatDuration, formatHour, sessionSeconds } from '../lib/time';

/**
 * Linha do tempo de um dia (0.8): uma faixa por projeto (e frente), com as
 * sessões nos horários em que aconteceram. Mostra quando cada uma começou,
 * quando a outra entrou em paralelo e quanto tempo ficaram juntas.
 */
export default function Timeline({ sessions, projects, day, now = new Date(), activeBreak = null, compact = false }) {
  const dayStart = useMemo(() => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [day]);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const isToday = now >= dayStart && now < dayEnd;

  const rows = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      const start = new Date(s.started_at);
      const end = s.ended_at ? new Date(s.ended_at) : now;
      if (end <= dayStart || start >= dayEnd) continue;
      const key = `${s.project_id}::${s.front || ''}`;
      if (!map.has(key)) {
        const p = projects.find((x) => x.id === s.project_id);
        map.set(key, { key, label: p?.name || 'Projeto excluído', front: s.front || null, first: start, items: [] });
      }
      const row = map.get(key);
      row.items.push({ s, start: start < dayStart ? dayStart : start, end: end > dayEnd ? dayEnd : end, open: !s.ended_at });
      if (start < row.first) row.first = start;
    }
    return [...map.values()].sort((a, b) => a.first - b.first);
  }, [sessions, projects, dayStart, dayEnd, now]);

  if (!rows.length) {
    return <p className="text-[13px] text-muted py-3">Nenhuma sessão {isToday ? 'hoje ainda' : 'neste dia'}.</p>;
  }

  // janela de horas: da primeira sessão (arredondada para baixo) até a última ou agora
  const firstMs = Math.min(...rows.flatMap((r) => r.items.map((i) => i.start.getTime())));
  const lastMs = Math.max(...rows.flatMap((r) => r.items.map((i) => i.end.getTime())), isToday ? now.getTime() : 0);
  const from = new Date(firstMs);
  from.setMinutes(0, 0, 0);
  const to = new Date(Math.min(lastMs, dayEnd.getTime()));
  if (to.getMinutes() || to.getSeconds()) to.setHours(to.getHours() + 1, 0, 0, 0);
  const spanMs = Math.max(3_600_000, to - from);
  const pct = (t) => ((t - from) / spanMs) * 100;
  const hours = [];
  for (let h = new Date(from); h <= to; h = new Date(h.getTime() + 3_600_000)) hours.push(h);
  const step = hours.length > 14 ? 3 : hours.length > 8 ? 2 : 1;

  // trechos com duas ou mais sessões ao mesmo tempo
  const all = rows.flatMap((r) => r.items).map((i) => [i.start.getTime(), i.end.getTime()]);
  const overlaps = [];
  all.forEach(([a1, b1], i) =>
    all.slice(i + 1).forEach(([a2, b2]) => {
      const lo = Math.max(a1, a2);
      const hi = Math.min(b1, b2);
      if (hi - lo > 60_000) overlaps.push([lo, hi]);
    }),
  );

  return (
    <div className={`timeline ${compact ? 'is-compact' : ''}`}>
      <div className="timeline-axis">
        <span />
        <div className="timeline-track">
          {hours.map((h, i) =>
            i % step === 0 ? (
              <span key={h.getTime()} className="timeline-hour" style={{ left: `${pct(h)}%` }}>
                {String(h.getHours()).padStart(2, '0')}h
              </span>
            ) : null,
          )}
        </div>
      </div>
      {rows.map((r) => {
        const total = r.items.reduce((sum, i) => sum + sessionSeconds(i.s, now, activeBreak), 0);
        return (
          <div key={r.key} className="timeline-row">
            <span className="timeline-label" title={r.label}>
              <span className="truncate">{r.label}</span>
              {r.front && <span className="text-muted truncate"> · {r.front}</span>}
              <span className="timeline-total">{formatDuration(total, { short: true })}</span>
            </span>
            <div className="timeline-track">
              {hours.map((h) => (
                <span key={h.getTime()} className="timeline-grid" style={{ left: `${pct(h)}%` }} />
              ))}
              {overlaps.map(([a, b], i) => (
                <span key={i} className="timeline-overlap" style={{ left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%` }} />
              ))}
              {r.items.map(({ s, start, end, open }) => (
                <span
                  key={s.id}
                  className={`timeline-bar ${open ? 'is-open' : ''}`}
                  style={{ left: `${pct(start)}%`, width: `${Math.max(0.6, pct(end) - pct(start))}%` }}
                  title={`${r.label}${r.front ? ` · ${r.front}` : ''}\n${formatHour(start)} até ${open ? 'agora' : formatHour(end)} · ${formatDuration(sessionSeconds(s, now, activeBreak))}`}
                />
              ))}
              {isToday && <span className="timeline-now" style={{ left: `${pct(now)}%` }} />}
            </div>
          </div>
        );
      })}
      {overlaps.length > 0 && (
        <p className="timeline-legend">
          <span className="timeline-legend-swatch" /> trechos com sessões em paralelo
        </p>
      )}
    </div>
  );
}
