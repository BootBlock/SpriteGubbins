import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Cross-origin isolation headers (spec Phase 1, Task 1.3.3).
 *
 * SQLite's high-performance OPFS VFS coordinates synchronous blocking between its worker
 * and the file system through `SharedArrayBuffer`, which browsers expose only to
 * cross-origin-isolated contexts. Without both of these headers the database silently
 * degrades — hence the localStorage fallback in `src/db` — so they are set on the dev and
 * preview servers here, and a static production host must be configured to send them too.
 *
 * The spec calls for `configureServer` / `configurePreviewServer` hooks; Vite's declarative
 * `server.headers` / `preview.headers` are the same thing without a bespoke plugin, and
 * apply to every response the respective server issues.
 */
const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
} as const;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // `autoUpdate` (spec Task 1.3.2): the prompt compiler holds no unsaved server-side
      // state — everything the user has typed is already in the local database — so taking
      // the new build on the next navigation costs nothing and keeps installs current.
      registerType: 'autoUpdate',
      // Registration happens in app code via the `virtual:pwa-register` module (main.tsx),
      // so no registration snippet is injected into index.html.
      injectRegister: null,
      workbox: {
        // SQLite's WASM binary is well over Workbox's 2 MiB default single-file cap, and the
        // app is useless offline without it.
        globPatterns: ['**/*.{js,css,html,wasm,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'Sprite Gubbins',
        short_name: 'Gubbins',
        description:
          'Compose precise, model-targeted prompts for generating game sprite sheets and texture atlases.',
        lang: 'en-GB',
        theme_color: '#060911',
        background_color: '#060911',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      // The service worker stays out of the way during local development; OPFS and
      // cross-origin isolation are exercised through the dev-server headers below instead.
      devOptions: { enabled: false },
    }),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // @sqlite.org/sqlite-wasm ships its own worker and `.wasm` asset and must not be
  // pre-bundled or transformed by esbuild (official Vite guidance) — doing so breaks the
  // relative lookup the loader uses to find the binary (spec Task 1.3.4).
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
    // happy-dom rather than node: the database layer's localStorage fallback and the UI
    // stores are browser-shaped, so they need a DOM to be tested at all.
    environment: 'happy-dom',
    // No `globals: true`. Every test imports `describe` / `it` / `expect` from 'vitest'
    // explicitly, which keeps test files inside the app's TypeScript program (so `tsc -b`
    // checks them) without leaking test-only ambient types into product code.
    css: false,
  },
});
