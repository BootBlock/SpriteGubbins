import {
  COLOR_MERGE_TOLERANCES,
  FILL_CLEANUP_TOLERANCES,
  LINE_STRENGTHS,
  QUANTISE_TOOLTIPS,
  VOTE_METHOD_CHOICES,
} from '../../constants/quantiser.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { SegmentedChoice } from '../common/SegmentedChoice.tsx';
import { SelectField } from '../common/SelectField.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

/**
 * The Downscale reading and its two dials: which algorithm turns each mesh cell into a pixel, how
 * hard the ink-weighted reading pulls toward a line, and how far the fill cleanup may merge
 * speckle.
 *
 * A `SelectField` for the reading, following the field's own precedent — every tool this tab
 * learned from offers its samplers as a small enum — and the two dials as stepped pills, the shape
 * the key tolerance beside them already takes. **Line strength appears only while the ink-weighted
 * reading is chosen**, the same conditional the studio's Palette Limit uses: the other readings do
 * not blend, so a dial that changed nothing would be a lie on screen. Everything consumes the
 * store directly with atomic selectors; all three choices are per-workflow rather than per-sheet,
 * so they survive a new image and fall with Clear — the store says why.
 */
export function DownscaleControls() {
  const vote = useQuantiseStore((state) => state.vote);
  const lineStrength = useQuantiseStore((state) => state.lineStrength);
  const fillCleanup = useQuantiseStore((state) => state.fillCleanup);
  const colorMerge = useQuantiseStore((state) => state.colorMerge);
  const setVote = useQuantiseStore((state) => state.setVote);
  const setLineStrength = useQuantiseStore((state) => state.setLineStrength);
  const setFillCleanup = useQuantiseStore((state) => state.setFillCleanup);
  const setColorMerge = useQuantiseStore((state) => state.setColorMerge);

  return (
    <div className="mt-4 space-y-3">
      <div className="max-w-md">
        <SelectField
          label="Downscale"
          tooltip={QUANTISE_TOOLTIPS.vote}
          value={vote}
          choices={VOTE_METHOD_CHOICES}
          onChange={setVote}
        />
      </div>

      {vote === 'INK_WEIGHTED' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
            Line strength
            <Tooltip text={QUANTISE_TOOLTIPS.lineStrength} hint="Line strength" />
          </span>
          <SegmentedChoice
            label="Ink line strength"
            values={LINE_STRENGTHS}
            value={lineStrength}
            format={(value) => `${String(value)}×`}
            onChange={setLineStrength}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
          Colour merge
          <Tooltip text={QUANTISE_TOOLTIPS.colorMerge} hint="Colour merge" />
        </span>
        <SegmentedChoice
          label="Colour merge tolerance"
          values={COLOR_MERGE_TOLERANCES}
          value={colorMerge}
          format={(value) => (value === 0 ? 'off' : String(value))}
          onChange={setColorMerge}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
          Fill cleanup
          <Tooltip text={QUANTISE_TOOLTIPS.fillCleanup} hint="Fill cleanup" />
        </span>
        <SegmentedChoice
          label="Speckle merge tolerance"
          values={FILL_CLEANUP_TOLERANCES}
          value={fillCleanup}
          // `0` reads as the thing it means: the pass does not run at all.
          format={(value) => (value === 0 ? 'off' : String(value))}
          onChange={setFillCleanup}
        />
      </div>
    </div>
  );
}
