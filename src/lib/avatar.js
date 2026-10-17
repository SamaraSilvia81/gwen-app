/**
 * Foto do perfil: a imagem escolhida é recortada em quadrado e reduzida para
 * 192 x 192, e vira um data URL pequeno (poucos KB) guardado no próprio perfil.
 * Nada é enviado para fora do computador.
 */
const SIZE = 192;

export async function fileToAvatar(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Não consegui ler essa imagem. Tente um PNG ou JPG.');
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.getContext('2d').drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);
  bitmap.close?.();
  return canvas.toDataURL('image/webp', 0.85);
}
