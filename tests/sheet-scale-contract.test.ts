import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { imageFrom, soften } from '../src/test/images.ts';
import { jitter } from '../src/test/jitter.ts';
import { pitchedCells } from '../src/test/pitchedCells.ts';
import { pixelOffset, readPixel } from '../src/utils/imageData.ts';
import { measureSheetScale } from '../src/utils/pixelGrid.ts';
import type { ScaleMeasurement, SheetScale } from '../src/types/quantiser.ts';

/**
 * The scale readings' contract, held at the pitches the eight reference sheets do not cover.
 *
 * `sheet-scale-corpus.test.ts` states it: an offer is the pitch the art was drawn at or the integer
 * below it, never a coarser scale, because merging the art's cells cannot be undone. The corpus
 * holds pitches of 2, 3, ≈3.4, 4 and ≈4.7, and three kinds of sheet broke the contract where it
 * holds none (#479):
 *
 * - **Pitch 2 and 2.5.** The edge-period reader's ±1 window at 4 straddles two boundaries of art at
 *   2, and at 5 the two boundaries art at 2.5 puts in every five pixels, so it offered the double.
 *   The first case is the reference sheet itself: its native pixels at twice their size, with a
 *   fifth of the pixels nudged as a re-encode does, read as 4.
 * - **Fractional pitches**, which the correlation and boundary-spacing readings rounded to the
 *   nearer integer — 4.75 to 5, 6.75 to 7 — and which the correlation's descent, trying only halves
 *   and thirds, could read at a far multiple: art at 7.75 as 54, its seventh, and at 6 as 30.
 * - **Integer pitches next to them**, which a bare floor of a noisy measurement read one too fine —
 *   the direction the fix could break, so it is pinned beside the one it mends.
 */

interface ContractCase {
  readonly name: string;
  /** The pitch the sheet was drawn at, by construction. */
  readonly pitch: number;
  readonly build: () => ImageData;
  /** What the tab offers, pinned so a change that moves a reading has to say so. */
  readonly offered: SheetScale | null;
}

const offer = (grid: number, measurement: ScaleMeasurement): SheetScale => ({ grid, measurement });

/** The reference sheet's native pixels, sampled at the centre of each pitch-3 cell. */
let armourNative: ImageData;

/** The reference sheet's native pixels at twice their size, a fifth of them nudged by up to 2. */
function armourAtTwo(): ImageData {
  const doubled = imageFrom(armourNative.width * 2, armourNative.height * 2, (x, y) =>
    readPixel(armourNative.data, pixelOffset(armourNative.width, x >> 1, y >> 1)),
  );
  return jitter(doubled, 0.2, 2, 7);
}

const FRACTIONAL: readonly (readonly [number, number])[] = [
  [4.5, 4],
  [4.75, 4],
  [5.75, 5],
  [6.75, 6],
  [7.75, 7],
  [8.75, 8],
];

const CASES: readonly ContractCase[] = [
  {
    name: 'armour.png at twice its native size, jittered',
    pitch: 2,
    build: armourAtTwo,
    offered: offer(2, 'REPEAT_DISTANCE'),
  },
  { name: 'crisp art at 2', pitch: 2, build: () => pitchedCells(256, 2, 11), offered: offer(2, 'EXACT') },
  {
    name: 'jittered art at 2',
    pitch: 2,
    build: () => jitter(pitchedCells(256, 2, 11), 0.2, 2, 5),
    offered: offer(2, 'REPEAT_DISTANCE'),
  },
  { name: 'crisp art at 2.5', pitch: 2.5, build: () => pitchedCells(256, 2.5, 11), offered: null },
  {
    name: 'jittered art at 2.5',
    pitch: 2.5,
    build: () => jitter(pitchedCells(256, 2.5, 11), 0.2, 2, 5),
    offered: null,
  },
  ...FRACTIONAL.flatMap(([pitch, grid]): ContractCase[] => [
    {
      name: `softened art at ${String(pitch)}`,
      pitch,
      build: () => soften(pitchedCells(512, pitch, 3)),
      offered: offer(grid, 'REPEAT_DISTANCE'),
    },
    {
      name: `crisp art at ${String(pitch)}`,
      pitch,
      build: () => pitchedCells(512, pitch, 3),
      offered: offer(grid, 'BOUNDARY_SPACING'),
    },
  ]),
  ...[5, 6, 7, 9].map((pitch): ContractCase => ({
    name: `softened art at ${String(pitch)}`,
    pitch,
    build: () => soften(pitchedCells(512, pitch, 3)),
    offered: offer(pitch, 'EDGE_PERIOD'),
  })),
  ...[5, 7].map((pitch): ContractCase => ({
    name: `softened, jittered art at ${String(pitch)}`,
    pitch,
    build: () => jitter(soften(pitchedCells(384, pitch, 2)), 0.3, 6, 2),
    offered: offer(pitch, 'REPEAT_DISTANCE'),
  })),
];

describe('the scale readings’ contract, on sheets drawn at a known pitch', () => {
  beforeAll(async () => {
    const armour = await loadCorpusSheet('armour.png');
    const cells = Math.floor(armour.width / 3);
    armourNative = imageFrom(cells, cells, (x, y) =>
      readPixel(armour.data, pixelOffset(armour.width, x * 3 + 1, y * 3 + 1)),
    );
  }, 600_000);

  it.each(CASES)(
    'offers $name what it records, never coarser than the pitch',
    ({ pitch, build, offered }) => {
      const actual = measureSheetScale(build());

      expect(actual).toStrictEqual(offered);
      if (actual === null) return;
      expect(
        actual.grid,
        `offered ${String(actual.grid)} against a pitch of ${String(pitch)}`,
      ).toBeLessThanOrEqual(pitch);
      expect(
        actual.grid,
        `offered ${String(actual.grid)}, a pixel or more under ${String(pitch)}`,
      ).toBeGreaterThan(pitch - 1);
    },
  );
});
