import { useEffect, useMemo } from 'react';
import { useCopyPrompt } from '../../hooks/useCopyPrompt.ts';
import { useHistoryStore } from '../../stores/useHistoryStore.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { batchComponentCount } from '../../utils/componentSet.ts';
import { sheetIdentity, sheetRuns } from '../../utils/sheetRuns.ts';
import type { SheetRun } from '../../utils/sheetRuns.ts';
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
 * **Which runs are done is read from the history, not tracked here.** The obvious `useState` of
 * copied facings looks right and is wrong for the workflow this exists to serve: §5 advises writing
 * the identity lock from the first sheet you accept, so the user is *expected* to close the drawer
 * mid-batch, go and set it, and come back — at which point local state has forgotten all of it.
 * "Copied" already has a durable meaning in this app, which is that the prompt is in the history.
 *
 * Matching is by {@link sheetIdentity} rather than by prompt text, for the second half of the same
 * reason: adding that identity lock rewrites every run's text, so a text match would have wiped the
 * progress at exactly the moment the advice was followed.
 */
export function SheetSplitModal() {
  const category = useSubjectStore((state) => state.category);
  const subject = useSubjectStore((state) => state.subject);
  const output = useOutputStore((state) => state.output);
  const historyLogs = useHistoryStore((state) => state.historyLogs);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const toggleSplitModal = useUIStore((state) => state.toggleSplitModal);
  const copyPrompt = useCopyPrompt();

  // Read on open, as the history drawer does, so a batch begun in an earlier session comes back
  // with its finished runs already ticked off. Failures raise a toast inside the store.
  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const runs = useMemo(() => sheetRuns(category, subject, output), [category, subject, output]);

  const takenAway = useMemo(
    () => new Set(historyLogs.map((log) => sheetIdentity(log.category, log.subject, log.output))),
    [historyLogs],
  );
  const isCopied = (run: SheetRun) => takenAway.has(sheetIdentity(category, subject, run.output));
  const copiedCount = runs.filter(isCopied).length;

  // What the whole batch asks for — summed over the very runs listed below rather than multiplied
  // out of the two axes, so the figure cannot describe a batch other than this one. It is the number
  // nothing in the app was saying: the studio reports what *this sheet* asks for, which is true of
  // each of the eight and no help to someone deciding whether to start a job of one hundred and
  // twenty.
  const batchTotal = batchComponentCount(category, runs, parseAdditionalAnatomy(subject.additional_anatomy));

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
          Together they ask for <span className="font-mono font-bold text-ink">{batchTotal} components</span>,
          which is the sum of what each sheet below contracts for. The component budget is a cap on one
          generation, so it is not measured against that total — the studio checks it against the sheet you
          have configured.
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
            ordinal={index + 1}
            total={runs.length}
            isCopied={isCopied(run)}
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
