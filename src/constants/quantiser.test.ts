import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIFFERENCE_SCALE,
  estimatedScaleGuidance,
  estimatedScalePlaceholder,
  estimatedScaleStatus,
  ESTIMATED_SCALE_READING,
  DEFAULT_KEY_TOLERANCE,
  DIFFERENCE_SCALES,
  FRINGE_TOLERANCE_CEILING,
  FRINGE_TOLERANCE_FACTOR,
  KEY_SHADING_LATITUDE,
  KEY_TOLERANCES,
} from './quantiser.ts';

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
    // `keyBackground` gates the whole of pass 2 on the tolerance being above zero, so 0 is what makes
    // "exact match only" mean it — reachable from the control rather than merely representable. It
    // used to follow from the radius being `tolerance × FRINGE_TOLERANCE_FACTOR`; the hue test beside
    // that radius is scaled from nothing, so the rung is stated rather than derived.
    expect(KEY_TOLERANCES).toContain(0);
  });

  it('widens the fringe rather than narrowing it, which is the whole point of the factor', () => {
    // At 1 the fringe pass becomes a second copy of the field pass and every halo survives; below 1 it
    // would erode *less* than the field it is meant to clean up after. Either would be a quiet no-op.
    expect(FRINGE_TOLERANCE_FACTOR).toBeGreaterThan(1);
  });

  it('actually binds the fringe, rather than sitting where it can never be reached', () => {
    // A factor with nothing above it is a ramp, not a threshold: the top rung times the factor runs
    // past the distance between any two colours, and the pass becomes a blanket erosion of every
    // silhouette in the sheet. So the ceiling has to be *reachable* — under what the loosest rung
    // would otherwise produce — and above zero, which is the value that means "no fringe pass at all"
    // and is reserved for the `exact` rung.
    expect(FRINGE_TOLERANCE_CEILING).toBeLessThan(Math.max(...KEY_TOLERANCES) * FRINGE_TOLERANCE_FACTOR);
    expect(FRINGE_TOLERANCE_CEILING).toBeGreaterThan(0);
    // Where it sits *between* the halo and the artwork is a fact about colours rather than about
    // these numbers, so `keyDistance.test.ts` is what holds that half — measured, not asserted here.
  });

  it('reaches further along the key’s own plane than across it, or the latitude is not one', () => {
    // At 1 the distance collapses back to the straight Euclidean one it replaced, and the field the
    // whole change exists to catch goes back to sitting on top of the artwork. Nothing throws — the
    // arithmetic is still valid, it just discounts nothing.
    expect(KEY_SHADING_LATITUDE).toBeGreaterThan(1);
  });
});

/**
 * The same invariant, for the second ladder on this tab.
 *
 * `DIFFERENCE_SCALES` is offered through the same `SegmentedChoice` as the keying tolerances above,
 * so it fails the same way and just as quietly: a default that is not *on* the ladder renders a row
 * with nothing pressed, and the reader has no way back to the value the panel opened with.
 */
describe('the difference scales', () => {
  it('offers the default as one of its options, or nothing looks selected', () => {
    expect(DIFFERENCE_SCALES).toContain(DEFAULT_DIFFERENCE_SCALE);
  });

  it('climbs, so a rung further along always means a coarser reading', () => {
    // The control is read as "how closely am I looking", which only holds if the numbers ascend —
    // and the tooltip explains the rungs in that order.
    expect([...DIFFERENCE_SCALES]).toStrictEqual([...DIFFERENCE_SCALES].sort((a, b) => a - b));
  });
});

/**
 * The wording each estimate takes, which is the whole of what {@link ScaleMeasurement} carries a
 * reading's name for.
 *
 * Three readings produce an estimated scale and they find it in three different things, so a
 * sentence written for one of them is wrong beside the other two — which is what the badge, the
 * panel, the empty result pane and the live region all said for as long as the readings were pooled
 * under one `ESTIMATED`. The record is where the four of them now take their words from, so this is
 * where the claim is held.
 */
describe('the wording of an estimated scale', () => {
  it('describes each reading in terms of what that reading measured', () => {
    expect(ESTIMATED_SCALE_READING.EDGE_PERIOD.source).toContain('edges');
    expect(ESTIMATED_SCALE_READING.REPEAT_DISTANCE.source).toContain('repeats');
    expect(ESTIMATED_SCALE_READING.BOUNDARY_SPACING.source).toContain('boundaries');
  });

  it('credits no reading with what another one measured', () => {
    // The defect, stated the way it presented: the correlation reads a repeat *distance* and never
    // asks where the repeats sit, so a sentence about the spacing of the sheet's edges describes
    // something it did not look at — and it is the reading that answers on every sheet in
    // `test_sprites/` that answers at all.
    for (const surface of [
      estimatedScaleStatus(3, 'REPEAT_DISTANCE'),
      estimatedScalePlaceholder('REPEAT_DISTANCE'),
      estimatedScaleGuidance('REPEAT_DISTANCE'),
    ]) {
      expect(surface).not.toContain('edges');
    }
    expect(estimatedScaleGuidance('BOUNDARY_SPACING')).not.toContain('edges');
    expect(estimatedScaleStatus(5, 'BOUNDARY_SPACING')).not.toContain('edges');
  });

  it('states the scale in the live region and nowhere else, since only it has no badge beside it', () => {
    // The pane and the panel are read beside a badge and a button that both carry the number, so a
    // third copy in prose is one more place for the three to disagree. Only the live region, which
    // replaces all of them, states it. The panel's paragraph is not asserted here because it takes
    // no scale to state — a test of that would be a test of the signature, and the compiler has it.
    expect(estimatedScaleStatus(3, 'REPEAT_DISTANCE')).toContain('as 3');
    expect(estimatedScalePlaceholder('REPEAT_DISTANCE')).not.toMatch(/\d/);
  });
});
