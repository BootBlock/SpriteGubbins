/**
 * The app icon's artwork: a 16x16 pixel glyph, and the design tokens it is painted in.
 *
 * The icon is authored the way the app's subject matter is — a sprite on a fixed palette, scaled up
 * by whole multiples with nearest-neighbour sampling, so every output size is the *same* artwork
 * with bigger pixels rather than a resampled, softened copy.
 *
 * Separate from `generate-icons.ts` so that `tests/app-icons.test.ts` can re-render the glyph and
 * compare it with the three files in `public/`. The generator resolves an output directory from
 * `import.meta.url` at module load, which is not a file URL when Vite is the one loading it.
 */

import { tokenRgba } from './tokenColour.ts';

/** Glyph resolution. Every emitted size must be a whole multiple of this. */
export const GRID = 16;

/** One palette entry: the four opaque bytes a rasteriser writes. */
export type IconColour = readonly [number, number, number, number];

/**
 * The mascot's palette, as the design token each glyph key stands for.
 *
 * Names, not values — and the reason is that the values were once right and stopped being so
 * without anyone touching them. This table held six hand-typed byte triples under a comment saying
 * they were the design tokens, and when it was written that comment was very nearly true: the
 * stylesheet declared the ramp in hex, and `#060911`, `#1e293b`, `#334155` and `#22d3ee` were
 * exactly what `foundry-900`, `foundry-700`, `foundry-600` and `neon` then held. Then
 * `e930e9e` reallocated the whole palette from one OKLCH hue wheel, repointing every one of those
 * tokens, and nothing re-ran the generator — so a comment that had been accurate became a claim
 * about four colours the app no longer paints anything with, and the icon shipped in the retired
 * ramp for as long as nothing compared the two.
 *
 * Two of the six were never right at all, which is the other half of the argument for naming
 * rather than typing. `g` was `#f59e0b` where `--color-gold` was `#fbbf24` — wrong from the day it
 * was written. And `k` named no token: it was `#020408`, a hand-picked shade near but not equal to
 * the `#020617` that `foundry-950` then held, described only as "a shade below the ground". It is
 * `foundry-950` now. An outline has to read as a shade under the ground it sits on, and that rung
 * is what the app already uses for a surface sunk beneath the page — so it is that token, rather
 * than a shade derived from `foundry-900` by arithmetic nobody can check.
 */
export const ICON_PALETTE_TOKENS: Readonly<Record<string, string>> = {
  '.': 'foundry-900', // the ground, opaque
  k: 'foundry-950', // outline, the well below the ground
  b: 'foundry-700', // body
  h: 'foundry-600', // top-of-head highlight
  n: 'neon', // antenna tip and eyes
  g: 'gold', // feet
};

/** Resolve {@link ICON_PALETTE_TOKENS} against the stylesheet's own `oklch()` declarations. */
export function iconPalette(stylesheetPath: URL): Record<string, IconColour> {
  const palette: Record<string, IconColour> = {};
  for (const [key, token] of Object.entries(ICON_PALETTE_TOKENS)) {
    palette[key] = tokenRgba(stylesheetPath, token);
  }
  return palette;
}

/** The mascot: a chunky little construct with an antenna, lit eyes and gold feet. */
// prettier-ignore
export const GLYPH = [
  '................',
  '.......kk.......',
  '......knnk......',
  '.......kk.......',
  '....kkkkkkkk....',
  '...khhhhhhhhk...',
  '..kbbbbbbbbbbk..',
  '..kbnnbbbbnnbk..',
  '..kbnnbbbbnnbk..',
  '..kbbbbbbbbbbk..',
  '..kbbbbbbbbbbk..',
  '..kbbbkkkkbbbk..',
  '..kbbbbbbbbbbk..',
  '..kkbbbbbbbbkk..',
  '...kkgg..ggkk...',
  '................',
];

/** The two manifest icons, and the three sizes packed into `favicon.ico`. */
export const MANIFEST_ICON_SIZES = [192, 512];
export const FAVICON_SIZES = [16, 32, 48];

/** Scale the glyph up to `size` by nearest-neighbour. `size` must divide evenly by {@link GRID}. */
export function rasterise(size: number, palette: Record<string, IconColour>): Uint8Array {
  if (size % GRID !== 0) {
    throw new Error(`${size} is not a whole multiple of the ${GRID}px glyph grid`);
  }
  const scale = size / GRID;
  const rgba = new Uint8Array(size * size * 4);
  /*
    The two absence checks below are what `noUncheckedIndexedAccess` asks of a computed index
    rather than cases that arise: a `size` not divisible by GRID was refused above, so both indices
    land inside `0 … GRID - 1`, and `tests/app-icons.test.ts` asserts the glyph is exactly GRID rows
    of GRID characters. What they buy is the message. Edit the artwork to a shorter shape without
    them and a missing row is a `TypeError` on `undefined`, while a short row reaches the palette
    lookup and reports that the glyph "uses 'undefined'" — neither of which names the row.
  */
  for (let y = 0; y < size; y += 1) {
    const gridY = (y / scale) | 0;
    const row = GLYPH[gridY];
    if (row === undefined) throw new Error(`The glyph has no row ${gridY} — it is not ${GRID} rows tall`);
    for (let x = 0; x < size; x += 1) {
      const gridX = (x / scale) | 0;
      const key = row[gridX];
      if (key === undefined) throw new Error(`Glyph row ${gridY} is shorter than ${GRID} characters`);
      const colour = palette[key];
      if (!colour) throw new Error(`Glyph uses '${key}', which has no palette entry`);
      rgba.set(colour, (y * size + x) * 4);
    }
  }
  return rgba;
}
