import type { RenderStyle } from '../../types/rendering.ts';
import type { ResolutionProfile, SurfaceDetail } from '../../types/output.ts';
import { parseTargetSize } from '../../utils/targetSize.ts';

/**
 * How the sheet is drawn, in the prose the prompt carries.
 *
 * These strings are the contract handed to the generator, not UI copy — editing one changes the
 * artwork that comes back. The render-style wording is taken verbatim from
 * `docs/todo/baseline-prompt-new.md` §2, because paraphrasing it changes the output.
 */
export const RENDER_STYLE_TEXT: Readonly<Record<RenderStyle, string>> = {
  PIXEL_ART:
    'Modern high-resolution pixel art. Deliberate pixel placement, hard edges, controlled value bands',
  RETRO_PIXEL_ART: 'Constrained 8/16-bit era pixel art with a small palette and visible chunky pixels',
  PAINTED_2D: 'Digitally painted with soft blended forms and visible brush economy',
  CEL_SHADED: 'Flat colour fills with hard-edged shadow steps and a clean ink contour',
  VECTOR_FLAT: 'Flat geometric shapes, no gradients, crisp mathematical curves',
  HAND_DRAWN_INK: 'Inked linework with hatched or flat fills, visible drawn line weight',
  RENDERED_3D: 'Rendered 3D forms with material shading and soft form shadow',
  LOW_POLY_3D: 'Faceted low-polygon forms with flat per-face shading',
  CLAY_RENDER:
    'Untextured single-material form study. Useful for validating silhouette and volume before committing to colour',
  SILHOUETTE_ONLY:
    'Solid single-colour silhouettes. A readability pass — does the shape read at target size with no internal detail?',
};

export const SURFACE_DETAIL_TEXT: Readonly<Record<SurfaceDetail, string>> = {
  MINIMAL: 'Minimal — base colour blocking and essential joints only',
  CLEAN_PRODUCTION: 'Clean production — major panels and folds, nothing finer',
  DETAILED_PRODUCTION: 'Detailed production — seams and material divisions resolved',
  TEXTURED: 'Textured — controlled surface texturing, still inside the palette limit',
};

/**
 * The scale the components are drawn at.
 *
 * Stated in prose because v1 interpolated the identifier raw, so the prompt read
 * "Selected profile: `HIGH_RESOLUTION_PIXEL_ART`" — a token the model had to guess the meaning of.
 */
export const RESOLUTION_PROFILE_TEXT: Readonly<Record<ResolutionProfile, string>> = {
  HIGH_RESOLUTION: 'High resolution — a full figure occupies 25–35% of the sheet height',
  MID_RESOLUTION: 'Mid resolution — a full figure occupies 18–25% of the sheet height',
  RETRO_16_BIT: '16-bit retro scale — a full figure is roughly 64–96 pixels tall',
  CUSTOM: 'Custom — work to the target component size where one is stated, and to the sheet aspect otherwise',
};

/**
 * What the three profiles that *are* a scale permit.
 *
 * v1 stated a flat `2×2` across every profile, which is wrong at both ends: at high resolution a
 * two-pixel minimum is small enough to read as noise, and at 16-bit scale it forbids the
 * single-pixel detail that style is made of. The minimum therefore scales with the canvas.
 */
const PROFILE_MIN_FEATURE: Readonly<Record<Exclude<ResolutionProfile, 'CUSTOM'>, string>> = {
  HIGH_RESOLUTION: '3 × 3',
  MID_RESOLUTION: '2 × 2',
  RETRO_16_BIT: '1 × 1',
};

/**
 * The same three rungs as a function of the component size `CUSTOM` states, keyed on its **smaller**
 * edge.
 *
 * Smaller rather than taller, because that is the edge detail runs out on: a 16 × 128 polearm has a
 * hundred and twenty-eight rows and sixteen columns, and it is the sixteen that decide whether a
 * two-pixel feature is affordable. Keying on height would call that component mid-resolution.
 *
 * Both boundaries are read off the profiles above rather than chosen. `RETRO_16_BIT` runs to 96 px
 * per figure and `MID_RESOLUTION` starts at roughly 184 on a 1024-pixel sheet, so the `1 × 1` rung
 * ends somewhere in that gap — 128 is the round number inside it, and is itself a size people draw
 * sprites at. `MID_RESOLUTION` tops out near 256 on the same sheet and `HIGH_RESOLUTION` begins at
 * that figure, so the second boundary is that number exactly.
 */
const CUSTOM_MIN_FEATURE = [
  { upTo: 128, size: '1 × 1' },
  { upTo: 256, size: '2 × 2' },
] as const;

/** Past the last rung, which is `HIGH_RESOLUTION`'s own answer. */
const LARGEST_MIN_FEATURE = '3 × 3';

/**
 * `CUSTOM` with no readable size in it.
 *
 * The profile then falls back to "the sheet aspect", so there is no scale to reason from and the
 * middle rung is the only answer that is not a guess at one end or the other.
 */
const UNSTATED_MIN_FEATURE = '2 × 2';

/**
 * The figure, without the unit it is counted in.
 *
 * **Three of the four profiles *are* a scale, and `CUSTOM` is not** — which is what makes this a
 * function rather than the record it began as. `CUSTOM` means "work to the target component size",
 * so its scale lives in `spriteTargetSize` and nowhere else. Keying the minimum on the profile alone
 * gave the one profile that can state *16 × 16* the same `2 × 2` floor as a 256-pixel figure, and a
 * sprite sixteen pixels across whose smallest permitted feature is four of them is a contradiction
 * the generator resolves by discarding one half of it — silently, and in whichever direction it
 * likes.
 */
function minFeatureFigure(profile: ResolutionProfile, spriteTargetSize: string): string {
  if (profile !== 'CUSTOM') return PROFILE_MIN_FEATURE[profile];

  const target = parseTargetSize(spriteTargetSize);
  if (target === null) return UNSTATED_MIN_FEATURE;

  const edge = Math.min(target.width, target.height);
  return CUSTOM_MIN_FEATURE.find((rung) => edge <= rung.upTo)?.size ?? LARGEST_MIN_FEATURE;
}

/**
 * The smallest feature the pixel-discipline section permits, **with the unit it is counted in**.
 *
 * The unit is the whole reason this is one function and not two values the template pairs up. The
 * bullet used to say *native pixels* unconditionally, while the block defining a native pixel is
 * gated on `NATIVE_GRID` — a different and much narrower condition, since `nativeGridScale`
 * additionally wants the `CUSTOM` profile, a size that parses and an enlargement of at least 2. So
 * every pixel-art prompt on a stock profile — the default configuration among them, which is the
 * first prompt the app ever shows anybody — stated a measurement in a unit the document never
 * established. A generator reading *3 × 3 native pixels* with no grid stated has to guess
 * between three pixels of a thousand-pixel image and three cells of a grid eight times coarser, and
 * the rule is supposed to be the floor on interior detail.
 *
 * **`hasNativeGrid` is the compiler's `NATIVE_GRID` answer itself, not a second reading of the same
 * inputs.** That is what makes the pairing hold: the figure and the unit leave this function
 * together, and the template has no unit of its own to write beside the figure.
 *
 * **Where there is no native grid the unit is the delivered pixel**, which the output contract's
 * render-at-the-delivered-resolution rule already establishes for every sheet, and which the
 * native-grid block's own carve-out is the only exception to. It is the correct answer
 * rather than a fallback: with nothing to enlarge, the pixels drawn are the pixels delivered — the
 * same reasoning that has `nativeGridScale` return `null` at a scale of 1.
 */
export function minFeatureSize(
  profile: ResolutionProfile,
  spriteTargetSize: string,
  hasNativeGrid: boolean,
): string {
  return `${minFeatureFigure(profile, spriteTargetSize)} ${hasNativeGrid ? 'native' : 'delivered'} pixels`;
}
