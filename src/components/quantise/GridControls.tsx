import { useId } from 'react';
import { MANUAL_GRID_RANGE, PALETTE_COLOR_COUNTS, QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import type { TargetSize } from '../../types/output.ts';
import type { PixelGrid } from '../../types/quantiser.ts';
import { Badge } from '../common/Badge.tsx';
import { Tooltip } from '../common/Tooltip.tsx';

interface GridControlsProps {
  /** What detection found, or `null` for artwork with no pixel scale at all. */
  readonly detected: PixelGrid | null;
  /** The studio's target component size, where it names one. */
  readonly target: TargetSize | null;
  /** The scale {@link target} implies for this sheet, or `null` where it implies none. */
  readonly suggested: PixelGrid | null;
  /** The grid actually in force — the user's, or the detected one behind it. */
  readonly grid: PixelGrid | null;
  /** `null` clears the override, handing the decision back to detection. */
  readonly onGridChange: (grid: PixelGrid | null) => void;
}

const CANDIDATE_CLASS =
  'rounded-lg border border-foundry-600 bg-foundry-700 px-2.5 py-1 font-mono text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-600 hover:text-ink';

/**
 * The one decision this tab asks the user to make, the two facts behind it, and the scales worth
 * trying first.
 *
 * The colour count is *not* one of them: it comes from the studio's palette limit, which the prompt
 * that produced this sheet already stated. A second colour control here would be a second source of
 * truth for a value the generation was made against, so the limit is shown and changed where it is
 * already changed.
 *
 * The grid box is a plain `<input type="number">` rather than `NumberField`, for the one reason that
 * component documents about itself: it is bound to a stored number and refuses an empty value.
 * Emptiness is meaningful here — "no grid, use whatever was detected" — and is the state the tab
 * opens in when nothing was detected.
 */
export function GridControls({ detected, target, suggested, grid, onGridChange }: GridControlsProps) {
  const paletteLimit = useOutputStore((state) => state.output.paletteLimit);
  const maxColors = PALETTE_COLOR_COUNTS[paletteLimit];
  const inputId = useId();

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-300 hover:border-tab/40">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <label htmlFor={inputId} className="text-xs font-semibold text-ink-muted">
              Pixel grid
            </label>
            <Tooltip text={QUANTISE_TOOLTIPS.grid} hint="Pixel grid" />
          </div>
          <input
            id={inputId}
            type="number"
            value={grid ?? ''}
            min={MANUAL_GRID_RANGE.min}
            max={MANUAL_GRID_RANGE.max}
            step={1}
            onChange={(event) => {
              const entered = event.target.value.trim();
              if (entered === '') {
                onGridChange(null);
                return;
              }
              // A partial or out-of-range entry is ignored rather than committed, as every numeric
              // field in this app does: a grid of 0 would divide the image by nothing.
              const parsed = Number(entered);
              if (
                Number.isInteger(parsed) &&
                parsed >= MANUAL_GRID_RANGE.min &&
                parsed <= MANUAL_GRID_RANGE.max
              ) {
                onGridChange(parsed);
              }
            }}
            className="w-28 rounded-xl border border-foundry-600 bg-foundry-950 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors focus:border-accent"
          />
        </div>

        <div className="pb-2.5">
          <p className="mb-1.5 text-xs font-semibold text-ink-muted">Detected scale</p>
          {detected === null ? (
            <Badge tone="attention">No grid found</Badge>
          ) : (
            <Badge tone="valid">{detected}× — cells are one colour</Badge>
          )}
        </div>

        <div className="pb-2.5">
          <p className="mb-1.5 text-xs font-semibold text-ink-muted">Palette limit</p>
          <p className="font-mono text-xs text-ink-faint">
            {paletteLimit} —{' '}
            {maxColors === null ? 'no colour budget, palette left alone' : `${String(maxColors)} colours`}
          </p>
        </div>
      </div>

      {(detected !== null || suggested !== null) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-muted">Try</span>
          {detected !== null && (
            <button
              type="button"
              onClick={() => {
                onGridChange(detected);
              }}
              className={CANDIDATE_CLASS}
            >
              {detected}× measured
            </button>
          )}
          {suggested !== null && (
            <button
              type="button"
              onClick={() => {
                onGridChange(suggested);
              }}
              className={CANDIDATE_CLASS}
            >
              {suggested}× from the target size
            </button>
          )}
        </div>
      )}

      {suggested !== null && target !== null && (
        // An upper bound, not a measurement: at any coarser scale the sheet could not seat the
        // components asked for, and a generator that left canvas empty drew finer. Hence a scale to
        // click rather than one adopted.
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          Components were asked for at{' '}
          <span className="font-mono text-ink-muted">
            {target.width} × {target.height} px
          </span>
          , which this sheet can hold at no more than {suggested} px per pixel.
        </p>
      )}

      {detected === null && (
        <p className="mt-3 text-xs leading-relaxed text-ink-muted">
          No block of pixels in this image is uniform, which is what smooth artwork downscaled to sprite size
          looks like — the thing the prompt asks for and models deliver anyway. Type the scale the art was
          meant to be drawn at: a 16 × 16 sprite handed back on a 128 × 128 canvas is a grid of 8. A grid of 1
          keeps the size and reduces the palette only.
        </p>
      )}
    </section>
  );
}
