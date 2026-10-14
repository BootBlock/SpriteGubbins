import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadCorpus } from './sheetCorpus.ts';
import * as keyBackgroundModule from '../src/utils/keyBackground.ts';
import * as keyDistanceModule from '../src/utils/keyDistance.ts';
import { srgbToOklab } from '../src/utils/oklab.ts';
import type { Rgba } from '../src/types/quantiser.ts';

type Constants = typeof import('../src/constants/quantiser.ts');
type Keying = typeof import('../src/utils/keyBackground.ts');
type Distance = typeof import('../src/utils/keyDistance.ts');

/**
 * The figures `KEY_LATITUDE_FLOOR` and `KEY_TOLERANCES` state about the floor. See
 * `calibrationSettings.ts` for why the docblock-figure suites exist.
 *
 * **The floors the app does not ship are the real pipeline with one constant replaced**, rather than
 * a second copy of the metric: the constants module is mocked with only `KEY_LATITUDE_FLOOR` changed
 * and the keying modules imported afresh against it. `-Infinity` is the metric before the floor —
 * no pixel's chroma falls below it, so the whole plane is discounted — which makes the docblock's
 * "before" figures the same code path as its "after" ones.
 */
vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const MAGENTA: Rgba = { r: 255, g: 0, b: 255, a: 255 };

async function withFloor(floor: number): Promise<{ keying: Keying; distance: Distance }> {
  vi.resetModules();
  vi.doMock('../src/constants/quantiser.ts', async (importOriginal) => ({
    ...(await importOriginal<Constants>()),
    KEY_LATITUDE_FLOOR: floor,
  }));
  const keying = await import('../src/utils/keyBackground.ts');
  const distance = await import('../src/utils/keyDistance.ts');
  vi.doUnmock('../src/constants/quantiser.ts');
  return { keying, distance };
}

/** The opaque pixels the keying leaves on a sheet at one rung. */
function opaqueAfter({ keyBackground }: Keying, image: ImageData, tolerance: number): number {
  const { data } = keyBackground(image, { color: MAGENTA, tolerance }).image;
  let opaque = 0;
  for (let offset = 3; offset < data.length; offset += 4) if (data[offset] !== 0) opaque += 1;
  return opaque;
}

/** How many colours of the RGB cube, sampled every fifth step, sit within the rung. */
function cubeKeyed({ keyBasis, keyDistanceSquared }: Distance, tolerance: number): number {
  const basis = keyBasis(MAGENTA);
  const pixel = new Uint8ClampedArray(4);
  let keyed = 0;
  for (let r = 0; r <= 255; r += 5) {
    for (let g = 0; g <= 255; g += 5) {
      for (let b = 0; b <= 255; b += 5) {
        pixel.set([r, g, b, 255]);
        if (keyDistanceSquared(pixel, 0, basis) <= tolerance * tolerance) keyed += 1;
      }
    }
  }
  return keyed;
}

/** The unsquared distance a colour reads from the magenta key. */
function reads({ keyBasis, keyDistanceSquared }: Distance, r: number, g: number, b: number): number {
  return Math.sqrt(keyDistanceSquared(new Uint8ClampedArray([r, g, b, 255]), 0, keyBasis(MAGENTA)));
}

/** A colour's chroma along magenta's hue, as a fraction of magenta's — what the floor is tested on. */
function share(r: number, g: number, b: number): number {
  const key = srgbToOklab(255, 0, 255);
  const color = srgbToOklab(r, g, b);
  return (color.a * key.a + color.b * key.b) / (key.a * key.a + key.b * key.b);
}

describe('the key latitude floor — what the ladder takes with and without it', () => {
  let corpus: ReadonlyMap<string, ImageData>;
  const shipped = { keying: keyBackgroundModule, distance: keyDistanceModule };
  let before: { keying: Keying; distance: Distance };

  beforeAll(async () => {
    corpus = await loadCorpus();
    before = await withFloor(-Infinity);
  });

  const sheet = (name: string): ImageData => {
    const image = corpus.get(name);
    if (image === undefined) throw new Error(`${name} is missing from the corpus`);
    return image;
  };

  it('measured grey and green at about half their distance, and measures them straight', () => {
    expect(reads(before.distance, 128, 128, 128)).toBeCloseTo(43.1, 1);
    expect(reads(before.distance, 10, 155, 65)).toBeCloseTo(64.0, 1);
    expect(reads(shipped.distance, 128, 128, 128)).toBeCloseTo(86.2, 1);
    expect(reads(shipped.distance, 10, 155, 65)).toBeGreaterThan(86);
    expect(reads(shipped.distance, 0, 65, 90)).toBeGreaterThan(86);
  });

  it('sits where a shade and a wash of the key cross it', () => {
    expect(share(0x22, 0, 0x22)).toBeCloseTo(0.25, 2);
    expect(share(0xff, 0xd0, 0xff)).toBeCloseTo(0.25, 2);
    expect(share(0xb0, 0x70, 0xa0)).toBeCloseTo(0.32, 2);
  });

  it('cut the cube colours the top rung takes, and moved nothing up to the default', () => {
    expect(cubeKeyed(before.distance, 64)).toBe(107_738);
    expect(cubeKeyed(shipped.distance, 64)).toBe(41_917);
    expect(cubeKeyed(before.distance, 32) - cubeKeyed(shipped.distance, 32)).toBe(45);
    for (const rung of [8, 16, 24]) {
      expect(cubeKeyed(shipped.distance, rung)).toBe(cubeKeyed(before.distance, rung));
    }
  });

  it('stopped the top rung taking most of three sheets’ artwork', () => {
    const at = (keying: Keying, name: string, rung: number): number => opaqueAfter(keying, sheet(name), rung);
    expect(at(before.keying, 'armour.png', 64)).toBe(306_490);
    expect(at(before.keying, 'cyborg_healer.png', 64)).toBe(182_433);
    expect(at(before.keying, 'three-quarter-view_tiles1.png', 64)).toBe(75_898);
    expect(at(shipped.keying, 'armour.png', 24) - at(shipped.keying, 'armour.png', 64)).toBe(2_481);
    expect(
      at(shipped.keying, 'cyborg_black_red.png', 24) - at(shipped.keying, 'cyborg_black_red.png', 64),
    ).toBe(48_361);
    expect(at(shipped.keying, 'armour.png', 24)).toBe(518_696);
    expect(at(shipped.keying, 'cyborg_healer.png', 24)).toBe(480_677);
    expect(at(shipped.keying, 'three-quarter-view_tiles1.png', 24)).toBe(540_022);
  });

  it('keys every rung up to the default exactly as before, on every sheet', () => {
    for (const [name, image] of corpus) {
      for (const rung of [8, 16, 24]) {
        expect(opaqueAfter(shipped.keying, image, rung), `${name} at ${rung}`).toBe(
          opaqueAfter(before.keying, image, rung),
        );
      }
    }
    const kept = [...corpus].map(([name, image]) => ({
      name,
      more: opaqueAfter(shipped.keying, image, 32) - opaqueAfter(before.keying, image, 32),
    }));
    const most = kept.reduce((top, sheet) => (sheet.more > top.more ? sheet : top));
    expect(most).toEqual({ name: 'cyborg_monk.png', more: 21 });
    for (const { more } of kept) expect(more).toBeGreaterThanOrEqual(0);
  });

  it('is placed between the floors either side of it', async () => {
    const higher = await withFloor(0.35);
    const lower = await withFloor(0.1);
    const vehicles = sheet('vehicles_and_props.png');
    expect(opaqueAfter(higher.keying, vehicles, 24) - opaqueAfter(before.keying, vehicles, 24)).toBe(1);
    const monk = sheet('cyborg_monk.png');
    expect(opaqueAfter(higher.keying, monk, 32) - opaqueAfter(before.keying, monk, 32)).toBe(193);
    const red = sheet('cyborg_black_red.png');
    expect(opaqueAfter(shipped.keying, red, 64) - opaqueAfter(lower.keying, red, 64)).toBe(60_349);
  });
});
