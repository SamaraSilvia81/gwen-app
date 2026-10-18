import { useEffect, useMemo, useState } from 'react';
import {
  ArrowBendDownRight, ArrowRight, Heartbeat, Lightning, Pause, Play, SealCheck, Stop, WarningCircle,
} from '@phosphor-icons/react';
import wallpaper from '../assets/wallpaper.webp';
import { useWorkspace, useNow } from '../context/WorkspaceContext';
import { useProfile } from '../context/ProfileContext';
import { useWellness } from '../context/WellnessContext';
import { useToast } from '../context/ToastContext';
import { breakRepo, sessionRepo } from '../data/repository';
import { formatClock, formatDuration, formatHour, sessionSeconds, startOfToday, startOfWeek } from '../lib/time';
import { REMINDERS } from '../lib/wellness';
import { BREAK_KINDS } from '../lib/breaks';
import { dayKey, minutesByDay, streaks } from '../lib/habits';
import { healthInsights } from '../lib/healthInsights';
import { projectFronts } from '../lib/projectModel';
import { timeAgo } from '../lib/useGitStatus';
import { openQuickLaunch } from '../components/QuickLaunch';
import { greeting } from '../components/Topbar';
import { Label } from '../components/Modal';

const WEEK = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

/**
 * Início (0.7): a capa da G.W.E.N. Wallpaper, o que está rodando agora,
 * onde você parou, a semana e a saúde do dia, tudo numa tela.
 */
export default function Home({ stats, onNavigate, onOpenProject }) {
  const { projects, sessions, activeSession, activeBreak, notes, launchProject, requestEnd, startBreak } = useWorkspace();
  const { profile } = useProfile();
  const toast = useToast();
  const now = useNow(1000);
  const [recent, setRecent] = useState([]); // sessões dos últimos 7 dias
  const [lastBreakEnd, setLastBreakEnd] = useState(null);

  useEffect(() => {
    const from = startOfToday();
    from.setDate(from.getDate() - 6);
    sessionRepo.from(from).then(setRecent).catch(() => {});
    breakRepo
      .since(startOfToday())
      .then((list) => setLastBreakEnd(list.find((b) => b.ended_at)?.ended_at || null))
      .catch(() => {});
  }, [activeSession?.id, activeBreak?.id, sessions.length]);

  const project = activeSession && projects.find((p) => p.id === activeSession.project_id);
  const elapsed = activeSession ? sessionSeconds(activeSession, now, activeBreak) : 0;

  const leftOff = useMemo(
    () =>
      [...(notes?.entries() || [])]
        .map(([id, n]) => ({ ...n, project: projects.find((p) => p.id === id) }))
        .filter((n) => n.project && n.project.status !== 'concluido' && n.project.id !== activeSession?.project_id)
        .sort((a, b) => String(b.at).localeCompare(String(a.at)))
        .slice(0, 4),
    [notes, projects, activeSession?.project_id],
  );

  const recentProjects = useMemo(
    () =>
      projects
        .filter((p) => p.last_opened_at && p.status !== 'concluido')
        .sort((a, b) => String(b.last_opened_at).localeCompare(String(a.last_opened_at)))
        .slice(0, 5),
    [projects],
  );

  // barras da semana (seg a dom)
  const week = useMemo(() => {
    const byDay = minutesByDay(sessions, now, activeBreak);
    const monday = startOfWeek(now);
    return WEEK.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { label, key: dayKey(d), minutes: byDay.get(dayKey(d)) || 0, today: dayKey(d) === dayKey(now), future: d > now };
    });
  }, [sessions, now, activeBreak]);
  const maxDay = Math.max(60, ...week.map((d) => d.minutes));
  const streak = useMemo(() => streaks(minutesByDay(recent, now, activeBreak), now).current, [recent, now, activeBreak]);

  const insights = healthInsights({ weekTotal: stats.weekTotal, activeSession, activeBreak, lastBreakEnd, recentSessions: recent, now });

  async function launch(p, front = null) {
    try {
      const fronts = projectFronts(p);
      await launchProject(p, front ?? (fronts.length === 1 ? fronts[0] : null));
    } catch (err) {
      toast(err?.message || String(err), 'error');
    }
  }

  const dateLine = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const first = (profile?.display_name || '').split(' ')[0] || 'dev';

  return (
    <div className="h-full overflow-y-auto">
      {/* CAPA */}
      <section className="home-hero" style={{ '--wallpaper': `url(${wallpaper})` }}>
        <div className="home-hero-inner page !py-0">
          <div className="min-w-0 anim-rise">
            <p className="eyebrow mb-2">{dateLine}</p>
            <h1 className="home-title">
              {greeting(now)}, {first}.
            </h1>
            <p className="text-[13.5px] text-muted mt-2 tabular">
              {stats.todayTotal > 0 ? `${formatDuration(stats.todayTotal)} hoje` : 'Nada registrado hoje ainda'}
              {` · ${formatDuration(stats.weekTotal, { short: true })} na semana`}
              {streak > 1 && ` · ${streak} dias seguidos`}
            </p>
          </div>

          {/* AGORA */}
          <div className="home-now glass anim-rise">
            {activeSession ? (
              <>
                <p className="eyebrow flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${activeBreak ? 'bg-muted' : 'bg-phosphor anim-breathe'}`} />
                  {activeBreak ? `em pausa · ${BREAK_KINDS[activeBreak.kind]?.label?.toLowerCase() || 'pausa'}` : 'agora'}
                </p>
                <p className="font-display font-semibold text-[17px] truncate mt-1.5" title={project?.name}>
                  {project?.name || 'Projeto'}
                  {activeSession.front && <span className="text-muted font-normal"> · {activeSession.front}</span>}
                </p>
                <p className="home-clock tabular">{formatClock(elapsed)}</p>
                <p className="mono text-[11px] text-muted">desde {formatHour(activeSession.started_at)}</p>
                <div className="flex gap-1.5 mt-3">
                  {!activeBreak && (
                    <button className="btn btn-ghost btn-sm flex-1" onClick={() => startBreak('cafe').catch((e) => toast(e.message, 'error'))}>
                      <Pause size={12} weight="bold" />
                      <Label>Pausa</Label>
                    </button>
                  )}
                  <button className="btn btn-primary btn-sm flex-1" onClick={requestEnd}>
                    <Stop size={12} weight="fill" />
                    <Label>Encerrar</Label>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="eyebrow">agora</p>
                <p className="font-display font-semibold text-[17px] mt-1.5">Nenhuma sessão ativa.</p>
                <p className="text-[12.5px] text-muted mt-1 leading-relaxed">Escolha um projeto e a G.W.E.N. abre tudo e começa a contar.</p>
                <button className="btn btn-primary w-full mt-3" onClick={openQuickLaunch}>
                  <Lightning size={14} weight="fill" />
                  <Label>Começar agora</Label>
                  <span className="kbd ml-auto">Ctrl K</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="page home-grid">
        {/* ONDE PAREI */}
        <section className="card p-4 home-span-2 anim-rise">
          <header className="card-head">
            <h2 className="card-title">Onde parei</h2>
            <button className="btn btn-quiet btn-sm" onClick={() => onNavigate('projetos')}>
              <Label>Projetos</Label>
              <ArrowRight size={12} />
            </button>
          </header>
          {leftOff.length ? (
            <ul className="flex flex-col">
              {leftOff.map((n) => (
                <li key={n.project.id} className="leftoff-row">
                  <button className="min-w-0 flex-1 text-left" onClick={() => onOpenProject(n.project)}>
                    <p className="text-[13.5px] font-medium truncate">
                      {n.project.name}
                      {n.front && <span className="text-muted font-normal"> · {n.front}</span>}
                    </p>
                    <p className="text-[12.5px] text-muted flex items-start gap-1.5 mt-0.5">
                      <ArrowBendDownRight size={12} className="text-phosphor shrink-0 mt-[3px]" />
                      <span className="line-clamp-2">{n.note}</span>
                    </p>
                  </button>
                  <span className="mono text-[10.5px] text-muted whitespace-nowrap max-[560px]:hidden">{timeAgo(n.at)}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => launch(n.project, n.front)} title="Continuar de onde parou">
                    <Play size={11} weight="fill" />
                    <Label>Continuar</Label>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted py-3">
              Ao encerrar uma sessão, a G.W.E.N. pergunta o próximo passo. As notas aparecem aqui para você retomar sem pensar.
            </p>
          )}
        </section>

        {/* SAÚDE */}
        <HealthCard insights={insights} />

        {/* SEMANA */}
        <section className="card p-4 home-span-2 anim-rise">
          <header className="card-head">
            <h2 className="card-title">Esta semana</h2>
            <span className="mono text-[11px] text-muted tabular">{formatDuration(stats.weekTotal, { short: true })} no total</span>
          </header>
          <div className="week-bars">
            {week.map((d) => (
              <div key={d.key} className={`week-bar ${d.today ? 'is-today' : ''} ${d.future ? 'is-future' : ''}`}>
                <span className="week-bar-value tabular">{d.minutes >= 1 ? formatDuration(d.minutes * 60, { short: true }) : ''}</span>
                <span className="week-bar-track">
                  <span className="week-bar-fill" style={{ height: `${Math.max(d.minutes ? 4 : 0, (d.minutes / maxDay) * 100)}%` }} />
                </span>
                <span className="week-bar-label">{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* RECENTES */}
        <section className="card p-4 anim-rise">
          <header className="card-head">
            <h2 className="card-title">Recentes</h2>
          </header>
          {recentProjects.length ? (
            <ul className="flex flex-col gap-0.5">
              {recentProjects.map((p) => (
                <li key={p.id} className="flex items-center gap-2 min-w-0">
                  <button className="recent-row" onClick={() => onOpenProject(p)}>
                    <span className={`status-dot status-${p.status}`} />
                    <span className="truncate flex-1 text-left">{p.name}</span>
                    <span className="mono text-[10.5px] text-muted">{timeAgo(p.last_opened_at)}</span>
                  </button>
                  <button
                    className="panel-play"
                    onClick={() => launch(p)}
                    disabled={activeSession?.project_id === p.id}
                    title={`Começar agora: ${p.name}`}
                    aria-label={`Começar ${p.name}`}
                  >
                    <Lightning size={11} weight="fill" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">Os projetos que você abrir aparecem aqui.</p>
          )}
        </section>
      </div>
    </div>
  );
}

/** Saúde do dia: lembretes feitos, próximo lembrete e alertas com base em pesquisa */
function HealthCard({ insights }) {
  const { config, counting, counters, todayCount } = useWellness();
  const active = Object.entries(config.reminders).filter(([, r]) => r.on);
  const next = active
    .map(([k, r]) => ({ k, left: Math.max(0, r.every * 60 - (counters[k] || 0)) }))
    .sort((a, b) => a.left - b.left)[0];

  return (
    <section className="card p-4 home-span-row anim-rise">
      <header className="card-head">
        <h2 className="card-title flex items-center gap-2">
          <Heartbeat size={16} className="text-phosphor" />
          Saúde
        </h2>
        {config.enabled && (
          <span className="mono text-[10.5px] text-muted">
            {!counting ? 'parado' : next ? (next.left < 60 ? `${REMINDERS[next.k].label.toLowerCase()} agora` : `${REMINDERS[next.k].label.toLowerCase()} em ${formatDuration(next.left, { short: true })}`) : ''}
          </span>
        )}
      </header>

      {config.enabled ? (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {active.map(([k]) => {
            const r = REMINDERS[k];
            const Icon = r.icon;
            return (
              <div key={k} className="health-stat">
                <Icon size={16} className="text-phosphor" />
                <span className="font-display text-xl font-semibold tabular">{todayCount[k] || 0}</span>
                <span className="text-[10.5px] text-muted leading-tight">{r.counted(todayCount[k] || 0)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[12.5px] text-muted mb-4 leading-relaxed">
          O modo saúde está desligado. Ligue em Ajustes para lembretes de água, alongamento e descanso dos olhos.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {insights.length ? (
          insights.map((i) => (
            <article key={i.id} className={`insight insight-${i.level}`}>
              <p className="flex items-center gap-1.5 text-[13px] font-medium">
                <WarningCircle size={14} weight="bold" className="shrink-0" />
                {i.title}
              </p>
              <p className="text-[12px] text-muted leading-relaxed mt-1">{i.body}</p>
              <p className="mono text-[10px] text-muted mt-1.5" title={i.source.full}>
                fonte: {i.source.short}
              </p>
            </article>
          ))
        ) : (
          <article className="insight insight-ok">
            <p className="flex items-center gap-1.5 text-[13px] font-medium">
              <SealCheck size={14} weight="bold" />
              Ritmo saudável até aqui
            </p>
            <p className="text-[12px] text-muted leading-relaxed mt-1">
              Nenhum alerta de jornada longa, noite adentro ou tempo demais sem pausa.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
