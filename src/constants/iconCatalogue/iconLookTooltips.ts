import { SPRITE_FIT_LABELS } from '../spriteCell.ts';
import { ICON_LOOK_LABELS } from './iconLookLabels.ts';

/**
 * Guidance for the look control in the studio's *Icons on this set* section — a control that holds a
 * value, so its card is a `Tooltip` beside the label.
 *
 * It says what each look changes in both places a reader meets it: the compiled prompt (the icon
 * sheets, the overlay sheet, the background item) and the files the Quantise tab cuts from the sheet,
 * which come out as opaque squares under one look and as marks on transparency under the other, and
 * the Quantise tab's fit that resizes each look's files to the set's target size. It names each look
 * and each fit by the label its pill shows, so a renamed label cannot leave the card describing a
 * pill that is not there.
 */
export const ICON_LOOK_TOOLTIPS = {
  look: `How every icon on this set is drawn. It changes the prompt for every sheet of the set, the overlay sheet included, and the files you cut from them.

- _${ICON_LOOK_LABELS.FULL_BLEED_TILE}_: each icon is a square painted edge to edge, its subject and its own backdrop together, with no frame, because your game’s interface draws one. The prompt keeps the background to the gutters between squares, and each file is an opaque square.
- _${ICON_LOOK_LABELS.ISOLATED_MARK}_: each icon is its subject alone on the background, and each file is that subject on transparency.

In the Quantise tab, the _${SPRITE_FIT_LABELS.FILL_SQUARE}_ fit brings squares to the size the studio targets, and _${SPRITE_FIT_LABELS.SCALE_SET}_ does the same for marks.

The overlay pieces are shaped to match. Each change is a step Undo can take back.`,
} as const;
