import {
  QUANTISE_TOOLTIPS,
  SYMMETRY_CONFIDENCE_RANGE,
  SYMMETRY_MODE_CHOICES,
  SYMMETRY_TOLERANCE_RANGE,
} from '../../constants/quantiser.ts';
import { SYMMETRY_GUIDANCE } from '../../constants/spriteSymmetry.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { SpriteSegmentation, SpriteSymmetry, SymmetryMode } from '../../types/quantiser.ts';
import { Badge } from '../common/Badge.tsx';
import { RangeField } from '../common/RangeField.tsx';
import { SelectField } from '../common/SelectField.tsx';

interface SymmetryControlsProps {
  /** What the pass found, `null` while it is off, and `null` while there is no result at all. */
  readonly symmetry: readonly SpriteSymmetry[] | null;
  /**
   * What the sheet broke into, which is what decides whether an empty reading is a finding.
   *
   * An empty array of readings means the pass ran over no sprites, and the reason for that is a fact
   * about the *segmentation* rather than about symmetry — so the paragraph that explains it has to
   * know whether there were sprites to score at all.
   */
  readonly sprites: SpriteSegmentation | null;
  /** Whether a newer result is on its way, which is what {@link symmetry} may be lagging behind. */
  readonly busy: boolean;
}

/**
 * Each sprite's vertical mirror axis, how much of it holds, and whether to settle the pairs.
 *
 * The second panel on this tab whose subject is a *reading* rather than the sheet, and the first
 * whose control can turn into a rewrite — which is why the reading and the rewrite are two positions
 * of one select rather than a checkbox beside a dial. `CHECK` changes no pixel; `SNAP` changes the
 * pixels of whichever sprites already passed the floor.
 *
 * **It opens off, and the paragraph says why before anyone turns it on.** Held items, drawn weapons
 * and one-sided gear are asymmetric because that is what the subject *is*, and nothing in the
 * pipeline can tell one of those from a half that drifted during generation. So the honest order of
 * operations is read, then decide — which is what the three positions are shaped around.
 *
 * **The list is the report.** A count of symmetric sprites says nothing a reader can act on: the
 * question is always *which* of them, and where the axis landed. One row per sprite carries the
 * axis, the share and whether the snap reached it, and the Sprites preview draws the same axes over
 * the artwork so a number can be checked against the picture.
 */
export function SymmetryControls({ symmetry, sprites, busy }: SymmetryControlsProps) {
  const mode = useQuantiseStore((state) => state.symmetry);
  const tolerance = useQuantiseStore((state) => state.symmetryTolerance);
  const confidence = useQuantiseStore((state) => state.symmetryConfidence);
  const setSymmetry = useQuantiseStore((state) => state.setSymmetry);
  const setSymmetryTolerance = useQuantiseStore((state) => state.setSymmetryTolerance);
  const setSymmetryConfidence = useQuantiseStore((state) => state.setSymmetryConfidence);

  // The **figures** are withdrawn while a newer result is coming and the **paragraph** is not, and
  // the split is deliberate. A line of bare axes has nothing to say it belongs to the sheet before
  // the last dial move, so it goes; the paragraph describes what the control is doing, which has not
  // stopped being true because a job is in flight — and falling back to the off paragraph there told
  // a reader to go and read the sheet before settling anything while a snap was running.
  const readings = busy ? null : symmetry;
  const settled = symmetry?.filter((reading) => reading.snapped).length ?? 0;

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">Symmetry</p>
        {busy && <Badge tone="live">Reading the sprites…</Badge>}
        {readings !== null && readings.length > 0 && (
          <>
            <Badge tone="neutral">
              {readings.length} {readings.length === 1 ? 'sprite scored' : 'sprites scored'}
            </Badge>
            {mode === 'SNAP' && (
              <Badge tone={settled > 0 ? 'valid' : 'attention'}>
                {settled === 0 ? 'none settled' : `${settled} settled`}
              </Badge>
            )}
          </>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div className="max-w-md">
          <SelectField
            label="Symmetry"
            tooltip={QUANTISE_TOOLTIPS.symmetry}
            value={mode}
            choices={SYMMETRY_MODE_CHOICES}
            onChange={setSymmetry}
          />
        </div>

        {/* Both dials are withdrawn where they would change nothing, the conditional every other
            panel on this tab uses: the tolerance has nothing to measure while the pass is off, and
            the floor has nothing to admit while nothing is being rewritten. */}
        {mode !== 'OFF' && (
          <RangeField
            label="Symmetry tolerance"
            tooltip={QUANTISE_TOOLTIPS.symmetryTolerance}
            value={tolerance}
            min={SYMMETRY_TOLERANCE_RANGE.min}
            max={SYMMETRY_TOLERANCE_RANGE.max}
            step={SYMMETRY_TOLERANCE_RANGE.step}
            // `exact` rather than `off`, because zero here is the strictest position rather than the
            // pass not running — the select above is what switches it off.
            format={(value) => (value === 0 ? 'exact' : String(value))}
            onChange={setSymmetryTolerance}
          />
        )}
        {mode === 'SNAP' && (
          <RangeField
            label="Confidence floor"
            tooltip={QUANTISE_TOOLTIPS.symmetryConfidence}
            value={confidence}
            min={SYMMETRY_CONFIDENCE_RANGE.min}
            max={SYMMETRY_CONFIDENCE_RANGE.max}
            step={SYMMETRY_CONFIDENCE_RANGE.step}
            format={(value) => `${String(value)}%`}
            onChange={setSymmetryConfidence}
          />
        )}
      </div>

      {/* Withdrawn while a newer result is coming, as the sprite panel's figures are: the previous
          job's axes are numbers about a sheet the dials have already moved on from. */}
      {readings !== null && readings.length > 0 && (
        <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto font-mono text-2xs text-ink-faint">
          {readings.map((reading) => (
            <li key={`${String(reading.box.left)}-${String(reading.box.top)}`}>
              {`x ${reading.axis.toFixed(1)} · ${(reading.confidence * 100).toFixed(0)}% mirrored`}
              {reading.snapped && ' · settled'}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        {guidanceFor(mode, symmetry, sprites, settled)}
      </p>
    </section>
  );
}

/** Which paragraph the state calls for — see `SYMMETRY_GUIDANCE`, which holds all five. */
function guidanceFor(
  mode: SymmetryMode,
  symmetry: readonly SpriteSymmetry[] | null,
  sprites: SpriteSegmentation | null,
  settled: number,
): string {
  if (mode === 'OFF') return SYMMETRY_GUIDANCE.off;
  // Before any result has come back the general paragraph is the right one: naming a state the sheet
  // is not yet in would be describing a finding nobody has made.
  if (symmetry === null) return SYMMETRY_GUIDANCE.off;
  // No sprite to score, which is a fact about the *keying* — and the panel above is the one that
  // says which of its three reasons applies. `sprites` being null is the same "nothing yet" state as
  // above, reached one render earlier.
  if (symmetry.length === 0) return sprites === null ? SYMMETRY_GUIDANCE.off : SYMMETRY_GUIDANCE.none;
  if (mode !== 'SNAP') return SYMMETRY_GUIDANCE.read;
  return settled > 0 ? SYMMETRY_GUIDANCE.snapped : SYMMETRY_GUIDANCE.refused;
}
