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
 * **Five of them arrived together with `constants/guidanceSentences.ts`**, and they are the cost that
 * docblock predicts rather than a new file the app loads. That module holds the sentences more than
 * one control's guidance states, so it is reached from the studio, the quantiser, the preset library
 * and the settings dialog at once — which changes which entries reach a good many modules, and
 * rolldown re-partitions around it. `about`, `dialogs`, `usePresetStore`, `useQuantisePresetStore`
 * and `useSettingsStore` are chunks the app already downloaded inside larger ones: measured against
 * the build immediately before, the precache goes from 48 entries at 2312.62 KiB to 53 at 2312.78,
 * so what is added is five requests and 0.16 KiB, not five files of new code.
 *
 * **`isTextEntry` arrived the same way, and is one module rather than five.** It holds the predicate
 * that tells a box which edits text from every other control, which `useUndoShortcut` asks for the
 * keyboard's sake and `useFileDropGuard` for the drag's — a hook reached from the studio's history
 * controls and a hook reached from the shell, so rolldown cuts it out of both into a chunk they
 * share and names the chunk after it. Measured against the build immediately before, from the same
 * `node_modules`, the precache goes from 2318.71 to **2319.14 KiB** across 53 entries and then 54:
 * what a first visit gains is one request and 0.43 KiB, not a file of new code. Merged with the
 * `--color-tab` cyan guard that landed alongside it, the build reports **2319.18**. No chunk was
 * renamed, and the ceiling is left where it stands — on 0.82 KiB of headroom, which is the
 * narrowest this margin has been and is worth reading before the next base figure is taken for
 * slack.
 *
 * **`storageFailure` is the third arrival of that shape, and the clearest of them.** It holds the
 * one sentence a storage failure may be reported with instead of the caller's own — the refusal a
 * second tab of this origin gets — and five stores raise that failure, so rolldown cuts it out of
 * all five and names the chunk after it. What a first visit gains is one request and a few hundred
 * bytes, not a file of new code, exactly as the two notes above describe. It arrived with the
 * `held-elsewhere` backend; the ceiling note below carries the measurement.
 *
 * `manifest.webmanifest` is deliberately absent: vite-plugin-pwa appends it, and the two PWA
 * icons a second time, *after* the `manifestTransforms` step runs. So this list and the ceiling
 * under it describe the globbed precache — every entry of the shipped worker but those three — and
 * the three they miss are fixed, small and not what a stray chunk arrives as. Stated as a
 * relationship rather than a pair of counts, because the counts move with every chunk the split
 * produces and the paragraph above already names today's.
 *
 * **Sixteen lines left this list in one build, and nothing in this repository moved them.** `vite`
 * went from 8.1.5 to 8.2.2 in the dependency group merged on 12 September 2026, and the newer
 * bundler stops cutting sixteen of the split's shared chunks out of the entry chunk: `Badge`,
 * `about`, `componentTargetSize`, `dialogs`, `isTextEntry`, `models`, `react-dom`, `sheetCanvas`,
 * `sheetCoverage`, `useClipboard`, `useCopyPrompt`, `useFileDropGuard`, `usePresetStore`,
 * `useProjectStore`, `useQuantiseStore` and `useSettingsStore` are absent from `dist/` altogether,
 * and `assets/index-*.js` absorbs them at 326.4 kB against the 222.97 an older note above records.
 * So what the removals describe is sixteen files a first visit no longer *requests*, not sixteen it
 * no longer gets. Measured on the base commit with nothing else changed, the build reports **48
 * entries at 2389.39 KiB**; the commit that prunes this list also adds section 0's transparency
 * rules and ships at **2389.72**. Both are inside the ceiling, so the ceiling is left where it
 * stands, on the 6.28 KiB the second figure leaves.
 *
 * **The bump landed without this gate run over it, which is the part worth keeping.** `npm run
 * build` failed on every branch cut after that merge, with sixteen `-` lines and no `+` line —
 * exactly the shape the paragraph above warns reads like a stray file, arriving sixteen at once
 * because a bundler minor re-cut the split rather than because anything here was renamed. A
 * dependency bump changes this contract's subject as surely as a refactor does.
 *
 * **Several of the arrival notes above now describe chunks no build emits.** `about`, `dialogs`,
 * `usePresetStore` and `useSettingsStore` are four of the `guidanceSentences.ts` five, `isTextEntry`
 * is the note beside them, and `useQuantiseStore` is the identity lock's. They stay as the record of
 * what each cost on the first visit it arrived on; none of them is a line in the list any more.
 */
export const PRECACHE_SHAPES: readonly string[] = [
  '404.html',
  'assets/autoTuneWorker-*.js',
  'assets/AtlasCalculatorContents-*.js',
  'assets/CheckboxField-*.js',
  'assets/PresetCardSpecs-*.js',
  'assets/PresetsTab-*.js',
  'assets/ProjectSelectField-*.js',
  'assets/ProjectsTab-*.js',
  'assets/PromptHistoryContents-*.js',
  'assets/QuantisePresetRow-*.js',
  'assets/QuantiseTab-*.js',
  'assets/SelectField-*.js',
  'assets/SettingsContents-*.js',
  'assets/SheetSplitContents-*.js',
  'assets/SheetStepButtons-*.js',
  'assets/SpecTab-*.js',
  'assets/StudioTab-*.js',
  'assets/Tooltip-*.js',
  'assets/componentBudget-*.js',
  'assets/database-*.js',
  'assets/presets-*.js',
  'assets/quantiseDials-*.js',
  'assets/rolldown-runtime-*.js',
  'assets/spriteSegments-*.js',
  'assets/storageFailure-*.js',
  'assets/useConfirmInPlace-*.js',
  'assets/useDownload-*.js',
  'assets/useExpectedComponents-*.js',
  'assets/useFileSave-*.js',
  'assets/useScrollableRegion-*.js',
  'assets/useShowToast-*.js',
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
 * over it was a third of the ceiling when it was set, at half again the figure it replaced, so
 * ordinary growth does not meet it. What it catches is a change of a different order: a bundled dependency, a second
 * copy of the SQLite binary, a data set pulled into the entry chunk. That is argued for in a diff
 * rather than turning up later in a page-load waterfall. Raising the ceiling is a normal thing to
 * do, and it is a line a reviewer sees. The notes below record each raise, and all but the last
 * were set just over the build.
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
 * **Raised once more, from 2254, by the Quantise tab's sheet-identity panel.** It adds a panel, a
 * hook, a shared step-button component and two guidance paragraphs, and it moves the step buttons
 * out of the studio so both tabs reach them. Measured against the build immediately before it, the
 * precache goes from 2250.62 to **2253.00 KiB**, a delta of 2.38. Four of the shape lines above moved
 * in the same build for **two** renames, and no file was added to or removed from the precache by it:
 * sharing `SheetStepButtons` and `sheetCoverage` between the studio and the quantiser re-cut two of
 * the split's shared chunks, so `TextField-*` and `componentGridScale-*` gave their names up to them.
 * Those are two of exactly the `+`/`-` pairs the note on `PRECACHE_SHAPES` warns read like a stray
 * file and are not one.
 *
 * **Raised once more, from 2256 to 2264, by the per-component names the sheet plans now carry.** Every
 * inventory line whose components are told apart by what they are rather than by where they sit
 * gained a `parts` list naming each of them, so a sprite pack cut from a character rig writes
 * `04-left-upper-arm.png` where it wrote `04-left-arm-1.png` — 328 names on 98 entries, across the
 * eleven plan files that have any. Measured against the build immediately before it, the precache
 * goes from 2253.00 to **2260.98 KiB**, a delta of 7.98. It is constant data the entry chunk
 * reaches, which is why it is paid for on a first visit and named here rather than being an
 * invisible edit. The margin is left at the same order as every raise above.
 *
 * **Raised once more, from 2264 to 2268, where the rig target-size change met the raise above it.**
 * Neither branch crossed the ceiling on its own — the target-size work measured 2252.72 KiB against
 * its own base and the per-component names measured 2260.98 against theirs — and the merge of the
 * two lands at **2265.42 KiB**. So this raise is bought by the smaller half of a pair that was
 * already 3.02 under: section 2's target-size line is stated twice, once for a component size and
 * once for an assembly, and the CUSTOM resolution profile gains a second wording beside it, because
 * a cut-out rig sheet's stated size is the figure its pieces assemble into. That is prompt text
 * rather than code, so it is constant data the entry chunk reaches, the same footing the raise above
 * stands on. The margin is left at the same order as every raise above. *
 * **Raised once more, from 2268, by the sprite pack's fixed cell.** The pack could only cut to each
 * sprite's own bounding box, which a rig importer cannot take, so the download now offers a stated
 * cell with the artwork registered at a stated anchor. The code is four small modules; what it costs
 * is prose — five guidance paragraphs for the new controls, two rewritten download cards, and the
 * labels each pill and box carries. Measured against the build immediately before it — 2265.42 KiB,
 * rebuilt from that commit with the same `node_modules` — the precache reaches **2273.85 KiB**, a
 * delta of 8.43. It adds no entry to `PRECACHE_SHAPES`: the modules land in the same
 * constants-pulling chunks every raise above names. The margin is left at the same order rather than
 * widened.
 *
 * **Raised once more, from 2278, by the palette export.** A settled palette can now leave the app as
 * a swatch PNG, a `.gpl` or a hex list, offered in the studio beside the control that pins one and on
 * the Quantise tab for the sheet's own colours and for a held lock. Measured against the build
 * immediately before it — 2273.85 KiB, the figure the raise above records — the precache reaches
 * **2283.43 KiB**, a delta of 9.58. About a quarter of that is prose: the five guidance paragraphs
 * measure 2,537 bytes between them, constant data the entry chunk reaches on the footing every raise
 * above stands on, and the rest is the three writers, the shared button row and the panel. No file
 * was added to or removed from the precache. The margin is left at the same order as every raise
 * above.
 *
 * **Raised once more, from 2287, by the identity lock reading the Quantise tab's sheet.** It adds a
 * button, a shared capture hook, the pure offer function behind it, five sentences of guidance, and
 * the two rules that button and the Quantise tab now share — `gridInForce` and `keyingInForce`.
 * Measured on its own base before this branch met main, the precache went from 2253.00 to **2257.15
 * KiB**, a delta of 4.15; the merge of the two lands at **2287.61**, which is the palette export's
 * recorded 2283.43 plus that delta to within 0.03. It also adds a *file* —
 * `assets/useQuantiseStore-*.js`, one of the shape lines above — and that one is not a rename: the
 * studio now reaches the quantiser's two stores, so the split cut them out of both views into a
 * chunk the two share. A first visit downloads the same bytes either way; what changed is that they
 * are now in a chunk of their own. The margin is left at the same order as every raise above.
 *
 * **Raised once more, from 2291, by the complementary options across all thirteen categories.** Every
 * category's sixteen pools gained options chosen so that each value in `Role / Class` — and each
 * value in the two fields that read like it, `Species / Archetype` and `Setting / Theme` — has
 * something to pair with in the other fifteen: a druid had an antlered circlet and no bark, hide or
 * herb pouch to wear with it, and a gunslinger had no hat. That is 664 options, plus seven colour
 * words and one compound in `constants/colors.ts`, all of it constant data the entry chunk reaches,
 * so all of it is paid for on a first visit. Measured against the build immediately before it —
 * 2288.92 KiB, rebuilt from that commit with the same `node_modules` — the precache reaches
 * **2305.95 KiB**, a delta of 17.03. No file was added to or removed from the precache. The margin is
 * left at the same order as every raise above rather than widened.
 *
 * **Raised once more, from 2309, by splitting the twelve modules the code-line target flags.** This
 * is the first raise bought by no content at all: no option, no guidance paragraph, no prompt text
 * and no control. Twenty modules were cut out of twelve, and what a first visit pays for is the
 * boilerplate a module boundary costs — the export bindings, the import records and the runtime's
 * registration of each. Measured against the build immediately before it, from the same
 * `node_modules`, the precache goes from **2308.87** to **2310.90 KiB**, a delta of 2.03 for twenty
 * new files: roughly a tenth of a KiB each. No file was added to or removed from `PRECACHE_SHAPES`,
 * and no chunk was renamed — the new modules land inside the chunks their callers were already in.
 *
 * The base figure is worth reading beside the ceiling it was under: 2308.87 against 2309 is
 * **0.13 KiB of headroom**, which is the narrowest this margin has ever been and is why a change
 * that adds no content at all crossed it. The margin is restored to the same order as every raise
 * above, not widened.
 *
 * **Raised once more, from 2314, by the exemption a category's §4 guard and §9 audit now carry for
 * the pieces the subject itself named.** Two clauses in `constants/promptText/exclusions.ts`, spliced
 * into all thirteen entries of each record by a helper the entries call — prompt text, so constant
 * data the entry chunk reaches, on the footing every raise above stands on. Measured against the
 * build immediately before it, from the same `node_modules`, the precache goes from **2313.83** to
 * **2314.23 KiB**, a delta of 0.40. Merged with the style-reference change that landed alongside it,
 * which shortens a sentence, the build reports **2314.22**. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed.
 *
 * The delta is that small because each clause is written down **once**: the entries interpolate a
 * function rather than a literal, so the bundle carries the sentence a single time and each of the
 * twenty-six splices costs a call. Written out at the call sites it would have been twenty-six
 * copies of about fifty characters.
 *
 * The base is again worth reading beside the ceiling it was under: 2313.83 against 2314 is
 * **0.17 KiB of headroom**, the second-narrowest this margin has been, and it is why four tenths of
 * a KiB of prose crossed it. The margin is restored to the same order as every raise above rather
 * than widened.
 *
 * **Raised once more, from 2317, by the rig relation moving onto the sheet plans.** A cut-out rig
 * could be asked for on a deliverable that already draws each moving part once per position it
 * takes, so section 5 forbade what section 4 required; the fix is a `posing` field on every one of
 * the thirty-two sheet plans, a second resolver beside `fixedRigMode`, and the sentence the rig
 * select now shows when the sheet contents withdraw the option. All of it is constant data or studio
 * code the entry chunk reaches, which is the footing every raise above stands on. Measured on its
 * own base before this branch met main — 2313.82 KiB — the precache reached **2315.86**, a delta of
 * 2.04; merged with the guard exemption the paragraph above records, the build reports **2316.25**,
 * which is that paragraph's own merged 2314.22 plus the same delta to within 0.01. No file was added
 * to or removed from `PRECACHE_SHAPES`, and no chunk was renamed.
 *
 * Both raises were bought from the same 2314, which is why this one names 2317 rather than 2314 as
 * the figure it lifts: two branches each found 0.18 KiB of headroom under it and each crossed it.
 * The margin is restored to the same order as every raise above rather than widened.
 *
 * **The paint-rule change raises nothing, and is recorded here because it nearly did.** Section 1's
 * rule — every fitted, applied and worn attribute is painted onto the component it sits on — was
 * fixed in the template with exactly one exception named, while six categories draw their `clothing`
 * value as components of their own, so a VEHICLE prompt called the cladding paint and then listed a
 * cladding panel. What a first visit pays for is a `drawsClothing` flag on the **26** inventory
 * entries that draw one — nine on ICON, seven on BACKGROUND, four on OBJECT, three on VEHICLE, two
 * on INTERFACE and one on BUILDING — the three lines that carry the answer from the plan to the
 * template (`utils/sheetPlanAbsence.ts`, one field on `SheetFacts` and one gate in
 * `promptConditions`), and one rewritten tooltip. The template is close to a wash: a one-line
 * exception paragraph against a fixed clause that named five example attributes, three of which were
 * the very things being excepted.
 *
 * Measured against main's own tip, rebuilt from the same `node_modules` — **2316.39 KiB** — the
 * merged build reports **2317.23**, a delta of 0.84 and 2.77 inside the 2320 the two raises above
 * had already bought. So the figure is left where they set it. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed.
 *
 * **It very nearly did raise it, and the review is why it did not.** A first draft closed the rule
 * with "… except where named below" while both exception paragraphs stayed gated, so on 71 of the
 * 118 sheets this app can compile the sentence promised a named exception and named none. Removing
 * that clause is what returned the sentence to its old self-contained form and took the cost with
 * it: on the pre-merge base of 2313.82 the drafted shape measured 2314.92, which crossed the 2314
 * that base sat 0.18 under and had this branch raising the ceiling to 2318 on its own.
 *
 * **Three branches found headroom under 2314 within a day and all three reached for it**, which is
 * what a margin of that order buys — not a reason to widen it, but worth knowing before reading the
 * next base figure as slack.
 *
 * **2320 → 2323, bought by letting a subject decline a component its sheet plan ordered anyway.** A
 * plan is addressed by category, mode, direction set and sheet index, so its entries were
 * unconditional — and four `clothing` pools offered a value meaning the subject has none of what the
 * field describes, so section 1 stated `Armour & Cladding: Bare Unclad Frame` while section 4 ordered
 * a cladding panel and forbade omitting it. What a first visit pays for is: an `absentOption` on the
 * nine pools that offer one and the resolver that reads it; `planAsDrawn` and `drawnPlanFor` in
 * `utils/sheetPlanAbsence.ts`, which take the marked entries out before anything walks the plan; the
 * `clothing` argument threaded through the nine functions that count, name or render an inventory
 * and the call sites that reach them; `drawsClothing` widening from `true` to
 * `'entirely' | 'partly'` on 26 entries; two inventory lines split into four so the half a reader can
 * decline stands alone; ICON's rewritten tooltip, which is the one entry that grew rather than
 * moved; and the sentence in `constants/guidanceSentences.ts` that tells a reader the option takes
 * the pieces off the sheet, quoted by the three fields it is true of.
 *
 * Measured against the main tip this branch started from (`0dbcb2f`), rebuilt from the same
 * `node_modules` — **2318.75 KiB** — the branch merged onto it reports **2320.45**, a delta of 1.70
 * and 0.45 over the ceiling the two raises above had bought. So 2323 restores a margin of the same
 * order rather than widening it, exactly as those two did. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed **by this change**.
 *
 * **The figure a build reports today is higher than that, and none of the difference is this
 * change's.** Main moved twice while the branch was in flight, and the second merge brought a
 * 54th entry with it, so the tip this landed on builds at **2320.93**. The base is named above for
 * exactly that reason: a delta is only checkable against the commit it was taken from, and a bare
 * "main's own tip" stops identifying one the moment somebody else lands.
 *
 * **The delta is data and threading, not a new module**, which is why it is larger than the paint-rule
 * change it builds on: that one added a flag and read it, where this one adds a value a plan is
 * resolved *through* and has to carry the subject to every reader of an inventory. The nine
 * `absentOption` declarations are the cheapest part of it and the part that does the most — six of
 * the nine are categories no plan of which draws the attribute today, and they are declared so the
 * invariant reaches them before an entry does.
 *
 * **The sheet-plan prose deriving its own counts raises nothing, and spends 0.84 of the raise above.**
 * Nineteen figures, in seventeen sentences across seven plan files, were written out by hand beside
 * entries that summed to them. What a first visit now pays for is three
 * modules — a number-to-word speller, the one place entries are summed, and the builder for the
 * second side of a limb pair — plus the interpolation at each call site. Measured against the main
 * tip this branch merged (`43ea460`), rebuilt from the same `node_modules` — **2320.93 KiB across 54
 * entries** — the merged build reports **2321.77**, which leaves 1.23 under the 2323 the paragraph
 * above bought. No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was renamed:
 * the three modules land inside the chunks their callers were already in.
 *
 * **Almost none of it is content, which is what makes the figure worth reading.** The compiled prompt
 * is byte-identical to what shipped, verified by dumping every group's intro, entry and outro across
 * every category, mode and direction set before and after — the sentences say the same words, they
 * are simply no longer written out. The one exception is the trunk-termination paragraph, which grew
 * 78 bytes in each of CHARACTER and CREATURE (0.15 KiB between them) because it had to stop citing a
 * list one of the three sheets carrying it does not have. So roughly 0.69 KiB buys the machinery and
 * 0.15 buys the correction, which puts this beside the module-splitting raise at 2309 as the second
 * time this figure moved on no new option, guidance paragraph or prompt text at all.
 *
 * **It very nearly raised the ceiling, and is recorded for the reason the paint-rule change is.** The
 * branch was written against `e02ed3e`, where the build reported 2319.23 under a ceiling of 2320, so
 * it crossed by 0.06 and carried a raise to 2323 of its own. The `absentOption` work landed first and
 * bought that same figure for a different reason, so the raise became a no-op and the paragraph
 * arguing for it would have claimed a base and a headroom main no longer had. Two branches reaching
 * for one raise is the third time this has happened under a margin of this order.
 *
 * **Raised from 2323 by the Projects view, and it is the largest raise this figure has taken for a
 * single change.** Everything a reader saves is now filed under a project: a fifth view to make,
 * rename and delete one, a project dropdown on both save panels and on every saved row, two stores,
 * a `projects` table with its cascade, and the library pack that replaced the two array-shaped packs
 * — one file carrying the projects and both saved collections, because a preset names its project
 * and neither half is meaningful alone. Measured against the main tip this branch started from
 * (`752c674`), rebuilt from the same `node_modules` — **2321.77 KiB across 54 entries** — this build
 * reports **2344.52 across 60**, a delta of 22.75 — after eight guidance paragraphs whose controls
 * this change deletes went with them.
 *
 * **About a third of it is prose**, which is the cost this repository's own guidance rule imposes on
 * a feature with twenty new controls in it: the twenty entries of
 * `constants/tooltips/projects.ts` measure **5.69 KiB** between them, and guidance is constant data
 * the entry chunk reaches, so it is paid for on a first visit exactly as an option pool is. The rest
 * is the view, its six panels, the two stores and the pack format.
 *
 * **Seven of the nine `+` lines above are the split re-cutting itself, not new files**, which is the
 * `+`/`-` shape the note on `PRECACHE_SHAPES` warns reads like a stray chunk and is not one. Three
 * views now reach the project dropdown and two reach a saved row, so rolldown cuts
 * `ProjectSelectField`, `QuantisePresetRow`, `PresetCardSpecs`, `presets`, `useSubjectStore`,
 * `useFileDropGuard` and `useFileSave` out of the views that share them and names chunks after
 * them — while `JsonPackTransfer`, `firstOfEachId` and `useQuantisePresetStore` gave their names up
 * to those. `ProjectsTab` and `useProjectStore` are the two that are genuinely new. The margin is
 * left at the same order as every raise above rather than widened.
 *
 * **Raised from 2350 by 2 KiB, and no single change is what spent it — the *combination* is.** Four
 * builds from the same `node_modules` say it, and the fourth is the only one that fails:
 *
 * | Build | Precache | Entries |
 * | --- | --- | --- |
 * | `2074844`, the tip both branches left | 2349.68 KiB | 60 |
 * | `main` at `c0e426a` | 2349.98 | 60 |
 * | the assembly-base guidance change alone | 2349.98 | 60 |
 * | the two merged | **2351.14** | 60 |
 *
 * Each half adds 0.30 KiB and passes on its own; together they add 1.46, because the last 0.86 is
 * rolldown re-partitioning the split around the modules both touched rather than any file either
 * branch wrote. **That is the case no local gate can see** — several
 * agents merge into `main`, and the combination that lands is one nobody ran anything against. It is
 * also what a 0.02 KiB margin buys: `main` had been sitting that far under the ceiling, so the next
 * branch to land anything at all was going to be the one that paid for it.
 *
 * **The guidance change's own 0.30 KiB is prose**, which is the cost this repository's guidance rule
 * imposes: three cards told the reader the *Assembly Base* field decides how the sheet is broken
 * into components, which nothing in the compiler does, so the true statement is written once in
 * `constants/guidanceSentences.ts` and carried by all thirteen, five of those cards were rewritten,
 * and TERRAIN's *Scatter Layer* card and its sheet plan each gained a sentence. No chunk was added
 * and none renamed, on any of the four builds.
 *
 * 2352 leaves **0.86 KiB**, which is the order of the 0.82 the `isTextEntry` note above calls the
 * narrowest this margin has been. It is deliberately not more: the question of whether 2350 was
 * still the right figure for what a first visit downloads is one this change is not placed to
 * answer, and widening the margin would only postpone it further.
 *
 * **Raised again from 2352 by the identity digest's key exclusion**, which is joint-smallest with the
 * 2254 → 2256 above and lands one commit behind the paragraph before it. `identityPalette` excluded
 * the background key by comparing RGB for exact equality, which removes essentially nothing on a
 * resampled sheet — so every digest read off real generator output led with the key field. It now
 * removes the field with `keyBackground`, the app's own keying pass, which is what makes the picker
 * route and the Quantise tab agree about where the field is. Measured against `main` at `17af148`,
 * rebuilt from the same `node_modules` — **2351.14 KiB across 60 entries**, the figure the paragraph
 * above records — this build reports **2352.30**, a delta of 1.16. No file was added to or removed
 * from `PRECACHE_SHAPES` and no chunk was renamed.
 *
 * **The delta is the same 1.16 this branch measured against `47dc6a9`**, where it took the figure
 * from 2349.67 to 2350.83 — so unlike the raise above it, none of this one is the split
 * re-partitioning around another branch. It is the change's own cost, and it survived being carried
 * onto a base 1.47 KiB higher unchanged.
 *
 * **The split is worth reading, because three-quarters of it is one import.** Rebuilt with the code
 * change alone and both guidance paragraphs left as they were, the figure is **2350.57** — so
 * **0.90 KiB buys the keying pass reaching the studio's chunk** (`StudioTab` +802 bytes,
 * `SheetStepButtons` +336, the rest hash-length noise) and **0.26 buys the prose**: the capture
 * control's paragraph and the `keyStillOn` message, both of which stated as fact two things the code
 * did not do. That is the ordinary shape of a correctness fix that reaches for an existing seam
 * rather than writing a second one — a local radius would have pulled `keyDistance` in regardless,
 * and would have left the key's blends in four of the eight digests.
 *
 * 2353 leaves **0.70 KiB**, which is the order of the 0.82 and 0.86 the two notes above call the
 * narrowest this margin has been, and deliberately not more: the paragraph before this one records
 * that whether 2350 was still the right figure for a first visit is a question neither change is
 * placed to answer, and widening the margin would postpone it a second time.
 *
 * **The stylesheet ground/ink sweep then spent 0.08 KiB of that 0.70, and the ceiling stays at
 * 2353.** Two builds from the same `node_modules` on the same merged tree, differing in
 * `src/index.css` alone: 2352.38 KiB with `main`'s stylesheet and **2352.46** with this branch's,
 * both at 60 entries, no file added to or removed from `PRECACHE_SHAPES` and no chunk renamed. What
 * a first visit gains is four declarations — a `--color-ink-placeholder`, a `::placeholder` rule,
 * eight bytes on `::selection`'s colour, and one fewer in the forced-colours block. The ~135 lines
 * that change beside them are docblock, which the build strips, so unlike the two raises above this
 * one is not paying for prose.
 *
 * The margin is **0.54 KiB**, narrower again than the 0.70, 0.82 and 0.86 the notes above each call
 * the narrowest it has been. Three consecutive branches have now recorded that sentence, which is
 * the answer to the question those notes keep deferring: the margin is not being spent by any one
 * change, and the next branch to land anything at all will be asked to raise the ceiling again.
 * **Raised from 2350 by moving section 0's scale example from the category to the sheet**, which is
 * a raise bought almost entirely by prompt text. `SCALE_EXAMPLE_TEXT` was thirteen strings, one per
 * category, and what a sheet actually draws is decided by the mode, the direction set and the sheet
 * index as well — so on 98 of the 192 sheets the eight paired categories compile, the contract
 * priced a component against one the sheet has no entry for. The example is now
 * `SheetPlan.scaleExample`, answered on each of the thirty-two plans beside `assembly` and
 * `scaleUnitFrame`. Measured against the main tip this branch started from (`2074844`), rebuilt from
 * the same `node_modules` — **2348.81 KiB across 60 entries** — this build reports **2350.58 across
 * 60**, a delta of 1.77 and 0.58 over the ceiling it was under. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed: the plans are constant data the entry chunk already
 * reached.
 *
 * **All of the delta is content**, which puts it beside the guidance-paragraph half of the Projects
 * raise rather than beside the two raises that bought machinery: nineteen more strings than the map
 * they replace, each naming a pair of pieces rather than one category's, and the docblock arguing
 * for them is stripped from the bundle as every other one is. 2352 restores a margin of the same
 * order as every raise above rather than widening it.
 *
 * **Raised again from 2352 by giving section 6's series its own capability answer**, which is the
 * same wrong-scope defect one level up and lands on the same branch. `SheetPlan.assembly` answers for
 * one sheet, and the paragraph beneath it called that answer “the finished series’ capability” — so
 * a ten-sheet character series stated the deliverable three incompatible ways depending on which
 * sheet the reader compiled. Section 6 now asks the batch which shape it is: a run of one plan keeps
 * a single claim, and a series of several plans states its share and then lists what the sheets
 * assemble into between them, grouped from the batch the way the sheet list already is. Measured
 * against this branch's previous commit (`ec3eacb`), rebuilt from the same `node_modules` —
 * **2351.61 KiB across 60 entries** — this build reports **2352.63 across 60**, a delta of 1.02 and
 * 0.63 over the ceiling the paragraph above bought. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed.
 *
 * **Roughly half of it is the template's second branch and half is `utils/seriesCapability.ts`**,
 * which is a genuine split between prose and machinery rather than the near-pure-content raise
 * above: the template carries two wordings where it carried one, and the grouping that renders the
 * series' answer is about thirty lines of code the entry chunk reaches. 2354 restores a margin of
 * the same order as every raise above.
 *
 *
 * **Raised from 2353 by merging that branch into `main`, and the combination is again what spent
 * it** — the third time this file has recorded that shape, and the third consecutive raise to do so.
 * Three figures, all from this worktree's own `node_modules`:
 *
 * | Build | Precache | Entries |
 * | --- | --- | --- |
 * | `2074844`, the tip the scope-fix branch left | 2348.81 KiB | 60 |
 * | that branch at its own tip, `e2d85d3` | 2352.47 | 60 |
 * | the two merged | **2356.06** | 60 |
 *
 * The branch's own cost is therefore **3.66 KiB**, and `main`'s side is the 2.78 its own notes above
 * measure between `2074844` and the stylesheet sweep. Added to this branch's base those come to
 * 2355.25, against a merged 2356.06 — so **0.81 KiB is rolldown re-partitioning the split** around
 * modules both sides touched, and not a file either wrote. No entry was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed.
 *
 * **The branch's 3.66 is almost all prompt text**, which is the cost this repository's own “derive
 * every fact that two places state” rule imposes when the derivation replaces one string with
 * thirty-two: section 0's scale example moved from a thirteen-entry map onto each of the plans,
 * section 5 gained a second Mirroring wording, section 6 gained a derived statement of what a
 * multi-sheet series assembles into, and ICON's section 8 rescue grew a sentence. Roughly a third of
 * it is `utils/seriesCapability.ts` and `utils/planMirroring.ts`, the two pure functions those
 * derivations read.
 *
 * 2357 leaves **0.94 KiB**, the order of the 0.54, 0.70, 0.82 and 0.86 the notes above each call the
 * narrowest this margin has been. The note directly above answers the question the earlier ones keep
 * deferring — the margin is not being spent by any one change — and this raise is deliberately no
 * wider for the same reason: whether 2350 was still the right figure for a first visit is a decision
 * for whoever owns this contract, not something a fourth branch should settle by widening it.
 *
 * **Raised once more, from 2357, by the two accessibility hooks and the names they gave the app's
 * repeated controls.** `useConfirmInPlace` holds the three edges at which a two-press confirmation
 * used to drop the keyboard to `<body>`, and `useScrollableRegion` holds the rule that a
 * keyboard-scrollable box is named and given a role — lifted out of `PanViewport`, which had the
 * only correct copy of it. Beside them, every row of the preset library, the split drawer and the
 * history drawer now names the thing it acts on, which is a template string per control rather than
 * a shared literal.
 *
 * **The delta is 3.44 on every base it has been measured against**, which is worth stating because
 * two of the raises above are about combinations that were not. From the same `node_modules`: on the
 * tip this branch left (`2074844`) it takes 2348.81 KiB across 60 entries to 2352.25 across 63; on
 * the 2351.14 the first raise above records it reports 2354.58; and on this merge's own base it
 * reports **2359.50**. Three bases, one figure, so rolldown re-partitioned nothing across either
 * merge and this raise buys what the branch wrote rather than what the meeting of branches cost.
 *
 * **All three `+` lines are genuinely new files, and one of them is not new code.**
 * `useConfirmInPlace` and `useScrollableRegion` are each reached from a lazily-loaded overlay *and*
 * from an eagerly-loaded view, so rolldown cuts each into a chunk the two share.
 * `assets/react-dom-*.js` is the third and is the one worth reading twice: `flushSync` puts
 * `react-dom` on that shared boundary, so the module the entry chunk already carried is now a chunk
 * of its own. A first visit downloads the same bytes; what changed is that they arrive in three more
 * requests.
 *
 * 2361 leaves **1.50 KiB**, the order of the 0.94 the note above leaves and the 0.82 the
 * `isTextEntry` note calls the narrowest. It is deliberately no wider, for the reason that note
 * gives: whether 2350 was still the right figure for a first visit is a decision for whoever owns
 * this contract, and a fifth branch should not settle it by widening the margin.
 *
 * **Raised from 2357 by the third persistence backend, and this is the entry that adds a chunk.** A
 * second tab of this origin cannot take the SAH pool's access handles, and the app answered that
 * refusal exactly as it answered "this browser has no OPFS" — with a localStorage store the first
 * tab cannot see, which is a second library rather than a lesser one. The worker classifies the
 * rejection now, the handshake carries which of the two it was, and `database.ts` answers the one
 * meaning "your database is next door" with `HeldElsewhereBackend`. Measured from the same
 * `node_modules` on two bases, which is the check the note above makes and for the same reason: on
 * `e8d99e6` it takes **2356.06 KiB across 60 entries to 2358.83 across 61**, and on this merge's own
 * base (`64e3359`, 2359.50 across 63) it reports **2362.26 across 64**. A delta of 2.77 and then
 * 2.76, so neither merge re-partitioned anything and this raise buys what the branch wrote.
 *
 * **2.47 of it is machinery and 0.30 is prose**, which inverts the usual split here. The machinery
 * is a third implementation of an eighteen-method interface, the refusal union, the classifier that
 * reads it, the handshake guard that now validates it, and `storageFailure` reaching twenty call
 * sites across six stores — the last of which is what rolldown cut into the new chunk, as the note
 * on `PRECACHE_SHAPES` records. The prose is the Architecture tab's SQLite card: on the first of
 * those two bases, rebuilt with that card left as `main` had it, the figure is **2358.53**.
 *
 * 2363 leaves **0.74 KiB**, the order of the 0.82 the `isTextEntry` note calls the narrowest and
 * the 0.94 two notes above. It is deliberately no wider, for the reason each of those gives and
 * this one now repeats as the fifth: whether 2350 was ever the right figure for what a first visit
 * downloads wants answering by whoever owns this contract, and slack is a poor substitute for it.
 *
 * **Raised from 2363 by the colour guidance saying what becomes of a budget.** The Palette Limit and
 * Palette cards described what each setting asks a generator for and nothing about what comes back,
 * while no sheet in a 27-sheet pack was drawn inside the budget it was given (#244) — so both now say
 * not to expect it, and the budget's card states what the Quantise tab reduces a sheet to under each
 * budget, reading the figures from `PALETTE_COLOR_COUNTS` rather than typing them out. Measured
 * against `main` at `87e1170`, rebuilt from the same `node_modules` — **2362.10 KiB across 64
 * entries** — this build reports **2363.06 across 64**, a delta of 0.96 that crossed a ceiling the
 * base sat 0.90 under. No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was
 * renamed. It is guidance prose, constant data the entry chunk reaches, on the footing every raise
 * above stands on; the docblock beside `PALETTE_TEXT` that argues for leaving the prompt alone is
 * stripped from the bundle.
 *
 * 2364 leaves **0.94 KiB**, the order of the 0.74 and 0.94 the notes above leave, and deliberately
 * no wider for the reason each of them gives.
 *
 * **Raised from 2364 by the mesh asking the exact question before it walks** (#276). An exact scale
 * reading was a claim about a lattice the reduction then did not use: `boundaryMesh` walked every
 * sheet, reading its lines by the magnitude of their change, so crisp art whose stray pixels
 * outweighed its faint cell boundaries was read as exactly its own grid and then cut beside every
 * boundary. The question now lives in `edgeLattice.ts`, and the detector and the mesh both ask it.
 * Measured against `main` at `781b393`, rebuilt from the same `node_modules` — **2363.76 KiB** —
 * this build reports **2364.80**, a delta of 1.04 that crossed a ceiling the base sat 0.24 under. Both
 * figures were read inside `assertPrecacheContract`, which saw 61 entries on each side; the build's
 * own summary line reports the branch's 2364.80 across 64. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed.
 *
 * **It is machinery rather than prose, and it lands in two workers.** `autoTuneWorker` grows by 816
 * bytes, because it measures a mesh and never ran the detector, so the transition count is new to it;
 * `quantiseWorker` grows by 244, because it already carried that count for the detector and gains
 * only the branch that asks it. The docblocks explaining the change are stripped from the bundle.
 *
 * 2365 leaves **0.20 KiB**, narrower than any note above leaves. It is the smallest whole figure over
 * the build, and deliberately so, for the reason each of those notes gives: whether 2350 was ever the
 * right figure for what a first visit downloads is for whoever owns this contract to answer.
 *
 * **Raised from 2365 by the sprite gap's guidance telling the truth about the download** (#236). Its
 * card said the download is the same file whatever the gap is set to, and neither half held: the
 * Aseprite document, the sprite pack and the manifest are built from the boxes the gap draws, and
 * the symmetry settle, the duplicate fold and the frame alignment all act on those boxes. The
 * duplicate tolerance's card and panel paragraph made the same claim about a reading the manifest
 * records, and the Auto button's card said the dials it leaves alone change only what the tab
 * reports. Each now says what the control does on its own and what it reaches. Measured against
 * `main` at `d78626e`, rebuilt from the same lockfile — **2364.78 KiB across 64 entries** on the
 * build's summary line — this build reports **2365.66 across 64** on the same line, a delta of
 * 0.88 that crossed a ceiling the base sat 0.22 under. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed. It is guidance prose, and all of it lands in three of
 * the constants-pulling chunks rather than the entry chunk: `quantiseDials` grows by 497 bytes,
 * `QuantiseTab` by 210 and `useUIStore` by 193, which is the 0.88 exactly. The docblocks rewritten
 * beside it are stripped from the bundle.
 *
 * 2366 leaves **0.34 KiB**. It is the smallest whole figure over the build, for the reason the note
 * above gives.
 *
 * **Raised from 2366 by the prompt keeping the background key off the components** (#277). Section 0
 * fixed the field as the key colour and never said a component may not be it, and a pinned palette
 * could list the key as an entry. Section 0 and the self-audit now reserve it, the palette block
 * leaves out and names every entry the Quantise tab's field pass would take, and a pure black outline
 * on a pure black field is asked for as a very dark grey. Measured against `main` at `b74f61c`, rebuilt
 * from the same lockfile — **2365.66 KiB across 64 entries** on the build's summary line — this build
 * reports **2368.22 across 64** on the same line, a delta of 2.56 that crossed a ceiling the base sat
 * 0.34 under. No file was
 * added to or removed from `PRECACHE_SHAPES`, and no chunk was renamed.
 *
 * **The bytes are the change's own, but they do not land where it was written.** The palette block,
 * the outline line and the three tooltip sentences are in `quantiseDials`, and the template's two new
 * items are in `useCopyPrompt`. The prompt text now imports `keyReaches`, whose constants
 * `quantiseDials` already carried, and the chunk sizes move accordingly: `quantiseDials` grows by
 * 8,247 bytes while `SheetStepButtons` shrinks by 3,300 and `useCopyPrompt` by 2,338, and every other
 * chunk moves by 19 bytes or fewer. That is consistent with modules moving into the shared chunk
 * rather than being copied, and it nets to the 2.56 exactly; which modules moved was not traced. No
 * worker chunk changed size, so nothing is paid for twice. The docblocks explaining the change are
 * stripped from the bundle.
 *
 * 2369 leaves **0.78 KiB**. It is the smallest whole figure over the build, for the reason the notes
 * above give.
 *
 * **Raised from 2369 by each sheet saying what its own pieces are** (#278). BACKGROUND's guard, audit
 * and three assembly forms were written per category, so its layer library was told every entry was a
 * band and not to stack the bands, where only its parallax set draws one. Every sheet plan now states
 * `componentClass` and `assemblyFailure`, which gives BUILDING's tile set and its module sheets a
 * failure each, and INTERFACE's nine-slice set one of its own. Measured against `main` at `e658295`,
 * rebuilt from the same lockfile — **2368.22 KiB across 64 entries** on the build's summary line —
 * this build reports **2371.20 across 64** on the same line, a delta of 2.98 that crossed a ceiling
 * the base sat 0.78 under. No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was
 * renamed.
 *
 * **The bytes are the two field names as much as the words they hold.** A minifier shortens no
 * property name, and both are written on every plan literal in `sheetPlans/`; beside them are the class
 * phrases and the three new sets of forms, less the class and form wording the category records gave
 * up. How the 2.98 divides between those was not measured. The chunk sizes move as the last note's
 * did, and further: the exclusion records now read `kindsIn`, so `quantiseDials` grows by 19,109 bytes
 * while `useCopyPrompt` shrinks by 16,067, five other chunks move by 7 bytes or fewer, and the seven
 * net to the 2.98. That is consistent with modules moving into the shared chunk rather than being
 * copied; which modules moved was not traced. No worker chunk changed size, so nothing is paid for
 * twice. The docblocks recording the move are stripped from the bundle.
 *
 * 2372 leaves **0.80 KiB**. It is the smallest whole figure over the build, for the reason the notes
 * above give.
 *
 * **Raised from 2372 by the mesh reading a crisp sheet's lines by its transitions** (#279). A grid a
 * crisp sheet is not exactly drawn on was walked over lines read by magnitude, so stray pixels that
 * outweighed faint cell boundaries were the whole line list, and the mesh cut beside every boundary.
 * `stepProfile` now reads each axis's boundary evidence as well as its magnitude, counting a crisp
 * axis's transitions line by line. Measured against `main` at `b90b0e2`, rebuilt from the same
 * lockfile — **2371.20 KiB across 64 entries** on the build's summary line — this build reports
 * **2372.18 across 64** on the same line, a delta of 0.98 that crossed a ceiling the base sat 0.80
 * under. No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was renamed.
 *
 * **It is machinery rather than prose, and it lands in two workers.** `quantiseWorker` grows by 512
 * bytes and `autoTuneWorker` by 499, because each carries its own copy of the step profile, and the
 * two sum to the 0.98. Every other script chunk is the same size to the byte. The docblocks explaining
 * the change are stripped from the bundle.
 *
 * 2373 leaves **0.82 KiB**. It is the smallest whole figure over the build, for the reason the notes
 * above give.
 *
 * **Raised from 2373 by letting the assembly base choose a category's sheets** (#283). A plan was a
 * function of the category, the mode, the direction set and the sheet index, so a pooled base whose
 * pieces no sheet drew put section 1 against section 4. What a first visit pays for: the table of
 * declared bases in `sheetPlans/assemblyBases.ts` and the leaf its types live in; a rigid object's two
 * plans, drawn whole; `plansFor`, `modePlansOf` and `modesWithheldBy`; the subject threaded through
 * every function that resolves or counts a sheet; `resolveOutputForSubject` and the store's
 * `outputFollowing`, which records a base that moves the sheet as an undo step; the two sentences
 * `SheetFields` and `RiggingFields` say about a base; one shared guidance sentence on six cards; and
 * the undo copy that names the new step. Measured against `main` at `a5e2eef`, rebuilt from the same
 * lockfile — **2372.61 KiB across 64 entries** on the build's summary line — this build reports
 * **2378.63 across 64** on the same line, a delta of 6.02 that crossed a ceiling the base sat 0.39
 * under. No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was renamed. How the
 * 6.02 divides between chunks was not measured.
 *
 * 2379 leaves **0.37 KiB**.
 *
 * **Raised from 2379 by the sweep of the five categories whose pools were never read against their
 * sheets** (#292). PORTRAIT is what it costs: its `Portrait Assembly Base` offered nine layered cuts
 * on a sheet of twelve whole portraits, and one of them is now drawn, so the build carries a second
 * PORTRAIT plan in `sheetPlans/portraitFeatureCut.ts` — a shared head, three runs of feature pieces
 * with twenty part names between them, and the group prose around them — beside the twelve feelings
 * both PORTRAIT plans now read from `sheetPlans/portraitFeelings.ts`, which carries each feeling in
 * two registers and is the largest single addition here. Against that, the sweep *removes* pooled
 * text: nine PORTRAIT bases, four ICON bases, one FONT base, two EFFECT bases, two PORTRAIT poses, a
 * PORTRAIT crop, a TERRAIN edge profile, and the `backing` row of `EXCLUDED_ELEMENTS` the ICON pair
 * was the only naming of — set against two TERRAIN mode bindings and seven rewritten cards. All of it
 * is constant data the entry chunk reaches, which is the footing every raise above stands on.
 * Measured against `main` at `437aba3`, rebuilt from the same lockfile — **2378.63 KiB across 64
 * entries** on the build's summary line, the figure the paragraph above records — this build reports
 * **2382.06 across 64** on the same line, a delta of 3.43 that crossed a ceiling the base sat 0.37
 * under. No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was renamed. How the
 * 3.43 divides between chunks was not measured.
 *
 * 2383 leaves **0.94 KiB**, which is wider than the last several raises left and is not a widening:
 * it is the smallest whole figure over the build, and the build simply lands early in its own KiB.
 *
 * **Raised from 2383 by letting a reader say which sprite is which component** (#295). The Quantise
 * tab attached the inventory's names by counting, so a sheet that came back with the right number of
 * pieces in the wrong order got a wrong name on every piece after the swap, silently, in a file a rig
 * importer believes — and nothing showed a name before the download. What a first visit pays for: the
 * pure layer that resolves a reader's decisions into the pieces a download writes (`spritePin`,
 * `spritePieces`, `pieceNames`, `spriteAssignment`, `spriteChoice`) and the types under it; the store
 * holding those decisions and the hook that feeds them; the label overlay drawn over the marked
 * preview and the per-sprite list in the Sprites panel; and the largest single addition, the guidance
 * — one control card explaining four exclusive answers, six paragraphs naming what stands between a
 * sheet and its names, and two action cards. Measured against `main` at `2294406`, rebuilt from the
 * same lockfile — **2382.06 KiB across 64 entries** on the build's summary line, the figure the
 * paragraph above records — this build reports **2395.88 across 64** on the same line, a delta of
 * 13.82 that crossed a ceiling the base sat 0.94 under. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed. The delta lands in the `QuantiseTab` chunk, which is
 * the only one that grew a block between the two `dist/assets` listings. Roughly a quarter of it is
 * the guidance rather than the logic: one control card explaining four exclusive answers, six
 * paragraphs naming what stands between a sheet and its names, two action cards, and the four
 * download cards rewritten to describe pieces where they described sprites.
 *
 * 2396 leaves **0.12 KiB**.
 *
 * **Raised from 2396 by the rig contract import.** Measured against `main` at `37a666c`, rebuilt
 * from the same lockfile — **2390.59 KiB across 49 entries** on the build's summary line — this
 * build reports **2399.81 across 49** on the same line, a delta of **9.22** that crossed a ceiling
 * the base sat 5.41 under. No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was
 * renamed. The delta is the reader for a file another program writes: the parser and its refusal
 * sentences, the type, the sheet plan built from a contract, section 5's per-piece geometry, the
 * sizing resolution and the studio control — all of it reached by the entry chunk, because the
 * studio is the first view and the prompt compiles on it.
 *
 * 2405 leaves **5.19 KiB**, which is the headroom the figure above was set with.
 *
 * **Raised from 2405 by VEHICLE's assembly bases drawing the drive they name** (#288). Every VEHICLE
 * sheet drew a near-side drive unit and a far-side one whatever the base said, so six of the ten
 * pooled values stated one division above an inventory drawing another. What a first visit pays for
 * is the builder that turns a *division* into the three sheets and their prose
 * (`sheetPlans/vehicleDivision.ts`), the five divisions that are not side-paired
 * (`sheetPlans/vehicleDivisions.ts`), the two sheets of a vehicle in one piece
 * (`sheetPlans/vehicleRigidHull.ts`), and six rows in `CATEGORY_ASSEMBLY_BASES`. Nearly all of it is
 * the divisions themselves — six hulls, twelve drive units, six mounts and five access pieces, each
 * with the words its entry writes and the name each drawing takes — which is constant data the entry
 * chunk reaches, the footing every raise above stands on. Against it the change *removes* the three
 * VEHICLE plans written out by hand and one of `CATEGORY_ASSEMBLY`'s two VEHICLE terms. Measured
 * against `main` at `762d457`, rebuilt from the same lockfile — **2399.81 KiB across 49 entries** on
 * the build's summary line, the figure the paragraph above records — this build reports **2407.18
 * across 49** on the same line, a delta of **7.37** that crossed a ceiling the base sat 5.19 under.
 * No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was renamed. All 7.37 lands in
 * the `quantiseDials` chunk, which is where this app's constant data is bundled; `index` fell 0.02 and
 * `useSubjectStore` rose by the same order, so nothing of it reached the code.
 *
 * 2408 leaves **0.82 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2408 by the palette a reader loads themselves** (#301). The palette control offered
 * `FREE` and eighteen machines, so a project's own colours could not be named in a prompt at all.
 * What a first visit pays for is the reading of the three forms a palette leaves this app as — a
 * swatch picture, a `.gpl` and a hex list — the gate every route into the configuration passes
 * through, the resolver that reads the palette and those colours together, the studio panel that
 * takes a file, a drop or a paste, and its guidance. The largest part is the panel and its words,
 * and nearly all of it is reached by the entry chunk, because the studio is the first view and the
 * prompt compiles on it. Measured against `main` at `aa2f794`, rebuilt from the same lockfile —
 * **2407.57 KiB across 49 entries** — this build reports **2417.63 across 49**, a delta of **10.06**
 * that crossed a ceiling the base sat 0.43 under. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed. Comparing the two `dist/assets` listings, 6.00 KiB of
 * it lands in `StudioTab`, which is the panel, the intake and the three guidance cards; 1.33 in
 * `database`, which is the storage gate; 1.20 in `useUIStore` and 1.16 in `quantiseDials`, which is
 * where this app's constant data is bundled; 0.35 in `index`; and 0.23 in the stylesheet.
 * `SheetStepButtons` fell 0.47, the only entry to move the other way.
 *
 * **Both figures are the ones `assertPrecacheContract` receives**, taken by forcing the ceiling to
 * zero in each tree — which is what the note above warns is not the same quantity as the summary
 * line. On these two builds they agree: the summary reports 49 entries and the same KiB on each
 * side, where the 2026-09-11 note recorded 64 against 61. A branch that reads the summary and sets
 * the ceiling from it can still land 0.01 over, which is how this ceiling was first set to 2417 and
 * failed its own build.
 *
 * 2418 leaves **0.37 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2418 by the Unsung Saviour preset carrying that game's own rig.** Its character
 * preset could state the assembled 48 × 96 px and nothing else, so the prompt had to admit outright
 * that no single piece is that size. It now ships `UNSUNG_SAVIOUR_HUMANOID_RIG`, the contract that
 * game's Rig Intake exports: section 4 lists the fifteen pieces under the engine's own names and
 * section 5 gives each one its size, its pivot, its joint end and where that joint sits in the
 * frame. A preset applies a whole `ImageOutputConfig`, so carrying the contract is also what stops
 * loading the preset clearing one the reader had loaded by hand.
 *
 * What a first visit pays for is fifteen slots of constant data, which is the footing every raise
 * above stands on. Measured against `main` at `219b1d5`, rebuilt from the same lockfile —
 * **2417.63 KiB across 49 entries** on the build's summary line, the figure the paragraph above
 * records — this build reports **2421.49 across 49** on the same line, and `assertPrecacheContract`
 * receives the same 2421.49, so the two counts the note above warns can differ do not here. That is
 * a delta of **3.86** that crossed a ceiling the base sat 0.37 under. No file was added to or
 * removed from `PRECACHE_SHAPES`, and no chunk was renamed.
 *
 * **Two thirds of it is the rig and one third is telling a reader which rig they have.** The fifteen
 * slots measured **2.81** on their own, all of it in `useSubjectStore-*.js`, the chunk the preset
 * library is already bundled into, with no other entry moving by a byte. The review of that change
 * added **1.05** more, and the three chunks it moved account for all of it: 0.75 in `StudioTab-*.js`
 * for `isShippedRigContract` and the sentence it decides, 0.15 in `useUIStore-*.js` for the
 * chooser's guidance, and 0.15 back in `useSubjectStore` for the rule that a contract does not
 * follow the reader into another category. Both halves are
 * reported here rather than only their sum, because the second is the cost of the first being a
 * copy — a shipped contract that nothing can date is only safe while the studio says it is shipped.
 *
 * 2422 leaves **0.51 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2422 by Copy, open & next** (issue #307), the button beside the preview's Copy
 * Prompt that copies the sheet the studio is on, opens the chosen generator's page and steps to the
 * next sheet, where a batch had asked for three presses a sheet. Measured against `main` at
 * `770adf6`, rebuilt from the same lockfile, with the ceiling forced to zero in each tree so both
 * figures are the ones `assertPrecacheContract` receives: **2421.49 KiB** on `main` and **2423.81**
 * here, a delta of **2.32** that crossed a ceiling the base sat 0.51 under. No file was added to or
 * removed from `PRECACHE_SHAPES`, and no chunk was renamed. Comparing the two `dist/assets`
 * listings, 1.20 KiB lands in `StudioTab`, which is the button and the shared `PromptActionButton`;
 * 0.57 in `useUIStore`, where the three guidance cards are bundled; 0.53 in the stylesheet, which is
 * the `aria-disabled:` variants that paint the button unavailable; and 0.01 in `index`.
 *
 * 2424 leaves **0.19 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2424 by the rig contract's geometry refusals** (issue #332). `parseRigContract`
 * checked each field's type and nothing else, so a contract with a joint below the base, a pivot
 * outside its piece, a piece larger than the frame, a repeated `slot_id` or a slot carried by itself
 * parsed cleanly and section 5 then misdescribed it. The reader now refuses each case with its own
 * sentence. Measured against `main` at `c302abf`, rebuilt from the same lockfile, with the ceiling
 * forced to zero in each tree so both figures are the ones `assertPrecacheContract` receives:
 * **2422.58 KiB** on `main` and **2424.56** here, a delta of **1.98** that crossed a ceiling the base
 * sat 1.42 under. No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was renamed.
 * Comparing the two `dist/assets` listings, 1.99 KiB lands in `database`, the chunk the reader is
 * bundled into because `parseImageConfig` reads a stored contract through it, and 0.01 comes back
 * out of `index`. It is almost all the refusal sentences, which are the point of the change.
 *
 * 2425 leaves **0.44 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2425 by the palette lock's ceiling** (issue #341), which refuses a lock past
 * `MAX_PALETTE_ENTRIES` colours and files the lock's entries on the OKLab lattice `mergeColors`
 * already walked, now shared as `oklabLattice`. Measured against `main` at `f0535ad`, rebuilt from
 * the same lockfile, with the ceiling forced to zero in each tree so both figures are the ones
 * `assertPrecacheContract` receives: **2424.56 KiB** on `main` and **2426.33** here, a delta of
 * **1.77** that crossed a ceiling the base sat 0.44 under. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed. Comparing the two `dist/assets` listings, 0.63 KiB
 * lands in each of `quantiseWorker` and `autoTuneWorker`, which both carry the pipeline and so each
 * carry the lattice and the lock lookup; 0.53 in `QuantiseTab`, which is the notice that names the
 * ceiling and the panel's check for it; and 0.03 in `useUIStore`, where the guidance cards are
 * bundled, for the tooltip clause that lists it. A shared chunk moved 0.48 KiB out of `database` and
 * 0.46 into `quantiseDials`, and `index` and `StudioTab` lost 0.03 between them.
 *
 * 2427 leaves **0.67 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2427 by the plan-before-render audit** (issue #398). Sol hands its render to an
 * image tool and sees it when the reader does, yet its prompt told it to verify the sheet and
 * redraw before delivering, which it could only obey with a second image. Targets now declare
 * `seesCanvasBeforeDelivery`, and sections 3 and 9 and the adherence report carry a second wording
 * for the targets that do not, beside a Sol paragraph asking for exactly one image call. Measured
 * against `main` at `b48a5fa`, rebuilt from the same lockfile, with the ceiling forced to zero in
 * each tree so both figures are the ones `assertPrecacheContract` receives: **2426.45 KiB** on
 * `main` and **2428.22** here, a delta of **1.77** that crossed a ceiling the base sat 0.55 under.
 * No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was renamed. Comparing the
 * two `dist/assets` listings, 1.79 KiB lands in `index`, which is where the template and the
 * wrappers are bundled, and 0.02 comes back out of `quantiseDials`. It is almost all prompt text:
 * the second wording is a whole branch of the template that every target now ships.
 *
 * 2429 leaves **0.78 KiB**, the smallest whole figure over the build. Merged with `main` at `d39af28`,
 * whose Sol wrapper change landed alongside it, the build reports **2428.25**, which leaves 0.75.
 *
 * **Raised from 2429 by the saved row's Move button** (issue #354). The project dropdown on a saved
 * preset or set moved it on every `change`, which a closed native select fires on each arrow key, so
 * a keyboard reader filed it under the first project they passed and lost their place with the row.
 * The dropdown now chooses and a Move button commits. Measured against `main` at `0531d03`, rebuilt
 * from the same lockfile, with the ceiling forced to zero in each tree so both figures are the ones
 * `assertPrecacheContract` receives: **2428.25 KiB** on `main` and **2429.74** here, a delta of
 * **1.49** that crossed a ceiling the base sat 0.75 under. No file was added to or removed from
 * `PRECACHE_SHAPES`. Comparing the two `dist/assets` listings summed by chunk name, 0.89 KiB lands in
 * `QuantisePresetRow`, the chunk `ProjectMoveField` is bundled into; 0.38 net between
 * `ProjectSelectField` and `useUIStore`, which the bundler re-split (5.30 out of one, 5.68 into the
 * other) and which holds the four guidance cards; 0.11 in `quantiseDials`; 0.10 in
 * `useConfirmInPlace`, where `keepFocusThrough` now sits; and 0.01 in `ProjectsTab`.
 *
 * 2430 leaves **0.26 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2430 by the Sol hand-off protecting the chirality rules** (issue #327). The Sol
 * directive named three blocks and ended "never those three", so the closing render-critical
 * invariants and section 3's one-sided-feature ledger were the prose it told Sol to cut first. It
 * now lists what must be forwarded as written, with a gated entry for each of those two blocks.
 * Measured against `main` at `501ef4b`, rebuilt from the same lockfile, with the ceiling forced to
 * zero in each tree so both figures are the ones `assertPrecacheContract` receives: **2429.95 KiB**
 * on `main` and **2430.30** here, a delta of **0.35** that crossed a ceiling the base sat 0.05
 * under. No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was renamed.
 * Comparing the two `dist/assets` listings summed by chunk name, all 359 bytes land in `index`,
 * where the template and the wrappers are bundled. It is prompt text and the gate that picks it.
 *
 * 2431 leaves **0.70 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2431 by the closing lines naming every companion deliverable** (issue #400). They
 * named the adherence report alone, so a prompt with the component map on either ended on "Generate
 * the sheet now." or asked for the report without the map, and nothing ordered the map before a
 * report that allows nothing after it. The closing lines now take one wording per combination.
 * Measured against `main` at `7cbd6f1`, rebuilt from the same lockfile, with the ceiling forced to
 * zero in each tree so both figures are the ones `assertPrecacheContract` receives: **2430.86 KiB**
 * on `main` and **2431.22** here, a delta of **0.36** that crossed a ceiling the base sat 0.14
 * under. No file was added to or removed from `PRECACHE_SHAPES`, and no chunk was renamed.
 * Comparing the two `dist/assets` listings summed by chunk name, all 368 bytes land in `index`,
 * where the template is bundled. It is prompt text.
 *
 * 2432 leaves **0.78 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2432 by the boundary rule each sheet states** (issue #402). Section 4 told every sheet
 * that each entry is a severed part, so a rigid object drawn whole, an effect's frames and a font's
 * glyphs were told to cut up what their inventories asked for whole, and trunk sheets stated the rule
 * twice. The template now carries a whole-drawing wording beside the pieces one, and the feature cut
 * and the layer library state where their own pieces end. Measured against `main` at `ae6833f`,
 * rebuilt from the same lockfile, with the ceiling forced to zero in each tree so both figures are the
 * ones `assertPrecacheContract` receives: **2431.22 KiB** on `main` and **2432.13** here, a delta of
 * **0.91** that crossed a ceiling the base sat 0.78 under. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed. Comparing the two `dist/assets` listings summed by
 * chunk name, 0.60 KiB lands in `index`, where the template and its conditions are bundled, and 0.31
 * in `quantiseDials`, which holds the sheet plans. It is prompt text.
 *
 * 2433 leaves **0.87 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2433 by the duplicate fold and the frame snap keeping outside the sprite gap**
 * (issue #319). A write within the gap of a neighbour had the next segmentation merge the neighbour
 * into the edited sprite, so both passes now take the gap and refuse such a write. They also refuse
 * a write with a drawn pixel directly against its region, because the segmentation drops a speck
 * without a position and a write that joined one could carry the edited sprite into the gap all the
 * same. The figures below cover both refusals and the guidance sentence that names the gap. Measured against `main` at `a10c0cb`, rebuilt from
 * the same lockfile, with the ceiling forced to zero in each tree so both figures are the ones
 * `assertPrecacheContract` receives: **2432.81 KiB** on `main` and **2433.46** here, a delta of
 * **0.65** that crossed a ceiling the base sat 0.19 under. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed. Comparing the two `dist/assets` listings summed by
 * chunk name, 321 bytes land in `quantiseWorker` and 319 in `autoTuneWorker`, each of which carries
 * its own copy of the settle passes, and 17 in `QuantiseTab`, which holds the frame alignment's
 * guidance. It is code a worker runs.
 *
 * 2434 leaves **0.54 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2434 by the auto-tune likeness scoring coverage** (issue #310). The score read a
 * cleared pixel as opaque black, so deleting a dark outline to transparency cost it nothing; its
 * planes now carry coverage as a fourth channel and read a cleared pixel as a neutral grey, and the
 * guidance sentence that says what the likeness figure measures names coverage. Measured against
 * `main` at `5606d76`, rebuilt from the same lockfile, with the ceiling forced to zero in each tree
 * so both figures are the ones `assertPrecacheContract` receives: **2433.99 KiB** on `main` and
 * **2434.12** here, a delta of **0.13** that crossed a ceiling the base sat 0.01 under. No file was
 * added to or removed from `PRECACHE_SHAPES`, and no chunk was renamed. Comparing the two
 * `dist/assets` listings summed by chunk name, 108 bytes land in `autoTuneWorker`, which runs the
 * score, and 23 in `QuantiseTab`, which holds the guidance. It is code a worker runs.
 *
 * 2435 leaves **0.88 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2435 by withdrawing the Colour merge slider where the merge does not run** (issue
 * #429). Under a pinned or locked palette with no dither the pipeline skips the merge entirely, while
 * the slider stayed live and its card said only the palette's entries were exempt. The slider now
 * takes a stated reason from `mergeIsExempt`, which moved to a module of its own so the panel and
 * the guide can ask it without bundling the pipeline, and `RangeField` gained the `disabledReason`
 * the other field primitives carry. Measured against `main` at `47ed5bb`, rebuilt from the same
 * lockfile, with the ceiling forced to zero in each tree so both figures are the ones
 * `assertPrecacheContract` receives: **2434.12 KiB** on `main` and **2435.19** here, a delta of
 * **1.07** that crossed a ceiling the base sat 0.88 under. No file was added to or removed from
 * `PRECACHE_SHAPES`, and no chunk was renamed. Comparing the two `dist/assets` listings summed by
 * chunk name, 0.71 KiB lands in `QuantiseTab`, where the panel, the slider and the guide are
 * bundled, and 0.35 in `quantiseDials`, which holds the quantiser's guidance copy. It is component
 * code and user-facing copy.
 *
 * 2436 leaves **0.81 KiB**, the smallest whole figure over the build.
 *
 * **Raised from 2436 by half, to 3654, and no longer set just over the build.** Every raise above
 * was a margin of under a kilobyte, so ordinary work crossed it: a docblock the compiler kept, a
 * guidance sentence, a check in a worker. Each crossing cost a detached baseline build and a note
 * here. On 2026-09-25 three branches crossed it, and two of them measured against the same `main`
 * and raised it to the same figure. The ceiling was stopping sub-kilobyte growth
 * that nobody would ever cut, which is not what it is for.
 */
export const PRECACHE_CEILING_KIB = 3654;

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
