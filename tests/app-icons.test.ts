import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { decodePng } from '../src/test/decodePng.ts';
import {
  FAVICON_SIZES,
  GLYPH,
  GRID,
  ICON_PALETTE_TOKENS,
  MANIFEST_ICON_SIZES,
  iconPalette,
  rasterise,
} from '../scripts/iconGlyph.ts';
import { themeColorHex } from '../scripts/themeColour.ts';

/**
 * The app icon is painted in the design tokens, and the three shipped binaries say so.
 *
 * The icon generator used to hold six hand-typed byte triples under a docblock claiming they were
 * the tokens from `src/index.css`. Four of them had been exactly that when they were written, back
 * when the stylesheet declared the ramp in hex; `e930e9e` reallocated the palette from one OKLCH
 * hue wheel and nothing re-ran the generator. Nothing compared the two either, so the drift
 * survived the whole rewrite and reached `public/favicon.ico`, `public/icon-192.png` and
 * `public/icon-512.png` as opaque pixels. This suite is the comparison that was missing.
 *
 * Two claims, and the second is the one the first cannot make on its own. The palette now names
 * tokens and is resolved from the stylesheet, so it cannot state a colour of its own — but a
 * correct generator whose output nobody re-ran still ships the old artwork. So the glyph is
 * re-rendered here from the tokens and compared with the pixels each file actually carries.
 *
 * The comparison is on decoded pixels rather than on file bytes: `deflateSync` output is a property
 * of whichever zlib the toolchain links, and a test that pinned it would fail on a Node upgrade
 * while nothing about the icon had changed.
 */

const PUBLIC_DIR = resolve(process.cwd(), 'public');
const STYLESHEET = pathToFileURL(resolve(process.cwd(), 'src/index.css'));

/** Where two images first disagree, as one pixel — or `null` where they do not. */
interface PixelMismatch {
  readonly at: { x: number; y: number };
  readonly found: number[];
  readonly expected: number[];
}

/**
 * Compare a decoded image with the glyph rendered at that size, reporting the first pixel that
 * differs.
 *
 * A whole-buffer `toEqual` is the obvious spelling and is unusable here: at 512² the arrays hold a
 * million bytes each, and the reporter's diff of two of them does not finish. One pixel, with its
 * coordinates, says everything a stale binary needs to say.
 */
function firstMismatch(found: Uint8ClampedArray, size: number): PixelMismatch | null {
  const expected = rasterise(size, iconPalette(STYLESHEET));
  if (found.length !== expected.length) {
    throw new Error(`decoded ${found.length} bytes where ${size}² is ${expected.length}`);
  }
  for (let at = 0; at < expected.length; at += 4) {
    const pixel = at / 4;
    if ([0, 1, 2, 3].some((channel) => found[at + channel] !== expected[at + channel])) {
      return {
        at: { x: pixel % size, y: Math.floor(pixel / size) },
        found: [...found.subarray(at, at + 4)],
        expected: [...expected.subarray(at, at + 4)],
      };
    }
  }
  return null;
}

/**
 * The PNGs packed into an ICO, in directory order.
 *
 * Every entry is stored PNG-compressed rather than as a BMP DIB, which is what `encodeIco` writes —
 * so reading one back is a matter of following the offset and length in its 16-byte directory entry.
 */
function icoEntries(ico: Uint8Array): { size: number; png: Uint8Array }[] {
  const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
  const count = view.getUint16(4, true);
  const entries: { size: number; png: Uint8Array }[] = [];
  for (let index = 0; index < count; index += 1) {
    const at = 6 + 16 * index;
    const declared = ico[at] ?? 0;
    const length = view.getUint32(at + 8, true);
    const offset = view.getUint32(at + 12, true);
    entries.push({
      size: declared === 0 ? 256 : declared,
      png: ico.subarray(offset, offset + length),
    });
  }
  return entries;
}

describe('the app icon’s palette', () => {
  it('names a token for every key the glyph uses, and none it does not', () => {
    expect(new Set(Object.keys(ICON_PALETTE_TOKENS))).toEqual(new Set([...GLYPH.join('')]));
  });

  it('states a token name for every entry, never a colour of its own', () => {
    // The failure this whole change is about is a value typed here going stale. A name cannot: it
    // either resolves against the stylesheet's `@theme` block or `tokenHex` throws.
    const stylesheet = readFileSync(STYLESHEET, 'utf8');
    for (const token of Object.values(ICON_PALETTE_TOKENS)) {
      expect(token).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(stylesheet).toContain(`--color-${token}: oklch(`);
    }
  });

  it('grounds the icon in the very colour the install splash paints behind it', () => {
    // #111 repointed the manifest's `background_color` to `foundry-900` while the 512² icon's own
    // opaque ground was still the ramp's retired value. The splash then handed over to a seam, and
    // this is the claim that closes it — stated against the splash's own helper, not against a hex.
    const ground = iconPalette(STYLESHEET)['.'] ?? [];
    const hex = `#${[...ground]
      .slice(0, 3)
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')}`;
    expect(hex).toBe(themeColorHex(STYLESHEET));
  });

  it('outlines it in a rung that reads below that ground', () => {
    // `foundry-950` is the well beneath the page, so every channel of the outline sits under the
    // ground's. Derived rather than pinned: repointing the ramp in `index.css` must not fail this.
    const palette = iconPalette(STYLESHEET);
    const [outline, ground] = [palette.k ?? [], palette['.'] ?? []];
    for (const channel of [0, 1, 2]) expect(outline[channel]).toBeLessThan(ground[channel] ?? 0);
  });
});

describe('the shipped icon binaries', () => {
  it.each(MANIFEST_ICON_SIZES)('renders icon-%d.png in the current tokens', async (size) => {
    const decoded = await decodePng(await readFile(resolve(PUBLIC_DIR, `icon-${size}.png`)));
    expect([decoded.width, decoded.height]).toEqual([size, size]);
    expect(firstMismatch(decoded.pixels, size)).toBeNull();
  });

  it('packs favicon.ico with the three sizes, each in the current tokens', async () => {
    const entries = icoEntries(await readFile(resolve(PUBLIC_DIR, 'favicon.ico')));
    expect(entries.map((entry) => entry.size)).toEqual(FAVICON_SIZES);
    for (const entry of entries) {
      const decoded = await decodePng(entry.png);
      expect([decoded.width, decoded.height]).toEqual([entry.size, entry.size]);
      expect(firstMismatch(decoded.pixels, entry.size)).toBeNull();
    }
  });

  it('emits only whole multiples of the glyph grid, so no size is ever resampled', () => {
    for (const size of [...MANIFEST_ICON_SIZES, ...FAVICON_SIZES]) expect(size % GRID).toBe(0);
  });
});
