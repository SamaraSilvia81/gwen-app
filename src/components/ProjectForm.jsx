import { useEffect, useState } from 'react';
import { BookOpenText, FolderOpen, LinkSimple, Plus, Trash } from '@phosphor-icons/react';
import Modal, { Label } from './Modal';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { FOLDER_ACTIONS, gitInfo, isTauri, pickFolder, readReadme, remoteToWebUrl, repoHostLabel } from '../lib/native';
import { summarizeReadme } from '../lib/readme';
import { STATUS } from '../lib/stats';
import { folderActions, projectFronts } from '../lib/projectModel';
import { hasContent, readDraft, writeDraft } from '../lib/projectDraft';

const emptyFolder = () => ({ label: '', path: '', actions: ['vscode'], on_launch: true, front: '', command: '' });
const emptyLink = () => ({ label: '', url: '', on_launch: false, front: '' });

const normalize = (url) => String(url || '').trim().replace(/^https?:\/\//, '').replace(/\.git$|\/$/g, '').toLowerCase();

/** Nome da pasta a partir do caminho, para sugerir o rótulo */
const baseName = (path) => path.split(/[\\/]/).filter(Boolean).pop() || '';

export default function ProjectForm({ project, defaultCategory, onClose }) {
  const { categories, saveProject, deleteProject } = useWorkspace();
  const toast = useToast();
  const [initial] = useState(() => {
    const fresh = {
      name: project?.name || '',
      description: project?.description || '',
      status: project?.status || 'ideia',
      category_id: project?.category_id || (defaultCategory && !['all', 'none'].includes(defaultCategory) ? defaultCategory : ''),
      folders: project?.folders?.length
        ? project.folders.map((f) => ({ ...f, actions: folderActions(f), front: f.front || '', command: f.command || '' }))
        : [emptyFolder()],
      links: (project?.links || []).map((l) => ({ ...l, front: l.front || '' })),
    };
    if (project) return { draft: fresh, restored: false };
    const saved = readDraft();
    if (saved && hasContent({ ...fresh, ...saved })) return { draft: { ...fresh, ...saved }, restored: true };
    return { draft: fresh, restored: false };
  });
  const [draft, setDraft] = useState(initial.draft);
  const [restored, setRestored] = useState(initial.restored);
  const [busy, setBusy] = useState(false);

  // só o projeto novo vira rascunho; edição de projeto existente não
  useEffect(() => {
    if (project) return;
    writeDraft(hasContent(draft) ? draft : null);
  }, [draft, project]);

  function discardDraft() {
    writeDraft(null);
    setRestored(false);
    setDraft({
      name: '',
      description: '',
      status: 'ideia',
      category_id: defaultCategory && !['all', 'none'].includes(defaultCategory) ? defaultCategory : '',
      folders: [emptyFolder()],
      links: [],
    });
  }

  const fronts = projectFronts(draft);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setFolder = (i, patch) => set({ folders: draft.folders.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  const setLink = (i, patch) => set({ links: draft.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });

  function toggleAction(i, action) {
    const current = folderActions(draft.folders[i]);
    const next = current.includes(action) ? current.filter((a) => a !== action) : [...current, action];
    if (next.length) setFolder(i, { actions: next });
  }

  /** Escolher a pasta preenche o rótulo, o nome do projeto (se vazio) e,
   *  se for um repositório Git com remoto, já cria o link do repositório. */
  async function choose(i) {
    const path = await pickFolder();
    if (!path) return;
    const f = draft.folders[i];
    const info = await gitInfo(path).catch(() => null);
    const repoUrl = remoteToWebUrl(info?.remote_url);
    const addLink = repoUrl && !draft.links.some((l) => normalize(l.url) === normalize(repoUrl));
    const summary = draft.description.trim() ? '' : summarizeReadme(await readReadme(path).catch(() => null));
    setDraft((d) => ({
      ...d,
      description: d.description.trim() || summary || d.description,
      name: d.name.trim() ? d.name : baseName(path),
      folders: d.folders.map((x, idx) => (idx === i ? { ...x, path, label: x.label || baseName(path) } : x)),
      links: addLink ? [...d.links, { label: repoHostLabel(repoUrl), url: repoUrl, on_launch: false, front: f.front || '' }] : d.links,
    }));
    if (addLink) toast(`Link do repositório adicionado: ${repoUrl.replace('https://', '')}`);
    if (summary) toast('Descrição preenchida com o README.');
  }

  /** Botão "Ler do README": procura o README nas pastas do projeto, na ordem */
  async function fillFromReadme() {
    for (const f of draft.folders) {
      if (!f.path.trim()) continue;
      const summary = summarizeReadme(await readReadme(f.path.trim()).catch(() => null));
      if (summary) {
        set({ description: summary });
        toast(`Descrição lida do README de ${f.label || baseName(f.path)}.`);
        return;
      }
    }
    toast('Não achei um README com texto nas pastas do projeto.', 'error');
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
      if (!project) writeDraft(null);
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
        {restored && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-ui-sm border border-rule text-[12px]">
            <span className="flex-1 text-muted">Rascunho restaurado: você saiu sem salvar da última vez.</span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={discardDraft}>
              <Label>Descartar rascunho</Label>
            </button>
          </div>
        )}
        <datalist id="gwen-frentes">
          {fronts.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
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
          <span className="flex items-center justify-between">
            <span className="field-label">Descrição</span>
            {isTauri && draft.folders.some((f) => f.path.trim()) && (
              <button type="button" className="btn btn-quiet btn-sm -my-1" onClick={fillFromReadme} title="Usar o primeiro parágrafo do README da pasta">
                <BookOpenText size={13} />
                <Label>Ler do README</Label>
              </button>
            )}
          </span>
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
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <p className="field-label">Pastas</p>
              <p className="text-[12px] text-muted mt-1">
                Marque com o que cada pasta abre. A frente é opcional: use para separar partes do projeto (ex.: Landing e Plataforma).
              </p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => set({ folders: [...draft.folders, emptyFolder()] })}>
              <Plus size={13} /> <Label>Pasta</Label>
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {draft.folders.map((f, i) => {
              const actions = folderActions(f);
              return (
                <div key={i} className="flex flex-col gap-2 p-2.5 rounded-ui-sm border border-rule">
                  <div className="grid grid-cols-[130px_1fr_auto_auto] gap-2 items-center">
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
                    <button
                      type="button"
                      className="btn btn-quiet btn-icon btn-sm"
                      onClick={() => set({ folders: draft.folders.filter((_, idx) => idx !== i) })}
                      aria-label="Remover pasta"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="segmented" role="group" aria-label="Abrir com">
                      {Object.entries(FOLDER_ACTIONS).map(([id, a]) => (
                        <button
                          type="button"
                          key={id}
                          className={actions.includes(id) ? 'active' : ''}
                          aria-pressed={actions.includes(id)}
                          onClick={() => toggleAction(i, id)}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                    <input
                      className="input w-[150px] text-[12px]"
                      list="gwen-frentes"
                      value={f.front}
                      onChange={(e) => setFolder(i, { front: e.target.value })}
                      placeholder="Frente (todas)"
                      aria-label="Frente"
                    />
                    <label className="flex items-center gap-1.5 text-[12px] text-muted whitespace-nowrap cursor-pointer ml-auto">
                      <input
                        type="checkbox"
                        className="accent-[var(--c-phosphor)]"
                        checked={f.on_launch}
                        onChange={(e) => setFolder(i, { on_launch: e.target.checked })}
                      />
                      abrir no Começar agora
                    </label>
                  </div>
                  <input
                    className="input mono text-[12px]"
                    value={f.command}
                    onChange={(e) => setFolder(i, { command: e.target.value })}
                    placeholder="Comando ao começar (opcional), ex.: yarn dev"
                    aria-label="Comando ao começar"
                    title="Roda num PowerShell novo, dentro desta pasta, quando o Começar agora abrir a pasta"
                  />
                </div>
              );
            })}
            {draft.folders.length === 0 && <p className="text-[12px] text-muted">Nenhuma pasta. Projetos sem pasta ainda contam tempo.</p>}
          </div>
        </section>

        {/* LINKS */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="field-label">Links</p>
              <p className="text-[12px] text-muted mt-1">Repositório, documentos, Figma, Drive, deploy... O do repositório entra sozinho ao escolher a pasta.</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ links: [...draft.links, emptyLink()] })}>
              <LinkSimple size={13} /> <Label>Link</Label>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {draft.links.map((l, i) => (
              <div key={i} className="grid grid-cols-[130px_1fr_110px_auto_auto] gap-2 items-center">
                <input className="input" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} placeholder="Documento" />
                <input className="input mono text-[12px]" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} placeholder="https://..." />
                <input
                  className="input text-[12px]"
                  list="gwen-frentes"
                  value={l.front}
                  onChange={(e) => setLink(i, { front: e.target.value })}
                  placeholder="Frente"
                  aria-label="Frente"
                />
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
