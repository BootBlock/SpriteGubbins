import { ATLAS_TOOLTIPS } from '../../constants/atlas.ts';
import type { AtlasCanvasSize, SpriteFit } from '../../types/atlas.ts';
import { Badge } from '../common/Badge.tsx';
import { Tooltip } from '../common/Tooltip.tsx';
import { AtlasFitDetail } from './AtlasFitDetail.tsx';

interface AtlasFitSummaryProps {
  /** The square a component has to itself, once the bleed gutter is taken off both sides. */
  readonly usableBounds: number;
  /** `null` where the studio names no component size, so there is nothing to check against. */
  readonly fit: SpriteFit | null;
  readonly canvasSize: AtlasCanvasSize;
  /** The smallest texture that seats every component at 1:1, or `null` where none does. */
  readonly smallestCanvas: AtlasCanvasSize | null;
}

/**
 * The one row in this modal that is a decision rather than a measurement.
 *
 * It replaces a status row that could not fail. The old badge reported whether the canvas was a
 * power of two — and every size the calculator offers is one, which is now a closed union rather
 * than a convention — so it read "✓ Power of 2 compliant" for every configuration the app could
 * reach, in the most prominent position on the panel. What belongs there is the question the tool
 * exists to answer: does the component the prompt asks for fit the cell this texture affords?
 *
 * `attention` and `valid` rather than `accent`, because this is a status and not an action, and
 * they are the two tones that already mean "needs attention" and "clean" everywhere else in the app.
 */
export function AtlasFitSummary({ usableBounds, fit, canvasSize, smallestCanvas }: AtlasFitSummaryProps) {
  return (
    <div className="space-y-2 rounded-xl border border-foundry-700 bg-foundry-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-xs text-ink-faint">
          Component fit
          <Tooltip text={ATLAS_TOOLTIPS.fit} hint="Component fit" />
        </span>
        {fit === null ? (
          <Badge>No component size named</Badge>
        ) : fit.scale === 0 ? (
          <Badge tone="attention">⚠ Does not fit</Badge>
        ) : (
          <Badge tone="valid">✓ Fits at ×{fit.scale}</Badge>
        )}
      </div>

      <AtlasFitDetail
        usableBounds={usableBounds}
        fit={fit}
        canvasSize={canvasSize}
        smallestCanvas={smallestCanvas}
      />
    </div>
  );
}
