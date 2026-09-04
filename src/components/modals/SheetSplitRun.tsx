import { resolveRigMode, sheetSeriesFor } from '../../constants/sheetPlans/index.ts';
import { DIALOG_TOOLTIPS } from '../../constants/tooltips/index.ts';
import type { AnatomyComponent } from '../../types/anatomy.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { exceedsComponentBudget } from '../../utils/componentBudget.ts';
import { sheetComponentCount } from '../../utils/componentSet.ts';
import { countWords } from '../../utils/promptMetrics.ts';
import { sheetCoverage } from '../../utils/sheetCoverage.ts';
import type { SheetRun } from '../../utils/sheetRuns.ts';
import { Badge } from '../common/Badge.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { DepthOrderNote } from './DepthOrderNote.tsx';

interface SheetSplitRunProps {
  readonly run: SheetRun;
  /**
   * The subject's category, which is what decides whether the rig below is real. A run carries the
   * configuration it compiles from, and that configuration can name a rig its category has no joints
   * for — so the row would otherwise describe a depth order the prompt beside it never mentions.
   */
  readonly category: SubjectCategory;
  /**
   * The subject's own additional anatomy, parsed — the half of this sheet's component count that the
   * plan does not supply. Passed in rather than read from the store because the row is handed
   * everything else it draws, and parsing it once for the whole drawer is also what keeps the figure
   * below and the batch total above summing the same pieces.
   */
  readonly additional: readonly AnatomyComponent[];
  /** Position in the batch, from one — what the user counts off as they work through it. */
  readonly ordinal: number;
  readonly total: number;
  /**
   * Whether this is the sheet the studio itself is composing — the one behind the drawer, and the
   * one the series list in every prompt of the batch marks *(this sheet)*. Marked here so the drawer and
   * the studio agree about where the user is; without it the two views describe the same batch and
   * only one of them says which sheet is in front of you.
   */
  readonly isCurrent: boolean;
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
 * The depth order is shown because it is the thing that actually differs between the sheets — the
 * pieces are identical, and which side renders in front of the body is what makes a west-facing
 * sheet not simply a mirrored east-facing one. A row that named only the facing would leave the user
 * unable to tell whether the split had done anything.
 *
 * It appears **only for a cut-out rig**, because that is the only case in which the prompt carries
 * it: the template's depth-order block sits inside `[IF:RIG_MODE=CUTOUT_RIG]`. Showing it for a pose
 * library would describe something the sheet was never asked for — the same reason `RiggingFields`
 * hides the joint and overlap controls rather than leaving them visible and inert. The rig is read
 * through `resolveRigMode` rather than off the run, because that is what the compiler did to reach
 * the prompt in the disclosure below it — and it is asked of the run's whole pairing rather than of
 * the one sheet, because a rig is a claim about the set that assembles together.
 *
 * **What it says is `DepthOrderNote`'s, and it is asked of everything the sheet covers.** A rig on a
 * multi-view core draws every piece at each of the yaws section 3 lists, so a single sentence there
 * is four false claims and a true one. On an eight-compass core the two sheets are already told
 * apart by `chunkName` in the label above — cardinal facings against diagonal — and what the depth
 * order adds is *what that difference does to the artwork*, which is the same thing it adds on a
 * facing split. That component resolves the camera too, since a plan view has no near side for the
 * question to be about.
 *
 * The prompt itself sits behind a `<details>` rather than being laid out in full. Eight prompts of
 * a thousand words each is not a list anybody can scan, and the summary is what the user is choosing
 * between; the platform's own disclosure widget is keyboard-operable and announced without help.
 *
 * **Every row states what its own sheet asks for, and flags it where that is over the budget.** The
 * budget is a cap on one generation, so it has an answer for each sheet of a batch — but the only
 * sheet ever compared to it used to be the one the studio's sheet control happened to be on. That is
 * exact on the facing axis, where all eight runs carry the same plan and therefore the same count,
 * and silently wrong on the series axis, where a fifteen-component directional core sits beside a
 * thirty-four-component articulation sheet: the user's only route to the warning was to go and select
 * the other sheet, which is the errand the drawer exists to save them. The count is shown whether or
 * not it bites, because a chip with no figure beside it says a number is wrong without saying which.
 *
 * The cap is read off `run.output` rather than taken as a prop: every run is the studio's
 * configuration with a facing and a sheet index varied, so the budget travels with the sheet — and
 * the count and the cap it is measured against then come from the one configuration that compiled
 * the prompt in the disclosure below.
 */
export function SheetSplitRun({
  run,
  category,
  additional,
  ordinal,
  total,
  isCurrent,
  isCopied,
  onCopy,
}: SheetSplitRunProps) {
  const componentCount = sheetComponentCount(category, run, additional);
  const isOverBudget = exceedsComponentBudget(componentCount, run.output.componentBudget);

  return (
    <li className="rounded-xl border border-foundry-700 bg-foundry-950 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-2xs text-ink-faint">
          Sheet {ordinal} of {total}
        </span>
        <span className="font-mono text-xs font-bold text-ink">
          {/* The facing, or how many of them — a sheet that draws five and a sheet that draws one
              would otherwise both read as their assembly direction and claim the same coverage. The
              answer is `sheetCoverage`'s, shared with the studio's batch strip and the copy
              confirmation, because three places naming a sheet is three chances to name it
              differently. */}
          {run.plan.name} · {sheetCoverage(run.covered, run.assembly)}
        </span>
        {/* The view's own colour, which is what the palette reserves for "this one, here" — the
            copied chips beside it mean the same thing on every row and keep their fixed tones. */}
        {isCurrent && <Badge tone="view">In the studio</Badge>}
        {isCopied ? <Badge tone="valid">Copied</Badge> : <Badge>Not yet copied</Badge>}
        {/* Gold rather than rose: the configuration is valid and the prompt compiles, and what is
            being reported is that a model asked for this many components will most likely merge or
            drop some of them — the same claim, in the same tone, as the studio's own notice. */}
        {isOverBudget && <Badge tone="attention">Over budget</Badge>}
      </div>

      {resolveRigMode(
        category,
        sheetSeriesFor(category, run.output.directionalMode, run.output.directions),
        run.output.rigMode,
      ) === 'CUTOUT_RIG' && <DepthOrderNote run={run} category={category} />}

      <div className="flex flex-wrap items-center gap-3">
        <ControlTooltip hint="Copy this sheet" text={DIALOG_TOOLTIPS.copySheetPrompt}>
          <button
            type="button"
            onClick={() => {
              onCopy(run);
            }}
            className="rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-extrabold text-foundry-950 shadow-md transition-colors hover:bg-accent"
          >
            Copy this sheet
          </button>
        </ControlTooltip>

        {/* Gold on the figure as well as the chip, so the warning names the number it is about —
            the drawer states the cap once, above, rather than repeating it on every row. */}
        <span className={`font-mono text-2xs ${isOverBudget ? 'text-gold' : 'text-ink-faint'}`}>
          {componentCount} components
        </span>

        <span className="font-mono text-2xs text-ink-faint">{countWords(run.promptText)} words</span>
      </div>

      {/* The one control in this row with no guidance card, and it is the markup rather than a
          judgement: a `<summary>` has to be the first child of its `<details>`, so there is nowhere
          to put a wrapper that would not stop it being the disclosure's control. Its label says the
          whole of what it does, which is why it is an acceptable place for the exception to fall. */}
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
