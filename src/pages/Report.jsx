import { useEffect, useMemo, useState } from 'react';
import { CaretLeft, CaretRight, ChartBar, DownloadSimple, GameController } from '@phosphor-icons/react';
import { useProfile } from '../context/ProfileContext';
import Timeline from '../components/Timeline';
import { CATEGORIES, appName, usageBetween } from '../lib/activity';
import { resolveLauncher } from '../lib/launcher';
import { dayKey } from '../lib/habits';
import { useWorkspace, useNow } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { sessionRepo } from '../data/repository';
import { formatDuration } from '../lib/time';
import { PERIODS, buildReport, reportCsv } from '../lib/report';
import { saveCsvFile } from '../lib/native';
import { Label } from '../components/Modal';

/**
 * Relatório de tempo: por categoria, projeto e frente, no período escolhido.
 * O CSV tem uma linha por sessão, para abrir no Excel ou no Google Planilhas.
 */
const TABS = [
  ['projetos', 'Projetos'],
  ['linha', 'Linha do tempo'],
  ['apps', 'Apps e jogos'],
];

/** Relatório (0.8): projetos, linha do tempo de um dia e tempo por app */
export default function Report({ onNavigate, initialTab = null }) {
  const [tab, setTab] = useState(initialTab || 'projetos');
  return (
    <div className="h-full overflow-y-auto">
      <div className="page">
        <div className="segmented mb-6">
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'projetos' && <ProjectsReport />}
        {tab === 'linha' && <TimelineReport />}
        {tab === 'apps' && <AppsReport onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

function ProjectsReport() {
  const { projects, categories, activeSession, activeBreak, sessions: weekSessions } = useWorkspace();
  const toast = useToast();
  const now = useNow(60_000);
  const [period, setPeriod] = useState('semana');
  const [sessions, setSessions] = useState(null);

  const [from, to] = useMemo(() => PERIODS[period].range(new Date()), [period]); // eslint-disable-line react-hooks/exhaustive-deps

  // recarrega ao trocar de período e quando uma sessão começa ou termina
  useEffect(() => {
    let alive = true;
    setSessions(null);
    sessionRepo
      .between(from, new Date(Math.max(to.getTime(), Date.now())))
      .then((list) => alive && setSessions(list))
      .catch((err) => {
        toast(`Não consegui carregar o relatório: ${err.message}`, 'error');
        if (alive) setSessions([]);
      });
    return () => {
      alive = false;
    };
  }, [from, to, activeSession?.id, weekSessions.length, toast]);

  const end = period === 'mesPassado' ? to : now;
  const report = useMemo(
    () => (sessions ? buildReport({ sessions, projects, categories, from, to: end, now, activeBreak }) : null),
    [sessions, projects, categories, from, end, now, activeBreak],
  );
  const maxProject = report ? Math.max(1, ...report.groups.flatMap((g) => g.projects.map((p) => p.seconds))) : 1;

  async function exportCsv() {
    if (!sessions) return;
    const csv = reportCsv({ sessions, projects, categories, from, to: end, now, activeBreak });
    const stamp = from.toISOString().slice(0, 10);
    try {
      if (await saveCsvFile(`gwen-relatorio-${period}-${stamp}.csv`, csv)) toast('Relatório exportado.');
    } catch (err) {
      toast(err?.message || String(err), 'error');
    }
  }

  const Stat = ({ label, value, hint }) => (
    <div className="card px-4 py-3.5">
      <p className="eyebrow mb-2">{label}</p>
      <p className="font-display text-2xl font-semibold tabular">{value}</p>
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  );

  const fmtRange = `${from.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${new Date(end - 1).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;

  return (
    <>
        <section className="flex items-end justify-between gap-4 mb-5 flex-wrap anim-rise">
          <div>
            <p className="eyebrow mb-1">relatório · {fmtRange}</p>
            <h1 className="page-title">Para onde foi o seu tempo</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="segmented">
              {Object.entries(PERIODS).map(([id, p]) => (
                <button key={id} className={period === id ? 'active' : ''} onClick={() => setPeriod(id)}>
                  {p.label}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost" onClick={exportCsv} disabled={!report?.count}>
              <DownloadSimple size={14} />
              <Label>Exportar CSV</Label>
            </button>
          </div>
        </section>

        {!report ? (
          <p className="mono text-[12px] text-muted">carregando<span className="blink">_</span></p>
        ) : report.count === 0 ? (
          <div className="card p-10 text-center">
            <ChartBar size={28} className="mx-auto text-muted mb-3" />
            <p className="font-display font-semibold">Nenhuma sessão neste período.</p>
            <p className="text-[13px] text-muted mt-1">O tempo aparece aqui depois de um Começar agora.</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-4 max-[900px]:grid-cols-2 gap-3 mb-6 anim-rise">
              <Stat
                label="Total"
                value={formatDuration(report.total, { short: true })}
                hint={report.sum - report.total > 60 ? `tempo de relógio · ${formatDuration(report.sum, { short: true })} somando projetos em paralelo` : 'descontando pausas'}
              />
              <Stat label="Sessões" value={report.count} />
              <Stat label="Dias com trabalho" value={report.days} />
              <Stat label="Média por dia" value={formatDuration(report.total / Math.max(1, report.days), { short: true })} hint="nos dias com trabalho" />
            </section>

            <div className="flex flex-col gap-3">
              {report.groups.map((g) => (
                <section key={g.id} className="card p-4 anim-rise">
                  <header className="flex items-baseline justify-between gap-3 mb-3">
                    <h2 className="font-display font-semibold">{g.name}</h2>
                    <span className="mono text-[12px] text-muted tabular">
                      {formatDuration(g.seconds, { short: true })} · {Math.round((g.seconds / report.total) * 100)}%
                    </span>
                  </header>
                  <ul className="flex flex-col gap-2.5">
                    {g.projects.map((e) => (
                      <li key={e.project.id}>
                        <div className="grid grid-cols-[minmax(100px,220px)_1fr_auto] gap-3 items-center max-[560px]:grid-cols-[1fr_auto]">
                          <span className="text-[13.5px] truncate" title={e.project.name}>{e.project.name}</span>
                          <span className="h-2 rounded-full bg-[var(--c-phosphor-8)] overflow-hidden max-[560px]:hidden">
                            <span className="block h-full rounded-full bg-phosphor" style={{ width: `${(e.seconds / maxProject) * 100}%` }} />
                          </span>
                          <span className="mono text-[12px] tabular text-right min-w-[110px]">
                            {formatDuration(e.seconds, { short: true })}
                            <span className="text-muted"> · {e.count} {e.count === 1 ? 'sessão' : 'sessões'}</span>
                          </span>
                        </div>
                        {e.fronts.length > 0 && (
                          <ul className="mt-1.5 ml-4 flex flex-col gap-1">
                            {e.fronts.map((f) => (
                              <li key={f.name} className="grid grid-cols-[minmax(104px,204px)_1fr_auto] gap-3 items-center">
                                <span className="text-[12px] text-muted truncate">↳ {f.name}</span>
                                <span className="h-1 rounded-full bg-[var(--c-phosphor-8)] overflow-hidden">
                                  <span className="block h-full rounded-full bg-[var(--c-phosphor-40)]" style={{ width: `${(f.seconds / maxProject) * 100}%` }} />
                                </span>
                                <span className="mono text-[11px] text-muted tabular text-right min-w-[110px]">{formatDuration(f.seconds, { short: true })}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
    </>
  );
}

/** Linha do tempo de um dia: quando cada sessão começou e quais rodaram juntas */
function TimelineReport() {
  const { projects, activeBreak, activeSessions } = useWorkspace();
  const now = useNow(30_000);
  const [offset, setOffset] = useState(0); // 0 = hoje, 1 = ontem...
  const [sessions, setSessions] = useState(null);
  const day = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offset);
    return d;
  }, [offset]);

  useEffect(() => {
    let alive = true;
    const end = new Date(day.getTime() + 86_400_000);
    sessionRepo.between(day, end).then((list) => alive && setSessions(list)).catch(() => alive && setSessions([]));
    return () => {
      alive = false;
    };
  }, [day, activeSessions.length]);

  const label = offset === 0 ? 'Hoje' : offset === 1 ? 'Ontem' : day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <section className="flex items-end justify-between gap-4 mb-5 flex-wrap anim-rise">
        <div>
          <p className="eyebrow mb-1">linha do tempo</p>
          <h1 className="page-title first-letter:uppercase">{label}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn btn-ghost btn-icon" onClick={() => setOffset((o) => o + 1)} aria-label="Dia anterior" title="Dia anterior">
            <CaretLeft size={14} />
          </button>
          <button className="btn btn-ghost" onClick={() => setOffset(0)} disabled={offset === 0}>
            <Label>Hoje</Label>
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} aria-label="Próximo dia" title="Próximo dia">
            <CaretRight size={14} />
          </button>
        </div>
      </section>
      <section className="card p-4 anim-rise">
        {sessions ? (
          <Timeline sessions={sessions} projects={projects} day={day} now={now} activeBreak={activeBreak} />
        ) : (
          <p className="mono text-[12px] text-muted">carregando<span className="blink">_</span></p>
        )}
      </section>
      <p className="text-[12px] text-muted mt-3">
        Cada faixa é um projeto (ou frente). Os trechos marcados mostram quando duas sessões rodaram ao mesmo tempo.
      </p>
    </>
  );
}

const APP_PERIODS = {
  hoje: { label: 'Hoje', days: 0 },
  semana: { label: '7 dias', days: 6 },
  mes: { label: '30 dias', days: 29 },
};

/** Tempo por app e por categoria, do mapeamento (0.8) */
function AppsReport({ onNavigate }) {
  const { profile } = useProfile();
  const cfg = resolveLauncher(profile?.launcher);
  const [period, setPeriod] = useState('hoje');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    const from = new Date();
    from.setDate(from.getDate() - APP_PERIODS[period].days);
    usageBetween(dayKey(from), dayKey(new Date()), cfg.categories).then(setRows).catch(() => setRows([]));
  }, [period, profile?.launcher]); // eslint-disable-line react-hooks/exhaustive-deps

  const { total, cats, apps } = useMemo(() => {
    const byCat = new Map();
    const byApp = new Map();
    let sum = 0;
    for (const r of rows || []) {
      sum += r.seconds;
      byCat.set(r.category, (byCat.get(r.category) || 0) + r.seconds);
      const k = String(r.exe).toLowerCase();
      const cur = byApp.get(k) || { exe: r.exe, category: r.category, seconds: 0 };
      cur.seconds += r.seconds;
      byApp.set(k, cur);
    }
    return {
      total: sum,
      cats: [...byCat.entries()].map(([id, seconds]) => ({ id, seconds })).sort((a, b) => b.seconds - a.seconds),
      apps: [...byApp.values()].sort((a, b) => b.seconds - a.seconds),
    };
  }, [rows]);
  const maxApp = Math.max(1, ...apps.map((a) => a.seconds));

  if (!cfg.tracking.enabled && !(rows || []).length) {
    return (
      <div className="card p-10 text-center anim-rise">
        <GameController size={28} className="mx-auto text-muted mb-3" />
        <p className="font-display font-semibold">O mapeamento de apps está desligado.</p>
        <p className="text-[13px] text-muted mt-1 max-w-[460px] mx-auto">
          Ligado, a G.W.E.N. soma quanto tempo vai para cada programa (código, navegador, conversa, jogos...) e avisa quando você passa do limite jogando ou trabalhando sem parar.
        </p>
        <button className="btn btn-primary mt-5" onClick={() => onNavigate?.('config', 'atividade')}>
          <Label>Ligar em Ajustes</Label>
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="flex items-end justify-between gap-4 mb-5 flex-wrap anim-rise">
        <div>
          <p className="eyebrow mb-1">apps e jogos</p>
          <h1 className="page-title">{formatDuration(total, { short: true })} no computador</h1>
        </div>
        <div className="segmented">
          {Object.entries(APP_PERIODS).map(([id, p]) => (
            <button key={id} className={period === id ? 'active' : ''} onClick={() => setPeriod(id)}>
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {!rows ? (
        <p className="mono text-[12px] text-muted">carregando<span className="blink">_</span></p>
      ) : !rows.length ? (
        <div className="card p-8 text-center text-[13px] text-muted">Nada registrado neste período ainda.</div>
      ) : (
        <>
          <section className="card p-4 mb-3 anim-rise">
            <div className="cat-bar mb-3" aria-hidden="true">
              {cats.map((c) => (
                <span key={c.id} style={{ width: `${(c.seconds / total) * 100}%`, background: CATEGORIES[c.id]?.color }} title={CATEGORIES[c.id]?.label} />
              ))}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
              {cats.map((c) => {
                const C = CATEGORIES[c.id] || CATEGORIES.outros;
                const Icon = C.icon;
                return (
                  <div key={c.id} className="flex items-center gap-2 text-[13px]">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: C.color }} />
                    <Icon size={14} className="text-muted" />
                    <span className="flex-1 truncate">{C.label}</span>
                    <span className="mono text-[11px] text-muted tabular">{formatDuration(c.seconds, { short: true })}</span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="card p-4 anim-rise">
            <ul className="flex flex-col gap-2.5">
              {apps.slice(0, 25).map((a) => (
                <li key={a.exe} className="grid grid-cols-[minmax(110px,200px)_1fr_auto] gap-3 items-center max-[560px]:grid-cols-[1fr_auto]">
                  <span className="text-[13px] truncate" title={a.exe}>
                    {appName(a.exe)}
                    <span className="text-muted"> · {(CATEGORIES[a.category] || CATEGORIES.outros).label.toLowerCase()}</span>
                  </span>
                  <span className="h-2 rounded-full bg-[var(--c-phosphor-8)] overflow-hidden max-[560px]:hidden">
                    <span className="block h-full rounded-full" style={{ width: `${(a.seconds / maxApp) * 100}%`, background: (CATEGORIES[a.category] || CATEGORIES.outros).color }} />
                  </span>
                  <span className="mono text-[12px] tabular text-right min-w-[64px]">{formatDuration(a.seconds, { short: true })}</span>
                </li>
              ))}
            </ul>
          </section>
          <p className="text-[12px] text-muted mt-3">Para mudar a categoria de um app: Ajustes, Mapeamento. Fica só neste computador.</p>
        </>
      )}
    </>
  );
}
