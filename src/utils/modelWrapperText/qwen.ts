import type { RenderStyleSurface } from '../../types/rendering.ts';
import type { CategoryAssembly } from '../../types/subject.ts';

/**
 * Qwen-Image, which earns a negative block where Flux cannot take one: Alibaba document
 * `negative_prompt` as a parameter of the image API, as "The negative prompt that describes content
 * you do not want to appear in the image."
 *
 * **That sentence is on the 3.0-series reference, and citing it is the correction this file needed.**
 * It stood here quoted and uncited, and the page it reads as though it came from — the `qwen-image-api`
 * reference — is not the one that covers this target. That page's own model overview says of
 * `qwen-image-3.0-pro` and `qwen-image-3.0`: "For 3.0 series API calls, see Qwen Image Generation and
 * Editing 3.0", and its wording for the parameter is different ("A negative prompt describing what
 * you do not want in the image", with a 500-character cap). The 3.0 reference carries the quotation
 * above verbatim and states no length for it at all, so the cap belongs to the older series and is
 * not a figure this block can be measured against.
 * https://help.aliyun.com/en/model-studio/qwen-image-generation-and-editing-api-reference
 *
 * **What Alibaba document is a request parameter, and this app has one text channel — so the block
 * is labelled with the parameter's own name.** It used to be emitted under the prose heading
 * `Negative prompt:`, which is an Automatic1111 front-end convention rather than anything Alibaba
 * publish, and nothing in their documentation parses a line of that shape inside `text`. On a
 * text-to-image model that is the worst place for it: the block would be read as part of the
 * positive prompt, listing the very things the sheet must not contain. Emitting `negative_prompt:`
 * names the documented field exactly, so a reader on the API knows which parameter the block belongs
 * in and a reader on a chat surface can see it is not prose the model should draw. The wrapper cannot
 * put it in a separate field, because the app composes prompt *text* and makes no API call — naming
 * the field is the whole of what a text channel can do about that.
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
 * **`text`, `labels` and `captions` come out on a glyph set, and the two beside them stay.** Those
 * three name the subject of a font sheet, which is the rule `FRAME_IS_A_COMPONENT` states for
 * Midjourney's flag applied to a channel that carries far more of them. `watermark` and `signature`
 * are unaffected: neither is a character of a font, so no reading of `LETTERING_IS_A_COMPONENT`
 * reaches them, and a sheet that came back signed would be as spoilt as any other.
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
  letteringIsAComponent: boolean,
  assembly: CategoryAssembly,
): string {
  const negatives = [
    ...assembly.negatives,
    ...(letteringIsAComponent ? [] : ['text', 'labels', 'captions']),
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

negative_prompt: ${negatives.join(', ')}.`;
}
