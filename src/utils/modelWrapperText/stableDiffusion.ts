import type { RenderStyleSurface } from '../../types/rendering.ts';
import type { CategoryAssembly } from '../../types/subject.ts';

/**
 * Stable Diffusion's negative block, weighted on the two failures that actually recur: assembling
 * the figure instead of exploding it, and adding shadows.
 *
 * **Two runs of terms are the sheet's rather than the channel's, and both used to be fixed strings.**
 * The surface terms come from `RENDER_STYLE_SURFACE`, because `anti-aliased edges, smooth gradients`
 * is what *pixel art* forbids and the same block was negating it against a painted sheet whose
 * section 2 asks for soft blended forms. The anatomy pair comes from `LIMBS_ARE_COMPONENTS`: a
 * building, a terrain tileset or an interface kit has no limbs to have extras of, and a negative
 * prompt is a fixed weight spent on whatever is in it.
 *
 * **`blurry` went with the first of those, and it is the one term that changed meaning rather than
 * moving.** It sat in the middle of that run as this channel's stock quality negative, and unlike
 * `motion blur` and `jpeg artifacts` beside it — which name an *artefact* whatever the style — it
 * names the surface: a sheet drawn as "soft blended forms" is being asked for something a model's
 * reading of "blurry" overlaps with. So the claim is now the style's own `blurred edges`, which is
 * the wording Qwen's block already used for it, and it is emitted on the styles whose section 2 line
 * asserts a hard edge and withheld on the three that ask for a soft one.
 *
 * **`text` and `labels` are the sheet's as well, and they are the pair that had to become
 * conditional.** A glyph set's components are characters, so on that one category those two terms
 * negate the subject — the argument `LETTERING_IS_A_COMPONENT` makes at length. `watermark` and
 * `signature` keep their places between them: neither is a character of a font, and a signed sheet is
 * spoilt whatever it depicts.
 *
 * **The run that opens the block is the sheet's too, and it was the last fixed string here.** It
 * read `(assembled character:1.3), (posed figure:1.3)` on every category, which spent the highest
 * weight in the whole block naming a figure on sheets whose components are floor tiles and panel
 * frames. `CATEGORY_ASSEMBLY` holds each category's own assembled-whole failure; the weighting is
 * applied here rather than stored there, because it is this channel's convention and not Qwen's.
 */
export function wrapForStableDiffusion(
  prompt: string,
  surface: RenderStyleSurface,
  limbsAreComponents: boolean,
  letteringIsAComponent: boolean,
  assembly: CategoryAssembly,
): string {
  const negatives = [
    ...assembly.negatives.map((term) => `(${term}:1.3)`),
    ...(letteringIsAComponent ? [] : ['text']),
    'watermark',
    'signature',
    ...(letteringIsAComponent ? [] : ['labels']),
    'floor shadow',
    'drop shadow',
    'gradient background',
    'scene background',
    ...surface.negatives,
    'motion blur',
    'jpeg artifacts',
    ...(limbsAreComponents ? ['extra limbs', 'merged limbs'] : []),
    'cropped',
  ];
  return `${prompt}\n\nNegative prompt: ${negatives.join(', ')}`;
}
