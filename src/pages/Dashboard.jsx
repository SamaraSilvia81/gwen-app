import { useMemo, useState } from 'react';
import { MagnifyingGlass, NotePencil, Plus } from '@phosphor-icons/react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useWellness } from '../context/WellnessContext';
import { REMINDERS } from '../lib/wellness';
import ProjectCard from '../components/ProjectCard';
import ProjectForm from '../components/ProjectForm';
import { Label } from '../components/Modal';
import { formatDuration } from '../lib/time';
import { STATUS } from '../lib/stats';
import { hasContent, readDraft, writeDraft } from '../lib/projectDraft';

const STATUS_FILTERS = [['todos', 'Todos'], ...Object.entries(STATUS).map(([id, s]) => [id, s.label])];
const STATUS_ORDER = { andamento: 0, pausado: 1, ideia: 2, concluido: 3 };

export default function Dashboard({ filter, stats }) {
  const { projects, categories, loading } = useWorkspace();
  const [status, setStatus] = useState('todos');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | project
  const [draftTick, setDraftTick] = useState(0);
  // relê o rascunho sempre que o formulário fecha
  const draft = useMemo(() => {
    const d = readDraft();
    return hasContent(d) ? d : null;
  }, [editing, draftTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const draftCard = draft && !editing && (
    <DraftCard
      draft={draft}
      onContinue={() => setEditing('new')}
      onDiscard={() => {
        writeDraft(null);
        setDraftTick((t) => t + 1);
      }}
    />
  );

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const filterLabel =
    filter === 'all' ? 'Todos os projetos' : filter === 'none' ? 'Sem categoria' : categoryName.get(filter) || 'Projetos';

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => filter === 'all' || (p.category_id || 'none') === filter)
      .filter((p) => status === 'todos' || p.status === status)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
      .sort((a, b) => {
        const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (s !== 0) return s;
        return new Date(b.last_opened_at || b.updated_at) - new Date(a.last_opened_at || a.updated_at);
      });
  }, [projects, filter, status, query]);

  const categoryWeek = filter !== 'all' ? stats.byCategory.get(filter) || 0 : stats.weekTotal;

  const Stat = ({ label, value, hint }) => (
    <div className="card px-4 py-3.5">
      <p className="eyebrow mb-2">{label}</p>
      <p className="font-display text-2xl font-semibold tabular">{value}</p>
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-8 py-7">
        {/* números */}
        <section className="grid grid-cols-4 max-[1100px]:grid-cols-2 gap-3 mb-3 anim-rise">
          <Stat label="Hoje" value={formatDuration(stats.todayTotal, { short: true })} hint="em sessões" />
          <Stat
            label={filter === 'all' ? 'Esta semana' : `Semana · ${filterLabel}`}
            value={formatDuration(categoryWeek, { short: true })}
            hint="desde segunda"
          />
          <Stat label="Em andamento" value={stats.inProgress} hint="projetos ativos" />
          <Stat label={`Concluídos em ${stats.year}`} value={stats.doneThisYear} hint="projetos finalizados" />
        </section>

        <WellnessStrip />

        {/* cabeçalho da lista */}
        <section className="flex items-end justify-between gap-4 mb-4 flex-wrap">
          <div>
            <p className="eyebrow mb-1">projetos</p>
            <h1 className="font-display text-2xl font-bold">{filterLabel}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-8 w-[200px]"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar projeto"
              />
            </div>
            <button className="btn btn-accent" onClick={() => setEditing('new')}>
              <Plus size={14} weight="bold" />
              <Label>Novo projeto</Label>
            </button>
          </div>
        </section>

        <div className="segmented mb-6">
          {STATUS_FILTERS.map(([id, label]) => (
            <button key={id} className={status === id ? 'active' : ''} onClick={() => setStatus(id)}>
              {label}
            </button>
          ))}
        </div>

        {/* lista */}
        {loading ? (
          <p className="mono text-muted">carregando projetos<span className="blink">_</span></p>
        ) : visible.length ? (
          <section className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
            {draftCard}
            {visible.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                time={stats.byProject.get(p.id)?.week || 0}
                frontTimes={stats.byFront}
                categoryName={filter === 'all' ? categoryName.get(p.category_id) : null}
                onEdit={() => setEditing(p)}
              />
            ))}
          </section>
        ) : (
          <>
            {draftCard && <section className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3 mb-3">{draftCard}</section>}
            <EmptyState hasAny={projects.length > 0} onCreate={() => setEditing('new')} />
          </>
        )}
      </div>

      {editing && (
        <ProjectForm
          project={editing === 'new' ? null : editing}
          defaultCategory={filter}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** Projeto novo que ficou sem salvar: aparece como card tracejado no começo da lista */
function DraftCard({ draft, onContinue, onDiscard }) {
  const folders = (draft.folders || []).filter((f) => f.path?.trim()).length;
  const links = (draft.links || []).filter((l) => l.url?.trim()).length;
  const bits = [folders && `${folders} ${folders === 1 ? 'pasta' : 'pastas'}`, links && `${links} ${links === 1 ? 'link' : 'links'}`].filter(Boolean);
  return (
    <article className="card border-dashed flex flex-col p-4 gap-3.5">
      <div>
        <span className="chip mb-1.5">
          <NotePencil size={11} />
          Rascunho
        </span>
        <h3 className="font-display text-[16px] font-semibold leading-tight truncate mt-1.5">{draft.name?.trim() || 'Projeto sem nome'}</h3>
      </div>
      <p className="text-[13px] text-muted leading-relaxed line-clamp-2">
        {draft.description?.trim() || 'Você começou a criar este projeto e saiu sem salvar.'}
      </p>
      <footer className="flex items-center justify-between gap-3 mt-auto pt-3 border-t border-rule">
        <span className="mono text-[11px] text-muted">{bits.join(' · ') || 'sem pastas ainda'}</span>
        <div className="flex gap-1.5">
          <button className="btn btn-quiet btn-sm" onClick={onDiscard}>
            <Label>Descartar</Label>
          </button>
          <button className="btn btn-primary btn-sm" onClick={onContinue}>
            <Label>Continuar</Label>
          </button>
        </div>
      </footer>
    </article>
  );
}

function EmptyState({ hasAny, onCreate }) {
  return (
    <div className="card border-dashed px-8 py-14 text-center">
      <p className="prompt mono text-[13px] text-muted mb-2">{hasAny ? 'nada com esse filtro' : 'gwen init'}</p>
      <h3 className="font-display text-xl font-semibold mb-2">
        {hasAny ? 'Nenhum projeto aqui.' : 'Cadastre seu primeiro projeto.'}
      </h3>
      <p className="text-muted max-w-[420px] mx-auto mb-6 leading-relaxed">
        {hasAny
          ? 'Troque o filtro de status ou de categoria na lateral.'
          : 'Escolha as pastas e os links dele. Depois é só clicar em Começar agora para abrir tudo e contar o tempo.'}
      </p>
      {!hasAny && (
        <button className="btn btn-primary" onClick={onCreate}>
          <Plus size={14} weight="bold" />
          <Label>Novo projeto</Label>
        </button>
      )}
    </div>
  );
}

/** Resumo do modo saúde: o que já foi feito hoje e quando vem o próximo lembrete */
function WellnessStrip() {
  const { config, counting, counters, todayCount } = useWellness();
  if (!config.enabled) return <div className="mb-5" />;

  const active = Object.entries(config.reminders).filter(([, r]) => r.on);
  const next = active
    .map(([k, r]) => ({ k, left: Math.max(0, r.every * 60 - (counters[k] || 0)) }))
    .sort((a, b) => a.left - b.left)[0];

  return (
    <section className="card px-4 py-3 mb-8 flex items-center gap-5 flex-wrap anim-rise">
      <span className="eyebrow">modo saúde · hoje</span>
      {active.map(([k]) => {
        const r = REMINDERS[k];
        const Icon = r.icon;
        return (
          <span key={k} className="inline-flex items-center gap-1.5 text-[13px]">
            <Icon size={15} className="text-phosphor" />
            <span className="tabular font-medium">{todayCount[k] || 0}</span>
            <span className="text-muted">{r.counted(todayCount[k] || 0)}</span>
          </span>
        );
      })}
      <span className="ml-auto mono text-[11px] text-muted">
        {!counting
          ? 'lembretes parados (sem sessão ativa)'
          : next
            ? next.left < 60
              ? `${REMINDERS[next.k].label.toLowerCase()}: agora`
              : `próximo: ${REMINDERS[next.k].label.toLowerCase()} em ${formatDuration(next.left, { short: true })}`
            : ''}
      </span>
    </section>
  );
}
