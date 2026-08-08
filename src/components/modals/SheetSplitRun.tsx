import { DEPTH_ORDER_TEXT } from '../../constants/promptText/index.ts';
import { countWords } from '../../utils/promptCompiler.ts';
import type { SheetRun } from '../../utils/sheetRuns.ts';
import { Badge } from '../common/Badge.tsx';

interface SheetSplitRunProps {
  readonly run: SheetRun;
  /** Position in the batch, from one — what the user counts off as they work through it. */
  readonly ordinal: number;
  readonly total: number;
  readonly isCopied: boolean;
  readonly onCopy: (run: SheetRun) => void;
}

/**
 * One sheet of a split: which facing it draws, what that does to the depth order, and a way to take
 * it away.
 *
 * The depth order is shown because it is the thing that actually differs between runs — the pieces
 * are identical, and which arm renders in front of the torso is what makes a west-facing sheet not
 * simply a mirrored east-facing one. A row that named only the facing would leave the user unable
 * to tell whether the split had done anything.
 *
 * It appears **only for a cut-out rig**, because that is the only case in which the prompt carries
 * it: the template's depth-order block sits inside `[IF:RIG_MODE=CUTOUT_RIG]`. Showing it for a pose
 * library would describe something the sheet was never asked for — the same reason `RiggingFields`
 * hides the joint and overlap controls rather than leaving them visible and inert.
 *
 * The prompt itself sits behind a `<details>` rather than being laid out in full. Eight prompts of
 * a thousand words each is not a list anybody can scan, and the summary is what the user is choosing
 * between; the platform's own disclosure widget is keyboard-operable and announced without help.
 */
export function SheetSplitRun({ run, ordinal, total, isCopied, onCopy }: SheetSplitRunProps) {
  return (
    <li className="rounded-xl border border-foundry-700 bg-foundry-950 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-2xs text-ink-faint">
          Sheet {ordinal} of {total}
        </span>
        <span className="font-mono text-xs font-bold text-ink">{run.direction}</span>
        {isCopied ? <Badge tone="valid">Copied</Badge> : <Badge>Not yet copied</Badge>}
      </div>

      {run.output.rigMode === 'CUTOUT_RIG' && (
        <p className="mb-3 text-xs leading-relaxed text-ink-muted">{DEPTH_ORDER_TEXT[run.direction]}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            onCopy(run);
          }}
          className="rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-extrabold text-ink shadow-md transition-colors hover:bg-accent"
        >
          Copy this sheet
        </button>

        <span className="font-mono text-2xs text-ink-faint">{countWords(run.promptText)} words</span>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-ink-faint transition-colors hover:text-ink-muted">
          Read the prompt for this sheet
        </summary>
        <pre className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-foundry-700 bg-foundry-950 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-muted select-all">
          {run.promptText}
        </pre>
      </details>
    </li>
  );
}
