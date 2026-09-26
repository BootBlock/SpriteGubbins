# A mesh that adapts where the sheet does — research and record

> **Status:** ✅ COMPLETE — shipped: per-sprite mesh patches from grid 3 up, and a capture window
> held under half a cell, which changes the walk at grid 2 only.

Written against [issue #482](https://github.com/BootBlock/SpriteGubbins/issues/482). The mesh was
measured once for the whole sheet: one list of column cuts and one list of row cuts. Generated
sheets are resampled per sprite, so the sprites on one sheet sit at different phases, and a single
list of cuts can only agree with some of them. This document records what was measured, which of
the issue's three proposals survived, and the design built from the one that did.

## 1. How it was measured

Two scores, both on the keyed source (`keyBackground` at the default tolerance), both over the same
pixels for every variant. `tests/meshFit.ts` defines both.

- **Corpus proxy.** The mean within-cell L1 deviation of the eight sheets in `test_sprites/`: each
  opaque pixel's distance from the mean of its own cell. A cell that straddles a boundary of the art
  holds two colours and scores high, so lower is better. The proxy favours smaller cells, so every
  row states the cell count, and a variant that wins only by cutting more cells is not a win.
- **Synthetic truth.** `src/test/phasedSpriteSheet.ts`: a 5 × 5 layout of 120-pixel slots, three
  seeds per case. Each sprite is random pixel art drawn at its own pitch and phase on a magenta
  field, softened with a 3-tap blur, given ±6 of noise and keyed. The score is the share of truly
  opaque pixels whose cell mean lies within 60 (L1) of the colour the art was drawn with, so higher
  is better.

The research in §2.1 and §2.2 used a scratch harness with its own generator, which is not
committed. Every figure in §2.3 and §3 comes from the committed helpers, and
`tests/quantiser-figures-mesh-patches.test.ts` pins the ones the code's docblocks state.

## 2. What each proposal did

### 2.1 A proportional capture window and a strength gate

A window of 0.35 × grid, with or without pixel-snapper's two-pixel minimum, and a gate that drops
lines below half the median line mass: every variant stayed within 1% of the current walk on the
corpus. The two-pixel minimum made grid 2 degenerate, because a window as wide as the pitch
captures every line. **Not built.**

What the sweep did show is that the window was wrong at one grid. `max(1, ⌊g/3⌋)` is 1 at a grid of
2, which is half a cell: a line one pixel from where the walk expected a boundary is one pixel from
the *next* boundary too, so a capture cannot tell which cell it belongs to, and each one can re-phase
every cut after it. Held below half a cell (`⌊g/3⌋`, which is 0 at grid 2 and unchanged at every
other grid), the keyed corpus at grid 2 scores what a plain lattice scores:

| Sheet at grid 2 (keyed) | Before | After | Cells, before → after |
| --- | --- | --- | --- |
| `cyborg_healer.png` | 47.85 | 44.26 | 120,984 → 125,000 |
| `vehicles_and_props.png` | 42.50 | 41.58 | 98,913 → 102,089 |
| `character_space_marine_blue.png` | 31.86 | 31.18 | 176,255 → 184,920 |
| `armour.png` | 35.59 | 34.80 | 126,408 → 131,375 |

The counts rise because the old window let cells run 3 wide at grid 2, which is the defect. Unkeyed,
the same four sheets move by −1.39, +0.01, −0.18 and −0.51. **Built.**

### 2.2 A fractional pitch

The walk stepped by a pitch estimated from the lines (the median spacing near the grid). On a
synthetic pitch-5.5 sheet at grid 6 it helped (46.5% → 51.4%), and nowhere else. On the corpus it
lowered the proxy only by cutting more cells: `armour.png` at grid 6 went from 15,414 cells to
22,411, and `cyborg_black_red.png` at grid 4 from 33,509 to 44,149, because the estimate settled on
the wrong pitch. It also changes what the grid means, since the result is no longer a reduction at
the scale the reader chose. **Not built.**

### 2.3 A mesh per sprite

Measured first with a free cell count per sprite (each sprite cropped and walked on its own), the
proxy fell on 11 of 12 corpus cases, and the synthetic score rose by 7 to 24 points wherever the
sprites had their own phases. A free count per sprite changes the size of the result and how its
cells line up with every other pass, so the design in §3 keeps the count and moves only the cuts.
As shipped (keyed corpus, each sheet's own cuts against the same cuts with patches):

| Sheet, grid | Own cuts | Patched | Fall | Cells, own → patched |
| --- | --- | --- | --- | --- |
| `armour.png`, 3 | 48.64 | 45.22 | 7.0% | 59,139 → 59,051 |
| `ui_elements1.png`, 4 | 43.46 | 36.44 | 16.2% | 26,387 → 25,984 |
| `three-quarter-view_tiles1.png`, 4 | 32.50 | 27.55 | 15.2% | 34,992 → 34,533 |
| `cyborg_black_red.png`, 4 | 34.40 | 31.58 | 8.2% | 33,509 → 33,369 |
| `ui_elements1.png`, 5 | 51.64 | 42.45 | 17.8% | 17,185 → 16,885 |
| `armour.png`, 6 | 75.44 | 73.98 | 1.9% | 15,414 → 15,384 |
| `cyborg_monk.png`, 6 | 98.32 | 96.65 | 1.7% | 13,188 → 13,178 |
| `cyborg_healer.png`, 8 | 117.94 | 116.67 | 1.1% | 9,238 → 9,260 |

| Synthetic case | Own cuts | Patched |
| --- | --- | --- |
| Pitch 3, phase per sprite | 52.0% | 62.1% |
| Pitch 4 ± 4%, phase per sprite | 58.5% | 73.3% |
| Pitch 5 ± 4%, phase per sprite | 56.3% | 77.5% |
| Pitch 6, phase per sprite | 57.6% | 84.6% |
| Pitch 8 ± 4%, phase per sprite | 55.4% | 87.9% |
| Pitch 6, one phase for the sheet | 78.0% | 88.2% |
| Pitch 4, one phase for the sheet | 80.2% | 81.5% |
| Pitch 3, one phase for the sheet | 48.1% | 61.0% |
| Pitch 5.5 at grid 6 | 50.2% | 70.2% |
| Pitch 2, phase per sprite (patches forced on) | 47.6% | 37.7% |

**Built from grid 3 up.** At grid 2 a 3-tap softening spreads every boundary evenly over both
phase classes, so a sprite's phase is noise, and forcing patches on there cost ten points. None of
the corpus sheets is drawn at 2 pixels a cell, so the corpus cannot speak for that grid.

The scratch harness's generator (a different random sequence and a wobbled disc outline) showed
losses of about two points where a whole sheet really is one lattice at pitch 3 or 4. The committed
generator shows gains there. The difference is recorded rather than resolved: on art that truly
shares one small lattice, the local snap can cost a little.

Meshing per fixed 256-pixel tile instead of per sprite (scratch harness) was worse than the whole-
sheet walk on five of eleven corpus cases and better by 3.4% at most: a tile cuts across sprites,
and it is still two phases in one mesh.

## 3. The design as shipped

**The sheet's own cuts stay, and they fix the size of the result.** `boundaryMesh` walks them as it
did (with the grid-2 window corrected), and the result is still one pixel per cell of `x` and `y`,
so nothing that reads the result's size or the comparison pane's placement changed.

**A patch re-cuts the cells over one sprite, keeping their number** (`meshPatches`). On a sheet
with transparency that is not exactly a grid, at grid 3 or more, `patchSpans` takes every opaque
piece's box, widens it out to the mesh's cuts, merges boxes that share a cell, and grows each by one
cell of margin (`PATCH_MARGIN_CELLS`). Two margins that meet split the gap between them rather than
merge: merging made every sprite on a closely packed sheet share one patch. Margins of 0, 1, 2 and
3 cells sum to 472.5, 470.5, 473.5 and 477.5 over the eight corpus pairs above. Each patch keeps
its outer edges on the mesh's cuts, so the patches and the other cells still partition the sheet.
Inside it, on each axis, `patchAxis`:

1. **Shifts.** The patch's own step profile is read against the cuts it covers: every position
   votes, by its evidence, for its offset from the nearest cut, and the circular mean of those
   offsets is the sprite's own phase. Every interior cut moves by that amount. The two edge cells
   take up the difference, and may shrink to half a cell (or not at all, where the mesh's end cell
   was already narrower).
2. **Snaps.** Each interior cut then moves to the nearest detected line of the patch within the
   walk's window, where both cells beside it stay within `grid ± window`. This follows drift inside
   a sprite without letting any cut leave its neighbours' spacing.

A regular lattice inside each patch, in place of the walked cuts, was tried and gave no consistent
gain. Edge cells held to `grid − window` (the first version) held every shift to the window, so a
sprite half a cell out of phase could not be reached, and at grid 2 no shift was possible at all;
they may now shrink to half a cell.

**Every pass that reads cells walks one iterator.** `alignToGrid`, `downscaleNearest`,
`upscaleOverMesh`, `differenceMap`, `inkWeightedCells` and `kCentroidCells` visit the cells through
`forEachMeshCell`, which yields each result cell's source rectangle once, taking a patch's where a
patch covers the cell and the mesh's own everywhere else.

**What does not change.** A sheet exactly drawn on the grid takes its lattice and no patches. An
opaque sheet (keying off, or no transparency) has nothing to segment and takes the walked cuts
alone, so an unkeyed sheet at grid 3 or more reduces exactly as it did. A sheet that breaks into
more pieces than `SCATTERED_SPRITE_CEILING` takes no patches. `leadingCellShift` reads the sheet's
own cuts, so the comparison pane places a patched sprite within half a cell of its own phase.
