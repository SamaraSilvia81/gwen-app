import { useEffect, useMemo, useState } from 'react';
import { ChartBar, DownloadSimple } from '@phosphor-icons/react';
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
export default function Report() {
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
    <div className="h-full overflow-y-auto">
      <div className="page">
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
              <Stat label="Total" value={formatDuration(report.total, { short: true })} hint="descontando pausas" />
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
      </div>
    </div>
  );
}
