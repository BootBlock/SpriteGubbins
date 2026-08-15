import { IDENTITY_PALETTE_SIZE } from '../constants/identityLock.ts';
import type { Rgba } from '../types/quantiser.ts';
import { nearestColor } from './applyPalette.ts';
import {
  CHANNELS_PER_PIXEL,
  colorHistogram,
  createImage,
  FULLY_OPAQUE,
  FULLY_TRANSPARENT,
  packColor,
  readPixel,
  toHex,
  unpackColor,
  writePixel,
} from './imageData.ts';
import { buildPalette } from './medianCut.ts';

/**
 * The colours an accepted sheet is actually made of, as the hex list an identity digest carries.
 *
 * This is the one line of `baseline-prompt-new.md` §5's digest that is **mechanically derivable**.
 * The prose lines — "cyan visor across upper face", "three amber chest lights in a vertical row" —
 * need eyes on the image, which is the outbound vision call this app does not make (§10.3). The
 * palette does not: the colours are simply *in* the pixels, and reading them here means no image
 * ever leaves the tab.
 *
 * Pure, so the choice of colours is testable without a canvas. The decoding that produces the
 * `ImageData` is the impure half and lives in `src/hooks/`.
 */

/**
 * At most {@link IDENTITY_PALETTE_SIZE} hex colours, **most-covered first**.
 *
 * Order is the point. `buildPalette` returns its entries in the order the boxes were split, which
 * says nothing about which colour the sheet is mostly made of — so each entry is totalled over every
 * colour that maps to it, and the list leads with the base colour the way §5's worked example does.
 * Coverage is measured through `nearestColor`, the same assignment `applyPalette` draws with, so the
 * totals describe the palette as it would actually be used.
 *
 * `backgroundKey` is the key field's colour, excluded so the digest describes the subject rather
 * than the sheet: on the recommended magenta the key is most of the image by area, and a lock
 * leading with `#FF00FF` would be telling the model the character is magenta.
 */
export function identityPalette(image: ImageData, backgroundKey: Rgba | null): readonly string[] {
  const subject = subjectPixels(image, backgroundKey);
  const palette = buildPalette(subject, IDENTITY_PALETTE_SIZE);

  const coverage = new Map<number, number>();
  for (const [key, count] of colorHistogram(subject)) {
    const entry = nearestColor(unpackColor(key), palette);
    // Only when the palette is empty, which means a sheet with nothing on it but its key field.
    if (entry === null) continue;
    const entryKey = packColor(entry);
    coverage.set(entryKey, (coverage.get(entryKey) ?? 0) + count);
  }

  const ordered = [...coverage].sort(
    // The packed colour breaks ties, so two entries covering equal area still order the same way
    // every run — `sort` alone would only promise to leave them as it found them.
    ([leftKey, leftCount], [rightKey, rightCount]) => rightCount - leftCount || leftKey - rightKey,
  );

  // No deduplication needed: `subjectPixels` flattened opacity, so no two entries share an RGB.
  return ordered.map(([key]) => toHex(unpackColor(key)));
}

/**
 * The subject's pixels alone, at one opacity: the key field and fully transparent pixels dropped,
 * and everything that survives made opaque.
 *
 * Transparency is how a pixel leaves the histogram, and therefore the palette, so removing the key
 * field is the same operation as one that arrived transparent already.
 *
 * **The key is matched exactly, and on RGB alone.** Section 0 of the template requires a uniform key
 * filling all space between components, so a compliant sheet's field is one colour. A tolerance
 * would be the obvious generosity and is the wrong call *here*: `PURE_WHITE` and `PURE_BLACK` are both
 * offered keys, and anything loose enough to swallow fringing against those would eat the sheet's
 * own highlights and outlines.
 *
 * `keyBackground` does take one, and it can afford to because it has two things this function has
 * nowhere to put. It measures the distance with the key's own shading and washing discounted, so a
 * generous threshold there still knows a hue apart from the key's; and its *widest* threshold, the
 * one that erodes the halo, only reaches pixels touching the keyed field, so that one can only ever
 * admit blends. A digest is a list of colours with neither a metric worth the extra arithmetic nor
 * any geometry to appeal to, and the coverage ordering below is what contains the damage instead.
 *
 * The cost is real and is left to the caller: an anti-aliased edge blends the key with the colour
 * beside it, and those blends are *opaque* colours the sheet genuinely contains, so nothing here
 * removes them. Coverage ordering is what contains the damage — a one-pixel fringe is a small share,
 * so the leading entries are still the subject's own colours and only the tail of the list is bleed.
 * The clean answer is the Quantise tab, which exists to remove exactly this, and the control says so.
 *
 * **Opacity is flattened for the same reason the key ignores it — a colour is not a compositing
 * state, and the digest states RGB.** Leaving it alone is the subtle failure: alpha is one of the
 * four channels `buildPalette` splits on, so a soft shadow or an anti-aliased edge — one colour at a
 * dozen opacities, which is exactly what models return — is the *widest* channel on the sheet. Median
 * cut then spends the digest's six slots on opacities of a single colour, and ranks each of them by
 * its own share rather than their combined one, so a 14%-coverage colour can lead a 72% one. Flattened
 * first, every slot buys a distinct colour and coverage totals per colour by construction.
 */
function subjectPixels(image: ImageData, exclude: Rgba | null): ImageData {
  const output = createImage(image.width, image.height);
  for (let offset = 0; offset < image.data.length; offset += CHANNELS_PER_PIXEL) {
    const color = readPixel(image.data, offset);
    if (color.a === FULLY_TRANSPARENT) continue;
    if (exclude !== null && color.r === exclude.r && color.g === exclude.g && color.b === exclude.b) {
      continue;
    }
    writePixel(output.data, offset, { ...color, a: FULLY_OPAQUE });
  }
  return output;
}
