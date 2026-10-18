import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/bebas-neue';
import './styles/index.css';
import App from './App';
import Bubble from './pages/Bubble';
import { applyAppearance, loadLocalAppearance } from './lib/themes';
import { applyZoom, loadZoom } from './lib/zoom';

// a mesma página serve a janela principal e a bolha (tauri.conf.json, label "bubble")
const isBubble = window.location.hash === '#bolha';

if (isBubble) {
  document.documentElement.classList.add('is-bubble');
  const look = loadLocalAppearance();
  if (look) applyAppearance(look);
} else {
  // escala antes do primeiro desenho, para a abertura já vir no tamanho certo
  applyZoom(loadZoom());
}

createRoot(document.getElementById('root')).render(<StrictMode>{isBubble ? <Bubble /> : <App />}</StrictMode>);
