import { QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { CELL_ANCHOR_X_LABELS, CELL_ANCHOR_Y_LABELS } from '../../constants/spriteCell.ts';
import { CELL_ANCHORS_X, CELL_ANCHORS_Y } from '../../types/spriteCell.ts';
import type { SpriteAnchor } from '../../types/spriteCell.ts';
import { SegmentedChoice } from '../common/SegmentedChoice.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

interface SpriteAnchorChoiceProps {
  readonly anchor: SpriteAnchor;
  readonly onChange: (anchor: SpriteAnchor) => void;
}

/**
 * Where the artwork sits in its cell, across and down — the two rows of `SpriteCellControls` that say
 * which edge or corner a piece is registered against (`SpriteAnchor`).
 *
 * Its own file because the panel shows it only under a fit that places against an edge: `Keep place`
 * keeps each piece where it was drawn, and an anchor there would be a setting the cut ignores.
 */
export function SpriteAnchorChoice({ anchor, onChange }: SpriteAnchorChoiceProps) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-muted">Across</span>
          <Tooltip text={QUANTISE_TOOLTIPS.spriteCellAnchorX} hint="Across" />
        </span>
        <SegmentedChoice
          label="Anchor across the cell"
          values={CELL_ANCHORS_X}
          value={anchor.x}
          format={(value) => CELL_ANCHOR_X_LABELS[value]}
          onChange={(x) => {
            onChange({ ...anchor, x });
          }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-muted">Down</span>
          <Tooltip text={QUANTISE_TOOLTIPS.spriteCellAnchorY} hint="Down" />
        </span>
        <SegmentedChoice
          label="Anchor down the cell"
          values={CELL_ANCHORS_Y}
          value={anchor.y}
          format={(value) => CELL_ANCHOR_Y_LABELS[value]}
          onChange={(y) => {
            onChange({ ...anchor, y });
          }}
        />
      </div>
    </>
  );
}
