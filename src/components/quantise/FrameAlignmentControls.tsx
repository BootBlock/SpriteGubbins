import { FRAME_ALIGNMENT_GUIDANCE } from '../../constants/frameAlignment.ts';
import {
  FRAME_ALIGNMENT_MODE_CHOICES,
  FRAME_DRIFT_RANGE,
  QUANTISE_TOOLTIPS,
} from '../../constants/quantiser.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { FrameAlignmentMode, SpriteSegmentation, SpriteStrip } from '../../types/quantiser.ts';
import { Badge } from '../common/Badge.tsx';
import { RangeField } from '../common/RangeField.tsx';
import { SelectField } from '../common/SelectField.tsx';

interface FrameAlignmentControlsProps {
  /**
   * What the sheet broke into, which is what decides whether an empty reading is a finding.
   *
   * An empty array of strips means the pass ran and found no row long enough, and whether that is
   * about the *rows* or about there being no sprites at all is a fact of the segmentation — so the
   * paragraph that explains it has to know which.
   */
  readonly sprites: SpriteSegmentation | null;
  /** What the pass found, `null` while it is off, and `null` while there is no result at all. */
  readonly strips: readonly SpriteStrip[] | null;
  /** Whether a newer result is on its way, which is what {@link strips} may be lagging behind. */
  readonly busy: boolean;
}

/**
 * Which rows of sprites the sheet holds, how far each of their frames sits from the spacing that row
 * keeps to, and whether to carry the strays onto it.
 *
 * The third panel on this tab whose subject is a *reading* rather than the sheet, and the second
 * whose control can turn into a rewrite — so it is shaped the way `SymmetryControls` is, and for the
 * reason stated there: `CHECK` changes no pixel, `SNAP` moves the frames that pass the tolerance,
 * and two positions of one select is what keeps finding out and being changed apart.
 *
 * **It opens off because a row is not always a run.** Four facings are laid out on a spacing as
 * surely as four frames of a walk are, and a facing drawn reaching further on one side belongs
 * exactly where it is. Nothing in the pipeline can tell that from a frame that wandered, so the
 * honest order is read, then decide.
 *
 * **The list is the report**, as the symmetry panel's is. A count of drifting frames says nothing a
 * reader can act on — the question is always *which* of them and by how much, on which axis — so
 * there is a row per strip carrying each frame's drift and whether the move reached it, and the
 * Onion skin preview lays the same frames over one another so a figure can be checked against the
 * picture.
 */
export function FrameAlignmentControls({ sprites, strips, busy }: FrameAlignmentControlsProps) {
  const mode = useQuantiseStore((state) => state.frameAlignment);
  const tolerance = useQuantiseStore((state) => state.frameDriftTolerance);
  const setFrameAlignment = useQuantiseStore((state) => state.setFrameAlignment);
  const setFrameDriftTolerance = useQuantiseStore((state) => state.setFrameDriftTolerance);

  // Everything the panel *reports* is withdrawn while a newer result is coming, exactly as the
  // symmetry panel's is and for the same reason: all of it would otherwise describe the sheet as it
  // stood before the last dial move, with nothing on screen to say so.
  const readings = busy ? null : strips;
  const frames = readings?.flatMap((strip) => strip.frames) ?? [];
  const moved = frames.filter((frame) => frame.snapped).length;

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">Frame alignment</p>
        {busy && <Badge tone="live">Reading the rows…</Badge>}
        {readings !== null && readings.length > 0 && (
          <>
            <Badge tone="neutral">
              {readings.length} {readings.length === 1 ? 'strip' : 'strips'} · {frames.length} frames
            </Badge>
            {mode === 'SNAP' && (
              <Badge tone={moved > 0 ? 'valid' : 'attention'}>
                {moved === 0 ? 'none moved' : `${String(moved)} moved`}
              </Badge>
            )}
          </>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div className="max-w-md">
          <SelectField
            label="Frame alignment"
            tooltip={QUANTISE_TOOLTIPS.frameAlignment}
            value={mode}
            choices={FRAME_ALIGNMENT_MODE_CHOICES}
            onChange={setFrameAlignment}
          />
        </div>

        {/* Withdrawn where it would change nothing, the conditional every other panel on this tab
            uses: under CHECK every frame is reported and none is moved, so there is nothing for a
            tolerance to admit or refuse. */}
        {mode === 'SNAP' && (
          <RangeField
            label="Drift tolerance"
            tooltip={QUANTISE_TOOLTIPS.frameDriftTolerance}
            value={tolerance}
            min={FRAME_DRIFT_RANGE.min}
            max={FRAME_DRIFT_RANGE.max}
            step={FRAME_DRIFT_RANGE.step}
            // `exact` rather than `off`, because zero here is the strictest position rather than the
            // pass not running — the select above is what switches it off.
            format={(value) => (value === 0 ? 'exact' : `${String(value)} px`)}
            onChange={setFrameDriftTolerance}
          />
        )}
      </div>

      {/* Withdrawn while a newer result is coming, as the symmetry panel's list is: the previous
          job's drifts are numbers about a sheet the dials have already moved on from. */}
      {readings !== null && readings.length > 0 && (
        <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto font-mono text-2xs text-ink-faint">
          {readings.map((strip, index) => (
            <li key={stripKey(strip, index)}>
              {`row ${String(index + 1)} · pitch ${strip.pitch.x.toFixed(1)} × ${strip.pitch.y.toFixed(1)} · `}
              {strip.frames.map((frame) => driftOf(frame.drift, frame.snapped)).join(' ')}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        {guidanceFor(mode, readings, sprites, moved)}
      </p>
    </section>
  );
}

/**
 * A strip's identity in the list, taken from where its first frame sits.
 *
 * The position rather than the index alone, so a row that gains a frame does not shuffle every key
 * below it — the same thing `SymmetryControls` keys its rows on, for the same reason. The index is
 * the fallback for a strip with no frames, which `SMALLEST_STRIP_FRAMES` makes unreachable and which
 * `noUncheckedIndexedAccess` asks for anyway.
 */
function stripKey(strip: SpriteStrip, index: number): string {
  const first = strip.frames[0];
  return first === undefined ? String(index) : `${String(first.box.left)}-${String(first.box.top)}`;
}

/**
 * One frame's drift as the list shows it, with a mark where the move reached it.
 *
 * `+0` rather than `0` for a frame exactly on its slot, because the sign is what the eye scans this
 * list by and a bare zero among signed figures breaks the column it is being read down.
 */
function driftOf(drift: { readonly x: number; readonly y: number }, snapped: boolean): string {
  const signed = (value: number): string => (value < 0 ? String(value) : `+${String(value)}`);
  return `${signed(drift.x)},${signed(drift.y)}${snapped ? '*' : ''}`;
}

/** Which paragraph the state calls for — see `FRAME_ALIGNMENT_GUIDANCE`, which holds all seven. */
function guidanceFor(
  mode: FrameAlignmentMode,
  readings: readonly SpriteStrip[] | null,
  sprites: SpriteSegmentation | null,
  moved: number,
): string {
  if (mode === 'OFF') return FRAME_ALIGNMENT_GUIDANCE.off;
  // No reading on screen: none taken yet, or a newer one on its way. Either way what the panel can
  // honestly say is what it is doing, not what it found.
  if (readings === null) return FRAME_ALIGNMENT_GUIDANCE.pending;
  if (readings.length === 0) {
    // Two different empties, and the difference is the whole of what the reader should do next. No
    // sprites at all is a fact about the *keying*, and the sprite panel above is where its three
    // reasons are stated; sprites that form no long enough row is a fact about this pass, and the
    // gap dial is what moves it. `sprites` being null is the same "nothing yet" state as above,
    // reached one render earlier.
    if (sprites === null) return FRAME_ALIGNMENT_GUIDANCE.pending;
    return sprites.kind === 'SEGMENTED' ? FRAME_ALIGNMENT_GUIDANCE.short : FRAME_ALIGNMENT_GUIDANCE.none;
  }
  if (mode !== 'SNAP') return FRAME_ALIGNMENT_GUIDANCE.read;
  return moved > 0 ? FRAME_ALIGNMENT_GUIDANCE.moved : FRAME_ALIGNMENT_GUIDANCE.refused;
}
