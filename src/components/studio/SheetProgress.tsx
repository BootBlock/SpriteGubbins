import { useMemo } from 'react';
import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useCopiedSheets } from '../../hooks/useCopiedSheets.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { sheetBatch } from '../../utils/sheetBatch.ts';
import { sheetCoverage } from '../../utils/sheetCoverage.ts';
import { Badge } from '../common/Badge.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

/**
 * The two step buttons, so the pair stays matched — they sit side by side, and a difference between
 * them reads as a mistake rather than as emphasis. The disabled case is the batch's two ends, which
 * are reached often enough that it is a state rather than an edge.
 */
const STEP_BUTTON =
  'rounded-lg border border-foundry-600 bg-foundry-950 px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors duration-390 hover:border-tab/50 hover:bg-foundry-700 hover:text-ink disabled:cursor-not-allowed disabled:border-foundry-700 disabled:bg-foundry-950 disabled:text-ink-faint disabled:opacity-50';

/**
 * Where in the batch the prompt below is, whether it has been taken away, and the way on to the next
 * one.
 *
 * **The gap this closes is that a batch was invisible from the studio.** `sheetBatch` has always
 * known both which sheets a configuration asks for and which of them the configuration itself is —
 * the ordinal reaches section 6 of the compiled prompt, where `describeSeries` marks one line
 * *(this sheet)* — and none of it reached the screen. A user working an eight-facing rig saw one
 * prompt, one Copy Prompt button and a split drawer they had to open to learn that the job was eight
 * generations; there was nothing anywhere saying which of the eight this was, and no way to move on
 * to the next but to know that the sheet and the facing are two nested controls in the panel opposite
 * and to step them by hand in the right order.
 *
 * **Stepping is a whole configuration, not a field.** Every entry of the batch carries `output` — the
 * studio's own configuration with its facing and its place in the series varied — so moving to the
 * next sheet is writing that entry back, and the studio cannot land on a combination the batch does
 * not contain. Setting the two fields separately is what this replaces: it puts a sheet index and a
 * stale facing into the compiler between renders, and on the eight-compass pairing, where the series
 * has a sheet the other sets do not, it can name a sheet that is not there at all.
 *
 * **Which sheets are done is read from the history**, through {@link useCopiedSheets}, for the reason
 * that hook states — the workflow expects the user to leave mid-batch and come back, and the split
 * drawer has to give the same answer as this strip or one of them is lying.
 *
 * It renders nothing for a configuration that is a single generation, which is the same test the
 * split button applies: a position in a batch of one is not information, and two step buttons with
 * nowhere to go are controls with nothing to do.
 */
export function SheetProgress() {
  const category = useSubjectStore((state) => state.category);
  const output = useOutputStore((state) => state.output);
  const setOutputConfig = useOutputStore((state) => state.setOutputConfig);
  const isCopied = useCopiedSheets();

  const { sheets, ordinal } = useMemo(() => sheetBatch(category, output), [category, output]);

  const current = sheets[ordinal - 1];
  // A batch of one is a configuration with nothing to work through. `current` cannot be missing
  // beside it — `sheetBatch` resolves its own ordinal against the very list it just built, and
  // degrades to the first sheet — but it is an index, so it is checked rather than asserted.
  if (sheets.length < 2 || current === undefined) return null;

  const previous = sheets[ordinal - 2];
  const next = sheets[ordinal];
  const copiedCount = sheets.filter((sheet) => isCopied(sheet.output)).length;

  return (
    <section className="mb-3 rounded-xl border border-foundry-700 bg-foundry-950/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="view">
          Sheet {ordinal} of {sheets.length}
        </Badge>

        <span className="font-mono text-xs font-bold text-ink">
          {current.plan.name} · {sheetCoverage(current)}
        </span>

        {isCopied(current.output) ? <Badge tone="valid">Copied</Badge> : <Badge>Not yet copied</Badge>}

        {/* `ml-auto` on the wrapper, which is the flex item — the buttons are inside it and would
            measure it against their own box. */}
        <span className="ml-auto flex items-center gap-2">
          <ControlTooltip hint="Previous sheet" text={STUDIO_ACTION_TOOLTIPS.previousSheet}>
            <button
              type="button"
              disabled={previous === undefined}
              onClick={() => {
                if (previous !== undefined) setOutputConfig(previous.output);
              }}
              className={STEP_BUTTON}
            >
              ← Previous
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
              Next sheet →
            </button>
          </ControlTooltip>
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-ink-muted">
        This configuration takes {sheets.length} generations, and the prompt below is one of them. Copy this
        sheet, generate it, and step on once you have a result you are keeping — in the order given, because
        the identity lock you write from the first sheet you accept is what makes the rest depict the same
        subject.
      </p>

      {/* The same figure the split drawer's footer carries, from the same history. A strip that
          counted only the sheets it had watched being copied would disagree with the drawer the
          moment either was reopened. */}
      <p className="mt-2 font-mono text-2xs text-ink-faint">
        {copiedCount} of {sheets.length} copied
      </p>
    </section>
  );
}
