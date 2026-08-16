import type { BackgroundKeying, ColorReduction, QuantiseSettings, Rgba } from '../types/quantiser.ts';

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
 * and be recomputed. Comparing three fields costs nothing and does not depend on that promise.
 */
export function sameQuantiseSettings(left: QuantiseSettings, right: QuantiseSettings): boolean {
  return (
    left.grid === right.grid &&
    left.vote === right.vote &&
    left.lineStrength === right.lineStrength &&
    left.fillCleanup === right.fillCleanup &&
    sameKeying(left.key, right.key) &&
    sameReduction(left.reduction, right.reduction)
  );
}

/** The keying half of it: both absent, or the same colour matched to the same distance. */
function sameKeying(left: BackgroundKeying | null, right: BackgroundKeying | null): boolean {
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
function sameReduction(left: ColorReduction | null, right: ColorReduction | null): boolean {
  if (left === null || right === null) return left === right;

  switch (left.kind) {
    case 'MAX_COLORS':
      return right.kind === 'MAX_COLORS' && left.maxColors === right.maxColors;
    case 'CHANNEL_DEPTH':
      return right.kind === 'CHANNEL_DEPTH' && left.bitsPerChannel === right.bitsPerChannel;
    case 'PALETTE':
      return right.kind === 'PALETTE' && sameEntries(left.entries, right.entries);
  }
}

/** Two pinned palettes: the same colours, in the same order, which is what `nearestColor` ties on. */
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
