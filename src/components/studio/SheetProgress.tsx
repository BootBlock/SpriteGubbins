import { useMemo } from 'react';
import { useCopiedSheets } from '../../hooks/useCopiedSheets.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { sheetBatch } from '../../utils/sheetBatch.ts';
import { sheetCoverage } from '../../utils/sheetCoverage.ts';
import { Badge } from '../common/Badge.tsx';
import { SheetStepButtons } from '../common/SheetStepButtons.tsx';

/**
 * Where in the batch the prompt below is, whether it has been taken away, and the way on to the next
 * one.
 *
 * **The gap this closes is that a batch was invisible from the studio.** `sheetBatch` has always
 * known both which sheets a configuration asks for and which of them the configuration itself is —
 * the ordinal reaches the series list in the compiled prompt, where `describeSeries` marks one line
 * *(this sheet)* — and none of it reached the screen. A user working an eight-facing rig saw one
 * prompt, one Copy Prompt button and a split drawer they had to open to learn that the job was eight
 * generations; there was nothing anywhere saying which of the eight this was, and no way to move on
 * to the next but to know that the sheet and the facing are two nested controls in the panel opposite
 * and to step them by hand in the right order.
 *
 * **The two step buttons are `SheetStepButtons`**, shared with the Quantise tab's identity panel: a
 * batch is begun here and worked through there, and the rule that a step writes a whole configuration
 * rather than two fields belongs in one place. See that component, which states it.
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
  const isCopied = useCopiedSheets();

  const { sheets, ordinal } = useMemo(() => sheetBatch(category, output), [category, output]);

  const current = sheets[ordinal - 1];
  // A batch of one is a configuration with nothing to work through. `current` cannot be missing
  // beside it — `sheetBatch` resolves its own ordinal against the very list it just built, and
  // degrades to the first sheet — but it is an index, so it is checked rather than asserted.
  if (sheets.length < 2 || current === undefined) return null;

  const copiedCount = sheets.filter((sheet) => isCopied(sheet.output)).length;

  return (
    <section className="animate-fade-in mb-3 rounded-xl border border-foundry-700 bg-foundry-950/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/*
          **A step announces itself, and nothing else in the strip can do it.** Pressing a step
          button rewrites the position, the sheet's name, its coverage and its copied state — while
          focus stays on a button whose own accessible name has not changed, so without this the
          press produces no announcement at all and a screen-reader user has no way to tell whether
          it did anything. `PromptBudgetNotice` and `ComponentBudgetNotice` both settle the same
          pattern; the region is inside the strip rather than around it because the strip only exists
          for a batch, and a step can only happen once it does — so the region is always in the
          document before there is anything for it to announce.

          The buttons are deliberately outside it. They are what the user is operating, and a live
          region containing them would re-announce them on every change.
        */}
        <div aria-live="polite" aria-atomic="true" className="flex flex-wrap items-center gap-2">
          <Badge tone="view">
            Sheet {ordinal} of {sheets.length}
          </Badge>

          <span className="font-mono text-xs font-bold text-ink">
            {current.plan.name} · {sheetCoverage(current.covered, current.assembly)}
          </span>

          {isCopied(current.output) ? <Badge tone="valid">Copied</Badge> : <Badge>Not yet copied</Badge>}
        </div>

        {/* `ml-auto` on the wrapper, which is the flex item — the buttons are inside it and would
            measure it against their own box. */}
        <span className="ml-auto flex items-center gap-2">
          <SheetStepButtons />
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
