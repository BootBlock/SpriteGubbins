import type { AspectRatio, TargetModelId } from '../types/output.ts';
import type { RenderStyleSurface } from '../types/rendering.ts';
import type { CategoryAssembly } from '../types/subject.ts';
import {
  wrapForFlux,
  wrapForMidjourney,
  wrapForQwen,
  wrapForSeedream,
  wrapForSol,
  wrapForStableDiffusion,
} from './modelWrapperText/index.ts';
import type { SectionNumbers } from './templateEngine.ts';

/**
 * Which wrapper each generator gets.
 *
 * Dispatch only — the text every branch returns lives in `modelWrapperText/`, one file per target
 * beside the vendor documentation that justifies it. Splitting them keeps this file readable as
 * what it is: the one place to see, at a glance, that every id in `TARGET_MODELS` is accounted for.
 *
 * **Three branches return the prompt unchanged, and that is a finding rather than a gap.** The Gemini
 * image models read the prompt as a specification and think over it, which the *template* adapts to
 * by giving them the self-audit and the component map, so there is nothing left for a wrapper to
 * say that the specification does not already say better. `GENERIC` is unchanged for the opposite reason —
 * naming no model, it can have no model-specific text — and that is what makes it usable with
 * anything this app does not know about.
 *
 * `GPT_IMAGE` is the third, and it is the one that had a wrapper and lost it. The prefix it carried
 * came from the retired DALL·E 3 entry and was justified by a prompt rewrite OpenAI document for the
 * Responses API's image tool — a surface this target is not. OpenAI describe no revision for the
 * GPT image models on the Images API; the one `revised_prompt` that reference documents belongs to
 * the retired `dall-e-3`. So there was no documented behaviour for terse absolute phrasing to
 * survive, and a directive with nothing behind it is the "repeated statement of the same rule"
 * section 0 already makes. See `constants/models.ts`.
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
     * Only Midjourney reads it, and only because `--no` negates a thing where section 0 negates a
     * *placement* — a limit no entry width gets round, which is what `wrapForMidjourney` says at
     * length. It is passed rather than derived here so this file stays dispatch and knows nothing
     * about categories.
     */
    readonly frameIsAComponent: boolean;
    /**
     * Whether this sheet's components are lettering, from `LETTERING_IS_A_COMPONENT`.
     *
     * Four wrappers read it, where `frameIsAComponent` above is read by one, and for that option's
     * reason: `text`, `labels` and `captions` are things to avoid on twelve categories and the
     * subject itself on the thirteenth, and no negative channel can express the difference. It is
     * passed rather than derived here so this file stays dispatch and knows nothing about categories.
     */
    readonly letteringIsAComponent: boolean;
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
     * Whether this sheet's components are limbs, from `LIMBS_ARE_COMPONENTS`.
     *
     * The two negative blocks weight `extra limbs, merged limbs` against a duplication failure only
     * a limbed subject can have, and a building, a terrain tileset or an interface kit cannot. The
     * record is where the judgement lives — including why it is not `PERMITTED_KINDS`, whose
     * `anatomy` row answers what a plan may *name* rather than what a generator will *draw*.
     */
    readonly limbsAreComponents: boolean;
    /**
     * What this sheet's assembled-whole failure is called, from `CATEGORY_ASSEMBLY`.
     *
     * The three targets with somewhere to say it read it — Flux as the clause closing its leading
     * sentence, Stable Diffusion and Qwen as the run opening their negative blocks. All three stated
     * it in a figure's vocabulary on every category until this was passed, so the highest-weighted
     * term on a terrain sheet named a subject that sheet cannot contain.
     */
    readonly assembly: CategoryAssembly;
    /**
     * Whether section 2 emitted its native-grid block, from `nativeGridScale`.
     *
     * Only Sol reads it, and only because Sol is the one target that composes a *second* prompt from
     * this one: a block it is not told to protect is paraphrased, and this is the block a paraphrase
     * was measured destroying. Every other target receives section 2 itself.
     */
    readonly nativeGrid: boolean;
    /**
     * Whether section 2 pinned a palette, from `paletteFor`.
     *
     * Read by Sol for the same reason and on the same evidence. Deliberately *whether* rather than
     * which kind: ten of the nineteen palettes state a channel ladder instead of a colour list, and
     * both forms hold figures the hand-off can shorten away.
     */
    readonly palette: boolean;
    /**
     * Every section name this prompt carries and the number its heading landed on, from
     * `sectionNumbers`.
     *
     * Sol and Seedream both cite sections in the text they add, and this runs after
     * `applySectionNumbers` has consumed the `[SEC:…]` markers — so a wrapper has no marker to write
     * and used to write the numeral instead. Passing the map is what makes those citations derive
     * from the same walk the prompt body's own citations do, rather than being a second hand-kept
     * statement of the same numbers.
     */
    readonly sectionNumbers: SectionNumbers;
  },
): string {
  switch (target) {
    case 'CHATGPT_5_6_SOL':
      return wrapForSol(prompt, options.nativeGrid, options.palette, options.sectionNumbers);

    case 'MIDJOURNEY':
      return wrapForMidjourney(
        prompt,
        options.aspectRatio,
        options.frameIsAComponent,
        options.letteringIsAComponent,
        options.surface,
      );

    case 'STABLE_DIFFUSION':
      return wrapForStableDiffusion(
        prompt,
        options.surface,
        options.limbsAreComponents,
        options.letteringIsAComponent,
        options.assembly,
      );

    // One wrapper for both Flux tiers. They differ only in how much of the prompt is read, which is
    // a budget fact rather than a wrapping one — and the restatement leads for both, since Black
    // Forest Labs' word-order guidance applies to the hosted tier just as it does to the weights.
    case 'FLUX':
    case 'FLUX_API':
      return wrapForFlux(
        prompt,
        options.backgroundKeyDescription,
        options.surface,
        options.letteringIsAComponent,
        options.assembly,
      );

    case 'QWEN_IMAGE':
      return wrapForQwen(
        prompt,
        options.surface,
        options.limbsAreComponents,
        options.letteringIsAComponent,
        options.assembly,
      );

    case 'SEEDREAM':
      return wrapForSeedream(prompt, options.sectionNumbers);

    case 'GPT_IMAGE':
    case 'GEMINI_FLASH_IMAGE':
    case 'GEMINI_PRO_IMAGE':
    case 'GENERIC':
      return prompt;
  }
}
