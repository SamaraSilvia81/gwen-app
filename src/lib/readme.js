/**
 * Resume um README em um parágrafo, para a descrição do projeto.
 * Prefere o primeiro parágrafo depois de um título "Sobre" (padrão dos READMEs
 * da devs_sam); sem ele, o primeiro parágrafo de texto de verdade, pulando
 * título, badges, imagens, HTML, tabelas, listas e blocos de código.
 */
const MAX = 300;

function plain(md) {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // imagens
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> texto
    .replace(/<[^>]+>/g, '') // tags soltas
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isProse(block) {
  const first = block.trimStart();
  if (/^(#|!\[|\[!\[|\||```|~~~|---|\*\*\*|<|[-*+] |\d+\. )/.test(first)) return false;
  const text = plain(block);
  if (text.length < 40) return false;
  return /[a-zà-ú]{3,} [a-zà-ú]{2,}/i.test(text); // tem frase, não só badges/links
}

function clip(text) {
  if (text.length <= MAX) return text;
  const cut = text.slice(0, MAX);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return end > 120 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}...`;
}

export function summarizeReadme(md) {
  if (!md) return '';
  const src = md
    .replace(/\r\n/g, '\n')
    .replace(/^---\n[\s\S]*?\n---\n/, '') // front matter
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(picture|p|div)[^>]*>[\s\S]*?<\/\1>/gi, '') // blocos HTML (banners)
    .replace(/```[\s\S]*?```/g, '');

  const blocks = src.split(/\n\s*\n/);
  const about = blocks.findIndex((b) => /^#{1,4}\s.*\b(sobre|about|o que é|what is)\b/i.test(b.trim()));
  const ordered = about >= 0 ? [...blocks.slice(about + 1), ...blocks.slice(0, about)] : blocks;
  const found = ordered.find(isProse);
  return found ? clip(plain(found)) : '';
}
