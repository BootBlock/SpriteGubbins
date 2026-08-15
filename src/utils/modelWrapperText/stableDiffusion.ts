import type { RenderStyleSurface } from '../../types/rendering.ts';

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
 */
export function wrapForStableDiffusion(
  prompt: string,
  surface: RenderStyleSurface,
  limbsAreComponents: boolean,
): string {
  const negatives = [
    '(assembled character:1.3)',
    '(posed figure:1.3)',
    'text',
    'watermark',
    'signature',
    'labels',
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
