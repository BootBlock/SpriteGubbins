import { beforeAll, describe, expect, it } from 'vitest';
import { cellDeviation, truthAgreement } from './meshFit.ts';
import { loadCorpus, type CorpusSheetName } from './sheetCorpus.ts';
import { DEFAULT_KEY_TOLERANCE, PATCH_MARGIN_CELLS } from '../src/constants/quantiser.ts';
import { phasedSpriteSheet } from '../src/test/phasedSpriteSheet.ts';
import { cropImage } from '../src/utils/cropImage.ts';
import { boundaryMesh } from '../src/utils/gridMesh.ts';
import { keyBackground } from '../src/utils/keyBackground.ts';
import { patchAxis } from '../src/utils/patchAxis.ts';
import { patchSpans } from '../src/utils/patchSpans.ts';
import { stepProfile } from '../src/utils/stepProfile.ts';
import type { GridMesh, PixelGrid } from '../src/types/quantiser.ts';

/**
 * The figures the mesh patches are argued from: `meshPatches`, `PATCH_MARGIN_CELLS` and
 * `SMALLEST_PATCHED_GRID` each state some of them. See `calibrationSettings.ts` for why the
 * docblock-figure suites exist.
 *
 * **Each comparison is the same sheet cut two ways**: by `boundaryMesh` as it ships, and by the same
 * mesh with its patches taken away, which is the sheet's own cuts alone — what the mesh was before
 * patches existed. The corpus is keyed at the default tolerance, because a patch needs the key's
 * transparency to find a sprite, and scored by `cellDeviation`; the synthetic sheets are scored
 * against the art they were drawn from by `truthAgreement`. `meshFit.ts` defines both.
 */

/** The corpus pairs `meshPatches` states its fall on, grids 3 to 8. */
const PAIRS: readonly (readonly [CorpusSheetName, PixelGrid])[] = [
  ['armour.png', 3],
  ['ui_elements1.png', 4],
  ['three-quarter-view_tiles1.png', 4],
  ['cyborg_black_red.png', 4],
  ['ui_elements1.png', 5],
  ['armour.png', 6],
  ['cyborg_monk.png', 6],
  ['cyborg_healer.png', 8],
];

const MAGENTA = { r: 255, g: 0, b: 255, a: 255 } as const;
const SEEDS = [1, 2, 3] as const;

/** The mesh without its patches: the sheet's own cuts alone. */
function unpatched(mesh: GridMesh): GridMesh {
  return { x: mesh.x, y: mesh.y, patches: [] };
}

/**
 * `meshPatches` at another margin and without its grid floor — the variants the two constants are
 * argued against, composed from the same two passes it composes.
 */
function patchedAt(image: ImageData, grid: PixelGrid, margin: number): GridMesh {
  const mesh = boundaryMesh(image, grid);
  const patches = patchSpans(image, mesh, margin).map((span) => {
    const right = mesh.x[span.columnEnd] ?? image.width;
    const bottom = mesh.y[span.rowEnd] ?? image.height;
    const left = mesh.x[span.column] ?? 0;
    const top = mesh.y[span.row] ?? 0;
    const profile = stepProfile(cropImage(image, left, top, right - left, bottom - top));
    return {
      column: span.column,
      row: span.row,
      x: patchAxis(mesh.x.slice(span.column, span.columnEnd), right, profile.columnEvidence, grid),
      y: patchAxis(mesh.y.slice(span.row, span.rowEnd), bottom, profile.rowEvidence, grid),
    };
  });
  return { x: mesh.x, y: mesh.y, patches };
}

/** The mean agreement over the three seeds of one synthetic case, cut by `cut`. */
function synthetic(
  pitch: (next: () => number) => number,
  globalPhase: boolean,
  cut: (image: ImageData) => GridMesh,
): number {
  let total = 0;
  for (const seed of SEEDS) {
    const sheet = phasedSpriteSheet(seed, pitch, globalPhase);
    total += truthAgreement(sheet.keyed, sheet.truth, cut(sheet.keyed)).score;
  }
  return total / SEEDS.length;
}

describe('the mesh patches — the figures they are argued from', () => {
  let keyed: ReadonlyMap<CorpusSheetName, ImageData>;

  beforeAll(async () => {
    const corpus = await loadCorpus([...new Set(PAIRS.map(([name]) => name))]);
    keyed = new Map(
      [...corpus].map(([name, sheet]) => [
        name,
        keyBackground(sheet, { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE }).image,
      ]),
    );
  }, 120_000);

  /** The deviation before and after, and the percentage it fell by, for one corpus pair. */
  function corpusFall(name: CorpusSheetName, grid: PixelGrid) {
    const image = keyed.get(name);
    if (image === undefined) throw new Error(`The corpus did not load ${name}.`);
    const mesh = boundaryMesh(image, grid);
    const before = cellDeviation(image, unpatched(mesh));
    const after = cellDeviation(image, mesh);
    return { before, after, fall: ((before.score - after.score) / before.score) * 100 };
  }

  it('lowers the deviation on every pair from grid 3 to 8, without cutting more cells to do it', () => {
    for (const [name, grid] of PAIRS) {
      const { before, after } = corpusFall(name, grid);
      const where = `${name} at grid ${String(grid)}`;
      expect(after.score, where).toBeLessThan(before.score);
      expect(after.cells, where).toBeLessThanOrEqual(before.cells * 1.01);
    }
  }, 300_000);

  it('lowers it by 18% on ui_elements1.png at grid 5 and by 1% on cyborg_healer.png at grid 8', () => {
    expect(Math.round(corpusFall('ui_elements1.png', 5).fall)).toBe(18);
    expect(Math.round(corpusFall('cyborg_healer.png', 8).fall)).toBe(1);
  }, 300_000);

  it('scores a margin of one cell best of 0 to 3 over the eight pairs', () => {
    const sums = [0, 1, 2, 3].map((margin) =>
      PAIRS.reduce((sum, [name, grid]) => {
        const image = keyed.get(name);
        return image === undefined ? sum : sum + cellDeviation(image, patchedAt(image, grid, margin)).score;
      }, 0),
    );
    expect(sums.map((sum) => sum.toFixed(1))).toEqual(['472.5', '470.5', '473.5', '477.5']);
    expect(PATCH_MARGIN_CELLS).toBe(1);
  }, 600_000);

  it('costs three-quarter-view_tiles1.png at grid 4 more at a margin of 0 than at 1', () => {
    const image = keyed.get('three-quarter-view_tiles1.png');
    if (image === undefined) throw new Error('The corpus did not load the tiles sheet.');
    expect(cellDeviation(image, patchedAt(image, 4, 1)).score.toFixed(2)).toBe('27.55');
    expect(cellDeviation(image, patchedAt(image, 4, 0)).score.toFixed(2)).toBe('28.71');
  }, 300_000);

  it('would cost art drawn at 2 pixels a cell, and gains at 3', () => {
    const at = (grid: PixelGrid) => ({
      before: synthetic(
        () => grid,
        false,
        (image) => unpatched(boundaryMesh(image, grid)),
      ),
      after: synthetic(
        () => grid,
        false,
        (image) => patchedAt(image, grid, PATCH_MARGIN_CELLS),
      ),
    });
    const two = at(2);
    const three = at(3);
    expect([two.before.toFixed(1), two.after.toFixed(1)]).toEqual(['47.6', '37.7']);
    expect([three.before.toFixed(1), three.after.toFixed(1)]).toEqual(['52.0', '62.1']);
  }, 300_000);

  it('raises agreement from 52–59% to 62–88% where each sprite has its own phase', () => {
    const cases: readonly (readonly [PixelGrid, (next: () => number) => number])[] = [
      [3, () => 3],
      [4, (next) => 4 * (0.96 + 0.08 * next())],
      [5, (next) => 5 * (0.96 + 0.08 * next())],
      [6, () => 6],
      [8, (next) => 8 * (0.96 + 0.08 * next())],
    ];
    const before = cases.map(([grid, pitch]) =>
      synthetic(pitch, false, (image) => unpatched(boundaryMesh(image, grid))),
    );
    const after = cases.map(([grid, pitch]) => synthetic(pitch, false, (image) => boundaryMesh(image, grid)));
    expect([Math.round(Math.min(...before)), Math.round(Math.max(...before))]).toEqual([52, 59]);
    expect([Math.round(Math.min(...after)), Math.round(Math.max(...after))]).toEqual([62, 88]);
  }, 300_000);
});
