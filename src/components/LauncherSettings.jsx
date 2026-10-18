import { useEffect, useState } from 'react';
import { ArrowSquareOut, Check, Plus, Trash } from '@phosphor-icons/react';
import { useProfile } from '../context/ProfileContext';
import { useToast } from '../context/ToastContext';
import { APP_SUGGESTIONS, appIcon, launchApp, newAppId, resolveLauncher } from '../lib/launcher';
import { CATEGORIES, appName, usageBetween } from '../lib/activity';
import { dayKey } from '../lib/habits';
import { isTauri } from '../lib/native';
import { formatDuration } from '../lib/time';
import { Label } from './Modal';

/** Salva um pedaço do launcher no perfil, mantendo o resto */
function useLauncher() {
  const { profile, updateProfile } = useProfile();
  const toast = useToast();
  const config = resolveLauncher(profile?.launcher);
  const save = async (patch, message) => {
    try {
      await updateProfile({ launcher: { ...config, ...patch } });
      if (message) toast(message);
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  return { config, save, toast };
}

/**
 * Ajustes > Apps (0.8): os apps que a G.W.E.N. abre. Um app é um executável
 * (C:\...\app.exe, com argumentos) ou um protocolo (discord://, whatsapp:).
 */
export function AppsSettings() {
  const { config, save, toast } = useLauncher();
  const [draft, setDraft] = useState({ name: '', target: '', args: '' });
  const missing = APP_SUGGESTIONS.filter((s) => !config.apps.some((a) => a.target === s.target));

  async function add(app) {
    if (!app.name.trim() || !app.target.trim()) return;
    await save({ apps: [...config.apps, { id: newAppId(), name: app.name.trim(), target: app.target.trim(), args: app.args?.trim() || '' }] }, `${app.name} adicionado.`);
    setDraft({ name: '', target: '', args: '' });
  }

  return (
    <>
      {config.apps.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {config.apps.map((a) => {
            const Icon = appIcon(a);
            return (
              <div key={a.id} className="card p-3 flex items-center gap-3">
                <span className="habit-icon"><Icon size={15} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{a.name}</span>
                  <span className="block mono text-[11px] text-muted truncate">
                    {a.target}
                    {a.args ? ` ${a.args}` : ''}
                  </span>
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => launchApp(a).catch((e) => toast(e?.message || String(e), 'error'))} disabled={!isTauri}>
                  <ArrowSquareOut size={12} />
                  <Label>Testar</Label>
                </button>
                <button
                  className="btn btn-quiet btn-icon btn-sm"
                  onClick={() => save({ apps: config.apps.filter((x) => x.id !== a.id) }, `${a.name} removido.`)}
                  aria-label={`Remover ${a.name}`}
                  title="Remover"
                >
                  <Trash size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {missing.length > 0 && (
        <>
          <p className="field-label mb-2">Sugestões (precisam estar instalados)</p>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {missing.map((s) => {
              const Icon = appIcon(s);
              return (
                <button key={s.id} className="btn btn-ghost btn-sm" onClick={() => add(s)}>
                  <Icon size={13} />
                  {s.name}
                  <Plus size={11} />
                </button>
              );
            })}
          </div>
        </>
      )}

      <p className="field-label mb-2">Outro app</p>
      <form
        className="grid grid-cols-[140px_1fr_140px_auto] max-[720px]:grid-cols-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
        }}
      >
        <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nome" />
        <input
          className="input mono text-[12px]"
          value={draft.target}
          onChange={(e) => setDraft({ ...draft, target: e.target.value })}
          placeholder="C:\Program Files\App\app.exe ou app://"
        />
        <input className="input mono text-[12px]" value={draft.args} onChange={(e) => setDraft({ ...draft, args: e.target.value })} placeholder="argumentos" />
        <button className="btn btn-accent" type="submit" disabled={!draft.name.trim() || !draft.target.trim()}>
          <Plus size={13} weight="bold" />
          <Label>Adicionar</Label>
        </button>
      </form>
      <p className="text-[12px] text-muted mt-2">
        Os apps aparecem no Início, no Ctrl + K e no cadastro de cada projeto, para abrir junto no Começar agora. Para achar o
        caminho de um programa: clique direito no atalho dele, Abrir local do arquivo.
      </p>
    </>
  );
}

/**
 * Ajustes > Mapeamento (0.8): liga o registro do app em primeiro plano,
 * os alertas de jogo e de trabalho, e a categoria de cada app visto.
 */
export function ActivitySettings() {
  const { config, save } = useLauncher();
  const t = config.tracking;
  const [seen, setSeen] = useState([]);

  useEffect(() => {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    usageBetween(dayKey(from), dayKey(new Date()), config.categories).then((rows) => {
      const byExe = new Map();
      for (const r of rows) {
        const k = String(r.exe).toLowerCase();
        const cur = byExe.get(k) || { exe: r.exe, category: r.category, seconds: 0 };
        cur.seconds += r.seconds;
        cur.category = r.category;
        byExe.set(k, cur);
      }
      setSeen([...byExe.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 30));
    });
  }, [config.categories]);

  const setTracking = (patch, message) => save({ tracking: { ...t, ...patch } }, message);

  return (
    <>
      <label className={`card p-4 flex items-center gap-4 mb-4 ${isTauri ? 'cursor-pointer' : 'opacity-60'}`}>
        <input
          type="checkbox"
          className="w-4 h-4 accent-[var(--c-phosphor)]"
          checked={t.enabled}
          disabled={!isTauri}
          onChange={() => setTracking({ enabled: !t.enabled }, t.enabled ? 'Mapeamento desligado.' : 'Mapeamento ligado. O tempo aparece no Relatório, em Apps.')}
        />
        <span className="flex-1">
          <span className="block font-display font-semibold">Mapear apps e jogos</span>
          <span className="block text-[12px] text-muted mt-0.5">
            {isTauri
              ? 'A cada 15 segundos, a G.W.E.N. vê qual programa está na frente e soma o tempo dele no dia. Guarda só o nome do programa, nunca o título da janela, e fica só neste computador, mesmo com a conta na nuvem.'
              : 'Disponível no app instalado.'}
          </span>
        </span>
      </label>

      <div className="grid grid-cols-3 max-[720px]:grid-cols-1 gap-2 mb-6">
        <NumberCard
          label="Alerta de jogo"
          hint="minutos seguidos jogando (0 desliga)"
          value={t.gameAlertMin}
          onSave={(v) => setTracking({ gameAlertMin: v }, 'Alerta de jogo salvo.')}
        />
        <NumberCard
          label="Alerta de trabalho"
          hint="minutos seguidos em código, docs ou design (0 desliga)"
          value={t.workAlertMin}
          onSave={(v) => setTracking({ workAlertMin: v }, 'Alerta de trabalho salvo.')}
        />
        <NumberCard
          label="Ausência"
          hint="minutos sem teclado e mouse para parar de contar"
          value={t.idleMin}
          min={1}
          onSave={(v) => setTracking({ idleMin: v }, 'Tempo de ausência salvo.')}
        />
      </div>

      <p className="field-label mb-2">Categorias dos apps (últimos 30 dias)</p>
      {seen.length ? (
        <div className="card list-card">
          {seen.map((a) => (
            <div key={a.exe} className="list-row cursor-default">
              <span className="flex-1 min-w-0 truncate font-medium">{appName(a.exe)}</span>
              <span className="mono text-[11px] text-muted w-[70px] text-right">{formatDuration(a.seconds, { short: true })}</span>
              <select
                className="input w-[170px] h-8"
                value={a.category}
                onChange={(e) =>
                  save({ categories: { ...config.categories, [String(a.exe).toLowerCase()]: e.target.value } }, `${appName(a.exe)}: ${CATEGORIES[e.target.value].label}.`)
                }
              >
                {Object.entries(CATEGORIES).map(([id, c]) => (
                  <option key={id} value={id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-muted">
          Os apps aparecem aqui depois de alguns minutos com o mapeamento ligado. Jogos da Steam, Epic, Riot e Xbox entram em Jogos sozinhos.
        </p>
      )}
    </>
  );
}

function NumberCard({ label, hint, value, onSave, min = 0 }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const n = Math.max(min, Number(v) || 0);
  return (
    <div className="card p-3">
      <p className="font-medium text-[13px]">{label}</p>
      <p className="text-[11px] text-muted mb-2">{hint}</p>
      <div className="flex gap-1.5">
        <input className="input" type="number" min={min} value={v} onChange={(e) => setV(e.target.value)} />
        <button className="btn btn-ghost btn-icon" onClick={() => onSave(n)} disabled={n === value} aria-label={`Salvar ${label}`} title="Salvar">
          <Check size={14} />
        </button>
      </div>
    </div>
  );
}
