import type { ComponentOrientation } from '../types/components.ts';
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
     * What this category's assembled-whole failure is called, from `CATEGORY_ASSEMBLY`.
     *
     * The four targets with somewhere to say it read it — Flux as the clause closing its leading
     * sentence, Stable Diffusion and Qwen as the run opening their negative blocks, and Midjourney as
     * the first entries of `--no`, which carried none of it until audit finding T2. The first three
     * stated it in a figure's vocabulary on every category until this was passed, so the
     * highest-weighted term on a terrain sheet named a subject that sheet cannot contain.
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
     * Whether section 2 pinned a palette, from `pinnedPalette`.
     *
     * Read by Sol for the same reason and on the same evidence. Deliberately *whether* rather than
     * which kind: ten of the nineteen palettes state a channel ladder instead of a colour list, and
     * both forms hold figures the hand-off can shorten away.
     */
    readonly palette: boolean;
    /**
     * Whether section 5 emitted its piece-geometry block, from the sheet's rig contract.
     *
     * Read by Sol because, under a contract, the native-grid block states no size of its own and
     * points here for every one of them — so protecting that block alone forwards a multiple of a
     * grid the hand-off was free to paraphrase away.
     */
    readonly rigGeometry: boolean;
    /**
     * Whether section 3 emitted its one-sided-feature ledger, from `ONE_SIDED_FEATURES`.
     *
     * Read by Sol because the ledger is the per-feature statement of which flank each piece of gear
     * sits on, and a block Sol is not told to protect is prose it is told to cut.
     */
    readonly oneSidedFeatures: boolean;
    /**
     * How the sheet's components are oriented beneath its camera, from the resolved plan's
     * `orientation` — the answer `ORIENTATION` gave the template's own gates.
     *
     * Read by Sol, whose hand-off list names what section 3 carries: the object yaws on a sheet turned
     * to them, the shared camera on an icon sheet, and the flat-piece rule on the overlay sheet.
     */
    readonly orientation: ComponentOrientation;
    /**
     * Whether each component is a square carrying its own backdrop, from the plan's `backdrop` — the
     * answer `OWN_BACKDROP` gave the template's own gate.
     *
     * Read by the two negative blocks, Stable Diffusion's and Qwen's, because each carries `gradient
     * background` against a field that drifts — and on a sheet of full-bleed squares a model reads that
     * term over the field behind every subject, which is the backdrop the sheet asks for (R13 of
     * `docs/todo/done/icon-catalogue.md`). Neither channel can say "between the components only", so the term
     * comes out there; section 0 still states the uniform gutters. `scene background` stays, because a
     * backdrop is never a scene. Midjourney's `--no` carries only the style's surface terms
     * (`smooth gradients` among them on the flat and pixel styles, which `backdropDescription` forbids
     * the backdrop too), never `gradient background`, and Flux's leading sentence names no gradient.
     *
     * **Read by Midjourney and Flux as well, for the shadow.** Section 7 of that sheet asks for the
     * contact shadow a subject casts on the backdrop inside its square, so no wrapper negates a shadow
     * cast there: Qwen's `cast shadow` and `contact shadow`, Stable Diffusion's `floor shadow`,
     * Midjourney's `cast shadow` and Flux's "no cast shadow" come out (audit finding P12). A shadow
     * outside the square stays negated wherever a channel can name it without the bare word — `drop
     * shadow` in the two negative blocks, "no drop shadow" in Flux's sentence — and each wrapper's own
     * docblock says why.
     */
    readonly ownBackdrop: boolean;
    /** Whether section 1 states a colour line, from the subject's colour fields. Read by Sol. */
    readonly colours: boolean;
    /** Whether section 2 states a target size, from the `SPRITE_TARGET_SIZE` value. Read by Sol. */
    readonly targetSize: boolean;
    /** Whether section 2 states the smallest display size, from `DISPLAY_REDUCTION`. Read by Sol. */
    readonly displaySize: boolean;
    /** Whether the sheet's key is `TRANSPARENT`, from the resolved key. Read by Sol. */
    readonly transparent: boolean;
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
      return wrapForSol(
        prompt,
        {
          nativeGrid: options.nativeGrid,
          palette: options.palette,
          rigGeometry: options.rigGeometry,
          oneSidedFeatures: options.oneSidedFeatures,
          orientation: options.orientation,
          colours: options.colours,
          targetSize: options.targetSize,
          displaySize: options.displaySize,
          transparent: options.transparent,
        },
        options.sectionNumbers,
      );

    case 'MIDJOURNEY':
      return wrapForMidjourney(
        prompt,
        options.aspectRatio,
        options.frameIsAComponent,
        options.letteringIsAComponent,
        options.surface,
        options.ownBackdrop,
        options.assembly,
      );

    case 'STABLE_DIFFUSION':
      return wrapForStableDiffusion(
        prompt,
        options.surface,
        options.limbsAreComponents,
        options.letteringIsAComponent,
        options.assembly,
        options.ownBackdrop,
      );

    // One wrapper for both Flux tiers. They differ only in how much of the prompt is read, which is
    // a budget fact rather than a wrapping one — and the restatement leads for both, though the two
    // tiers reach that from opposite directions. The word-order guidance this leans on is in Black
    // Forest Labs' guide titled for [pro] and [max], so leading is what they document for the hosted
    // tier; on the weights it is the 512-token ceiling that decides it, since a restatement placed
    // last is truncated away. Neither argument is borrowed from the other — see
    // `modelWrapperText/flux.ts`, which states both, and which also records that their second,
    // family-scoped guide reaches the open weights where this one does not.
    case 'FLUX':
    case 'FLUX_API':
      return wrapForFlux(
        prompt,
        options.backgroundKeyDescription,
        options.surface,
        options.letteringIsAComponent,
        options.assembly,
        options.ownBackdrop,
      );

    case 'QWEN_IMAGE':
      return wrapForQwen(
        prompt,
        options.surface,
        options.limbsAreComponents,
        options.letteringIsAComponent,
        options.assembly,
        options.ownBackdrop,
      );

    case 'SEEDREAM':
      return wrapForSeedream(prompt, options.sectionNumbers, options.orientation);

    case 'GPT_IMAGE':
    case 'GEMINI_FLASH_IMAGE':
    case 'GEMINI_PRO_IMAGE':
    case 'GENERIC':
      return prompt;
  }
}
