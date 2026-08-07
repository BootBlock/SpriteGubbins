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
    body: 'Sprite Gubbins runs entirely in the browser. There is no backend, no account, and no outbound request to any image generator — it composes prompt *text* for you to paste into ChatGPT, Gemini, Midjourney, Stable Diffusion, Flux, Qwen-Image, Seedream or GPT Image yourself. Consequently it never handles an API key, and there is nowhere for your prompts to be sent.',
  },
  {
    heading: '2. Modular front end',
    body: 'Vite bundles a React 19 application written in strict TypeScript. State lives in five independent Zustand stores — subject, output, presets, history and interface — which components read through narrow selectors, so editing a subject field re-renders the prompt preview and nothing else.',
  },
  {
    heading: '3. The prompt compiler',
    body: 'The compiled prompt is a pure function of the category, the sixteen subject fields and the twenty output settings: the same state always produces the same text. A field you leave blank omits its line entirely rather than filling it with a placeholder, and the prompt says outright that an absent attribute is the generator’s to choose. Each target then gets what its own documentation calls for — a reasoning directive for ChatGPT 5.6 Sol, command flags for Midjourney, a weighted negative-prompt block for Stable Diffusion and an unweighted one for Qwen-Image, the same constraints restated up front for Flux (which takes no negative prompt, and whose open weights stop reading at 512 tokens), a note to Seedream about what to sacrifice from a brief it is documented to trim, and a short directive for GPT Image, whose prompts are rewritten before generation. The Gemini image models and the Generic option add nothing, deliberately: they read the prompt as a specification already. The template itself also adapts — a target with no pass in which to check its own work is not sent the self-audit, and only a target that returns text is asked for a JSON manifest.',
  },
  {
    heading: '4. Render style is a parameter, not an assumption',
    body: 'Pixel art, retro pixel art, painted, cel-shaded, flat vector, inked, rendered 3D, low-poly, a clay form study or a plain silhouette pass — with the pixel-specific rules applied only to the two pixel styles. Projection and camera elevation are chosen rather than assumed, and a sheet can be built as a cut-out rig: pieces drawn unposed in rest orientation, with matching joint caps at their pivots, ready to be bound to a skeleton.',
  },
  {
    heading: '5. Browser-embedded SQLite',
    body: 'Your prompt history and saved presets are stored in a real SQLite database compiled to WebAssembly, persisted to the Origin Private File System. Where that is unavailable — a private window, a browser without OPFS, an exhausted quota — the same interface is served from your browser’s local storage instead, so nothing is lost either way.',
  },
  {
    heading: '6. The database runs on its own thread',
    body: 'SQLite reaches the file system through synchronous access handles, which browsers hand out only inside a worker. So the database lives in a dedicated worker and the interface talks to it by message, which also keeps every query off the thread that draws the page. The application additionally serves itself the two cross-origin isolation headers, from the service worker, since a static host will not send them.',
  },
  {
    heading: '7. Atlas and grid calculator',
    body: 'Given the component count the sheet asks for — the chosen directional mode plus any additional anatomy the subject names — the calculator lays those components into a grid biased to the sheet aspect ratio, works out the cell size and the sprite bounds left after the bleed gutter, checks the texture stays a power of two, and exports the result as JSON an importer for Godot, Unity or PixiJS can read.',
  },
  {
    heading: '8. Offline first',
    body: 'The application shell, its styles and the SQLite WebAssembly binary are all precached, so the studio works with no network at all and can be installed as a standalone app. A new build takes over as soon as it has downloaded, reloading the page — safe here because everything you have typed is already in the local database rather than held in the page.',
  },
  {
    heading: '9. Design tokens and accessibility',
    body: 'Every colour and animation in the interface comes from a named design token, so the palette is defined in exactly one place. Indigo marks actions and focus, cyan marks anything recomputing live. The suggestion fields are real ARIA comboboxes with keyboard selection, overlays are native dialogs with genuine focus containment, confirmations announce through a live region, and a single reduced-motion rule quiets every animation for anyone who has asked their system for less movement.',
  },
];
