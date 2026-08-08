import { DIRECTION_COVERAGE, DIRECTION_LISTS } from '../constants/promptText/index.ts';
import { resolveMode } from '../constants/sheetPlans/index.ts';
import type { SheetPlan } from '../types/components.ts';
import type { OutputConfig } from '../types/output.ts';
import type { Direction, DirectionSet } from '../types/rendering.ts';
import type { SubjectCategory } from '../types/subject.ts';

/**
 * Which facings a sheet actually covers, and which of them it assembles towards.
 *
 * Not simply the set the user chose. Each mode's inventory and component count are written for a
 * particular number of directions, so a fifteen-piece cut-out sheet cannot also demand all eight
 * compass points — for those modes the set is a *run list*, one sheet per facing, and
 * `primaryDirection` says which run this is.
 *
 * Extracted from the compiler because the splitter needs the same answer: it labels each run with
 * the facing that run covers, and a second implementation of this would eventually disagree with
 * the prompt it is labelling. One resolution, two readers.
 */
export interface SheetDirections {
  /** Every facing this one sheet draws, in the order the prompt lists them. */
  readonly covered: readonly [Direction, ...Direction[]];
  /** The facing the components assemble towards, which fixes the depth order. */
  readonly assembly: Direction;
}

/**
 * How the sheet's mode covers its facings — the one question every function here is asking, and the
 * one place the category is needed to answer it.
 *
 * **A stored `directionalMode` is not yet the sheet's mode.** `resolveMode` substitutes the
 * category's default wherever the pairing has no plan, and the compiler, the inventory and the
 * component count all read the resolved answer. Asking `DIRECTION_COVERAGE` for the raw value is a
 * different question, and it diverges both ways: a `CUTOUT_RIG_SINGLE_DIRECTION` stored on an `ITEM`
 * reports `'primary'` while the sheet draws its own five facings, and a `CORE_DIRECTIONAL_VARIANTS`
 * stored on an `EFFECT` reports a fixed set while the sheet is a run list driven by the very controls
 * that answer hides.
 *
 * That state is not reachable through the studio — `setCategory` writes the resolved mode back — but
 * `parseImportedPreset` and `parseSession` both reach `parseImageConfig`, which validates
 * `directionalMode` against the flat `DIRECTIONAL_MODES` union with no category in scope to check the
 * pairing against. So an imported preset or a hand-edited session can carry one, and `resolveMode` is
 * what repairs it — for the compiler, and now for the interface as well.
 */
function sheetCoverage(category: SubjectCategory, output: OutputConfig): 'primary' | DirectionSet {
  return DIRECTION_COVERAGE[resolveMode(category, output.directionalMode)];
}

/**
 * The facings one sheet of the series draws.
 *
 * **Two questions, asked at two levels, and conflating them is what this signature exists to stop.**
 * The *mode* decides which direction set reaches the sheet at all: `'primary'` defers to the user's
 * choice and treats it as a run list, and a named set is the mode's own, drawn whatever the control
 * says. The *plan* then decides how much of that set this particular sheet carries — the directional
 * core draws every facing of it, and the articulation sheet that shares its mode draws one.
 *
 * A plan's `facings` is only consulted on the mode's own set, because a run list has already
 * narrowed to a single facing by the time it gets here: an `'every'` sheet under `'primary'` would
 * be asking for the whole run list on one image, which is the 120-piece sheet the splitter exists to
 * prevent. `sheetPlans.test.ts` pins that no such pairing is declared.
 *
 * **The category is taken rather than a pre-resolved mode**, so the resolution above cannot be
 * skipped. Its three callers in the app used to hand it a rewritten configuration — `{ ...output,
 * directionalMode: mode }` — while every caller in the tests passed the configuration as it stood,
 * which is why a green suite sat above the defect. The plan argument already came from a pairing the
 * category *had* resolved, so the two could describe different sheets while looking like one.
 */
export function sheetDirections(
  category: SubjectCategory,
  output: OutputConfig,
  plan: SheetPlan,
): SheetDirections {
  const coverage = sheetCoverage(category, output);

  if (coverage !== 'primary') {
    const setFacings = DIRECTION_LISTS[coverage];
    const [firstOfSet] = setFacings;
    // The mode's own set, so `primaryDirection` is not consulted at either width — a sheet drawn to
    // one facing of a set the user never chose takes the facing the rest of the series assembles
    // towards, not a leftover from some other set the control was last left on.
    const covered: readonly [Direction, ...Direction[]] =
      plan.facings === 'every' ? setFacings : [firstOfSet];
    const [assembly] = covered;
    return { covered, assembly };
  }

  const primary = primaryFacing(output);
  return { covered: [primary], assembly: primary };
}

/**
 * The facing a run list's `primaryDirection` names, resolved through the set it belongs to.
 *
 * Its own function because three callers need exactly this and only one of them can name a sheet
 * plan: the compiler resolves a whole sheet's coverage, the studio's facing control shows the
 * value it is about to offer choices from, and the collapsed projection digest reports it. A
 * digest that had to invent a `SheetPlan` to ask which facing was selected would be answering a
 * question about the whole sheet in order to report one control.
 *
 * **The only function here that takes no category**, and the reason is that it reads no mode: a
 * facing resolved through `output.directions` is the same facing whatever kind of sheet consults it.
 * Its callers ask {@link directionSetApplies} first — that is where the mode, and therefore the
 * category, decides whether this answer is worth anything.
 *
 * Resolved *through* the set rather than trusted. A facing the set does not contain — a stale
 * `north` left behind by a switch to `THREE_CLASSIC` — would otherwise reach the prompt's assembly
 * direction and depth order while its "directions required" line never mentioned it.
 */
export function primaryFacing(output: OutputConfig): Direction {
  const facings = DIRECTION_LISTS[output.directions];
  const [firstFacing] = facings;
  return facings.find((facing) => facing === output.primaryDirection) ?? firstFacing;
}

/**
 * Whether the chosen direction set reaches the sheet at all.
 *
 * `false` for the modes that name their own facings — `CORE_DIRECTIONAL_VARIANTS` draws the five
 * classic views whatever the control is set to, because its inventory names them entry by entry. The
 * studio has to know, because that mode is the default for five of the eight categories *and* the
 * default in `DEFAULT_OUTPUT_CONFIG`: without this the app opens showing a live four-choice select
 * whose value the compiler discards, and a user who picks all eight compass points gets a
 * five-facing sheet with nothing anywhere saying why.
 *
 * Asked of the **resolved** mode, which is what makes that argument hold in both directions — see
 * {@link sheetCoverage}. A control hidden on a sheet whose prompt does read it is the worse half: the
 * value still reaches `DIRECTIONS_DESCRIPTION` and the depth order, and nothing on screen says so.
 */
export function directionSetApplies(category: SubjectCategory, output: OutputConfig): boolean {
  return sheetCoverage(category, output) === 'primary';
}

/**
 * The direction set the sheet is actually drawn to.
 *
 * The chosen one only where the mode defers to it; otherwise the mode's own. Distinct from
 * {@link sheetDirections}, which resolves all the way down to the individual facings — a digest
 * wants the set's *name*, and reading `output.directions` for it is what made the collapsed
 * projection summary report `EIGHT_COMPASS` on a sheet covering three.
 *
 * Reading the *stored* mode was the same defect one level up, and it survived that fix: the digest
 * reported `FIVE_CLASSIC` on an `EFFECT` carrying `CORE_DIRECTIONAL_VARIANTS` — a set the compiled
 * prompt never mentions, which is exactly the failure the paragraph above says this function removed.
 */
export function effectiveDirectionSet(category: SubjectCategory, output: OutputConfig): DirectionSet {
  const coverage = sheetCoverage(category, output);
  return coverage === 'primary' ? output.directions : coverage;
}
