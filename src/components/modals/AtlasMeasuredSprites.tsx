import { MEASURED_SPRITE_GUIDANCE } from '../../constants/atlas.ts';
import { useQuantiseAnswerStore } from '../../stores/useQuantiseAnswerStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { SpriteSegmentation } from '../../types/quantiser.ts';
import { spriteFitFor } from '../../utils/atlasFit.ts';
import { widestSprite } from '../../utils/spriteSegments.ts';
import { Badge } from '../common/Badge.tsx';

interface AtlasMeasuredSpritesProps {
  /** How many components the studio's prompt asks this sheet to hold. */
  readonly componentCount: number;
  /** The square one component has to itself, once the bleed gutter is taken off both sides. */
  readonly usableBounds: number;
}

/**
 * What the sheet the reader has actually quantised holds, beside what the prompt asked for.
 *
 * Every other figure in this modal is derived from the studio — the component count from the
 * category and the direction set, the fit from the target size the prompt states. All of them
 * describe the atlas that *would* be packed if the generator complied. This is the one row that
 * describes what came back, and it is here because the two disagreeing is the failure this app has
 * no other way to show: a sheet returning nine components where twelve were requested plans an
 * atlas for twelve, and nobody is told.
 *
 * **It is offered beside the studio's figures and never replaces them.** The prompt's count is what
 * the atlas is being planned for and stays the input; this says what one returned raster was found
 * to hold, which is a measurement of a single generation rather than of the design. Substituting it
 * would make the planner's answer change whenever a reader dropped a different sheet on another tab.
 *
 * Absent entirely while nothing has been quantised, rather than showing a row of dashes: the modal
 * opens from the header on every tab, and most of the time there is no sheet to have measured.
 */
export function AtlasMeasuredSprites({ componentCount, usableBounds }: AtlasMeasuredSpritesProps) {
  const source = useQuantiseStore((state) => state.source);
  const succeeded = useQuantiseAnswerStore((state) => state.succeeded);

  // Both, because they answer different halves of "is there a measurement": the answer store is
  // emptied when a new sheet is loaded and when the tab is cleared, and the source is what names the
  // file the figures came from — which is the whole reason to state them here rather than as an
  // anonymous number.
  if (source === null || succeeded === null) return null;

  const { sprites } = succeeded.result;
  // **Three states, and the two that are not a count both have to say so in their own words.** A
  // sheet that is still solid has no boundary between one component and the next, and a scattered
  // one has thousands — neither is a figure to read against a component count, and reporting either
  // as "1 sprite against 12 asked for" would be this panel inventing a discrepancy out of a sheet
  // nobody has keyed yet. Reporting them at all is the point rather than an omission: a reader whose
  // plan disagrees with their sheet needs to be told which of the three they are looking at.
  const boxes = sprites.kind === 'SEGMENTED' ? sprites.boxes : null;
  const largest = boxes === null ? null : widestSprite(boxes);
  const fit =
    largest === null ? null : spriteFitFor(usableBounds, { width: largest.width, height: largest.height });

  return (
    <div className="space-y-2 rounded-xl border border-foundry-700 bg-foundry-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-ink-faint">Measured in {source.name}</span>
        {sprites.kind === 'SOLID' ? (
          <Badge tone="attention">⚠ Nothing transparent to separate</Badge>
        ) : boxes === null ? (
          <Badge tone="attention">⚠ Did not separate into sprites</Badge>
        ) : boxes.length === componentCount ? (
          <Badge tone="valid">
            ✓ {boxes.length} {boxes.length === 1 ? 'sprite' : 'sprites'}, as asked for
          </Badge>
        ) : (
          <Badge tone="attention">
            ⚠ {boxes.length} {boxes.length === 1 ? 'sprite' : 'sprites'}, against {componentCount} asked for
          </Badge>
        )}
      </div>

      {largest !== null && fit !== null && (
        <p className="font-mono text-2xs text-ink-faint">
          Largest {largest.width} × {largest.height} drawn pixels ·{' '}
          {fit.scale === 0
            ? `larger than this ${usableBounds} px cell`
            : `fits this ${usableBounds} px cell at ×${fit.scale}`}
        </p>
      )}

      <p className="text-xs leading-relaxed text-ink-muted">{guidanceFor(sprites.kind)}</p>
    </div>
  );
}

/** Which paragraph the state calls for — see `MEASURED_SPRITE_GUIDANCE`, which holds all three. */
function guidanceFor(kind: SpriteSegmentation['kind']): string {
  if (kind === 'SOLID') return MEASURED_SPRITE_GUIDANCE.solid;
  if (kind === 'SCATTERED') return MEASURED_SPRITE_GUIDANCE.scattered;
  return MEASURED_SPRITE_GUIDANCE.measured;
}
