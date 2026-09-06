import { TARGET_MODELS } from '../../constants/models.ts';
import { HISTORY_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useConfirmInPlace } from '../../hooks/useConfirmInPlace.ts';
import type { PromptHistoryLog } from '../../types/history.ts';
import { Badge } from '../common/Badge.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

/** Model display names, keyed by id, so an entry can name the generator it was written for. */
const MODEL_NAMES = new Map(TARGET_MODELS.map((model) => [model.id, model.name]));

/**
 * When an entry was recorded. Built once: constructing a formatter per row is the expensive part of
 * `Intl`, and every row in the drawer wants the same one.
 */
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

interface HistoryEntryProps {
  readonly log: PromptHistoryLog;
  readonly onCopy: (log: PromptHistoryLog) => void;
  readonly onRestore: (log: PromptHistoryLog) => void;
  /**
   * Returns the write, so the confirmation can wait for it. The row has gone by the time it settles,
   * and where the keyboard lands afterwards is decided from the page as it is *then* — see
   * {@link useConfirmInPlace}.
   */
  readonly onDelete: (log: PromptHistoryLog) => Promise<void>;
}

/**
 * One recorded prompt, with the three things worth doing to it.
 *
 * **Copy** takes the compiled text; **restore** puts the studio state that produced it back into the
 * studio, which is possible because the row stores that state alongside the text rather than only
 * the text. An entry recorded before those columns existed still restores — to its category's
 * defaults — because `db/rows.ts` repairs a missing payload instead of rejecting the row.
 *
 * **Delete** asks first, for the reason the drawer's own "Clear history" does: an entry is not
 * rebuildable from what is on screen. It asks on the button itself rather than by swapping in a
 * different one, so the element under the keyboard's focus survives the press — which is why this is
 * the one of the app's five confirmations that attaches no `cancelRef`: there is nothing for the
 * arriving question to rescue the focus from, and moving it to Cancel would turn Enter-then-Enter
 * into Enter-then-cancelled. The two presses *after* the ask are the ones that lost the keyboard,
 * and {@link useConfirmInPlace} is where all three edges of that live now.
 *
 * **Every action names the entry it acts on.** A prompt has no name, so the accessible names are
 * built from what the row already shows — its category and its timestamp — because a drawer holding
 * a hundred entries is otherwise three names repeated a hundred times, and a reader who meets one of
 * those controls on its own has nothing to tell it from the row above.
 */
export function HistoryEntry({ log, onCopy, onRestore, onDelete }: HistoryEntryProps) {
  const { isConfirming, attachAsk, ask, cancel, confirm } = useConfirmInPlace();
  // One phrase in all five names, so the entry is identified the same way whichever control a reader
  // meets — and it is the row's own vocabulary rather than a second description written beside it.
  const entry = `the ${log.category} prompt from ${TIMESTAMP_FORMAT.format(log.createdAt)}`;

  return (
    <li className="space-y-2 rounded-xl border border-foundry-700 bg-foundry-950 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{log.category}</Badge>
        <Badge>{MODEL_NAMES.get(log.modelUsed) ?? log.modelUsed}</Badge>
        <span className="ml-auto font-mono text-2xs text-ink-faint">
          {TIMESTAMP_FORMAT.format(log.createdAt)}
        </span>
      </div>

      <p className="line-clamp-3 font-mono text-xs leading-relaxed text-ink-muted">{log.promptText}</p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-2xs text-ink-faint">{log.wordCount} words</span>

        <div className="flex items-center gap-2">
          {/* Same button in both states, so pressing it does not move focus off itself — and the
              guidance changes with it, since the second press is the one that cannot be taken back. */}
          <ControlTooltip
            hint={isConfirming ? 'Delete?' : 'Delete this prompt'}
            text={
              isConfirming ? HISTORY_ACTION_TOOLTIPS.confirmDeleteEntry : HISTORY_ACTION_TOOLTIPS.deleteEntry
            }
          >
            <button
              ref={attachAsk}
              type="button"
              aria-label={isConfirming ? `Confirm deleting ${entry}` : `Delete ${entry}`}
              onClick={() => {
                if (!isConfirming) {
                  ask();
                  return;
                }
                void confirm(() => onDelete(log));
              }}
              className={
                isConfirming
                  ? 'rounded-lg bg-rose px-2.5 py-1 text-xs font-bold text-foundry-950 transition-opacity hover:opacity-90'
                  : 'rounded-lg border border-foundry-600 bg-foundry-800 px-2.5 py-1 text-xs font-semibold text-rose transition-colors hover:bg-foundry-700'
              }
            >
              {isConfirming ? 'Delete?' : <span aria-hidden="true">🗑</span>}
            </button>
          </ControlTooltip>

          {isConfirming && (
            <ControlTooltip hint="Cancel" text={HISTORY_ACTION_TOOLTIPS.cancelDeleteEntry}>
              <button
                type="button"
                aria-label={`Keep ${entry}`}
                onClick={cancel}
                className="rounded-lg border border-foundry-600 px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
              >
                Cancel
              </button>
            </ControlTooltip>
          )}

          <ControlTooltip hint="Copy prompt" text={HISTORY_ACTION_TOOLTIPS.copyEntry}>
            <button
              type="button"
              aria-label={`Copy ${entry}`}
              onClick={() => {
                onCopy(log);
              }}
              className="rounded-lg border border-foundry-600 bg-foundry-800 px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
            >
              Copy prompt
            </button>
          </ControlTooltip>
          <ControlTooltip hint="Restore" text={HISTORY_ACTION_TOOLTIPS.restoreEntry}>
            <button
              type="button"
              aria-label={`Restore ${entry} into the studio`}
              onClick={() => {
                onRestore(log);
              }}
              className="rounded-lg bg-accent-strong px-2.5 py-1 text-xs font-semibold text-foundry-950 transition-colors hover:bg-accent"
            >
              Restore
            </button>
          </ControlTooltip>
        </div>
      </div>
    </li>
  );
}
