import type { AspectRatio, TargetModelId } from '../types/output.ts';
import type { RenderStyleSurface } from '../types/rendering.ts';
import {
  wrapForFlux,
  wrapForGptImage,
  wrapForMidjourney,
  wrapForQwen,
  wrapForSeedream,
  wrapForSol,
  wrapForStableDiffusion,
} from './modelWrapperText.ts';

/**
 * Which wrapper each generator gets.
 *
 * Dispatch only — the text every branch returns lives in `modelWrapperText.ts`, beside the vendor
 * documentation that justifies it. Splitting them keeps this file readable as what it is: the one
 * place to see, at a glance, that every id in `TARGET_MODELS` is accounted for.
 *
 * **Two branches return the prompt unchanged, and that is a finding rather than a gap.** The Gemini
 * image models read the prompt as a specification and think over it, which the *template* adapts to
 * by giving them the self-audit and the manifest, so there is nothing left for a wrapper to say that
 * the specification does not already say better. `GENERIC` is unchanged for the opposite reason —
 * naming no model, it can have no model-specific text — and that is what makes it usable with
 * anything this app does not know about.
 *
 * The switch is exhaustive over `TargetModelId` with no `default`, so adding an id to the union is a
 * compile error here until it is answered. That is deliberate: the failure this pairing is most
 * prone to is a model offered in the dropdown whose prompt is silently unwrapped.
 */
export function wrapForModel(
  prompt: string,
  target: TargetModelId,
  options: {
    readonly aspectRatio: AspectRatio;
    readonly backgroundKeyDescription: string;
    /**
     * Whether a frame or a border is one of this sheet's components, from `FRAME_IS_A_COMPONENT`.
     *
     * Only Midjourney reads it, and only because `--no` negates a bare concept where section 0
     * negates a placement — see `wrapForMidjourney`. It is passed rather than derived here so this
     * file stays dispatch and knows nothing about categories.
     */
    readonly frameIsAComponent: boolean;
    /**
     * What this sheet's render style lets a wrapper say about the surface, from
     * `RENDER_STYLE_SURFACE`.
     *
     * Every target that speaks about edges and gradients reads it — Flux positively, because it
     * discards a negative prompt, and Midjourney, Stable Diffusion and Qwen as negations. Each of
     * them stated the pixel-art rules as a fixed string until this was passed, so on the eight other
     * styles the wrapper contradicted section 2 of the prompt it was wrapping.
     */
    readonly surface: RenderStyleSurface;
    /**
     * Whether this sheet's components are limbs, from `categoryPermits(category, 'anatomy')`.
     *
     * The two negative blocks weight `extra limbs, merged limbs` against a duplication failure only
     * a limbed subject can have, and a building, a terrain tileset or an interface kit cannot. Read
     * off the same table the plan validation uses, rather than restated here: that table is where
     * the app decides a walker's legs are a vehicle's mechanism and not anatomy, and a second list
     * of category names is a second thing to keep in step.
     */
    readonly limbsAreComponents: boolean;
  },
): string {
  switch (target) {
    case 'CHATGPT_5_6_SOL':
      return wrapForSol(prompt);

    case 'MIDJOURNEY':
      return wrapForMidjourney(prompt, options.aspectRatio, options.frameIsAComponent, options.surface);

    case 'STABLE_DIFFUSION':
      return wrapForStableDiffusion(prompt, options.surface, options.limbsAreComponents);

    // One wrapper for both Flux tiers. They differ only in how much of the prompt is read, which is
    // a budget fact rather than a wrapping one — and the restatement leads for both, since Black
    // Forest Labs' word-order guidance applies to the hosted tier just as it does to the weights.
    case 'FLUX':
    case 'FLUX_API':
      return wrapForFlux(prompt, options.backgroundKeyDescription, options.surface);

    case 'QWEN_IMAGE':
      return wrapForQwen(prompt, options.surface, options.limbsAreComponents);

    case 'SEEDREAM':
      return wrapForSeedream(prompt);

    case 'GPT_IMAGE':
      return wrapForGptImage(prompt);

    case 'GEMINI_FLASH_IMAGE':
    case 'GEMINI_PRO_IMAGE':
    case 'GENERIC':
      return prompt;
  }
}
