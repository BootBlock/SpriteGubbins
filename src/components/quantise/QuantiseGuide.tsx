import { QUANTISE_STEPS } from '../../constants/quantiser.ts';
import {
  colourAdvice,
  QUANTISE_GUIDE_INTRO,
  QUANTISE_SHEET_ADVICE,
  SCALE_BY_EYE_STEPS,
  targetCeilingAdvice,
} from '../../constants/quantiseGuide.ts';
import type { TargetSize } from '../../types/output.ts';
import type { ColorPlan, PixelGrid, SheetFacts } from '../../types/quantiser.ts';

interface QuantiseGuideProps {
  /**
   * What one look at the sheet established, or `null` while the worker is still looking — the same
   * value `GridControls` takes, for the same reason: the guide's advice has to agree with the badge
   * beside it about which state the sheet is in, and two derivations of one state can disagree.
   */
  readonly facts: SheetFacts | null;
  /**
   * Whether a sheet is loaded at all, which `facts` alone cannot say: `null` facts is also the
   * measuring state, and advice about a sheet that is still being read would be advice about
   * nothing.
   */
  readonly hasSheet: boolean;
  /** The studio's target component size, where it names one. */
  readonly target: TargetSize | null;
  /** The scale {@link target} implies for this sheet, or `null` where it implies none. */
  readonly suggested: PixelGrid | null;
  /**
   * The grid actually in force — the user's, or an `EXACT` reading of the sheet behind it — as
   * `GridControls` takes it, and for its reason turned around: that panel drops its ask-for-a-click
   * paragraph the moment a grid is in force, and advice here that kept saying “an estimate is
   * waiting” beside a box holding the number would be this panel asking for something the reader
   * has already done. Three surfaces read this state, and all three have to say the same thing
   * about it.
   */
  readonly grid: PixelGrid | null;
  /** What the studio decided about colour, as the pipeline was handed it. */
  readonly colorPlan: ColorPlan;
}

/**
 * What this tab is for, the order its controls are used in, and — once a sheet is loaded — what to
 * do about the sheet actually on screen.
 *
 * The tab opened with a paragraph saying what quantising *is* and nothing saying what to **do**,
 * and the numbered steps answered that for the happy path only: drop a sheet, read a measurement,
 * compare, download. The path that actually needs a guide is the other one — a generated sheet
 * whose scale neither reading could find, where the number has to be judged by eye against the
 * previews — and the knowledge of how to do that lived nowhere on screen. The second list below is
 * that procedure, and the panel now reads the sheet's own state so its advice is about the sheet in
 * front of the reader rather than about sheets in general.
 *
 * Numbered lists rather than more prose, because both things being explained are sequences — and
 * the numerals take `--color-tab` the way the studio's two panel headings do, which is what makes
 * them read as this view's steps rather than as decoration.
 */
export function QuantiseGuide({ facts, hasSheet, target, suggested, grid, colorPlan }: QuantiseGuideProps) {
  const state = hasSheet && facts !== null ? adviceFor(facts, grid) : null;
  // The ceiling is procedure input, so it accompanies the procedure — and only while a number still
  // needs choosing. With a scale in force the reader is stepping from where they are, and beside a
  // measured sheet a line saying "start there and step downwards" would be the panel disagreeing
  // with itself.
  const ceiling =
    grid === null && state !== null && state !== QUANTISE_SHEET_ADVICE.measured
      ? targetCeilingAdvice(suggested, target)
      : null;

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <h3 className="mb-2 text-base font-bold text-tab">How this works</h3>
      <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">{QUANTISE_GUIDE_INTRO}</p>

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

      <h4 className="mt-5 mb-2 text-base font-bold text-tab">Finding the scale by eye</h4>
      {state !== null && <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">{state}</p>}
      {ceiling !== null && <p className="mt-2 max-w-3xl text-xs leading-relaxed text-ink-muted">{ceiling}</p>}

      <ol className="mt-3 grid gap-3 sm:grid-cols-2">
        {SCALE_BY_EYE_STEPS.map((step, index) => (
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

      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-ink-faint">{colourAdvice(colorPlan)}</p>
    </section>
  );
}

/**
 * The state line the sheet has earned, from the badge's reading of it and the grid in force.
 *
 * The grid decides between two pairs the reading alone cannot separate. With no grid in force the
 * sheet is waiting — for a click where an estimate is on offer, or for a number where nothing is —
 * and with one in force the waiting lines would be asking for what the reader has already done. The
 * measured line keeps the narrower claim it makes: it says the scale “is already applied”, which is
 * true only while the grid in force *is* the exact reading, so a reader who overtypes a measured
 * sheet is handed the judging line like any other hand-chosen number.
 */
function adviceFor(facts: SheetFacts, grid: PixelGrid | null): string {
  if (grid !== null) {
    return facts.scale?.measurement === 'EXACT' && facts.scale.grid === grid
      ? QUANTISE_SHEET_ADVICE.measured
      : QUANTISE_SHEET_ADVICE.applied;
  }
  if (facts.scale === null) return QUANTISE_SHEET_ADVICE.none;
  return facts.scale.measurement === 'EXACT'
    ? QUANTISE_SHEET_ADVICE.measured
    : QUANTISE_SHEET_ADVICE.estimated;
}
