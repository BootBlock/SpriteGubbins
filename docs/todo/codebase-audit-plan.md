# Codebase audit plan

> **Status:** 🟢 ACTIVE — Phases 1 to 9 complete (forty-five issues, #151–#177 and #179–#196). Phase 10 is next.

This is a living plan for a full audit of the Sprite Gubbins codebase. Its output is **GitHub
issues**, one per confirmed root cause — not fixes. Each phase is one agent session, run from a
prompt pasted into a fresh chat, and each session ends by updating the [phase log](#phase-log)
below and landing that update, so the plan always records how far the audit has got and what it
found.

The audit looks for four kinds of problem, and only these:

- **Mechanical** — code that is wrong: a bug, a broken invariant, an unhandled state, a defect a
  test would have caught, a violation of a rule CLAUDE.md marks as mandatory.
- **Functional** — behaviour that disagrees with the spec
  ([sprite-gubbins-spec.md](sprite-gubbins-spec.md)), with a control's own guidance copy, or with
  what the UI presents; a setting the compiler discards; a control that does not do what it says.
- **Performance** — measurable waste: needless re-renders from wholesale store subscriptions,
  quadratic work on the image pipeline's hot paths, main-thread work that belongs on a worker,
  bundle weight, memory held past its lifetime.
- **Prompt** — the compiled prompt contradicting itself, drifting from its mirror, stating a fact
  two places disagree on, naming geometry loosely, or carrying wording a target's vendor does not
  document. Prompt text is the product; these are functional defects of the highest order.

## Ground rules (every phase)

1. **Read [CLAUDE.md](../../CLAUDE.md) in full before auditing.** Most of what looks odd in this
   codebase is a recorded decision with a docblock and a test behind it. A finding that
   contradicts a documented decision is not a finding — unless the decision's own stated rationale
   no longer holds, in which case the issue must quote the rationale and show why it fails.
2. **Audit only your phase's scope.** A defect noticed outside it is written into the phase log's
   Notes column for the owning phase, not investigated now and not filed now. Scope discipline is
   what keeps each phase inside one session.
3. **File issues; fix nothing.** The audit changes no source file. The only change a phase lands
   is its edit to this document. Fix work happens later, per issue, in its own worktree.
4. **Every finding is verified before it is filed.** The standard is in
   [What counts as verified](#what-counts-as-verified). A suspicion that cannot be proven within
   the session is recorded in the Notes column as unproven, never filed as an issue.
5. **All work happens in a git worktree**, including the phase-log edit. Use
   `.claude/worktrees/audit-p<N>` on branch `worktree-audit-p<N>`, land it (commit, merge to
   `main`, push, remove the tree, delete the branch) before reporting the phase done.
6. **No time estimates anywhere.** Effort labels on issues use the repository's own agent-time
   taxonomy; the plan itself never scopes by time.
7. **If the session runs out of room**, stop cleanly: file what is verified, mark the phase
   **partial** in the log with a precise note of where the sweep stopped (directory and file), and
   land the log update. The same phase prompt resumes from the note.

## What counts as verified

A finding is genuine when the session has **demonstrated** it, not inferred it. Acceptable
demonstrations, by kind:

- **A scratch test that fails.** Write a minimal test in the worktree exercising the real code
  (not a re-implementation), run it with `npx vitest run <file>`, and paste the failure into the
  issue. The scratch file is evidence, not a deliverable — do not commit it; the issue records the
  repro so the fixing agent can rebuild it.
- **A compiled-prompt excerpt.** For prompt findings, compile the configuration that produces the
  contradiction (a scratch test calling the real compiler is the tool) and quote the two clauses
  that disagree, verbatim, with the configuration that reaches them.
- **A measurement.** For performance findings: a number, with the method. React re-renders are
  counted with a render-count probe or the Profiler; pipeline hot paths are timed with
  `performance.now()` around the real function on a real sheet from
  [test_sprites/](../../test_sprites); bundle claims come from `npm run build` output or
  `dist/` inspection. "This looks O(n²)" is not a finding; "this is O(n²) and costs Xms on
  `armour.png` where the neighbouring pass costs Yms" is.
- **A driven browser session.** For behavioural and accessibility findings that types and tests
  cannot reach, drive the built app (the `verify` skill covers launching it and the
  cross-origin-isolation gotcha) and describe the exact steps and the observed result. Keyboard
  and screen-reader claims name the keys pressed and what happened.
- **A build demonstration.** For token and Tailwind findings: build, then grep the emitted CSS
  for the class in question — an unknown utility fails silently, so absence from `dist/` is the
  proof.
- **A vendor citation.** For model-wrapper findings: the claim that a wrapper line is
  undocumented is proven by quoting what the vendor's documentation does say, with the URL the
  wrapper file itself cites.

Two proof obligations that are easy to skip and must not be:

- **Prove a repro against the defect.** A scratch test that fails must fail *because of* the
  defect: check that the assertion reads the real output, not a short-circuit.
- **Check the decision record first.** Before filing, search CLAUDE.md, the file's own docblocks,
  `docs/todo/`, and closed issues for the behaviour. Deliberate behaviour, filed as a bug, costs
  a future session the work of rediscovering the rationale.

**Not findings, ever:** style preferences the repository's rules do not state; speculative
refactors; suggestions to add backwards compatibility (banned pre-1.0); missing features the spec
does not describe (YAGNI); anything whose only evidence is that another codebase does it
differently.

## Issue-filing protocol

For each confirmed root cause, in this order:

1. **Dedupe.** Search open *and* closed issues (`gh issue list --state all --search "…"`), and
   read this plan's phase log for issues earlier phases filed. A duplicate found closed means the
   defect regressed or was never fixed — say which, in a new issue that links the old one.
2. **One issue per root cause.** Five components copying one broken pattern is one issue listing
   all five sites, not five issues. Two unrelated defects in one file are two issues.
3. **Write the body to a file**, then `gh issue create --title "…" --body-file <file>` — never
   inline quoting. The body carries, in prose: what is wrong; the verbatim evidence (test
   failure, prompt excerpt, measurement, or steps); every affected file as a path with line
   numbers; the root cause; the level the whole fix lives at (per CLAUDE.md's
   "do the whole fix" rule); and **what was verified and how**, plainly separated from what was
   inferred.
4. **Reconcile the full label set in the same visit**, choosing only from `gh label list`:
   every `type:` that applies, every `area:` touched, one `effort:` calibrated to agent
   wall-clock, `status: ready` (the audit has already verified and scoped it — `triage` would be
   false), a `priority:` only where it carries information, and `breaking change` where the fix
   would touch stored data or established behaviour.
5. **End the body with the attribution trailer** after a `---` rule:
   `This issue was opened by an agent on behalf of @BootBlock.`

## Phase-completion checklist

Every phase ends with, in order:

1. All verified findings filed per the protocol above; unproven suspicions and out-of-scope
   observations written into the log's Notes column.
2. This document's phase log row updated — status, date, issue numbers, notes — and the status
   banner at the top updated to name the next phase. Nothing else in the plan is rewritten:
   phase records are history, not documentation to polish.
3. The edit landed from its worktree: committed (message via `git commit -F <file>`), merged to
   `main`, pushed, worktree removed, branch deleted.
4. The next phase's session prompt printed for the user **in a raw fenced markdown block**,
   copied verbatim from this document. After Phase 10, print the wrap-up prompt.

## Phase log

| Phase | Status | Date | Issues filed | Notes |
| --- | --- | --- | --- | --- |
| 1 — Prompt compiler and prompt text | complete | 2026-08-30 | #151 #152 #153 #154 #155 #156 #157 #158 #159 #160 #161 #162 #163 #164 #165 | Sweeps: 46,464 prompts over category × anatomy × mode × direction set × sheet index × rig mode × target × companion outputs, and 5,005 over category × projection × elevation (incl. NaN, −5, 100) × direction set, checking section numbering, count agreement (contract / inventory heading / `componentCountFor`), ceiling, views per sheet, inventory facings ⊆ section 3, yaw list = covered facings, series rows / ordinal / marker, straight quotes, residual markers, `undefined`/`NaN`, rig depth line, anatomy in §1 ⇔ §4, wrapper citations in range — all clean except user-typed anatomy taking a 30-component OBJECT/VEHICLE five-view sheet to 45 (the budget notice covers it; not filed). Every wrapper file's citations fetched and read; models.ts capability and budget figures checked against the pages. **Unproven, for wrap-up:** whether Alibaba's "Other models accept up to 800 tokens" covers the Qwen 3.0 series (would contradict the 4,500 CEILING — noted in #153); how V8.2 reads a multi-word `--no` entry (unverifiable without a subscription, #152); INTERFACE §4 `Icon plate or slot: … filled` against §8 "any gameplay art, portrait or map inside a frame"; ICON §4 `Cooldown sweep ×2` against §8's timer ban (the rescue sentence names ring, halo and tier mark, not the sweep); VEHICLE's running gear split near/far on the part library and rig but one `Drive unit` per yaw on the directional sheet; `describeSeries` writing "drawn towards front" for FONT/EFFECT run sheets whose landmark text says the subject has no front; section 0's scale example naming pieces absent from the compiled sheet on BUILDING, TERRAIN and ITEM defaults (`SCALE_EXAMPLE_TEXT`'s docblock says "pieces the sheet actually contains" — read as the category's plans, not this sheet; not filed). **Out of scope, for Phase 2:** `TRANSPARENT` background is offered to every target though only the tooltip warns that most return a matte; VEHICLE `worn_details` options `Unit Numbers & Roundels` / `Nose Art & Panel Graffiti` are always overruled by §0's text ban. **For Phase 10:** `promptCompiler.ts` (602 lines), `templateEngine.ts` (339) and `promptTemplate.ts` (993) exceed the 150-line target; most of the excess is docblock and template text, so whether that rule reaches them is a Phase 10 call. `sheetLayout.ts` is listed in this phase's scope but is Aseprite frame geometry; read, nothing found, better placed with Phase 5. |
| 2 — Domain data and guidance copy | complete | 2026-08-30 | #166 #167 #168 #169 #170 | Sweeps through the real compiler: 2,353 prompts over category × mode × direction set × sheet index × option index, checking every pooled option reaches section 1 — the only misses are `additional_anatomy` on sheets that do not draw the body, which is documented behaviour; every option of every field against section 0's lettering ban (#166); every shipped preset's and every category default's `exclusions` against its other fifteen fields, by bare word and then by reading (#169); every preset value not in its pool against that pool by Levenshtein distance (8 near misses, all deliberate free text — `Waxed Canvas & Tooled Leather` against the pool's `Boiled Leather` is the closest at distance 2, unproven either way); every `*_TOOLTIPS` / `*_GUIDANCE` / `*_UNAVAILABLE` record under `src/constants/` plus category field tooltips and `TARGET_MODELS` descriptions — 552 entries — split into sentences and checked for sharing (9 shared, 8 deliberate, 1 filed as #168); every ALL_CAPS identifier named in guidance checked against the unions (34 seen, all real). Palette, hardware and style-reference figures spot-checked against published sources: NES 55/25, Master System 64/32, Mega Drive 512/61, Game Gear 4,096/32, PC Engine 512/482, Neo Geo 4,096 and 381 sprites, GBC 32,768/56, SNES 256, C64 24 × 21 sprite and 160 × 200 multicolour, Spectrum 15, Amiga OCS 4,096/32, Atari ST 512/16, Atari 2600 127 (docblock explains the 127-vs-128 deduplication), CGA/EGA/VGA, PICO-8; SNES 128 sprites at 32/line, Mega Drive 80 at 20, PC Engine 64, Neo Geo 381; Diablo II 160 × 80, Age of Empires II 97 × 49, Celeste 320 × 180, Terraria 16-on-18, Shovel Knight 400 × 240, Cave Story 320 × 240, Sonic's three tiers — all agree except the NES's own palette size (#170). Select-label budget re-checked: every `choices=` prop in `src/components/` starts with an identifier, so `select-option-labels.test.ts`'s wired-source scan misses none, and `directionalModeChoices` depends only on category, mode and direction set, which its sweep covers. **Checked and not a defect:** `TRANSPARENT` background (Phase 1's hand-off) — the option's own label says “where the target supports it”, the tooltip says most targets return a matte, and the compiled prompt is coherent; gating it would need a capability `TargetCapabilities` does not have, which is a feature. The colour vocabulary's dead entries (`cyan`, `purple`, `silver`, `orange`, `yellow`, `vermilion` decide no pooled or preset string, all shadowed by an explicit hex) are reachable by typed free text, which is what `COLOR_HEX_MAP` is for. **Unproven, for wrap-up:** `iso-cutout-rig` bans “no facial features” while pinning `Monocular Cyber Eye`, and `flat-ability-glyph-set` bans a plate “behind the icon” while pinning `Shared Backing With Swappable Motif` — both noted in #169 rather than filed. **Out of scope, for Phase 7/8:** `spectrumStopAt` includes the cyan stop, so one preset card in ten takes `--color-tab: cyan`; the design-token test's cyan assertion covers views and accents only, and CLAUDE.md's rationale is written about views. **For Phase 10:** `architecture.ts` §2's “editing a subject field re-renders the prompt preview and nothing else” is a render-count claim nothing measures; `colors.ts` argues `sepia` was omitted because it “decided nothing”, which is equally true of six entries it keeps. |
| 3 — Quantiser pipeline: geometry | complete | 2026-08-30 | #171 #172 | Sweeps: every scale reading and every mesh over the eight sheets in `test_sprites/`, plus 3,240 fuzz configurations of the whole geometry half (synthetic sheets from 1 × 1 to 64 × 64, grids 1/2/3/5, gaps 0/3/8, symmetry, duplicate, frame and anti-alias passes all engaged) — nothing threw, and every box, drift, slot, pitch and confidence came back well formed. Corpus invariants checked: mesh cuts ascend, open at 0 and stay inside the extent at grids 2/3/4/6/12; `alignToGrid` is idempotent and every cell of its output is uniform, so `downscaleNearest` round-trips exactly; sprite boxes lie inside the sheet and hold no more pixels than their area; `snapSymmetric` leaves every paired column agreeing (64,257 pairs across the eight). `measureSheetScale` never offered a coarser scale than the truth over 138 synthetic crisp and softened fixtures at grids 2–24, and refused flat, noise, gradient, blob and photo-like fields. Docblock figures re-measured and **all confirmed**: `SPACING_AGREEMENT`'s eight corpus agreements (2/12/15/24/41/47/58/69%) and its six disagreeing medians; `placeInCell`'s “thirty of the thirty-one sprites on `cyborg_healer.png`, one of them 76,867”, which reproduces exactly at grid 1 and the default gap; `SYMMETRY_AXIS_SEARCH`'s fifteen armour pieces at 23–34 px with the quarter-width bound binding on all but the five widest; `extremeNeighbour`'s twelve bytes per pixel (19 MB at 1254², 201 MB at 4096²); `symmetryAxis`'s “about a thirtieth of the pipeline” (11.6 ms against 451 ms on `armour.png`); `frameLattice`'s worked rows at 128/6 and 21.5, the four-frame case both estimators truncate to zero included. `mergeNearby` at the 512-box ceiling costs 38 ms on grid, chain and diagonal-cascade fixtures, so the quadratic-in-boxes bound holds. **Checked and not a defect:** the end-cell merge losing a one- or two-pixel margin on ordinary art (105 of 192 crisp inset fixtures) is `boundEndCells` doing what its docblock argues for — only the case where that band is the *whole* artwork is filed, as #172; `estimatePixelGrid` answering 41 on two isolated marks 41 apart is the shape `sawTheSpacing` names as remaining measurable; a one-pixel end cell at grid 2 or 3 is `shortestEndCell`'s `grid − 1` cap. **Unproven, for wrap-up:** `duplicateSprites`' docblock says perturbing `armour.png` by four parts in 255 per channel leaves 4 of its 15 sprites with the drawn extent they had, and the nearest reproduction (a flat +4 on every channel, grid 6, key tolerance 24, no palette step) gives 3 — the docblock does not state the perturbation precisely enough to settle it. `frameLattice`'s “It returns 21.33 on that row” is 21.25 for the five-frame row and 21.3333 for the nine-frame one, and which row “that” names is ambiguous. `duplicateSprites` at the ceiling measured 1,021 ms at a tolerance of 8 on a synthetic near-miss sheet against the docblock's “a fraction of a second at the top of the dial's range”, but the fixture does not meet the docblock's stated conditions and the docblock hedges its figures as “a shape rather than a budget”. **Out of scope, verified, for Phase 4:** `quantiseImage.ts`'s `sprites:` field reuses the pre-move segmentation whenever `settings.antiAlias === 'INTERIOR'`, and that disjunct short-circuits the `output === folded` test that is what covers `snapFrames` — so with frame alignment on `SNAP` and the anti-alias mode on `INTERIOR`, `QuantiseResult.sprites` reports every moved frame at the position it left. Repro: a 200 × 60 sheet holding four 10 × 10 blocks at x = 10, 40, 70, 103, at grid 1 with no key and no reduction, `frameAlignment: 'SNAP'`, `frameDriftTolerance: 0` — under `antiAlias: 'OFF'` the boxes come back at 10/40/70/100 and under `'INTERIOR'` at 10/40/70/103, while `strips[0].frames[3]` reports `drift.x = 3, snapped = true` in both. The exemption's own argument is sound about the anti-alias pass alone; it is the frame move it does not account for. **Also for Phase 4/5:** `rectangleSum` in `integralImage.ts` reads past its table and returns a silently wrong sum for a rectangle outside the plane; its two callers (`ssim.ts`, `proxyCrops.ts`) were not checked. **Scope notes:** `mirrorPairs.ts` and `leadingSideLedger.ts` are listed here but are prompt-compiler code Phase 1 owned, and `exactSplit.ts` is the palette search's second half; all three were read, and `exactSplit` was additionally property-tested (200 random group sets × 7 budgets — never over budget, never invents a colour, deterministic) with nothing found. **For Phase 10:** `gridInForce.ts`, `stepProfile.ts` and `exactSplit.ts` are the only files in this scope with no colocated test, and `test_sprites/glyph_sprite_sheet.png` sits untracked in the working tree, outside `tests/sheetCorpus.ts`'s eight. |
| 4 — Quantiser pipeline: colour and auto-tune | complete | 2026-08-30 | #173 #174 #175 #176 #177 | Sweeps: 18,432 whole-pipeline configurations over sheet size (1×1 to 64×40, with and without partial alpha) × vote × dither × eight reductions (including `LOCKED` at snap 0) × anti-alias mode × grid — nothing threw, every byte stayed an integer in range, and `difference`, `keyedShare` and `colors` came back finite and in range on all of them. Reference formulae checked numerically: OKLab matches Ottosson's five published conversions to four decimals, `oklabToSrgb(srgbToOklab(…))` is exact on a 5-step lattice of the whole cube, `linearToByte` round-trips all 256 bytes, and the polar form agrees with the rectangular one. Every shipped threshold tile is a permutation spread evenly: Bayer 4/8 hold each rank once, void-and-cluster is a permutation of 0–4095, and every pattern's folded levels are equinumerous. Palette promises hold across the corpus — `buildPalette` + `applyPalette` never exceed a budget of 4/16/64/128 on 320² crops of all eight sheets and every drawn colour is an entry; the dither keeps within budget under all three patterns; `snapToChannelDepth` lands every channel on a rung at 1–6 bits; `applyRgbPalette` and `applyLockedPalette` keep every pixel's alpha. Documented properties re-checked and all true: `mergeColors`/`despeckle` at zero leave the bytes alone and neither invents a colour, `hardenSilhouette` leaves no partial alpha, `keyBackground` writes canonical zeroes for every pixel it removes, `snapToChannelDepth` and `applyPalette` are idempotent, `applyLockedPalette` is monotone in its snap, `coverageBlend` returns each end byte-exact, and `meanSsim` is exactly 1 on identical images and never above it across four grids on all eight sheets. **Docblock figures re-derived and confirmed:** `keyBackground`'s 11,030 candidates / 1,997 by radius / 18.1% / 10,529 by either / 95.5% reproduce to the digit; `DITHER_LATTICE_CORNERS`' mid-grey reproduces exactly (all eight corners give `#555555`/`#AAAAAA`, the nearest three give `#555555`/`#AA5555`); every row of `TUNE_ROUNDS`' corpus table reproduces at the grids it names (6/3/4/3/3/3/3/4 rounds, 403/142/181/134/134/142/142/185 positions), as do the module docblock's 0.6554-for-112 from 0.6264-for-960, the `BOTH` variant's 301 positions / 4 rounds / floor 40 / 30% / 0.6568 for 302 from 0.6399 for 1058, the eight-round loop at a budget of 16 with `BOTH`, and `tuneCandidate`'s 16.0 → 12.8 and 15.6 → 167.6. `differenceRamp.ts` and `spriteMarker.ts` still mirror `index.css` exactly. **Checked and not a defect:** `chooseByElbow` cannot prefer a dominated candidate (the frontier excludes them by construction); `rectangleSum`'s read-past-the-table, handed over by Phase 3, cannot be reached from `ssim.ts` — its window loops are bounded at `x + window <= width` and `top + window <= height` (`proxyCrops.ts` is Phase 5's to check); each sweep stage's skip predicate is exactly the pipeline's own gate, so `restoreSkipped` cannot reach a pixel; the 145-positions-a-round arithmetic sums correctly; black against white scoring 0.667 rather than 0 is the three-plane mean doing what it says, since two neutral images agree on both chroma planes. **Unproven, for wrap-up:** what median cut would score today, so what `wuQuantiser`'s four percentage claims should become (noted in #174). **Out of scope, for Phase 5:** `rectangleSum`'s bound is unchecked from `proxyCrops.ts`. **For Phase 10:** `channelLevels.ts`, `keyingInForce.ts`, `wuBoxSearch.ts`, `wuMoments.ts` and `tuneCandidate.ts` are the files in this scope with no colocated test; `quantiseImage.ts` (555 lines), `keyDistance.ts` (305), `wuMoments.ts` (236), `outlinePolarity.ts` (236) and `mixingPlan.ts` (230) exceed the 150-line target, mostly in docblock; `quantiseImage.test.ts` has no case pairing `frameAlignment: 'SNAP'` with each anti-alias mode, which is the gap #173 went through. |
| 5 — Encoders, file formats and atlas maths | complete | 2026-08-30 | #179 #180 | Sweeps: 480 whole-download configurations over sheet size (1 × 1 to 40 × 31) × colour count (1/2/30/300) × alpha shape (opaque, partial, keyed) × magnification (1×, 3×) × all four formats, every one read back by a decoder sharing none of the writer’s code — nothing threw, every PNG round-tripped pixel for pixel, every `.aseprite` cel landed inside its canvas, every archive parsed from its own central directory and every manifest matched the sheet it describes. The eight sheets in `test_sprites/` were quantised at grid 6 on the magenta key at a budget of 64 and written in all four formats (15/15/15/43/31/24/25/27 sprites, 3/3/3/5/3/3/5/4 strips): every strip range is contiguous and covers every frame, the boxes arrive topmost-first as `sheetLayout` requires, and each `.aseprite` states its own byte count. 4,300 atlas configurations (4 aspects × 5 texture sizes × 5 gutters × 1–43 components) never overflow the texture, never leave a whole empty row and never report a share outside 0–1; `smallestCanvasFor` agrees with an exhaustive filter over 12,040 (aspect × gutter × count × fourteen target sides) and the fit is monotone in texture size at every one. 58,344 component slot names over category × mode × direction set × sheet index are all `[a-z0-9-]`, so no pack entry name can carry a character a filesystem rejects; 5,376 batch sheets never label a single-facing sheet with a facing it does not draw. **External consumers:** Pillow 12 opens every PNG written (indexed with and without `tRNS`, truecolour, 1 × 1, the 256-entry partial-alpha case), `unzip -t` validates every CRC in a pack and extracts it whole, and a Python parser written from the published `.ase` specification walks four documents field by field — header, colour profile, palette, layer, cels, tags and per-tag user data — with every chunk ending exactly where its size says, every frame ending exactly where its size says, and the frames ending at the file’s own stated length. **Docblock figures re-measured and all confirmed:** `encodePng`’s six byte counts reproduce to the digit (unkeyed 13,649 indexed / 13,388 stored / 15,313 adaptive / 14.4% / 34,570 truecolour `IDAT` / 34,627 complete; keyed on `#FF00FF` at `DEFAULT_KEY_TOLERANCE` 10,312 / 10,041 / 11,803 / 17.5% / 28,215 / 28,272); `widthBiasFor`’s 1024 × 438, 2.338 and “a fifth of a percent” (0.196%), and its 11 × 4 at 32% against a square sheet’s 7 × 7 at 83%; `atlasBudget`’s 16 MiB and 64 MiB, and “roughly a third again” for a mip chain (1.3333 in both formats); the 4,096 × 16 widest swatch and the 160,000-pixel strip; `MAX_CANVAS_SIDE`’s “70,000 pixels across would wrap to 4,464”. `crc32` matches five published vectors including `0xCBF43926` for `123456789`. `deflate` on an empty input is eight bytes opening `78 9c` and inflates back to nothing. **Checked and not a defect:** `rectangleSum`’s read-past-the-table, handed over by Phase 3/4, cannot be reached from `proxyCrops.ts` either — every window satisfies `left + edge <= floor(width/grid) * grid <= width` and the same down, so both reads land inside the table; the Aseprite export ignoring the sprite cell is what `spriteCellSource`’s own guidance says (“what every sprite in a pack or a manifest is cut into”); `spriteManifest` computing the pivot from the scaled box while scaling the cell offset after measuring it at 1:1 is two rules for two quantities, each argued at its own field — the offset keeps the artwork on its anchor across the rungs, the pivot names the true centre of the box in the file’s own pixels; `indexImage` cannot collide an opaque pixel onto the collapsed transparent entry, since the only colour packing to 0 is already fully transparent; `zipArchive` accepts an empty archive (a bare 22-byte end-of-central-directory) and a zero-byte entry. **Unproven, for wrap-up:** whether Aseprite itself accepts an RGBA document stating `colors: 0` and carrying no palette chunk, which is what `encodeAseprite` writes past 256 colours — the specification requires no palette chunk and glosses 0 as “256 for old sprites”, and no Aseprite build was available on this machine to open one. **For Phase 10:** `zipArchive`’s docblock prices deflate on incompressible input at “five bytes per 65,535-byte block”; measured, 200,000 bytes of `os.urandom` come back as 200,071, which is 13 blocks of 16,384 plus the zlib header and Adler-32 — the format’s maximum block rather than what zlib emits, understating the cost 2.7× in the direction that strengthens the decision. `spriteManifest.ts` (172), `sheetLayout.ts` (174) and `encodeAseprite.ts` (151) exceed the 150-line target, mostly in docblock; `deflate.ts`, `aseHeader.ts`, `aseChunk.ts`, `aseCel.ts`, `aseLayer.ts`, `asePalette.ts`, `aseTags.ts`, `encodeSpritePack.ts`, `firstOfEachId.ts` and `sheetCoverage.ts` have no colocated test, though the seven `ase*` files and `encodeSpritePack` are exercised through `encodeAseprite.test.ts` and `writeSheet.test.ts`; no test pairs a sprite count past 99 with a pack, which is the gap #179 went through. |
| 6 — Stores, persistence and workers | complete | 2026-08-30 | #181 #182 #183 | Read every file in `src/stores/`, `src/db/` and `src/workers/` plus `studioHistory.ts`, `dialHistory.ts` and the types they consume. **Sweeps:** every parser under `src/db/` fuzzed against 28 hostile values per key — `undefined`, `null`, `NaN`, `±Infinity`, `±1e308`, `0.5`, `[]`, `{}`, a `Date`, a `Symbol`, a function, a `bigint`, `'true'` — across all 26 dial keys, all 28 `OutputConfig` keys and all 16 subject fields on all 13 categories; nothing threw, every key came back at its default's type, every number finite, and the only value admitted that the app cannot produce is the step-grid gap filed as #182. Both undo stacks driven past their caps (`DIAL_HISTORY_LIMIT` 50, `STUDIO_HISTORY_LIMIT` 20) with a full walk back and forward at every step: the cursor stays in range, the newest positions are the ones kept, and `entryAt`'s throw is never reached; coalescing extends a drag inside `DIAL_COALESCE_MS` and never into entry zero. `evictionLengths` enumerated at 0/1/2/3/5/10/50/178/200. Both backends compared operation by operation for the history, the archetypes, the quantiser presets, the settings and the session — the archetype collection is the only one whose fallback was never aligned with the SQLite side, filed as #181, and the quantiser's collection was used as the control. **Filed:** #181 (custom presets listed in opposite orders on the two backends), #182 (`parseQuantiseDials` checks a dial's range and ignores its step, so an imported pack sets a line strength the panel then rounds in the label), #183 (the auto-tune report survives a grid change and a palette lock). **Checked and not a defect:** `quantiseSession`'s `send` files no failure when `connect()` refuses because the session is already `abandoned`, which the docblock claims is unobservable — confirmed, `useQuantiseWork` derives `busy` with `fatal === null`, so the tab reports the fatal rather than spinning; the quantiser's thread keeping a transform of a superseded sheet running is documented in `quantiseWorker.ts` and its reply is dropped by correlation id; `autoTuneSession`'s six thread-ending and two thread-free exits all settle, and `abandonSweep` is called from both `setSource` and `clear` beside `releaseSheet`; `sheetWriteSession` has no `abandonSweep`-style pair and needs none, because nothing clears `useSheetWriteStore.writing` from outside and the file it finishes writing is the one the reader asked for; `useAutoTuneStore.forget()` has exactly one caller, as its comment requires; no store subscribes to another in a way that can cycle (`useSessionStore`'s two wholesale subscriptions only schedule a timer); `EMPTY.history` in `useQuantiseStore` is a module-level object reused by every `clear`, which is safe because `dialHistory.ts` never mutates one; `trimHistoryToBudget`'s per-row cost accounting matches what `JSON.stringify` produces for the prefix it returns; `getDatabase`'s memoised promise cannot reject, since `openSqliteBackend` resolves `null` for every failure and `resolveWebStorage` is fully guarded. **Unproven, for wrap-up:** `quantiseWorker.ts` posts its reply by structured clone where `sheetWriteWorker.ts` transfers its buffer, and the reply is the largest thing this app moves — up to 67 MB of `ImageData` plus 33.6 MB of `DifferenceMap`; whether transferring `result.image.data.buffer` and `result.difference.buffer` is both safe (the pipeline's passes hand back their argument by reference where they change nothing, so `output` aliasing the retained sheet has to be ruled out) and faster needs a browser measurement that was not made, and `quantiseProtocol.ts`'s own docblock prices the clone at "a few tens of milliseconds". `quantiseWorker.ts` is the one of the three workers with no guarded `fail()` — its `catch` posts unguarded, where `autoTuneWorker.ts` and `sheetWriteWorker.ts` both swallow a throwing failure post and say at length why — and the near side's `error` listener is `lose()`, which abandons the session permanently with "The quantiser could not start in this browser"; no reachable route to that escape was found, since the only unguarded post carries a short string. `SqliteBackend.request` records its `pending` entry before `postMessage`, so a clone the browser refuses leaks a map entry — the promise still rejects, and every payload on that wire is plain data, so no route to it was found either. **Out of scope, for Phase 8:** `PresetEntry.index` fixes a preset's hue-wheel stop by position in the library, so on the SQLite backend saving a new custom preset shifts every other custom preset's stop by one, against `presetSearch.ts`'s "it keeps the same one wherever it is seen". **For Phase 10:** `evictionLengths`' docblock says "Ten attempts cover a full history"; measured, a 200-entry history gives nine (200, 199, 197, 193, 185, 169, 137, 73, 1) and so does the 178 its own module docblock is written around. `parseHistoryRow`'s docblock justifies repairing the two payload columns on the ground that "they were added after the first schema shipped, so a row written before then has neither", which is a backwards-compatibility rationale for behaviour that is separately defensible as robustness against corrupt storage — the code has no dual path, only the comment. `useQuantiseStore.ts` (397 lines), `usePresetStore.ts` (269), `useQuantisePresetStore.ts` (265), `useUIStore.ts` (259), `schema.ts` (264), `sqliteWorker.ts` (271), `localStorageBackend.ts` (286), `sqliteBackend.ts` (249), `rows.ts` (223), `configParsers.ts` (209), `quantiseDialsParser.ts` (164), `useSubjectStore.ts` (164), `useSessionStore.ts` (179) and `quantiseSession.ts` (319) exceed the 150-line target, mostly in docblock; `useAutoTuneStore.ts`, `useOutputStore.ts`, `useQuantiseAnswerStore.ts`, `useSectionStore.ts`, `useSheetWriteStore.ts`, `backend.ts`, `database.ts`, `webStorage.ts`, `workerProtocol.ts`, `quantiseProtocol.ts`, `quantiseWorker.ts` and `sqliteWorker.ts` have no colocated test. **Not driven:** the SQLite backend was exercised by running the shipped SQL constants against a real `@sqlite.org/sqlite-wasm` in-memory database rather than through `sqliteWorker.ts` on OPFS in a browser, and no browser session was driven this phase. |
| 7 — UI: primitives, chrome, modals and tabs | complete | 2026-08-30 | #184 #185 #186 #187 #188 #189 #190 | Read every non-test file in `src/components/common/`, `layout/`, `modals/` and `tabs/` and all twelve listed hooks. **Sweeps:** every `className=` region and hoisted class constant in the four directories plus `src/hooks/` — 445 distinct class tokens — checked as an escaped selector against `dist/assets/index-*.css` after `npm run build`, and every one emits (the eleven misses were ternary *condition* fragments, not classes; capture was proved total by comparing captured regions against the raw `className=` count per file). Every solid role fill in scope carries `text-foundry-950`, and the translucent ones are in the documented band — `AtlasGridPreview`'s `bg-accent/40` is the only one past 30% and it holds no text. Every `<button>`, `<input>`, `<select>`, `<a>`, `<summary>` and `<details>` in the four directories is either wrapped in `ControlTooltip`, has a `Tooltip` sibling, or is one of CLAUDE.md's five recorded exemptions — guidance coverage is complete. Every `addEventListener`, `setTimeout`, `ResizeObserver` and `MutationObserver` in scope returns a cleanup. Five driven Edge sessions against `npm run dev` (`crossOriginIsolated === true`): touch with `hasTouch`, keyboard-only focus tracing through every confirmation and every overlay, the toast's own `getAnimations()` across an overlay boundary, the keyboard `ComboBox` (open on focus, `aria-activedescendant` present and resolving, arrows wrapping, Enter committing, all correct), and the preset library's `--color-tab` per card. **Filed:** #184 (the ⓘ dies after its second tap on a touchscreen, because `show()` will not clear a dismissal for a held input and the touch toggle reveals through `focus`), #185 (a tap on any `ControlTooltip` opens its card over the control 350ms later, from the synthesised `mouseenter` that follows its own `pointerdown`), #186 (six confirmation presses across `HistoryEntry`, `HistoryFooter` and `PresetCard` drop focus to `<body>`, against six places in the same codebase that prevent it deliberately), #187 (`Modal` calls `dialog.close()` from a *passive* effect cleanup, which React runs after detaching the node — measured connected/detached both ways, and a detached `close()` restores no focus), #188 (a toast crossing an overlay boundary is remounted, restarting `toast-timer` from 1996ms to 158ms while the store's dismissal timer runs on), #189 (`PresetEntry.index` is an array position, so saving a second preset moved the first card magenta → rose in the browser), #190 (`spectrumStopAt` offers the cyan stop reserved for `neon`, 10° away against the 26° `index.css` says it keeps, on ten shipped cards). **Checked and not a defect:** `useFileSave` builds its anchor in the global `document`, so a download pressed in the detached preview starts from the page — it works, and #109 already covered the confirmation half; `PackImportConfirm`'s `aria-live` region mounts with its own text, which the app calls unreliable, but focus moves to Cancel and both buttons carry the figures in their accessible names; `usePresetStore.isExporting` gates the import as well as the export, so the name differs from the quantiser's `isTransferring` and the behaviour does not; `ControlTooltip`'s `[&>*:disabled]:pointer-events-none` reaches every disabled child in scope, all of which are direct children. **Unproven, for wrap-up:** `useComboBox`'s arrow handler reduces over the *unclamped* `storedIndex` (`src/hooks/useComboBox.ts:106-113`) while the rendered `activeIndex` is clamped to the pool (`:52`), so a highlight left over from a longer pool would send the first ArrowDown to an arbitrary row rather than to the first — no route was found to reach it, because every way the list closes goes through `close()`, which resets the index, and `options` change only with the category, which cannot change while the list is open (the category select is a pointer press outside the container, and `isTextEntry` refuses Ctrl+Z inside the field). `useAnchoredSurface` does not re-place a surface that changes size while showing; no reachable case was found, since a list's options and a card's text are both fixed for the life of one reveal. `useComboBox`'s outside-press listener is on the global `document` where `useTooltipReveal` and `useAnchoredSurface` both take the anchor's `ownerDocument`; the detached window portals `ImageComparison`, which holds no `ComboBox`, so the inconsistency has no route today. **Out of scope, for Phase 8:** `QuantisePresetRow` has the same confirm-in-place shape as the three components in #186 and was not driven; `useImageDownload` and `usePaletteDownload` inherit `useFileSave`'s page-document anchor in the detached window. **For Phase 10:** `ControlTooltip`'s docblock says "seven of these wrap a control that can be disabled" — sixteen do, across twelve files. `SheetSplitContents.tsx:51-52` carries an ungrammatical comment ("a second search for it second definition of where the user is"). `QuantiseTab.tsx` (475 lines), `CollapsibleSection.tsx` (277), `useDetachedWindow.ts` (238), `useTooltipReveal.ts` (224), `PresetCard.tsx` (193), `AtlasCalculatorContents.tsx` (188), `useAnchoredSurface.ts` (180), `SheetSplitRun.tsx` (180), `JsonPackTransfer.tsx` (166), `Header.tsx` (161), `SelectField.tsx` (161), `ComboBox.tsx` (158), `PresetSavePanel.tsx` (154) and `ControlTooltip.tsx` (153) exceed the 150-line target, mostly in docblock. Forty components and eight of the twelve hooks in this scope have no colocated test, though most are exercised through a parent's suite — `Modal`, `TabSwitcher`, `HistoryEntry`, `HistoryFooter` and `PresetCard` are the ones whose own behaviour the audit found untested, and #186 and #187 both went through that gap. **Not driven:** no screen reader was used, so every announcement claim rests on the markup rather than on what a reader says; both touch runs used Edge's emulated touch rather than hardware. |
| 8 — UI: studio and quantise views | complete | 2026-08-30 | #191 #192 | Read every non-test file in `src/components/studio/` and `src/components/quantise/` and all ten listed hooks. **Sweeps:** every `className=` region and hoisted class constant in the two directories — 261 distinct class tokens — checked as an escaped selector against `dist/assets/index-*.css` after `npm run build`, and every one emits (the twenty misses were prose from two SCREAMING string constants and ternary *condition* fragments, not classes). Every `<button>`, `<input>`, `<select>`, `<a>` and `<summary>` in the two directories is wrapped in `ControlTooltip` or has a `Tooltip` sibling — guidance coverage is complete, with no exemption claimed. Every solid role fill carries `text-foundry-950` or holds no text (`PromptPreview`'s `bg-neon` dot and `WipeHandle`'s `bg-tab` line). Every `addEventListener`, `setTimeout`, `ResizeObserver` and `MutationObserver` in scope returns a cleanup — five in all. Every viewport-breakpoint class inside a split column enumerated: three hits, of which `PromptPreview`'s three `lg:` classes are #191 and `QuantiseGuide`'s two `sm:grid-cols-2` are correct, since that panel sits above the split at full page width. **Driven Edge sessions** against `npm run dev` and against the production build under `vite preview` (`crossOriginIsolated === true` in both). **Measurements:** one keystroke in a subject field costs **5.2–5.4ms** median on the production build (15 keystrokes, layout forced), of which **3.43ms** is replacing the `<pre>`'s own 27,321-character text node and **0.25ms** is `generatePrompt` — so the wholesale `subject`/`output` subscriptions in `SubjectForm`, `OutputConfig`, `PromptPreview` and `PromptActions` cost about 1.8ms between them and are not the atomic-selector violation the phase looked for; the dev build reads 11.45ms for the same keystroke, which is React's development overhead rather than the app's. `ImageComparison`'s paint effect repaints the **source** canvas on every change of the second image — a dial step, a mode switch, a difference-scale press — because both `putImageData` calls share one effect; measured through a prototype patch at **0.32–0.34ms** for `armour.png`'s 1,572,516 pixels against 0.02–0.13ms for the 209² result, so the redundancy is real and costs nothing worth filing. `useLinkedPanes` holds exactly: panned to 900/700 at 4×, both panes read 1964/1591 at 8× and 900/700 again on the way back, identical at every step. **Filed:** #191 (`PromptPreview` drops its `max-h-[36rem]` at `lg` while the column that bounds it engages at `--breakpoint-studio`, so between 1024px and 1119px the stacked studio grows the panel from 576px to 10,010px and the page from 3,988px to 13,421px), #192 (`PaletteLockControls`' Lock button is enabled and answers a press with nothing at all on a result holding no opaque pixel, against `lockedPalette.ts`'s own claim that "the control that offers this refuses instead"). **Confirmed for #186:** `QuantisePresetRow` shares one of that issue's three failure modes — the confirm press drops focus to `<body>` with the row, while the *ask* keeps it because React reuses the sibling positions and lands it on Cancel; commented there rather than filed again. **Checked and not a defect:** the detached preview is sound end to end — 97 stylesheet rules adopted, `compatMode` `CSS1Compat`, `data-tab="quantise"`, both canvases present, `--pane-height` resolved from the window, and a Download PNG pressed there writes `armour-quantised-sheet-1.png` with its toast in the detached document, which answers Phase 7's hand-off about `useFileSave` building its anchor in the page's document; the wipe divider is reachable by Tab from the toolbar and steps on the arrows, `Home`, `End` and `PageUp`, with the clip following `--wipe`; a text paste on the Quantise tab is ignored and leaves the sheet loaded; `heatmapImage` running on the main thread is a recorded decision with its own 80ms worst case in its docblock; `SubjectForm`'s and `ImageComparison`'s two-up grids are both container queries, and the only viewport breakpoints left in `src/components/common/` are `Toast`'s, which is `fixed` and correctly measures the viewport. **Unproven, for wrap-up:** the app registers no window- or document-level `dragover`/`drop` guard — only the two zones' own handlers — so a file dropped anywhere else should navigate the browser away and take the sheet, every dial position and both undo stacks with it, which is what `useFileDropTarget`'s own comment asserts; driven with CDP `Input.dispatchDragEvent` carrying a real file over the header, the `drop` was never dispatched to the page and no navigation followed, so the consequence was not demonstrated and the guard's absence is all that is established. **For Phase 10:** `quantise-column-width.test.ts`'s `SELECT_PANELS` omits `AntiAliasControls`, whose two `SelectField`s sit in `max-w-md` wrappers nothing checks — they clear the 442px budget today, so this is coverage rather than a defect, and `GridControls` is in that list while holding no `SelectField` of its own, which makes its own iteration vacuous. `studio-column-width.test.ts`'s docblock says the quantiser's file carries "a container-queried grid in the sticky column" that this tab "has no equivalent of"; the studio has one, in its *form* column (`SubjectForm`'s `@[34rem]`), bounded by nothing. `ImageComparison.tsx` (370 lines), `useImageDownload.ts` (244), `DownloadControls.tsx` (221), `KeyingControls.tsx` (208), `SpriteCellControls.tsx` (198), `SpriteControls.tsx` (196), `RenderStyleFields.tsx` (192), `GridControls.tsx` (182), `AutoTuneControls.tsx` (178), `useQuantiseWork.ts` (176), `FrameAlignmentControls.tsx` (176), `WipeHandle.tsx` (174), `DownscaleControls.tsx` (172), `OutputConfig.tsx` (169), `ComparisonToolbar.tsx` (167), `DuplicateControls.tsx` (165), `SymmetryControls.tsx` (162), `ProjectionFields.tsx` (160), `PaletteLockControls.tsx` (154), `QuantiseGuide.tsx` (152) and `useLinkedPanes.ts` (152) exceed the 150-line target, mostly in docblock. Twenty-one components and five of the ten hooks in this scope have no colocated test; `QuantisePresetRow`, `DetachedPreview`, `ComparisonToolbar` and `PaneWindow` are the ones whose own behaviour the audit found untested, and #186's Quantise site went through the first of those. **Not driven:** no screen reader was used, so every announcement claim rests on the markup; no physical touchscreen; the localStorage fallback was not exercised this phase. |
| 9 — Shell, PWA, tooling and types | complete | 2026-08-31 | #193 #194 #195 #196 | Read every file in the phase's scope. **Sweeps:** all 63 `@theme` tokens in `src/index.css` checked against `dist/assets/index-*.css` after `npm run build` — every one emits, and the fifteen that appear only as a `var()` (the ten wheel stops, `neon-deep`, the three scrollbar tokens, `ease-exit`) are consumed from the stylesheet itself, which is what CLAUDE.md describes; both custom breakpoints emit, as `70rem` and `76.5rem`. Every string-union member in `src/types/` (5 unions, 23 members) and every `as const` array member (39 arrays, 229 members) is named somewhere else under `src/`; the seven optional fields in `src/types/` were each checked against their construction sites and none is always present, so nothing in there is wider than the values it describes. Tool-exclusion integrity re-proved by probe rather than by reading: an unformatted `.tsx` naming a class no build emits, placed at `.claude/worktrees/probe/src/`, is skipped by `prettier --check .`, by `eslint .`, by vitest collection and by Tailwind's content scan — and the same file in `src/` emits `.ring-gold\/73`, which is what makes the negative falsifiable. Every dependency licence surveyed (449 MIT, 27 Apache-2.0, 19 ISC, 11 BSD-2-Clause, 9 BlueOak, 6 BSD-3-Clause, 5 MPL-2.0 — all build-time — plus one each of Python-2.0, CC-BY-4.0, CC0-1.0 and a dual): nothing incompatible with MIT, and every declared devDependency has a consumer, `playwright`'s being the `verify` skill. Secrets swept across the whole tracked tree and across all history: no credential shape, no IPv4, no phone number, and one email, which is npm's own deprecation notice inside `package-lock.json`; the CI-equivalent run (`--diff` against the empty tree) exits 0. `dist/` ships no file twice but `404.html`, which is the SPA fallback by design. **Driven Edge sessions** against a header-less static server over `dist/` sending `Cache-Control: max-age=600`, which is the GitHub Pages shape — `npm run preview` supplies the headers itself and would prove nothing: a first visit reports `crossOriginIsolated === false`, the worker takes control, the bootstrap reloads once with its session guard set, and the page comes back isolated; offline, the app reloads from the precache and the Studio, Quantise and Presets chunks all load with **no failed request**, so the precache has no gap. The update flow is where it breaks. **Filed:** #193 (`sw.ts` reads `revision === null` as “the shell” where Workbox means “the URL already carries a hash”, so `index.html` is precached with `cache: 'default'` and a deploy installs the previous shell beside the new chunks — driven to a blank page and a 404 on the entry chunk, then rebuilt with the ternary flipped and re-driven to establish the cause), #194 (`secret-scan.mjs`'s placeholder clause `<[^>]*>` exempts the whole line, so four of seven probe lines carrying the same credentials as their controls were let through), #195 (`::selection` paints `ink` on `accent` at 2.05:1 where `foundry-950` measures 8.01:1, and both ground/ink sweeps read class strings in components so neither can see a stylesheet rule), #196 (AGENTS.md's “complete list” is missing four CLAUDE.md sections, one of them headed mandatory, and says two exemptions where CLAUDE.md counts four). **Checked and not a defect:** every contrast claim in CLAUDE.md's token section re-derived independently from the stylesheet's own `oklch()` through `src/utils/oklab.ts` — ten stops all at L 0.76, clearing 7.79:1 on `foundry-800` and 8.36:1 on `foundry-900`; eighteen solid role fills with `text-foundry-950` worst at 5.35 and `text-ink` best at 3.06; nine accent hues holding indigo's luminance to within 0.61%; the scrollbar at 4.12:1 resting and 6.39:1 hovering — every figure agrees with the paragraph to the rounding. `withIsolationHeaders`' same-origin gate is total: `status === 0` covers both an opaque response and the `opaqueredirect` a navigation's `redirect: 'manual'` produces, and the empty-`url` branch covers a synthesised one. `repro.log` and `.verify-out.txt` are untracked and ignored, so the question of whether they belong in the repository does not arise — they are not in it. `optimizeDeps.include` covers every bare specifier `src/` imports, subpaths included. The `sqlite3-worker1-*.js` chunk in `dist/` is the documented one that cannot be kept out, and it is out of the precache. `.nvmrc`, `engines.node` and the workflow's `node-version` agree. **Unproven, for wrap-up:** the two reduced-motion blocks carry identical declarations, which is what `design-tokens.test.ts` compares, but their *selector lists* differ — the media query's `*::before` / `*::after` reach the shell's own pseudo-elements while `[data-motion='reduced'] *::before` names descendants only. No route to it was found: the shell in `App.tsx` carries no `before:`/`after:` utility, no rule in `index.css` gives it one, and the `[data-tab]` sweep it does run is on the element itself, which the in-app block's first selector names. `Run.ps1:340` ends `exit $LASTEXITCODE` after `npm run dev` and `Run.bat` pauses on a non-zero code, while its comment says “a clean Ctrl+C … returns 0 and closes quietly”; a Ctrl+C cannot be driven from this session, so what npm returns there was not established. **For Phase 10:** `scripts/precacheContract.ts`'s docblock says the list and its ceiling “describe the globbed precache — 15 of the shipped worker's 18 entries”; measured, `PRECACHE_SHAPES` carries 45 lines and the shipped worker 48 manifest entries — 46 unique, since `sw.ts` de-duplicates the twice-listed icons — so the two figures are stale by a factor of three while the sentence's structure is still right. `tsconfig.node.json` omits `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, which `tsconfig.app.json` sets; turning both on produces 8 diagnostics across `scripts/iconGlyph.ts`, `tests/columnSplit.ts` and `tests/optimize-deps-coverage.test.ts`, and the one in `scripts/` is safe by construction (`GLYPH` is a 16-row literal indexed at `(y / scale) | 0` for `y < size`, with a `throw` for a missing palette key) — so it is a strictness asymmetry rather than a latent bug, and CLAUDE.md's banned-patterns table names `tsconfig.app.json` by file. `src/sw.ts` has no test at all, and of `scripts/` only `precacheContract.ts` has one; #193 and #194 both went through that gap. **Not driven:** no screen reader, no physical touchscreen, and the localStorage fallback was not exercised; the app was never loaded from `bootblock.github.io`, so the GitHub Pages `Cache-Control: max-age=600` that #193's window depends on is that host's documented behaviour rather than a measurement taken here. |
| 10 — Test suite and documentation | pending | | | |
| Wrap-up | pending | | | |

Statuses: `pending` → `in-progress` → `complete`, with `partial` for a phase that stopped cleanly
mid-sweep (its note says exactly where).

---

## Phase 1 — Prompt compiler and prompt text

**Scope:** `src/utils/promptCompiler.ts`, `templateEngine.ts`, `promptBudget.ts`,
`componentSet.ts`, `componentBudget.ts`, `componentSlots.ts`, `sheetBatch.ts`, `sheetRuns.ts`,
`sheetDirections.ts`, `sheetLayout.ts`, `sheetIdentity.ts`, `describeSeries.ts`,
`directionalRotation.ts`, `turntableSequence.ts`, the rig-mode paths through the compiler that
`rigModes.test.ts` exercises, `resolveOutputForCategory.ts`, `additionalAnatomy.ts`, `identityDigest.ts`,
`identitySubject.ts`, `studioDigests.ts`, `targetCapabilities.ts`, `targetSize.ts`,
`targetSizeGrid.ts`, `modelWrappers.ts` and all of `src/utils/modelWrapperText/`;
`src/constants/promptTemplate.ts`, `src/constants/promptText/`, `src/constants/sheetPlans/`,
`src/constants/models.ts`, `src/constants/componentBudget.ts`, `sheetCanvas.ts`,
`sheetIdentity.ts`, `sheetFormats.ts`; the mirror `docs/todo/baseline-prompt-new.md`.

**Look for:** internal contradictions in a compiled prompt (section 4 requiring what section 8
forbids; an inventory naming views section 3 does not list; anatomy appearing on a sheet that
does not count it) under configurations the existing sweep may not pin; any hand-written fact a
second place also states (counts, facings, yaw lists, series lists) that could drift; any
Output Configuration control whose value the compiler discards or degrades without the digest
reporting it; loose geometry (a named view with no yaw and no occlusion statement); wrapper
lines with no vendor citation, or citations the cited page no longer supports; ceiling breaches
(`PRACTICAL_COMPONENT_CEILING`, the five-view page limit, `coreFacingChunks`); capability-gated
sections emitted to a target whose `models.ts` entry does not declare the capability; straight
punctuation reaching compiled output outside the JSON manifest example; template/mirror
divergence beyond what the character-for-character test proves.

**Method:** drive the *real* compiler from scratch tests across category × target × mode ×
direction set × sheet index combinations the shipped tests do not enumerate; diff compiled
output against the spec's own statements; read every wrapper file against its cited vendor page
(WebFetch).

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-plan.md in full. You are running **Phase 1 — Prompt
compiler and prompt text** of the codebase audit. Follow the plan's ground
rules, verification standard, issue-filing protocol and phase-completion
checklist exactly: audit only Phase 1's scope, prove every finding before
filing it, file one GitHub issue per confirmed root cause with a reconciled
label set and the attribution trailer, fix nothing, then update the plan's
phase log in a worktree and land it. Finish by printing the Phase 2 session
prompt from the plan in a raw fenced markdown block.
````

## Phase 2 — Domain data and guidance copy

**Scope:** `src/constants/categories/`, `presets/`, `palettes/`, `hardware/`, `output/`,
`styleReferences/`, `tooltips/`, `colors.ts`, `anatomy.ts`, `backgroundKeyColors.ts`,
`categoryDirectionSets.ts`, `categoryProjections.ts`, `categoryStyleReferences.ts`,
`subjectGroups.ts`, `about.ts`, `architecture.ts`, `ui.ts`, `settings.ts`, `session.ts`,
`keyOffer.ts`, `identityCapture.ts`, `identityLock.ts`, `paletteExport.ts`, `paletteFiles.ts`,
`paletteLock.ts`, `packImport.ts`, `previewModes.ts`, `spectrum.ts`, `studioHistory.ts`; the
supporting utils `colorParser.ts`, `presetNames.ts`, `presetPack.ts`, `presetSearch.ts`,
`paletteEntries.ts`, `paletteText.ts`, `slugify.ts`.

**Look for:** option pools whose casing, sentinel handling or duplication the tests do not
already pin; preset values that no longer match the pool spelling they pin (beyond the
case-mismatch the tests catch — e.g. a renamed option a preset still names, which loads
silently and compiles the retired term); palette data that misstates the hardware it claims
(spot-check counts and known values against authoritative references); a select option over the
50-character budget path the tests cannot see; guidance copy that is **untrue** of the control
it describes (the tooltip suite checks shape, never truth — read each control's guidance
against what the control actually does, sampling every `*_TOOLTIPS` record); a colour literal
in a seventh location; guidance shapes the discovery walk does not reach and that are not in
its hand-kept list; category fields whose sheet-plan coverage is incomplete for some mode.

**Method:** read the data against the code that consumes it; scratch tests through the real
parsers and compiler for suspected silent-degradation paths; the browser for guidance-truth
checks where reading is inconclusive.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-plan.md in full. You are running **Phase 2 — Domain
data and guidance copy** of the codebase audit. Follow the plan's ground rules,
verification standard, issue-filing protocol and phase-completion checklist
exactly: audit only Phase 2's scope, prove every finding before filing it, file
one GitHub issue per confirmed root cause with a reconciled label set and the
attribution trailer, fix nothing, then update the plan's phase log in a
worktree and land it. Finish by printing the Phase 3 session prompt from the
plan in a raw fenced markdown block.
````

## Phase 3 — Quantiser pipeline: geometry

**Scope:** the scale-and-structure half of `src/utils/`: `gridAlignment.ts`, `gridMesh.ts`,
`gridInForce.ts`, `nativeGridScale.ts`, `componentGridScale.ts`, `pixelGrid.ts`,
`pixelPeriod.ts`, `meshPeriod.ts`, `profilePeriod.ts`, `stepProfile.ts`, `bestPhase.ts`,
`frameAlignment.ts`, `frameLattice.ts`, `frameRegister.ts`, `frameSnap.ts`, `exactSplit.ts`,
`boundaryClusters.ts`, `boxClearance.ts`, `boxSeparation.ts`, `edgeClaims.ts`, `edgeRuns.ts`,
`spriteCell.ts`, `spriteOutline.ts`, `spriteSegments.ts`, `spriteStrips.ts`, `cropImage.ts`,
`cropSprite.ts`, `placeInCell.ts`, `duplicateSprites.ts`, `snapDuplicates.ts`,
`mirrorPairs.ts`, `symmetryAxis.ts`, `symmetrySnap.ts`, `leadingSideLedger.ts`,
`runningExtremum.ts`, `integralImage.ts`, `extremeNeighbour.ts`, `panGeometry.ts`,
`upscaleNearest.ts`, `imageData.ts`, `imageConfig.ts`; their constants (`quantiser.ts`,
`spriteCell.ts`, `spriteDuplicates.ts`, `spriteSegmentation.ts`, `spriteSymmetry.ts`,
`frameAlignment.ts`, `sheetCanvas.ts` where geometric).

**Look for:** off-by-one and boundary errors at image edges and non-dividing dimensions (no
corpus sheet divides by its grid — exercise the remainder paths); calibration figures whose
docblock names a sheet the figure no longer matches when re-measured; readings that answer
confidently on inputs they should refuse; quadratic or per-pixel-allocating hot paths (measure
on the corpus, compare against neighbouring passes); assumptions of a flat key colour or of
alpha (the corpus is colour type 2 with a noisy magenta key); logic correct on `armour.png`
but wrong on the other seven sheets — run candidates across all eight via
`tests/sheetCorpus.ts`.

**Method:** scratch tests through the real functions on the real corpus; timings with
`performance.now()`; re-measure any doubted calibration figure the way the memory note
"Calibrating quantiser changes against the reference sheet" describes.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-plan.md in full. You are running **Phase 3 —
Quantiser pipeline: geometry** of the codebase audit. Follow the plan's ground
rules, verification standard, issue-filing protocol and phase-completion
checklist exactly: audit only Phase 3's scope, prove every finding before
filing it, file one GitHub issue per confirmed root cause with a reconciled
label set and the attribution trailer, fix nothing, then update the plan's
phase log in a worktree and land it. Finish by printing the Phase 4 session
prompt from the plan in a raw fenced markdown block.
````

## Phase 4 — Quantiser pipeline: colour and auto-tune

**Scope:** the colour half of `src/utils/`: `oklab.ts`, `oklabPlanes.ts`, `colorReduction.ts`,
`applyPalette.ts`, `wuQuantiser.ts`, `wuBoxSearch.ts`, `wuMoments.ts`, `mergeColors.ts`,
`mixingPlan.ts`, `blendHistogram.ts`, `coverageBlend.ts`, `kCentroidVote.ts`,
`inkWeightedVote.ts`, `lineVote.ts`, `channelDepth.ts`, `channelLevels.ts`,
`keyBackground.ts`, `keyDistance.ts`, `keyingInForce.ts`, `borderKeyShare.ts`,
`antiAlias.ts`, `hardenSilhouette.ts`, `outlineExpansion.ts`, `outlinePolarity.ts`,
`despeckle.ts`, `ditherImage.ts`, `ditherMatrix.ts`, `bayerMatrix.ts`, `voidAndCluster.ts`,
`differenceMap.ts`, `heatmapImage.ts`, `ssim.ts`, `onionSkin.ts`, `pixelDistance.ts`,
`quantiseImage.ts`, `quantiseSettings.ts`, `quantisedSheetCapture.ts`, `identityPalette.ts`,
`lockedPalette.ts`, `swatchImage.ts`, and the auto-tune set: `autoTune.ts`, `tuneScore.ts`,
`tuneStage.ts`, `tuneStages.ts`, `tuneAliasStages.ts`, `tuneCellStages.ts`,
`tuneCandidate.ts`, `dialHistory.ts`; constants `autoTune.ts`, `quantiseDials.ts`,
`quantisePresets.ts`, `differenceRamp.ts`, `antiAlias.ts`.

**Look for:** colour-space maths that disagrees with the reference formulae (check OKLab
round-trips and gamut handling numerically); palette reduction producing out-of-palette pixels
or losing locked entries; dither matrices that do not normalise; keying tolerance behaviour at
the corpus's measured key spread (`#db02d9`–`#f723fa`); SSIM or difference-map values outside
their documented range; auto-tune scoring that can prefer a strictly worse candidate; sweep
stages that skip dial combinations their docs claim to cover; hot-path performance (the sweep
is seconds — find the dominant cost and any avoidable copy of the sheet); mirrored token
triples in `differenceRamp.ts`/`spriteMarker.ts` drifting from `index.css`.

**Method:** as Phase 3 — scratch tests on the real corpus, numeric checks against published
formulae, timings.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-plan.md in full. You are running **Phase 4 —
Quantiser pipeline: colour and auto-tune** of the codebase audit. Follow the
plan's ground rules, verification standard, issue-filing protocol and
phase-completion checklist exactly: audit only Phase 4's scope, prove every
finding before filing it, file one GitHub issue per confirmed root cause with
a reconciled label set and the attribution trailer, fix nothing, then update
the plan's phase log in a worktree and land it. Finish by printing the Phase 5
session prompt from the plan in a raw fenced markdown block.
````

## Phase 5 — Encoders, file formats and atlas maths

**Scope:** `src/utils/encodePng.ts`, `pngChunk.ts`, `pngFilter.ts`, `pngPalette.ts`,
`deflate.ts`, `crc32.ts`, `byteWriter.ts`, `encodeAseprite.ts`, `aseHeader.ts`, `aseChunk.ts`,
`aseCel.ts`, `aseLayer.ts`, `asePalette.ts`, `aseTags.ts`, `encodeSpritePack.ts`,
`zipArchive.ts`, `writePalette.ts`, `writeSheet.ts`, `spriteManifest.ts`,
`packImportSummary.ts`, `quantisePresetPack.ts`, `fileStem.ts`, `paletteFileName.ts`,
`promptFileName.ts`, `atlasCalculator.ts`, `atlasBudget.ts`, `atlasFit.ts`,
`componentTargetSize.ts`, `proxyCrops.ts`, `firstOfEachId.ts`, `sheetCoverage.ts`;
constants `aseprite.ts`, `atlas.ts`, `paletteExport.ts` (writer side), `sheetFormats.ts`.

**Look for:** emitted bytes that violate the format's specification — verify PNG output
against the PNG spec (CRC, filter choice, IHDR consistency), `.aseprite` output against the
published `.ase` file-format spec, and zip output against APPNOTE (open each in a real
consumer where possible: an image viewer, Aseprite if available, an unzip tool); deflate
correctness on incompressible and empty inputs; palette-file formats against their consumers'
documented grammars; atlas maths whose fits are wrong at power-of-two boundaries or whose VRAM
figures misstate the formats they name; filenames that collide or carry characters a filesystem
rejects; manifest JSON that does not parse or disagrees with the sheet it describes.

**Method:** scratch tests writing real files to the scratchpad and re-reading them with an
independent decoder; external tools to open the outputs; spec citations in every format issue.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-plan.md in full. You are running **Phase 5 —
Encoders, file formats and atlas maths** of the codebase audit. Follow the
plan's ground rules, verification standard, issue-filing protocol and
phase-completion checklist exactly: audit only Phase 5's scope, prove every
finding before filing it, file one GitHub issue per confirmed root cause with
a reconciled label set and the attribution trailer, fix nothing, then update
the plan's phase log in a worktree and land it. Finish by printing the Phase 6
session prompt from the plan in a raw fenced markdown block.
````

## Phase 6 — Stores, persistence and workers

**Scope:** all of `src/stores/`, `src/db/`, `src/workers/`; the store-facing utils
`studioHistory.ts`, `dialHistory.ts` (store side); `src/types/` entries these consume.

**Look for:** store actions that leave state inconsistent when a step throws mid-way; parsers
in `src/db/` that accept a shape the type forbids or silently coerce instead of falling to the
default (robustness against corrupt storage is specified; a compatibility arm for an old shape
is banned — both directions are findings); the localStorage fallback diverging from the SQLite
path in behaviour (both modes must work — exercise both); history eviction boundary behaviour;
worker lifetime defects: a per-press thread not *ended* by whatever disowns it, a missing
`abandonSweep`-style pair, a correlation id that discards answers but leaves the thread
running, replies filed after release; message-protocol shapes the two ends disagree on;
transferable buffers copied where they should transfer (measure); a "running" flag that
survives navigation wrongly; store subscriptions in stores themselves creating update cycles.

**Method:** scratch tests through the real stores and parsers; both persistence modes driven
in the browser (the `verify` skill covers OPFS versus fallback); worker lifecycle traced by
reading both ends of each wire and, where doubted, instrumented in a driven session.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-plan.md in full. You are running **Phase 6 — Stores,
persistence and workers** of the codebase audit. Follow the plan's ground
rules, verification standard, issue-filing protocol and phase-completion
checklist exactly: audit only Phase 6's scope, prove every finding before
filing it, file one GitHub issue per confirmed root cause with a reconciled
label set and the attribution trailer, fix nothing, then update the plan's
phase log in a worktree and land it. Finish by printing the Phase 7 session
prompt from the plan in a raw fenced markdown block.
````

## Phase 7 — UI: primitives, chrome, modals and tabs

**Scope:** `src/components/common/`, `src/components/layout/`, `src/components/modals/`,
`src/components/tabs/`; the interaction hooks they use: `useAnchoredSurface.ts`,
`useTooltipReveal.ts`, `useComboBox.ts`, `useClipboard.ts`, `useCopyPrompt.ts`,
`useShowToast.ts`, `useUndoShortcut.ts`, `useAdoptedStyles.ts`, `useDetachedWindow.ts`,
`useDownload.ts`, `useFileSave.ts`, `useFileDropTarget.ts`.

**Look for:** accessibility defects the linter cannot see: focus loss on unmount, focus traps
that leak, `aria-activedescendant` pointing at a stale id, live regions that fail to announce,
Escape-latch and outside-press behaviour diverging between the two tooltip triggers, keyboard
paths through `ComboBox` (arrow, Escape, Enter, type-ahead) that desync from the visible
state; a control shipped without guidance and without a recorded exemption; token violations —
a raw value, an ad-hoc palette class, an unlisted duration rung, an ink tone on a solid role
fill — in shapes the token tests' two sweeps cannot see (conditional class assembly, values
built at runtime); a class name that emits no CSS (build and grep `dist/`); missing effect
cleanup (listeners, timers, observers — Strict Mode double-invoke finds these); popover-API
misuse the no-throw semantics hide; wholesale store subscriptions re-rendering the chrome on
unrelated edits (count renders).

**Method:** reading plus a driven browser session with the keyboard, a screen reader where a
claim needs it, and render-count probes; `npm run build` plus grep for utility-emission
checks.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-plan.md in full. You are running **Phase 7 — UI:
primitives, chrome, modals and tabs** of the codebase audit. Follow the plan's
ground rules, verification standard, issue-filing protocol and
phase-completion checklist exactly: audit only Phase 7's scope, prove every
finding before filing it, file one GitHub issue per confirmed root cause with
a reconciled label set and the attribution trailer, fix nothing, then update
the plan's phase log in a worktree and land it. Finish by printing the Phase 8
session prompt from the plan in a raw fenced markdown block.
````

## Phase 8 — UI: studio and quantise views

**Scope:** `src/components/studio/`, `src/components/quantise/`; the hooks that serve them:
`useQuantiseWork.ts`, `useImageFile.ts`, `useImageDownload.ts`, `useImagePaste.ts`,
`useDragPan.ts`, `useLinkedPanes.ts`, `useCopiedSheets.ts`, `useIdentityPaletteCapture.ts`,
`useSheetIdentity.ts`, `usePaletteDownload.ts`.

**Look for:** everything Phase 7 looks for, in these two directories, plus: selector
discipline (an atomic-selector violation in a form that re-renders the whole studio per
keystroke — measure it); canvas work on the main thread that belongs on the worker, or redraws
triggered by state that did not change the pixels; container-query versus viewport-breakpoint
misuse inside split columns; the column-width budgets holding for any select or row control the
derivation tests do not price; drag, pan, paste and drop paths at their edges (zero-size
images, a paste that is not an image, a drag leaving the window); linked-pane
synchronisation drift; stale-closure defects in the image hooks.

**Method:** as Phase 7 — driven sessions (the memory note "Driving the studio with Playwright"
records the locator traps), render counts, timings on real sheets from `test_sprites/`.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-plan.md in full. You are running **Phase 8 — UI:
studio and quantise views** of the codebase audit. Follow the plan's ground
rules, verification standard, issue-filing protocol and phase-completion
checklist exactly: audit only Phase 8's scope, prove every finding before
filing it, file one GitHub issue per confirmed root cause with a reconciled
label set and the attribution trailer, fix nothing, then update the plan's
phase log in a worktree and land it. Finish by printing the Phase 9 session
prompt from the plan in a raw fenced markdown block.
````

## Phase 9 — Shell, PWA, tooling and types

**Scope:** `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/sw.ts`,
`src/utils/isolationHeaders.ts`, `public/` (including `coi-bootstrap.js`), `index.html`,
`vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `prettier.config.js`,
`package.json` and `package-lock.json`, `scripts/`, `Run.bat`, `Run.ps1`, `AGENTS.md`,
`.gitignore`, any GitHub Actions workflows, all of `src/types/`, and `repro.log` (decide
whether it belongs in the repository at all).

**Look for:** service-worker defects: precache manifest gaps against what the app actually
requests offline (drive an offline session), stale-cache behaviour across a deploy, the
same-origin gate on injected headers, update flow after a new deploy; the first-visit reload
behaving as documented; token-layer defects in `index.css` itself — the reduced-motion
catch-all pair diverging in a way the comparison test cannot see, tokens defined but emitted
nowhere, contrast claims re-measured; dependency hygiene (unused, duplicated or unpinned
dependencies; licence fields); tool-exclusion integrity for `.claude/worktrees/` across every
root-walking tool, including any added since the table in CLAUDE.md; tsconfig strictness gaps;
types in `src/types/` that are wider than the values they describe (a union member nothing
produces, an optional field that is always present); build output anomalies (bundle size by
chunk, assets shipped twice); secrets and personal data swept across the whole tree and
history-visible files.

**Method:** driven offline and update-flow sessions; `npm run build` inspection; config read
against each tool's documentation; a secrets sweep with targeted greps.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-plan.md in full. You are running **Phase 9 — Shell,
PWA, tooling and types** of the codebase audit. Follow the plan's ground
rules, verification standard, issue-filing protocol and phase-completion
checklist exactly: audit only Phase 9's scope, prove every finding before
filing it, file one GitHub issue per confirmed root cause with a reconciled
label set and the attribution trailer, fix nothing, then update the plan's
phase log in a worktree and land it. Finish by printing the Phase 10 session
prompt from the plan in a raw fenced markdown block.
````

## Phase 10 — Test suite and documentation

**Scope:** `tests/`, `src/test/`, every colocated `*.test.ts(x)` (as tests — their subjects
were audited in Phases 1–9), `docs/` including `docs/todo/` and `docs/todo/done/`,
`README.md`, `CLAUDE.md`, `LICENSE`, code comments as documentation.

**Look for:** unfalsifiable tests — prove a sample of high-value guards against mutated code:
temporarily break the invariant the test claims to hold and confirm the test fails (revert
immediately; commit nothing); assertions that read a re-implementation instead of the real
subject; suites whose file-discovery misses a directory added since (the hand-kept walks the
tooltip suite documents are the known shape — look for others); meaningful behaviour with no
test at all where CLAUDE.md says correctness lives in tests; fixtures that no longer match
what the app writes; documentation that misdescribes the code as it now stands — every
CLAUDE.md factual claim (counts, line numbers, named files, measured figures) spot-checked,
README accuracy, spec status banners truthful against what has actually shipped, `done/`
plans that are not in fact complete; stale comments that assert retired behaviour.

**Method:** mutation spot-checks in a worktree with immediate reverts; doc claims verified
against the tree with greps and re-measurement.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-plan.md in full. You are running **Phase 10 — Test
suite and documentation** of the codebase audit. Follow the plan's ground
rules, verification standard, issue-filing protocol and phase-completion
checklist exactly: audit only Phase 10's scope, prove every finding before
filing it, file one GitHub issue per confirmed root cause with a reconciled
label set and the attribution trailer, fix nothing, then update the plan's
phase log in a worktree and land it. Finish by printing the wrap-up session
prompt from the plan in a raw fenced markdown block.
````

## Wrap-up

**Scope:** the audit itself — no new source auditing.

**Do, in order:**

1. Read the whole phase log. Chase every `partial` row and every Notes entry that names an
   unproven suspicion or an out-of-scope observation: verify or discard each, filing issues
   for the ones that prove out, per the standard protocol.
2. Sweep the filed issues as a set: dedupe across phases, cross-link related root causes,
   confirm every label set is still true, and confirm no issue describes something a later
   phase showed to be deliberate.
3. Update this document a final time: complete the log, change the status banner to
   `✅ COMPLETE` with a one-line summary of what the audit filed, and move the file to
   `docs/todo/done/` in the same change, per the repository's plan-document rules.
4. Land that change, then report to the user: how many issues, by type and area, with the
   numbers of any `priority: high` or above.

**Session prompt:**

````markdown
Work in p:\Source\TypeScript\SpriteGubbins. Read CLAUDE.md in full, then read
docs/todo/codebase-audit-plan.md in full. You are running the **Wrap-up**
phase of the codebase audit. Follow the wrap-up section's four steps exactly:
resolve every partial row and logged suspicion, reconcile the filed issues as
a set, mark the plan ✅ COMPLETE and move it to docs/todo/done/, land that
change from a worktree, and report the audit's totals to the user.
````
