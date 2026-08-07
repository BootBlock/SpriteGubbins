import { MIDJOURNEY_VERSION } from '../constants/models.ts';
import type { AspectRatio, TargetModelId } from '../types/output.ts';

/**
 * Per-generator wrapping of the compiled prompt.
 *
 * Every model in `TARGET_MODELS` has a branch here: Sol gets a reasoning contract, Midjourney CLI
 * flags, Stable Diffusion a negative-prompt block, Flux the same intent restated positively, GPT
 * Image a directive prefix, and Generic the prompt untouched.
 *
 * **Several branches now return the prompt unchanged, and that is the finding rather than a gap.**
 * A wrapper exists only where a vendor documents something the template cannot say — a flag syntax,
 * a negative-prompt channel, a rewrite to survive. The Gemini image models need none: they read the
 * prompt as a specification and think over it, which the *template* adapts to by giving them the
 * self-audit and the manifest. Adding a sentence here for symmetry would be inventing a behaviour.
 */

/** Midjourney's aspect flag for each sheet format. */
const ASPECT_FLAGS: Readonly<Record<AspectRatio, string>> = {
  WIDE_16_9: '--ar 16:9',
  TALL_9_16: '--ar 9:16',
  ULTRAWIDE_21_9: '--ar 21:9',
  SQUARE_1_1: '--ar 1:1',
};

export function aspectFlag(aspectRatio: AspectRatio): string {
  return ASPECT_FLAGS[aspectRatio];
}

/**
 * ChatGPT 5.6 Sol: reasoning effort and a pointer at the template's own contract sections.
 *
 * Deliberately thin. The previous wrapper restated the component count, the background rule, the
 * pixel-density contract and a verification checklist — all written against v1, whose critical
 * constraints sat at the *bottom* of the prompt. v2 puts them in section 0 and repeats them in
 * section 9, so carrying the old wrapper would state the same rules three times, which dilutes
 * instruction-following rather than reinforcing it.
 */
function wrapForSol(prompt: string): string {
  return `[SYSTEM DIRECTIVE — REASONING & OUTPUT CONTRACT]
High reasoning effort: this is a multi-component spatial layout task. Plan the grid and the
per-component bounding boxes before drawing.
Treat section 0 as a hard done-condition and section 9 as a required verification pass before
delivery.

${prompt}`;
}

/**
 * Flux, which is **not** Stable Diffusion for this purpose: it has no negative prompt in normal use,
 * so SD's negative block would be silently discarded, and it responds better to prose than to
 * weighted tags. The same two failures are therefore stated positively.
 */
function wrapForFlux(prompt: string, backgroundKeyDescription: string): string {
  return `${prompt}

The sheet shows only disconnected individual parts on a ${backgroundKeyDescription} field, with crisp hard edges, no shadows, no text, and no assembled figure.`;
}

/**
 * Apply the target model's wrapper to a compiled prompt.
 *
 * `GENERIC` deliberately has no branch — it returns the prompt unchanged, which is what makes it
 * usable with any model the app doesn't know about.
 */
export function wrapForModel(
  prompt: string,
  target: TargetModelId,
  options: { readonly aspectRatio: AspectRatio; readonly backgroundKeyDescription: string },
): string {
  switch (target) {
    case 'CHATGPT_5_6_SOL':
      return wrapForSol(prompt);

    // `--sw` is *style-reference* weight and does nothing without a `--sref`; the knob that was
    // meant is `--s`, and it wants to be low, because high stylisation fights a technical layout
    // brief. `background` is absent from `--no` on purpose: the sheet needs a *keyable* background,
    // and excluding "background" risks losing the key colour with it.
    case 'MIDJOURNEY':
      return `${prompt}\n\n${aspectFlag(options.aspectRatio)} ${MIDJOURNEY_VERSION} --style raw --s 50 --no text, labels, shadow, gradient, frame, border`;

    // Weighted on the two failures that actually recur: assembling the figure instead of exploding
    // it, and adding shadows.
    case 'STABLE_DIFFUSION':
      return `${prompt}\n\nNegative prompt: (assembled character:1.3), (posed figure:1.3), text, watermark, signature, labels, floor shadow, drop shadow, gradient background, scene background, blurry, anti-aliased edges, smooth gradients, motion blur, jpeg artifacts, extra limbs, merged limbs, cropped`;

    case 'FLUX':
      return wrapForFlux(prompt, options.backgroundKeyDescription);

    // The Gemini image models read the prompt as a specification rather than conditioning on it as
    // a caption, and they think over it before drawing. That is what the *template* now adapts to —
    // they receive the self-audit and can be asked for a manifest — so there is nothing left for a
    // wrapper to say that the specification does not already say better. The retired Imagen entry
    // needed a framing sentence precisely because it was neither of those things.
    case 'GEMINI_FLASH_IMAGE':
    case 'GEMINI_PRO_IMAGE':
      return prompt;

    // The directive DALL·E 3 carried, kept — because the behaviour that justified it is still
    // documented on the path this app's users are on. OpenAI's Images API does not describe a
    // rewrite for `gpt-image-2`, but image generation through the Responses API does: "the mainline
    // model … will automatically revise your prompt for improved performance", surfaced back as
    // `revised_prompt`. Pasting into ChatGPT is that path, so terse absolute phrasing still has
    // something to survive — which is also part of why section 0 sits at the top of the template.
    case 'GPT_IMAGE':
      return `[DIRECTIVE: Reproduce the specification below exactly. Do not restyle, simplify or reinterpret it.]\n\n${prompt}`;

    case 'GENERIC':
      return prompt;
  }
}
