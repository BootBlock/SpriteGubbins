import { fileURLToPath } from 'node:url';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * The site root. GitHub Pages serves a project site from `/<repo>/`, and the manifest scope,
 * start URL and every emitted asset path have to agree with it — so it is declared once here
 * and everything else derives from it.
 */
const BASE = '/SpriteGubbins/';

/**
 * Cross-origin isolation headers (spec Phase 1, Task 1.3.3).
 *
 * SQLite's high-performance OPFS VFS coordinates synchronous blocking between its worker and
 * the file system through `SharedArrayBuffer`, which browsers expose only to
 * cross-origin-isolated contexts. Without both of these headers the database silently degrades
 * to the localStorage fallback in `src/db`.
 *
 * They are set here for dev and preview. **Production cannot use this path** — GitHub Pages
 * sends no custom headers — so there the service worker (`src/sw.ts`) injects them instead, and
 * `public/coi-bootstrap.js` reloads once on first visit so the page comes back isolated.
 *
 * The spec calls for `configureServer` / `configurePreviewServer` hooks; Vite's declarative
 * `server.headers` / `preview.headers` are the same thing without a bespoke plugin, and apply
 * to every response the respective server issues.
 */
const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
} as const;

/**
 * Emit `404.html` as a byte copy of the built `index.html`.
 *
 * GitHub Pages returns `404.html` for any path that doesn't map to a file. Serving the app
 * shell there is what makes a refresh — or a shared deep link — resolve, on a cold load before
 * the service worker is in control. A byte copy rather than the usual redirect script because
 * that trick needs an inline `<script>`, which this app deliberately doesn't ship.
 *
 * Runs in `closeBundle`, after the final (PWA-transformed) `index.html` is on disk.
 */
function spa404FallbackPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sprite-gubbins-spa-404',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const index = resolve(outDir, 'index.html');
      if (existsSync(index)) copyFileSync(index, resolve(outDir, '404.html'));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: BASE,

  plugins: [
    react(),
    tailwindcss(),
    spa404FallbackPlugin(),
    VitePWA({
      // `injectManifest`, not `generateSW`: the worker has to add the cross-origin isolation
      // headers to every response, which needs custom fetch logic a generated worker cannot
      // express. It handles precaching itself — see src/sw.ts.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // `autoUpdate` (spec Task 1.3.2): the app holds no unsaved state a swap could lose —
      // everything the user has typed is already in the local database — so taking the new
      // build promptly costs nothing, and the isolation bootstrap needs the worker to activate
      // rather than sit waiting behind a prompt.
      registerType: 'autoUpdate',
      // Registration happens in app code via the `virtual:pwa-register` module (main.tsx), so
      // no registration snippet is injected into index.html.
      injectRegister: null,
      injectManifest: {
        // SQLite's WASM binary is well over Workbox's 2 MiB default single-file cap, and the
        // app is useless offline without it.
        globPatterns: ['**/*.{js,css,html,wasm,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        id: BASE,
        name: 'Sprite Gubbins',
        // The specification says `Gubbins`, which is wrong here: the sibling Gubbins project is
        // a separate installable PWA using exactly that short name, so two indistinguishable
        // icons would appear on any device with both. Truncated by a launcher this still reads
        // as "Sprite Gub…", which is the part that disambiguates.
        short_name: 'Sprite Gubbins',
        description:
          'Compose precise, model-targeted prompts for generating game sprite sheets and texture atlases.',
        lang: 'en-GB',
        theme_color: '#060911',
        background_color: '#060911',
        display: 'standalone',
        orientation: 'any',
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      // The service worker stays out of the way during local development; cross-origin
      // isolation is exercised through the dev-server headers below instead.
      devOptions: { enabled: false },
    }),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // @sqlite.org/sqlite-wasm ships its own worker and `.wasm` asset and must not be pre-bundled
  // or transformed by esbuild (official Vite guidance) — doing so breaks the relative lookup
  // the loader uses to find the binary (spec Task 1.3.4).
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },

  worker: {
    format: 'es',
  },

  server: {
    headers: { ...crossOriginIsolationHeaders },
  },
  preview: {
    headers: { ...crossOriginIsolationHeaders },
  },

  test: {
    environment: 'happy-dom',
    // No `globals: true`. Every test imports `describe` / `it` / `expect` from 'vitest'
    // explicitly, which keeps test files inside the TypeScript program (so `tsc -b` checks
    // them) without leaking test-only ambient types into product code.
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
