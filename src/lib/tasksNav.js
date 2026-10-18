/** Abre a tela de Tarefas filtrada por um projeto (de qualquer lugar do app) */
export const OPEN_TASKS_EVENT = 'gwen:abrir-tarefas';
export const openTasks = (projectId = 'all') => window.dispatchEvent(new CustomEvent(OPEN_TASKS_EVENT, { detail: projectId }));
