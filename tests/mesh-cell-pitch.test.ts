import { beforeAll, describe, expect, it } from 'vitest';
import { CORPUS_SHEETS, loadCorpus, type CorpusSheetName } from './sheetCorpus.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import { boundaryMesh } from '../src/utils/gridMesh.ts';
import { keyBackground } from '../src/utils/keyBackground.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import type { PixelGrid, QuantiseSettings } from '../src/types/quantiser.ts';

/**
 * Every cell the mesh cuts is within tolerance of the grid — on the eight real sheets, keyed and not.
 *
 * **The invariant, rather than the instance.** `downscaleNearest` emits one output pixel per mesh
 * cell, so a cell of one source pixel stands in the result exactly as wide as a cell of six and the
 * result stops being a reduction at one scale. That is what made `test_sprites/armour.png` — a
 * square sheet — quantise to 210 × 209 at a grid of 6, and to 209 × 212 with the keying on: the walk
 * stopped between 1 and `grid − 1`, a leading 0 was prepended in front of it, and the far edge closed
 * a one-pixel cell at the other end. Five of the sixteen sheet-and-keying combinations produced a
 * leading band of one or two pixels, and `cyborg_monk.png` keyed produced one on both axes.
 *
 * Nothing asserted the pitch. `gridMesh.test.ts` asserts where the cuts *land* — the ordering its
 * docblock argues for — which a one-pixel leading cell satisfies perfectly.
 *
 * **What is asserted here is what a drifting mesh can honestly promise, and no more.** Interior cells
 * sit within `axisTolerance` of the grid because each accepted cut re-anchors the next; the two end
 * cells hold at least three source pixels because `boundEndCells` merges anything shorter into its
 * neighbour, and no more than a full cell plus what merged into it. The result's dimensions are
 * deliberately **not** asserted to be a function of the source and the grid alone: each cut may move
 * within tolerance, so a keyed sheet honestly resolves a different number of cells from the same
 * sheet unkeyed. That difference is the measurement following the art; a one-pixel band was not.
 *
 * The corpus is the fixture because a hand-built sheet has no drift in it: every sheet here was
 * resampled on the way out of a generator, which is the only thing that produces the walk this is
 * about. Loaded once, in `beforeAll`.
 */

const MAGENTA = { r: 255, g: 0, b: 255, a: 255 } as const;

/** The grids swept: the tightest tolerance, the reference grid, and the widest merge. */
const GRIDS: readonly PixelGrid[] = [4, 6, 12];

/** The same figure `gridMesh.ts` derives its walk tolerance from — restated, never imported. */
function tolerance(grid: number): number {
  return Math.max(1, Math.floor(grid / 3));
}

/** And its end-cell floor, restated the same way — see `shortestEndCell`. */
function shortest(grid: number): number {
  return Math.min(3, grid - 1);
}

describe('mesh cell pitch', () => {
  let corpus: ReadonlyMap<CorpusSheetName, ImageData>;

  beforeAll(async () => {
    corpus = await loadCorpus();
  }, 120_000);

  it('cuts no cell narrower than the grid’s own tolerance allows, on any sheet at any grid', () => {
    for (const grid of GRIDS) {
      const floor = shortest(grid);
      for (const name of CORPUS_SHEETS) {
        const sheet = corpus.get(name);
        expect(sheet, name).toBeDefined();
        if (sheet === undefined) continue;
        const keyed = keyBackground(sheet, { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE }).image;

        for (const [keying, image] of [
          ['unkeyed', sheet],
          ['keyed', keyed],
        ] as const) {
          const mesh = boundaryMesh(image, grid);
          for (const [axis, starts, extent] of [
            ['x', mesh.x, image.width],
            ['y', mesh.y, image.height],
          ] as const) {
            const where = `${name} ${keying} ${axis} at grid ${String(grid)}`;
            expect(starts[0], `${where}: the axis must open at the image edge`).toBe(0);

            for (const [index, start] of starts.entries()) {
              const width = (starts[index + 1] ?? extent) - start;
              expect(
                width,
                `${where}: cell ${String(index)} is ${String(width)} wide`,
              ).toBeGreaterThanOrEqual(floor);
              // An end cell is the one that may exceed the pitch, and only by the band merged into
              // it — which is shorter than the floor, so the pair stays inside a cell plus two.
              const interior = index > 0 && index < starts.length - 1;
              const widest = grid + tolerance(grid) + (interior ? 0 : floor - 1);
              expect(width, `${where}: cell ${String(index)} is ${String(width)} wide`).toBeLessThanOrEqual(
                widest,
              );
            }
          }
        }
      }
    }
  }, 300_000);

  it('reduces the square reference sheet to a square result, keyed or not', () => {
    const sheet = corpus.get('armour.png');
    expect(sheet).toBeDefined();
    if (sheet === undefined) return;
    expect(sheet.width).toBe(sheet.height);

    const {
      keyingEnabled: _keyingEnabled,
      keyTolerance: _keyTolerance,
      paletteSnap: _paletteSnap,
      ...tuning
    } = QUANTISE_DEFAULT_DIALS;
    const base: QuantiseSettings = { ...tuning, grid: 6, key: null, reduction: null };

    // 1254 / 6 is 209 exactly, which is what the unkeyed sheet now resolves to. The keyed sheet
    // resolves one row more: the key changes what a boundary looks like, every cut may move within
    // tolerance, and a mesh that follows drift is entitled to answer differently — see the note above.
    const unkeyed = quantiseImage(sheet, base);
    expect([unkeyed.image.width, unkeyed.image.height]).toEqual([209, 209]);

    const keyed = quantiseImage(sheet, {
      ...base,
      key: { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE },
    });
    expect([keyed.image.width, keyed.image.height]).toEqual([209, 210]);
  }, 300_000);
});
