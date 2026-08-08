import { useEffect, useMemo } from 'react';
import { useCopyPrompt } from '../../hooks/useCopyPrompt.ts';
import { useHistoryStore } from '../../stores/useHistoryStore.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { sheetIdentity, sheetRuns } from '../../utils/sheetRuns.ts';
import type { SheetRun } from '../../utils/sheetRuns.ts';
import { Badge } from '../common/Badge.tsx';
import { Modal } from '../common/Modal.tsx';
import { SheetSplitRun } from './SheetSplitRun.tsx';

/**
 * The batch an N-direction rig actually is: one sheet per facing, worked through in one place.
 *
 * `baseline-prompt-new.md` §4 settles on this as the workflow for anything rigged — an eight-facing
 * cut-out rig is 120 pieces, so it is eight runs of fifteen tied together by one identity lock — and
 * documents it as eight manual passes through the studio. Here the runs are derived rather than
 * performed: `sheetRuns` is a pure function of the studio state, so this component holds no copy of
 * the prompts and cannot show one that has gone stale.
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

  return (
    <Modal
      title="Split into one sheet per direction"
      icon="🧩"
      onClose={toggleSplitModal}
      panelClassName="glass-panel flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-foundry-700 shadow-2xl"
    >
      <div className="border-b border-foundry-700 px-6 py-4">
        <p className="text-xs leading-relaxed text-ink-muted">
          Each sheet below asks for the same components drawn towards a different facing. Generate them one at
          a time — a single sheet covering every facing would ask for more components than a model delivers,
          which comes back as a plausible subset rather than an obvious shortfall.
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
          <SheetSplitRun
            key={run.direction}
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
