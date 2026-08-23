import type { CellAnchorX, CellAnchorY, SpriteCellChoice, SpriteCellSource } from '../types/spriteCell.ts';

/**
 * What the cell controls read, and where they open.
 *
 * Filed beside the tab's other user-facing copy in spirit, and here rather than in
 * `constants/quantiser.ts` for the reason `sheetFormats.ts` is its own file: the labels and the
 * default are keyed by the unions in `types/spriteCell.ts`, so a fourth source or a fourth anchor
 * fails to compile until it has been given a word a reader can act on. The guidance behind each
 * control sits with the tab's other settings in `QUANTISE_TOOLTIPS`.
 */

/** The reader's word for each source — the pill, not the identifier. */
export const SPRITE_CELL_SOURCE_LABELS: Readonly<Record<SpriteCellSource, string>> = {
  BOX: 'Bounding box',
  TARGET: 'Studio target',
  FIXED: 'Fixed',
};

export const CELL_ANCHOR_X_LABELS: Readonly<Record<CellAnchorX, string>> = {
  LEFT: 'Left',
  CENTRE: 'Centre',
  RIGHT: 'Right',
};

export const CELL_ANCHOR_Y_LABELS: Readonly<Record<CellAnchorY, string>> = {
  TOP: 'Top',
  MIDDLE: 'Middle',
  BOTTOM: 'Bottom',
};

/**
 * How large a cell side may be, in drawn pixels.
 *
 * The floor is 1 because a cell is a real size and 0 describes nothing. The ceiling is 512 because
 * this is a **component** size rather than a sheet size — the studio states one per piece, and the
 * largest thing anyone assembles a character from is a torso a couple of hundred pixels tall — while
 * a cell past it would be a cut whose every sprite is mostly padding. A sheet that genuinely wants
 * larger pieces wants the bounding box, which is the position beside it.
 */
export const SPRITE_CELL_SIDE_RANGE = { min: 1, max: 512, step: 1 } as const;

/**
 * The cut the download opens with: each sprite at its own bounding box.
 *
 * **The behaviour this tab has always had**, kept as the default because it is the honest answer for
 * a reader who has not said what their importer wants — a cell is a claim about a pipeline, and
 * guessing one would silently pad every sprite in a pack somebody meant to slice by hand.
 *
 * The size the two boxes open at is the smallest a cell may be rather than a suggestion: any figure
 * here would be a slot size invented for a rig this app has never seen, and one drawn pixel is
 * plainly a number to replace rather than one to accept. The anchor opens at bottom-centre, which is
 * the convention `ManifestSprite.pivot` already defaults to and the one a ground-standing sprite is
 * placed by.
 */
export const DEFAULT_SPRITE_CELL_CHOICE: SpriteCellChoice = {
  source: 'BOX',
  fixed: { width: SPRITE_CELL_SIDE_RANGE.min, height: SPRITE_CELL_SIDE_RANGE.min },
  anchor: { x: 'CENTRE', y: 'BOTTOM' },
};
