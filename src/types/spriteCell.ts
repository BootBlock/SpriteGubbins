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
 * is — the download's magnification multiplies the cell along with the boxes, in the one place
 * `scaleBoxes` already multiplies them, so the file and the manifest cannot end up describing one
 * cut at two coordinates.
 *
 * **Nothing here resamples.** A sprite larger than the cell is a sheet that came back at a coarser
 * scale than the prompt asked for, and the honest answer is to refuse and say so — see
 * `oversizedSprites`, which both the panel and the writer read.
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

/** What the reader set: which source sizes the cell, the size they typed, and the anchor. */
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
}
