import { CATEGORY_OPTIONS } from '../../constants/categories/index.ts';
import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

/**
 * The two acts in the Subject Definition header that replace all sixteen answers in one press.
 *
 * Split out of `SubjectForm` rather than written inline beside the fields, because the panel and its
 * actions are two responsibilities: the form renders whatever `SUBJECT_FIELD_GROUPS` and the
 * category between them describe, and these two write the subject wholesale without caring what any
 * of it means. `SectionToggleAll` is the same split made earlier for the third control in this row.
 *
 * **Neither is the destructive act it looks like.** Both go through `act()` in `useSubjectStore`, so
 * the subject each one discards is on the undo stack above the panel before it goes — which is what
 * lets Randomise be offered as a way of *finding* a subject, and what made shipping Reset safe at
 * all.
 *
 * **Only Randomise takes the gold.** It is the act a reader comes to this header to perform, and a
 * second loud button beside it would leave neither of them saying so — so Reset takes the app's
 * established secondary style, which is what `SectionToggleAll` beside it already wears.
 */
export function SubjectActions() {
  const category = useSubjectStore((state) => state.category);
  const randomizeSubject = useSubjectStore((state) => state.randomizeSubject);
  const resetSubject = useSubjectStore((state) => state.resetSubject);
  const showToast = useUIStore((state) => state.showToast);

  const { label: categoryLabel } = CATEGORY_OPTIONS[category];

  return (
    <>
      <ControlTooltip
        hint="Reset"
        text={STUDIO_ACTION_TOOLTIPS.reset}
        className="relative inline-flex shrink-0"
      >
        <button
          type="button"
          // The visible word is the start of the accessible name rather than being replaced by it,
          // so a voice-control user asking for “reset” still matches what they can read.
          aria-label={`Reset ${categoryLabel} properties to their defaults`}
          onClick={() => {
            resetSubject();
            showToast(`Reset ${categoryLabel} properties to their defaults`);
          }}
          className="rounded-lg border border-foundry-600 bg-foundry-700 px-2.5 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-600 hover:text-ink"
        >
          Reset
        </button>
      </ControlTooltip>

      {/* An unnamed `group`, so the die below turns from a pointer on this button alone. The panel
          around it is `group/panel` for that reason — `group-hover:` matches any `group` ancestor,
          so an unnamed one out there would roll the dice from anywhere in the form. */}
      <ControlTooltip hint="Randomise" text={STUDIO_ACTION_TOOLTIPS.randomise}>
        <button
          type="button"
          onClick={() => {
            randomizeSubject();
            showToast(`Randomised ${categoryLabel} properties`);
          }}
          className="group flex items-center gap-1.5 rounded-xl bg-gold px-3 py-1.5 text-xs font-black text-foundry-950 shadow-md transition-transform duration-390 hover:scale-[1.04] active:scale-[0.96]"
        >
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-975 group-hover:rotate-180"
          >
            🎲
          </span>
          Randomise
        </button>
      </ControlTooltip>
    </>
  );
}
