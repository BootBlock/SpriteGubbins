import { describe, expect, it } from 'vitest';
import type { Rgba } from '../types/quantiser.ts';
import { ditherCandidates, mixingPlan } from './mixingPlan.ts';
import { conesToOklabInto, srgbToConesInto, srgbToOklab } from './oklab.ts';
import type { MutableCones, MutableOklab } from './oklab.ts';

const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };
const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const MID: Rgba = { r: 128, g: 128, b: 128, a: 255 };

/** The colour a plan averages to over a whole tile, mixed in linear light as the search mixes. */
function mixed(first: Rgba, second: Rgba, steps: number, levels: number): MutableOklab {
  const one: MutableCones = { long: 0, medium: 0, short: 0 };
  const other: MutableCones = { long: 0, medium: 0, short: 0 };
  srgbToConesInto(one, first.r, first.g, first.b);
  srgbToConesInto(other, second.r, second.g, second.b);
  const ratio = steps / levels;
  const out: MutableOklab = { L: 0, a: 0, b: 0 };
  conesToOklabInto(
    out,
    one.long + ratio * (other.long - one.long),
    one.medium + ratio * (other.medium - one.medium),
    one.short + ratio * (other.short - one.short),
  );
  return out;
}

function distance(one: MutableOklab, other: MutableOklab): number {
  return Math.hypot(one.L - other.L, one.a - other.a, one.b - other.b);
}

describe('mixingPlan', () => {
  it('leaves a colour the palette already holds as itself', () => {
    const plan = mixingPlan(WHITE, ditherCandidates([BLACK, WHITE]), 64);
    // `steps` of zero is the whole plan reading as `first` at every position, which is what the
    // palette step would have done with no dither at all.
    expect(plan.steps).toBe(0);
    expect(plan.first).toEqual(WHITE);
  });

  it('mixes toward the colour a two-entry palette cannot hold', () => {
    const plan = mixingPlan(MID, ditherCandidates([BLACK, WHITE]), 64);
    expect(plan.steps).toBeGreaterThan(0);
    expect(plan.steps).toBeLessThan(64);
    expect([plan.first, plan.second]).toEqual(expect.arrayContaining([BLACK, WHITE]));
  });

  it('mixes in linear light rather than in sRGB or in OKLab', () => {
    // The measurement behind the claim, and the reason it is a claim at all: what the eye averages
    // is emitted light, so half black and half white reads as sRGB 188, not as the 128 an sRGB
    // average gives. A plan for mid grey therefore asks for far less white than half.
    const plan = mixingPlan(MID, ditherCandidates([BLACK, WHITE]), 64);
    const white = plan.first === WHITE ? 64 - plan.steps : plan.steps;
    expect(white / 64).toBeLessThan(0.3);

    // And the mixture it settles on is nearer mid grey than either the sRGB-average ratio or the
    // nearest single entry would be.
    const want = srgbToOklab(MID.r, MID.g, MID.b) as MutableOklab;
    const chosen = distance(mixed(plan.first, plan.second, plan.steps, 64), want);
    expect(chosen).toBeLessThan(distance(mixed(BLACK, WHITE, 32, 64), want));
    expect(chosen).toBeLessThan(distance(srgbToOklab(0, 0, 0) as MutableOklab, want));
  });

  it('is a pure function of the colour it is handed', () => {
    // The scratch objects the search reuses are module state, so a plan that depended on the order
    // colours were asked about would be a memo returning different answers for one key.
    const palette = ditherCandidates([BLACK, WHITE, { r: 200, g: 30, b: 40, a: 255 }]);
    const first = mixingPlan(MID, palette, 16);
    mixingPlan({ r: 12, g: 200, b: 90, a: 255 }, palette, 16);
    expect(mixingPlan(MID, palette, 16)).toEqual(first);
  });

  it('takes coverage as a fourth axis where the entries differ in it', () => {
    // A budget's entries are pixels of the sheet and carry the coverage they were found at, so two
    // entries of one colour at two coverages are two different candidates, and a mixture of them is
    // a mixture of coverage. A target four steps above the faint entry lands on it with a single
    // rung of the solid one — which is 3.4 of coverage over the tile, and nearer than either entry
    // taken flat.
    const faint: Rgba = { r: 200, g: 30, b: 40, a: 40 };
    const solid: Rgba = { r: 200, g: 30, b: 40, a: 255 };
    const plan = mixingPlan({ ...solid, a: 44 }, ditherCandidates([solid, faint]), 64);
    expect(plan.first).toEqual(faint);
    expect(plan.second).toEqual(solid);
    expect(plan.steps).toBe(1);
  });
});
