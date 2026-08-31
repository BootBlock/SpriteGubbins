import type {
  BackgroundKeying,
  ColorReduction,
  QuantiseSettings,
  QuantiseSurroundings,
  Rgba,
} from '../types/quantiser.ts';

/**
 * Whether two sets of quantiser settings would produce the same sheet.
 *
 * The question a worker forces: the transform's answer arrives long after it was asked for, so
 * something has to decide whether what came back is an answer to the question still being asked. That
 * decision is what tells the tab it is up to date rather than still working, and getting it wrong in
 * either direction is visible — a stale result shown as current, or a spinner that never stops. The
 * same comparison is what stops a question already in flight being asked a second time, which is a
 * live case now that the session outlives the tab that asked.
 *
 * **By value, not by reference**, although both sides are built by one `useMemo` in one hook and
 * their identities would usually agree. `useMemo` is a performance hint the React documentation is
 * explicit about not promising to honour, and a discarded cache would make a settled result vanish
 * and be recomputed. Comparing a dozen fields costs nothing and does not depend on that promise.
 *
 * **A dial missing from this list is a control that silently does nothing**, and that is not a
 * theoretical risk — it is what shipping the frame-alignment dials without adding them here actually
 * did: the select moved, the store recorded it, the memo rebuilt, and this said the question had not
 * changed, so no transform was ever asked for. Nothing failed; the panel simply reported the reading
 * from before the dial was touched, for as long as the reader cared to look at it, and the whole
 * gate was green. `quantiseSettings.test.ts` now walks `QuantiseTuning`'s own keys rather than
 * naming them, so a dial added to that shape fails to compile until it has been given a second
 * position to be separated by — and fails here if this list has not been given it.
 */
export function sameQuantiseSettings(left: QuantiseSettings, right: QuantiseSettings): boolean {
  return (
    sameSurroundings(left, right) &&
    left.silhouetteThreshold === right.silhouetteThreshold &&
    left.vote === right.vote &&
    left.outlineExpansion === right.outlineExpansion &&
    left.lineStrength === right.lineStrength &&
    left.trimStrength === right.trimStrength &&
    left.inkThreshold === right.inkThreshold &&
    left.fillCleanup === right.fillCleanup &&
    left.colorMerge === right.colorMerge &&
    left.cleanupPasses === right.cleanupPasses &&
    left.dither === right.dither &&
    left.spriteGap === right.spriteGap &&
    left.symmetry === right.symmetry &&
    left.symmetryTolerance === right.symmetryTolerance &&
    left.symmetryConfidence === right.symmetryConfidence &&
    left.duplicateTolerance === right.duplicateTolerance &&
    left.duplicateSnap === right.duplicateSnap &&
    left.frameAlignment === right.frameAlignment &&
    left.frameDriftTolerance === right.frameDriftTolerance &&
    left.antiAlias === right.antiAlias &&
    left.antiAliasThreshold === right.antiAliasThreshold &&
    left.antiAliasStrength === right.antiAliasStrength &&
    left.antiAliasRun === right.antiAliasRun &&
    left.antiAliasPalette === right.antiAliasPalette
  );
}

/**
 * Whether two sets of settings put a sheet in the same surroundings — the same grid, the same
 * background key, the same colour budget — whatever the tuning inside them is doing.
 *
 * The half of {@link sameQuantiseSettings} that the auto-tune sweep asks on its own, because the
 * sweep's answer is *about* the dials and conditional on everything else: it re-draws each candidate
 * at the grid in force and scores what the colour reduction left, so a likeness figure and a colour
 * count measured at a grid of 6 say nothing about the same sheet at 4. The panel withdraws its report
 * when this stops holding — see `AutoTuneControls`, and `useAutoTuneStore.stale` for the other half
 * of that rule, which the dials go through instead.
 *
 * **The routes into these three do not all pass through a store `stale()` could be called from**,
 * which is why this is a comparison rather than another call to it. The grid is `gridInForce`, so it
 * moves when the reader overtypes the box and again when they clear it and the sheet's own reading
 * takes over — and that second one is no write at all. The key is built from the studio's background
 * colour and the two keying dials. The reduction is built from the palette lock and its snap, and
 * from the studio's colour budget, which is edited on another tab. Only what is in force can answer
 * for all of them.
 *
 * Written against {@link QuantiseSurroundings} rather than the whole settings, so a caller holding
 * only the three can ask, and `quantiseSettings.test.ts` walks the shape's own keys — a fourth field
 * added to the settings beyond the tuning fails there until it is compared here.
 */
export function sameSurroundings(left: QuantiseSurroundings, right: QuantiseSurroundings): boolean {
  return (
    left.grid === right.grid &&
    sameKeying(left.key, right.key) &&
    sameReduction(left.reduction, right.reduction)
  );
}

/** The keying half of it: both absent, or the same colour matched to the same distance. */
export function sameKeying(left: BackgroundKeying | null, right: BackgroundKeying | null): boolean {
  if (left === null || right === null) return left === right;
  return left.tolerance === right.tolerance && sameColor(left.color, right.color);
}

/**
 * The palette half: both absent, or the same instruction with the same numbers behind it.
 *
 * Each arm re-checks the other side's `kind` rather than testing the two for equality once up front,
 * which is what narrows `right` as well as `left` — the alternative reads more neatly and needs a
 * cast to get at the field it is comparing, which is the trade this repository does not make.
 */
export function sameReduction(left: ColorReduction | null, right: ColorReduction | null): boolean {
  if (left === null || right === null) return left === right;

  switch (left.kind) {
    case 'MAX_COLORS':
      return right.kind === 'MAX_COLORS' && left.maxColors === right.maxColors;
    case 'CHANNEL_DEPTH':
      return right.kind === 'CHANNEL_DEPTH' && left.bitsPerChannel === right.bitsPerChannel;
    case 'PALETTE':
      return right.kind === 'PALETTE' && sameEntries(left.entries, right.entries);
    case 'LOCKED':
      // The snap distance is part of the instruction rather than a dial beside it: it decides
      // which colours the entries are applied to at all, so two locks holding the same colours at
      // two distances produce two different sheets.
      return right.kind === 'LOCKED' && left.snap === right.snap && sameEntries(left.entries, right.entries);
  }
}

/** Two stated palettes: the same colours, in the same order, which is what a nearest search ties on. */
function sameEntries(left: readonly Rgba[], right: readonly Rgba[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => {
    const other = right[index];
    return other !== undefined && sameColor(entry, other);
  });
}

function sameColor(left: Rgba, right: Rgba): boolean {
  return left.r === right.r && left.g === right.g && left.b === right.b && left.a === right.a;
}
