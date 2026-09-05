import { ComponentBudgetNotice } from '../studio/ComponentBudgetNotice.tsx';
import { OutputConfig } from '../studio/OutputConfig.tsx';
import { PresetSavePanel } from '../studio/PresetSavePanel.tsx';
import { PromptPreview } from '../studio/PromptPreview.tsx';
import { SubjectForm } from '../studio/SubjectForm.tsx';
import { SubjectHistoryControls } from '../studio/SubjectHistoryControls.tsx';
import { TargetModelSelector } from '../studio/TargetModelSelector.tsx';

/**
 * The studio: what to draw on the left, what comes out on the right.
 *
 * Inputs and output side by side rather than stacked, and the output column sticks as the form
 * scrolls, because the whole point of the compiler being live is watching the prompt change while
 * editing the thing that changes it.
 *
 * **An even split, not five-sevenths.** The form column carries every control in the app and needs
 * enough width for its fields to pair up two across; the preview column carries one `<pre>` that
 * wraps to whatever it is given. The old 5/7 spent width on the half that could not use it and left
 * the form three viewport-heights tall beside a sticky column that was empty for two thirds of it.
 *
 * **The split engages at `studio:`, not `lg:`, and that is a correctness bound rather than a taste.**
 * A native `<select>` truncates a label its container cannot fit, so a column holding one has a
 * minimum width — and `lg` (1024px) sits 16px below it, which put every select in this tab 8px short
 * of its own longest option at exactly the viewport where the two columns first appeared. Both
 * columns are bound by it, the form's fifteen selects and the target model's one, so the even split
 * above is what has to clear the minimum rather than the form column alone. The target model's is
 * also the one select in the app sharing its row with a control — the button that opens the chosen
 * generator's page — so its column has to clear the minimum *and* those 48px. `--breakpoint-studio`
 * in `src/index.css` derives the 1120px; below it the studio stacks, which is the layout it already
 * used below `lg`.
 *
 * **The sticky column is capped at the viewport and lays itself out as a flex column**, so
 * `PromptPreview` grows into whatever height is left rather than stopping at a fixed cap and leaving
 * the rest of the screen blank. That is also what makes `ComponentBudgetNotice` free to appear: the
 * flexbox does the arithmetic, where a hand-tuned `calc()` would have to know whether the notice was
 * showing.
 *
 * **The column carries no `gap`, and its children space themselves.** `ComponentBudgetNotice` always
 * renders its live region — it has to, or the warning is not reliably announced — and only the
 * contents are conditional. Under a block container that empty element was free, because its margins
 * collapsed through it. A flex `gap` does not collapse: it would be charged either side of a
 * zero-height item, so the quiet case, which is the normal one, would pay twice for a notice that
 * is not there.
 *
 * Composition only — every panel here reaches into the stores itself, so nothing is threaded through
 * this file and it never has to change when a panel does.
 */
export function StudioTab() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 studio:grid-cols-12">
      <div className="space-y-6 studio:col-span-6">
        {/*
          Above both numbered panels, because what it steps back spans them: a category switch
          replaces the sixteen answers in the first and re-resolves six settings in the second, and
          an undo that governed only the panel it sat in would be lying about half of that.
        */}
        <SubjectHistoryControls />
        <SubjectForm />
        <OutputConfig />
        {/*
          Last in the column, because it is what you do when the two panels above are how you want
          them. It used to be the first thing on the Presets tab, which meant naming a configuration
          from a page that does not show it — and the project a save is filed under made that worse,
          since it is a third decision about a studio you can no longer see.
        */}
        <PresetSavePanel />
      </div>

      {/*
        The offset clears the chrome and the cap gives it back, and neither states how tall the
        chrome is: `--sticky-column-top` and `--sticky-column-height` derive both from the height
        `Header` measures and publishes. This column used to carry four figures instead — 8.5rem and
        6rem for the offset, 10rem and 7rem for the cap — with the second of each pair on `xl`, to
        approximate the width at which the bar stops wrapping. That is a page width standing in for
        a header height, so it is right at two widths and wrong between them, and it goes stale the
        first time a control joins the bar. See the two properties in `index.css`.

        Sticky and its cap are prefixed `studio:` for the same reason the grid is, and not merely to
        match: below that width the columns stack, and a cap left on `lg` would spend those 16px
        scrolling a full-width preview inside a viewport-height box for no reason.

        `overflow-y-auto` is what makes the cap safe rather than merely tidy. A sticky element taller
        than its cap does not simply overflow harmlessly: its top stays pinned, so whatever hangs
        past the bottom cannot be scrolled to at all. With the budget notice showing on a short
        window that would be the Copy Prompt button. The column scrolls instead.

        The lifted combo-box and tooltip surfaces are unaffected: `useAnchoredSurface` listens for
        `scroll` on the document in the capture phase precisely because an anchor may sit inside a
        scrolling panel, so they re-pin against this one exactly as they do the atlas calculator's.
      */}
      <div className="flex flex-col studio:sticky studio:top-[var(--sticky-column-top)] studio:col-span-6 studio:max-h-[var(--sticky-column-height)] studio:overflow-y-auto">
        <TargetModelSelector />
        {/* Above the preview, so a sheet that has outgrown its budget is read before it is copied. */}
        <ComponentBudgetNotice />
        <PromptPreview />
      </div>
    </div>
  );
}
