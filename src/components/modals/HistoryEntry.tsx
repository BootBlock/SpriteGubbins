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
}

/**
 * One recorded prompt.
 *
 * The action is **copy**, not "load into the studio", and that is a consequence of what a history row
 * holds: the compiled prompt text, its category, its word count and its target model — not the
 * subject and output configuration that produced it. Offering to restore the studio from this would
 * mean reconstructing settings the row never stored. The prompt itself is the artefact worth keeping,
 * so getting it back is getting it onto the clipboard.
 */
export function HistoryEntry({ log, onCopy }: HistoryEntryProps) {
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

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-ink-faint">{log.wordCount} words</span>
        <button
          type="button"
          onClick={() => {
            onCopy(log);
          }}
          className="rounded-lg border border-foundry-600 bg-foundry-800 px-2.5 py-1 text-[11px] font-semibold text-accent-soft transition-colors hover:bg-foundry-700"
        >
          Copy prompt
        </button>
      </div>
    </li>
  );
}
