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
 * does not protect: this wrapper emitted `--style raw` while pinning a V8 version, and the flag whose
 * whole job is to stop Midjourney restyling a technical layout brief could not be relied on to apply.
 * It emits `--raw` now, which is what the Parameter List and the Raw page both give, and which the
 * Version page's chart marks supported under V8.1 and V8.2.
 *
 * **The version history that stood here was not on any Midjourney page, and it named the wrong
 * versions.** It read that raw mode "is `--raw` on the V8 line and `--style raw` on V7". No page
 * states a rename, and swept over all 105 help-centre articles the only one spelling the older form
 * is Legacy Features, whose parameter-compatibility table gives a Style row reading `raw` against V5
 * and V6 rather than V7. `utils/modelWrapperText/midjourney.ts` records that at length beside the
 * flags themselves. What holds is the lesson rather than the history: moving this constant means
 * re-checking that branch's flags against the vendor's current pages, not assuming they moved with it.
 * https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version
 * https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List
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
 * carries its source** — and a claim whose nearest page does not actually state it is worse than
 * one with no citation at all, because the link makes it look checked. Two entries were removed
 * once checked rather than left to rot, and both retirements are on a vendor deprecation table:
 * Google Imagen (`imagen-3.0-generate-002` shut down 10 November 2025; the three
 * `imagen-4.0-*-001` endpoints shut down 17 August 2026, replacement `gemini-3.1-flash-image`)
 * and DALL·E 3 (`dall-e-2` and `dall-e-3` removed from the API on 12 May 2026, replacements
 * `gpt-image-2` / `gpt-image-1` / `gpt-image-1-mini`). Both had been dead or dying while the app
 * went on offering them. https://ai.google.dev/gemini-api/docs/deprecations and
 * https://developers.openai.com/api/docs/deprecations
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
    // tool — and OpenAI name what is on the far side across two guides, one sentence each. The tool
    // guide says the renderer is "always a GPT Image model":
    // https://developers.openai.com/api/docs/guides/tools-image-generation
    // The image generation guide is where "the tool handles GPT Image model selection" is written,
    // and this entry quoted it against the URL above until the two were checked separately:
    // https://developers.openai.com/api/docs/guides/image-generation
    //
    // In ChatGPT that renderer is `gpt-image-2`, sold as **ChatGPT Images 2.0**. OpenAI's release
    // notes introduce it on 21 April 2026 as "our new image generation model in ChatGPT", and the
    // model ships the same day as `gpt-image-2-2026-04-21`:
    // https://help.openai.com/en/articles/6825453-chatgpt-release-notes
    //
    // **The sentence naming the model is on a third page, and it is scoped away from the surface
    // this app's readers use.** "Built-in image generation uses `gpt-image-2`" was quoted here
    // against the release notes, which do not carry it. It is on OpenAI's ChatGPT documentation —
    // inside a surface switch covering the app, the CLI and the IDE. The same page's ChatGPT **web**
    // block names no model at all, and web is where a reader pastes. So it is evidence for the
    // Codex surfaces and not for this one, which is the same over-reach recorded for the Flux
    // prompting guide below. https://learn.chatgpt.com/docs/image-generation
    //
    // What is left for ChatGPT web is the release notes plus the date-matched model id, which is an
    // inference and was already recorded as one. The step marked inference was equating
    // `gpt-image-2` with the name "ChatGPT Images 2.0"; the scope of the quote above is a second
    // step and is now marked too.
    //
    // Both capability flags below are still about Sol and still true: it reasons over the brief, and
    // it answers in text. What they do not say is that the *picture* comes from a second model on
    // the far side of a tool call, which is what its wrapper in `utils/modelWrapperText/sol.ts`
    // says.
    //
    // **The description's images-with-thinking sentence is the release notes' own claim.** They say:
    // "Images with thinking is available on all paid ChatGPT plans. It is available when you select
    // Thinking and Pro models."
    // https://help.openai.com/en/articles/6825453-chatgpt-release-notes
    //
    // For a while this description read that choosing Sol "puts you on a thinking tier", and **that
    // was true when it was written and is not true now** — which is the more useful failure of the
    // two, because nothing about it decayed visibly. It rested on OpenAI's GPT-5.6 help page, which
    // then said Sol powered the Medium, High and Extra High reasoning options while Instant was
    // GPT-5.5 Instant. That page now says "GPT-5.6 Sol powers Instant, Medium, High, and Extra High
    // on eligible paid plans", and describes Instant as "Fast responses for everyday questions".
    // Sol reaches the picker's *non*-thinking option, so picking Sol settles nothing about the tier.
    // The API side agrees: `reasoning.effort` on `gpt-5.6-sol` accepts `none`.
    // https://help.openai.com/en/articles/20001354-gpt-56-in-chatgpt and
    // https://developers.openai.com/api/docs/models/gpt-5.6-sol
    //
    // **The replacement then named a control OpenAI's current page does not have, and its own
    // rationale is what falsified it.** The sentence pointed the reader at the picker "when you pick
    // one of their Thinking or Pro models", quoting the release note faithfully — nine lines under a
    // paragraph quoting the newer page's option list, which does not contain a Thinking. That page
    // describes "a new reasoning slider" whose options are Instant, Medium, High, Extra High and
    // Pro. The one Think-named option on it belongs to the plans that have no Sol at all: "Free and
    // Go users can use Think for harder questions. Think uses GPT-5.6 Luna, not GPT-5.6 Sol", and
    // "Free and Go users do not have access to GPT-5.6 Sol". So a reader following the old sentence
    // found either no such option or Think, which takes them off the target they picked.
    //
    // **What no OpenAI page states is which setting on the current picker satisfies that condition,
    // and the description says so rather than choosing one.** The release note names *models* —
    // "Thinking and Pro" — and is the only page that mentions images with thinking at all. The
    // GPT-5.6 page describes the slider and never mentions the feature. So the two do not describe
    // one control differently; they describe two different things, and nothing joins them up.
    //
    // A first attempt at this replacement read that "both pages agree" the feature wants more
    // reasoning effort than the fastest setting, and put that to the reader as OpenAI's own
    // condition. Neither page says it: mapping "Thinking and Pro models" onto "any rung above
    // Instant" is this app's reading, and stating a reading as a vendor's is the defect this whole
    // entry is a record of. It would also have been actionable and possibly wrong — a reader moving
    // the slider from Instant to Medium has no published assurance the feature switches on.
    //
    // So the description quotes the condition in OpenAI's own words, says the names predate the
    // current picker, and marks the raise-the-level advice as this app's reading rather than
    // theirs. That is the honest shape while the gap is OpenAI's to close.
    id: 'CHATGPT_5_6_SOL',
    name: 'ChatGPT 5.6 Sol (OpenAI)',
    description:
      'Sol returns text, never an image: it calls an image tool, and a GPT Image model renders whatever that call carries — which is where adherence is lost. Its wrapper names the three parts the call must carry unshortened. OpenAI put images with thinking on every paid ChatGPT plan, and word the condition as selecting a Thinking or Pro model — names their current reasoning picker no longer uses, with no published mapping from one to the other. Raising the reasoning level is this app’s reading of that, not OpenAI’s. It reasons over the brief, so it gets the self-audit and can return a companion component map.',
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
    // Google name this the migration target for the retired Imagen models: their deprecation table
    // gives `gemini-3.1-flash-image` as the replacement against all three `imagen-4.0-*-001`
    // endpoints. https://ai.google.dev/gemini-api/docs/deprecations
    //
    // It is a *thinking* model — "Gemini 3 image models are thinking models that use a reasoning
    // process ('Thinking') for complex prompts", and it "cannot be disabled in the API" — and it
    // returns interleaved text and images, so unlike Imagen it can both work through the
    // specification and hand back a component map.
    // https://ai.google.dev/gemini-api/docs/image-generation
    //
    // **That page does name Gemini as the replacement, and this comment used to say it did not.** It
    // read that "what it does not do is name Gemini as Imagen's replacement — its one mention of
    // Imagen is a line under 'Other image generation modes'". The page carries a section headed
    // *When to use Imagen* whose opening notice reads "Imagen models are deprecated and will be shut
    // down on August 17, 2026. We recommend using Nano Banana models for all image generation
    // tasks." Nano Banana is this entry — Google's model list gives "Nano Banana 2 …
    // `gemini-3.1-flash-image`". The count was wrong too: a case-insensitive search of the fetched
    // page finds Imagen at four distinct places, not one.
    //
    // **The claim the paragraph existed to justify is unaffected**, which is why this is a rewrite
    // and not a retraction. The deprecation table is still the right citation for the *per-model*
    // replacement, because that is what it states: all three `imagen-4.0-*-001` rows give
    // `gemini-3.1-flash-image` as the recommended replacement with a shutdown date of 17 August
    // 2026. What was wrong is only the sentence saying the image-generation guide could not have
    // supported it. https://ai.google.dev/gemini-api/docs/models
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
    // Deliberately **5.0**, not the 4.5 this app was first going to carry: adding 4.5 would have
    // repeated the Flux mistake below in the same change that fixed it. BytePlus date the Lite
    // release themselves — "On February 24, Seedream 5.0 Lite, the latest generation of BytePlus'
    // image creation model, became available via API on ModelArk" — so that half is quoted rather
    // than inferred. https://www.byteplus.com/en/blog/seedream5-0-lite
    //
    // **Pro's date is an inference and is recorded as one.** No BytePlus page announces a release
    // day for it; what their Seedream 5.0 Pro page carries is the model id
    // `dola-seedream-5-0-pro-260628` — a 2026-06-28 date code — and the line "From July 8,
    // Seedream 5.0 Pro images work seamlessly across Seedance 2.5, 2.0, Fast, and Mini". Late June
    // to early July 2026 is what those two support; a stated launch date is not.
    // https://ai.byteplus.com/en/activity/seedream5-0
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
    // Alibaba's Qwen-Image 3.0, and the tightest published ceiling this app has anything to say to:
    // 4.5K tokens, against a library running ~3,300 to ~6,800 estimated tokens compiled for it.
    //
    // **The date is the one Alibaba's own lifecycle table gives, and it is per model id.** That
    // table dates `qwen-image-3.0-pro` — the id whose page carries the ceiling below — to
    // **2026-07-20**, and the plain `qwen-image-3.0` to 2026-08-04. This comment said "released 21
    // July 2026" with nothing behind it, which is a third figure; launch write-ups say 22 July. Take
    // the vendor's table over a write-up, and name the id, because the two ids did not ship on the
    // same day. https://help.aliyun.com/en/model-studio/newly-released-models
    //
    // **The description below said the whole specification fits inside it, and it does not.** The
    // studio's opening configuration compiles to ~6,550 here — half as long again as the budget — so
    // the first thing that entry did for a reader who took it at its word was to contradict itself: the
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
      'Built for dense structured layouts and long briefs, at a documented 4.5K tokens. That holds a sparse sheet — one facing, few components — and not the five-view directional sheet the studio opens on, which runs about half as long again. The budget notice under the prompt says where yours lands. It ends with a plain block labelled negative_prompt, which is Alibaba’s own name for a separate request field rather than part of the brief — put it in that field, or leave it out.',
    // Qwen Chat, which is Alibaba's own consumer surface for the model and the one a reader reaches
    // without an Alibaba Cloud account.
    //
    // **It is not the only place, and this comment used to say it was.** It read that the 3.0
    // release "carried no weights and no API pricing, so this is the only place a reader can use it
    // at all". The weights half holds — 3.0 shipped cloud-only. The API half does not: Alibaba
    // publish a 3.0-series API reference documenting `qwen-image-3.0-pro` and `qwen-image-3.0` as
    // callable models on Model Studio, with `text`, `negative_prompt`, `size` and `seed`. That
    // reference is what the wrapper's negative block is written for, and
    // `utils/modelWrapperText/qwen.ts` says so. The chat surface stays the `generatorSite` because
    // this field is where a *person* pastes a prompt, and an API reference is documentation rather
    // than a place to paste one — the same reading `GPT_IMAGE` below applies to OpenAI's.
    // https://help.aliyun.com/en/model-studio/qwen-image-generation-and-editing-api-reference
    generatorSite: { kind: 'PUBLIC', url: 'https://chat.qwen.ai/' },
    capabilities: {
      deliberates: false,
      emitsText: false,
      // "Supports input of up to 4.5k tokens", on Alibaba's model page for `qwen-image-3.0-pro`. The
      // figure was first taken from launch coverage and cited to an API reference that did not carry
      // it; this is the page that does.
      // https://help.aliyun.com/en/model-studio/qwen-image-3-0-pro
      //
      // **The 3.0-series API reference carries it too, and the sentence saying otherwise was wrong.**
      // This comment read that the figure was "*not* on the API reference, which states no length for
      // either `text` or `negative_prompt`". Half of that is right and the half that matters is not:
      // the 3.0 reference gives `text` as "Recommended maximum: 4,500 tokens", and states no length
      // for `negative_prompt` at all. So two vendor pages agree on the figure, and they differ in
      // force — the model page's "supports input of up to" reads as a limit, the reference's
      // "recommended maximum" as advice — while neither documents what happens past it. `CEILING` is
      // the stricter of the two readings, which is the one to record while nothing says a longer
      // prompt merely degrades.
      // https://help.aliyun.com/en/model-studio/qwen-image-generation-and-editing-api-reference
      //
      // **The 800-token sentence on the `qwen-image-api` reference does not reach this entry**, which
      // is the contradiction it looks like and is not. That page states "The `qwen-image-2.0` series
      // accept up to 1,300 tokens. Other models accept up to 800 tokens" — and its own model overview
      // sends the 3.0 series away: "For 3.0 series API calls, see Qwen Image Generation and Editing
      // 3.0". So it documents the 2.0 and legacy series, and its figures are not this model's.
      //
      // No multiplier is claimed against 2.0 here, because Alibaba's own figure for the 2.0 series is
      // 1,300 tokens, which makes the widely-repeated "4.5× longer" wrong.
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
      // **Both halves of the note below are the front end's, because there is no vendor page to
      // cite.** Stability publish weights rather than a prompt syntax, which is the whole finding
      // recorded at length in `utils/modelWrapperText/stableDiffusion.ts`. The target is the weights,
      // as the entry above says; what has no vendor behind it is the *prompt* this app writes for
      // them, which is addressed to a front end. The Automatic1111 wiki states the figure and the way
      // past it in one paragraph:
      // "Typing past standard 75 tokens that Stable Diffusion usually accepts increases prompt size
      // limit from 75 to 150 … by breaking the prompt into chunks of 75 tokens, processing each
      // independently using CLIP's Transformers", each chunk "padded to 75 tokens and extended with
      // start/end tokens to 77". So the 77 is 75 of prompt between two markers, and a chunked read
      // is what "front-ends that chunk the prompt" names. This entry carried no URL at all.
      // https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features
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
    // The announcement post puts the whole model in early access and sets out a launch plan whose
    // capabilities each arrive "after an early access phase": video and audio first, then action
    // prediction, then FLUX 3 Image, and last an open-weight backbone it names FLUX 3 Dev. Of those,
    // only the first has shipped — the release notes date FLUX 3 Video to 4 August 2026 on
    // `POST /v1/flux-3-video`, and describe it as "available now as a preview". Nothing announces
    // FLUX 3 Image or FLUX 3 Dev, so neither has a date to record and this entry stays on FLUX.2.
    // Recorded here because the whole lesson of this entry is that a third-party version is a claim
    // with an expiry date — this one's is visible in advance, so re-check it rather than waiting to
    // be surprised again. https://bfl.ai/blog/flux-3 and https://docs.bfl.ai/release-notes
    //
    // **A previous wording said FLUX 3 Video was "generally available" and FLUX 3 Image "in limited
    // early access", and the pages say neither.** It was written uncited and a citation was added
    // to it later without re-reading the paragraph against the page, which is the very failure the
    // header above names: a link makes a claim look checked whether or not it was.
    //
    // **This entry described FLUX.1 for eight months after FLUX.2 replaced it** (25 November 2025,
    // https://bfl.ai/blog/flux-2).
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
    // **Black Forest Labs address negative prompts in two places, and this paragraph used to say
    // there was one.** It read that what they say "is written for the hosted tier, and this entry is
    // not it", that their guide "addresses no open weight in any of its advice", and that the one
    // place [dev] appears is a Quick Reference multi-reference count. The tier-titled guide is still
    // as described — "Prompting Guide - FLUX.2 [pro] & [max]", no token limit, `[dev]: ~6` in the
    // Quick Reference. https://docs.bfl.ai/guides/prompting_guide_flux2
    //
    // The second guide is the one this entry said did not exist. The FLUX Prompting Guide states it
    // "covers prompting for the entire FLUX model family — FLUX.1, FLUX.1 Kontext and FLUX.2"; its
    // Technical Parameters page carries a section headed *Working Without Negative Prompts* opening
    // "Most FLUX models do not support negative prompts"; and the same page addresses an open weight
    // by name — "On FLUX.2 [klein], what you write is what you get — be descriptive."
    // https://docs.bfl.ai/guides/prompting_summary and
    // https://docs.bfl.ai/guides/prompting_unified_technical
    //
    // **The conclusion holds and the argument changes.** "Most FLUX models" is a hedge rather than a
    // statement about a named model, so it does not settle [dev] and [klein] — which is why the
    // reference implementation is still what does, and why this entry still argues from the code
    // rather than borrowing a sentence. The CLI exposes no negative field, and classifier-free
    // guidance runs its unconditional branch on the empty string, which `denoise_cfg` documents as
    // the concatenation of an empty prompt with the real one. The FLUX.2 [dev] model card was not
    // re-checked this pass: Hugging Face answers 401 for that repository's README without an
    // accepted licence, so the sentence claiming it says nothing about prompting is left out rather
    // than restated.
    id: 'FLUX',
    name: 'Flux (open weights — FLUX.2 dev / klein)',
    description:
      'Separate from Stable Diffusion because Black Forest Labs’ own FLUX.2 inference code offers no negative prompt at all — the SD block would be silently discarded — so the same constraints are restated positively, and stated first because only the first 512 tokens are read. A sheet specification is several times that long, so the library ships no preset aimed at these weights.',
    // **Black Forest Labs do serve [klein], and the note here used to deny it.** It read that both
    // variants "are open weights you run yourself, so there is no vendor page that generates with
    // them", and the comment above it that "Black Forest Labs' playground generates with the hosted
    // tier". Their Playground help article lists the models it generates with as "FLUX.2 [max],
    // [pro], [flex], [klein], FLUX.1 Kontext [pro]/[max], or FLUX 3 for video", and calls [klein]
    // "the fastest FLUX model, great for rapid iteration"; their quick start documents three [klein]
    // endpoints — `/flux-2-klein-4b`, `/flux-2-klein-9b-preview` and `/flux-2-klein-9b`. The
    // `FLUX_API` entry below already said as much, in the sentence noting they "also serve [klein]
    // from their own API".
    // https://help.bfl.ai/articles/8667153955-what-is-the-bfl-playground and
    // https://docs.bfl.ai/quick_start/generating_images
    //
    // **It stays `NONE` anyway, and the reason is the ceiling rather than the count.** What the
    // Playground serves is a *hosted* [klein], which is the surface `FLUX_API` describes and which
    // reads 32K tokens; this entry is the weights on your own machine, whose `MAX_LENGTH` stops at
    // 512. Pointing this target's button at that page would hand a reader a prompt budgeted for 512
    // tokens and a surface that reads sixty times that — which is the exact defect that made these
    // two separate entries. So the note now says what is true of each variant instead of denying
    // the page exists. [dev] is the half that was never wrong: `/flux-dev` in that endpoint list is
    // FLUX.1 [dev], and the Playground article names no FLUX.2 [dev] among its selectable models.
    generatorSite: {
      kind: 'NONE',
      note: 'These are the FLUX.2 weights on your own machine, which read 512 tokens. Black Forest Labs do serve a hosted [klein] from their Playground, but that reads the whole prompt and is the Flux (BFL API) target below.',
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
    // **A second page now carries the figure, and it is the better citation of the two.** The
    // paragraph above sends a re-checking reader to a marketing page when Black Forest Labs' own
    // documentation states it: the FLUX Prompting Guide's *Building a prompt* page, under a heading
    // *Prompt length*, reads "FLUX.2 supports prompts up to 32K tokens." That does not change the
    // inference — the documentation states it just as unscoped as the marketing page does, naming no
    // variant — so the paragraph above still holds. It changes which page a re-check starts from.
    // https://docs.bfl.ai/guides/prompting_unified_building
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
    // — on a paid plan, and conditional on more reasoning effort than the picker's quickest setting.
    // That is the hand-off `CHATGPT_5_6_SOL` exists to describe, and the opposite of what the flags
    // below declare. The condition is worded as a condition rather than as the release note's
    // "Thinking and Pro models", for the reason that entry records at length: OpenAI's current page
    // for the picker describes a reasoning slider with no Thinking on it, and its one Think-named
    // option runs a different model on plans that have no Sol.
    // https://help.openai.com/en/articles/6825453-chatgpt-release-notes and
    // https://help.openai.com/en/articles/20001354-gpt-56-in-chatgpt
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
      //
      // **Cited to the OpenAPI file, which is where the comment already said the figure came from.**
      // The URL here was `api/docs/api-reference/images/create`, which redirects to the resource
      // landing page — and that page carries neither the sentence nor the figure. So the citation
      // named the surface the comment explicitly disclaims, and pointed at a page one level above
      // the one that would have carried it: the method page under `images/methods/generate` is where
      // the rendered reference states it. The file is public, so cite the file.
      // https://github.com/openai/openai-openapi/blob/master/openapi.yaml
      // https://developers.openai.com/api/reference/resources/images/methods/generate
      promptBudget: {
        kind: 'CEILING',
        limit: 32_000,
        unit: 'characters',
        note: 'Images API prompt-length limit.',
      },
    },
  },
];
