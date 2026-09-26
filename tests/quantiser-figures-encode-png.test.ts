import { beforeAll, describe, expect, it } from 'vitest';
import { calibrationSettings } from './calibrationSettings.ts';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { BACKGROUND_KEY_COLORS } from '../src/constants/backgroundKeyColors.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import { deflate } from '../src/utils/deflate.ts';
import { encodePng } from '../src/utils/encodePng.ts';
import { filterScanlines, PNG_FILTER_NONE, PNG_FILTERS, type FilterInput } from '../src/utils/pngFilter.ts';
import { indexImage } from '../src/utils/pngPalette.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';

/**
 * The file sizes both of `encodePng`'s docblocks state, re-derived from the reference sheet. See
 * `calibrationSettings.ts` for why the docblock-figure suites exist.
 *
 * They are the module note's case for writing indexed at all, and the case for filtering an indexed
 * sheet with `None` alone, so a figure that drifted would leave either argument resting on a file
 * the app no longer writes. Every one of them is downstream of the palette a budget chooses, and the
 * keyed half had drifted before this suite existed.
 *
 * The truecolour and adaptively filtered sizes are of files the writer does not produce for this
 * sheet, so they are built here from the writer's own parts: the same `filterScanlines` and
 * `deflate`, with only the candidate filters or the bytes per pixel changed. An `IDAT` figure is the
 * chunk's data, which is what `deflate` returns; a complete file is that plus the 57 bytes of
 * signature, `IHDR`, `IEND` and the `IDAT` chunk's own framing.
 */
describe("encodePng's file sizes", () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  const KEY = BACKGROUND_KEY_COLORS.MAGENTA_FF00FF;
  if (KEY === null) throw new Error('MAGENTA_FF00FF names no colour');

  /** The `IDAT` payload for `input`, filtered by `candidates`. */
  const idatBytes = async (input: Omit<FilterInput, 'candidates'>, candidates: FilterInput['candidates']) =>
    (await deflate(filterScanlines({ ...input, candidates }))).length;

  /** The indexed file, its truecolour `IDAT`, and the indexed `IDAT` stored and adaptively filtered. */
  const sizesOf = async (keyed: boolean): Promise<number[]> => {
    const key = keyed ? { color: KEY, tolerance: DEFAULT_KEY_TOLERANCE } : null;
    const { image } = quantiseImage(sheet, calibrationSettings({ key }));
    const indexed = indexImage(image);
    if (indexed === null) throw new Error('the reference sheet at a budget of 64 should fit a palette');
    const rows = { height: image.height };
    const raw = new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength);
    const truecolour = { ...rows, raw, rowBytes: image.width * 4, bytesPerPixel: 4 };
    const indices = { ...rows, raw: indexed.indices, rowBytes: image.width, bytesPerPixel: 1 };
    return [
      (await encodePng(image)).bytes.length,
      await idatBytes(truecolour, PNG_FILTERS),
      await idatBytes(indices, PNG_FILTER_NONE),
      await idatBytes(indices, PNG_FILTERS),
    ];
  };

  it('the unkeyed sheet, at a grid of 6 and a budget of 64', async () => {
    expect(await sizesOf(false)).toEqual([15_673, 39_047, 15_412, 17_422]);
  }, 240_000);

  it('the same sheet keyed on magenta at the default tolerance', async () => {
    expect(await sizesOf(true)).toEqual([10_776, 30_118, 10_499, 12_067]);
  }, 240_000);
});
