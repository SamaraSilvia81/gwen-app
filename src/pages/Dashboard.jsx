import { useEffect, useMemo, useState } from 'react';
import { ArrowBendDownRight, Lightning, List, MagnifyingGlass, NotePencil, Plus, PushPin, SquaresFour, Stop } from '@phosphor-icons/react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import ProjectCard from '../components/ProjectCard';
import ProjectForm from '../components/ProjectForm';
import { Label } from '../components/Modal';
import { formatDuration } from '../lib/time';
import { STATUS } from '../lib/stats';
import { hasContent, readDraft, writeDraft } from '../lib/projectDraft';
import { filterLabel as labelOf, matchFilter } from '../lib/collections';
import { useStoredState } from '../lib/layout';
import { projectFronts } from '../lib/projectModel';

const STATUS_FILTERS = [['todos', 'Todos'], ...Object.entries(STATUS).map(([id, s]) => [id, s.label])];
const STATUS_ORDER = { andamento: 0, pausado: 1, ideia: 2, concluido: 3 };

export default function Dashboard({ filter, stats, focusId = null }) {
  const { projects, categories, loading } = useWorkspace();
  const [layout, setLayout] = useStoredState('gwen.projetos.vista', 'grade'); // grade | lista
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
  const filterLabel = labelOf(filter, categories);
  const isCategory = filter !== 'all' && !String(filter).startsWith('smart:');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    return projects
      .filter((p) => matchFilter(p, filter, now))
      .filter((p) => status === 'todos' || p.status === status)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
      .sort((a, b) => {
        const pin = Number(!!b.pinned) - Number(!!a.pinned);
        if (pin !== 0) return pin;
        const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (s !== 0) return s;
        return new Date(b.last_opened_at || b.updated_at) - new Date(a.last_opened_at || a.updated_at);
      });
  }, [projects, filter, status, query]);

  const weekHere = visible.reduce((sum, p) => sum + (stats.byProject.get(p.id)?.week || 0), 0);

  // projeto escolhido no painel: rola até ele e destaca por um instante
  useEffect(() => {
    if (!focusId || loading) return;
    const el = document.querySelector(`[data-project-id="${focusId}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusId, loading, layout]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="page">
        {/* cabeçalho grande, no jeito do iOS */}
        <section className="flex items-end justify-between gap-4 mb-5 flex-wrap anim-rise">
          <div className="min-w-0">
            <p className="eyebrow mb-1">{isCategory ? 'coleção' : 'projetos'}</p>
            <h1 className="page-title truncate">{filterLabel}</h1>
            <p className="text-[12.5px] text-muted mt-1 tabular">
              {visible.length} {visible.length === 1 ? 'projeto' : 'projetos'}
              {weekHere > 0 && ` · ${formatDuration(weekHere, { short: true })} esta semana`}
              {stats.inProgress > 0 && filter === 'all' && ` · ${stats.inProgress} em andamento`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative search">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-8 w-[200px] max-[640px]:w-[150px]"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar projeto"
              />
            </div>
            <div className="segmented" role="group" aria-label="Como mostrar">
              <button className={layout === 'grade' ? 'active' : ''} onClick={() => setLayout('grade')} title="Grade" aria-label="Grade">
                <SquaresFour size={14} weight={layout === 'grade' ? 'fill' : 'regular'} />
              </button>
              <button className={layout === 'lista' ? 'active' : ''} onClick={() => setLayout('lista')} title="Lista" aria-label="Lista">
                <List size={14} weight="bold" />
              </button>
            </div>
            <button className="btn btn-accent" onClick={() => setEditing('new')}>
              <Plus size={14} weight="bold" />
              <Label>Novo projeto</Label>
            </button>
          </div>
        </section>

        <div className="segmented mb-6 max-w-full overflow-x-auto">
          {STATUS_FILTERS.map(([id, label]) => (
            <button key={id} className={status === id ? 'active' : ''} onClick={() => setStatus(id)}>
              {label}
            </button>
          ))}
        </div>

        {/* lista */}
        {loading ? (
          <p className="mono text-muted">carregando projetos<span className="blink">_</span></p>
        ) : visible.length && layout === 'lista' ? (
          <>
            {draftCard && <section className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3 mb-3">{draftCard}</section>}
            <section className="card list-card anim-rise">
              {visible.map((p) => (
                <ProjectListRow
                  key={p.id}
                  project={p}
                  time={stats.byProject.get(p.id)?.week || 0}
                  categoryName={!isCategory ? categoryName.get(p.category_id) : null}
                  focused={focusId === p.id}
                  onEdit={() => setEditing(p)}
                />
              ))}
            </section>
          </>
        ) : visible.length ? (
          <section className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {draftCard}
            {visible.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                time={stats.byProject.get(p.id)?.week || 0}
                frontTimes={stats.byFront}
                categoryName={!isCategory ? categoryName.get(p.category_id) : null}
                focused={focusId === p.id}
                onEdit={() => setEditing(p)}
              />
            ))}
          </section>
        ) : (
          <>
            {draftCard && <section className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3 mb-3">{draftCard}</section>}
            <EmptyState hasAny={projects.length > 0} onCreate={() => setEditing('new')} />
          </>
        )}
      </div>

      {editing && (
        <ProjectForm
          project={editing === 'new' ? null : editing}
          defaultCategory={isCategory ? filter : 'all'}
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

/** Linha da vista em lista (0.7), no jeito do Linear: tudo numa linha, ações sempre visíveis */
function ProjectListRow({ project, time, categoryName, focused, onEdit }) {
  const { activeSession, launchProject, requestEnd, notes } = useWorkspace();
  const toast = useToast();
  const running = activeSession?.project_id === project.id;
  const where = notes?.get(project.id);
  const fronts = projectFronts(project);

  async function launch() {
    try {
      await launchProject(project, fronts.length === 1 ? fronts[0] : null);
    } catch (err) {
      toast(err?.message || String(err), 'error');
    }
  }

  return (
    <div
      data-project-id={project.id}
      className={`list-row ${running ? 'is-active' : ''} ${focused ? 'is-focused' : ''}`}
      onClick={(e) => !e.target.closest('button') && onEdit()}
    >
      <span className={`status-dot status-${project.status} ${running ? 'anim-breathe' : ''}`} title={STATUS[project.status]?.label} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 min-w-0">
          {project.pinned ? <PushPin size={12} weight="fill" className="text-phosphor shrink-0" /> : null}
          <span className="font-medium truncate">{project.name}</span>
          {categoryName && <span className="mono text-[11px] text-muted truncate max-[700px]:hidden">{categoryName}</span>}
        </p>
        {where && (
          <p className="text-[12px] text-muted truncate flex items-center gap-1.5 mt-0.5">
            <ArrowBendDownRight size={11} className="text-phosphor shrink-0" />
            {where.note}
          </p>
        )}
      </div>
      <span className="chip max-[640px]:hidden">{STATUS[project.status]?.label}</span>
      <span className="mono text-[11px] text-muted tabular w-[64px] text-right max-[560px]:hidden">
        {time > 0 ? formatDuration(time, { short: true }) : '-'}
      </span>
      {running ? (
        <button className="btn btn-ghost btn-sm" onClick={requestEnd}>
          <Stop size={12} weight="fill" />
          <Label>Encerrar</Label>
        </button>
      ) : (
        <button className="btn btn-primary btn-sm" onClick={launch} disabled={project.status === 'concluido'} title={fronts.length > 1 ? 'Abre todas as frentes' : undefined}>
          <Lightning size={12} weight="fill" />
          <span className="max-[700px]:hidden"><Label>Começar</Label></span>
        </button>
      )}
    </div>
  );
}
