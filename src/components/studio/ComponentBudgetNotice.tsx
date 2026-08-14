import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { exceedsComponentBudget } from '../../utils/componentBudget.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import { Badge } from '../common/Badge.tsx';

/**
 * Says so when the sheet has grown past the component budget — before the prompt is copied.
 *
 * The whole point is that this is the *only* thing the budget does. A silent clamp would make the
 * prompt state a count its own inventory contradicts, which is the self-contradiction v2 was
 * rewritten to remove; a console message would be a warning nobody sees. So the sheet is left
 * exactly as configured and the disagreement is put where the user is about to act on it, next to
 * the prompt and its copy button.
 *
 * Gold, because the palette reserves it for "needs attention" — this is not an error. The
 * configuration is valid and the prompt compiles; what is being reported is that a model asked for
 * this many components will most likely merge or drop some of them.
 *
 * **The live region is rendered always, with only its contents conditional**, for the reason `Toast`
 * documents: a region added to the document at the same moment as its text is not reliably
 * announced. Empty, it must therefore cost nothing — which is why the spacing above the notice lives
 * on the notice, and the sticky column in `StudioTab` sets no `gap` of its own. A flex `gap` is
 * charged either side of a zero-height item and does not collapse the way block margins do, so the
 * quiet case would otherwise pay twice over for a warning that is not on screen.
 */
export function ComponentBudgetNotice() {
  const directionalMode = useOutputStore((state) => state.output.directionalMode);
  const sheetIndex = useOutputStore((state) => state.output.sheetIndex);
  const directions = useOutputStore((state) => state.output.directions);
  const componentBudget = useOutputStore((state) => state.output.componentBudget);
  const additionalAnatomy = useSubjectStore((state) => state.subject.additional_anatomy);
  const category = useSubjectStore((state) => state.category);

  // The same sum the prompt, the inventory heading and the atlas grid all state, read through the
  // one function that owns it — a warning computed from a second arithmetic could fire against a
  // number the user is not being shown anywhere.
  //
  // Counted for the sheet on screen, not the whole series, which is why it is not the figure the
  // mode selector carries. The budget is what one generation may be asked for, so a two-sheet
  // deliverable is over budget only if one of its sheets is.
  //
  // Which is also why this notice is not the whole answer: it can only ever describe the sheet the
  // control above it is pointed at. `SheetSplitRun` asks the same question of every sheet of the
  // batch, so a series whose *other* sheet is the heavy one is caught without the user having to go
  // and select it.
  const count = componentCountFor(
    category,
    directionalMode,
    directions,
    sheetIndex,
    parseAdditionalAnatomy(additionalAnatomy),
  );

  return (
    <div aria-live="polite" aria-atomic="true">
      {exceedsComponentBudget(count, componentBudget) && (
        <section className="animate-fade-in mt-4 rounded-2xl border border-gold/30 bg-gold/10 p-4 shadow-lg">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="attention">Over budget</Badge>
            <p className="text-xs font-bold text-gold">
              This sheet asks for {count} components against a budget of {componentBudget}.
            </p>
          </div>

          <p className="text-xs leading-relaxed text-ink-muted">
            Around forty components is what current models deliver before they start merging or dropping
            pieces, and they do not reliably count their own output — so the sheet comes back a plausible
            subset rather than short in an obvious way. Choose lighter sheet contents, trim the additional
            anatomy, or raise the component budget if your target model can take it.
          </p>

          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            The prompt below is unchanged. The budget caps what you ask for, never what the sheet contracts
            for — a sheet quietly trimmed to fit would state a count its own inventory contradicts.
          </p>
        </section>
      )}
    </div>
  );
}
