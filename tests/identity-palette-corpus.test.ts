import { beforeAll, describe, expect, it, vi } from 'vitest';

import { BACKGROUND_KEY_COLORS } from '../src/constants/backgroundKeyColors.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import type { Rgba } from '../src/types/quantiser.ts';
import { BACKGROUND_KEYS } from '../src/types/rendering.ts';
import { identityPalette } from '../src/utils/identityPalette.ts';
import { createImage, writePixel } from '../src/utils/imageData.ts';
import { keyBasis, keyDistanceSquared } from '../src/utils/keyDistance.ts';
import { CORPUS_SHEETS, type CorpusSheetName, loadCorpus } from './sheetCorpus.ts';

/**
 * That an identity digest read off a real generator sheet describes the subject, not the key field.
 *
 * **The defect this pins was invisible to a fixture and unmissable on the corpus.** `identityPalette`
 * excluded the background key by comparing RGB for exact equality, which is right for the uniform
 * field section 0 of the template asks for and wrong for every sheet a generator has ever returned:
 * these eight are resampled on the way out, so **not one pixel of any of them is exactly `#FF00FF`**
 * while the key covers 52.7% to 73.7% of each. The exclusion matched nothing, and the coverage
 * ordering the function relies on then put the largest thing in the image first — so the digest
 * opened with a magenta on all eight, and the compiled prompt asked the model to reproduce it
 * exactly under a heading saying the identity lock wins over everything above it.
 *
 * **Asserted as a distance rather than as a recorded list.** Pinning the six hexes each sheet
 * produces would fail on any change to the palette builder, the coverage ordering or the keying
 * tolerance — none of which this file is about. What it asserts instead is the claim the control's
 * own guidance makes: no colour in a digest is one the keying pass would have called the key. Run
 * against the exact comparison it replaces, all eight sheets fail on the very first entry.
 *
 * **Every offered key, not only the recommended one.** `PURE_WHITE` and `PURE_BLACK` are the reason
 * a tolerance was refused here for a long time — a plain radius around either eats a sheet's own
 * highlights and outlines — so they are the keys worth checking rather than the ones worth skipping.
 * The corpus is magenta-keyed, so those two measure what the exclusion costs the *artwork*: at
 * `DEFAULT_KEY_TOLERANCE` it reaches 0.03%–1.50% of a sheet for white and 0.67%–2.72% for black,
 * against 52.7%–73.7% for the key the sheets actually carry. `TRANSPARENT` names no colour, and the
 * assertion for it is that a digest still comes back.
 */

/** The eight sheets are one to two megapixels each, and each key runs the whole keying pass. */
vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

/**
 * How far a digest entry sits from the key, by the measure the keying pass itself uses.
 *
 * Through `keyDistanceSquared` rather than a plain colour distance, because that is the function
 * deciding what the field is: an entry this calls far from the key is one the pass would have left
 * on the sheet, which is exactly the claim being made.
 */
function distanceFromKey(hex: string, key: Rgba): number {
  const probe = createImage(1, 1);
  writePixel(probe.data, 0, {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
    a: 255,
  });
  return Math.sqrt(keyDistanceSquared(probe.data, 0, keyBasis(key)));
}

describe('the identity digest read from a real generator sheet', () => {
  let corpus: ReadonlyMap<CorpusSheetName, ImageData>;

  beforeAll(async () => {
    corpus = await loadCorpus();
  });

  /** One sheet, or a failure that names it rather than an undefined a line later. */
  function sheet(name: CorpusSheetName): ImageData {
    const image = corpus.get(name);
    if (image === undefined) throw new Error(`The corpus is missing ${name}`);
    return image;
  }

  it.each(CORPUS_SHEETS)('leads %s with a colour of the subject, never the key field', (name) => {
    const key = BACKGROUND_KEY_COLORS.MAGENTA_FF00FF;
    if (key === null) throw new Error('The recommended key names no colour');

    const digest = identityPalette(sheet(name), key);

    // Without this an empty digest would satisfy every assertion below by holding nothing.
    expect(digest.length).toBeGreaterThan(1);
    // The leading entry is the one the prompt reads as the subject's base colour, and it is where
    // every one of the eight failed.
    expect(distanceFromKey(digest[0] ?? '#000000', key)).toBeGreaterThan(DEFAULT_KEY_TOLERANCE);
  });

  it.each(CORPUS_SHEETS)('keeps every entry of %s out of the key field, at every offered key', (name) => {
    const image = sheet(name);
    const inTheField: string[] = [];
    let entries = 0;

    for (const named of BACKGROUND_KEYS) {
      const key = BACKGROUND_KEY_COLORS[named];
      const digest = identityPalette(image, key);

      // A sheet has colours whichever key is stated; `TRANSPARENT` names none to exclude, so this is
      // the whole of what can be asserted for it.
      expect(digest.length).toBeGreaterThan(1);
      if (key === null) continue;

      entries += digest.length;
      for (const [index, entry] of digest.entries()) {
        const distance = distanceFromKey(entry, key);
        if (distance > DEFAULT_KEY_TOLERANCE) continue;
        inTheField.push(
          `${named} entry ${String(index + 1)} is ${entry}, ${distance.toFixed(1)} from the key ` +
            `(the pass keys anything within ${String(DEFAULT_KEY_TOLERANCE)})`,
        );
      }
    }

    // Three keys name a colour, six entries each at most, so a run that measured nothing would
    // report no offenders and pass.
    expect(entries).toBeGreaterThan(3);
    expect(inTheField).toEqual([]);
  });
});
