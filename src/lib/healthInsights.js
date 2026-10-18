import { dayKey } from './habits';
import { secondsBetween, sessionSeconds } from './time';

/**
 * Alertas de saúde da home (0.7).
 *
 * Cada regra parte de uma referência publicada, citada no próprio alerta, para
 * a G.W.E.N. não inventar número. Não são diagnóstico: são lembretes do que a
 * pesquisa já mostra, aplicados ao tempo que você registrou aqui.
 */
export const SOURCES = {
  oit: {
    short: 'OMS/OIT, 2021',
    full: 'Pega et al. (2021). Environment International, 154, 106595. Estimativa conjunta OMS/OIT: 55 horas ou mais por semana se associam a risco 35% maior de AVC e 17% maior de morte por doença isquêmica do coração, comparado a 35 a 40 horas.',
  },
  clt: {
    short: 'Constituição, art. 7º, XIII',
    full: 'A Constituição Federal (art. 7º, XIII) limita a jornada a 8 horas por dia e 44 horas por semana.',
  },
  micro: {
    short: 'Albulescu et al., 2022',
    full: 'Albulescu et al. (2022). PLOS ONE, 17(8), e0272460. Meta-análise: micropausas de até 10 minutos aumentam o vigor e reduzem a fadiga.',
  },
  sono: {
    short: 'AASM/SRS, 2015',
    full: 'Watson et al. (2015). Consenso da American Academy of Sleep Medicine e da Sleep Research Society: adultos precisam de 7 horas ou mais de sono por noite.',
  },
  recuperacao: {
    short: 'Sonnentag & Fritz, 2007',
    full: 'Sonnentag & Fritz (2007). Journal of Occupational Health Psychology, 12(3). Desligar-se do trabalho no tempo livre é uma das experiências que mais ajudam na recuperação.',
  },
  olhos: {
    short: 'AAO, regra 20-20-20',
    full: 'American Academy of Ophthalmology: a cada 20 minutos de tela, olhe para algo a 6 metros (20 pés) por 20 segundos.',
  },
  sedentarismo: {
    short: 'OMS, 2020',
    full: 'Diretrizes da OMS sobre atividade física e comportamento sedentário (2020): reduzir o tempo sentado e trocá-lo por atividade de qualquer intensidade traz benefício.',
  },
  agua: {
    short: 'EFSA, 2010',
    full: 'EFSA (2010): ingestão adequada de cerca de 2 litros de água por dia para mulheres e 2,5 litros para homens, somando bebidas e comida.',
  },
};

const LONG_WEEK_H = 55;
const CLT_WEEK_H = 44;
const NO_BREAK_MIN = 90;
const LATE_HOUR = 23;

/**
 * @returns {{ id, level: 'alerta'|'atencao'|'ok', title, body, source }[]}
 */
export function healthInsights({ weekTotal, activeSession, activeBreak, lastBreakEnd, recentSessions = [], now = new Date() }) {
  const out = [];
  const weekH = weekTotal / 3600;

  if (weekH >= LONG_WEEK_H) {
    out.push({
      id: 'semana-longa',
      level: 'alerta',
      title: `${Math.floor(weekH)}h de trabalho nesta semana`,
      body: 'Semanas de 55 horas ou mais aumentam o risco de AVC e de doença do coração. Vale fechar o expediente mais cedo nos próximos dias.',
      source: SOURCES.oit,
    });
  } else if (weekH >= CLT_WEEK_H) {
    out.push({
      id: 'semana-cheia',
      level: 'atencao',
      title: `Semana passou de ${CLT_WEEK_H}h`,
      body: `Você já está acima da jornada máxima de ${CLT_WEEK_H} horas semanais. Planeje o descanso do resto da semana.`,
      source: SOURCES.clt,
    });
  }

  if (activeSession && !activeBreak) {
    const since = Math.max(new Date(activeSession.started_at).getTime(), lastBreakEnd ? new Date(lastBreakEnd).getTime() : 0);
    const minutes = Math.min(secondsBetween(since, now) / 60, sessionSeconds(activeSession, now) / 60);
    if (minutes >= NO_BREAK_MIN) {
      out.push({
        id: 'sem-pausa',
        level: 'atencao',
        title: `${Math.floor(minutes)} min sem pausa`,
        body: 'Uma pausa curta, de até 10 minutos, já reduz a fadiga e devolve energia. Levanta, bebe água, olha pela janela.',
        source: SOURCES.micro,
      });
    }
  }

  // sessões tarde da noite nos últimos 7 dias
  const lateDays = new Set(
    recentSessions
      .filter((s) => {
        const start = new Date(s.started_at);
        const end = s.ended_at ? new Date(s.ended_at) : now;
        return start.getHours() >= LATE_HOUR || end.getHours() >= LATE_HOUR || end.getHours() < 5 || dayKey(end) !== dayKey(start);
      })
      .map((s) => dayKey(s.started_at)),
  );
  if (lateDays.size >= 2) {
    out.push({
      id: 'madrugada',
      level: 'atencao',
      title: `Trabalho depois das ${LATE_HOUR}h em ${lateDays.size} dias`,
      body: 'Noites longas de trabalho comem o sono. Adultos precisam de 7 horas ou mais por noite para manter foco e memória.',
      source: SOURCES.sono,
    });
  }

  // nenhum dia sem trabalho na última semana
  const worked = new Set(recentSessions.map((s) => dayKey(s.started_at)));
  let streak = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (worked.has(dayKey(d))) streak += 1;
    else break;
  }
  if (streak >= 7) {
    out.push({
      id: 'sem-folga',
      level: 'atencao',
      title: '7 dias seguidos trabalhando',
      body: 'Recuperar depende de se desligar do trabalho de verdade. Reserve um dia inteiro sem abrir projeto.',
      source: SOURCES.recuperacao,
    });
  }

  return out;
}
