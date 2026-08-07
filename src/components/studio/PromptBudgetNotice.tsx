import { useOutputStore } from '../../stores/useOutputStore.ts';
import { readPromptBudget } from '../../utils/promptBudget.ts';
import { Badge } from '../common/Badge.tsx';

interface PromptBudgetNoticeProps {
  /** The compiled prompt, passed down rather than recompiled — the preview already has it. */
  readonly prompt: string;
}

/**
 * Says so when the prompt has outgrown what the chosen target is documented to read.
 *
 * The app will cheerfully compose a two-thousand-word specification for a model whose text encoder
 * takes seventy-seven tokens, and until now said nothing: the word count and token estimate beside
 * it are facts about the prompt, not about whether the target will read it. This is the difference.
 *
 * Shown only where a ceiling is actually published. Silence here means *nobody stated a figure* —
 * never that the target is unlimited — so an absent notice is not a reassurance, and the copy has
 * no "within budget" case that could be read as one.
 *
 * Gold, because the palette reserves it for "needs attention" and this is not an error: the prompt
 * is valid and compiles, and a user who knows their front-end chunks long prompts may well proceed.
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
      {reading?.isOver === true && (
        <section className="animate-fade-in mb-3 rounded-2xl border border-gold/30 bg-gold/10 p-4 shadow-lg">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="attention">Over this target’s ceiling</Badge>
            <p className="text-xs font-bold text-gold">
              ~{reading.used} {reading.budget.unit} against a documented {reading.budget.limit} —{' '}
              {Math.round(reading.overBy)}× over.
            </p>
          </div>

          <p className="text-xs leading-relaxed text-ink-muted">{reading.budget.note}</p>

          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            The prompt below is unchanged. Nothing here trims it to fit — a specification silently cut to a
            ceiling would contract for a sheet it no longer describes. Choose a target that reads the whole
            prompt, or take this one as a starting point to shorten by hand.
          </p>
        </section>
      )}
    </div>
  );
}
