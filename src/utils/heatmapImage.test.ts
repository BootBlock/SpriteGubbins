import { describe, expect, it } from 'vitest';
import { DIFFERENCE_RAMP } from '../constants/differenceRamp.ts';
import { DIFFERENCE_PRECISION } from '../constants/quantiser.ts';
import type { DifferenceMap } from '../types/quantiser.ts';
import { heatmapImage } from './heatmapImage.ts';
import { readPixel } from './imageData.ts';
import { oklabToSrgb, oklchToOklab, srgbToOklab } from './oklab.ts';

/** A map of the given distances, laid out along one row. */
function mapOf(distances: readonly number[]): DifferenceMap {
  const cells = Uint16Array.from(distances, (distance) => Math.round(distance * DIFFERENCE_PRECISION));
  return {
    width: distances.length,
    height: 1,
    cells,
    mean: distances.reduce((total, distance) => total + distance, 0) / distances.length,
    peak: Math.max(...distances),
  };
}

/** The colour the ramp's `index`th stop resolves to, which is what the ends have to land on. */
function stop(index: number) {
  const entry = DIFFERENCE_RAMP[index];
  if (entry === undefined) throw new Error(`no ramp stop ${String(index)}`);
  return oklabToSrgb(oklchToOklab(entry.oklch[0], entry.oklch[1], entry.oklch[2]));
}

/** How light a colour reads, which is the axis the ramp climbs out of the ground on. */
function lightnessOf(pixel: { r: number; g: number; b: number }): number {
  return srgbToOklab(pixel.r, pixel.g, pixel.b).L;
}

describe('heatmapImage', () => {
  it('is the result’s own shape, so it lands on the artwork it measures', () => {
    const image = heatmapImage({ ...mapOf([0, 0, 0, 0, 0, 0]), width: 3, height: 2 }, 32);

    expect(image.width).toBe(3);
    expect(image.height).toBe(2);
  });

  it('paints no difference as the page’s own ground and the scale’s top as rose', () => {
    // Both ends exactly, because they are the ramp's claim: a faithful pixel disappears into the
    // pane and a lost one is the app's own colour for lost. Everything between is interpolation.
    const image = heatmapImage(mapOf([0, 32]), 32);

    expect(readPixel(image.data, 0)).toEqual(stop(0));
    expect(readPixel(image.data, 4)).toEqual(stop(DIFFERENCE_RAMP.length - 1));
  });

  it('holds anything past the scale at the top rather than wrapping round it', () => {
    // A cell four times the scale is still the worst there is, not a fresh trip round the ramp —
    // which is what an unclamped index into a 256-entry table would produce, and would paint the
    // most damaged cells on a sheet as though they were the cleanest.
    const image = heatmapImage(mapOf([32, 128, 900]), 32);

    expect(readPixel(image.data, 4)).toEqual(readPixel(image.data, 0));
    expect(readPixel(image.data, 8)).toEqual(readPixel(image.data, 0));
  });

  it('climbs steadily out of the ground, so a bigger difference never reads as a smaller one', () => {
    // Monotone lightness over the first two segments is what makes the map readable without a
    // legend: a mark that is brighter is worse. It cannot hold over the last segment — `gold` and
    // `rose` are two stops of one wheel and `rose` is the darker — which is why the ramp turns to
    // *hue* for that stretch, and why this checks the stretch it actually claims.
    const climbing = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 21];
    const image = heatmapImage(mapOf(climbing), 32);

    const lightnesses = climbing.map((_, index) => lightnessOf(readPixel(image.data, index * 4)));
    for (let index = 1; index < lightnesses.length; index += 1) {
      expect(lightnesses[index] ?? 0).toBeGreaterThan(lightnesses[index - 1] ?? 0);
    }
  });

  it('turns a rung of the scale into how closely the same map is being read', () => {
    // The same measurement at two scales: the finer rung has to paint a given cell *hotter*, which
    // is the whole of what the control does. A scale that was fitted to the map instead would give
    // both of these the same picture, which is the failure the fixed ladder exists to prevent.
    const map = mapOf([8]);

    expect(lightnessOf(readPixel(heatmapImage(map, 8).data, 0))).toBeGreaterThan(
      lightnessOf(readPixel(heatmapImage(map, 64).data, 0)),
    );
  });

  it('is fully opaque everywhere, including where nothing was lost', () => {
    // The frame it lands in otherwise shows the user's artwork through a transparency checkerboard,
    // and a heatmap the artwork came through would be read as part of it.
    const image = heatmapImage(mapOf([0, 1, 16, 64]), 32);

    for (let at = 3; at < image.data.length; at += 4) expect(image.data[at]).toBe(255);
  });

  it('does not stop the ramp one stop early, whatever the length of it', () => {
    // The interpolation clamps its segment index so the last step lands on the final stop rather
    // than one past the end — and an off-by-one the other way would end the ramp at `gold`, which
    // reads as a working heatmap that simply never reports anything as lost.
    const image = heatmapImage(mapOf([32]), 32);
    const last = stop(DIFFERENCE_RAMP.length - 1);
    const secondLast = stop(DIFFERENCE_RAMP.length - 2);

    expect(readPixel(image.data, 0)).toEqual(last);
    expect(readPixel(image.data, 0)).not.toEqual(secondLast);
  });
});
