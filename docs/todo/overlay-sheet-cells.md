# Overlay sheet in cells — plan

> **Status:** 🟢 ACTIVE — the follow-up to the Icon / Symbol Set audit’s open question (U1): each overlay piece leaves the Quantise tab as one icon tile with the piece at its place on the icon.

## 1. The defect

An ICON set’s overlay sheet (`src/constants/sheetPlans/iconOverlaySheet.ts`) draws each piece “within a
square the size of one tile”, at the place it sits on the icon: a corner badge in its corner. The
square has no backdrop, so the Quantise tab cuts each piece to its own bounding box, and every cell
anchor centres it. A corner mark loses its corner. The audit’s phase 5 only changed the *Fit* card to
say “use Scale evenly, not Fill square, for the overlay sheet”.

The goal: each overlay piece leaves as a file the size of one icon tile (128 × 128 at the studio’s
target), with the piece at its place on the icon.

Band centres (`spriteBands`, `spritePitch`) cannot find this sheet’s cells, because the pieces sit off
centre on purpose. The cells are found from the empty gaps between the pieces.

## 2. Decisions

The maintainer chose the most correct option for each.

1. **More pieces than sixteen cells make a second overlay sheet**, cut evenly with `balancedChunks` as
   the icon sheets are. There is no cap. The series stays “icon sheets, then overlay sheets”.
2. **The tile size is stated and measured.** The prompt states the tile square as an exact share of
   the cell. The quantiser measures it from the full-tile pieces (veil, halo, ring, sweeps, glow),
   refuses with a reason where the measurement and the stated share disagree beyond a tolerance, and
   uses the stated share where the sheet has no full-tile piece.
3. **Pieces are named by cell index**, so an empty cell leaves its neighbours’ names intact.
4. **A real overlay sheet** generated from the new prompt goes into `test_sprites/` and
   `tests/sheetCorpus.ts`, and the lattice is pinned against it. Only the maintainer can generate one,
   so the work is built and tested against synthetic drift first.

## 3. Design

### The prompt

- The overlay plans declare `cellGrid: ICON_GRID_COLUMNS` and a `placement`: `WITHIN_TILE` under the
  full-bleed look, `WITHIN_CELL` under the isolated look. The overlay sheet takes the icon sheets’ grid
  and scale.
- The cell sentence and the grid sentence move out of `iconSheet.ts` into their own files. The overlay
  intro opens with the cell sentence and a placement sentence: one piece to a cell, four across, in
  reading order. Under `WITHIN_TILE` a piece is drawn within the tile square, centred in its cell at the
  stated share, and stands where it sits over the tile. Under `WITHIN_CELL` the reference square is the
  cell itself.
- The cell is described, never drawn: section 6 already forbids grid lines and frames.
- Each look’s placement sentence says the piece stands where it sits over the icon, inside its cell.
- `docs/todo/baseline-prompt-new.md` §2 states the overlay sheet’s grid and placement.

### Extra overlay pieces across overlay sheets

- The ICON series reads the subject’s *Extra Overlay Pieces*. The fixed library and the extras are one
  run of lines, cut by `balancedChunks` into overlay sheets of at most sixteen components.
- `SheetPlan.anatomy` becomes `'ELSEWHERE'` or the pieces a sheet draws (`{ pieces }`), so each overlay
  sheet names its own share. `anatomyFacingsFor` becomes `sheetAnatomyFor`, which answers the facings
  and the pieces together, and every reader of the anatomy (the count, the inventory, section 1, the
  slots and the field’s note) reads the sheet’s share through it.
- The roster summary, `describeSeries`, `outputForRoster` and the identity lock follow. A reader on an
  overlay sheet stays on the same overlay sheet across a roster change.
- `ICON_SERIES_LONGEST` goes. An ICON series has no longest length once the extras add sheets, so the
  stored sheet index is held to a whole number in the safe range, and `resolveSheetIndex` remains the
  validity check.

### The quantiser

- `src/utils/cellLattice.ts` (pure, new) reads the cells from the gaps between the segmentation boxes:
  the nominal step from the grid, the row boundaries at the empty run nearest each nominal boundary,
  then the column boundaries per row, the outer edges from the median measured step, and a reference
  square per cell. It fails, naming the boxes, where a box straddles a boundary, a window holds no gap,
  or the measured tile disagrees with the stated share. It never falls back to centring.
- `shapeSheet` takes the lattice: boxes in one cell join before the reader’s joins, pieces order by
  cell, and names follow the cell index.
- A new fit, `IN_PLACE` (“Keep place”), places each piece’s own box at its place on the reference square,
  scaled by one factor (1 on a sheet with a pixel scale). A piece that leaves its cell, or a failed
  lattice, is refused by name.
- The manifest states the piece’s own box, its placement, the fit `IN_PLACE`, and a pivot at the centre
  of the reference square (`TILE_CENTRE`).

### Types, data and controls

- `SheetPlanFields.placement?: 'WITHIN_CELL' | 'WITHIN_TILE'`, rejected without `cellGrid`.
- `useCellLattice` in `src/hooks/`; `DownloadControls` reads it.
- On a placement sheet the fit resolves to `IN_PLACE`; elsewhere a stored `IN_PLACE` resolves to
  `REFUSE`. `SpriteFitChoice` withholds the fits that do not apply, each with its reason.
- `SpriteCellControls` hides the anchors under `IN_PLACE`; the cell badge states the factor or the
  lattice failure.
- The *Fit* card drops the phase 5 stopgap and gains a *Keep place* bullet.

## 4. Order

1. Types and validation.
2. The plan, the prompt wording and the document’s §2.
3. The second overlay sheet.
4. `cellLattice`.
5. Piece grouping, order and names.
6. Placements, the manifest and the writer’s refusal.
7. Hooks, controls and copy.
8. The specification.
9. A browser check in Edge on both storage backends, then a review.
10. A real overlay sheet from the maintainer.

## 5. Progress

Nothing has landed yet.
