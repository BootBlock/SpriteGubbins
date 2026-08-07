import { MIDJOURNEY_VERSION } from '../constants/models.ts';
import type { AspectRatio } from '../types/output.ts';

/**
 * The text each generator's wrapper actually adds, one function per target.
 *
 * Split from `modelWrappers.ts` for the reason `promptTemplate.ts` is split from
 * `promptCompiler.ts`: that file decides *which* wrapper a target gets, and this one holds *what it
 * says*. Every line here is prose a generator will act on, so it wants to be diffable and arguable
 * on its own rather than buried inside a switch.
 *
 * **Each wrapper is traceable to something its vendor documents**, which is the bar — not symmetry.
 * A wrapper exists only where a vendor documents something the template cannot say: a flag syntax, a
 * negative-prompt channel, a rewrite to survive. The Gemini image models have no entry here because
 * they need none — they read the prompt as a specification and think over it, which the *template*
 * adapts to by giving them the self-audit and the manifest. Adding a sentence for symmetry would be
 * inventing a behaviour.
 */

/** Midjourney's aspect flag for each sheet format. */
const ASPECT_FLAGS: Readonly<Record<AspectRatio, string>> = {
  WIDE_16_9: '--ar 16:9',
  TALL_9_16: '--ar 9:16',
  ULTRAWIDE_21_9: '--ar 21:9',
  SQUARE_1_1: '--ar 1:1',
};

/**
 * ChatGPT 5.6 Sol: reasoning effort and a pointer at the template's own contract sections.
 *
 * Deliberately thin. The previous wrapper restated the component count, the background rule, the
 * pixel-density contract and a verification checklist — all written against v1, whose critical
 * constraints sat at the *bottom* of the prompt. v2 puts them in section 0 and repeats them in
 * section 9, so carrying the old wrapper would state the same rules three times, which dilutes
 * instruction-following rather than reinforcing it.
 */
export function wrapForSol(prompt: string): string {
  return `[SYSTEM DIRECTIVE — REASONING & OUTPUT CONTRACT]
High reasoning effort: this is a multi-component spatial layout task. Plan the grid and the
per-component bounding boxes before drawing.
Treat section 0 as a hard done-condition and section 9 as a required verification pass before
delivery.

${prompt}`;
}

/**
 * Midjourney's command flags.
 *
 * `--sw` is *style-reference* weight and does nothing without a `--sref`; the knob that was meant is
 * `--s`, and it wants to be low, because high stylisation fights a technical layout brief.
 * `background` is absent from `--no` on purpose: the sheet needs a *keyable* background, and
 * excluding "background" risks losing the key colour with it.
 *
 * **Raw mode is `--raw`, not `--style raw`.** Midjourney renamed the flag with the V8 line while
 * this wrapper pins `--v 8.2`, so the two were contradicting each other. Whether V8 rejects the old
 * form or quietly ignores it is not documented and does not need to be — either way the flag whose
 * whole job is to stop Midjourney restyling a technical layout brief could not be relied on to
 * apply. The version pin is what makes this checkable: when `MIDJOURNEY_VERSION` moves, the flag
 * syntax for the version it moves to is part of what wants re-checking.
 * https://docs.midjourney.com/hc/en-us/articles/32634113811853-Raw
 */
export function wrapForMidjourney(prompt: string, aspectRatio: AspectRatio): string {
  return `${prompt}\n\n${ASPECT_FLAGS[aspectRatio]} ${MIDJOURNEY_VERSION} --raw --s 50 --no text, labels, shadow, gradient, frame, border`;
}

/**
 * Stable Diffusion's negative block, weighted on the two failures that actually recur: assembling
 * the figure instead of exploding it, and adding shadows.
 */
export function wrapForStableDiffusion(prompt: string): string {
  return `${prompt}\n\nNegative prompt: (assembled character:1.3), (posed figure:1.3), text, watermark, signature, labels, floor shadow, drop shadow, gradient background, scene background, blurry, anti-aliased edges, smooth gradients, motion blur, jpeg artifacts, extra limbs, merged limbs, cropped`;
}

/**
 * Flux, which is **not** Stable Diffusion for this purpose: Black Forest Labs' own prompting guide
 * states that "FLUX.2 does not support negative prompts. Focus on describing what you want, not what
 * you don't want" — so SD's negative block would be silently discarded, and the same two failures
 * are stated positively instead.
 *
 * **It leads the prompt rather than trailing it, and that is a fix rather than a preference.** On
 * the open-weight target this restatement was unreachable: tokenisation stops at 512 tokens and the
 * specification runs to roughly 3,600, so the one sentence written specifically to survive Flux's
 * missing negative prompt was the one sentence guaranteed to be truncated away first. Leading also
 * matches what Black Forest Labs document about attention: "Word order matters — FLUX.2 pays more
 * attention to what comes first." https://docs.bfl.ai/guides/prompting_guide_flux2
 */
export function wrapForFlux(prompt: string, backgroundKeyDescription: string): string {
  return `The sheet shows only disconnected individual parts on a ${backgroundKeyDescription} field, with crisp hard edges, no shadows, no text, and no assembled figure.

${prompt}`;
}

/**
 * Qwen-Image, which earns a negative block where Flux cannot take one: Alibaba document
 * `negative_prompt` as a parameter of the image API, describing "content you do not want to appear
 * in the image".
 *
 * **Unweighted, unlike Stable Diffusion's.** The `(term:1.3)` syntax is an Automatic1111/compel
 * convention those front-ends parse before the model ever sees it, not something Qwen's API defines
 * — emitting it here would put literal parentheses and decimals into a field documented to take a
 * description.
 */
export function wrapForQwen(prompt: string): string {
  return `${prompt}

Negative prompt: assembled character, posed figure, complete figure, text, labels, captions, watermark, signature, cast shadow, drop shadow, contact shadow, gradient background, scene background, ground plane, blurred edges, anti-aliased edges, motion blur, extra limbs, merged limbs, overlapping components, cropped components.`;
}

/**
 * Seedream, whose known failure mode is neither truncation nor a missing channel but *dropping*.
 * ByteDance's own platform documentation puts the comfortable ceiling near 600 English words, against
 * a specification of roughly 2,500; fal, who host the model, put the consequence plainly — "if you
 * cram in more than the frame can hold, you can expect a few instructions to drop". That second line
 * is a host's observation rather than a vendor statement, and is marked as such because this file
 * cites vendors everywhere else.
 *
 * So this is the one target told **what to sacrifice**. Nothing else needs that: a truncating
 * encoder cuts by position rather than by choice, and a model that reads the whole prompt has
 * nothing to drop. It points at section 0's precedence list rather than restating it, which keeps
 * this from becoming a third copy of a rule the template already states twice.
 */
export function wrapForSeedream(prompt: string): string {
  return `Plan the grid and the per-component cells before rendering: this is a layout brief, not a scene.
It is longer than one image can hold every detail of. If anything must be dropped, keep the
precedence order stated in section 0 and drop surface detail first — never the component count,
the background, or a component's stated direction.

${prompt}`;
}

/**
 * GPT Image's directive prefix — the one DALL·E 3 carried, kept because the behaviour that
 * justified it is still documented on the path this app's users are on. OpenAI's Images API does not
 * describe a rewrite for `gpt-image-2`, but image generation through the Responses API does: "the
 * mainline model … will automatically revise your prompt for improved performance", surfaced back as
 * `revised_prompt`. Pasting into ChatGPT is that path, so terse absolute phrasing still has
 * something to survive — which is also part of why section 0 sits at the top of the template.
 */
export function wrapForGptImage(prompt: string): string {
  return `[DIRECTIVE: Reproduce the specification below exactly. Do not restyle, simplify or reinterpret it.]\n\n${prompt}`;
}
