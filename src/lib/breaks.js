import { BookOpenText, Coffee, DotsThreeCircle, ForkKnife, PersonSimpleTaiChi, Wind } from '@phosphor-icons/react';

/**
 * Tipos de pausa. `target` (min) é quanto tempo a barra leva para encher.
 * Não é um limite: a barra só mostra quanto você já recarregou.
 */
export const BREAK_KINDS = {
  cafe: { label: 'Café ou água', short: 'Café', icon: Coffee, target: 10, phrase: 'Recarregando com um café' },
  refeicao: { label: 'Refeição', short: 'Refeição', icon: ForkKnife, target: 45, phrase: 'Hora de comer com calma' },
  leitura: { label: 'Leitura', short: 'Leitura', icon: BookOpenText, target: 25, phrase: 'Longe da tela, perto das páginas' },
  respiro: { label: 'Respiro', short: 'Respiro', icon: Wind, target: 5, phrase: 'Inspira... segura... expira' },
  alongamento: {
    label: 'Alongamento',
    short: 'Alongar',
    icon: PersonSimpleTaiChi,
    target: 5,
    phrase: 'Solta o corpo',
    // um movimento por minuto, em ciclo; sem dor: se incomodar, pare
    steps: [
      'Em pé, estique os braços para cima e respire fundo três vezes.',
      'Gire os ombros para trás, devagar, dez vezes.',
      'Incline a cabeça para cada lado, quinze segundos de cada.',
      'Entrelace os dedos e estique os braços para a frente.',
      'Abra e feche as mãos, depois gire os punhos nos dois sentidos.',
    ],
  },
  outro: { label: 'Outra pausa', short: 'Pausa', icon: DotsThreeCircle, target: 15, phrase: 'Recarregando energia' },
};
