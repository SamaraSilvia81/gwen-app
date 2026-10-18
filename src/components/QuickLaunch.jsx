import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowBendDownRight, Lightning, MagnifyingGlass, Stop } from '@phosphor-icons/react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { projectFronts } from '../lib/projectModel';

/** Evento para abrir a paleta de outros lugares (botão da topbar) */
export const OPEN_QUICK_LAUNCH = 'gwen:quick-launch';
export const openQuickLaunch = () => window.dispatchEvent(new Event(OPEN_QUICK_LAUNCH));

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Ctrl + K: digita parte do nome, Enter começa a sessão (abre pastas e links).
 * Projetos com frentes aparecem uma vez por frente.
 */
export default function QuickLaunch() {
  const { projects, activeSession, launchProject, requestEnd, notes } = useWorkspace();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_QUICK_LAUNCH, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_QUICK_LAUNCH, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  const items = useMemo(() => {
    const out = [];
    if (activeSession) out.push({ key: 'end', kind: 'end', label: 'Encerrar a sessão atual' });
    const list = [...projects]
      .filter((p) => p.status !== 'concluido')
      .sort((a, b) => String(b.last_opened_at || '').localeCompare(String(a.last_opened_at || '')));
    for (const p of list) {
      const fronts = projectFronts(p);
      if (fronts.length > 1) for (const f of fronts) out.push({ key: `${p.id}::${f}`, kind: 'launch', project: p, front: f, label: `${p.name} · ${f}` });
      else out.push({ key: p.id, kind: 'launch', project: p, front: fronts[0] || null, label: p.name });
    }
    const q = fold(query.trim());
    return q ? out.filter((i) => fold(i.label).includes(q)) : out;
  }, [projects, activeSession, query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (!open) return null;

  async function choose(item) {
    if (!item) return;
    setOpen(false);
    if (item.kind === 'end') return requestEnd();
    try {
      await launchProject(item.project, item.front);
    } catch (err) {
      toast(err?.message || String(err), 'error');
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(items[index]);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center pt-[14vh] px-6 anim-fade"
      style={{ background: 'var(--c-void-veil)' }}
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="card w-full max-w-[560px] shadow-2xl anim-rise overflow-hidden">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-rule">
          <MagnifyingGlass size={16} className="text-muted" />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted"
            placeholder="Começar qual projeto?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd className="mono text-[10px] text-muted border border-rule rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <ul ref={listRef} className="max-h-[50vh] overflow-y-auto p-1.5" role="listbox">
          {items.map((item, i) => {
            const note = item.project && notes.get(item.project.id)?.note;
            const running = item.project && activeSession?.project_id === item.project.id && (activeSession.front || null) === (item.front || null);
            return (
              <li key={item.key}>
                <button
                  role="option"
                  aria-selected={i === index}
                  data-selected={i === index}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => choose(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-ui-sm text-left ${i === index ? 'bg-[var(--c-phosphor-12)]' : ''}`}
                >
                  {item.kind === 'end' ? <Stop size={14} weight="fill" className="text-phosphor" /> : <Lightning size={14} weight="fill" className="text-phosphor" />}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] truncate">{item.label}</span>
                    {note && (
                      <span className="flex items-center gap-1 text-[11.5px] text-muted truncate">
                        <ArrowBendDownRight size={11} /> {note}
                      </span>
                    )}
                  </span>
                  {running && <span className="mono text-[10px] text-phosphor">em andamento</span>}
                </button>
              </li>
            );
          })}
          {items.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted">Nenhum projeto com esse nome.</li>}
        </ul>
        <p className="mono text-[10.5px] text-muted px-4 py-2 border-t border-rule">↑ ↓ para escolher · Enter começa · Ctrl + K abre e fecha</p>
      </div>
    </div>,
    document.body,
  );
}
