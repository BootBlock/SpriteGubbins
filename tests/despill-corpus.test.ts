import { beforeAll, describe, expect, it, vi } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import type { QuantiseSettings } from '../src/types/quantiser.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, fromHex } from '../src/utils/imageData.ts';
import { keyBackground } from '../src/utils/keyBackground.ts';
import { carriesKeyTint, keyBasis } from '../src/utils/keyDistance.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { loadCorpusSheet } from './sheetCorpus.ts';

/**
 * The figures `DESPILL_DEPTH`'s docblock states, measured on the corpus sheets they name.
 *
 * **The before half is measured with the despill switched off**, through a module mock that hands
 * every call to the real `despillKey` unless a test asks otherwise. The other way to get it — keep
 * a copy of the old keying — would be a second implementation free to drift from the one shipped.
 */
const despill = vi.hoisted(() => ({ off: false }));
vi.mock('../src/utils/despillKey.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/despillKey.ts')>();
  return {
    despillKey: (...args: Parameters<typeof actual.despillKey>) => {
      if (!despill.off) actual.despillKey(...args);
    },
  };
});

const MAGENTA = fromHex('#FF00FF');
if (MAGENTA === null) throw new Error('the key colour no longer parses');
const KEYING = { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE };
const BASIS = keyBasis(MAGENTA);

/** How many drawn pixels in each ring out from the transparent field carry the key's tint, and of how many. */
function tintByRing(image: ImageData, rings: number): [tinted: number, drawn: number][] {
  const { width, height, data } = image;
  const depth = new Int32Array(width * height).fill(-1);
  let frontier: number[] = [];
  for (let index = 0; index < width * height; index += 1) {
    if (data[index * CHANNELS_PER_PIXEL + 3] === FULLY_TRANSPARENT) {
      depth[index] = 0;
      frontier.push(index);
    }
  }
  const counts: [number, number][] = [];
  for (let ring = 1; ring <= rings; ring += 1) {
    const next: number[] = [];
    let tinted = 0;
    for (const index of frontier) {
      const x = index % width;
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        index - width,
        index + width,
      ];
      for (const at of neighbours) {
        if (at < 0 || at >= width * height || depth[at] !== -1) continue;
        depth[at] = ring;
        next.push(at);
        if (carriesKeyTint(data, at * CHANNELS_PER_PIXEL, BASIS)) tinted += 1;
      }
    }
    counts.push([tinted, next.length]);
    frontier = next;
  }
  return counts;
}

/** The key-tinted pixels on the outermost ring of a quantised result at a grid of 6. */
function outerRingAtGrid6(sheet: ImageData, maxColors: number | null): [number, number] {
  const settings: QuantiseSettings = {
    ...QUANTISE_DEFAULT_DIALS,
    grid: 6,
    key: KEYING,
    reduction: maxColors === null ? null : { kind: 'MAX_COLORS', maxColors },
  };
  const [ring = [0, 0]] = tintByRing(quantiseImage(sheet, settings).image, 1);
  return ring;
}

describe('the figures DESPILL_DEPTH states', () => {
  let armour: ImageData;
  let tiles: ImageData;

  beforeAll(async () => {
    armour = await loadCorpusSheet('armour.png');
    tiles = await loadCorpusSheet('three-quarter-view_tiles1.png');
  }, 120_000);

  it('leaves 23.2%, 8.4% and 1.9% of the reference sheet’s edge tinted without it, and 7, 19 and 18 pixels with it', () => {
    despill.off = true;
    const before = tintByRing(keyBackground(armour, KEYING).image, 4);
    despill.off = false;
    const after = tintByRing(keyBackground(armour, KEYING).image, 4);

    expect(before[0]).toEqual([2_465, 10_640]);
    expect(before.map(([tinted, drawn]) => ((tinted / drawn) * 100).toFixed(1))).toEqual([
      '23.2',
      '8.4',
      '1.9',
      '0.2',
    ]);
    expect(after.map(([tinted]) => tinted)).toEqual([7, 19, 18, 21]);
  });

  it('takes the reference sheet’s tinted outer ring at a grid of 6 from 5 to 1, and from 39 to 0 under 64 colours', () => {
    despill.off = true;
    const before = [outerRingAtGrid6(armour, null)[0], outerRingAtGrid6(armour, 64)[0]];
    despill.off = false;
    const after = [outerRingAtGrid6(armour, null)[0], outerRingAtGrid6(armour, 64)[0]];

    expect(before).toEqual([5, 39]);
    expect(after).toEqual([1, 0]);
  }, 300_000);

  it('takes 712 of the terrain sheet’s 2,333 outer-ring pixels under 64 colours to none', () => {
    despill.off = true;
    const before = outerRingAtGrid6(tiles, 64);
    despill.off = false;
    const after = outerRingAtGrid6(tiles, 64);

    expect(before).toEqual([712, 2_333]);
    expect(after[0]).toBe(0);
  }, 300_000);
});
