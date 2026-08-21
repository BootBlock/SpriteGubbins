import {
  CLEANUP_PASSES_RANGE,
  COLOR_MERGE_RANGE,
  FILL_CLEANUP_RANGE,
  INK_THRESHOLD_RANGE,
  LINE_STRENGTH_RANGE,
  OUTLINE_EXPANSION_RANGE,
  QUANTISE_TOOLTIPS,
  TRIM_STRENGTH_RANGE,
  VOTE_METHOD_CHOICES,
} from '../../constants/quantiser.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { RangeField } from '../common/RangeField.tsx';
import { SelectField } from '../common/SelectField.tsx';

/**
 * The Downscale reading and its dials: which algorithm turns each mesh cell into a pixel, and the
 * seven sliders that shape the result.
 *
 * A `SelectField` for the reading — every tool this tab learned from offers its samplers as a
 * small enum — and `RangeField` sliders for the dials, because each is a position on a continuous
 * range judged against the live preview rather than a choice between a handful of values. **The
 * three ink-weighted dials appear only while that reading is chosen**, the conditional the
 * studio's Palette Limit uses: the other readings do not blend, and a dial that changed nothing
 * would be a lie on screen. **Outline expansion sits above them and outside that conditional**,
 * because it runs before the vote rather than inside one — it shapes what every reading is handed. Everything consumes the store directly with atomic selectors; the
 * choices are per-workflow rather than per-sheet, so they survive a new image and fall with
 * Clear — the store says why.
 */
export function DownscaleControls() {
  const vote = useQuantiseStore((state) => state.vote);
  const outlineExpansion = useQuantiseStore((state) => state.outlineExpansion);
  const lineStrength = useQuantiseStore((state) => state.lineStrength);
  const trimStrength = useQuantiseStore((state) => state.trimStrength);
  const inkThreshold = useQuantiseStore((state) => state.inkThreshold);
  const colorMerge = useQuantiseStore((state) => state.colorMerge);
  const fillCleanup = useQuantiseStore((state) => state.fillCleanup);
  const cleanupPasses = useQuantiseStore((state) => state.cleanupPasses);
  const setVote = useQuantiseStore((state) => state.setVote);
  const setOutlineExpansion = useQuantiseStore((state) => state.setOutlineExpansion);
  const setLineStrength = useQuantiseStore((state) => state.setLineStrength);
  const setTrimStrength = useQuantiseStore((state) => state.setTrimStrength);
  const setInkThreshold = useQuantiseStore((state) => state.setInkThreshold);
  const setColorMerge = useQuantiseStore((state) => state.setColorMerge);
  const setFillCleanup = useQuantiseStore((state) => state.setFillCleanup);
  const setCleanupPasses = useQuantiseStore((state) => state.setCleanupPasses);

  const offOr = (value: number): string => (value === 0 ? 'off' : String(value));

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

      <RangeField
        label="Outline expansion"
        tooltip={QUANTISE_TOOLTIPS.outlineExpansion}
        value={outlineExpansion}
        min={OUTLINE_EXPANSION_RANGE.min}
        max={OUTLINE_EXPANSION_RANGE.max}
        step={OUTLINE_EXPANSION_RANGE.step}
        format={offOr}
        onChange={setOutlineExpansion}
      />

      {vote === 'INK_WEIGHTED' && (
        <>
          <RangeField
            label="Line strength"
            tooltip={QUANTISE_TOOLTIPS.lineStrength}
            value={lineStrength}
            min={LINE_STRENGTH_RANGE.min}
            max={LINE_STRENGTH_RANGE.max}
            step={LINE_STRENGTH_RANGE.step}
            format={(value) => `${value.toFixed(1)}×`}
            onChange={setLineStrength}
          />
          <RangeField
            label="Trim strength"
            tooltip={QUANTISE_TOOLTIPS.trimStrength}
            value={trimStrength}
            min={TRIM_STRENGTH_RANGE.min}
            max={TRIM_STRENGTH_RANGE.max}
            step={TRIM_STRENGTH_RANGE.step}
            format={(value) => (value === 0 ? 'off' : `${value.toFixed(1)}×`)}
            onChange={setTrimStrength}
          />
          <RangeField
            label="Ink threshold"
            tooltip={QUANTISE_TOOLTIPS.inkThreshold}
            value={inkThreshold}
            min={INK_THRESHOLD_RANGE.min}
            max={INK_THRESHOLD_RANGE.max}
            step={INK_THRESHOLD_RANGE.step}
            format={(value) => String(value)}
            onChange={setInkThreshold}
          />
        </>
      )}

      <RangeField
        label="Colour merge"
        tooltip={QUANTISE_TOOLTIPS.colorMerge}
        value={colorMerge}
        min={COLOR_MERGE_RANGE.min}
        max={COLOR_MERGE_RANGE.max}
        step={COLOR_MERGE_RANGE.step}
        format={offOr}
        onChange={setColorMerge}
      />
      <RangeField
        label="Fill cleanup"
        tooltip={QUANTISE_TOOLTIPS.fillCleanup}
        value={fillCleanup}
        min={FILL_CLEANUP_RANGE.min}
        max={FILL_CLEANUP_RANGE.max}
        step={FILL_CLEANUP_RANGE.step}
        format={offOr}
        onChange={setFillCleanup}
      />
      <RangeField
        label="Cleanup passes"
        tooltip={QUANTISE_TOOLTIPS.cleanupPasses}
        value={cleanupPasses}
        min={CLEANUP_PASSES_RANGE.min}
        max={CLEANUP_PASSES_RANGE.max}
        step={CLEANUP_PASSES_RANGE.step}
        format={(value) => String(value)}
        onChange={setCleanupPasses}
      />
    </div>
  );
}
