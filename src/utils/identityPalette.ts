import { IDENTITY_PALETTE_SIZE } from '../constants/identityLock.ts';
import { DEFAULT_KEY_TOLERANCE } from '../constants/quantiser.ts';
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
import { keyBackground } from './keyBackground.ts';
import { buildPalette } from './wuQuantiser.ts';

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
 * leading with `#FF00FF` would be telling the model the character is magenta. See
 * {@link subjectPixels} for how the field is found — the app's own keying pass, rather than a
 * comparison of this function's own, because an exact comparison matched nothing on any real sheet
 * and the digest led with the key on all eight of them.
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
 * **The key is removed by `keyBackground`, which is this app's one answer to where a key field is.**
 * This used to compare RGB for exact equality, on the ground that section 0 of the template asks for
 * a uniform field so a compliant sheet's is one colour. A sheet is not compliant and cannot be: a
 * generative raster has no flat-fill operation and these sheets come back resampled, so the field is
 * a spread of near-key colours. Counted across the eight sheets in `test_sprites/`, the pixels that
 * are **exactly** `#FF00FF` number **0, 2, 4, 7, 9, 9, 16 and 36** — out of about 1.57 million each,
 * so the widest of them is 0.0023% of its sheet and one sheet has none at all. The exact comparison
 * therefore removed essentially nothing, while the field it was meant to remove is 52.7% to 73.7% of
 * a sheet by area — so the coverage ordering below put the field *first*, and the digest opened with
 * a magenta on every one of the eight. The compiled prompt then asked the model to reproduce that
 * colour exactly, under a heading saying the lock wins over everything above it — which is the
 * outcome the paragraph above says must not happen.
 *
 * **A tolerance was refused here for a reason that is true of a *plain* radius, and for an
 * achromatic key that is exactly what this is.** `PURE_WHITE` and `PURE_BLACK` are offered keys, and
 * the old paragraph said a threshold loose enough to swallow fringing against those would eat a
 * sheet's own highlights and outlines. `keyBackground` measures in scaled OKLab with the key's own
 * shading and washing discounted — but it withholds that discount from a key with no hue,
 * deliberately, because shading white is how a sheet gets its greys. So for those two keys the
 * discount is not what saves this: what is left *is* the plain radius the objection named, and the
 * objection is answered on the numbers rather than by the mechanism.
 *
 * **The numbers, because OKLab makes the two ends wildly asymmetric.** Measured along the grey ramp
 * at each rung the keying control offers, the field reaches from black to `#000000`, `#000000`,
 * `#000000`, `#020202`, `#060606`, `#212121` and from white down to `#FFFFFF`, `#F5F5F5`, `#EBEBEB`,
 * `#E0E0E0`, `#D6D6D6`, `#AEAEAE`. At {@link DEFAULT_KEY_TOLERANCE} that is **3 bytes of the ramp at
 * black and 32 at white** — so a black key costs a near-black outline nothing, and a white key costs
 * the top eighth of the value range, a specular highlight inside it included.
 *
 * **That cost is accepted rather than avoided, and the alternative is what settles it.** The
 * measured alternative is a digest that opens with the field: on all eight sheets in
 * `test_sprites/`, under a prompt heading saying the lock wins over everything above it. Losing a
 * highlight from a six-colour list is the smaller loss, and it is the same loss the Quantise tab
 * already inflicts on the same sheet at the same rung — where the reader can see it in the preview
 * and lower the dial, which is the one thing this route cannot offer. `identityPalette.test.ts`
 * holds both ends of the white case rather than leaving it to be discovered.
 *
 * **{@link DEFAULT_KEY_TOLERANCE} rather than a figure of this function's own**, and the corpus is
 * what chooses it. A rung of 8 leaves a magenta in `cyborg_healer.png`'s digest (`#F803E1`, 8.4 from
 * the key); 16 clears all eight, and 24 clears them with a rung to spare. Eight sheets are a sample
 * rather than a population, so the figure sits two rungs above a demonstrated failure instead of
 * one — and being the tab's own opening position is what keeps the picker route and the button
 * beside it describing one field rather than two.
 *
 * **The one-pixel fringe goes with it, and that is the half a radius could not do.** An anti-aliased
 * edge blends the key with the colour beside it, and those blends are opaque colours the sheet
 * genuinely contains — so a field pass alone leaves them, and on four of the eight sheets one still
 * reaches the digest: `#7A0283` on `armour.png`, `#A60097` on `cyborg_healer.png`, `#62026E` on
 * `ui_elements1.png` and `#660574` on `vehicles_and_props.png`. `keyBackground`'s second pass erodes
 * them, because it has the geometry to do it safely — one pixel deep, and only where the pixel
 * touches the field. No digest carries a key blend after it.
 *
 * **What that pass costs is a pixel of silhouette, and on one shape of sheet a pixel is a whole
 * entry.** A sheet that arrived already keyed — which is what the button route hands in, and what
 * this app's own downloads are — has a transparent field, and the pass counts transparency as field
 * and erodes once around it. On a sheet drawn at its native scale, a one-pixel outline is *entirely*
 * within that one pixel: every one of its pixels touches the field, so where its hue sits within
 * `KEY_TINT_OFF_HUE` of the key, `carriesKeyTint` takes the lot and the outline's colour leaves the
 * digest with it. A violet ring against the recommended magenta is the case; a teal one is
 * untouched, which is what identifies the hue test rather than the radius as the mechanism.
 *
 * It is still the right trade, and narrowly. The colour at risk is one an artist chose *close to the
 * key they were keying against*, and the reader who wants it has the ordinary route — read the
 * palette off the Quantise tab, where the erosion is visible in the preview. What is not
 * recoverable is a digest that led with the field, which is what the alternative measured.
 *
 * **Opacity is flattened for the same reason the key ignores it — a colour is not a compositing
 * state, and the digest states RGB.** Leaving it alone is the subtle failure: alpha is one of the
 * four channels a group of colours is split across, so a soft shadow or an anti-aliased edge — one
 * colour at a dozen opacities, which is exactly what models return — is a dozen colours to the
 * quantiser, and it will spend the digest's six slots separating them. Each is then ranked by its
 * own share rather than their combined one, so a 14%-coverage colour can lead a 72% one, and the
 * ordering is the whole point of this function. Flattened first, every slot buys a distinct colour
 * and coverage totals per colour by construction.
 */
function subjectPixels(image: ImageData, exclude: Rgba | null): ImageData {
  // `TRANSPARENT` is the key with no colour to match, and the loop below already drops what arrived
  // transparent — so the pass has nothing to exclude, and running it would erode a silhouette for
  // nothing.
  const keyed =
    exclude === null
      ? image
      : keyBackground(image, { color: exclude, tolerance: DEFAULT_KEY_TOLERANCE }).image;

  const output = createImage(image.width, image.height);
  for (let offset = 0; offset < keyed.data.length; offset += CHANNELS_PER_PIXEL) {
    const color = readPixel(keyed.data, offset);
    if (color.a === FULLY_TRANSPARENT) continue;
    writePixel(output.data, offset, { ...color, a: FULLY_OPAQUE });
  }
  return output;
}
