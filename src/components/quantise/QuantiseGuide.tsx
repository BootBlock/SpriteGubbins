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
export function QuantiseGuide({ facts, hasSheet, target, suggested, colorPlan }: QuantiseGuideProps) {
  const state = hasSheet && facts !== null ? adviceFor(facts) : null;
  // The ceiling is procedure input, so it accompanies the procedure — and only while the procedure
  // is the task. A measured sheet needs no candidate, and advice to "start there and step
  // downwards" beside a scale already in force would be the panel disagreeing with itself.
  const ceiling =
    state !== null && state !== QUANTISE_SHEET_ADVICE.measured
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

/** The state line the sheet has earned — the same three-way reading `ScaleBadge` colours. */
function adviceFor(facts: SheetFacts): string {
  if (facts.scale === null) return QUANTISE_SHEET_ADVICE.none;
  return facts.scale.measurement === 'EXACT'
    ? QUANTISE_SHEET_ADVICE.measured
    : QUANTISE_SHEET_ADVICE.estimated;
}
