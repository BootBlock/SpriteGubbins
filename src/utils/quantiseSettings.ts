import type { BackgroundKeying, QuantiseSettings } from '../types/quantiser.ts';

/**
 * Whether two sets of quantiser settings would produce the same sheet.
 *
 * The question a worker forces: the transform's answer arrives long after it was asked for, so
 * something has to decide whether what came back is an answer to the question still being asked. That
 * decision is what tells the tab it is up to date rather than still working, and getting it wrong in
 * either direction is visible — a stale result shown as current, or a spinner that never stops.
 *
 * **By value, not by reference**, although both sides are built by one `useMemo` in one hook and
 * their identities would usually agree. `useMemo` is a performance hint the React documentation is
 * explicit about not promising to honour, and a discarded cache would make a settled result vanish
 * and be recomputed. Comparing three fields costs nothing and does not depend on that promise.
 */
export function sameQuantiseSettings(left: QuantiseSettings, right: QuantiseSettings): boolean {
  return left.grid === right.grid && left.maxColors === right.maxColors && sameKeying(left.key, right.key);
}

/** The keying half of it: both absent, or the same colour matched to the same distance. */
function sameKeying(left: BackgroundKeying | null, right: BackgroundKeying | null): boolean {
  if (left === null || right === null) return left === right;
  return (
    left.tolerance === right.tolerance &&
    left.color.r === right.color.r &&
    left.color.g === right.color.g &&
    left.color.b === right.color.b &&
    left.color.a === right.color.a
  );
}
