import { QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { SPRITE_FIT_LABELS, SPRITE_FIT_UNAVAILABLE } from '../../constants/spriteCell.ts';
import { SPRITE_FITS } from '../../types/spriteCell.ts';
import type { SpriteFit } from '../../types/spriteCell.ts';
import { SegmentedChoice } from '../common/SegmentedChoice.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

interface SpriteFitChoiceProps {
  /** The fit in force, which is `REFUSE` on a pixel-art sheet whatever is stored — see `resolveSpriteCell`. */
  readonly fit: SpriteFit;
  /** Whether the sheet may be resized at all, which is `resizingFitAllowed` of its scale. */
  readonly resizable: boolean;
  readonly onChange: (fit: SpriteFit) => void;
}

/**
 * How each sprite meets its cell: as drawn, resized by one factor for the sheet, or cropped to its
 * centred square and resized to fill — see `SpriteFit`.
 *
 * Its own file because it is the one control in the cell panel with a condition of its own: on a
 * sheet read at a pixel scale above 1, the two resizing pills **stay on screen but cannot be
 * pressed**, and say why under the row. They are the one answer to "how do I get 128 px icons out of
 * a painted sheet", and a reader working on pixel art who never saw them would not learn the answer
 * exists. The pill shown pressed is the fit in force, so a stored resizing fit reads as `As drawn`
 * there, which is what the download will do. `SpriteCellControls` shows the row only where there is
 * a cell for the artwork to meet.
 */
export function SpriteFitChoice({ fit, resizable, onChange }: SpriteFitChoiceProps) {
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
        unavailable={
          resizable ? undefined : { values: ['SCALE_SET', 'FILL_SQUARE'], reason: SPRITE_FIT_UNAVAILABLE }
        }
      />
    </div>
  );
}
