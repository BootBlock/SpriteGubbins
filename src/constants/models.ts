import type { TargetModel } from '../types/output.ts';

/**
 * Midjourney's version flag.
 *
 * A constant rather than a literal in the wrapper, and rather than a user-facing control: a pinned
 * version goes stale by design, so it wants exactly one place to change — but no shipped preset
 * varies it, so it is not a setting.
 */
export const MIDJOURNEY_VERSION = '--v 7';

/**
 * The generators a prompt can be written for, in selector order.
 *
 * Each entry pairs with a branch in `utils/modelWrappers.ts` that actually wraps the prompt —
 * a reasoning contract, CLI flags, a negative-prompt block or a directive prefix. Adding a
 * model here without adding its branch there offers the user a model whose output is silently
 * unwrapped, which is the half-applied edit this pairing is most prone to.
 */
export const TARGET_MODELS: readonly TargetModel[] = [
  {
    id: 'GENERIC',
    name: 'Generic / Baseline Prompt',
    tooltip:
      'Standard un-wrapped prompt suitable for ChatGPT, Claude 3.5 Sonnet, DeepSeek, or general LLM text-to-image workflows.',
    capabilities: { deliberates: true, emitsText: true },
  },
  {
    id: 'CHATGPT_5_6_SOL',
    name: 'ChatGPT 5.6 Sol (OpenAI)',
    tooltip:
      'Adds a short reasoning-effort directive and points the model at the template’s own done-condition and verification sections. Can also return a companion JSON manifest.',
    capabilities: { deliberates: true, emitsText: true },
  },
  {
    id: 'MIDJOURNEY',
    name: 'Midjourney',
    tooltip:
      'Appends Midjourney flags: aspect ratio, version, --style raw, and a low stylisation weight, because high stylisation fights a technical layout brief. The background is deliberately not excluded — the sheet needs a keyable one.',
    capabilities: { deliberates: false, emitsText: false },
  },
  {
    id: 'STABLE_DIFFUSION',
    name: 'Stable Diffusion (SD 1.5 / SDXL)',
    tooltip:
      'Appends a weighted negative-prompt block aimed at the two failures that actually recur: assembling the figure instead of exploding it, and adding shadows.',
    capabilities: { deliberates: false, emitsText: false },
  },
  {
    id: 'FLUX',
    name: 'Flux',
    tooltip:
      'Separate from Stable Diffusion because Flux has no negative prompt in normal use — the SD block would be silently discarded — and responds better to prose, so the same constraints are restated positively.',
    capabilities: { deliberates: false, emitsText: false },
  },
  {
    id: 'GOOGLE_IMAGEN',
    name: 'Google Imagen',
    tooltip:
      'Prepends one plain-language framing sentence. Imagen handles descriptive natural language well and long rule lists poorly.',
    capabilities: { deliberates: false, emitsText: false },
  },
  {
    id: 'DALLE_3',
    name: 'DALL-E 3 / GPT-image (OpenAI)',
    tooltip:
      'Prepends a short, absolute directive. This family rewrites prompts before generation, so terse phrasing survives where elaborate structure does not.',
    capabilities: { deliberates: false, emitsText: false },
  },
];
