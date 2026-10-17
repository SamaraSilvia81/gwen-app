import { useMemo, useState } from 'react';
import { MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useWorkspace } from '../context/WorkspaceContext';
import ProjectCard from '../components/ProjectCard';
import ProjectForm from '../components/ProjectForm';
import { Label } from '../components/Modal';
import { formatDuration } from '../lib/time';
import { STATUS } from '../lib/stats';

const STATUS_FILTERS = [['todos', 'Todos'], ...Object.entries(STATUS).map(([id, s]) => [id, s.label])];
const STATUS_ORDER = { andamento: 0, pausado: 1, ideia: 2, concluido: 3 };

export default function Dashboard({ filter, stats }) {
  const { projects, categories, loading } = useWorkspace();
  const [status, setStatus] = useState('todos');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | project

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
        <section className="grid grid-cols-4 max-[1100px]:grid-cols-2 gap-3 mb-8 anim-rise">
          <Stat label="Hoje" value={formatDuration(stats.todayTotal, { short: true })} hint="em sessões" />
          <Stat
            label={filter === 'all' ? 'Esta semana' : `Semana · ${filterLabel}`}
            value={formatDuration(categoryWeek, { short: true })}
            hint="desde segunda"
          />
          <Stat label="Em andamento" value={stats.inProgress} hint="projetos ativos" />
          <Stat label={`Concluídos em ${stats.year}`} value={stats.doneThisYear} hint="projetos finalizados" />
        </section>

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
            {visible.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                time={stats.byProject.get(p.id)?.week || 0}
                categoryName={filter === 'all' ? categoryName.get(p.category_id) : null}
                onEdit={() => setEditing(p)}
              />
            ))}
          </section>
        ) : (
          <EmptyState hasAny={projects.length > 0} onCreate={() => setEditing('new')} />
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
          : 'Escolha as pastas e os links dele. Depois é só clicar em Codar agora para abrir tudo e começar a contar o tempo.'}
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
