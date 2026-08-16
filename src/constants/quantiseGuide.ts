import type { TargetSize } from '../types/output.ts';
import type { ColorPlan, PixelGrid } from '../types/quantiser.ts';

/**
 * The guide panel's copy: what quantising is, and how to find a scale by eye when neither reading
 * found one.
 *
 * Its own file rather than more of `constants/quantiser.ts`, which holds the tab's fixed numbers and
 * the copy against its controls — this is the panel that explains the *workflow*, and it grew from a
 * paragraph and four steps into the state-aware guidance below. Filed as content for the reason all
 * copy is: it ships in the bundle and is read by strangers, so it is written in the app's voice —
 * plain declarative sentences, British spelling, the reader addressed as “you”.
 *
 * Like `QUANTISE_STEPS` and `QUANTISE_SCALE_GUIDANCE`, none of this is control guidance: it
 * describes the workflow and the state of the user's sheet, not what a control is, so it sits
 * outside the walked `*_TOOLTIPS` surface — the same judgement `tooltips.test.ts` records for the
 * scale guidance.
 */

/** What this tab does, mechanically — the paragraph the panel opens with. */
export const QUANTISE_GUIDE_INTRO =
  'A model asked for pixel art almost always returns a smooth painting of pixel art: the shapes are right, but every edge is anti-aliased and one drawn pixel is really an 8 × 8 patch of near-identical colours. This tab reads the scale it was actually drawn at — measured outright where the art is crisp, and estimated from the spacing of its edges where softening has destroyed them — then snaps each patch back to the single colour that dominates it, brings its colours down to what the prompt asked for, and can take the background key out to transparency. An estimate is offered rather than applied, because it carries a tolerance a measurement does not. With no palette pinned in the studio, every colour that survives is one the image already contained; pin one and each pixel moves to its nearest entry instead. Nothing is uploaded, nothing is averaged into existence, and no dithering is applied either way.';

/**
 * What to do about the sheet on screen, keyed to how far the scale reading got.
 *
 * One sentence of state and one of direction, because the panel below it holds the whole procedure:
 * this line's job is to say whether that procedure is a check, a confirmation, or the actual work.
 */
export const QUANTISE_SHEET_ADVICE = {
  /** `detectPixelGrid` answered — the scale is in force and nothing needs finding. */
  measured:
    'This sheet’s scale was measured outright and is already applied, so the procedure below is only a check: glance at a hard edge at 4× or 8×, then key the background if it has one and download at 1×.',
  /** `estimatePixelGrid` answered — a candidate is on offer, and the preview is the judge. */
  estimated:
    'An estimate is waiting under the grid box. Click it, then work through the procedure below rather than trusting it outright — an estimate is read through the very softening it measures, and the preview is what settles it.',
  /** Neither reading answered — the procedure below is how the number gets found. */
  none: 'Neither reading found a scale in this sheet, so the procedure below is how to find it yourself. It is quicker than it reads: two or three tries usually settle the number.',
} as const;

/**
 * Finding the scale by eye, as steps in the order they are worked.
 *
 * Written for a reader who knows nothing about how any of it works and does not want to: every step
 * says what to do, what they will see, and what it means. The vocabulary stays concrete — blocks,
 * edges, slivers — because the reader is judging pixels, not the arithmetic behind them.
 */
export const SCALE_BY_EYE_STEPS = [
  {
    title: 'Start from a candidate',
    detail:
      'click a scale offered under the grid box, or type one. The number derived from the target size is a ceiling rather than a measurement — at any coarser scale the components could not have fitted on the sheet, and a generator that left canvas empty drew finer still — so the real scale usually sits at or below it.',
  },
  {
    title: 'Magnify a hard edge',
    detail:
      'set the zoom to 8× and find a place in the left preview where two strong colours meet. The apparent blocks in the original are what you are measuring; the right preview shows what the number in force makes of them, and the two panes stay on the same spot as you pan.',
  },
  {
    title: 'Read the symptoms',
    detail:
      'too low, and the result keeps several pixels for every apparent block — edges stay ragged and the size barely shrinks. Too high, and one result pixel swallows more than one block — neighbouring details merge and the art smears. At the right number, each apparent block lands as one whole pixel.',
  },
  {
    title: 'Step it and settle',
    detail:
      'nudge the number one at a time and watch the right preview. Generated art often drifts a little, so a perfect snap may not exist — judge by where most blocks land whole, and let stray edges go. Where the art sits against the grid is measured for you, so a margin around it costs nothing.',
  },
] as const;

/**
 * The ceiling the studio's target size implies for this sheet, with its figures filled in — or
 * `null` where the studio names no target or the sheet cannot seat one.
 *
 * A function rather than a template string at the call site, for the reason
 * `presetCollectionGuidance` is: copy with a value substituted into it is still copy, and the place
 * to read it whole is beside the rest of the panel's words.
 */
export function targetCeilingAdvice(suggested: PixelGrid | null, target: TargetSize | null): string | null {
  if (suggested === null || target === null) return null;
  return `For this sheet that ceiling is ${String(suggested)}× — the coarsest scale at which ${String(target.width)} × ${String(target.height)} px components could have fitted — so start there and step downwards.`;
}

/**
 * What will happen to the sheet's colours, named from the plan the pipeline was actually handed.
 *
 * Built from {@link ColorPlan} rather than from the settings behind it, for the reason
 * `GridControls` takes the same value: two readings of one setting can disagree, and did.
 */
export function colourAdvice(plan: ColorPlan): string {
  return `Colour needs no decision on this tab: the studio’s ${plan.setting} setting travels with the sheet (${plan.effect}). To change it, change the studio setting and come back — the sheet stays loaded.`;
}
