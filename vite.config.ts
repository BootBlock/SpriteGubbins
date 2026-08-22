import { fileURLToPath } from 'node:url';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';
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
 * The manifest is read for its `version` alone, which the `define` block below inlines as
 * `__APP_VERSION__` (see `src/constants/about.ts`).
 *
 * Read here rather than imported by the app, so package.json never enters the bundle — and
 * single-sourced rather than retyped in a constant, because the deploy workflow refuses to publish
 * new code under an already-tagged version and then tags the release `v<version>`. A hand-copied
 * number in the UI would drift from the tag naming the very build the user is looking at, and
 * nothing would notice.
 */
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

/**
 * Cross-origin isolation headers (spec Phase 1, Task 1.3.3).
 *
 * **These are not what makes the database work**, though they were originally added believing they
 * were. The SAH-pool VFS this app installs needs `createSyncAccessHandle`, which browsers expose
 * only *inside a worker* — so the database lives in `src/db/sqliteWorker.ts`, and it neither needs
 * nor waits on `SharedArrayBuffer`. That requirement belongs to the plain `opfs` VFS, which this app
 * does not use; CLAUDE.md records the check that established the difference.
 *
 * What isolation actually buys is the COEP `require-corp` posture: a cross-origin subresource cannot
 * load unless it opts in. That is the only thing *enforcing* this app's no-third-party-request rule
 * — it is why the fonts fall back to system faces rather than fetching a webfont — so the headers
 * are kept for that, and removing them would be a decision about the subresource policy rather than
 * about persistence.
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

/**
 * The precache manifest, stated rather than discovered.
 *
 * `globPatterns` walks `dist/` and has no view of the module graph, so it precaches whatever the
 * build happened to leave in the directory. That is how a 210 kB `sqlite3-worker1-*.js` chunk
 * nothing in this app loads came to be downloaded by every visitor. Excluding that one file fixes
 * that one file; this list is what stops the next one, because a build whose precache does not
 * match it fails rather than shipping.
 *
 * Each entry is a built URL with its content hash replaced by `*` — the hash changes on every
 * edit, the shape does not. Adding a chunk, an icon or a font means adding a line here, in the
 * same commit, where a reviewer can see it.
 *
 * `manifest.webmanifest` is deliberately absent: vite-plugin-pwa appends it, and the two PWA
 * icons a second time, *after* the `manifestTransforms` step below runs. So this list and the
 * ceiling under it describe the globbed precache — 15 of the shipped worker's 18 entries — and
 * the three they miss are fixed, small and not what a stray chunk arrives as.
 */
const PRECACHE_SHAPES: readonly string[] = [
  '404.html',
  'assets/autoTuneWorker-*.js',
  'assets/index-*.css',
  'assets/index-*.js',
  'assets/quantiseWorker-*.js',
  'assets/sheetWriteWorker-*.js',
  'assets/sqlite3-*.wasm',
  'assets/sqlite3-opfs-async-proxy-*.js',
  'assets/sqliteWorker-*.js',
  'assets/workbox-window.prod.es5-*.js',
  'coi-bootstrap.js',
  'favicon.ico',
  'icon-192.png',
  'icon-512.png',
  'index.html',
];

/**
 * A ceiling in KiB on the entries `PRECACHE_SHAPES` lists.
 *
 * That list catches a new *file*; this catches an existing one growing — the app chunk and the
 * SQLite binary are four fifths of the figure between them. What the figure stands at today is
 * not restated here, because it moves with every commit and a number in a comment would be wrong
 * within the week: every build prints it, as `precache <n> entries (<size> KiB)`. The headroom
 * over it is deliberately small, so a 200 kB addition fails here and is argued for in a diff
 * rather than turning up later in a page-load waterfall. Raising the ceiling is a normal thing to
 * do, and it is a line a reviewer sees.
 */
const PRECACHE_CEILING_KIB = 2160;

/** `assets/index-CWZFRISS.css` → `assets/index-*.css`. Vite's content hash is 8 characters. */
function precacheShape(url: string): string {
  return url.replace(/-[A-Za-z0-9_-]{8}(\.[a-z0-9]+)$/, '-*$1');
}

/**
 * Hold the generated precache to `PRECACHE_SHAPES` and `PRECACHE_CEILING_KIB`, and fail the build
 * on any disagreement.
 *
 * Runs as a `manifestTransforms` step, which is the one place the entries and their sizes are both
 * in hand before the worker is written — no parsing of `dist/sw.js`, and no guessing at the order
 * plugin `closeBundle` hooks run in. The manifest is passed through untouched.
 */
function assertPrecacheContract(entries: readonly { url: string; size: number }[]): void {
  const found = [...new Set(entries.map((entry) => precacheShape(entry.url)))].sort();
  const expected = [...PRECACHE_SHAPES].sort();
  const added = found.filter((shape) => !expected.includes(shape));
  const removed = expected.filter((shape) => !found.includes(shape));
  if (added.length > 0 || removed.length > 0) {
    throw new Error(
      [
        'The precache manifest no longer matches PRECACHE_SHAPES in vite.config.ts.',
        ...added.map((shape) => `  + ${shape} (precached, not listed)`),
        ...removed.map((shape) => `  - ${shape} (listed, not precached)`),
        'Every file here is downloaded on a first visit. Confirm each addition is one the app',
        'actually loads — a chunk nothing imports belongs in globIgnores — then update the list.',
      ].join('\n'),
    );
  }

  const totalKiB = entries.reduce((sum, entry) => sum + entry.size, 0) / 1024;
  if (totalKiB > PRECACHE_CEILING_KIB) {
    throw new Error(
      `The precache is ${totalKiB.toFixed(2)} KiB, over the ${PRECACHE_CEILING_KIB} KiB ceiling ` +
        'in vite.config.ts. That is what a first visit downloads: cut it, or raise the ceiling ' +
        'in the same commit and say why.',
    );
  }
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
        // `@sqlite.org/sqlite-wasm` ships a Worker1 promiser beside the direct API, and its
        // `defaultConfig` names the worker with `new Worker(new URL('sqlite3-worker1.mjs',
        // import.meta.url), { type: 'module' })`. This app never calls the promiser — `src/db`
        // installs the SAH pool and opens the database itself, over its own message protocol —
        // but that expression is statically analysable, so a 210 kB chunk is emitted for it.
        //
        // **It cannot be kept out of `dist/` from here, and it is not for want of trying.** Vite's
        // worker plugin rewrites that expression at *transform* time and emits the chunk with
        // `emitFile`, which happens before tree-shaking has any say and writes the file whether or
        // not a reference to it survives. Verified: telling Rolldown the whole package is
        // side-effect-free (`worker.rolldownOptions.treeshake.moduleSideEffects` returning false
        // for `sqlite-wasm`) produced a byte-identical `dist/`, same chunk hashes included. An
        // alias is no use either — the factory sits in the same `dist/index.mjs` that the
        // `sqlite3InitModule` this app *does* import comes from.
        //
        // So the chunk stays on the host, unreferenced and never fetched, and what is fixed is the
        // download: it is out of the precache, and `assertPrecacheContract` above is what stops
        // the next stray chunk taking its place.
        globIgnores: ['**/sqlite3-worker1-*.js'],
        manifestTransforms: [
          (entries) => {
            assertPrecacheContract(entries);
            return { manifest: entries };
          },
        ],
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

  // Build-time constant consumed by `src/constants/about.ts`, which the About section renders.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  optimizeDeps: {
    // @sqlite.org/sqlite-wasm ships its own worker and `.wasm` asset and must not be pre-bundled
    // or transformed by esbuild (official Vite guidance) — doing so breaks the relative lookup
    // the loader uses to find the binary (spec Task 1.3.4).
    exclude: ['@sqlite.org/sqlite-wasm'],

    // Every runtime dependency the app imports, named rather than left to be discovered.
    //
    // The dev server rewrites each bare import to `/node_modules/.vite/deps/<dep>.js?v=<hash>`,
    // and a hash belongs to one optimisation round. Ask for a *previous* round's hash and Vite
    // answers `504 Outdated Optimize Dep` — a response that carries **no `Content-Type` at all**,
    // which Firefox reports as `blocked because of a disallowed MIME type ("")` before refusing to
    // execute the module. React, react-dom/client and the JSX runtime are all static imports of
    // `main.tsx`, so they fail together and the page stays blank. Vite's recovery is a full reload
    // pushed over the HMR socket, and on a cold load that socket is still connecting when the
    // imports fail — the console shows `[vite] connecting…` *after* the failures — so the message
    // can land on nothing and the blank page persists until someone refreshes by hand.
    //
    // **`react-dom/client` is the entry that was not pinned.** `@vitejs/plugin-react` contributes
    // an include list of its own — `react`, `react-dom`, `react/jsx-runtime` and
    // `react/jsx-dev-runtime` — and the specifier `main.tsx` actually imports, `react-dom/client`,
    // is not in it. Vite optimises per entry point rather than per package, so that one was pinned
    // separately from the other three and carried a different `?v=` hash; with the whole set named
    // here the hashes match. Anything imported as a subpath needs naming for the same reason —
    // `zustand/middleware` would be a fresh entry, not covered by `zustand`.
    //
    // The list is exhaustive rather than minimal because the scanner cannot be trusted to find
    // everything: it crawls the static import graph from `index.html`, which never reaches
    // `src/db/sqliteWorker.ts` — that module is constructed at runtime by
    // `new Worker(new URL(…, import.meta.url))`, which is not an import. Nothing the worker pulls
    // in needs an entry *today* (its one bare import is excluded above, and an excluded dependency
    // is never pre-bundled, so it cannot trigger a round of its own). That makes the worker a
    // reason to keep naming dependencies, not an account of what went wrong here.
    // `react-dom` is a second entry point beside `react-dom/client`, not a duplicate of it: Vite
    // optimises per entry, so the two carry separate hashes. `createPortal` is imported from the
    // bare specifier — it is what renders the quantiser's comparison panel into a window of its own.
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'zustand',
    ],
  },

  worker: {
    format: 'es',
  },

  server: {
    headers: { ...crossOriginIsolationHeaders },
    // Fixed and strict, because Vite's default is to take the next free port in silence. Several
    // agents run dev servers out of `.claude/worktrees/` concurrently, each tree carrying its own
    // `node_modules/.vite/deps` with its own hashes — so a browser left pointing at the usual
    // address can be answered by a *different* checkout than the one being edited, serving a
    // module graph whose dep hashes belong to somebody else's optimisation round. Failing to start
    // says which tree already holds the port; drifting to the next one hides it. A second server
    // is meant to be given a port of its own (`npx vite --port <n>`), as the `verify` skill says.
    port: 5173,
    strictPort: true,
  },
  preview: {
    headers: { ...crossOriginIsolationHeaders },
    // Pinned for the same reason as the dev server minus the dependency half of it: `vite preview`
    // serves a built `dist/`, so it pre-bundles nothing and has no `?v=` hashes to go stale. What
    // it shares is the hazard of quietly answering on a port you believed belonged to another
    // tree — here handing back someone else's build, which looks exactly like your own.
    port: 4173,
    strictPort: true,
  },

  test: {
    environment: 'happy-dom',
    // No `globals: true`. Every test imports `describe` / `it` / `expect` from 'vitest'
    // explicitly, which keeps test files inside the TypeScript program (so `tsc -b` checks
    // them) without leaking test-only ambient types into product code.
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Vitest's defaults, plus `.claude`. Worktrees live in `.claude/worktrees/`, and a worktree is
    // a whole second checkout of this repo — so without this, a run from the root collects every
    // other branch's tests alongside this one's and reports their failures as ours. Spreading the
    // defaults rather than replacing them keeps `node_modules` and `dist` excluded too.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
