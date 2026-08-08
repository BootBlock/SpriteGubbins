import { ComponentBudgetNotice } from '../studio/ComponentBudgetNotice.tsx';
import { OutputConfig } from '../studio/OutputConfig.tsx';
import { PromptPreview } from '../studio/PromptPreview.tsx';
import { SubjectForm } from '../studio/SubjectForm.tsx';
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
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-6">
        <SubjectForm />
        <OutputConfig />
      </div>

      {/*
        Two pairs of numbers, and each pair has to agree: the sticky offset clears the chrome, and
        the height cap gives back that offset plus a little breathing room at the bottom. The chrome
        is not one height — the header wraps to two rows below `xl`, measuring 127px there against
        77px above it — so an offset written once would either tuck the target-model select under
        the header at 1024–1279 or leave a 60px hole above it everywhere else.

        `overflow-y-auto` is what makes the cap safe rather than merely tidy. A sticky element taller
        than its cap does not simply overflow harmlessly: its top stays pinned, so whatever hangs
        past the bottom cannot be scrolled to at all. With the budget notice showing on a short
        window that would be the Copy Prompt button. The column scrolls instead.

        The lifted combo-box and tooltip surfaces are unaffected: `useAnchoredSurface` listens for
        `scroll` on the document in the capture phase precisely because an anchor may sit inside a
        scrolling panel, so they re-pin against this one exactly as they do the atlas calculator's.
      */}
      <div className="flex flex-col lg:sticky lg:top-34 lg:col-span-6 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto xl:top-24 xl:max-h-[calc(100dvh-7rem)]">
        <TargetModelSelector />
        {/* Above the preview, so a sheet that has outgrown its budget is read before it is copied. */}
        <ComponentBudgetNotice />
        <PromptPreview />
      </div>
    </div>
  );
}
