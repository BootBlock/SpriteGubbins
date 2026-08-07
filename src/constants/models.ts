import type { TargetModel } from '../types/output.ts';

/**
 * Midjourney's version flag.
 *
 * A constant rather than a literal in the wrapper, and rather than a user-facing control: a pinned
 * version goes stale by design, so it wants exactly one place to change — but no shipped preset
 * varies it, so it is not a setting. It went stale exactly as predicted: this said `--v 7` while
 * Midjourney's default moved to V8.1 on 11 June 2026 and to V8.2 on 24 July 2026.
 */
export const MIDJOURNEY_VERSION = '--v 8.2';

/**
 * The generators a prompt can be written for, in selector order.
 *
 * Each entry pairs with a branch in `utils/modelWrappers.ts` that actually wraps the prompt, and
 * declares what the endpoint can do with what it is sent. Adding a model here without adding its
 * branch there offers the user a model whose output is silently unwrapped, which is the
 * half-applied edit this pairing is most prone to.
 *
 * **Every capability and ceiling here is a checkable claim about somebody else's product, so each
 * carries its source.** Two entries were removed once checked rather than left to rot: Google
 * Imagen (Imagen 3 shut down 10 November 2025; Imagen 4 shuts down 17 August 2026) and DALL·E 3
 * (shut down 12 May 2026). Both had been dead or dying while the app went on offering them.
 */
export const TARGET_MODELS: readonly TargetModel[] = [
  {
    id: 'GENERIC',
    name: 'Generic / Baseline Prompt',
    tooltip:
      'Standard un-wrapped prompt suitable for ChatGPT, Claude, Gemini, or general LLM text-to-image workflows.',
    capabilities: { deliberates: true, emitsText: true, promptBudget: null },
  },
  {
    id: 'CHATGPT_5_6_SOL',
    name: 'ChatGPT 5.6 Sol (OpenAI)',
    tooltip:
      'Adds a short reasoning-effort directive and points the model at the template’s own done-condition and verification sections. Can also return a companion JSON manifest.',
    capabilities: {
      deliberates: true,
      emitsText: true,
      // https://developers.openai.com/api/docs/models/gpt-5.6-sol
      promptBudget: { limit: 1_050_000, unit: 'tokens', note: 'Model context window.' },
    },
  },
  {
    // Google names this the migration target for the retired Imagen models. It is a *thinking*
    // model — "Gemini 3 image models are thinking models that use a reasoning process ('Thinking')
    // for complex prompts", and it cannot be disabled — and it returns interleaved text and images,
    // so unlike Imagen it can both work through the specification and hand back a manifest.
    // https://ai.google.dev/gemini-api/docs/image-generation
    id: 'GEMINI_FLASH_IMAGE',
    name: 'Gemini 3.1 Flash Image / Nano Banana 2',
    tooltip:
      'Google’s replacement for the retired Imagen models. A thinking model that reasons over complex prompts, so it receives the full specification including the self-audit, and it can return a companion JSON manifest alongside the image.',
    capabilities: {
      deliberates: true,
      emitsText: true,
      // "Input token limit: 131,072", and Outputs "Image and Text" — which is what earns the
      // manifest. https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image
      promptBudget: { limit: 131_072, unit: 'tokens', note: 'Model input token limit.' },
    },
  },
  {
    // The same family, sold as "a professional design engine with a reasoning core for
    // studio-quality 4K visuals, complex layouts, and precise text rendering" — which is what an
    // exploded component grid is. https://ai.google.dev/gemini-api/docs/models
    id: 'GEMINI_PRO_IMAGE',
    name: 'Gemini 3 Pro Image / Nano Banana Pro',
    tooltip:
      'The heavier Gemini image model, built for complex layouts and precise text rendering. Same handling as Nano Banana 2 — full specification, self-audit and optional manifest — at higher cost and quality.',
    capabilities: {
      deliberates: true,
      emitsText: true,
      // https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image
      promptBudget: { limit: 65_536, unit: 'tokens', note: 'Model input token limit.' },
    },
  },
  {
    // No prompt ceiling is documented. Midjourney's own guidance is the opposite of a limit and
    // worth heeding anyway: "short and simple prompts typically generate the best images", and
    // "avoid making long lists or detailed instructions; these can confuse the process".
    // https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics
    id: 'MIDJOURNEY',
    name: 'Midjourney',
    tooltip:
      'Appends Midjourney flags: aspect ratio, version, --style raw, and a low stylisation weight, because high stylisation fights a technical layout brief. The background is deliberately not excluded — the sheet needs a keyable one.',
    capabilities: { deliberates: false, emitsText: false, promptBudget: null },
  },
  {
    id: 'STABLE_DIFFUSION',
    name: 'Stable Diffusion (SD 1.5 / SDXL)',
    tooltip:
      'Appends a weighted negative-prompt block aimed at the two failures that actually recur: assembling the figure instead of exploding it, and adding shadows.',
    capabilities: {
      deliberates: false,
      emitsText: false,
      promptBudget: {
        limit: 77,
        unit: 'tokens',
        note: 'CLIP text-encoder context. A base pipeline truncates past it; front-ends that chunk the prompt read further, with weaker attention.',
      },
    },
  },
  {
    id: 'FLUX',
    name: 'Flux',
    tooltip:
      'Separate from Stable Diffusion because Flux has no negative prompt in normal use — the SD block would be silently discarded — and responds better to prose, so the same constraints are restated positively.',
    capabilities: {
      deliberates: false,
      emitsText: false,
      promptBudget: {
        limit: 512,
        unit: 'tokens',
        note: 'T5 text-encoder context on FLUX.1 dev (256 on Schnell). Only the first 77 tokens also reach CLIP.',
      },
    },
  },
  {
    // Replaces the DALL·E 3 entry, which OpenAI shut down on 12 May 2026. `gpt-image-2` lists
    // "image" as its only output modality, so it cannot return a manifest.
    // https://developers.openai.com/api/docs/deprecations
    id: 'GPT_IMAGE',
    name: 'GPT Image 2 (OpenAI)',
    tooltip:
      'OpenAI’s current image model, replacing the retired DALL·E 3. Returns images only, so it gets the specification without the self-audit or the manifest.',
    capabilities: {
      deliberates: false,
      emitsText: false,
      // "The maximum length is 32000 characters for the GPT image models." Recorded in characters
      // because that is the unit OpenAI states it in. Note the same reference's `model` enum has
      // not been updated for `gpt-image-2`, so two OpenAI pages disagree about which models exist;
      // the ceiling is taken as applying to the family the model page puts it in.
      // https://developers.openai.com/api/docs/api-reference/images/create
      promptBudget: { limit: 32_000, unit: 'characters', note: 'Images API prompt-length limit.' },
    },
  },
];
