import { MIDJOURNEY_VERSION } from '../constants/models.ts';
import type { AspectRatio, TargetModelId } from '../types/output.ts';

/**
 * Per-generator wrapping of the compiled prompt.
 *
 * Every model in `TARGET_MODELS` has a branch here, and they differ in kind rather than in wording:
 * Sol gets a reasoning contract, Midjourney CLI flags, Stable Diffusion a negative-prompt block,
 * Flux the same intent restated positively, Imagen and DALL-E a directive prefix, and Generic the
 * prompt untouched.
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

    // Imagen handles descriptive natural language well and long rule lists poorly, so it gets one
    // plain framing sentence rather than a second contract.
    case 'GOOGLE_IMAGEN':
      return `A flat reference sheet of separated game-asset components, arranged in a grid on a ${options.backgroundKeyDescription} background, with no scene, no shadows and no text.\n\n${prompt}`;

    // This family rewrites prompts before generation, so terse absolute phrasing survives better
    // than elaborate structure — which is part of why section 0 sits at the top of the template.
    case 'DALLE_3':
      return `[DIRECTIVE: Reproduce the specification below exactly. Do not restyle, simplify or reinterpret it.]\n\n${prompt}`;

    case 'GENERIC':
      return prompt;
  }
}
