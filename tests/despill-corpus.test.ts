import { beforeAll, describe, expect, it, vi } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { DEFAULT_KEY_TOLERANCE, DESPILL_DEPTH } from '../src/constants/quantiser.ts';
import type { QuantiseSettings } from '../src/types/quantiser.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, fromHex } from '../src/utils/imageData.ts';
import { keyBackground } from '../src/utils/keyBackground.ts';
import { carriesKeyTint, keyBasis } from '../src/utils/keyDistance.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { CORPUS_SHEETS, type CorpusSheetName, loadCorpus } from './sheetCorpus.ts';

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

/**
 * Each sheet's tint, as a percentage of the drawn pixels in a ring: rings 4 and 5 before the despill,
 * the most any ring inside the band keeps after it, and the sheet's interior — the mean of rings 6
 * to 10, which the despill never reaches and where no sheet's spill is left.
 */
interface Calibration {
  readonly ring4: number;
  readonly ring5: number;
  readonly band: number;
  readonly interior: number;
}
const CALIBRATION: Readonly<Record<CorpusSheetName, Calibration>> = {
  'armour.png': { ring4: 0.21, ring5: 0.01, band: 0, interior: 0.01 },
  'cyborg_black_red.png': { ring4: 0.89, ring5: 0.26, band: 0.04, interior: 0.15 },
  'character_space_marine_blue.png': { ring4: 1.72, ring5: 1.38, band: 0.63, interior: 1.11 },
  'cyborg_monk.png': { ring4: 1.96, ring5: 1.12, band: 0.51, interior: 0.52 },
  'cyborg_healer.png': { ring4: 6.54, ring5: 4.67, band: 2.85, interior: 3.59 },
  'three-quarter-view_tiles1.png': { ring4: 0, ring5: 0, band: 0, interior: 0 },
  'ui_elements1.png': { ring4: 0.95, ring5: 0.12, band: 0.02, interior: 0.07 },
  'vehicles_and_props.png': { ring4: 1.95, ring5: 0.96, band: 0.39, interior: 0.35 },
};

/** A percentage, to the two places the table above states. */
const percent = ([tinted, drawn]: [number, number]): number => Math.round((tinted / drawn) * 10_000) / 100;

describe('the figures DESPILL_DEPTH states', () => {
  let corpus: ReadonlyMap<CorpusSheetName, ImageData>;
  const sheet = (name: CorpusSheetName): ImageData => {
    const image = corpus.get(name);
    if (image === undefined) throw new Error(`${name} is missing from the corpus`);
    return image;
  };

  beforeAll(async () => {
    corpus = await loadCorpus();
  }, 300_000);

  /**
   * One sheet keyed with the despill on or off, computed once for each however many cases read it.
   *
   * The reference sheet's two keyings are read by the case stating its ring figures and again by its
   * row of the table, and a keying pass over 1.57 megapixels is most of what either costs. The pass is
   * pure, so the image read twice is the one a second run would return. The switch is put back
   * whatever happens, so no later case can inherit a despill somebody turned off.
   */
  const keyings = new Map<string, ImageData>();
  const keyed = (name: CorpusSheetName, withDespill: boolean): ImageData => {
    const id = `${name} ${withDespill ? 'with' : 'without'} the despill`;
    const cached = keyings.get(id);
    if (cached !== undefined) return cached;
    despill.off = !withDespill;
    try {
      const image = keyBackground(sheet(name), KEYING).image;
      keyings.set(id, image);
      return image;
    } finally {
      despill.off = false;
    }
  };

  it('leaves 23.2%, 8.4%, 1.9% and 0.2% of the reference sheet’s edge tinted without it, and none with it', () => {
    const before = tintByRing(keyed('armour.png', false), 5);
    const after = tintByRing(keyed('armour.png', true), 5);

    expect(before[0]).toEqual([2_465, 10_640]);
    expect(before.slice(0, 4).map(([tinted, drawn]) => ((tinted / drawn) * 100).toFixed(1))).toEqual([
      '23.2',
      '8.4',
      '1.9',
      '0.2',
    ]);
    expect(after.map(([tinted]) => tinted)).toEqual([0, 0, 0, 0, 0]);
  });

  it.each(CORPUS_SHEETS)('brings %s’s band to the table’s figure against its interior', (name) => {
    const [ring4 = [0, 1], ring5 = [0, 1]] = tintByRing(keyed(name, false), 5).slice(3);
    const rings = tintByRing(keyed(name, true), 10);
    const band = Math.max(...rings.slice(0, DESPILL_DEPTH).map(percent));
    const interior =
      Math.round((rings.slice(5).reduce((total, ring) => total + percent(ring), 0) / 5) * 100) / 100;

    expect({ ring4: percent(ring4), ring5: percent(ring5), band, interior }).toEqual(CALIBRATION[name]);
  });

  it('takes the reference sheet’s tinted outer ring at a grid of 6 from 5 to none, with or without 64 colours', () => {
    despill.off = true;
    const before = [
      outerRingAtGrid6(sheet('armour.png'), null)[0],
      outerRingAtGrid6(sheet('armour.png'), 64)[0],
    ];
    despill.off = false;
    const after = [
      outerRingAtGrid6(sheet('armour.png'), null)[0],
      outerRingAtGrid6(sheet('armour.png'), 64)[0],
    ];

    expect(before).toEqual([5, 5]);
    expect(after).toEqual([0, 0]);
  }, 300_000);

  it('takes 352 of the terrain sheet’s 2,333 outer-ring pixels under 64 colours to none', () => {
    const tiles = sheet('three-quarter-view_tiles1.png');
    despill.off = true;
    const before = outerRingAtGrid6(tiles, 64);
    despill.off = false;
    const after = outerRingAtGrid6(tiles, 64);

    expect(before).toEqual([352, 2_333]);
    expect(after[0]).toBe(0);
  }, 300_000);
});
