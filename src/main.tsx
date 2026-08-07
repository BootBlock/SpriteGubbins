import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.tsx';
import './index.css';

const container = document.getElementById('root');
// index.html always provides #root, so a miss means the document was replaced or the script
// ran against the wrong page — a hard failure, not something to paper over with a fallback.
if (!container) throw new Error('Sprite Gubbins could not start: no #root element in the document.');

// `autoUpdate` (vite.config.ts): a new build takes over on the next navigation without asking.
// `immediate` registers on load rather than waiting for the window's `load` event, so a first
// visit is cached for offline use as early as possible.
registerSW({ immediate: true });

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
