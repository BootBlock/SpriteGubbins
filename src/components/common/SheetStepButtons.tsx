import { useMemo } from 'react';
import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { sheetBatch } from '../../utils/sheetBatch.ts';
import { ControlTooltip } from './ControlTooltip.tsx';

/**
 * The two step buttons, so the pair stays matched — they sit side by side, and a difference between
 * them reads as a mistake rather than as emphasis. The disabled case is the batch's two ends, which
 * are reached often enough that it is a state rather than an edge.
 *
 * Its disabled treatment is the app's, not a second one: `text-ink-faint` with the hover suppressed,
 * as `HistoryFooter` spells it. An `opacity-50` layered on top of
 * that ink would composite to roughly 2.4:1 against `foundry-950` — a third of the contrast every
 * other disabled control in the app is rendered at, and on the state a user *starts* every batch in.
 */
const STEP_BUTTON =
  'rounded-lg border border-foundry-600 bg-foundry-950 px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors duration-390 hover:border-tab/50 hover:bg-foundry-700 hover:text-ink disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:border-foundry-600 disabled:hover:bg-foundry-950';

/**
 * The way from the sheet the studio is composing to the one before or after it in the same batch.
 *
 * **Stepping is a whole configuration, not a field.** Every entry of the batch carries `output` — the
 * studio's own configuration with its facing and its place in the series varied — so moving to the
 * next sheet is writing that entry back, and the studio cannot land on a combination the batch does
 * not contain. Setting the two fields separately is what this replaces: it puts a sheet index and a
 * stale facing into the compiler between renders, and on the eight-compass pairing, where the series
 * has a sheet the other sets do not, it can name a sheet that is not there at all.
 *
 * **Shared rather than owned by the studio, because the batch is worked from two tabs.** The studio's
 * batch strip is where a reader starts one, and the Quantise tab is where they spend the rest of it:
 * a sheet comes back from a generator, it is dropped here, it is tuned and taken away, and only then
 * is there anything to step *to*. A second pair of buttons written for that tab would be a second
 * copy of the rule above, on the one control whose whole point is that it cannot land off the batch.
 *
 * It renders nothing for a configuration that is a single generation, which is the same test the
 * split button and the studio's strip apply: two step buttons with nowhere to go are controls with
 * nothing to do.
 */
export function SheetStepButtons() {
  const category = useSubjectStore((state) => state.category);
  const output = useOutputStore((state) => state.output);
  const setOutputConfig = useOutputStore((state) => state.setOutputConfig);

  const { sheets, ordinal } = useMemo(() => sheetBatch(category, output), [category, output]);

  if (sheets.length < 2) return null;

  const previous = sheets[ordinal - 2];
  const next = sheets[ordinal];

  return (
    <>
      <ControlTooltip hint="Previous sheet" text={STUDIO_ACTION_TOOLTIPS.previousSheet}>
        <button
          type="button"
          disabled={previous === undefined}
          onClick={() => {
            if (previous !== undefined) setOutputConfig(previous.output);
          }}
          className={STEP_BUTTON}
        >
          {/* Decorative, so hidden — the word beside it carries the whole meaning, and an
              unhidden glyph is read out as "left arrow" in the middle of the label. Every other
              glyph-bearing button in the app hides its icon the same way. */}
          <span aria-hidden="true">←</span> Previous
        </button>
      </ControlTooltip>

      <ControlTooltip hint="Next sheet" text={STUDIO_ACTION_TOOLTIPS.nextSheet}>
        <button
          type="button"
          disabled={next === undefined}
          onClick={() => {
            if (next !== undefined) setOutputConfig(next.output);
          }}
          className={STEP_BUTTON}
        >
          Next sheet <span aria-hidden="true">→</span>
        </button>
      </ControlTooltip>
    </>
  );
}
