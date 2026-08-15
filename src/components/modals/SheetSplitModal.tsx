import { useMemo } from 'react';
import { NO_COMPONENT_BUDGET } from '../../constants/componentBudget.ts';
import { useCopiedSheets } from '../../hooks/useCopiedSheets.ts';
import { useCopyPrompt } from '../../hooks/useCopyPrompt.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { batchComponentCount } from '../../utils/componentSet.ts';
import { sheetBatch } from '../../utils/sheetBatch.ts';
import { sheetRuns } from '../../utils/sheetRuns.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';
import { SheetSplitRun } from './SheetSplitRun.tsx';

/**
 * The batch a configuration actually is, worked through in one place.
 *
 * `baseline-prompt-new.md` §4 settles on this as the workflow for anything rigged — an eight-facing
 * cut-out rig is 120 pieces, so it is eight runs of fifteen tied together by one identity lock — and
 * documents it as eight manual passes through the studio. It is now also the workflow for a pairing
 * whose inventory outgrew one generation: a character's five-view directional core and its
 * thirty-four limb variants are two sheets of the same deliverable, held together by the same lock.
 * Here the runs are derived rather than performed: `sheetRuns` is a pure function of the studio
 * state, so this component holds no copy of the prompts and cannot show one that has gone stale.
 *
 * **Which runs are done is read from the history**, through `useCopiedSheets`, which states why the
 * obvious `useState` of copied facings is wrong for the workflow this exists to serve. The studio's
 * own batch strip asks the same hook the same question, which is what keeps the two views from
 * disagreeing about how far through a batch the user is.
 *
 * **The row the studio is on is marked**, from the ordinal `sheetBatch` already computes for section
 * 6 of every prompt in the batch. This drawer is the batch laid out at once and the strip is the
 * batch as a position, and a user arriving here from a prompt they were reading needs to see which
 * of these rows produced it.
 */
export function SheetSplitModal() {
  const category = useSubjectStore((state) => state.category);
  const subject = useSubjectStore((state) => state.subject);
  const output = useOutputStore((state) => state.output);
  const toggleSplitModal = useUIStore((state) => state.toggleSplitModal);
  const copyPrompt = useCopyPrompt();
  const isCopied = useCopiedSheets();

  const runs = useMemo(() => sheetRuns(category, subject, output), [category, subject, output]);
  const copiedCount = runs.filter((run) => isCopied(run.output)).length;

  // Which row the studio is on, so the drawer can mark it. Asked of `sheetBatch` rather than
  // recovered from the runs above, because the ordinal is that module's own answer — the same one
  // the assembly-capability section of every prompt in the batch states — and a second search for it
  // second definition of where the user is.
  const { ordinal } = useMemo(() => sheetBatch(category, output), [category, output]);

  // Parsed once for the drawer and handed down, so the total below and the per-sheet figure on every
  // row are sums over the same pieces rather than two parses of one field.
  const additional = parseAdditionalAnatomy(subject.additional_anatomy);

  // What the whole batch asks for — summed over the very runs listed below rather than multiplied
  // out of the two axes, so the figure cannot describe a batch other than this one. It is the number
  // nothing in the app was saying: the studio reports what *this sheet* asks for, which is true of
  // each of the eight and no help to someone deciding whether to start a job of one hundred and
  // twenty.
  const batchTotal = batchComponentCount(category, runs, additional);

  // The cap is stated once here rather than on each of the rows that may be over it: every sheet of
  // a batch is the same configuration bar a facing and a sheet index, so they all share one budget,
  // and eight rows each repeating it would be eight copies of a number that cannot differ.
  const budgetSentence =
    output.componentBudget === NO_COMPONENT_BUDGET
      ? 'Each sheet below states what it asks for; no budget is set, so none of them can be over one.'
      : `Each sheet below states what it asks for, and is flagged where that is over the budget of ${String(output.componentBudget)}.`;

  return (
    <Modal
      title="Split into separate sheets"
      icon="🧩"
      onClose={toggleSplitModal}
      panelClassName="glass-panel flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-foundry-700 shadow-2xl"
    >
      <div className="border-b border-foundry-700 px-6 py-4">
        <p className="text-xs leading-relaxed text-ink-muted">
          Each sheet below is one generation, and together they are the deliverable — some batches repeat one
          component set towards a different facing, others carry a different part of it. Generate them one at
          a time: a single sheet asking for all of it would want more components than a model delivers, which
          comes back as a plausible subset rather than an obvious shortfall.
        </p>

        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          They are numbered in the order to work through them, trunk first, so that each run can be held to
          what you accepted from the ones before it. The row marked{' '}
          <span className="font-mono font-bold text-tab">In the studio</span> is the one the Studio tab is
          composing behind this drawer — copy any of them from here, or step through the same list there.
        </p>

        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          Together they ask for <span className="font-mono font-bold text-ink">{batchTotal} components</span>,
          which is the sum of what each sheet below contracts for. The component budget is a cap on one
          generation, so it is not measured against that total. {budgetSentence}
        </p>
      </div>

      {output.identityLock.trim() === '' ? (
        <div className="border-b border-foundry-700 bg-gold/10 px-6 py-3">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge tone="attention">No identity lock</Badge>
            <p className="text-xs font-bold text-gold">These sheets are not tied to one subject.</p>
          </div>
          <p className="text-xs leading-relaxed text-ink-muted">
            The identity lock is what makes sheet two depict the same individual as sheet one; without it each
            run is free to return a different character in similar colours. Set it under &ldquo;Continuity
            across sheets&rdquo;, ideally from the first sheet you accept — concrete countable attributes
            reproduce, adjectives do not.
          </p>
        </div>
      ) : null}

      <ul className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {runs.map((run, index) => (
          // Keyed on both axes, because neither is unique on its own once a batch can split along
          // both: two sheets of a series share a facing, and every facing of a run list shares a name.
          <SheetSplitRun
            key={`${run.assembly}::${run.plan.name}`}
            run={run}
            category={category}
            additional={additional}
            ordinal={index + 1}
            total={runs.length}
            isCurrent={index + 1 === ordinal}
            isCopied={isCopied(run.output)}
            onCopy={(target) => {
              void copyPrompt(target);
            }}
          />
        ))}
      </ul>

      <div className="border-t border-foundry-700 px-6 py-4">
        <span className="font-mono text-2xs text-ink-faint">
          {copiedCount} of {runs.length} copied
        </span>
      </div>
    </Modal>
  );
}
