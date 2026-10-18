import { useMemo, useState } from 'react';
import {
  CaretDown, CaretRight, Check, FolderSimple, Lightning, MagnifyingGlass, PencilSimple, Plus, SquaresFour, Stop, Trash, X,
} from '@phosphor-icons/react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { formatDuration } from '../lib/time';
import { SMART } from '../lib/collections';
import { projectFronts } from '../lib/projectModel';
import { useStoredState } from '../lib/layout';

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const STATUS_ORDER = { andamento: 0, pausado: 1, ideia: 2, concluido: 3 };

/**
 * Painel de projetos (0.7), no jeito das Collections do Postman:
 * coleções inteligentes no topo e as categorias em árvore, com os projetos dentro.
 * Abre e fecha pelo trilho ou com Ctrl + B. Em janela estreita vira gaveta.
 */
export default function Sidebar({ view, filter, onFilter, onNavigate, onOpenProject, focusId, stats, overlay, onClose }) {
  const { categories, projects, activeSession, launchProject, requestEnd, createCategory, renameCategory, deleteCategory } = useWorkspace();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useStoredState('gwen.painel.fechadas', []);

  const now = Date.now();
  const q = fold(query.trim());
  const onProjects = view === 'projetos';

  const tree = useMemo(() => {
    const sorted = [...projects].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name, 'pt-BR'),
    );
    const visible = q ? sorted.filter((p) => fold(p.name).includes(q)) : sorted;
    const groups = categories.map((c) => ({ id: c.id, cat: c, items: visible.filter((p) => p.category_id === c.id) }));
    const loose = visible.filter((p) => !p.category_id || !categories.some((c) => c.id === p.category_id));
    if (loose.length || (!q && projects.some((p) => !p.category_id))) groups.push({ id: 'none', cat: null, items: loose });
    return groups;
  }, [projects, categories, q]);

  const toggle = (id) => setCollapsed((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const isOpen = (id) => !!q || !collapsed.includes(id);

  function pick(id) {
    onFilter(id);
    onNavigate('projetos');
    if (overlay) onClose?.();
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const cat = await createCategory(newName);
      setNewName('');
      setAdding(false);
      pick(cat.id);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleRename(e, id) {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      await renameCategory(id, editName);
      setEditingId(null);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function handleDelete(cat) {
    const n = projects.filter((p) => p.category_id === cat.id).length;
    const msg = n
      ? `Excluir "${cat.name}"? Os ${n} projeto(s) dela não serão apagados, vão para "Sem categoria".`
      : `Excluir a categoria "${cat.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await deleteCategory(cat.id);
      if (filter === cat.id) onFilter('all');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function launch(project) {
    try {
      const fronts = projectFronts(project);
      await launchProject(project, fronts.length === 1 ? fronts[0] : null);
    } catch (err) {
      toast(err?.message || String(err), 'error');
    }
  }

  const Row = ({ id, icon: Icon, label, count, time, hint }) => {
    const active = onProjects && filter === id;
    return (
      <button onClick={() => pick(id)} className={`panel-row ${active ? 'is-active' : ''}`} title={hint}>
        <Icon size={15} weight={active ? 'fill' : 'regular'} className={active ? 'text-phosphor' : ''} />
        <span className="flex-1 truncate">{label}</span>
        {time > 0 && <span className="panel-meta">{formatDuration(time, { short: true })}</span>}
        <span className="panel-meta w-5 text-right">{count}</span>
      </button>
    );
  };

  const ProjectRow = ({ p }) => {
    const running = activeSession?.project_id === p.id;
    const week = stats.byProject.get(p.id)?.week || 0;
    return (
      <div className={`panel-project ${focusId === p.id && onProjects ? 'is-active' : ''}`}>
        <button className="panel-project-name" onClick={() => { onOpenProject(p); if (overlay) onClose?.(); }} title={p.name}>
          <span className={`status-dot status-${p.status} ${running ? 'anim-breathe' : ''}`} />
          <span className="truncate">{p.name}</span>
        </button>
        {week > 0 && <span className="panel-meta">{formatDuration(week, { short: true })}</span>}
        {running ? (
          <button className="panel-play is-running" onClick={requestEnd} title="Encerrar sessão" aria-label={`Encerrar ${p.name}`}>
            <Stop size={11} weight="fill" />
          </button>
        ) : p.status !== 'concluido' ? (
          <button className="panel-play" onClick={() => launch(p)} title={`Começar agora: ${p.name}`} aria-label={`Começar ${p.name}`}>
            <Lightning size={11} weight="fill" />
          </button>
        ) : (
          <span className="w-[22px]" />
        )}
      </div>
    );
  };

  const smartCounts = Object.fromEntries(Object.entries(SMART).map(([id, s]) => [id, projects.filter((p) => s.match(p, now)).length]));

  return (
    <aside className={`panel ${overlay ? 'is-overlay' : ''}`} aria-label="Painel de projetos">
      <div className="panel-head">
        <span className="font-display font-semibold text-[14px]">Projetos</span>
        <div className="flex items-center gap-0.5">
          <button className="btn btn-quiet btn-icon btn-sm" onClick={() => setAdding(true)} title="Nova categoria" aria-label="Nova categoria">
            <Plus size={14} />
          </button>
          {overlay && (
            <button className="btn btn-quiet btn-icon btn-sm" onClick={onClose} title="Fechar painel" aria-label="Fechar painel">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="px-2.5 pt-2.5">
        <div className="relative search">
          <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input input-sm pl-7" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar projetos" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-px">
        {!q && (
          <>
            <Row id="all" icon={SquaresFour} label="Todos os projetos" count={projects.length} time={stats.weekTotal} />
            {Object.entries(SMART).map(([id, s]) =>
              smartCounts[id] || id === 'fixados' ? (
                <Row key={id} id={`smart:${id}`} icon={s.icon} label={s.label} count={smartCounts[id]} hint={s.hint} />
              ) : null,
            )}
          </>
        )}

        <p className="panel-section">Coleções</p>

        {tree.map(({ id, cat, items }) => {
          const name = cat ? cat.name : 'Sem categoria';
          const open = isOpen(id);
          const active = onProjects && filter === id;
          if (cat && editingId === cat.id) {
            return (
              <form key={id} onSubmit={(e) => handleRename(e, cat.id)} className="flex gap-1 px-1 py-0.5">
                <input className="input input-sm" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                <button className="btn btn-quiet btn-icon btn-sm" type="submit" aria-label="Salvar"><Check size={14} /></button>
                <button className="btn btn-quiet btn-icon btn-sm" type="button" onClick={() => setEditingId(null)} aria-label="Cancelar"><X size={14} /></button>
              </form>
            );
          }
          return (
            <div key={id} className="flex flex-col">
              <div className={`panel-folder ${active ? 'is-active' : ''}`}>
                <button className="panel-caret" onClick={() => toggle(id)} aria-label={open ? `Recolher ${name}` : `Expandir ${name}`} aria-expanded={open}>
                  {open ? <CaretDown size={11} weight="bold" /> : <CaretRight size={11} weight="bold" />}
                </button>
                <button className="panel-folder-name" onClick={() => pick(id)}>
                  <FolderSimple size={15} weight={active ? 'fill' : 'regular'} className={active ? 'text-phosphor' : ''} />
                  <span className="truncate">{name}</span>
                </button>
                {(stats.byCategory.get(id) || 0) > 0 && (
                  <span className="panel-meta">{formatDuration(stats.byCategory.get(id), { short: true })}</span>
                )}
                {cat && active ? (
                  <span className="flex">
                    <button className="btn btn-quiet btn-icon btn-xs" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} title="Renomear" aria-label="Renomear">
                      <PencilSimple size={12} />
                    </button>
                    <button className="btn btn-quiet btn-icon btn-xs" onClick={() => handleDelete(cat)} title="Excluir categoria" aria-label="Excluir categoria">
                      <Trash size={12} />
                    </button>
                  </span>
                ) : (
                  <span className="panel-meta w-5 text-right">{items.length}</span>
                )}
              </div>
              {open && (
                <div className="panel-children">
                  {items.length ? items.map((p) => <ProjectRow key={p.id} p={p} />) : <p className="panel-empty">vazia</p>}
                </div>
              )}
            </div>
          );
        })}

        {adding && (
          <form onSubmit={handleAdd} className="flex gap-1 px-1 mt-1">
            <input className="input input-sm" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Mestrado" autoFocus />
            <button className="btn btn-quiet btn-icon btn-sm" type="submit" aria-label="Criar"><Check size={14} /></button>
            <button className="btn btn-quiet btn-icon btn-sm" type="button" onClick={() => setAdding(false)} aria-label="Cancelar"><X size={14} /></button>
          </form>
        )}

        {categories.length === 0 && !adding && !q && (
          <p className="px-2.5 py-2 text-[12px] text-muted leading-relaxed">
            Crie coleções como Mestrado, Freela ou Pessoais para agrupar projetos e somar o tempo de cada área.
          </p>
        )}
        {q && !tree.some((g) => g.items.length) && <p className="panel-empty px-2.5">nada com “{query}”</p>}
      </nav>
    </aside>
  );
}
