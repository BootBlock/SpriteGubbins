import type { RenderStyleSurface } from '../../types/rendering.ts';
import type { CategoryAssembly } from '../../types/subject.ts';

/**
 * Stable Diffusion's negative block, weighted on the two failures that actually recur: assembling
 * the figure instead of exploding it, and adding shadows.
 *
 * **Neither thing this block emits is Stability's, and saying so is the correction rather than
 * adding a URL.** This file carried no source at all, which reads as an oversight; the honest
 * statement is narrower and worth making in as many words. Stability publish weights, not a prompt
 * syntax, so there is no vendor page to cite for either convention — and pointing at one anyway
 * would be the failure `TARGET_MODELS` names where it opens, a link that makes a claim look checked.
 * **This target is a front end rather than a model**, which is what sets it apart from every other
 * entry in this directory, and a reader driving the weights through a pipeline that parses neither
 * convention gets both as literal text in the prompt.
 *
 * The front end is the Automatic1111 web UI, and it documents both. **The weighting is exact**:
 * "Using () in the prompt increases the model's attention to enclosed words, and [] decreases it",
 * where "a (word:1.5) - increase attention to word by a factor of 1.5". So the `(term:1.3)` emitted
 * below asks for 1.3× attention on that term, and it is a front end's parser rather than the model
 * that reads it.
 *
 * **The label is the field's name, and it is not a documented line syntax.** That project documents
 * a separate Negative prompt control — it "allows you to use another prompt of things the model
 * should avoid when generating the picture", working "by using the negative prompt for
 * unconditional conditioning in the sampling process instead of an empty string" — and nothing on
 * that page defines a `Negative prompt:` prefix *inside* the positive box. This app composes one
 * text blob, so the block is labelled with the control's own name, which is the most a text channel
 * can do about a separate field. Qwen's wrapper reaches the same arrangement from the same problem
 * and lands on a different spelling, because there the field is named `negative_prompt`.
 * https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features
 *
 * **The 77-token ceiling in `constants/models.ts` is the one figure here that is not a convention**,
 * and the same page is what makes its note's second half checkable. It is CLIP's context length, and
 * the front end describes both what happens at it and how it reads past it: "Typing past standard 75
 * tokens that Stable Diffusion usually accepts increases prompt size limit from 75 to 150 … by
 * breaking the prompt into chunks of 75 tokens, processing each independently using CLIP's
 * Transformers", where each chunk is "padded to 75 tokens and extended with start/end tokens to 77".
 * That is where the 77 comes from — 75 of prompt between two markers — and why the note says a
 * *base* pipeline truncates while a front end reads further.
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
