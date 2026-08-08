import type { PaletteLimit } from '../types/output.ts';

/** The quantiser's fixed numbers and the copy that explains its one control. */

/**
 * How many colours each studio palette limit allows the returned image, or `null` where the palette
 * step does not run.
 *
 * Read from `useOutputStore` rather than chosen again here. The limit is already stated in the
 * prompt the user sent, so a second colour-count control on this tab would be a second source of
 * truth for a value the sheet was generated against — and the place to change it is the place it is
 * already changed.
 */
export const PALETTE_COLOR_COUNTS: Readonly<Record<PaletteLimit, number | null>> = {
  STRICT_32_COLOR: 32,
  RESTRAINED_64_COLOR: 64,
  EXPANDED_ALBEDO: 128,
  UNRESTRICTED: null,
};

/**
 * The largest pixel scale detection will consider.
 *
 * A 16 × 16 sprite on a 2048 × 2048 sheet is a grid of 8 or 16; past 32 the candidate is larger than
 * most whole sprites, so a match at that size says more about a flat background than about the art.
 */
export const MAX_DETECTED_GRID = 32;

/**
 * The fraction of blocks that must be perfectly uniform for a grid to be believed.
 *
 * Not 1.0: a returned sheet is rarely flawless, and a single stray pixel from a compression artefact
 * should not deny an otherwise obvious grid. Not much lower either — the threshold is what separates
 * "drawn at this scale" from "happens to have flat areas".
 */
export const GRID_DETECTION_THRESHOLD = 0.9;

/**
 * What the user may type when detection finds nothing, or disagrees with them.
 *
 * The floor is 1 rather than 2, because "this image is already at its own resolution, just reduce
 * the palette" is a real request — and it is the one answer detection can never give, since every
 * image is trivially uniform at a grid of 1.
 */
export const MANUAL_GRID_RANGE = { min: 1, max: MAX_DETECTED_GRID } as const;

/**
 * The preview magnifications, in the order the control offers them.
 *
 * 1:1 leads because it is the case that decides whether the result is genuine pixel art; the rest
 * are what make an individual pixel inspectable.
 */
export const PREVIEW_ZOOMS = [1, 2, 4, 8] as const;

/**
 * The tolerances the keying control offers, as Euclidean RGB distance from the key colour.
 *
 * **A ladder rather than a slider**, and the reason is the pipeline: every pass in it is linear in an
 * image that may be {@link MAX_IMAGE_PIXELS}, so a range input would recompute the whole transform on
 * every pointer move of a drag. Stepped values reach the same range in one click each, and match what
 * this tab already does twice over — the zoom levels and the grid candidates.
 *
 * `0` is on the ladder because "exact match only" is a real request, and it is the one setting that
 * also switches the fringe pass off (which is scaled from this number). The rest roughly double: 32 is
 * about ±18 on each of the three channels, 128 about ±74, which is as loose as a colour can get and
 * still be the colour that was asked for.
 */
export const KEY_TOLERANCES = [0, 16, 32, 64, 96, 128] as const;

/**
 * Where the tolerance starts: tight enough to be safe against `PURE_WHITE` and `PURE_BLACK`, which
 * are offered keys and share their colour with real artwork, and loose enough to catch the drift a
 * generative raster actually returns on the recommended magenta.
 */
export const DEFAULT_KEY_TOLERANCE = 32;

/**
 * How much further than {@link KEY_TOLERANCES} the one-pixel fringe pass reaches.
 *
 * A pixel on an anti-aliased edge is a blend of the key colour and the artwork beside it, so it sits
 * *outside* any tolerance tight enough to be safe — which is why removing the field exactly leaves a
 * halo. At 3, a blend has to be roughly three-quarters key colour to be eroded: the part of the halo
 * that still reads as key colour rather than as art.
 *
 * It is safe to be this loose only because the fringe pass is restricted to pixels that touch the
 * keyed field. The same threshold applied everywhere would swallow a genuinely magenta-ish sprite
 * colour; applied at the boundary alone it only ever reaches pixels that are blends by construction.
 */
export const FRINGE_TOLERANCE_FACTOR = 3;

/**
 * The largest image the tab will accept, in pixels.
 *
 * Every pass in the pipeline is linear in this number, so it is what bounds the work the main thread
 * takes on. The honest response to a 40000 × 40000 PNG is to decline it with a message, not to
 * appear to hang — the same reasoning that bounds the anatomy multiplier.
 */
export const MAX_IMAGE_PIXELS = 4096 * 4096;

/** Guidance shown against the quantiser's controls, keyed to the control it explains. */
export const QUANTISE_TOOLTIPS = {
  grid: 'How many image pixels wide one drawn pixel is. Detected from the image where it can be; type it yourself when the model returned smooth artwork, or when the detected value is wrong. A grid of 1 leaves the size alone and only reduces the palette.',
  // Where panning is named. The grab cursor only appears once a pointer is already over the image,
  // so it teaches nobody on a touchscreen, and nobody working from the keyboard. The middle sentence
  // is the other thing nothing on screen says: the panes are linked, and moving one moves both.
  zoom: 'How many screen pixels one image pixel is drawn as. Magnifying never resamples — one pixel becomes a square of them. Both previews stay on the same part of the sheet at the same magnification, so moving one moves the other. When a preview is larger than its frame, drag it with the left mouse button or a finger to move around it, or give it focus with Tab and use the arrow keys.',
  keying:
    'Replaces the background key with transparency, so the sheet can be imported without a colour field behind it. The colour comes from the studio, which is where the prompt stated it. Anti-aliased edges carry blends of that key, and at any tolerance above exact the pixel touching the field is eroded with it — against a black or white key that will take some of the artwork’s own contour, which is why magenta is the recommended key.',
  keyTolerance:
    'How far a pixel may sit from the key colour and still count as background, measured across red, green and blue together. A returned sheet is almost never the exact colour that was asked for, so exact usually keys nothing. Raise it until the field goes and stop before the sprite does. It also sets how far the edge clean-up reaches, so at exact there is none.',
} as const;
