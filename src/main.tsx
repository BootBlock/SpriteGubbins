import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './index.css';
import { registerAppUpdates } from './workers/registerAppUpdates.ts';

const container = document.getElementById('root');
// index.html always provides #root, so a miss means the document was replaced or the script
// ran against the wrong page — a hard failure, not something to paper over with a fallback.
if (!container) throw new Error('Sprite Gubbins could not start: no #root element in the document.');

// A new build waits for the reader to start it: see `registerAppUpdates`.
registerAppUpdates();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
