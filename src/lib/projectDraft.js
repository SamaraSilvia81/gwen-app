/**
 * Rascunho do projeto novo: fechar o formulário sem salvar não perde o que foi
 * preenchido. Fica no localStorage deste computador (é só uma conveniência).
 */
const DRAFT_KEY = 'gwen:rascunho-projeto';

export function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  } catch {
    return null;
  }
}

export function writeDraft(d) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* sem armazenamento, sem rascunho */
  }
}

export const hasContent = (d) =>
  !!(
    d &&
    (d.name?.trim() ||
      d.description?.trim() ||
      (d.folders || []).some((f) => f.path?.trim()) ||
      (d.links || []).some((l) => l.url?.trim()))
  );
