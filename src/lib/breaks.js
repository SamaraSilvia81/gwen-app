import { BookOpenText, Coffee, DotsThreeCircle, ForkKnife, Wind } from '@phosphor-icons/react';

/**
 * Tipos de pausa. `target` (min) é quanto tempo a barra leva para encher.
 * Não é um limite: a barra só mostra quanto você já recarregou.
 */
export const BREAK_KINDS = {
  cafe: { label: 'Café ou água', short: 'Café', icon: Coffee, target: 10, phrase: 'Recarregando com um café' },
  refeicao: { label: 'Refeição', short: 'Refeição', icon: ForkKnife, target: 45, phrase: 'Hora de comer com calma' },
  leitura: { label: 'Leitura', short: 'Leitura', icon: BookOpenText, target: 25, phrase: 'Longe da tela, perto das páginas' },
  respiro: { label: 'Respiro', short: 'Respiro', icon: Wind, target: 5, phrase: 'Inspira... segura... expira' },
  outro: { label: 'Outra pausa', short: 'Pausa', icon: DotsThreeCircle, target: 15, phrase: 'Recarregando energia' },
};
