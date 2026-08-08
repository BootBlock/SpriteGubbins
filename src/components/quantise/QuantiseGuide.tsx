import { QUANTISE_STEPS } from '../../constants/quantiser.ts';

/**
 * What this tab is for, and the order the four controls on it are meant to be used in.
 *
 * The tab opened with a paragraph saying what quantising *is* and nothing saying what to **do**. That
 * is a poor trade on the one screen in this app that is not a form: everywhere else the next action
 * is the next field down the page, and here it is drop a sheet, read a measurement, disagree with it
 * if it is wrong, and only then look at the two previews. Someone arriving with a returned sheet and
 * no idea what a pixel grid is could read the old paragraph twice and still not know which number to
 * type.
 *
 * A numbered list rather than more prose, because the thing being explained is a sequence — and the
 * numerals take `--color-tab` the way the studio's two panel headings do, which is what makes them
 * read as this view's steps rather than as decoration.
 */
export function QuantiseGuide() {
  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-300 hover:border-tab/40">
      <h3 className="mb-2 text-base font-bold text-tab">How this works</h3>
      <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
        A model asked for pixel art almost always returns a smooth painting of pixel art: the shapes are
        right, but every edge is anti-aliased and one drawn pixel is really an 8 × 8 patch of near-identical
        colours. This tab measures the scale it was actually drawn at, snaps each patch back to the single
        colour that dominates it, reduces the sheet to the colour budget the prompt asked for, and can take
        the background key out to transparency. Nothing is uploaded, nothing is averaged into a colour the
        image did not already contain, and no dithering is applied.
      </p>

      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {QUANTISE_STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-tab/15 font-mono text-2xs font-semibold text-tab ring-1 ring-tab/30"
            >
              {index + 1}
            </span>
            <span className="text-xs leading-relaxed text-ink-faint">
              <span className="font-semibold text-ink-muted">{step.title}</span> — {step.detail}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
