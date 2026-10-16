import { beforeAll, describe, expect, it } from 'vitest';
import { CORPUS_SHEETS, loadCorpus, type CorpusSheetName } from './sheetCorpus.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import { boundaryMesh } from '../src/utils/gridMesh.ts';
import { keyBackground } from '../src/utils/keyBackground.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import type { GridMesh, PixelGrid, QuantiseSettings } from '../src/types/quantiser.ts';

/**
 * Every cell the mesh cuts is within tolerance of the grid — on the eight real sheets, keyed and not.
 *
 * **The invariant, rather than the instance.** `downscaleNearest` emits one output pixel per mesh
 * cell, so a cell of one source pixel stands in the result exactly as wide as a cell of six and the
 * result stops being a reduction at one scale. That is what made `test_sprites/armour.png` — a
 * square sheet — quantise to 210 × 209 at a grid of 6, and to 209 × 212 with the keying on: the walk
 * stopped between 1 and `grid − 1`, a leading 0 was prepended in front of it, and the far edge closed
 * a short cell at the other end. Thirteen of the sixteen sheet-and-keying combinations carried such a
 * band at one end or the other, eight of them at the leading end — and two, `cyborg_monk.png` keyed
 * and `three-quarter-view_tiles1.png` unkeyed, on both axes at once.
 *
 * Nothing asserted the pitch. `gridMesh.test.ts` asserts where the cuts *land* — the ordering
 * `meshAxis`'s docblock argues for — which a one-pixel leading cell satisfies perfectly.
 *
 * **What is asserted here is what a drifting mesh can honestly promise, and no more.** Interior cells
 * sit within `axisTolerance` of the grid because each accepted cut re-anchors the next; the two end
 * cells hold at least three source pixels because `boundEndCells` merges anything shorter into its
 * neighbour, and no more than a full cell plus a band at each end — a single cell can absorb both,
 * on an axis short enough to hold only one, which `gridMesh.test.ts` covers and no sheet this size
 * reaches. The result's dimensions are
 * deliberately **not** asserted to be a function of the source and the grid alone: each cut may move
 * within tolerance, so a keyed sheet honestly resolves a different number of cells from the same
 * sheet unkeyed. That difference is the measurement following the art; a one-pixel band was not.
 *
 * The corpus is the fixture because a hand-built sheet has no drift in it: every sheet here was
 * resampled on the way out of a generator, which is the only thing that produces the walk this is
 * about. Loaded once, in `beforeAll`.
 */

const MAGENTA = { r: 255, g: 0, b: 255, a: 255 } as const;

/**
 * The grids swept: the one grid with no window at all, the tightest window, the reference grid, and
 * the widest merge. A grid of 2 is also the one grid no patch is cut at.
 */
const GRIDS: readonly PixelGrid[] = [2, 4, 6, 12];

/** The same figure `axisTolerance.ts` states for the walk and the patches — restated, never imported. */
function tolerance(grid: number): number {
  return Math.floor(grid / 3);
}

/** And the end-cell floor `boundEndCells.ts` holds every mesh to, restated the same way — see `shortestEndCell`. */
function shortest(grid: number): number {
  return Math.min(3, grid - 1);
}

/**
 * Every patch's cells, held to what a patch may do to the cells it re-cuts.
 *
 * Inside a patch a cell is cut the way the walk cuts one, within `tolerance` of the grid. The two
 * edge cells take up the patch's shift, which is at most half a cell, and the snap of the cut beside
 * them: each is the mesh's own cell before the patch, so it may shrink to half a cell (or stay as
 * narrow as the mesh's end cell already was) and grow by half a cell and the window. A patch never
 * adds or removes a cell, and it opens on the mesh's own cut.
 */
function expectPatchCellsFit(mesh: GridMesh, image: ImageData, grid: PixelGrid, where: string): void {
  if (grid === 2) expect(mesh.patches, `${where}: no patch is cut at a grid of 2`).toEqual([]);
  const narrowest = Math.min(shortest(grid), Math.ceil(grid / 2));
  const widest = grid + tolerance(grid) + 2 * (shortest(grid) - 1) + Math.floor(grid / 2) + tolerance(grid);
  for (const patch of mesh.patches) {
    for (const [axis, starts, first, cuts, extent] of [
      ['x', patch.x, patch.column, mesh.x, image.width],
      ['y', patch.y, patch.row, mesh.y, image.height],
    ] as const) {
      const at = `${where}: the patch at ${String(patch.column)}, ${String(patch.row)} on ${axis}`;
      expect(starts[0], `${at} must open on the mesh’s own cut`).toBe(cuts[first]);
      const end = cuts[first + starts.length] ?? extent;
      for (const [index, start] of starts.entries()) {
        const width = (starts[index + 1] ?? end) - start;
        const edge = index === 0 || index === starts.length - 1;
        const cell = `${at}, cell ${String(index)}, is ${String(width)} wide`;
        expect(width, cell).toBeGreaterThanOrEqual(edge ? narrowest : grid - tolerance(grid));
        expect(width, cell).toBeLessThanOrEqual(edge ? widest : grid + tolerance(grid));
      }
    }
  }
}

describe('mesh cell pitch', () => {
  let corpus: ReadonlyMap<CorpusSheetName, ImageData>;

  beforeAll(async () => {
    corpus = await loadCorpus();
  }, 120_000);

  it('cuts no cell narrower than the grid’s own tolerance allows, on any sheet at any grid', () => {
    for (const name of CORPUS_SHEETS) {
      const sheet = corpus.get(name);
      expect(sheet, name).toBeDefined();
      if (sheet === undefined) continue;
      // Keyed once per sheet rather than once per grid: the key does not depend on the grid, and a
      // keying pass over one to two megapixels is most of what this case costs.
      const keyed = keyBackground(sheet, { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE }).image;

      for (const grid of GRIDS) {
        const floor = shortest(grid);
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
              // An end cell is the one that may exceed the pitch, and only by the bands merged into
              // it — each shorter than the floor. A cell can absorb one at each end, so the bound is
              // stated for two even though only a one-cell axis collects both.
              const interior = index > 0 && index < starts.length - 1;
              const widest = grid + tolerance(grid) + (interior ? 0 : 2 * (floor - 1));
              expect(width, `${where}: cell ${String(index)} is ${String(width)} wide`).toBeLessThanOrEqual(
                widest,
              );
              if (interior) {
                expect(
                  width,
                  `${where}: cell ${String(index)} is ${String(width)} wide`,
                ).toBeGreaterThanOrEqual(grid - tolerance(grid));
              }
            }
          }
          expectPatchCellsFit(mesh, image, grid, `${name} ${keying} at grid ${String(grid)}`);
        }
      }
    }
  }, 300_000);

  it('reduces the square reference sheet to a square result, and to one row more when keyed', () => {
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
