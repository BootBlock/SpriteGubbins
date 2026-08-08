import type { TargetModel } from '../types/output.ts';

/**
 * Midjourney's version flag.
 *
 * A constant rather than a literal in the wrapper, and rather than a user-facing control: a pinned
 * version goes stale by design, so it wants exactly one place to change — but no shipped preset
 * varies it, so it is not a setting. It went stale exactly as predicted: this said `--v 7` while
 * Midjourney's default moved to V8.1 on 10 June 2026 and to V8.2 on 24 July 2026.
 *
 * **What went stale with it was the flag syntax beside it**, which is the part a version constant
 * does not protect: raw mode is `--raw` on the V8 line and `--style raw` on V7, so pinning V8.2
 * while emitting V7 syntax silently dropped the flag. See the Midjourney branch of
 * `utils/modelWrappers.ts` — moving this constant means re-checking that branch's flags too.
 * https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version
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
    description:
      'Standard un-wrapped prompt suitable for ChatGPT, Claude, Gemini, or general LLM text-to-image workflows.',
    capabilities: { deliberates: true, emitsText: true, promptBudget: null },
  },
  {
    // **The only target here that cannot draw.** Its model page gives `text` as the sole output
    // modality and lists `image_generation` under *tools*, so a sheet arrives by Sol calling that
    // tool — and the tool guide names what is on the far side: the renderer is "always a GPT Image
    // model", with "the tool handles GPT Image model selection".
    // https://developers.openai.com/api/docs/guides/tools-image-generation
    //
    // In ChatGPT that renderer is `gpt-image-2`, sold as **ChatGPT Images 2.0**: OpenAI's release
    // notes introduce it on 21 April 2026 as "our new image generation model in ChatGPT", the model
    // ships the same day as `gpt-image-2-2026-04-21`, and OpenAI's ChatGPT docs state "Built-in image
    // generation uses `gpt-image-2`". No one page equates the two names outright — that last step is
    // inference, recorded as such. https://help.openai.com/en/articles/6825453-chatgpt-release-notes
    //
    // Both capability flags below are still about Sol and still true: it reasons over the brief, and
    // it answers in text. What they do not say is that the *picture* comes from a second model on
    // the far side of a tool call, which is what its wrapper in `utils/modelWrapperText.ts` says.
    id: 'CHATGPT_5_6_SOL',
    name: 'ChatGPT 5.6 Sol (OpenAI)',
    description:
      'Sol returns text, never an image: it calls an image tool, and a GPT Image model renders whatever that call carries — which is where adherence is lost. Its wrapper names the three parts the call must carry unshortened. Choosing Sol in ChatGPT also puts you on a thinking tier, which is what enables images with thinking on a paid plan. It reasons over the brief, so it gets the self-audit and can return a companion JSON manifest.',
    capabilities: {
      deliberates: true,
      emitsText: true,
      // The *input* ceiling, not the 1,050,000 context window: the window is input plus the
      // 128,000 output tokens reserved against it, and what this field is measured against is the
      // prompt alone. https://developers.openai.com/api/docs/models/gpt-5.6-sol
      //
      // It is also not the ceiling that binds on this target, and the one that does cannot honestly
      // be recorded here: what reaches the renderer is whatever Sol's tool call carries, which this
      // app never composes and no OpenAI page gives a length for on the ChatGPT path. Borrowing the
      // GPT Image ceiling from `GPT_IMAGE` below would measure somebody else's text with our field.
      promptBudget: { limit: 922_000, unit: 'tokens', note: 'Maximum input tokens.' },
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
    description:
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
    description:
      'The heavier Gemini image model, built for complex layouts and precise text rendering. Same handling as Nano Banana 2 — full specification, self-audit and optional manifest — at higher cost and quality.',
    capabilities: {
      deliberates: true,
      emitsText: true,
      // https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image
      promptBudget: { limit: 65_536, unit: 'tokens', note: 'Model input token limit.' },
    },
  },
  {
    // ByteDance's current flagship, and a *reasoning* image model — which is the same shape as
    // Gemini's thinking models, and the reason this one gets the self-audit while Midjourney and Flux
    // do not. It returns images only, so there is no channel for a manifest.
    //
    // **`deliberates: true` here rests on weaker evidence than it does for Gemini, and that is worth
    // knowing rather than smoothing over.** Google state the reasoning pass on their own model page;
    // for Seedream the equivalent wording — that it "thinks the brief through and plans the layout
    // first, then renders" — is fal's, in the guide for the model they host, and an earlier draft of
    // this comment quoted it as though ByteDance had said it. A reasoning step before generation is
    // reported consistently across the launch coverage and the hosts' documentation, which is enough
    // to send the self-audit and not enough to quote a vendor. If a ByteDance page ever states it
    // outright, cite that instead; if the pass turns out to be marketing, this flag is what to
    // revisit. https://fal.ai/learn/tools/how-to-use-seedream-5-0-pro-v2
    //
    // Deliberately **5.0**, not the 4.5 this app was first going to carry: 5.0 Lite shipped in
    // February 2026 and 5.0 Pro became the flagship on 8 July 2026. Adding 4.5 would have repeated
    // the Flux mistake below in the same change that fixed it.
    // https://fal.ai/learn/tools/how-to-use-seedream-5-0-pro-v2
    id: 'SEEDREAM',
    name: 'Seedream 5.0 (ByteDance)',
    description:
      'ByteDance’s reasoning image model — it plans the layout before rendering, so it receives the full specification including the self-audit. Returns images only, so it cannot return a manifest. Its prompt is led by a planning directive, because long briefs here are documented to lose instructions.',
    capabilities: {
      deliberates: true,
      emitsText: false,
      // **`null` is the researched answer, not a gap.** ByteDance's own platform documentation
      // publishes guidance rather than a ceiling: keep prompts under roughly 600 English words (300
      // Chinese characters). Hosts do impose hard caps of their own — Runware 3,000 characters,
      // EvoLink 2,000 tokens on 5.0 Lite — but a reseller's cap is not the model's, and recording
      // one here would attribute somebody else's limit to ByteDance. Advice is not a documented
      // ceiling on what is read, and this field records only the latter. Same call as Midjourney.
      promptBudget: null,
    },
  },
  {
    // Alibaba's Qwen-Image 3.0, released 21 July 2026, and the tightest published ceiling the whole
    // specification still fits inside: 4.5K tokens against a prompt measuring ~3,600. Roomier targets
    // fit it too — that is not the point. This is the one where the margin is small enough that the
    // budget notice earns its place, and the first target where a *small* budget is not a warning.
    //
    // Not a thinking model — no reasoning pass is documented, and the model page lists structured
    // outputs as unsupported — so it gets the specification without the self-audit. Note that 3.0
    // shipped cloud-only: no weights, no model card, no benchmarks, unlike Qwen-Image 1.0 and 2.0.
    id: 'QWEN_IMAGE',
    name: 'Qwen-Image 3.0 (Alibaba)',
    description:
      'Built for dense structured layouts and long briefs — at 4.5K tokens it is the tightest published ceiling the full specification still fits inside. Gets a plain negative-prompt block, because Qwen exposes negative_prompt as a documented parameter.',
    capabilities: {
      deliberates: false,
      emitsText: false,
      // "Supports input of up to 4.5k tokens", on Alibaba's model page for `qwen-image-3.0-pro` —
      // *not* on the API reference, which states no length for either `text` or `negative_prompt`.
      // The figure was first taken from launch coverage and cited to that API reference, which did
      // not carry it; this is the page that does. No multiplier is claimed against 2.0 here, because
      // Alibaba's own figure for the 2.0 series is 1,300 tokens, which makes the widely-repeated
      // "4.5× longer" wrong. https://help.aliyun.com/en/model-studio/qwen-image-3-0-pro
      promptBudget: { limit: 4_500, unit: 'tokens', note: 'Model input token limit.' },
    },
  },
  {
    // No prompt ceiling is documented. Midjourney's own guidance is the opposite of a limit and
    // worth heeding anyway: "short and simple prompts typically generate the best images", and
    // "avoid making long lists or detailed instructions; these can confuse the process".
    // https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics
    id: 'MIDJOURNEY',
    name: 'Midjourney',
    description:
      'Appends Midjourney flags: aspect ratio, version, --raw, and a low stylisation value, because high stylisation fights a technical layout brief. The background is deliberately not excluded — the sheet needs a keyable one.',
    capabilities: { deliberates: false, emitsText: false, promptBudget: null },
  },
  {
    id: 'STABLE_DIFFUSION',
    name: 'Stable Diffusion (SD 1.5 / SDXL)',
    description:
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
    // **FLUX 3 was announced on 23 July 2026 and is not yet what these two entries should name.**
    // Only FLUX 3 Video is generally available; FLUX 3 Image is in limited early access and the
    // open-weight FLUX 3 Dev is slated for later in 2026. Recorded here because the whole lesson of
    // this entry is that a third-party version is a claim with an expiry date — this one's is
    // visible in advance, so re-check it rather than waiting to be surprised again.
    //
    // **This entry described FLUX.1 for eight months after FLUX.2 replaced it** (25 November 2025).
    // Its note named a T5 encoder and a 77-token CLIP window, and FLUX.2 has neither: [dev] encodes
    // with `Mistral3SmallEmbedder` and [klein] with `Qwen3Embedder`, with no CLIP in the stack at
    // all. The 512 survived the generation change by coincidence rather than by still being checked.
    // https://deepwiki.com/black-forest-labs/flux2/3.2-text-encoders
    id: 'FLUX',
    name: 'Flux (open weights — FLUX.2 dev / klein)',
    description:
      'Separate from Stable Diffusion because Black Forest Labs state outright that FLUX.2 does not support negative prompts — the SD block would be silently discarded — so the same constraints are restated positively, and stated first because only the first 512 tokens are read.',
    capabilities: {
      deliberates: false,
      emitsText: false,
      promptBudget: {
        limit: 512,
        unit: 'tokens',
        // Deliberately sourced from Black Forest Labs' own inference code rather than a model card:
        // `MAX_LENGTH` is 512 across every open-weight variant. FLUX.1 dev happens to match it via
        // T5, and Schnell reads 256, so this ceiling is the safe one for a local Flux of any vintage.
        note: 'Tokeniser limit in Black Forest Labs’ own FLUX.2 inference code, shared by [dev] and [klein]. FLUX.1 dev matches it; Schnell reads 256.',
      },
    },
  },
  {
    // The hosted tier, and the reason `FLUX` could not stay one entry: Black Forest Labs advertise
    // 32K text input tokens for FLUX.2, which is true of [pro], [max] and [flex] and not of the
    // weights you can download. A single 512-token entry told a [pro] user their prompt was seven
    // times over a ceiling that does not apply to them. https://bfl.ai/models/flux-2
    id: 'FLUX_API',
    name: 'Flux (BFL API — FLUX.2 pro / max / flex)',
    description:
      'Black Forest Labs’ hosted FLUX.2 tier, which reads 32K tokens — so the whole specification fits. Same positive restatement as the open weights, since no FLUX.2 model takes a negative prompt.',
    capabilities: {
      deliberates: false,
      emitsText: false,
      promptBudget: { limit: 32_000, unit: 'tokens', note: 'Advertised FLUX.2 text input limit.' },
    },
  },
  {
    // Replaces the DALL·E 3 entry, which OpenAI shut down on 12 May 2026. `gpt-image-2` lists
    // "image" as its only output modality, so it cannot return a manifest.
    // https://developers.openai.com/api/docs/deprecations
    id: 'GPT_IMAGE',
    name: 'GPT Image 2 (OpenAI)',
    description:
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
