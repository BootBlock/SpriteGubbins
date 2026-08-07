/**
 * What the Architecture Spec tab says.
 *
 * Kept as data so the view that renders it stays a view. It describes **this** application — the
 * modular PWA — rather than the single-file page it was migrated from, because a specification tab
 * that documents an architecture the app no longer has is worse than no tab at all.
 */

export interface ArchitectureSection {
  readonly heading: string;
  readonly body: string;
}

export const ARCHITECTURE_SECTIONS: readonly ArchitectureSection[] = [
  {
    heading: '1. Serverless, and no model API',
    body: 'Sprite Gubbins runs entirely in the browser. There is no backend, no account, and no outbound request to any image generator — it composes prompt *text* for you to paste into ChatGPT, Midjourney, Stable Diffusion, Imagen or DALL-E yourself. Consequently it never handles an API key, and there is nowhere for your prompts to be sent.',
  },
  {
    heading: '2. Modular front end',
    body: 'Vite bundles a React 19 application written in strict TypeScript. State lives in five independent Zustand stores — subject, output, presets, history and interface — which components read through narrow selectors, so editing a subject field re-renders the prompt preview and nothing else.',
  },
  {
    heading: '3. The prompt compiler',
    body: 'The compiled prompt is a pure function of the category, the sixteen subject fields and the eight output settings: the same state always produces the same text. Five of the six target generators then get their own wrapper around it — a reasoning and verification contract for ChatGPT 5.6 Sol, command flags for Midjourney v6.1, a negative-prompt block for Stable Diffusion and Flux, and a directive prefix for Imagen 3 and DALL-E 3. The Generic option is the sixth, and deliberately adds nothing.',
  },
  {
    heading: '4. Browser-embedded SQLite',
    body: 'Your prompt history and saved presets are stored in a real SQLite database compiled to WebAssembly, persisted to the Origin Private File System. Where that is unavailable — a private window, a browser without OPFS, an exhausted quota — the same interface is served from your browser’s local storage instead, so nothing is lost either way.',
  },
  {
    heading: '5. The database runs on its own thread',
    body: 'SQLite reaches the file system through synchronous access handles, which browsers hand out only inside a worker. So the database lives in a dedicated worker and the interface talks to it by message, which also keeps every query off the thread that draws the page. The application additionally serves itself the two cross-origin isolation headers, from the service worker, since a static host will not send them.',
  },
  {
    heading: '6. Atlas and grid calculator',
    body: 'Given the component count the chosen directional mode requires, the calculator lays those components into a grid biased to the sheet aspect ratio, works out the cell size and the sprite bounds left after the bleed gutter, checks the texture stays a power of two, and exports the result as JSON an importer for Godot, Unity or PixiJS can read.',
  },
  {
    heading: '7. Offline first',
    body: 'The application shell, its styles and the SQLite WebAssembly binary are all precached, so the studio works with no network at all and can be installed as a standalone app. A new build takes over as soon as it has downloaded, reloading the page — safe here because everything you have typed is already in the local database rather than held in the page.',
  },
  {
    heading: '8. Design tokens and accessibility',
    body: 'Every colour and animation in the interface comes from a named design token, so the palette is defined in exactly one place. Indigo marks actions and focus, cyan marks anything recomputing live. The suggestion fields are real ARIA comboboxes with keyboard selection, overlays are native dialogs with genuine focus containment, confirmations announce through a live region, and a single reduced-motion rule quiets every animation for anyone who has asked their system for less movement.',
  },
];
