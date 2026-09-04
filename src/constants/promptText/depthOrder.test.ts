import { describe, expect, it } from 'vitest';
import { coreFacingChunks } from '../sheetPlans/directionalViews.ts';
import type { Direction } from '../../types/rendering.ts';
import { depthOrder, depthOrderDescription, DEPTH_ORDER_TEXT, PLAN_DEPTH_ORDER_TEXT } from './depthOrder.ts';
import { DIRECTION_LISTS } from './camera.ts';
import { PLAN_VIEW_ELEVATION } from './elevation.ts';

/**
 * The depth order against the facings a sheet actually covers, rather than against one of them.
 *
 * The reported failure this suite exists to stop: a cut-out rig reaching a multi-view directional
 * core, where section 3 lists five object yaws and section 5 stated the first facing's answer alone —
 * “renders in front of it” for a piece the same prompt has turned to the rear. `promptCompiler.test.ts`
 * holds the compiled half; this holds the resolution the compiler and the split drawer both ask.
 */

/** An oblique camera — anything short of the vertical, where a facing still decides a near side. */
const OBLIQUE = 45;

/** Paired with a name so `it.each` takes a facing list as one case rather than one case per facing. */
const COVERED_LISTS = Object.values(DIRECTION_LISTS)
  .flatMap((facings) => coreFacingChunks(facings))
  .map((facings) => [facings.join(', '), facings] as const);

/** Every facing the app can name, for asserting that a sheet states none it does not cover. */
const EVERY_FACING = Object.keys(DEPTH_ORDER_TEXT) as readonly Direction[];

describe('the depth order a sheet states', () => {
  it.each(COVERED_LISTS)('answers once per covered facing across %s', (_name, covered) => {
    const order = depthOrder(covered, OBLIQUE);

    if (covered.length === 1) {
      // One facing has one answer, and the heading above it says "this direction" — a bulleted list
      // of one would be a list the sheet has nothing to compare against.
      expect(order.perFacing).toBe(false);
      expect(depthOrderDescription(covered, OBLIQUE)).toBe(DEPTH_ORDER_TEXT[covered[0]]);
      return;
    }

    expect(order.perFacing).toBe(true);
    if (!order.perFacing) return;

    expect(order.facings.map((entry) => entry.facing)).toEqual([...covered]);
    for (const entry of order.facings) {
      // Verbatim from the record, so the sheet's own vocabulary is quoted rather than restated.
      expect(entry.text).toBe(DEPTH_ORDER_TEXT[entry.facing]);
    }
  });

  it.each(COVERED_LISTS)('states every covered facing and no other across %s', (_name, covered) => {
    // The regression, in the form the defect took: the description used to be the *assembly*
    // facing's sentence alone, so four of a five-view sheet's facings went unstated and the sentence
    // that was there was false for every one of them.
    const description = depthOrderDescription(covered, OBLIQUE);
    for (const facing of covered) {
      expect(description, facing).toContain(DEPTH_ORDER_TEXT[facing]);
    }

    // And the other half, which the first would not catch on its own: a description naming a facing
    // this sheet does not draw is describing a view the reader was never asked for. Matched on the
    // bold name rather than on the sentence, because `front` and `south` are the same yaw under two
    // sets and therefore carry the same words.
    for (const facing of EVERY_FACING) {
      const named = description.includes(`**${facing}**`);
      expect(named, facing).toBe(covered.length > 1 && covered.includes(facing));
    }
  });

  it.each(COVERED_LISTS)(
    'settles the whole sheet at once from directly overhead across %s',
    (_name, covered) => {
      // The camera outranks the coverage: a plan view has no near side at any yaw, so the one
      // paragraph is the answer for every facing rather than the first facing's answer for all of them.
      expect(depthOrder(covered, PLAN_VIEW_ELEVATION).perFacing).toBe(false);
      expect(depthOrderDescription(covered, PLAN_VIEW_ELEVATION)).toBe(PLAN_DEPTH_ORDER_TEXT);
    },
  );

  it('reads the compass and classic sets opposite ways at the same printed yaw', () => {
    // The two 90° facings, which is why the lines are keyed on the facing rather than on the yaw:
    // `west` turns the subject's left towards the camera and `right side` its right.
    expect(depthOrderDescription(['west', 'north'], OBLIQUE)).toContain(
      '- **west** — In profile with the left side towards the camera',
    );
    expect(depthOrderDescription(['right side', 'back'], OBLIQUE)).toContain(
      '- **right side** — In profile with the right side towards the camera',
    );
  });
});
