import { useEffect, useMemo, useState } from 'react';
import { Books, Fire, PencilSimple } from '@phosphor-icons/react';
import wallpaper from '../assets/wallpaper.webp';
import { useProfile } from '../context/ProfileContext';
import { useWorkspace, useNow } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { breakRepo, sessionRepo, wellnessRepo } from '../data/repository';
import { formatDuration, startOfToday } from '../lib/time';
import { HABITS, WORK_LEVELS, habitMaps, streaks, weekGrid } from '../lib/habits';
import { SOURCES } from '../lib/healthInsights';
import { isAccountMode } from '../lib/cloudConfig';
import Avatar from '../components/Avatar';
import Heatmap, { HeatLegend } from '../components/Heatmap';
import { Label } from '../components/Modal';

const YEAR_WEEKS = 53;
const HABIT_WEEKS = 26;

/**
 * Perfil (0.7): capa, números do ano, mapa de atividade e os hábitos em grade,
 * no estilo dos apps de hábito. Tudo calculado do que já está no banco.
 */
export default function Profile({ onNavigate }) {
  const { profile } = useProfile();
  const { projects, activeSession, activeBreak } = useWorkspace();
  const toast = useToast();
  const now = useNow(60_000);
  const [data, setData] = useState(null);
  const [range, setRange] = useState('ano'); // ano | semestre

  useEffect(() => {
    let alive = true;
    const from = startOfToday();
    from.setDate(from.getDate() - YEAR_WEEKS * 7 - 7);
    Promise.all([sessionRepo.from(from), breakRepo.since(from), wellnessRepo.since(from)])
      .then(([sessions, breaks, events]) => alive && setData({ sessions, breaks, events }))
      .catch((err) => {
        toast(`Não consegui carregar seu histórico: ${err.message}`, 'error');
        if (alive) setData({ sessions: [], breaks: [], events: [] });
      });
    return () => {
      alive = false;
    };
  }, [activeSession?.id, toast]);

  const maps = useMemo(() => (data ? habitMaps({ ...data, now, activeBreak }) : null), [data, now, activeBreak]);
  const yearCols = useMemo(() => weekGrid(range === 'ano' ? YEAR_WEEKS : HABIT_WEEKS, now), [now, range]);
  const habitCols = useMemo(() => weekGrid(HABIT_WEEKS, now), [now]);

  const year = now.getFullYear();
  const totals = useMemo(() => {
    if (!data || !maps) return null;
    const inYear = data.sessions.filter((s) => new Date(s.started_at).getFullYear() === year);
    const minutes = [...maps.trabalho.entries()].filter(([k]) => k.startsWith(String(year))).reduce((a, [, v]) => a + v, 0);
    const work = streaks(maps.trabalho, now);
    return {
      hours: minutes * 60,
      sessions: inYear.length,
      days: [...maps.trabalho.keys()].filter((k) => k.startsWith(String(year))).length,
      current: work.current,
      best: work.best,
      done: projects.filter((p) => p.completed_at && new Date(p.completed_at).getFullYear() === year).length,
    };
  }, [data, maps, year, now, projects]);

  const since = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="h-full overflow-y-auto">
      <section className="profile-cover" style={{ '--wallpaper': `url(${wallpaper})` }} />

      <div className="page !pt-0">
        <header className="profile-head anim-rise">
          <div className="profile-avatar">
            <Avatar profile={profile} size={96} />
          </div>
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="page-title truncate">{profile?.display_name || 'Você'}</h1>
            <p className="text-[12.5px] text-muted mt-1">
              {since && `na G.W.E.N. desde ${since} · `}
              {isAccountMode() ? 'dados na nuvem' : 'dados neste computador'}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={() => onNavigate('config')}>
            <PencilSimple size={14} />
            <Label>Editar perfil</Label>
          </button>
        </header>

        {/* NÚMEROS DO ANO */}
        <section className="profile-stats anim-rise">
          <Stat label={`horas em ${year}`} value={totals ? formatDuration(totals.hours, { short: true }) : '-'} />
          <Stat label="sessões" value={totals?.sessions ?? '-'} />
          <Stat label="dias ativos" value={totals?.days ?? '-'} />
          <Stat label="sequência atual" value={totals ? `${totals.current} ${totals.current === 1 ? 'dia' : 'dias'}` : '-'} />
          <Stat label="maior sequência" value={totals ? `${totals.best} ${totals.best === 1 ? 'dia' : 'dias'}` : '-'} />
          <Stat label={`concluídos em ${year}`} value={totals?.done ?? '-'} />
        </section>

        {/* ATIVIDADE */}
        <section className="card p-4 mb-4 anim-rise">
          <header className="card-head flex-wrap gap-2">
            <h2 className="card-title">Atividade</h2>
            <div className="flex items-center gap-3">
              <HeatLegend />
              <div className="segmented">
                <button className={range === 'ano' ? 'active' : ''} onClick={() => setRange('ano')}>12 meses</button>
                <button className={range === 'semestre' ? 'active' : ''} onClick={() => setRange('semestre')}>6 meses</button>
              </div>
            </div>
          </header>
          <div className="pb-1">
            {maps ? (
              <Heatmap cols={yearCols} map={maps.trabalho} levels={WORK_LEVELS} unit={HABITS.trabalho.unit} label="Minutos trabalhados por dia" />
            ) : (
              <p className="mono text-[12px] text-muted">carregando<span className="blink">_</span></p>
            )}
          </div>
        </section>

        {/* HÁBITOS */}
        <div className="flex items-end justify-between gap-3 mb-3 mt-8">
          <div>
            <p className="eyebrow mb-1">últimos 6 meses</p>
            <h2 className="font-display text-xl font-semibold">Hábitos</h2>
          </div>
        </div>
        <section className="habit-grid">
          {Object.entries(HABITS).map(([id, h]) => {
            const map = maps?.[id];
            const s = map ? streaks(map, now) : { current: 0, days: 0 };
            const Icon = h.icon;
            return (
              <article key={id} className="card habit-card anim-rise">
                <header className="flex items-center gap-2.5 mb-3">
                  <span className="habit-icon">
                    <Icon size={15} weight="bold" />
                  </span>
                  <span className="font-display font-semibold flex-1 truncate">{h.label}</span>
                  <span className="mono text-[11px] text-muted inline-flex items-center gap-1" title="Sequência atual de dias">
                    <Fire size={12} weight="fill" className={s.current ? 'text-phosphor' : ''} />
                    {s.current}
                  </span>
                  <span className="mono text-[11px] text-muted" title={`Dias com ${h.hint} nos últimos 12 meses`}>
                    {s.days}d
                  </span>
                </header>
                <div>
                  {map ? (
                    <Heatmap cols={habitCols} map={map} levels={h.levels} unit={h.unit} gap={2} showDays={false} label={h.label} />
                  ) : (
                    <div className="h-[90px]" />
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {/* BASE */}
        <section className="card p-4 mt-8 mb-2 anim-rise">
          <header className="card-head">
            <h2 className="card-title flex items-center gap-2">
              <Books size={16} className="text-phosphor" />
              De onde vêm os lembretes e alertas
            </h2>
          </header>
          <ul className="sources">
            {Object.values(SOURCES).map((s) => (
              <li key={s.short}>
                <span className="mono text-[11px] text-phosphor">{s.short}</span>
                <span className="text-[12.5px] text-muted leading-relaxed">{s.full}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11.5px] text-muted mt-3 leading-relaxed">
            A G.W.E.N. não diagnostica nada. Ela aplica essas referências ao tempo que você registra aqui. Se algo pesa de verdade,
            converse com um profissional de saúde.
          </p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="stat">
      <p className={`font-display text-[22px] font-semibold tabular leading-none ${accent ? 'text-phosphor' : ''}`}>{value}</p>
      <p className="eyebrow mt-2">{label}</p>
    </div>
  );
}
