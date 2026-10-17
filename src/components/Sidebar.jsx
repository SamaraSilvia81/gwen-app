import { useState } from 'react';
import { Check, FolderSimple, GearSix, PencilSimple, Plus, SquaresFour, Trash, X } from '@phosphor-icons/react';
import { Wordmark } from './Logo';
import { useProfile } from '../context/ProfileContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import Avatar from './Avatar';
import { formatDuration } from '../lib/time';

export default function Sidebar({ view, onNavigate, filter, onFilter, stats }) {
  const { profile } = useProfile();
  const { categories, projects, createCategory, renameCategory, deleteCategory } = useWorkspace();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const countIn = (id) => projects.filter((p) => (p.category_id || 'none') === id).length;
  const uncategorized = countIn('none');

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const cat = await createCategory(newName);
      setNewName('');
      setAdding(false);
      onFilter(cat.id);
      onNavigate('projetos');
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
    const n = countIn(cat.id);
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

  const NavItem = ({ id, icon: Icon, label, count, time, active }) => (
    <button
      onClick={() => {
        onFilter(id);
        onNavigate('projetos');
      }}
      className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-ui-sm text-left transition-colors ${
        active ? 'bg-[var(--c-phosphor-12)] text-bone' : 'text-muted hover:text-bone hover:bg-[var(--c-phosphor-8)]'
      }`}
    >
      <Icon size={16} weight={active ? 'fill' : 'regular'} className={active ? 'text-phosphor' : ''} />
      <span className="flex-1 truncate font-medium">{label}</span>
      {time > 0 && <span className="mono text-[10px] text-muted tabular">{formatDuration(time, { short: true })}</span>}
      <span className="mono text-[10px] text-muted w-4 text-right">{count}</span>
    </button>
  );

  return (
    <aside className="glass w-[248px] shrink-0 h-full flex flex-col border-r border-rule">
      <div className="h-[52px] flex items-center px-4 border-b border-rule">
        <Wordmark size={22} />
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4 flex flex-col gap-0.5">
        <NavItem
          id="all"
          icon={SquaresFour}
          label="Todos os projetos"
          count={projects.length}
          time={stats.weekTotal}
          active={view === 'projetos' && filter === 'all'}
        />

        <div className="flex items-center justify-between mt-5 mb-1.5 px-2.5">
          <span className="eyebrow">Categorias</span>
          <button className="btn btn-quiet btn-icon btn-sm" onClick={() => setAdding(true)} aria-label="Nova categoria" title="Nova categoria">
            <Plus size={14} />
          </button>
        </div>

        {categories.map((cat) =>
          editingId === cat.id ? (
            <form key={cat.id} onSubmit={(e) => handleRename(e, cat.id)} className="flex gap-1 px-1">
              <input className="input h-8" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
              <button className="btn btn-quiet btn-icon btn-sm" type="submit" aria-label="Salvar"><Check size={14} /></button>
              <button className="btn btn-quiet btn-icon btn-sm" type="button" onClick={() => setEditingId(null)} aria-label="Cancelar"><X size={14} /></button>
            </form>
          ) : (
            <div key={cat.id} className="flex items-center gap-0.5">
              <div className="flex-1 min-w-0">
                <NavItem
                  id={cat.id}
                  icon={FolderSimple}
                  label={cat.name}
                  count={countIn(cat.id)}
                  time={stats.byCategory.get(cat.id) || 0}
                  active={view === 'projetos' && filter === cat.id}
                />
              </div>
              {filter === cat.id && (
                <>
                  <button className="btn btn-quiet btn-icon btn-sm" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} aria-label="Renomear" title="Renomear">
                    <PencilSimple size={13} />
                  </button>
                  <button className="btn btn-quiet btn-icon btn-sm" onClick={() => handleDelete(cat)} aria-label="Excluir" title="Excluir">
                    <Trash size={13} />
                  </button>
                </>
              )}
            </div>
          ),
        )}

        {adding && (
          <form onSubmit={handleAdd} className="flex gap-1 px-1 mt-1">
            <input
              className="input h-8"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: Mestrado"
              autoFocus
            />
            <button className="btn btn-quiet btn-icon btn-sm" type="submit" aria-label="Criar"><Check size={14} /></button>
            <button className="btn btn-quiet btn-icon btn-sm" type="button" onClick={() => setAdding(false)} aria-label="Cancelar"><X size={14} /></button>
          </form>
        )}

        {categories.length === 0 && !adding && (
          <p className="px-2.5 py-2 text-[12px] text-muted leading-relaxed">
            Crie categorias como Mestrado, Freela ou Pessoais para agrupar projetos e somar o tempo de cada área.
          </p>
        )}

        {uncategorized > 0 && (
          <NavItem
            id="none"
            icon={FolderSimple}
            label="Sem categoria"
            count={uncategorized}
            time={stats.byCategory.get('none') || 0}
            active={view === 'projetos' && filter === 'none'}
          />
        )}
      </nav>

      <div className="border-t border-rule p-2.5 flex flex-col gap-0.5">
        <button
          onClick={() => onNavigate('config')}
          className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-ui-sm transition-colors ${
            view === 'config' ? 'bg-[var(--c-phosphor-12)] text-bone' : 'text-muted hover:text-bone hover:bg-[var(--c-phosphor-8)]'
          }`}
        >
          <GearSix size={16} weight={view === 'config' ? 'fill' : 'regular'} className={view === 'config' ? 'text-phosphor' : ''} />
          <span className="font-medium">Configurações</span>
        </button>
        <div className="flex items-center gap-2 h-10 px-2.5">
          <Avatar profile={profile} size={24} />
          <span className="flex-1 truncate text-[13px]">{profile?.display_name || 'Você'}</span>
<span className="mono text-[10px] text-muted" title="Seus dados ficam neste computador">local</span>
        </div>
      </div>
    </aside>
  );
}
