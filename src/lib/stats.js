import { sessionSecondsSince, startOfToday, startOfWeek } from './time';

/**
 * Agrega o tempo das sessões da semana por projeto e por categoria.
 * `now` e `activeBreak` entram para os números andarem ao vivo.
 */
export function computeStats({ sessions, projects, now, activeBreak }) {
  const today = startOfToday(now);
  const week = startOfWeek(now);
  const byProject = new Map();
  const byCategory = new Map();
  const byFront = new Map(); // chave `${project_id}::${frente em minúsculas}`
  let todayTotal = 0;
  let weekTotal = 0;

  const categoryOf = new Map(projects.map((p) => [p.id, p.category_id || 'none']));

  for (const s of sessions) {
    const w = sessionSecondsSince(s, week, now, activeBreak);
    const t = sessionSecondsSince(s, today, now, activeBreak);
    weekTotal += w;
    todayTotal += t;
    const entry = byProject.get(s.project_id) || { week: 0, today: 0 };
    entry.week += w;
    entry.today += t;
    byProject.set(s.project_id, entry);
    if (s.front) {
      const key = `${s.project_id}::${s.front.toLowerCase()}`;
      byFront.set(key, (byFront.get(key) || 0) + w);
    }
    const cat = categoryOf.get(s.project_id) || 'none';
    byCategory.set(cat, (byCategory.get(cat) || 0) + w);
  }

  const year = now.getFullYear();
  const doneThisYear = projects.filter((p) => p.completed_at && new Date(p.completed_at).getFullYear() === year).length;
  const inProgress = projects.filter((p) => p.status === 'andamento').length;

  return { todayTotal, weekTotal, byProject, byCategory, byFront, doneThisYear, inProgress, year };
}

export const STATUS = {
  ideia: { label: 'Ideia' },
  andamento: { label: 'Em andamento' },
  pausado: { label: 'Pausado' },
  concluido: { label: 'Concluído' },
};
