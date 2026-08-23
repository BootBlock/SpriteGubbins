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
  'assets/sheetCanvas-*.js',
  'assets/spriteSegments-*.js',
  'assets/targetSize-*.js',
  'assets/useClipboard-*.js',
  'assets/useCopyPrompt-*.js',
  'assets/useDownload-*.js',
  'assets/useShowToast-*.js',
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
 *
 * **Raised from 2160 by the three subject categories PORTRAIT, ICON and BACKGROUND.** Each ships
 * sixteen option pools with their tooltips, one or two sheet plans, five per-category prompt-text
 * entries and four presets — all of it constant data the entry chunk reaches, so all of it lands in
 * the precache. Measured against the build immediately before them, the three cost 56.84 KiB, which
 * is nearly three times the headroom the old ceiling had left. The new figure restores that headroom
 * rather than widening it: a category is a large addition and the next one should have to say so
 * here, which is the whole point of the small margin.
 *
 * **Raised again from 2220 by PORTRAIT’s near-future option pools.** Fifteen of that category’s
 * sixteen pools gained options — fourteen of them the cyberpunk and adjacent-genre entries issue
 * #140 asked for, and `Head Turn & Pose` four poses that are not genre entries at all — along with
 * six tooltips and a docblock paragraph explaining them. Measured against the build immediately
 * before, that is 4.42 KiB: the precache goes from 2217.06 to 2221.48 KiB. Option text is constant
 * data the entry chunk reaches, so a pool is paid for on every first visit, which is the reason
 * expanding one is a line in this file rather than an invisible edit. The 3.52 KiB left over is the
 * same order of headroom the figure has carried since the last raise.
 *
 * **Raised once more, from 2225, by the edge-hardening pass on the Quantise tab.** The pass itself is
 * small; what it costs is the constant data around it — a ladder, two defaults, the control’s
 * guidance paragraph and the panel’s own — all of which the entry chunk reaches. Measured against
 * the build immediately before it, that came to 3.38 KiB, and it lands on top of the pools above: the
 * two together bring the precache to 2224.86 KiB. The new figure keeps a margin of the same order
 * rather than widening it.
 *
 * **Raised once more, from 2228, by the FONT subject category.** Measured against the build
 * immediately before it — 2224.86 KiB, rebuilt from that commit with the same `node_modules` — this
 * one takes the precache to 2247.43 KiB, a delta of 22.57 KiB for a sixteen-field option pool with
 * its guidance, four sheet plans and four presets. That is a fifth more than the 18.9 KiB average of
 * the three categories in the paragraph above, and the reason is worth recording rather than
 * averaging away: this category's plans enumerate ninety-four glyphs one entry at a time, where the
 * other three name a dozen components between them.
 *
 * **It is not the entry chunk, and the paragraphs above should not be read as saying a category ever
 * is.** `assets/index-*.js` is byte-identical across the two builds at 222.97 kB. The growth lands in
 * the three chunks that pull the constants in — `quantiseDials`, `useShowToast` and `useCopyPrompt`
 * — which is what the precache figure measures and the entry chunk is not. The margin is left at the
 * same order as every raise above rather than widened to absorb the next one.
 *
 * **Raised once more again, from 2251, by the extended auto-tune sweep.** It adds no pass and no
 * control; what it costs is ladders and prose — four dial ladders for the anti-aliasing stages, three
 * more entries in `TUNE_STAGE_LABELS`, the panel's five rewritten guidance paragraphs and the Auto
 * button's own card, which grew to name the twelve dials the sweep moves and the fourteen it will
 * not. Measured against the build immediately before it, the precache goes from 2247.43 to **2250.62
 * KiB**, a delta of 3.19 — and it lands in the same constants-pulling chunks the paragraph above
 * names rather than in the entry chunk. The margin is left at the same order as every raise above.
 *
 * **Raised once more, from 2254, by the per-component names the sheet plans now carry.** Every
 * inventory line whose components are told apart by what they are rather than by where they sit
 * gained a `parts` list naming each of them, so a sprite pack cut from a character rig writes
 * `04-left-upper-arm.png` where it wrote `04-left-arm-1.png` — around 460 names across the ten plan
 * files that have any. Measured against the build immediately before it, the precache goes from
 * 2250.62 to **2258.58 KiB**, a delta of 7.96. It is constant data the entry chunk reaches, which is
 * why it is paid for on a first visit and named here rather than being an invisible edit. The margin
 * is left at the same order as every raise above.
 */
export const PRECACHE_CEILING_KIB = 2262;

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
