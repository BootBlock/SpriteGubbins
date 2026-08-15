import { useId } from 'react';
import { MANUAL_GRID_RANGE, QUANTISE_SCALE_GUIDANCE, QUANTISE_TOOLTIPS } from '../../constants/quantiser.ts';
import type { TargetSize } from '../../types/output.ts';
import type { ColorPlan, PixelGrid, SheetFacts, SheetScale } from '../../types/quantiser.ts';
import { Tooltip } from '../common/Tooltip.tsx';
import { GridCandidates } from './GridCandidates.tsx';
import { ScaleBadge } from './ScaleBadge.tsx';

interface GridControlsProps {
  /**
   * What one look at the sheet established, or `null` while the worker is still looking.
   *
   * The reading and "no reading yet" arrive as one value rather than as a `scale` beside a
   * `measuring`, because two props can contradict each other and these two never may: an empty badge
   * and a spinner shown at once is the state that tells a user the tab is broken.
   */
  readonly facts: SheetFacts | null;
  /** The studio's target component size, where it names one. */
  readonly target: TargetSize | null;
  /** The scale {@link target} implies for this sheet, or `null` where it implies none. */
  readonly suggested: PixelGrid | null;
  /**
   * The grid actually in force — the user's, or an `EXACT` reading of the sheet behind it.
   *
   * An `ESTIMATED` reading is **not** among the things that can be in force: it reaches the box only
   * by being clicked in the row of candidates below. See `useQuantiseWorker`, which is where the
   * rule is applied.
   */
  readonly grid: PixelGrid | null;
  /**
   * What the studio decided about colour, as the pipeline was handed it.
   *
   * A prop rather than a second store read, exactly as `KeyingControls` takes the keying the
   * transform got: this panel reports what is *happening* to the image beside it, so reading the
   * settings again and re-deciding would be a second answer that can disagree — and did, when a
   * pinned palette left this readout still naming the colour budget it supersedes.
   */
  readonly colorPlan: ColorPlan;
  /** `null` clears the override, handing the decision back to the sheet's own reading. */
  readonly onGridChange: (grid: PixelGrid | null) => void;
}

/**
 * The one decision this tab asks the user to make, the two facts behind it, and the scales worth
 * trying first.
 *
 * Colour is *not* one of them: it comes from the studio — a pinned palette, or the colour budget
 * behind it — which is where a sheet's colour policy is set. A second colour control here would be a
 * second source of truth for a value the generation was made against, so it is shown and changed
 * where it is already changed. What is shown is `colorPlan`, the decision the pipeline was handed,
 * rather than the settings behind it: those two parted company once already.
 *
 * **The prompt does not always state that policy**, which is why the sentence above stops at the
 * studio rather than following it to the prompt: a validation render style withholds the sheet's
 * surface, so section 2 carries no budget line at all. That changes nothing here — the budget still
 * decides what this tab reduces a returned image to — but it is why a plan naming a budget can sit
 * beside a prompt that never mentioned one.
 *
 * The grid box is a plain `<input type="number">` rather than `NumberField`, for the one reason that
 * component documents about itself: it is bound to a stored number and refuses an empty value.
 * Emptiness is meaningful here — "no grid, use whatever the sheet was read as" — and is the state
 * the tab opens in whenever that reading was not an exact one, an **estimate included**: the
 * estimate is offered to click, so an empty box beside a badge naming a number is not a
 * contradiction but the distinction the panel exists to draw.
 */
export function GridControls({ facts, target, suggested, grid, colorPlan, onGridChange }: GridControlsProps) {
  const inputId = useId();
  const scale = facts?.scale ?? null;
  const guidance = scaleGuidance(facts, scale, grid);

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
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
          {/* Not "Measured scale", which the badge below now contradicts in one of its four states:
              an estimate is a reading of the sheet but not a measurement of it, and a label
              asserting otherwise takes back the hedge the badge is there to make. This says what the
              readout is *about* and leaves the badge to say how it was arrived at — and it rhymes
              with "Colours in the sheet" beside it, which is the same kind of fact. */}
          <p className="mb-1.5 text-xs font-semibold text-ink-muted">Scale in the sheet</p>
          <ScaleBadge facts={facts} />
        </div>

        <div className="pb-2.5">
          <p className="mb-1.5 text-xs font-semibold text-ink-muted">Colours in the sheet</p>
          <p className="font-mono text-xs text-ink-faint">
            {facts === null ? 'counting…' : `${facts.colors.toLocaleString()} before reduction`}
          </p>
        </div>

        <div className="pb-2.5">
          <p className="mb-1.5 text-xs font-semibold text-ink-muted">Colour</p>
          <p className="font-mono text-xs text-ink-faint">
            {colorPlan.setting} — {colorPlan.effect}
          </p>
        </div>
      </div>

      <GridCandidates scale={scale} suggested={suggested} onChoose={onGridChange} />

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

      {guidance !== null && <p className="mt-3 text-xs leading-relaxed text-ink-muted">{guidance}</p>}
    </section>
  );
}

/**
 * Which paragraph the panel owes the reader, or `null` where it owes them none.
 *
 * Nothing at all while the sheet is still being read, and nothing for an `EXACT` scale, which is
 * already in the box and needs no explaining.
 *
 * **The two that remain are not the same kind of sentence, and that is why one of them goes away.**
 * `none` is *instructions* — what to type, what a grid of 1 does, what to do about a margin — and
 * every word of it stays true however the reader answers, so it stays up. `estimated` is a
 * statement about the **state**: it says the scale above has not been applied and asks for a click.
 * The moment a grid is in force that has stopped being true, and leaving it up would have the panel
 * asking for something the reader had already done, beside a box holding the number and a preview
 * showing the result.
 */
function scaleGuidance(facts: SheetFacts | null, scale: SheetScale | null, grid: PixelGrid | null) {
  if (facts === null) return null;
  if (scale === null) return QUANTISE_SCALE_GUIDANCE.none;
  if (scale.measurement === 'EXACT') return null;
  return grid === null ? QUANTISE_SCALE_GUIDANCE.estimated : null;
}
