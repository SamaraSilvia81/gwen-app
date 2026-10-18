import {
  CalendarBlank, CaretLeft, CloudArrowUp, Database, Desktop, GameController, Heartbeat, Info, Keyboard, PaintBrush, PlugsConnected, Sliders,
  SquaresFour, UserCircle,
} from '@phosphor-icons/react';

/**
 * Seções das Configurações (0.7), no padrão do CuraData: ao entrar em Ajustes,
 * o painel de projetos dá lugar a esta navegação. Clicar rola até a seção, e a
 * seção visível fica marcada enquanto você rola.
 */
export const SETTINGS_SECTIONS = [
  { id: 'perfil', label: 'Perfil', icon: UserCircle },
  { id: 'aparencia', label: 'Aparência', icon: PaintBrush },
  { id: 'interface', label: 'Interface', icon: Sliders },
  { id: 'apps', label: 'Apps', icon: SquaresFour },
  { id: 'atividade', label: 'Mapeamento', icon: GameController },
  { id: 'integracoes', label: 'Integrações', icon: PlugsConnected },
  { id: 'saude', label: 'Modo saúde', icon: Heartbeat },
  { id: 'dados', label: 'Dados', icon: Database },
  { id: 'nuvem', label: 'Conta na nuvem', icon: CloudArrowUp },
  { id: 'sistema', label: 'Sistema', icon: Desktop },
  { id: 'sobre', label: 'Sobre', icon: Info },
];

const SOON = [
  { id: 'calendario', label: 'Google Calendar', icon: CalendarBlank, hint: 'Calendário com a sua agenda do Google' },
  { id: 'atalhos', label: 'Atalhos', icon: Keyboard, hint: 'Ver e trocar os atalhos de teclado' },
];

export default function SettingsNav({ section, onSection, onBack, overlay, onClose }) {
  return (
    <aside className={`panel ${overlay ? 'is-overlay' : ''}`} aria-label="Seções das configurações">
      <div className="panel-head">
        <button className="settings-back" onClick={onBack}>
          <CaretLeft size={13} weight="bold" />
          Voltar
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-px">
        <p className="panel-section !pt-1">Configurações</p>
        {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              className={`panel-row ${active ? 'is-active' : ''}`}
              onClick={() => {
                onSection(id);
                if (overlay) onClose?.();
              }}
              aria-current={active ? 'true' : undefined}
            >
              <Icon size={15} weight={active ? 'fill' : 'regular'} className={active ? 'text-phosphor' : ''} />
              <span className="flex-1 truncate">{label}</span>
            </button>
          );
        })}

        <div className="h-px bg-[var(--c-rule)] mx-2 my-3" />
        <p className="panel-section !pt-0">Em breve</p>
        {SOON.map(({ id, label, icon: Icon, hint }) => (
          <div key={id} className="panel-row is-disabled" title={hint}>
            <Icon size={15} />
            <span className="flex-1 truncate">{label}</span>
            <span className="panel-meta uppercase">em breve</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** Em janela estreita, as seções viram uma faixa de abas no topo da página */
export function SettingsTabs({ section, onSection }) {
  return (
    <div className="settings-tabs" role="tablist" aria-label="Seções das configurações">
      {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="tab"
          aria-selected={section === id}
          className={section === id ? 'is-active' : ''}
          onClick={() => onSection(id)}
        >
          <Icon size={13} weight={section === id ? 'fill' : 'regular'} />
          {label}
        </button>
      ))}
    </div>
  );
}
