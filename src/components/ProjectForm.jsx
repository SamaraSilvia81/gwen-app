import { useState } from 'react';
import { FolderOpen, LinkSimple, Plus, Trash } from '@phosphor-icons/react';
import Modal, { Label } from './Modal';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { FOLDER_ACTIONS, pickFolder } from '../lib/native';
import { STATUS } from '../lib/stats';

const emptyFolder = () => ({ label: '', path: '', action: 'vscode', on_launch: true });
const emptyLink = () => ({ label: '', url: '', on_launch: false });

/** Nome da pasta a partir do caminho, para sugerir o rótulo */
const baseName = (path) => path.split(/[\\/]/).filter(Boolean).pop() || '';

export default function ProjectForm({ project, defaultCategory, onClose }) {
  const { categories, saveProject, deleteProject } = useWorkspace();
  const toast = useToast();
  const [draft, setDraft] = useState(() => ({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'ideia',
    category_id: project?.category_id || (defaultCategory && !['all', 'none'].includes(defaultCategory) ? defaultCategory : ''),
    folders: project?.folders?.length ? project.folders : [emptyFolder()],
    links: project?.links || [],
  }));
  const [busy, setBusy] = useState(false);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setFolder = (i, patch) => set({ folders: draft.folders.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  const setLink = (i, patch) => set({ links: draft.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });

  async function choose(i) {
    const path = await pickFolder();
    if (!path) return;
    const f = draft.folders[i];
    setFolder(i, { path, label: f.label || baseName(path) });
    if (!draft.name.trim()) set({ name: baseName(path) });
  }

  async function handleSave(e) {
    e?.preventDefault();
    if (!draft.name.trim()) {
      toast('Dê um nome ao projeto.', 'error');
      return;
    }
    setBusy(true);
    try {
      await saveProject(draft, project);
      toast(project ? 'Projeto atualizado.' : 'Projeto criado.');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir "${project.name}"? As sessões de tempo dele também serão apagadas. Não dá para desfazer.`)) return;
    setBusy(true);
    try {
      await deleteProject(project.id);
      toast('Projeto excluído.');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
      setBusy(false);
    }
  }

  return (
    <Modal
      eyebrow={project ? 'editar projeto' : 'novo projeto'}
      title={project ? project.name : 'O que vamos organizar?'}
      onClose={onClose}
      width={720}
      footer={
        <>
          {project && (
            <button className="btn btn-danger mr-auto" onClick={handleDelete} disabled={busy}>
              <Trash size={14} />
              <Label>Excluir</Label>
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            <Label>Cancelar</Label>
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={busy}>
            <Label>{project ? 'Salvar' : 'Criar projeto'}</Label>
          </button>
        </>
      }
    >
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <div className="grid grid-cols-[1fr_200px] gap-4">
          <label className="field">
            <span className="field-label">Nome</span>
            <input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="CuraData" autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Categoria</span>
            <select className="input" value={draft.category_id} onChange={(e) => set({ category_id: e.target.value })}>
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <span className="field-label">Status</span>
          <div className="segmented">
            {Object.entries(STATUS).map(([id, s]) => (
              <button type="button" key={id} className={draft.status === id ? 'active' : ''} onClick={() => set({ status: id })}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">Descrição</span>
          <textarea
            className="input"
            rows={2}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Do que se trata, em que pé está..."
          />
        </label>

        {/* PASTAS */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="field-label">Pastas</p>
              <p className="text-[12px] text-muted mt-1">Marque "abrir junto" no que deve abrir com o Começar agora.</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ folders: [...draft.folders, emptyFolder()] })}>
              <Plus size={13} /> <Label>Pasta</Label>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {draft.folders.map((f, i) => (
              <div key={i} className="grid grid-cols-[130px_1fr_auto_120px_auto_auto] gap-2 items-center">
                <input className="input" value={f.label} onChange={(e) => setFolder(i, { label: e.target.value })} placeholder="Rótulo" />
                <input
                  className="input mono text-[12px]"
                  value={f.path}
                  onChange={(e) => setFolder(i, { path: e.target.value })}
                  placeholder="C:\Projetos\..."
                />
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => choose(i)} title="Escolher pasta" aria-label="Escolher pasta">
                  <FolderOpen size={15} />
                </button>
                <select className="input" value={f.action} onChange={(e) => setFolder(i, { action: e.target.value })}>
                  {Object.entries(FOLDER_ACTIONS).map(([id, a]) => (
                    <option key={id} value={id}>{a.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-[12px] text-muted whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-[var(--c-phosphor)]"
                    checked={f.on_launch}
                    onChange={(e) => setFolder(i, { on_launch: e.target.checked })}
                  />
                  abrir junto
                </label>
                <button
                  type="button"
                  className="btn btn-quiet btn-icon btn-sm"
                  onClick={() => set({ folders: draft.folders.filter((_, idx) => idx !== i) })}
                  aria-label="Remover pasta"
                >
                  <Trash size={13} />
                </button>
              </div>
            ))}
            {draft.folders.length === 0 && <p className="text-[12px] text-muted">Nenhuma pasta. Projetos sem pasta ainda contam tempo.</p>}
          </div>
        </section>

        {/* LINKS */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="field-label">Links</p>
              <p className="text-[12px] text-muted mt-1">Repositório, documentos, Figma, Drive, deploy...</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ links: [...draft.links, emptyLink()] })}>
              <LinkSimple size={13} /> <Label>Link</Label>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {draft.links.map((l, i) => (
              <div key={i} className="grid grid-cols-[130px_1fr_auto_auto] gap-2 items-center">
                <input className="input" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} placeholder="Documento" />
                <input className="input mono text-[12px]" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} placeholder="https://..." />
                <label className="flex items-center gap-1.5 text-[12px] text-muted whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-[var(--c-phosphor)]"
                    checked={l.on_launch}
                    onChange={(e) => setLink(i, { on_launch: e.target.checked })}
                  />
                  abrir junto
                </label>
                <button
                  type="button"
                  className="btn btn-quiet btn-icon btn-sm"
                  onClick={() => set({ links: draft.links.filter((_, idx) => idx !== i) })}
                  aria-label="Remover link"
                >
                  <Trash size={13} />
                </button>
              </div>
            ))}
            {draft.links.length === 0 && <p className="text-[12px] text-muted">Nenhum link ainda.</p>}
          </div>
        </section>
      </form>
    </Modal>
  );
}
