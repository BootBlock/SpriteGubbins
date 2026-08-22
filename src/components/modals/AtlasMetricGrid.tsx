import { ATLAS_TOOLTIPS } from '../../constants/atlas.ts';
import type { AtlasMetrics } from '../../types/atlas.ts';
import { AtlasMetric } from './AtlasMetric.tsx';

interface AtlasMetricGridProps {
  readonly metrics: AtlasMetrics;
  readonly componentCount: number;
}

/**
 * The six figures the atlas works out, and the guidance that makes each one mean something.
 *
 * Split from the modal rather than written inline in it: pairing six metrics with six tooltips is a
 * responsibility of its own, and it was the block that pushed `AtlasCalculatorContents` past the file
 * length the structural laws set. The modal now chooses the inputs and composes the panels; which
 * derived figures are worth a tile, and what each one is called, is decided here.
 *
 * Two columns on a phone and three from `md` up. Four across — what the old four-tile row used —
 * leaves six tiles as a 4 + 2 ragged row; three gives two full rows of three.
 */
export function AtlasMetricGrid({ metrics, componentCount }: AtlasMetricGridProps) {
  return (
    <dl className="grid grid-cols-2 gap-2.5 font-mono md:grid-cols-3">
      <AtlasMetric
        label="Components"
        value={`${componentCount} parts`}
        tooltip={ATLAS_TOOLTIPS.componentCount}
      />
      <AtlasMetric
        label="Grid layout"
        value={`${metrics.columns}×${metrics.rows}`}
        tooltip={ATLAS_TOOLTIPS.gridLayout}
      />
      <AtlasMetric
        label="Cell size"
        value={`${metrics.cellSize}×${metrics.cellSize} px`}
        tooltip={ATLAS_TOOLTIPS.cellSize}
      />
      <AtlasMetric
        label="Usable bounds"
        value={`${metrics.usableBounds}×${metrics.usableBounds} px`}
        tooltip={ATLAS_TOOLTIPS.usableBounds}
      />
      <AtlasMetric
        label="Empty slots"
        value={`${metrics.emptySlots} of ${metrics.slots}`}
        tooltip={ATLAS_TOOLTIPS.emptySlots}
      />
      <AtlasMetric
        label="Texture in use"
        value={`${Math.round(metrics.usableShare * 100)}%`}
        tooltip={ATLAS_TOOLTIPS.usableShare}
      />
    </dl>
  );
}
