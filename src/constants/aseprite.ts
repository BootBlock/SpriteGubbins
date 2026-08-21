/**
 * The choices the `.aseprite` writer makes that the format leaves open.
 *
 * Everything else in that writer is dictated by the published format specification — a magic number,
 * a chunk type, a field width. These four are not: the file has to state a frame duration, name its
 * layer and colour its tags, and nothing in the app measures any of them. They are here rather than
 * at the call site for the reason every non-visual constant in this app is, and together rather than
 * apart because they are one set of answers to one question: what does a document look like when it
 * arrives in the editor.
 */

/**
 * How long each frame is held for, in milliseconds.
 *
 * The editor's own default for a new frame, which is what makes it the right figure here: nothing on
 * the Quantise tab knows how fast the artwork it is looking at was meant to play, so the honest
 * answer is the one a reader would have got had they cut the frames by hand. Ten frames a second is
 * also slow enough to *see*, which matters for a file whose first use is checking that the frames
 * were cut where they should have been.
 */
export const ASEPRITE_FRAME_DURATION_MS = 100;

/** What the single image layer is called on a sheet that carries transparency. */
export const ASEPRITE_LAYER_NAME = 'Sheet';

/**
 * What it is called on a sheet that carries none, which is written as a background layer.
 *
 * The editor's own name for that layer, so a document opened from this app reads the way one created
 * in it does — see `aseLayer.ts` for why a fully opaque sheet takes a background layer at all.
 */
export const ASEPRITE_BACKGROUND_LAYER_NAME = 'Background';

/**
 * The colour every exported tag carries, as an RGB triple.
 *
 * **Document data, not app styling**, which is the same ground `src/constants/palettes/` stands on:
 * this colour is written into a file another application reads, and there is no element in this app
 * for it to be a class on. It deliberately mirrors no design token — a tag bar in the editor's
 * timeline is not a surface this app is styling, and pinning it to the app's palette would make a
 * change to `index.css` change the contents of an exported document.
 *
 * A neutral grey because the app has nothing to say about what a strip *means*: the tags are cut
 * from where the sprites sit on the sheet, not from any reading of what they are, so a colour
 * carrying a suggestion would be inventing one. It is stated at all because a tag with no colour at
 * all is left to whatever the reader's editor defaults to.
 */
export const ASEPRITE_TAG_COLOR = { r: 128, g: 128, b: 128 } as const;
