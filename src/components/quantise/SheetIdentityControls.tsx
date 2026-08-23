import { SHEET_IDENTITY_GUIDANCE } from '../../constants/sheetIdentity.ts';
import { useSheetIdentity } from '../../hooks/useSheetIdentity.ts';
import { sheetCoverage } from '../../utils/sheetCoverage.ts';
import { Badge } from '../common/Badge.tsx';
import { SheetStepButtons } from '../common/SheetStepButtons.tsx';

/**
 * Which sheet of which batch a download from this tab is about to be recorded as, and the way to
 * move the studio's position without leaving the tab.
 *
 * **The figure was already being written and never shown.** `sheetIdentity` reaches every download —
 * the manifest, the sprite pack and the Aseprite document all carry the sheet's ordinal, its plan,
 * its facings and the component count the prompt contracted for — and it was derived inside
 * `DownloadControls` and consumed there, so the only account of it a reader ever got was a sentence
 * behind the button's own tooltip, after the decision. A configuration that takes eight generations
 * is worked one sheet at a time: the reader steps the studio to sheet 3, goes off to a generator,
 * comes back with an image, and drops it into a tab that says nothing about sheet 3 at all. Stepping
 * one press too far, or forgetting to step, writes a manifest saying `west` over the south sheet's
 * pixels — a valid file, correct artwork, and the one field an importer would sort by wrong.
 *
 * **It is a statement about the studio, never a claim about the image**, which is the whole reason it
 * has to be on screen rather than only in the file. Nothing here can check that the dropped sheet is
 * the one the studio is composing, so the panel names the configuration and the paragraph says
 * outright that this is what it is doing. `SpriteControls` directly below is the other half of the
 * pairing: this says what the prompt asked for, and that says what came back.
 *
 * **The step buttons are the studio's own**, through `SheetStepButtons` — the tab a reader spends a
 * batch in is this one, and walking back to the Studio tab between every generation was the only way
 * to move the position. They render nothing for a batch of one.
 */
export function SheetIdentityControls() {
  const { sheet } = useSheetIdentity();

  // Unreachable in the app — `sheetBatch` resolves its own ordinal against the list it just built and
  // degrades to the first sheet — but the ordinal is an index into that list, so `sheetIdentity`
  // reports the miss rather than asserting it away, and a panel with no sheet to name has nothing to
  // say. The download is refused nothing here: it writes a `null` sheet, exactly as it always did.
  if (sheet === null) return null;

  // Whether this configuration is a batch at all, which decides both the paragraph and whether there
  // is anywhere to step to. `SheetStepButtons` applies the same test to the batch it reads for
  // itself; the two cannot part company, because `sheet.total` is the length of that very list.
  const stepped = sheet.total > 1;

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-xs font-semibold text-ink-muted">Will be recorded as</p>

        {/*
          **A step announces itself, and nothing else in the panel can do it.** Pressing a step button
          rewrites the ordinal, the plan name, the coverage and the component count — while focus stays
          on a button whose own accessible name has not changed, so without this the press produces no
          announcement at all and a screen-reader user has no way to tell whether it did anything. The
          studio's batch strip settles the same pattern for the same buttons.

          The buttons are deliberately outside it. They are what the user is operating, and a live
          region containing them would re-announce them on every change.
        */}
        <div aria-live="polite" aria-atomic="true" className="flex flex-wrap items-center gap-2">
          <Badge tone="view">
            Sheet {sheet.ordinal} of {sheet.total}
          </Badge>

          <span className="font-mono text-xs font-bold text-ink">
            {sheet.plan} · {sheetCoverage(sheet.facings, sheet.assembly)} ·{' '}
            {sheet.components === 1 ? '1 component' : `${String(sheet.components)} components`}
          </span>
        </div>

        {stepped && (
          /* `ml-auto` on the wrapper, which is the flex item — the buttons are inside it and would
             measure it against their own box. */
          <span className="ml-auto flex items-center gap-2">
            <SheetStepButtons />
          </span>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        {stepped ? SHEET_IDENTITY_GUIDANCE.batch : SHEET_IDENTITY_GUIDANCE.single}
      </p>
    </section>
  );
}
