import { ChartBar, GearSix, House, Kanban, Lightning, SidebarSimple, SquaresFour, UserCircle } from '@phosphor-icons/react';
import Logo from './Logo';
import Avatar from './Avatar';
import { useProfile } from '../context/ProfileContext';
import { openQuickLaunch } from './QuickLaunch';

/**
 * Trilho de ícones (0.7), sempre visível na esquerda, como no Postman e no Linear.
 * Cada ícone é uma área do app; o painel de projetos abre e fecha ao lado (Ctrl + B).
 * Os rótulos aparecem embaixo do ícone, sem depender de hover.
 */
export const VIEWS = {
  inicio: { label: 'Início', icon: House },
  projetos: { label: 'Projetos', icon: SquaresFour },
  tarefas: { label: 'Tarefas', icon: Kanban },
  relatorio: { label: 'Relatório', icon: ChartBar },
  perfil: { label: 'Perfil', icon: UserCircle },
  config: { label: 'Ajustes', icon: GearSix, title: 'Configurações' },
};

const TOP = ['inicio', 'projetos', 'tarefas', 'relatorio', 'perfil'];

export default function Rail({ view, onNavigate, panelOpen, onTogglePanel }) {
  const { profile } = useProfile();

  const Item = ({ id }) => {
    const v = VIEWS[id];
    const active = view === id;
    const Icon = v.icon;
    return (
      <button
        onClick={() => onNavigate(id)}
        className={`rail-item ${active ? 'is-active' : ''}`}
        title={v.title || v.label}
        aria-current={active ? 'page' : undefined}
      >
        <span className="rail-icon">
          <Icon size={19} weight={active ? 'fill' : 'regular'} />
        </span>
        <span className="rail-label">{v.label}</span>
      </button>
    );
  };

  return (
    <nav className="rail" aria-label="Áreas da G.W.E.N.">
      <button className="rail-logo" onClick={() => onNavigate('inicio')} title="G.W.E.N.">
        <Logo size={24} />
      </button>

      <div className="flex flex-col gap-1 w-full">
        {TOP.map((id) => (
          <Item key={id} id={id} />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1 w-full items-center">
        <button className="rail-item" onClick={openQuickLaunch} title="Começar um projeto (Ctrl + K)">
          <span className="rail-icon">
            <Lightning size={18} />
          </span>
          <span className="rail-label">Ctrl K</span>
        </button>
        <button
          className={`rail-item ${panelOpen ? 'is-on' : ''}`}
          onClick={onTogglePanel}
          title={`${panelOpen ? 'Fechar' : 'Abrir'} o painel de projetos (Ctrl + B)`}
          aria-pressed={panelOpen}
        >
          <span className="rail-icon">
            <SidebarSimple size={18} weight={panelOpen ? 'fill' : 'regular'} />
          </span>
          <span className="rail-label">Painel</span>
        </button>
        <Item id="config" />
        <button className="rail-avatar" onClick={() => onNavigate('perfil')} title={profile?.display_name || 'Perfil'}>
          <Avatar profile={profile} size={28} />
        </button>
      </div>
    </nav>
  );
}
