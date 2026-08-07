import { useState } from 'react';
import { TARGET_MODELS } from '../../constants/models.ts';
import type { PromptHistoryLog } from '../../types/history.ts';
import { Badge } from '../common/Badge.tsx';

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
  readonly onDelete: (log: PromptHistoryLog) => void;
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
 * different one, so the element under the keyboard's focus survives the press.
 */
export function HistoryEntry({ log, onCopy, onRestore, onDelete }: HistoryEntryProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <li className="space-y-2 rounded-xl border border-foundry-700 bg-foundry-950 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{log.category}</Badge>
        <Badge>{MODEL_NAMES.get(log.modelUsed) ?? log.modelUsed}</Badge>
        <span className="ml-auto font-mono text-[10px] text-ink-faint">
          {TIMESTAMP_FORMAT.format(log.createdAt)}
        </span>
      </div>

      <p className="line-clamp-3 font-mono text-[11px] leading-relaxed text-ink-muted">{log.promptText}</p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-ink-faint">{log.wordCount} words</span>

        <div className="flex items-center gap-2">
          {/* Same button in both states, so pressing it does not move focus off itself. */}
          <button
            type="button"
            aria-label={isConfirmingDelete ? 'Confirm deleting this prompt' : 'Delete this prompt'}
            onClick={() => {
              if (!isConfirmingDelete) {
                setIsConfirmingDelete(true);
                return;
              }
              setIsConfirmingDelete(false);
              onDelete(log);
            }}
            className={
              isConfirmingDelete
                ? 'rounded-lg bg-rose px-2.5 py-1 text-[11px] font-bold text-foundry-950 transition-opacity hover:opacity-90'
                : 'rounded-lg border border-foundry-600 bg-foundry-800 px-2.5 py-1 text-[11px] font-semibold text-rose transition-colors hover:bg-foundry-700'
            }
          >
            {isConfirmingDelete ? 'Delete?' : <span aria-hidden="true">🗑</span>}
          </button>

          {isConfirmingDelete && (
            <button
              type="button"
              onClick={() => {
                setIsConfirmingDelete(false);
              }}
              className="rounded-lg border border-foundry-600 px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onCopy(log);
            }}
            className="rounded-lg border border-foundry-600 bg-foundry-800 px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
          >
            Copy prompt
          </button>
          <button
            type="button"
            onClick={() => {
              onRestore(log);
            }}
            className="rounded-lg bg-accent-strong px-2.5 py-1 text-[11px] font-semibold text-ink transition-colors hover:bg-accent"
          >
            Restore
          </button>
        </div>
      </div>
    </li>
  );
}
