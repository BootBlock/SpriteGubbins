import { beforeAll, describe, expect, it, vi } from 'vitest';

import { BACKGROUND_KEY_COLORS } from '../src/constants/backgroundKeyColors.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import type { Rgba } from '../src/types/quantiser.ts';
import { BACKGROUND_KEYS } from '../src/types/rendering.ts';
import { identityPalette } from '../src/utils/identityPalette.ts';
import { createImage, fromHex, readPixel, writePixel } from '../src/utils/imageData.ts';
import { keyBackground } from '../src/utils/keyBackground.ts';
import { carriesKeyTint, keyBasis, keyDistanceSquared } from '../src/utils/keyDistance.ts';
import { type CorpusSheetName, loadCorpus } from './sheetCorpus.ts';

/**
 * That an identity digest read off a real generator sheet describes the subject, not the key field.
 *
 * **The defect this pins was invisible to a fixture and unmissable on the corpus.** `identityPalette`
 * excluded the background key by comparing RGB for exact equality, which is right for the uniform
 * field section 0 of the template asks for and wrong for every sheet a generator has ever returned:
 * these eight are resampled on the way out, so the pixels that are **exactly** `#FF00FF` number 0,
 * 2, 4, 7, 9, 9, 16 and 36 out of about 1.57 million each, while the key field covers 52.7% to 73.7%
 * of them. The exclusion removed essentially nothing, and the coverage ordering the function relies
 * on then put the largest thing in the image first — so the digest opened with a magenta on all
 * eight, and the compiled prompt asked the model to reproduce it exactly under a heading saying the
 * identity lock wins over everything above it.
 *
 * **Asserted as a distance rather than as a recorded list.** Pinning the six hexes each sheet
 * produces would fail on any change to the palette builder, the coverage ordering or the keying
 * tolerance — none of which this suite is about. What it asserts instead is the claim the control's
 * own guidance makes: no colour in a digest is one the keying pass would have called the key. Run
 * against the exact comparison it replaces, all eight sheets fail on the very first entry.
 *
 * **Every offered key, and what that half of the sweep can and cannot say.** `PURE_WHITE` and
 * `PURE_BLACK` are the reason a tolerance was refused here for a long time — for a key with no hue
 * `keyDistance` withholds its discount, so what is left is exactly the plain radius that objection
 * named. Running them here asserts that the exclusion does not *invent* a key entry on a sheet keyed
 * with something else, and it measures what the pass costs the artwork in passing: at
 * `DEFAULT_KEY_TOLERANCE` the whole pass — field and fringe, which is what `subjectPixels` runs —
 * removes 0.04%–2.09% of a corpus sheet for white and 0.92%–3.83% for black, against the
 * 53.5%–74.8% it removes for the magenta these sheets actually carry.
 *
 * **It is not the white key's own case, and reading it as one would be the mistake.** Every sheet
 * here is magenta-keyed, so nothing in this suite has a white *field* to lose artwork to — and the
 * cost that matters for that key is what happens when the field really is white, where the radius
 * takes the top 32 bytes of the value ramp. That is a fixture's question rather than a corpus one,
 * and it is asserted at both ends in `src/utils/identityPalette.test.ts`.
 *
 * `TRANSPARENT` names no colour, and the assertion for it is that a digest still comes back.
 *
 * Run as two files, `identity-palette-corpus-first-half.test.ts` and `-second-half.test.ts`, each
 * over one of `CORPUS_HALVES`, so the two halves can take two workers.
 */

/** The sheets are one to two megapixels each, and each key runs the whole keying pass. */
vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

/**
 * How far a digest entry sits from the key, by the measure the keying pass itself uses.
 *
 * Through `keyDistanceSquared` rather than a plain colour distance, because that is the function
 * deciding what the field is: an entry this calls far from the key is one the pass would have left
 * on the sheet, which is exactly the claim being made.
 */
function distanceFromKey(hex: string, key: Rgba): number {
  // `fromHex` is `toHex`'s own inverse, and `toHex` is what wrote these strings — so the round trip
  // is the app's rather than a second reading of the same six characters. It answers `null` on
  // anything that is not `#rrggbb`, which a digest entry never is; throwing says so rather than
  // measuring a colour nobody chose.
  const color = fromHex(hex);
  if (color === null) throw new Error(`${hex} is not a colour the digest could have written`);

  const probe = createImage(1, 1);
  writePixel(probe.data, 0, color);
  return Math.sqrt(keyDistanceSquared(probe.data, 0, keyBasis(key)));
}

export function identityPaletteCorpusSuite(sheets: readonly CorpusSheetName[]): void {
  describe('the identity digest read from a real generator sheet', () => {
    let corpus: ReadonlyMap<CorpusSheetName, ImageData>;

    beforeAll(async () => {
      corpus = await loadCorpus(sheets);
    });

    /** One sheet, or a failure that names it rather than an undefined a line later. */
    function sheet(name: CorpusSheetName): ImageData {
      const image = corpus.get(name);
      if (image === undefined) throw new Error(`The corpus is missing ${name}`);
      return image;
    }

    // The magenta pass of this sweep is the defect itself: the leading entry is the one the prompt reads
    // as the subject's base colour, and it is where every one of the eight failed. It is held here with
    // every other entry and every other key rather than in a case of its own, which could only fail
    // where this one already does.
    it.each(sheets)('keeps every entry of %s out of the key field, at every offered key', (name) => {
      const image = sheet(name);
      const inTheField: string[] = [];
      let entries = 0;

      for (const named of BACKGROUND_KEYS) {
        const key = BACKGROUND_KEY_COLORS[named];
        const digest = identityPalette(image, key);

        // A sheet has colours whichever key is stated, and without this an empty digest would satisfy
        // every assertion below by holding nothing. `TRANSPARENT` names no colour to exclude, so this is
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

    /**
     * The figures `identityPalette`'s docblock chooses its keying from, which are recorded hexes on
     * purpose where the case above is not: they are the evidence for `DEFAULT_KEY_TOLERANCE` being the
     * rung, and for the fringe pass being needed, and each names the colour that shows it.
     *
     * A narrower rung is read by keying the sheet first and handing the digest a key of `TRANSPARENT`,
     * which takes out only what arrived transparent — so the function under test is the shipped one,
     * with the field removed at another rung. The field radius alone is the pass the app does not run,
     * reconstructed from the distance the pass itself uses; it is what shows the fringe erosion is not
     * optional. An entry counts as a key blend by `carriesKeyTint`, the fringe pass's own test.
     */
    it.each(sheets)('reads %s’s key blends at the narrower rungs as the docblock states', (name) => {
      const image = sheet(name);
      const blendsIn = (keyed: ImageData): string[] =>
        identityPalette(keyed, null).filter((entry) => carriesTint(entry));
      const atRung = (tolerance: number): ImageData =>
        keyBackground(image, { color: MAGENTA, tolerance }).image;

      const rung8 = blendsIn(atRung(8)).map(
        (entry) => `${entry} ${distanceFromKey(entry, MAGENTA).toFixed(1)}`,
      );
      expect(rung8).toEqual(name === 'cyborg_healer.png' ? ['#E629C2 15.8'] : []);
      expect(blendsIn(atRung(16))).toEqual([]);
      expect(blendsIn(fieldRadiusOnly(image))).toEqual(FIELD_RADIUS_BLENDS[name]);
    });

    it.runIf(sheets.includes('armour.png'))(
      'reads the reference sheet as the capture’s docblock quotes it',
      () => {
        expect(identityPalette(sheet('armour.png'), MAGENTA)).toEqual(ARMOUR_RAW_DIGEST);
      },
    );
  });
}

const MAGENTA_KEY = BACKGROUND_KEY_COLORS.MAGENTA_FF00FF;
if (MAGENTA_KEY === null) throw new Error('MAGENTA_FF00FF names no colour');
/** The key every corpus sheet carries, narrowed once rather than at every use. */
const MAGENTA: Rgba = MAGENTA_KEY;

/** The key blend each sheet's digest carries when the field is removed by its radius alone. */
const FIELD_RADIUS_BLENDS: Readonly<Record<CorpusSheetName, readonly string[]>> = {
  'armour.png': ['#7A0980'],
  'cyborg_black_red.png': [],
  'character_space_marine_blue.png': [],
  'cyborg_monk.png': ['#841489'],
  'cyborg_healer.png': ['#301F30', '#931085'],
  'three-quarter-view_tiles1.png': [],
  'ui_elements1.png': ['#780787'],
  'vehicles_and_props.png': ['#831088'],
};

/** The reference sheet's digest read off the raw file, which `quantisedSheetCapture` quotes. */
const ARMOUR_RAW_DIGEST = ['#185820', '#030803', '#9A8242', '#6D5629', '#C7A44E', '#F5E081'];

/** Whether a digest entry is partly the magenta key, by the fringe pass's own test. */
function carriesTint(hex: string): boolean {
  const color = fromHex(hex);
  if (color === null) throw new Error(`${hex} is not a colour the digest could have written`);
  const probe = createImage(1, 1);
  writePixel(probe.data, 0, color);
  return carriesKeyTint(probe.data, 0, keyBasis(MAGENTA));
}

/** The sheet with only the pixels inside `DEFAULT_KEY_TOLERANCE` of the key cleared: no fringe pass. */
function fieldRadiusOnly(image: ImageData): ImageData {
  const basis = keyBasis(MAGENTA);
  const radius = DEFAULT_KEY_TOLERANCE * DEFAULT_KEY_TOLERANCE;
  const output = createImage(image.width, image.height);
  for (let offset = 0; offset < image.data.length; offset += 4) {
    if (keyDistanceSquared(image.data, offset, basis) <= radius) continue;
    writePixel(output.data, offset, readPixel(image.data, offset));
  }
  return output;
}
