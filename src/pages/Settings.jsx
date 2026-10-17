import { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwise, Check, ClipboardText, Copy, Desktop, Moon, Sun } from '@phosphor-icons/react';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { cloudImportDoneAt, exportAll, importBackup, describeAdded } from '../data/portability';
import { isSupabaseConfigured } from '../lib/cloudAuth';
import { openFolder, saveJsonFile, openJsonFile, dataDir } from '../lib/native';
import CloudImport from '../components/CloudImport';
import CloudAccountSection from '../components/CloudAccountSection';
import { isAccountMode } from '../lib/cloudConfig';
import { formatDay } from '../lib/time';
import { Database, DownloadSimple, FolderOpen, UploadSimple, CloudArrowDown } from '@phosphor-icons/react';
import { currentVersion, findUpdate, installUpdate } from '../lib/updater';
import { isTauri } from '../lib/native';
import { MIN_INTERVAL, REMINDERS, ensureNotificationPermission, notify, resolveWellness } from '../lib/wellness';
import {
  COLOR_TOKENS, MODES, NOIR, STYLES, THEMES, applyAppearance, effectiveMode, exportTheme, isHex, parseTheme, resolveColors,
} from '../lib/themes';

const MODE_ICON = { escuro: Moon, claro: Sun, sistema: Desktop };
import Logo from '../components/Logo';
import { Label } from '../components/Modal';
import { AvatarPicker } from '../components/Avatar';

export default function Settings() {
  const { profile, updateProfile, reload } = useProfile();
  const { refresh } = useWorkspace();
  const toast = useToast();
  const account = isAccountMode();

  const [name, setName] = useState(profile?.display_name || '');
  const [gitBash, setGitBash] = useState(profile?.git_bash_path || '');
  const [theme, setTheme] = useState(profile?.theme || 'noir');
  const [style, setStyle] = useState(profile?.style || 'moderno');
  const [mode, setMode] = useState(profile?.mode || 'escuro');
  // custom_colors guarda { name, void, surface, ..., light: { ... } } do tema do usuário
  const [custom, setCustom] = useState(() => profile?.custom_colors || { name: 'Meu tema', ...NOIR.colors });
  // qual paleta do personalizado está sendo editada; null = a do modo atual
  const [editing, setEditing] = useState(null);
  const palette = editing || effectiveMode(mode);
  const [hexDraft, setHexDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState('');
  const [updateState, setUpdateState] = useState('idle'); // idle | checking | none | available | installing
  const [found, setFound] = useState(null);
  useEffect(() => {
    currentVersion().then(setVersion);
  }, []);

  async function checkUpdate() {
    setUpdateState('checking');
    const u = await findUpdate();
    setFound(u);
    setUpdateState(u ? 'available' : 'none');
  }

  async function runUpdate() {
    setUpdateState('installing');
    try {
      await installUpdate(found);
    } catch (err) {
      toast(`Não consegui atualizar: ${err?.message || err}`, 'error');
      setUpdateState('available');
    }
  }

  // ─── dados ───
  const [dataPath, setDataPath] = useState('');
  const [importedAt, setImportedAt] = useState(null);
  const [cloudOpen, setCloudOpen] = useState(false);
  useEffect(() => {
    dataDir().then(setDataPath).catch(() => {});
    cloudImportDoneAt().then(setImportedAt).catch(() => {});
  }, []);

  async function handleExport() {
    try {
      const json = await exportAll(version);
      const stamp = new Date().toISOString().slice(0, 10);
      const saved = await saveJsonFile(`gwen-backup-${stamp}.json`, json);
      if (saved) toast('Backup salvo.');
    } catch (err) {
      toast(`Não consegui salvar o backup: ${err?.message || err}`, 'error');
    }
  }

  async function handleImportBackup() {
    try {
      const text = await openJsonFile();
      if (!text) return;
      const added = await importBackup(text);
      await Promise.all([refresh(), reload()]);
      toast(`Backup importado: ${describeAdded(added)}.`);
    } catch (err) {
      toast(err?.message || String(err), 'error');
    }
  }

  const [wellness, setWellness] = useState(() => resolveWellness(profile?.wellness));
  const dirtyWellness = JSON.stringify(wellness) !== JSON.stringify(resolveWellness(profile?.wellness));
  const setReminder = (kind, patch) =>
    setWellness((w) => ({ ...w, reminders: { ...w.reminders, [kind]: { ...w.reminders[kind], ...patch } } }));

  async function toggleWellness(on) {
    setWellness((w) => ({ ...w, enabled: on }));
    if (on && !(await ensureNotificationPermission())) {
      toast('Sem permissão de notificação: os lembretes vão aparecer só dentro da G.W.E.N.', 'error');
    }
  }

  const paletteColors = resolveColors('custom', custom, palette);

  // pré-visualização ao vivo (editando a paleta clara, mostra o app claro)
  useEffect(() => {
    applyAppearance({ theme, style, custom, mode: theme === 'custom' && editing ? editing : mode });
  }, [theme, style, custom, mode, editing]);

  // saiu sem salvar: volta para o que está no perfil
  const profileRef = useRef(profile);
  profileRef.current = profile;
  useEffect(
    () => () => {
      const p = profileRef.current;
      if (p) applyAppearance({ theme: p.theme, style: p.style, custom: p.custom_colors, mode: p.mode });
    },
    [],
  );

  const dirtyAppearance =
    theme !== (profile?.theme || 'noir') ||
    style !== (profile?.style || 'moderno') ||
    mode !== (profile?.mode || 'escuro') ||
    (theme === 'custom' && JSON.stringify(custom) !== JSON.stringify(profile?.custom_colors || null));

  async function save(patch, message) {
    setSaving(true);
    try {
      await updateProfile(patch);
      toast(message);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const draftKey = (key) => `${palette}.${key}`;

  function setToken(key, value) {
    setHexDraft((d) => ({ ...d, [draftKey(key)]: value }));
    if (!isHex(value)) return;
    if (palette === 'escuro') {
      setCustom((c) => ({ ...c, [key]: value }));
    } else {
      // a primeira edição da paleta clara congela o que estava sendo mostrado
      setCustom((c) => ({ ...c, light: { ...resolveColors('custom', c, 'claro'), ...c.light, [key]: value } }));
    }
  }

  /** Texto sobre um acento: 'auto' (pelo contraste), 'light' ou 'dark' */
  function setOnColor(key, choice) {
    const hex = choice === 'light' ? '#FFFFFF' : choice === 'dark' ? '#0A0A0B' : null;
    const apply = (obj) => {
      const next = { ...obj };
      if (hex) next[key] = hex;
      else delete next[key];
      return next;
    };
    if (palette === 'escuro') setCustom((c) => apply(c));
    else setCustom((c) => ({ ...c, light: apply({ ...resolveColors('custom', c, 'claro'), ...c.light }) }));
  }

  const onChoice = (key) => {
    const v = String(paletteColors[key] || '').toUpperCase();
    return v === '#FFFFFF' ? 'light' : v === '#0A0A0B' ? 'dark' : 'auto';
  };

  function resetToNoir() {
    setCustom({ name: custom.name || 'Meu tema', ...NOIR.colors });
    setHexDraft({});
  }

  async function copyTheme() {
    const json = exportTheme(custom.name, resolveColors('custom', custom, 'escuro'), custom.light);
    try {
      await navigator.clipboard.writeText(json);
      toast('Tema copiado em JSON. Cole em qualquer conta da G.W.E.N.');
    } catch {
      window.prompt('Copie o JSON do tema:', json);
    }
  }

  function pasteTheme() {
    const text = window.prompt('Cole o JSON do tema:');
    if (!text) return;
    try {
      const { name: themeName, colors, light } = parseTheme(text);
      const next = { ...NOIR.colors, ...colors, name: themeName || custom.name || 'Meu tema' };
      if (Object.keys(light).length) next.light = light;
      setCustom(next);
      setHexDraft({});
      setTheme('custom');
      toast(`Tema "${next.name}" importado. Salve para manter.`);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[860px] mx-auto px-8 py-7 flex flex-col gap-10">
        <header className="anim-rise">
          <p className="eyebrow mb-1">configurações</p>
          <h1 className="font-display text-2xl font-bold">Do seu jeito.</h1>
        </header>

        {/* PERFIL */}
        <Section title="Perfil" description={account ? 'Seu perfil fica na nuvem, na sua conta.' : 'Seu perfil fica neste computador, sem conta.'}>
          <div className="mb-5">
            <AvatarPicker
              avatar={profile?.avatar}
              name={profile?.display_name}
              disabled={saving}
              onChange={(a) => save({ avatar: a }, a ? 'Foto atualizada.' : 'Foto removida.')}
            />
          </div>
          <div className="flex gap-2 items-end">
            <label className="field flex-1">
              <span className="field-label">Nome</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button
              className="btn btn-ghost"
              disabled={saving || !name.trim() || name === profile?.display_name}
              onClick={() => save({ display_name: name.trim() }, 'Nome atualizado.')}
            >
              <Label>Salvar</Label>
            </button>
          </div>
        </Section>

        {/* APARÊNCIA */}
        <Section title="Aparência" description="Modo, cor e estilo são independentes. As mudanças aparecem na hora; salve para manter.">
          <p className="field-label mb-2.5">Modo</p>
          <div className="segmented mb-7">
            {Object.entries(MODES).map(([id, m]) => {
              const Icon = MODE_ICON[id];
              return (
                <button
                  key={id}
                  className={`inline-flex items-center gap-1.5 ${mode === id ? 'active' : ''}`}
                  onClick={() => {
                    setMode(id);
                    setEditing(null);
                  }}
                >
                  <Icon size={13} weight={mode === id ? 'fill' : 'regular'} /> {m.label}
                </button>
              );
            })}
          </div>

          <p className="field-label mb-2.5">Cores</p>
          <div className="grid grid-cols-2 gap-3 mb-7">
            {Object.entries(THEMES).map(([id, t]) => {
              const colors = resolveColors(id, custom, effectiveMode(mode));
              return (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`card text-left p-3.5 flex flex-col justify-start ${theme === id ? 'is-active' : ''}`}
                >
                  <div
                    className="h-16 rounded-ui-sm mb-3 flex items-center justify-center gap-1.5 border border-rule"
                    style={{ background: colors.void }}
                  >
                    {['surface', 'phosphor', 'ember', 'bone'].map((k) => (
                      <span key={k} className="w-5 h-5 rounded-full border border-black/20" style={{ background: colors[k] }} />
                    ))}
                  </div>
                  <span className="flex items-center justify-between">
                    <span className="font-display font-semibold">
                      {t.label}
                      {id === 'custom' && custom.name && (
                        <span className="mono text-[11px] text-muted font-normal ml-2">{custom.name}</span>
                      )}
                    </span>
                    {theme === id && <Check size={14} className="text-phosphor" weight="bold" />}
                  </span>
                  <span className="block text-[12px] text-muted mt-1 leading-snug">{t.description}</span>
                </button>
              );
            })}
          </div>

          {theme === 'custom' && (
            <div className="card p-4 mb-7 anim-rise">
              <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
                <label className="field w-[220px]">
                  <span className="field-label">Nome do tema</span>
                  <input
                    className="input"
                    value={custom.name || ''}
                    onChange={(e) => {
                      setCustom((c) => ({ ...c, name: e.target.value }));
                      setHexDraft((d) => ({ ...d, name: e.target.value }));
                    }}
                    placeholder="Meu tema"
                  />
                </label>
                <div className="segmented">
                  {['escuro', 'claro'].map((p) => (
                    <button key={p} className={palette === p ? 'active' : ''} onClick={() => setEditing(p)}>
                      Paleta {p === 'escuro' ? 'escura' : 'clara'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button className="btn btn-quiet btn-sm" onClick={pasteTheme} title="Importar um tema em JSON">
                    <ClipboardText size={13} /> colar JSON
                  </button>
                  <button className="btn btn-quiet btn-sm" onClick={copyTheme} title="Copiar este tema em JSON">
                    <Copy size={13} /> copiar JSON
                  </button>
                  <button className="btn btn-quiet btn-sm" onClick={resetToNoir}>
                    <ArrowCounterClockwise size={12} /> recomeçar do Noir
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 max-[900px]:grid-cols-2 gap-x-4 gap-y-3">
                {COLOR_TOKENS.map(({ key, label, hint }) => (
                  <label key={key} className="field">
                    <span className="field-label" title={hint}>{label}</span>
                    <span className="flex gap-2">
                      <input
                        type="color"
                        className="w-9 h-9 shrink-0 rounded-ui-sm border border-rule bg-transparent cursor-pointer p-0.5"
                        value={isHex(paletteColors[key]) && paletteColors[key].length === 7 ? paletteColors[key] : '#000000'}
                        onChange={(e) => setToken(key, e.target.value)}
                      />
                      <input
                        className={`input mono text-[12px] ${isHex(hexDraft[draftKey(key)] ?? paletteColors[key]) ? '' : '!border-ember'}`}
                        value={hexDraft[draftKey(key)] ?? paletteColors[key] ?? ''}
                        onChange={(e) => setToken(key, e.target.value.trim())}
                        spellCheck={false}
                      />
                    </span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 max-[900px]:grid-cols-1 gap-x-4 gap-y-3 mt-5">
                {[
                  { key: 'onPhosphor', label: 'Texto sobre o acento principal' },
                  { key: 'onEmber', label: 'Texto sobre o acento secundário' },
                ].map(({ key, label }) => (
                  <div key={key} className="field">
                    <span className="field-label">{label}</span>
                    <div className="segmented">
                      {[
                        ['auto', 'Automático'],
                        ['light', 'Claro'],
                        ['dark', 'Escuro'],
                      ].map(([id, text]) => (
                        <button key={id} type="button" className={onChoice(key) === id ? 'active' : ''} onClick={() => setOnColor(key, id)}>
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {palette === 'claro' && !custom.light && (
                <p className="text-[12px] text-muted mt-4">
                  Sem paleta clara própria, o modo claro usa os seus acentos sobre o papel do Noir claro. Edite qualquer cor para criar a sua.
                </p>
              )}
            </div>
          )}

          <p className="field-label mb-2.5">Estilo</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Object.entries(STYLES).map(([id, s]) => (
              <button key={id} onClick={() => setStyle(id)} className={`card text-left p-3.5 flex flex-col justify-start ${style === id ? 'is-active' : ''}`}>
                <span className="flex items-center justify-between">
                  <span className="font-display font-semibold">{s.label}</span>
                  {style === id && <Check size={14} className="text-phosphor" weight="bold" />}
                </span>
                <span className="block text-[12px] text-muted mt-1">{s.description}</span>
              </button>
            ))}
          </div>

          {/* prévia */}
          <div className="card p-4 flex items-center gap-4 mb-5">
            <Logo size={40} />
            <div className="flex-1">
              <p className="font-display font-semibold">Prévia</p>
              <p className="text-[12px] text-muted">É assim que botões e barras ficam com essa combinação.</p>
            </div>
            <div className="w-40 energy-track">
              <div className="energy-fill" style={{ width: '62%' }} />
            </div>
            <button className="btn btn-primary btn-sm"><Label>Começar agora</Label></button>
          </div>

          <div className="flex justify-end gap-2">
            <button
              className="btn btn-primary"
              disabled={saving || !dirtyAppearance}
              onClick={() =>
                save(
                  { theme, style, mode, custom_colors: theme === 'custom' ? custom : profile?.custom_colors ?? null },
                  'Aparência salva.',
                )
              }
            >
              <Label>Salvar aparência</Label>
            </button>
          </div>
        </Section>

        {/* MODO SAÚDE */}
        <Section
          title="Modo saúde"
          description="Lembretes de água, alongamento e descanso dos olhos. Contam tempo de trabalho, não relógio: param nas pausas e com o app fechado."
        >
          <label className="card p-4 flex items-center gap-4 cursor-pointer mb-4">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[var(--c-phosphor)]"
              checked={wellness.enabled}
              onChange={(e) => toggleWellness(e.target.checked)}
            />
            <span className="flex-1">
              <span className="block font-display font-semibold">Ativar modo saúde</span>
              <span className="block text-[12px] text-muted mt-0.5">Desligado, a G.W.E.N. não interrompe você com nada.</span>
            </span>
          </label>

          {wellness.enabled && (
            <div className="anim-rise">
              <div className="flex flex-col gap-2 mb-4">
                {Object.entries(REMINDERS).map(([kind, r]) => {
                  const cfg = wellness.reminders[kind];
                  const Icon = r.icon;
                  return (
                    <div key={kind} className={`card p-3.5 flex items-center gap-4 ${cfg.on ? '' : 'opacity-60'}`}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[var(--c-phosphor)]"
                        checked={cfg.on}
                        onChange={(e) => setReminder(kind, { on: e.target.checked })}
                        aria-label={`Lembrete de ${r.label}`}
                      />
                      <Icon size={18} className="text-phosphor" />
                      <span className="flex-1">
                        <span className="block font-medium">{r.label}</span>
                        <span className="block text-[12px] text-muted">{r.body}</span>
                      </span>
                      <span className="flex items-center gap-2 text-[12px] text-muted whitespace-nowrap">
                        a cada
                        <input
                          type="number"
                          min={MIN_INTERVAL}
                          step="5"
                          className="input w-20 mono text-[12px]"
                          value={cfg.every}
                          onChange={(e) => setReminder(kind, { every: Math.max(MIN_INTERVAL, Number(e.target.value) || MIN_INTERVAL) })}
                          disabled={!cfg.on}
                        />
                        min
                      </span>
                    </div>
                  );
                })}
              </div>
              <label className="flex items-center gap-2.5 text-[13px] cursor-pointer mb-1">
                <input
                  type="checkbox"
                  className="accent-[var(--c-phosphor)]"
                  checked={wellness.onlyInSession}
                  onChange={(e) => setWellness((w) => ({ ...w, onlyInSession: e.target.checked }))}
                />
                Contar só durante sessões (com o app aberto sem sessão, os lembretes ficam parados)
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            {wellness.enabled && (
              <button className="btn btn-ghost" onClick={() => notify(REMINDERS.agua.title, 'Assim vai chegar a notificação no Windows.')}>
                <Label>Testar notificação</Label>
              </button>
            )}
            <button
              className="btn btn-primary"
              disabled={saving || !dirtyWellness}
              onClick={() => save({ wellness }, wellness.enabled ? 'Modo saúde salvo.' : 'Modo saúde desligado.')}
            >
              <Label>Salvar modo saúde</Label>
            </button>
          </div>
        </Section>

        {/* DADOS */}
        <Section title="Dados" description={account ? 'Seus dados ficam na nuvem. O backup em JSON continua disponível.' : 'Tudo fica neste computador. Atualizar ou desinstalar a G.W.E.N. não apaga nada.'}>
          <div className="card p-4 flex items-center gap-4 mb-3">
            <Database size={20} className="text-phosphor shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">Pasta de dados</p>
              <p className="mono text-[11px] text-muted truncate" title={dataPath}>{dataPath || 'no navegador, os dados ficam no armazenamento do próprio navegador'}</p>
            </div>
            {dataPath && (
              <button className="btn btn-ghost btn-sm" onClick={() => openFolder('explorer', dataPath)}>
                <FolderOpen size={13} />
                <Label>Abrir</Label>
              </button>
            )}
          </div>
          <p className="text-[12px] text-muted mb-4">
            A cada versão nova, a G.W.E.N. guarda uma cópia do banco na pasta <span className="mono text-bone">backups</span> antes de abrir.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-ghost" onClick={handleExport}>
              <DownloadSimple size={14} />
              <Label>Exportar backup (JSON)</Label>
            </button>
            <button className="btn btn-ghost" onClick={handleImportBackup}>
              <UploadSimple size={14} />
              <Label>Importar backup</Label>
            </button>
            {isSupabaseConfigured && !account && (
              <button className="btn btn-ghost" onClick={() => setCloudOpen(true)}>
                <CloudArrowDown size={14} />
                <Label>Importar da nuvem</Label>
              </button>
            )}
          </div>
          {isSupabaseConfigured && !account && importedAt && (
            <p className="text-[12px] text-muted mt-3">Última importação da nuvem: {formatDay(importedAt)}</p>
          )}
          <p className="text-[12px] text-muted mt-3">Importar nunca apaga nada: só entra o que ainda não existe aqui.</p>
        </Section>

        {/* CONTA NA NUVEM */}
        <Section title="Conta na nuvem" description="Opcional e avançado, para quem tem o próprio projeto Supabase. Não é preciso para usar a G.W.E.N.">
          <CloudAccountSection />
        </Section>

        {/* SISTEMA */}
        <Section title="Sistema" description="Onde a G.W.E.N. encontra os programas do seu computador.">
          <div className="flex gap-2 items-end">
            <label className="field flex-1">
              <span className="field-label">Caminho do Git Bash</span>
              <input
                className="input mono text-[12px]"
                value={gitBash}
                onChange={(e) => setGitBash(e.target.value)}
                placeholder="C:\Program Files\Git\git-bash.exe"
              />
            </label>
            <button
              className="btn btn-ghost"
              disabled={saving || gitBash === (profile?.git_bash_path || '')}
              onClick={() => save({ git_bash_path: gitBash.trim() || null }, 'Caminho salvo.')}
            >
              <Label>Salvar</Label>
            </button>
          </div>
          <p className="text-[12px] text-muted mt-2">
            Deixe vazio para usar o padrão. O VS Code precisa do comando <span className="mono text-bone">code</span> no PATH
            (vem ativado na instalação padrão).
          </p>
        </Section>

        {/* SOBRE: autoria e licença (LICENSE, NOTICE.md) */}
        <Section title="Sobre">
          <div className="card p-4 flex items-center gap-4">
            <Logo size={40} charge={1} />
            <div className="flex-1">
              <p className="font-display font-semibold">G.W.E.N. <span className="mono text-[11px] text-muted font-normal">v{version}</span></p>
              <p className="text-[12px] text-muted mt-0.5">Gestão de Wellness, Eficiência e Navegação</p>
            </div>
            <div className="text-right">
              <p className="text-[12px]">por Samara Silvia (@devs_sam)</p>
              <p className="mono text-[11px] text-muted mt-0.5">© 2026 · todos os direitos reservados</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <p className="text-[12px] text-muted">
              {!isTauri && 'Atualizações só funcionam no app instalado.'}
              {isTauri && updateState === 'idle' && 'A G.W.E.N. procura versões novas sozinha ao abrir. Seus dados não são apagados ao atualizar.'}
              {updateState === 'checking' && 'Procurando...'}
              {updateState === 'none' && 'Você já está na versão mais recente.'}
              {updateState === 'available' && found && `Versão ${found.version} disponível.`}
              {updateState === 'installing' && 'Baixando e instalando. O app reinicia sozinho.'}
            </p>
            {isTauri && (updateState === 'available' ? (
              <button className="btn btn-primary btn-sm" onClick={runUpdate}><Label>Atualizar e reiniciar</Label></button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={checkUpdate} disabled={updateState === 'checking' || updateState === 'installing'}>
                <Label>Procurar atualização</Label>
              </button>
            ))}
          </div>
        </Section>
      </div>
      {cloudOpen && (
        <CloudImport
          onClose={() => setCloudOpen(false)}
          onImported={async () => {
            await Promise.all([refresh(), reload()]);
            setImportedAt(new Date().toISOString());
          }}
        />
      )}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="anim-rise">
      <div className="mb-4 pb-3 border-b border-rule">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {description && <p className="text-[13px] text-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}
