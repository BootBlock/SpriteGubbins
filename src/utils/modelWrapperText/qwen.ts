import type { RenderStyleSurface } from '../../types/rendering.ts';
import type { CategoryAssembly } from '../../types/subject.ts';

/**
 * Qwen-Image, which earns a negative block where Flux cannot take one: Alibaba document
 * `negative_prompt` as a parameter of the image API, describing "content you do not want to appear
 * in the image".
 *
 * **Unweighted, unlike Stable Diffusion's.** The `(term:1.3)` syntax is an Automatic1111/compel
 * convention those front-ends parse before the model ever sees it, not something Qwen's API defines
 * — emitting it here would put literal parentheses and decimals into a field documented to take a
 * description.
 *
 * The surface terms, the anatomy pair and the assembly run are the sheet's own, exactly as in
 * `wrapForStableDiffusion` — this block carried the pixel-art edge rules against every render style
 * too, and the two were fixed together because a wrapper that only argues with section 2 on one
 * target is still a wrapper that argues with it.
 *
 * **This block used to say the assembly claim three times and now says it however many times
 * `CATEGORY_ASSEMBLY` does.** Its third term was `complete figure`, which is `assembled character`
 * restated; one record cannot hold two spellings of one entry without the categories diverging by
 * target, so the synonym went with the fixed strings.
 */
export function wrapForQwen(
  prompt: string,
  surface: RenderStyleSurface,
  limbsAreComponents: boolean,
  assembly: CategoryAssembly,
): string {
  const negatives = [
    ...assembly.negatives,
    'text',
    'labels',
    'captions',
    'watermark',
    'signature',
    'cast shadow',
    'drop shadow',
    'contact shadow',
    'gradient background',
    'scene background',
    'ground plane',
    ...surface.negatives,
    'motion blur',
    ...(limbsAreComponents ? ['extra limbs', 'merged limbs'] : []),
    'overlapping components',
    'cropped components',
  ];
  return `${prompt}

Negative prompt: ${negatives.join(', ')}.`;
}
