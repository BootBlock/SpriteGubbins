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
    // No model named, so no vendor to have a page. The other three `NONE` entries are two sets of
    // open weights and an API endpoint, which are different findings wearing the same absence — see
    // `GeneratorSite`.
    generatorSite: {
      kind: 'NONE',
      note: 'This target names no particular model, so there is no generator site to open.',
    },
    capabilities: {
      deliberates: true,
      emitsText: true,
      // The one entry with nobody to cite. It names no model, so there is no vendor page to hold a
      // figure and no product a figure would be about — which is a different answer from Midjourney
      // below, where a vendor exists and publishes none, and the reason the two are separate states
      // rather than one absent value.
      promptBudget: {
        kind: 'NO_VENDOR',
        note: 'Names no particular model, so there is no vendor to publish a length for.',
      },
    },
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
    // the far side of a tool call, which is what its wrapper in `utils/modelWrapperText/sol.ts`
    // says.
    id: 'CHATGPT_5_6_SOL',
    name: 'ChatGPT 5.6 Sol (OpenAI)',
    description:
      'Sol returns text, never an image: it calls an image tool, and a GPT Image model renders whatever that call carries — which is where adherence is lost. Its wrapper names the three parts the call must carry unshortened. Choosing Sol in ChatGPT also puts you on a thinking tier, which is what enables images with thinking on a paid plan. It reasons over the brief, so it gets the self-audit and can return a companion component map.',
    // ChatGPT's own image surface, which is where a person rather than an API client reaches this
    // model. OpenAI announce it as “ChatGPT Images 2.0” and the page is indexed under that name.
    // https://openai.com/index/introducing-chatgpt-images-2-0/
    generatorSite: { kind: 'PUBLIC', url: 'https://chatgpt.com/images' },
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
      promptBudget: {
        kind: 'CEILING',
        limit: 922_000,
        unit: 'tokens',
        note: 'Maximum input tokens — the context window, less the output tokens reserved against it.',
      },
    },
  },
  {
    // Google names this the migration target for the retired Imagen models. It is a *thinking*
    // model — "Gemini 3 image models are thinking models that use a reasoning process ('Thinking')
    // for complex prompts", and it cannot be disabled — and it returns interleaved text and images,
    // so unlike Imagen it can both work through the specification and hand back a component map.
    // https://ai.google.dev/gemini-api/docs/image-generation
    id: 'GEMINI_FLASH_IMAGE',
    name: 'Gemini 3.1 Flash Image / Nano Banana 2',
    description:
      'Google’s replacement for the retired Imagen models. A thinking model that reasons over complex prompts, so it receives the full specification including the self-audit, and it can return a companion component map alongside the image.',
    // The deep-link shape is Google's own: every “Open in Google AI Studio” button on the DeepMind
    // model pages is `prompts/new_chat?model=<id>`, and the id below is the one those buttons carry
    // for this model. It is the `-preview` spelling rather than the `gemini-3.1-flash-image` the API
    // model page names — the two OpenAI-style surfaces disagree, and what the button has to match is
    // AI Studio's, not the API's. https://deepmind.google/models/gemini-image/
    generatorSite: {
      kind: 'PUBLIC',
      url: 'https://aistudio.google.com/prompts/new_chat?model=gemini-3.1-flash-image-preview',
    },
    capabilities: {
      deliberates: true,
      emitsText: true,
      // "Input token limit: 131,072", and Outputs "Image and Text" — which is what earns the
      // component map. https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image
      promptBudget: {
        kind: 'CEILING',
        limit: 131_072,
        unit: 'tokens',
        note: 'Model input token limit.',
      },
    },
  },
  {
    // The same family, sold as "a professional design engine with a reasoning core for
    // studio-quality 4K visuals, complex layouts, and precise text rendering" — which is what an
    // exploded component grid is. https://ai.google.dev/gemini-api/docs/models
    id: 'GEMINI_PRO_IMAGE',
    name: 'Gemini 3 Pro Image / Nano Banana Pro',
    description:
      'The heavier Gemini image model, built for complex layouts and precise text rendering. Same handling as Nano Banana 2 — full specification, self-audit and optional component map — at higher cost and quality.',
    // The same shape, with the id DeepMind's Nano Banana Pro page carries.
    // https://deepmind.google/models/gemini-image/pro/
    generatorSite: {
      kind: 'PUBLIC',
      url: 'https://aistudio.google.com/prompts/new_chat?model=gemini-3-pro-image-preview',
    },
    capabilities: {
      deliberates: true,
      emitsText: true,
      // https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image
      promptBudget: {
        kind: 'CEILING',
        limit: 65_536,
        unit: 'tokens',
        note: 'Model input token limit.',
      },
    },
  },
  {
    // ByteDance's current flagship, and a *reasoning* image model — which is the same shape as
    // Gemini's thinking models, and the reason this one gets the self-audit while Midjourney and Flux
    // do not. It returns images only, so there is no channel for a component map.
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
      'ByteDance’s reasoning image model — it plans the layout before rendering, so it receives the full specification including the self-audit. Returns images only, so it cannot return a component map. Its prompt is led by a planning directive, because long briefs here are documented to lose instructions — ByteDance advise 600 English words, and the notice under the prompt says how far past that yours is.',
    // Dreamina is ByteDance's own consumer surface for these models, and its feature page states which
    // Seedream versions it runs. The path below is where the older `/ai-tool/image/generate` now
    // redirects. https://dreamina.capcut.com/tools/seedream
    generatorSite: { kind: 'PUBLIC', url: 'https://dreamina.capcut.com/ai-tool/generate/?type=image' },
    capabilities: {
      deliberates: true,
      emitsText: false,
      // **Guidance, and it is published — which is why it is no longer silence.** ByteDance state
      // it on the `prompt` parameter itself: “Use no more than 300 Chinese characters or 600 English
      // words. Excessively long prompts may scatter information, causing the model to overlook
      // details and focus only on major elements, which can result in missing details in the
      // generated image.” That is degradation rather than truncation, so it is `GUIDANCE` and not a
      // `CEILING`, and the studio words it as a trade-off rather than as a prompt that will not
      // arrive. https://docs.byteplus.com/en/docs/ModelArk/1541523
      //
      // **This entry is why the four states exist.** Carrying `null` made the one target whose own
      // description says long briefs lose instructions the one target that could never tell a reader
      // their brief was long — the notice keys off the budget, and `null` switches it off.
      //
      // The English half of the pair is what is recorded, because that is the language this app
      // composes in; the 300-character figure is the same advice for Chinese and would measure a
      // prompt the app never writes. Hosts impose hard caps of their own — Runware 3,000 characters,
      // EvoLink 2,000 tokens on 5.0 Lite — and none is recorded here: a reseller's cap is not the
      // model's, and it would be attributed to ByteDance by anyone reading this field.
      promptBudget: {
        kind: 'GUIDANCE',
        limit: 600,
        unit: 'words',
        note: 'ByteDance advise no more than 600 English words. Past that they document the model scattering information and dropping details, not truncating the brief.',
      },
    },
  },
  {
    // Alibaba's Qwen-Image 3.0, released 21 July 2026, and the tightest published ceiling this app
    // has anything to say to: 4.5K tokens, against a library running ~3,100 to ~7,900 estimated
    // tokens.
    //
    // **The description below said the whole specification fits inside it, and it does not.** The
    // studio's opening configuration compiles to ~6,800 — half as long again as the budget — so the
    // first thing that entry did for a reader who took it at its word was to contradict itself: the
    // sentence promised a fit and `PromptBudgetNotice` fired on the same screen. What is true is a
    // trade-off rather than a fit, and this is the one target where the trade-off is live, which is
    // where the budget notice earns its place. `constants/models.test.ts` measures the range and
    // holds the sentence to it.
    //
    // Not a thinking model — no reasoning pass is documented, and the model page lists structured
    // outputs as unsupported — so it gets the specification without the self-audit. Note that 3.0
    // shipped cloud-only: no weights, no model card, no benchmarks, unlike Qwen-Image 1.0 and 2.0.
    id: 'QWEN_IMAGE',
    name: 'Qwen-Image 3.0 (Alibaba)',
    description:
      'Built for dense structured layouts and long briefs, at a documented 4.5K tokens. That holds a sparse sheet — one facing, few components — and not the five-view directional sheet the studio opens on, which runs about half as long again. The budget notice under the prompt says where yours lands. Gets a plain negative-prompt block, because Qwen exposes negative_prompt as a documented parameter.',
    // Qwen Chat, which is where Alibaba shipped 3.0 — the release carried no weights and no API
    // pricing, so this is the only place a reader can use it at all.
    generatorSite: { kind: 'PUBLIC', url: 'https://chat.qwen.ai/' },
    capabilities: {
      deliberates: false,
      emitsText: false,
      // "Supports input of up to 4.5k tokens", on Alibaba's model page for `qwen-image-3.0-pro` —
      // *not* on the API reference, which states no length for either `text` or `negative_prompt`.
      // The figure was first taken from launch coverage and cited to that API reference, which did
      // not carry it; this is the page that does. No multiplier is claimed against 2.0 here, because
      // Alibaba's own figure for the 2.0 series is 1,300 tokens, which makes the widely-repeated
      // "4.5× longer" wrong. https://help.aliyun.com/en/model-studio/qwen-image-3-0-pro
      promptBudget: {
        kind: 'CEILING',
        limit: 4_500,
        unit: 'tokens',
        note: 'Model input token limit.',
      },
    },
  },
  {
    // **No figure, and how far that goes is worth stating.** Midjourney's public help centre carries
    // no prompt length in any of its 105 articles, and the only lengths it publishes anywhere are a
    // 21-second video and a 1,000-character profile bio. The widely-repeated “6,000 characters”
    // traces to third parties and to a Discord forum post, never to Midjourney, so it is not
    // recorded: the studio's opening configuration compiles to roughly 24,000 characters here, and a
    // wrong ceiling would be worse than none.
    //
    // What Midjourney do publish is qualitative, and it is the opposite of a limit: “Short and
    // simple prompts typically generate the best images with Midjourney”, and “Avoid making long
    // lists or detailed instructions; these can confuse the process”. There is no number in it to
    // measure a prompt against, which is exactly what separates this entry from Seedream's above.
    // https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics
    id: 'MIDJOURNEY',
    name: 'Midjourney',
    description:
      'Appends Midjourney flags: aspect ratio, version, --raw, and a low stylisation value, because high stylisation fights a technical layout brief. The background is deliberately not excluded — the sheet needs a keyable one.',
    // The Create page, whose URL is `/imagine` rather than `/create`: the docs call it the Create page
    // in prose and link it as `/imagine`, and no `/create` URL appears anywhere in them.
    // https://docs.midjourney.com/hc/en-us/articles/33329460426765-Website-Overview
    generatorSite: { kind: 'PUBLIC', url: 'https://www.midjourney.com/imagine' },
    capabilities: {
      deliberates: false,
      emitsText: false,
      promptBudget: {
        kind: 'UNPUBLISHED',
        note: 'Midjourney publish no prompt length anywhere in their documentation, only advice to keep prompts short.',
      },
    },
  },
  {
    id: 'STABLE_DIFFUSION',
    name: 'Stable Diffusion (SD 1.5 / SDXL)',
    description:
      'Appends a weighted negative-prompt block aimed at the two failures that actually recur: assembling the figure instead of exploding it, and adding shadows. Nothing this app composes fits CLIP’s 77-token window, so a base pipeline reads the opening and discards the rest — which is why no built-in preset targets it.',
    // **Checked, and there is none.** These are weights people run themselves, and Stability's own web
    // generator is gone: `stability.ai/dreamstudio` now answers 301 to `stability.ai/brandstudio`, a
    // brand-asset tool that does not offer SD 1.5 or SDXL. A third-party front end would be a
    // recommendation this app has no business making.
    generatorSite: {
      kind: 'NONE',
      note: 'SD 1.5 and SDXL are open weights you run yourself, and Stability’s own web generator no longer exists.',
    },
    capabilities: {
      deliberates: false,
      emitsText: false,
      promptBudget: {
        kind: 'CEILING',
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
    // Its note named a T5 encoder and a 77-token CLIP window, and FLUX.2 has neither: `flux.2-dev`
    // loads `Mistral3SmallEmbedder` and every `flux.2-klein-*` loads `Qwen3Embedder`, with no CLIP
    // in the stack at all. The 512 survived the generation change by coincidence rather than by
    // still being checked.
    //
    // **The ceiling is cited to the code the note names.** `MAX_LENGTH = 512` is declared in
    // `src/flux2/text_encoder.py`, and both embedders tokenise against it with truncation enabled,
    // which is why one figure covers [dev] and [klein]; `src/flux2/util.py` is where each variant
    // picks its embedder. This was previously cited only to a deepwiki page — a machine-generated
    // reading of that repository — while the note beside it claimed the repository itself. The
    // repository is public, so cite it. FLUX.1's two figures come from the same place: `src/flux/`
    // `cli.py` loads T5 at 256 for Schnell and 512 for everything else.
    // https://github.com/black-forest-labs/flux2/blob/main/src/flux2/text_encoder.py
    //
    // **What Black Forest Labs say about negative prompts is written for the hosted tier**, and
    // this entry is not it. Their prompting guide is titled "Prompting Guide - FLUX.2 [pro] &
    // [max]", states no token limit, and addresses no open weight in any of its advice — the one
    // place [dev] appears at all is a multi-reference count in the Quick Reference table, which is a
    // capability figure rather than guidance. The FLUX.2 [dev] model card says nothing about
    // prompting either. What is checkable for the weights is the reference implementation, and it
    // settles the question on its own: the CLI exposes no negative field, and classifier-free
    // guidance runs its unconditional branch on the empty string, which `denoise_cfg` documents as
    // the concatenation of an empty prompt with the real one. So the description below argues from
    // the code rather than borrowing a sentence from a page written for models this entry does not
    // cover. https://docs.bfl.ai/guides/prompting_guide_flux2
    id: 'FLUX',
    name: 'Flux (open weights — FLUX.2 dev / klein)',
    description:
      'Separate from Stable Diffusion because Black Forest Labs’ own FLUX.2 inference code offers no negative prompt at all — the SD block would be silently discarded — so the same constraints are restated positively, and stated first because only the first 512 tokens are read. A sheet specification is several times that long, so the library ships no preset aimed at these weights.',
    // Open weights, so nothing to open — Black Forest Labs' playground generates with the hosted tier,
    // which is the `FLUX_API` entry below and carries that link.
    generatorSite: {
      kind: 'NONE',
      note: 'FLUX.2 [dev] and [klein] are open weights you run yourself, so there is no vendor page that generates with them.',
    },
    capabilities: {
      deliberates: false,
      emitsText: false,
      promptBudget: {
        kind: 'CEILING',
        limit: 512,
        unit: 'tokens',
        // Deliberately sourced from Black Forest Labs' own inference code rather than a model card:
        // `MAX_LENGTH` is 512 across every open-weight variant. FLUX.1 dev happens to match it via
        // T5, and Schnell reads 256, so this ceiling is the safe one for a local Flux of any vintage.
        // The note names the file so a reader can check the figure where it is declared, which is
        // the half the entry was missing while it cited a third-party wiki for it.
        note: 'The MAX_LENGTH the tokeniser truncates to in Black Forest Labs’ own FLUX.2 inference code, shared by [dev] and [klein]. FLUX.1 dev matches it; Schnell reads 256.',
      },
    },
  },
  {
    // The hosted tier, and the reason `FLUX` could not stay one entry: Black Forest Labs advertise
    // 32K text input tokens for FLUX.2, and a single 512-token entry told a [pro] user their prompt
    // was seven times over a ceiling that does not apply to them. https://bfl.ai/models/flux-2
    //
    // **That 32K is stated unscoped, and reading it as the hosted tier's is this app's inference.**
    // The page lists [max], [pro], [flex], [klein] and [dev] together and attributes the figure to
    // none of them. What rules the weights out is not the page but the code: `MAX_LENGTH` truncates
    // every open-weight prompt at 512, as the `FLUX` entry above records. Black Forest Labs also
    // serve [klein] from their own API, so the word "hosted" does not buy the figure either — this
    // entry names [pro], [max] and [flex] because those are the three the 512 demonstrably cannot
    // bind. If a per-variant figure is ever published, cite that and delete this paragraph.
    // https://docs.bfl.ai/quick_start/generating_images
    //
    // **The negative-prompt claim is scoped to the guide that makes it**, and this entry is the
    // three models that guide speaks to. Its title names [pro] and [max], and its Quick Reference
    // addresses [flex] directly — a guidance range, a step count and a multi-reference figure — so
    // all three variants named here are inside what it advises. What it advises nowhere is an open
    // weight, which is why the `FLUX` entry above argues from the inference code instead. No FLUX.2
    // endpoint Black Forest Labs document takes a negative prompt parameter either.
    // https://docs.bfl.ai/guides/prompting_guide_flux2
    id: 'FLUX_API',
    name: 'Flux (BFL API — FLUX.2 pro / max / flex)',
    description:
      'Black Forest Labs’ hosted FLUX.2 tier, which reads 32K tokens — so the whole specification fits. The same positive restatement as the open weights, since Black Forest Labs’ prompting guide for this tier states that FLUX.2 does not support negative prompts.',
    // The BFL Playground, which Black Forest Labs name as the place to try the hosted tier without
    // writing code. https://help.bfl.ai/articles/8667153955-what-is-the-bfl-playground
    generatorSite: { kind: 'PUBLIC', url: 'https://playground.bfl.ai/' },
    capabilities: {
      deliberates: false,
      emitsText: false,
      promptBudget: {
        kind: 'CEILING',
        limit: 32_000,
        unit: 'tokens',
        note: 'Advertised FLUX.2 text input limit, stated for the family rather than per variant.',
      },
    },
  },
  {
    // Replaces the DALL·E 3 entry, which OpenAI shut down on 12 May 2026. **This entry is the Images
    // API endpoint, not ChatGPT** — a distinction it spent its first release blurring, by declaring
    // the capabilities of `gpt-image-2` called directly while sending the reader to chatgpt.com,
    // where the prompt is read by a thinking chat model and the picture arrives from a tool call.
    // That arrangement already has an entry: it is `CHATGPT_5_6_SOL` above. So the two are split the
    // way `FLUX` and `FLUX_API` are, by the surface a reader reaches the weights through.
    //
    // The model page settles both capability flags below. "Output modalities: image", so there is no
    // channel a component map could come back through; and the endpoints it marks supported are
    // `v1/images/generations`, `v1/images/edits` and Batch, with Chat Completions and Responses both
    // marked unsupported — so there is no conversational pass in which it could check its own work.
    // The deprecations page was cited here for the modality claim and does not carry it: that page
    // is notice periods and shutdown tables, and describes no model's behaviour.
    // https://developers.openai.com/api/docs/models/gpt-image-2
    id: 'GPT_IMAGE',
    name: 'GPT Image 2 (OpenAI Images API)',
    description:
      'OpenAI’s current image model as the Images API serves it, replacing the retired DALL·E 3. It returns an image and nothing else, so it gets the specification without the self-audit or the component map. Pasting into ChatGPT is a different path with an entry of its own, and that entry is ChatGPT 5.6 Sol above.',
    // **Checked, and there is none.** Every endpoint the model page marks supported takes a request
    // rather than a person, and OpenAI publish no playground in front of them — the API reference is
    // documentation rather than a place to paste a prompt. ChatGPT Images is not this endpoint and
    // cannot stand in for it: OpenAI's release notes give that surface *images with thinking*, where
    // "When given more time to think, it can plan and refine image outputs before generating them"
    // — on a paid plan, with a Thinking or Pro model selected. That is the hand-off
    // `CHATGPT_5_6_SOL` exists to describe, and the opposite of what the flags below declare.
    // https://help.openai.com/en/articles/6825453-chatgpt-release-notes
    generatorSite: {
      kind: 'NONE',
      note: 'OpenAI run no page that generates through the Images API, and ChatGPT’s own image surface is the ChatGPT 5.6 Sol target rather than this one.',
    },
    capabilities: {
      deliberates: false,
      emitsText: false,
      // "The maximum length is 32000 characters for the GPT image models." Recorded in characters
      // because that is the unit OpenAI states it in, and taken from OpenAI's own published OpenAPI
      // description of the `prompt` field rather than from the rendered reference page, which draws
      // from it. The same reference's `model` enum lists `gpt-image-2` and `gpt-image-2-2026-04-21`
      // beside `gpt-image-1.5`, so the family the ceiling is stated for and the family the enum
      // offers are the same one — the two OpenAI surfaces agreed when this was last checked, which
      // they had not always done.
      // https://developers.openai.com/api/docs/api-reference/images/create
      promptBudget: {
        kind: 'CEILING',
        limit: 32_000,
        unit: 'characters',
        note: 'Images API prompt-length limit.',
      },
    },
  },
];
