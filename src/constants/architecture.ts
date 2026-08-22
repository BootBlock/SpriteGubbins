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
    body: 'Vite bundles a React 19 application written in strict TypeScript. State lives in six independent Zustand stores — subject, output, presets, history, interface and settings — which components read through narrow selectors, so editing a subject field re-renders the prompt preview and nothing else. The interface store and the settings store are separate on purpose: one is what is happening now and is meant to be forgotten when the tab closes, the other is what you decided once and expect to find again.',
  },
  {
    heading: '3. The prompt compiler',
    body: 'The compiled prompt is a pure function of the category, the sixteen subject fields and the twenty-five output settings: the same state always produces the same text. A field you leave blank omits its line entirely rather than filling it with a placeholder, and the prompt says outright that an absent attribute is the generator’s to choose. Each target then gets what its own documentation calls for — a reasoning directive for ChatGPT 5.6 Sol, command flags for Midjourney, a weighted negative-prompt block for Stable Diffusion and an unweighted one for Qwen-Image, the same constraints restated up front for Flux (which takes no negative prompt, and whose open weights stop reading at 512 tokens), a note to Seedream about what to sacrifice from a brief it is documented to drop details out of, and a short directive for GPT Image, whose prompts are rewritten before generation. The Gemini image models and the Generic option add nothing, deliberately: they read the prompt as a specification already. The template itself also adapts — a target with no pass in which to check its own work is not sent the self-audit, and only a target that returns text is asked for a JSON manifest.',
  },
  {
    heading: '4. Render style is a parameter, not an assumption',
    body: 'Pixel art, retro pixel art, painted, cel-shaded, flat vector, inked, rendered 3D, low-poly, a clay form study or a plain silhouette pass — with the pixel-specific rules applied only to the two pixel styles. Projection and camera elevation are chosen rather than assumed, and a sheet can be built as a cut-out rig: pieces drawn unposed in rest orientation, with matching joint caps at their pivots, ready to be bound to a skeleton.',
  },
  {
    heading: '5. A machine to draw for, and a palette to draw it in',
    body: 'Choose one of eighteen real systems — the Game Boy, the NES, the Super NES, the Mega Drive, the Master System, the Atari 2600, the C64, the Spectrum, the Amiga, the Neo Geo and the rest — and the studio fills in the render settings that machine’s artwork actually used, while the prompt states its display, its tile grid and how many sprites it could put on a scanline. Colour is a separate setting, so the two can be mixed: a palette is either a fixed list of colours the prompt writes out in full, or the bits-per-channel space a 512- or 32,768-colour machine defines, and it supersedes the general colour budget wherever it is set. The Quantise tab then maps a returned sheet onto that exact palette rather than choosing colours of its own.',
  },
  {
    heading: '6. Browser-embedded SQLite',
    body: 'Your prompt history, saved presets and interface settings are stored in a real SQLite database compiled to WebAssembly, persisted to the Origin Private File System. Where that is unavailable — a private window, a browser without OPFS, an exhausted quota — the same interface is served from your browser’s local storage instead, so nothing is lost either way.',
  },
  {
    heading: '7. The database runs on its own thread',
    body: 'SQLite reaches the file system through synchronous access handles, which browsers hand out only inside a worker. So the database lives in a dedicated worker and the interface talks to it by message, which also keeps every query off the thread that draws the page. The application additionally serves itself the two cross-origin isolation headers, from the service worker, since a static host will not send them.',
  },
  {
    heading: '8. Atlas and grid calculator',
    body: 'Given the component count the sheet asks for — the chosen directional mode plus any additional anatomy the subject names — the calculator lays those components into a grid biased to the sheet aspect ratio and works out the cell size and the sprite bounds left after the bleed gutter. It then answers the two questions those figures exist for: whether the target component size the studio asks the generator for actually fits that cell, at the largest whole-number scale it fits at, and what the texture costs in graphics memory uncompressed and block-compressed, with and without a mip chain. It also prices the waste, by counting the slots no component reaches and reporting how much of the texture ends up holding artwork at all — and exports the lot as JSON an importer for Godot, Unity or PixiJS can read.',
  },
  {
    heading: '9. Offline first',
    body: 'The application shell, its styles and the SQLite WebAssembly binary are all precached, so the studio works with no network at all and can be installed as a standalone app. A new build takes over as soon as it has downloaded, reloading the page — safe here because everything you have typed is already in the local database rather than held in the page.',
  },
  {
    heading: '10. Design tokens and accessibility',
    body: 'Every colour and animation in the interface comes from a named design token, so the palette is defined in exactly one place. The accent marks actions and focus — indigo by default, and one of nine hues you can change in Settings — while cyan is reserved for anything recomputing live and is not offered as an accent, because that would erase the distinction. Each of the four views keeps its own colour whatever you choose, since that is how the page says where you are. Every hue carries the same luminance as the default, so changing it cannot change how legible anything is. The suggestion fields are real ARIA comboboxes with keyboard selection, overlays are native dialogs with genuine focus containment, confirmations announce through a live region, and a single reduced-motion rule quiets every animation for anyone who has asked their system for less movement — with the same quiet available in Settings for anyone who wants this app calm without changing that system-wide.',
  },
];
