import { describe, expect, it } from 'vitest';
import { DEFAULT_KEY_TOLERANCE, FRINGE_TOLERANCE_FACTOR, KEY_TOLERANCES } from './quantiser.ts';

/**
 * The invariants the keying control's numbers have to satisfy, none of which fails loudly.
 *
 * `SegmentedChoice` marks the current value by comparing it against each option, so a default that is
 * not *on* the ladder renders a row with nothing pressed: the control looks broken, and the user has no
 * way back to the value the tab opened with. Nothing throws, and no type catches it — the store's field
 * is a `number` and the ladder is a list of them.
 */
describe('the keying tolerances', () => {
  it('offers the default as one of its options, or nothing looks selected', () => {
    expect(KEY_TOLERANCES).toContain(DEFAULT_KEY_TOLERANCE);
  });

  it('starts at 0, which is the only setting that switches the fringe pass off', () => {
    // The fringe threshold is `tolerance × FRINGE_TOLERANCE_FACTOR`, so 0 is what makes "exact match
    // only" mean it — reachable from the control rather than merely representable.
    expect(KEY_TOLERANCES).toContain(0);
  });

  it('widens the fringe rather than narrowing it, which is the whole point of the factor', () => {
    // At 1 the fringe pass becomes a second copy of the field pass and every halo survives; below 1 it
    // would erode *less* than the field it is meant to clean up after. Either would be a quiet no-op.
    expect(FRINGE_TOLERANCE_FACTOR).toBeGreaterThan(1);
  });
});
