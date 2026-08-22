/**
 * What a first visit is allowed to download, stated rather than discovered.
 *
 * `vite.config.ts` gives vite-plugin-pwa a `globPatterns` that walks `dist/`, and a glob has no
 * view of the module graph — so it precaches whatever the build happened to leave in the
 * directory. That is how a 210 kB `sqlite3-worker1-*.js` chunk nothing in this app loads came to
 * be downloaded by every visitor. Excluding that one file fixes that one file; this module is
 * what stops the next one, because a build whose precache does not match the contract below
 * fails rather than shipping.
 *
 * It lives here rather than in the config because it is an assertion about the build's output,
 * not a setting the build reads — and the config already carries three responsibilities.
 * `assertPrecacheContract` is wired in as a `manifestTransforms` step.
 */

/**
 * The precache, as built URLs with the content hash replaced by `*` — the hash changes on every
 * edit, the shape does not. Adding a chunk, an icon or a font means adding a line here, in the
 * same commit, where a reviewer can see it.
 *
 *
 * **Most of this list is now bundler-chosen, and that is a cost worth naming.** The app is split
 * into a chunk per view and per overlay, and rolldown emits a further chunk for whatever two of
 * them share — naming each after one module inside it, which is a name no source file chose. So a
 * refactor that moves a shared component between views renames a chunk and fails this build, with
 * a `+`/`-` pair that reads like a stray file and is not one. The entries a reader can reason
 * about are the ones above the split: the workers, the SQLite binary, the entry chunk and the
 * icons. Whether the split's own chunks belong here as names, as a pattern, or not at all is a
 * decision about this contract rather than about the split, and is left to whoever owns it.
 *
 * `manifest.webmanifest` is deliberately absent: vite-plugin-pwa appends it, and the two PWA
 * icons a second time, *after* the `manifestTransforms` step runs. So this list and the ceiling
 * under it describe the globbed precache — 15 of the shipped worker's 18 entries — and the three
 * they miss are fixed, small and not what a stray chunk arrives as.
 */
export const PRECACHE_SHAPES: readonly string[] = [
  '404.html',
  'assets/autoTuneWorker-*.js',
  'assets/AtlasCalculatorContents-*.js',
  'assets/Badge-*.js',
  'assets/CheckboxField-*.js',
  'assets/JsonPackTransfer-*.js',
  'assets/PresetsTab-*.js',
  'assets/PromptHistoryContents-*.js',
  'assets/QuantiseTab-*.js',
  'assets/SelectField-*.js',
  'assets/SettingsContents-*.js',
  'assets/SheetSplitContents-*.js',
  'assets/SpecTab-*.js',
  'assets/StudioTab-*.js',
  'assets/TextField-*.js',
  'assets/Tooltip-*.js',
  'assets/componentBudget-*.js',
  'assets/componentGridScale-*.js',
  'assets/database-*.js',
  'assets/firstOfEachId-*.js',
  'assets/models-*.js',
  'assets/quantiseDials-*.js',
  'assets/rolldown-runtime-*.js',
  'assets/spriteSegments-*.js',
  'assets/targetSize-*.js',
  'assets/useClipboard-*.js',
  'assets/useCopyPrompt-*.js',
  'assets/useDownload-*.js',
  'assets/useSubjectStore-*.js',
  'assets/useUIStore-*.js',
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
export const PRECACHE_CEILING_KIB = 2160;

/**
 * `assets/index-CWZFRISS.css` → `assets/index-*.css`. Vite's content hash is 8 characters.
 *
 * The hash alphabet includes `-`, and it has to: `assets/sqlite3-BVKGSWc-.wasm` is a real built
 * name whose eighth hash character *is* a hyphen, and narrowing the class to `[A-Za-z0-9_]` would
 * leave that one entry un-stripped and its shape drifting on every rebuild.
 */
export function precacheShape(url: string): string {
  return url.replace(/-[A-Za-z0-9_-]{8}(\.[a-z0-9]+)$/, '-*$1');
}

/** One entry of the manifest, as workbox hands it to a `manifestTransforms` step. */
interface SizedManifestEntry {
  readonly url: string;
  readonly size: number;
}

/**
 * Hold the generated precache to `PRECACHE_SHAPES` and `PRECACHE_CEILING_KIB`, and throw on any
 * disagreement — which fails the build, because workbox awaits each transform with no `catch`.
 *
 * A `manifestTransforms` step is the one place the entries and their sizes are both in hand
 * before the worker is written: no parsing of `dist/sw.js`, and no guessing at the order plugin
 * `closeBundle` hooks run in. The caller passes the manifest on untouched.
 *
 * Throwing here stops the injection midway, so **a failed build leaves a `dist/` that must not be
 * served**: measured, `npm run build` exits 1 and `dist/sw.js` still carries the literal
 * `self.__WB_MANIFEST`, which would throw on install if it reached a host. The deploy workflow
 * fails on the exit code, so this only reaches a developer who serves `dist/` after a build they
 * did not watch. Fix the contract and build again rather than reaching for the directory.
 */
export function assertPrecacheContract(entries: readonly SizedManifestEntry[]): void {
  const found = [...new Set(entries.map((entry) => precacheShape(entry.url)))].sort();
  const expected = [...PRECACHE_SHAPES].sort();
  const added = found.filter((shape) => !expected.includes(shape));
  const removed = expected.filter((shape) => !found.includes(shape));
  if (added.length > 0 || removed.length > 0) {
    throw new Error(
      [
        'The precache manifest no longer matches PRECACHE_SHAPES in scripts/precacheContract.ts.',
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
        'in scripts/precacheContract.ts. That is what a first visit downloads: cut it, or raise ' +
        'the ceiling in the same commit and say why.',
    );
  }
}
