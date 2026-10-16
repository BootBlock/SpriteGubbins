import { QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { SPRITE_CELL_SIDE_RANGE, SPRITE_CELL_SOURCE_LABELS } from '../../constants/spriteCell.ts';
import type { CellLattice } from '../../types/cellLattice.ts';
import type { TargetSize } from '../../types/output.ts';
import type { PixelGrid, SpriteBox } from '../../types/quantiser.ts';
import { SPRITE_CELL_SOURCES } from '../../types/spriteCell.ts';
import type { SheetStep, SpriteCellChoice, SpriteCellSource } from '../../types/spriteCell.ts';
import { cellBadgeText } from '../../utils/cellBadgeText.ts';
import {
  oversizedSprites,
  resizingFitAllowed,
  resolveSpriteCell,
  targetFitsCell,
} from '../../utils/spriteCell.ts';
import { Badge } from '../common/Badge.tsx';
import { NumberField } from '../common/NumberField.tsx';
import { SegmentedChoice } from '../common/SegmentedChoice.tsx';
import { Tooltip } from '../common/Tooltip.tsx';
import { SpriteAnchorChoice } from './SpriteAnchorChoice.tsx';
import { SpriteFitChoice } from './SpriteFitChoice.tsx';

interface SpriteCellControlsProps {
  readonly choice: SpriteCellChoice;
  readonly onChange: (choice: SpriteCellChoice) => void;
  /**
   * The component size the studio's prompt states, or `null` where it states none.
   *
   * What the `Studio target` position is, so that position is not offered while this is `null` — a
   * pill standing for a size nobody has stated would be a control that changed nothing.
   */
  readonly target: TargetSize | null;
  /**
   * The pixel scale the result was computed at, or `null` with no result yet.
   *
   * What withholds the two fits that resize: a sheet read at a grid above 1 is pixel art, which keeps
   * its pixels — see `resizingFitAllowed`, which the press resolves the cell through as well.
   */
  readonly grid: PixelGrid | null;
  /** The grid step the studio's sheet states, which `Scale evenly` reads where the sprites give none. */
  readonly statedStep: SheetStep | null;
  /** A placement sheet's cells, or `null` off one, which `Keep place` places each piece in — see `useCellLattice`. */
  readonly lattice: CellLattice | null;
  /**
   * The sprites the segmentation found, in the 1:1 result's coordinates.
   *
   * Read for two questions: whether any of them is larger than the cell, which the download refuses
   * under `As drawn` rather than squeezing it, and what one factor `Scale evenly` would resize them
   * by. This is where the reader is told either before the press — beside the setting they would
   * change, rather than in a toast after it.
   */
  readonly boxes: readonly SpriteBox[];
}

/**
 * What a pack's sprites are cut into: each piece's own bounding box, or one fixed cell for all of
 * them with the artwork registered at a stated anchor.
 *
 * **Beside the format pills rather than in a panel of its own**, because it is meaningless without
 * them: only the two formats that describe sprites read a cell, and a panel in the control column
 * whose settings did nothing until a pill in the preview column moved would be worse than no panel
 * at all. `DownloadControls` shows it for exactly those two, which is the call `ComparisonToolbar`
 * makes about the heatmap's scale.
 *
 * **Every control here is off unless it can do something.** The two size boxes appear only under
 * `Fixed`, since the other two sources state their own size; the anchor and the fit appear only where
 * there is a cell for artwork to sit in, and the anchor not under `Keep place`, which places each piece
 * where it was drawn rather than against an edge; and `Studio target` is absent while the studio states no
 * size; `SpriteFitChoice` says how its own pills are held back on a pixel-art sheet. See `SpriteCell`
 * for what the whole arrangement is for, and `spriteCellSource` for what a reader is told about it.
 */
export function SpriteCellControls({
  choice,
  onChange,
  target,
  grid,
  statedStep,
  lattice,
  boxes,
}: SpriteCellControlsProps) {
  const sources = SPRITE_CELL_SOURCES.filter(
    (offered) => offered !== 'TARGET' || (target !== null && targetFitsCell(target)),
  );
  // Derived rather than corrected in state, which is the call `DownloadControls` makes about a
  // download magnification the result has outgrown: a reader can choose the studio's size and then
  // go and clear it, which strands a choice this row no longer offers. Showing that choice pressed
  // is impossible — the pill is gone — so showing *nothing* pressed is what a bare filter leaves,
  // beside a cut that has silently fallen back to the bounding box. What the pills show is what the
  // download will actually do.
  const source = sources.includes(choice.source) ? choice.source : SPRITE_CELL_SOURCES[0];
  // The fit in force is derived for the same reason: on a pixel-art sheet a stored resizing fit
  // resolves to `REFUSE`, and on a placement sheet every fit to `IN_PLACE`, so that is the pill shown
  // pressed, beside the reason the others are held.
  const cell = resolveSpriteCell({ ...choice, source }, target, grid, statedStep, lattice);
  const over = cell === null ? [] : oversizedSprites(boxes, cell);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-ink-muted">Cut</span>
          <Tooltip text={QUANTISE_TOOLTIPS.spriteCellSource} hint="Cut" />
        </span>
        <SegmentedChoice<SpriteCellSource>
          label="Sprite cut"
          values={sources}
          value={source}
          format={(source) => SPRITE_CELL_SOURCE_LABELS[source]}
          onChange={(source) => {
            onChange({ ...choice, source });
          }}
        />
      </div>

      {source === 'FIXED' && (
        <div className="flex items-start gap-2">
          <div className="w-24">
            <NumberField
              label="Cell width"
              tooltip={QUANTISE_TOOLTIPS.spriteCellWidth}
              value={choice.fixed.width}
              min={SPRITE_CELL_SIDE_RANGE.min}
              max={SPRITE_CELL_SIDE_RANGE.max}
              step={SPRITE_CELL_SIDE_RANGE.step}
              disabledReason=""
              onChange={(width) => {
                onChange({ ...choice, fixed: { ...choice.fixed, width } });
              }}
            />
          </div>
          <div className="w-24">
            <NumberField
              label="Cell height"
              tooltip={QUANTISE_TOOLTIPS.spriteCellHeight}
              value={choice.fixed.height}
              min={SPRITE_CELL_SIDE_RANGE.min}
              max={SPRITE_CELL_SIDE_RANGE.max}
              step={SPRITE_CELL_SIDE_RANGE.step}
              disabledReason=""
              onChange={(height) => {
                onChange({ ...choice, fixed: { ...choice.fixed, height } });
              }}
            />
          </div>
        </div>
      )}

      {cell !== null && (
        <>
          {/* No anchors under `Keep place`, which places each piece where it was drawn rather than
              against an edge of the cell: the pills would be a setting the cut ignores. */}
          {cell.fit !== 'IN_PLACE' && (
            <SpriteAnchorChoice
              anchor={choice.anchor}
              onChange={(anchor) => {
                onChange({ ...choice, anchor });
              }}
            />
          )}

          <SpriteFitChoice
            fit={cell.fit}
            resizable={resizingFitAllowed(grid)}
            placed={lattice !== null}
            onChange={(fit) => {
              onChange({ ...choice, fit });
            }}
          />
        </>
      )}

      {/* The cell in force, stated once, because the reader chose a *source* and not always a size:
          under `Studio target` the two numbers are the studio's and are nowhere else on this tab.
          The refusal replaces it rather than sitting beside it — a sheet that will not be written is
          not a cut worth quoting.

          **Announced, because it is the only notice that comes before the press.** It appears and
          re-words itself as the reader types into the two size boxes, so a reader who cannot see it
          would otherwise meet the refusal only as a toast, after pressing a button a sighted reader
          had already been warned off.

          **The region is rendered always and only its contents are conditional**, which is the half
          that is easy to get wrong and is why `PromptBudgetNotice` says so at its own call site: a
          region inserted into the document in the same commit as its text is not reliably announced,
          and the first press of `Fixed` is exactly that commit. */}
      <div aria-live="polite" aria-atomic="true">
        {cell !== null && (
          <Badge tone={over.length === 0 ? 'neutral' : 'attention'}>
            {cellBadgeText(cell, boxes, over.length)}
          </Badge>
        )}
      </div>
    </div>
  );
}
