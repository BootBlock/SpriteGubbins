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
 */
export const PRECACHE_SHAPES: readonly string[] = [
  '404.html',
  'assets/autoTuneWorker-*.js',
  'assets/AtlasCalculatorContents-*.js',
  'assets/Badge-*.js',
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
  'assets/about-*.js',
  'assets/componentBudget-*.js',
  'assets/componentTargetSize-*.js',
  'assets/database-*.js',
  'assets/dialogs-*.js',
  'assets/isTextEntry-*.js',
  'assets/models-*.js',
  'assets/presets-*.js',
  'assets/quantiseDials-*.js',
  'assets/react-dom-*.js',
  'assets/rolldown-runtime-*.js',
  'assets/sheetCanvas-*.js',
  'assets/sheetCoverage-*.js',
  'assets/spriteSegments-*.js',
  'assets/storageFailure-*.js',
  'assets/useClipboard-*.js',
  'assets/useConfirmInPlace-*.js',
  'assets/useCopyPrompt-*.js',
  'assets/useDownload-*.js',
  'assets/useFileDropGuard-*.js',
  'assets/useFileSave-*.js',
  'assets/usePresetStore-*.js',
  'assets/useProjectStore-*.js',
  'assets/useQuantiseStore-*.js',
  'assets/useScrollableRegion-*.js',
  'assets/useSettingsStore-*.js',
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
 * template (`utils/sheetPlanClothing.ts`, one field on `SheetFacts` and one gate in
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
 * `utils/sheetPlanClothing.ts`, which take the marked entries out before anything walks the plan; the
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
 * branch wrote. **That is the case CLAUDE.md names as the one a local gate cannot see** — several
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
 */
export const PRECACHE_CEILING_KIB = 2373;

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
