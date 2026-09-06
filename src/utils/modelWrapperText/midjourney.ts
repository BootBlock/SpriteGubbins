import { MIDJOURNEY_VERSION } from '../../constants/models.ts';
import type { AspectRatio } from '../../types/output.ts';
import type { RenderStyleSurface } from '../../types/rendering.ts';

/** Midjourney's aspect flag for each sheet format. */
const ASPECT_FLAGS: Readonly<Record<AspectRatio, string>> = {
  WIDE_16_9: '--ar 16:9',
  TALL_9_16: '--ar 9:16',
  ULTRAWIDE_21_9: '--ar 21:9',
  SQUARE_1_1: '--ar 1:1',
};

/**
 * Midjourney's command flags.
 *
 * `--sw` is *style-reference* weight and does nothing without a `--sref`; the knob that was meant is
 * `--s`, and it wants to be low, because high stylisation fights a technical layout brief.
 * `background` is absent from `--no` on purpose, and the ban is on the **word** rather than on a bare
 * entry: the sheet is built on a keyable background, so losing the key colour is the one failure
 * this list can cause that nothing downstream recovers from. Why it stays that wide after the flag's
 * reading was settled is argued where the gradient term is, below.
 *
 * **The two routine flags, cited.** `--ar` is the aspect parameter, and Midjourney's own page gives
 * the general form as `--ar #:#` and names 1:1, 16:9 and 9:16 among its examples, along with the
 * constraint that decides the table above: "--ar cannot contain decimals. Use 139:100 instead of
 * 1.39:1." The Version page's chart puts the maximum ratio at 14:1 on V8.1 and V8.2, or 4:1 for HD,
 * so the 21:9 this app can emit is inside it. `--s` is stylize, where "The default value for stylize
 * is 100, and you can adjust it anywhere between 0 and 1000 with the latest Midjourney versions" —
 * so the 50 emitted here is half the default and inside the range, which is the whole of what this
 * app needs that page to say. Both parameters are marked supported under V8.1 and V8.2 in the chart.
 * These two carried no citation at all while the two contentious flags below carried three between
 * them, which is the gap that reads as checked and was not.
 * https://docs.midjourney.com/hc/en-us/articles/31894244298125-Aspect-Ratio
 * https://docs.midjourney.com/hc/en-us/articles/32196176868109-Stylize
 *
 * **Raw mode is `--raw`, and the current pages document exactly that.** The Parameter List gives
 * "Raw Mode … --raw", the Raw page says "Add --raw to the end of your prompt in the Imagine bar" and
 * that "Raw is compatible with Midjourney versions 5.1 and later", and the Version chart marks Raw
 * supported under V8.1 and V8.2. The emitted flag is right, and it now rests on the pages that say
 * so rather than on a history.
 *
 * **The history that stood here was not on the page it cited, and it named the wrong versions.** It
 * read that Midjourney "renamed the flag with the V8 line", so `--style raw` was V7 syntax. The Raw
 * page says nothing about a rename and never spells that older form; swept over all 105 articles in
 * the help centre, the only page that spells it is Legacy Features, whose parameter-compatibility
 * table gives a **Style** row reading `raw` against **V5 and V6** — not V7. So the older form
 * belongs to the legacy versions, no page states when it stopped working, and the claim as written
 * was wrong about its source and about its version. What survives is the lesson rather than the
 * history: a pinned version does not make the syntax beside it self-checking, so when
 * `MIDJOURNEY_VERSION` moves, every flag on this line wants re-checking against the pages above.
 * https://docs.midjourney.com/hc/en-us/articles/32634113811853-Raw
 * https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List
 * https://docs.midjourney.com/hc/en-us/articles/33329788681101-Legacy-Features
 *
 * **`frame, border` comes out when the subject *is* one.** Section 0 bans a frame or border "around
 * the image or around a component", which is annotation; an entry in `--no` names a thing to avoid
 * and never a *placement* — a limit no width gets round, since "around a component" is a relation to
 * the rest of the sheet — so on an INTERFACE sheet the flag would suppress the panel edges the
 * inventory asks for. The caller answers from `FRAME_IS_A_COMPONENT`. This is the same judgement the doc
 * comment above already records for `background` — a term stays out of `--no` where excluding it
 * would take the sheet's own subject with it.
 *
 * **`text` and `labels` come out on the same test, and they are the sharpest case of it.** A glyph
 * set's components are characters, so those two entries name the subject of the sheet — the same
 * relation `frame, border` has to an interface kit, arrived at from the other direction. The caller
 * answers from `LETTERING_IS_A_COMPONENT`, which also records what stays: `watermark` and `signature`
 * are not in this list at all, and nothing about that exemption would reach them if they were.
 *
 * **`shadow` and `gradient` were the third instance of that judgement, and they resolve two
 * different ways.** Bare, each negates something a render style requires: "material shading and soft
 * form shadow" is `RENDERED_3D`'s own section 2 line, and a gradient across a form is what that
 * shadow is made of.
 *
 * What decides the two differently is how `--no` reads a multi-word entry, and **the only reading
 * Midjourney document as current for the pinned version is the word-level one.**
 *
 * That reading is the moderation system's, and the `--no` page states it outright with a multi-word
 * example — `--no modern clothing` "will read that as `no modern` and `no clothing`" — where the
 * consequence it documents is a false content warning rather than a changed image.
 *
 * **The read-whole reading rests on a mechanism the Version page marks unavailable here, which is a
 * stronger finding than the gap this comment used to record.** The chain was: the `--no` page says
 * "using the `--no` parameter is the same as weighing part of a multi-prompt to `-0.5`", and the
 * multi-prompt page gives both the substitution — `vibrant tulip fields --no red` is `vibrant tulip
 * fields:: red::-0.5` — and the divider, which is `::` and not the space, since "if you prompt
 * `space ship` Midjourney will consider those words together" where `space:: ship` asks it "to think
 * about `space` and `ship` as distinct elements". An entry carrying no `::` would then be one
 * segment at one weight.
 *
 * The Version page's feature-compatibility chart answers that directly. Its **Multi-Prompting** row
 * carries the check icon under V6 and the no-symbol icon under **V7** and under **V8.1 & V8.2** —
 * the column holding the `--v 8.2` this wrapper pins — while its **No Parameter** row carries the
 * check under all three. So on the pinned version `--no` exists and multi-prompting does not, and
 * the substitution the read-whole inference runs through describes a mechanism this version is
 * documented not to have. This comment previously recorded the weaker version of that — that `::` as
 * the divider was merely "not restated anywhere current" — which was written from the `--no` and
 * multi-prompt pages without the one page that says what the pinned version supports.
 *
 * **Midjourney's own current pages disagree with each other here, and this app cannot resolve it.**
 * The `--no` page is current for V8.2, carries the `-0.5` equivalence in its own More Information
 * section, and links the multi-prompt page for it; the multi-prompt page scopes itself to "versions
 * 1, 2, 3, 4, Niji 4, 5, Niji 5, 6, Niji 6, and 6.1"; and the chart marks the feature unavailable
 * under V8.1 and V8.2. Nothing current states how V8.2's renderer reads a multi-word entry. What is
 * recorded here is therefore the contradiction, not a resolution of it.
 *
 * **So the word-level rule is the standing one for this list, rather than a hedge on one entry.**
 * Every word of a multi-word entry has to be one this app is content to have read alone, and each of
 * the four is kept or dropped on what being wrong would cost:
 *
 * `cast shadow` stays. Decomposed it is the bare `shadow` it replaced, so under this reading the
 * qualification buys nothing — but it costs nothing either, and read whole it does what it claims:
 * negates the placement section 0 forbids without touching the form shadow beside it. Section 0
 * states that ban in the prompt body as well, which Midjourney reads in full.
 *
 * `blurred edges` and `anti-aliased edges` decompose to a bare `edges` at -0.5, on exactly the
 * styles whose section 2 line asserts a hard one, and `smooth gradients` to a bare `smooth`. Those
 * are real and they are all the **same kind** of wrong: a sheet that argues with its own style
 * statement and comes back softer than it was asked for. That is a degraded sheet, and a degraded
 * sheet can be generated again.
 *
 * `gradient background` is the one that stays out, and it is the only unrecoverable member.
 * Decomposed it puts -0.5 on the colour the whole sheet is registered against, and an unkeyable
 * sheet is not a worse result but a useless one — the compositing step it exists for cannot be run
 * at all.
 *
 * **So recoverability is the whole of the rule, and the evidence has stopped pulling against it.**
 * When this was settled the word-level ban was precautionary — a hedge against a reading thought
 * unlikely — and it is now the reading the vendor's current pages support, with the read-whole one
 * resting on a feature they mark absent. The decision is unchanged and the emitted list is
 * unchanged; what changed is that the argument no longer needs the hedge. The flag remains
 * unverifiable without a subscription, so this is still a risk the repository cannot retire by
 * testing. What would reopen it is a page current for V8.2 stating how a multi-word entry is drawn,
 * or the keying failure ceasing to be unrecoverable. That decision is recorded in
 * `docs/todo/baseline-prompt-new.md` §7.
 *
 * What it costs is small, and worth naming rather than leaving to be rediscovered. The gradient
 * claim is the sheet's own, spliced in from `RENDER_STYLE_SURFACE`: `smooth gradients`
 * where the style states flat fills, and nothing at all where it asks for soft blended forms. That
 * is the whole of what this channel says about a gradient, and Stable Diffusion's and Qwen's blocks
 * carry the same surface terms **plus** a `gradient background` of their own on every style — so
 * this list says less than theirs in every configuration, and on the three soft styles it says
 * nothing. Section 0's uniform key field is stated in the prompt body, which Midjourney reads in
 * full; the `--no` list was never what carried it.
 *
 * https://docs.midjourney.com/hc/en-us/articles/32173351982093-No
 * https://docs.midjourney.com/hc/en-us/articles/32658968492557-Multi-Prompts-Weights
 * https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version
 */
export function wrapForMidjourney(
  prompt: string,
  aspectRatio: AspectRatio,
  frameIsAComponent: boolean,
  letteringIsAComponent: boolean,
  surface: RenderStyleSurface,
): string {
  const negatives = [
    ...(letteringIsAComponent ? [] : ['text', 'labels']),
    'cast shadow',
    ...surface.negatives,
    ...(frameIsAComponent ? [] : ['frame', 'border']),
  ];
  return `${prompt}\n\n${ASPECT_FLAGS[aspectRatio]} ${MIDJOURNEY_VERSION} --raw --s 50 --no ${negatives.join(', ')}`;
}
