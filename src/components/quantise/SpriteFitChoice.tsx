import { QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import {
  SPRITE_FIT_IN_PLACE_UNAVAILABLE,
  SPRITE_FIT_LABELS,
  SPRITE_FIT_PLACED_ONLY,
  SPRITE_FIT_UNAVAILABLE,
} from '../../constants/spriteCell.ts';
import { SPRITE_FITS } from '../../types/spriteCell.ts';
import type { SpriteFit } from '../../types/spriteCell.ts';
import { SegmentedChoice } from '../common/SegmentedChoice.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

interface SpriteFitChoiceProps {
  /** The fit in force, which `resolveSpriteCell` decides from the sheet as well as from what is stored. */
  readonly fit: SpriteFit;
  /** Whether the sheet may be resized at all, which is `resizingFitAllowed` of its scale. */
  readonly resizable: boolean;
  /** Whether the studio's sheet places one piece in each cell (`SheetPlan.placement`). */
  readonly placed: boolean;
  readonly onChange: (fit: SpriteFit) => void;
}

/**
 * How each sprite meets its cell: as drawn, resized by one factor for the sheet, cropped to its centred
 * square and resized to fill, or kept where it was drawn in its cell — see `SpriteFit`.
 *
 * Its own file because it is the one control in the cell panel with conditions of its own, and each
 * **keeps its pills on screen but unpressable**, with the reason under the row. On a placement sheet —
 * an icon set's overlay sheet — every fit but *Keep place* is withheld, because its pieces are drawn at
 * their place on the icon and any other fit would move them. Elsewhere *Keep place* is withheld, since
 * there are no cells to keep a piece in, and on a sheet read at a pixel scale above 1 so are the two
 * resizing fits, which are the one answer to "how do I get 128 px icons out of a painted sheet" and
 * which a reader working on pixel art would otherwise never learn exist. The pill shown pressed is the
 * fit in force, which is what the download will do. `SpriteCellControls` shows the row only where there
 * is a cell for the artwork to meet.
 */
export function SpriteFitChoice({ fit, resizable, placed, onChange }: SpriteFitChoiceProps) {
  const withheld = placed
    ? [{ values: SPRITE_FITS.filter((option) => option !== 'IN_PLACE'), reason: SPRITE_FIT_PLACED_ONLY }]
    : [
        ...(resizable
          ? []
          : [{ values: ['SCALE_SET', 'FILL_SQUARE'] as const, reason: SPRITE_FIT_UNAVAILABLE }]),
        { values: ['IN_PLACE'] as const, reason: SPRITE_FIT_IN_PLACE_UNAVAILABLE },
      ];
  return (
    <div className="flex items-center gap-1.5">
      <span className="mr-1 flex items-center gap-1.5">
        <span className="text-xs font-semibold text-ink-muted">Fit</span>
        <Tooltip text={QUANTISE_TOOLTIPS.spriteCellFit} hint="Fit" />
      </span>
      <SegmentedChoice
        label="Sprite fit"
        values={SPRITE_FITS}
        value={fit}
        format={(option) => SPRITE_FIT_LABELS[option]}
        onChange={onChange}
        unavailable={withheld}
      />
    </div>
  );
}
