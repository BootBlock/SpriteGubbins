import { useOutputStore } from '../../stores/useOutputStore.ts';
import { describeOverage, describeUsage, readPromptBudget } from '../../utils/promptBudget.ts';
import type { BudgetReading } from '../../utils/promptBudget.ts';
import { Badge } from '../common/Badge.tsx';

interface PromptBudgetNoticeProps {
  /** The compiled prompt, passed down rather than recompiled — the preview already has it. */
  readonly prompt: string;
}

/**
 * What each kind of published figure means once a prompt has gone past it.
 *
 * **Two warnings, not one warning reused.** A `CEILING` is where the target stops reading, so the
 * finding is that the specification will not arrive; a `GUIDANCE` figure is where the vendor says
 * quality starts falling, so the finding is that all of it arrives and some of it stops being acted
 * on. Wording the second as the first would tell a Seedream user their prompt is truncated, which
 * ByteDance do not say and which would send them shortening a brief that is being read in full.
 *
 * Both stay gold rather than one of them going quiet, because the palette reserves gold for "needs
 * attention" and both of these are: the prompt is valid and compiles either way, and what is
 * reported is a disagreement with the target, put where the user is about to act on it.
 */
const FINDINGS = {
  CEILING: {
    badge: 'Over this target’s ceiling',
    against: 'a documented',
    consequence:
      'The prompt below is unchanged. Nothing here trims it to fit — a specification silently cut to a ceiling would contract for a sheet it no longer describes. Choose a target that reads the whole prompt, or take this one as a starting point to shorten by hand.',
  },
  GUIDANCE: {
    badge: 'Past this target’s advised length',
    against: 'an advised',
    consequence:
      'The prompt below is unchanged, and this target does read all of it — what the vendor describes past this length is a brief whose detail starts getting dropped rather than one that is cut off. Expect the sheet to answer the specification’s headline and to miss some of its detail, and shorten by hand where a particular detail matters more than the rest.',
  },
} as const;

/**
 * Says so when the prompt has outgrown what the chosen target is documented to take.
 *
 * The app will cheerfully compose a two-thousand-word specification for a model whose text encoder
 * takes seventy-seven tokens, and until this existed said nothing: the word count and token estimate
 * beside it are facts about the prompt, not about whether the target will read it. This is the
 * difference.
 *
 * Shown only where a figure is actually published. Silence here means *nobody stated one* — never
 * that the target is unlimited — so an absent notice is not a reassurance, and the copy has no
 * "within budget" case that could be read as one. What decides it is the budget's own state:
 * `UNPUBLISHED` and `NO_VENDOR` carry no figure to measure against, and `readPromptBudget` answers
 * `null` for both.
 *
 * As with {@link ComponentBudgetNotice}, nothing is trimmed — what is reported is a disagreement,
 * put where the user is about to act on it.
 */
export function PromptBudgetNotice({ prompt }: PromptBudgetNoticeProps) {
  const targetModel = useOutputStore((state) => state.output.targetModel);
  const reading = readPromptBudget(prompt, targetModel);

  // The live region is rendered always, with only its contents conditional — a region added to the
  // document at the same moment as its text is not reliably announced. `Toast` documents why.
  return (
    <div aria-live="polite" aria-atomic="true">
      {reading?.isOver === true && <BudgetFinding reading={reading} />}
    </div>
  );
}

/** The panel itself, worded for whichever kind of figure the prompt has gone past. */
function BudgetFinding({ reading }: { readonly reading: BudgetReading }) {
  const finding = FINDINGS[reading.budget.kind];

  return (
    <section className="animate-fade-in mb-3 rounded-2xl border border-gold/30 bg-gold/10 p-4 shadow-lg">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="attention">{finding.badge}</Badge>
        <p className="text-xs font-bold text-gold">
          {describeUsage(reading)} against {finding.against} {reading.budget.limit} —{' '}
          {describeOverage(reading)}.
        </p>
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">{reading.budget.note}</p>

      <p className="mt-2 text-xs leading-relaxed text-ink-faint">{finding.consequence}</p>
    </section>
  );
}
