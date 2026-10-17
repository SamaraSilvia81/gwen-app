import { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwise, Check, ClipboardText, Copy } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { COLOR_TOKENS, NOIR, STYLES, THEMES, applyAppearance, exportTheme, isHex, parseTheme, resolveColors } from '../lib/themes';
import Logo from '../components/Logo';
import { Label } from '../components/Modal';

export default function Settings() {
  const { profile, user, updateProfile } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(profile?.display_name || '');
  const [gitBash, setGitBash] = useState(profile?.git_bash_path || '');
  const [theme, setTheme] = useState(profile?.theme || 'noir');
  const [style, setStyle] = useState(profile?.style || 'moderno');
  // custom_colors guarda { name, void, surface, ... } do tema do usuário
  const [custom, setCustom] = useState(() => profile?.custom_colors || { name: 'Meu tema', ...NOIR.colors });
  const [hexDraft, setHexDraft] = useState(() => profile?.custom_colors || { name: 'Meu tema', ...NOIR.colors });
  const [saving, setSaving] = useState(false);

  // pré-visualização ao vivo
  useEffect(() => {
    applyAppearance({ theme, style, custom });
  }, [theme, style, custom]);

  // saiu sem salvar: volta para o que está no perfil
  const profileRef = useRef(profile);
  profileRef.current = profile;
  useEffect(
    () => () => {
      const p = profileRef.current;
      if (p) applyAppearance({ theme: p.theme, style: p.style, custom: p.custom_colors });
    },
    [],
  );

  const dirtyAppearance =
    theme !== (profile?.theme || 'noir') ||
    style !== (profile?.style || 'moderno') ||
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

  function setToken(key, value) {
    setHexDraft((d) => ({ ...d, [key]: value }));
    if (isHex(value)) setCustom((c) => ({ ...c, [key]: value }));
  }

  function resetToNoir() {
    const base = { name: custom.name || 'Meu tema', ...NOIR.colors };
    setCustom(base);
    setHexDraft(base);
  }

  async function copyTheme() {
    const json = exportTheme(custom.name, resolveColors('custom', custom));
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
      const { name: themeName, colors } = parseTheme(text);
      const next = { ...NOIR.colors, ...colors, name: themeName || custom.name || 'Meu tema' };
      setCustom(next);
      setHexDraft(next);
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
        <Section title="Perfil" description={user?.email}>
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
        <Section title="Aparência" description="Cor e estilo são independentes. As mudanças aparecem na hora; salve para manter.">
          <p className="field-label mb-2.5">Cores</p>
          <div className="grid grid-cols-2 gap-3 mb-7">
            {Object.entries(THEMES).map(([id, t]) => {
              const colors = id === 'custom' ? resolveColors('custom', custom) : NOIR.colors;
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
                        value={isHex(custom[key]) && custom[key].length === 7 ? custom[key] : '#000000'}
                        onChange={(e) => setToken(key, e.target.value)}
                      />
                      <input
                        className={`input mono text-[12px] ${isHex(hexDraft[key]) ? '' : '!border-ember'}`}
                        value={hexDraft[key] || ''}
                        onChange={(e) => setToken(key, e.target.value.trim())}
                        spellCheck={false}
                      />
                    </span>
                  </label>
                ))}
              </div>
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
            <button className="btn btn-primary btn-sm"><Label>Codar agora</Label></button>
          </div>

          <div className="flex justify-end gap-2">
            <button
              className="btn btn-primary"
              disabled={saving || !dirtyAppearance}
              onClick={() =>
                save(
                  { theme, style, custom_colors: theme === 'custom' ? custom : profile?.custom_colors ?? null },
                  'Aparência salva.',
                )
              }
            >
              <Label>Salvar aparência</Label>
            </button>
          </div>
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
      </div>
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
