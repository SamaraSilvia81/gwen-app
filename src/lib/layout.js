import { useEffect, useState } from 'react';

/**
 * Preferências de layout deste computador (0.7): painel lateral aberto ou
 * fechado, categorias expandidas no painel e a bolha ao minimizar.
 * Ficam no localStorage, como a escala: dependem da tela, não da pessoa.
 */
const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem armazenamento: vale só nesta abertura */
  }
};

/** Estado guardado no localStorage, com o mesmo formato do useState */
export function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback));
  useEffect(() => write(key, value), [key, value]);
  return [value, setValue];
}

/** Largura abaixo da qual o painel deixa de ficar fixo e vira gaveta */
export const NARROW_QUERY = '(max-width: 1100px)';

export function useMediaQuery(query) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

export const BUBBLE_KEY = 'gwen.bolha';
export const bubbleEnabled = () => read(BUBBLE_KEY, true) !== false;
export const setBubbleEnabled = (on) => write(BUBBLE_KEY, !!on);
