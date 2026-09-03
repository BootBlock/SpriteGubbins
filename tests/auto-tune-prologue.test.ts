import { describe, expect, it, vi } from 'vitest';

import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { imageFrom, soften } from '../src/test/images.ts';
import type { QuantiseSettings, Rgba } from '../src/types/quantiser.ts';
import { autoTune } from '../src/utils/autoTune.ts';
import { upscaleNearest } from '../src/utils/upscaleNearest.ts';

/**
 * What the auto-tune sweep pays for the pipeline's prologue and its one trailing reading.
 *
 * **A count, not a wall clock.** The measurement that prompted this was 15.4 seconds of a 62.4-second
 * sweep of `test_sprites/armour.png` at a grid of 6 — a quarter of it — and not one of those seconds
 * reproduces on another machine, or under another Vitest worker load. What reproduces is what the
 * seconds were made of: `boundaryMesh` run 2,015 times where five runs answer the same question, and
 * `differenceMap` run 2,015 times for a value `readCandidate` never reads. `constants/autoTune.ts`
 * states the same rule for its own ladders — the count of positions is what a change here has to be
 * judged by — so this counts calls.
 *
 * **The three prologue passes are once per crop and the difference map is never**, and both halves
 * follow from the same fact: the key, the edge hardening and the mesh depend on `key`,
 * `silhouetteThreshold` and `grid`, none of which the sweep may move, while the map is the one
 * reading `readCandidate` does not look at. See `quantisePrologue` and `QuantiseSheet`.
 *
 * The counters are `vi.hoisted` because a `vi.mock` factory is hoisted above every import in this
 * file, so anything it closes over has to be hoisted with it.
 */
const counts = vi.hoisted(() => ({ mesh: 0, key: 0, harden: 0, difference: 0 }));

vi.mock('../src/utils/gridMesh.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/gridMesh.ts')>();
  return {
    ...actual,
    boundaryMesh: (...args: Parameters<typeof actual.boundaryMesh>) => {
      counts.mesh += 1;
      return actual.boundaryMesh(...args);
    },
  };
});

vi.mock('../src/utils/keyBackground.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/keyBackground.ts')>();
  return {
    ...actual,
    keyBackground: (...args: Parameters<typeof actual.keyBackground>) => {
      counts.key += 1;
      return actual.keyBackground(...args);
    },
  };
});

vi.mock('../src/utils/hardenSilhouette.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/hardenSilhouette.ts')>();
  return {
    ...actual,
    hardenSilhouette: (...args: Parameters<typeof actual.hardenSilhouette>) => {
      counts.harden += 1;
      return actual.hardenSilhouette(...args);
    },
  };
});

vi.mock('../src/utils/differenceMap.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/differenceMap.ts')>();
  return {
    ...actual,
    differenceMap: (...args: Parameters<typeof actual.differenceMap>) => {
      counts.difference += 1;
      return actual.differenceMap(...args);
    },
  };
});

/** A whole sweep of the fixture, which is well past Vitest's own five seconds — see `autoTune.test.ts`. */
vi.setConfig({ testTimeout: 60_000 });

const GRID = 2;
const MAGENTA: Rgba = { r: 255, g: 0, b: 255, a: 255 };

/**
 * Pixel art on a magenta field, big enough that the sweep reads more than one window.
 *
 * The window count is what makes "once per crop" a different claim from "once per sweep", so the
 * sheet is sized to give `proxyCrops` several non-overlapping windows rather than the single one a
 * fixture the size of a crop would return.
 */
const ART = imageFrom(80, 80, (x, y) => {
  if (x < 8 || x >= 72 || y < 8 || y >= 72) return MAGENTA;
  if (x % 37 === 0) return { r: 14, g: 12, b: 18, a: 255 };
  if (y % 29 === 0) return { r: 245, g: 230, b: 150, a: 255 };
  return x < 40 ? { r: 60, g: 90, b: 150, a: 255 } : { r: 180, g: 110, b: 70, a: 255 };
});

/** What a model hands back: the art drawn at a scale of 2, then resampled so its edges soften. */
const SHEET = soften(upscaleNearest(ART, GRID));

const KEYED: QuantiseSettings = {
  ...QUANTISE_DEFAULT_DIALS,
  grid: GRID,
  // Keyed, because two of the three prologue passes only run at all when a key is in force — and a
  // keyed sheet is what every prompt this app writes asks a generator for.
  key: { color: MAGENTA, tolerance: 16 },
  reduction: null,
};

describe('the auto-tune sweep against the pipeline prologue', () => {
  it('measures the key, the hardening and the mesh once a crop, and no difference map at all', () => {
    const outcome = autoTune(SHEET, KEYED);

    // The sweep this is a claim about: many candidates, each run on every crop. Without this the
    // three assertions below would hold trivially over a sweep that had done nothing.
    expect(outcome.crops).toBeGreaterThan(1);
    expect(outcome.candidates).toBeGreaterThan(100);

    // Once a crop. Before the prologue was lifted out of `quantiseImage` each of these ran on every
    // candidate on every crop, which is `outcome.candidates * outcome.crops` — three orders of
    // magnitude more than the answers are worth, since none of their inputs can move.
    expect(counts.mesh).toBe(outcome.crops);
    expect(counts.key).toBe(outcome.crops);
    expect(counts.harden).toBe(outcome.crops);

    // And never, because `readCandidate` reads the image and the colour count and nothing else. This
    // is the one reading that costs a second walk over the source rather than falling out of the
    // transform, which is why it is the field `quantiseSheet` leaves out.
    expect(counts.difference).toBe(0);
  });
});
