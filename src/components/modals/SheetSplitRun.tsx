import { DEPTH_ORDER_TEXT } from '../../constants/promptText/index.ts';
import { resolveRigMode } from '../../constants/sheetPlans/index.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { countWords } from '../../utils/promptCompiler.ts';
import type { SheetRun } from '../../utils/sheetRuns.ts';
import { Badge } from '../common/Badge.tsx';

interface SheetSplitRunProps {
  readonly run: SheetRun;
  /**
   * The subject's category, which is what decides whether the rig below is real. A run carries the
   * configuration it compiles from, and that configuration can name a rig its category has no joints
   * for — so the row would otherwise describe a depth order the prompt beside it never mentions.
   */
  readonly category: SubjectCategory;
  /** Position in the batch, from one — what the user counts off as they work through it. */
  readonly ordinal: number;
  readonly total: number;
  readonly isCopied: boolean;
  readonly onCopy: (run: SheetRun) => void;
}

/**
 * One sheet of a split: what it carries, which facing it draws, what that does to the depth order,
 * and a way to take it away.
 *
 * **Both halves of the label are shown, because a batch can split two ways and the row cannot know
 * which.** A rig over eight facings is one inventory eight times, so its facing is what varies; a
 * character's five-view core and its articulation sheet are two inventories on one facing, so its
 * name is. Rendering both unconditionally costs a word on the batches where one of them is constant,
 * and rendering one conditionally would need the row to be told what the rest of the batch looks
 * like.
 *
 * The depth order is shown because it is the thing that actually differs between facings — the
 * pieces are identical, and which side renders in front of the body is what makes a west-facing
 * sheet not simply a mirrored east-facing one. A row that named only the facing would leave the user
 * unable to tell whether the split had done anything.
 *
 * It appears **only for a cut-out rig**, because that is the only case in which the prompt carries
 * it: the template's depth-order block sits inside `[IF:RIG_MODE=CUTOUT_RIG]`. Showing it for a pose
 * library would describe something the sheet was never asked for — the same reason `RiggingFields`
 * hides the joint and overlap controls rather than leaving them visible and inert. The rig is read
 * through `resolveRigMode` rather than off the run, because that is what the compiler did to reach
 * the prompt in the disclosure below it.
 *
 * The prompt itself sits behind a `<details>` rather than being laid out in full. Eight prompts of
 * a thousand words each is not a list anybody can scan, and the summary is what the user is choosing
 * between; the platform's own disclosure widget is keyboard-operable and announced without help.
 */
export function SheetSplitRun({ run, category, ordinal, total, isCopied, onCopy }: SheetSplitRunProps) {
  return (
    <li className="rounded-xl border border-foundry-700 bg-foundry-950 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-2xs text-ink-faint">
          Sheet {ordinal} of {total}
        </span>
        <span className="font-mono text-xs font-bold text-ink">
          {run.plan.name} ·{' '}
          {/* The facing, or how many of them — a sheet that draws five and a sheet that draws one
              would otherwise both read as their assembly direction and claim the same coverage. */}
          {run.covered.length > 1 ? `${run.covered.length} facings` : run.assembly}
        </span>
        {isCopied ? <Badge tone="valid">Copied</Badge> : <Badge>Not yet copied</Badge>}
      </div>

      {resolveRigMode(category, run.output.rigMode) === 'CUTOUT_RIG' && (
        <p className="mb-3 text-xs leading-relaxed text-ink-muted">{DEPTH_ORDER_TEXT[run.assembly]}</p>
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
