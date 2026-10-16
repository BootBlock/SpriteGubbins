import type { CellLattice } from './cellLattice.ts';

/**
 * The fixed cell a sprite may be cut into, and where its artwork stands inside that cell.
 *
 * **The third option between trimming and the bounding box.** A pack cut at the boxes the
 * segmentation found gives one file per sprite at whatever size that sprite's own artwork happened
 * to reach — fifteen pieces off one rig sheet came out at fifteen different sizes — and a rig
 * importer cannot take that. An importer of cut-out pieces declares a slot size per piece and
 * refuses artwork that does not match it, and it places each piece by the **joint** it turns on
 * rather than by the middle of its own pixels. A forearm cropped tight to itself and centred in its
 * cell swings from the middle of itself, and the elbow comes apart in the walk.
 *
 * So a cell is two statements and not one: **how big** every piece is, and **where in that piece**
 * the artwork sits. Neither is derivable from the artwork, which is why the reader states both.
 *
 * **Stated in the sheet's own drawn pixels**, as every other measurement the reader gives this tab
 * is — the download's magnification multiplies the cell in `manifestCell`, beside the `scaleBoxes`
 * call in `buildManifest` that multiplies the boxes, and the pack cuts every sprite's file at the
 * cell that manifest states, so the file and the manifest cannot end up describing one cut at two
 * coordinates.
 *
 * **A third statement says how the artwork meets the cell**, {@link SpriteFit}. Its default resamples
 * nothing: a sprite larger than the cell is a sheet that came back at a coarser scale than the prompt
 * asked for, and the honest answer is to refuse and say so — see `oversizedSprites`, which both the
 * panel and the writer read. The other two exist for painted sheets, which have no pixel scale to
 * honour and are drawn far larger than the files a game wants: a painted 4 × 4 icon sheet draws each
 * tile at 230 to 380 pixels, and an action bar takes 128.
 */

/**
 * Where the cell's size comes from.
 *
 * `BOX` is the cut this tab has always made and the position the control opens in: each sprite keeps
 * the bounding box the preview ringed. The other two are one quantity from two sources — the studio
 * already states a component size in `spriteTargetSize`, and a reader whose importer wants a slot
 * size of its own types one.
 */
export const SPRITE_CELL_SOURCES = ['BOX', 'TARGET', 'FIXED'] as const;

export type SpriteCellSource = (typeof SPRITE_CELL_SOURCES)[number];

/** Where the artwork sits across the cell. */
export const CELL_ANCHORS_X = ['LEFT', 'CENTRE', 'RIGHT'] as const;

/** Where the artwork sits down the cell. */
export const CELL_ANCHORS_Y = ['TOP', 'MIDDLE', 'BOTTOM'] as const;

export type CellAnchorX = (typeof CELL_ANCHORS_X)[number];

export type CellAnchorY = (typeof CELL_ANCHORS_Y)[number];

/**
 * The corner, edge or centre the artwork is registered against.
 *
 * Two independent axes rather than nine named positions, because that is what the quantity is: a
 * forearm wants its elbow end, which is one edge across and one edge down, and a head wants its
 * neck. Nine pills in a row would also be nine ways to say the same three-by-three, offered as a
 * list nobody could scan.
 */
export interface SpriteAnchor {
  readonly x: CellAnchorX;
  readonly y: CellAnchorY;
}

/**
 * How a sprite's artwork meets its cell.
 *
 * - `REFUSE` places the artwork at its own size and refuses a sprite larger than the cell. The
 *   default, and the only fit a sheet with a pixel scale above 1 takes: resizing pixel art blends
 *   the pixels the lattice reading exists to keep apart. See `resolveSpriteCell`.
 * - `SCALE_SET` resizes every sprite of the sheet by **one** factor, so a set of isolated marks keeps
 *   the sizes its icons have relative to each other. The factor maps the sheet's measured grid pitch
 *   onto the cell — see `evenScale` — so a mark filling seven tenths of its step of the grid fills
 *   seven tenths of the cell.
 * - `FILL_SQUARE` crops each sprite to the square at the centre of its own box and resizes that square
 *   to fill the cell, for full-bleed tiles, whose every file must be the whole cell edge to edge
 *   whatever size the generator drew each tile at.
 * - `IN_PLACE` keeps each piece where it was drawn in its cell of a placement sheet
 *   (`SheetPlan.placement`): the square it was placed against is laid on the cell, centred, so a corner
 *   badge lands in that square's corner, which is the file's corner on a square cell. One factor maps
 *   the square onto the cell's shorter side, and it is 1 on a sheet with a pixel scale (`squareInFile`). The only fit a placement sheet takes, and one no other sheet offers; see
 *   `resolveSpriteCell`.
 *
 * **The reader states it rather than the app reading it off the artwork**, which is the call this
 * file makes about the size and the anchor. A full-bleed tile and a dense isolated mark can have the
 * same box and the same fill, and guessing wrong either crops a mark or shrinks every tile by a
 * different amount. Both resizing fits resample by area (`resampleArea`).
 */
export const SPRITE_FITS = ['REFUSE', 'SCALE_SET', 'FILL_SQUARE', 'IN_PLACE'] as const;

export type SpriteFit = (typeof SPRITE_FITS)[number];

/** What the reader set: which source sizes the cell, the size they typed, the anchor and the fit. */
export interface SpriteCellChoice {
  readonly source: SpriteCellSource;
  /**
   * The size typed into the two boxes, in drawn pixels.
   *
   * Kept while `FIXED` is not the source, rather than cleared, so that stepping through the pills to
   * look at what the studio states and back does not empty the boxes the reader had filled in.
   */
  readonly fixed: { readonly width: number; readonly height: number };
  readonly anchor: SpriteAnchor;
  readonly fit: SpriteFit;
}

/**
 * The cell a cut actually uses, or `null` where each sprite keeps its bounding box.
 *
 * `resolveSpriteCell` is what turns a {@link SpriteCellChoice} into one of these, and it is the only
 * place `TARGET` degrades to `null` — the studio may state no size, which is a configuration this
 * tab has to honour rather than guess around.
 */
export interface SpriteCell {
  readonly width: number;
  readonly height: number;
  readonly anchor: SpriteAnchor;
  /** The fit in force, which is `REFUSE` wherever the sheet has a pixel scale — see `resolveSpriteCell`. */
  readonly fit: SpriteFit;
  /**
   * The step of the grid the studio's sheet states, in the sheet's pixels each way, or `null` where it
   * states none — read by `SCALE_SET` only on an axis its sprites give no step to measure.
   *
   * An icon sheet states one cell, 1/4 of its width each way, however few icons it holds
   * (`SheetPlan.cellGrid`, audit finding T5). A sheet of one icon has no step between sprites to
   * measure, so without this its one icon was resized to fill the cell edge to edge, where the same
   * icon on a sheet of nine kept the margin its cell gave it.
   */
  readonly statedStep: SheetStep | null;
  /**
   * The cells of a placement sheet, read from the gaps between its pieces, or `null` off one — read by
   * `IN_PLACE`, which places each piece against its cell's square (`cellLattice`). Plain data, so the
   * cell crosses to `sheetWriteWorker` as it is.
   */
  readonly lattice: CellLattice | null;
  /**
   * Whether the artwork may be resampled into the cell: `false` on a sheet read at a pixel scale above 1
   * (`resizingFitAllowed`), where `IN_PLACE` places each piece at its drawn size, its square centred in
   * the cell rather than scaled onto it (`squareInFile`). The other fits answer the same question by which fit is in force.
   */
  readonly resamples: boolean;
}

/** A grid step in a sheet's own pixels, across and down. */
export interface SheetStep {
  readonly x: number;
  readonly y: number;
}

/** A rectangle of the sheet, in its own pixels. */
export interface SheetRegion {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * How one sprite becomes its cell: the region of the sheet cut for it, and where that region lands
 * in the cell and at what size. Under `IN_PLACE` it may reach past the cell's edge, and past its tile
 * square, by up to `PLACE_OVERSHOOT` of that square, and the part past the edge is clipped (`placeInCell`).
 *
 * Under `REFUSE` the region is the sprite's own bounding box and its size in the cell is the box's,
 * so the placement is a displacement and nothing more. Under `SCALE_SET` the region is still the box
 * and the size is the box times the sheet's one factor; under `FILL_SQUARE` the region is the box's
 * centred square and the size is the cell's shorter side. `cellPlacements` computes it at 1:1, and
 * every field is multiplied by the download's magnification together, so the 1× file and the 4× file
 * are one placement.
 */
export interface SpritePlacement {
  readonly source: SheetRegion;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
