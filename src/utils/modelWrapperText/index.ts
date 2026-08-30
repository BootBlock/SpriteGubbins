/**
 * The text each generator's wrapper actually adds, one file per target.
 *
 * Split from `modelWrappers.ts` for the reason `promptTemplate.ts` is split from
 * `promptCompiler.ts`: that file decides *which* wrapper a target gets, and this directory holds
 * *what it says*. Every line here is prose a generator will act on, so it wants to be diffable and
 * arguable on its own rather than buried inside a switch.
 *
 * **A directory rather than a file, because the justification is the bulk of it.** More of what is
 * written here is the vendor citation earning a clause than is the clause itself, and that prose
 * grows every time a target is re-checked against a vendor page that has moved — so one file per
 * target is what keeps a re-check's diff to the target it re-checked, exactly as
 * `constants/categories/` and `constants/sheetPlans/` keep a category's to its own.
 *
 * **Each wrapper is traceable to something its vendor documents**, which is the bar — not symmetry.
 * A wrapper exists only where a vendor documents something the template cannot say: a flag syntax, a
 * negative-prompt channel, a rewrite to survive. The Gemini image models have no file here because
 * they need none — they read the prompt as a specification and think over it, which the *template*
 * adapts to by giving them the self-audit and the component map. Adding a sentence for symmetry
 * would be inventing a behaviour.
 *
 * **`GPT_IMAGE` had a file here and lost it**, which is that bar applied in the other direction.
 * It carried DALL·E 3's directive prefix, and the prefix was justified by a prompt rewrite OpenAI
 * document for the Responses API's image tool and for nothing else. That target is the Images API,
 * whose own guide documents no revision — the one `revised_prompt` its reference describes is
 * `dall-e-3`'s, and `dall-e-3` is the model this target replaced. So the line traced to a behaviour
 * of a surface the prompt is never sent to — see `constants/models.ts` for what the two surfaces
 * are and which entry holds which.
 */

export { wrapForFlux } from './flux.ts';
export { wrapForMidjourney } from './midjourney.ts';
export { wrapForQwen } from './qwen.ts';
export { wrapForSeedream } from './seedream.ts';
export { wrapForSol } from './sol.ts';
export { wrapForStableDiffusion } from './stableDiffusion.ts';
