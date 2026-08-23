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
 * **Raw mode is `--raw`, not `--style raw`.** Midjourney renamed the flag with the V8 line while
 * this wrapper pins `--v 8.2`, so the two were contradicting each other. Whether V8 rejects the old
 * form or quietly ignores it is not documented and does not need to be — either way the flag whose
 * whole job is to stop Midjourney restyling a technical layout brief could not be relied on to
 * apply. The version pin is what makes this checkable: when `MIDJOURNEY_VERSION` moves, the flag
 * syntax for the version it moves to is part of what wants re-checking.
 * https://docs.midjourney.com/hc/en-us/articles/32634113811853-Raw
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
 * What decides the two differently is how `--no` reads a multi-word entry, and **Midjourney answers
 * for two different systems — one of them outright, the other from two statements of its own.**
 *
 * The outright half is the moderation system, which reads the words *independently*: the `--no` page
 * says so in as many words, with a multi-word example — `--no modern clothing` "will read that as
 * `no modern` and `no clothing`" — and the consequence it documents is a false content warning
 * rather than a changed image.
 *
 * What gets *drawn* takes the phrase whole, and that is an inference across two pages rather than a
 * sentence to quote. The `--no` page states that "using the `--no` parameter is the same as weighing
 * part of a multi-prompt to `-0.5`", and the multi-prompt page gives the substitution — `vibrant
 * tulip fields --no red` is `vibrant tulip fields:: red::-0.5` — along with what divides one concept
 * from the next, which is `::` and not the space: "if you prompt `space ship` Midjourney will
 * consider those words together", where `space:: ship` asks it "to think about `space` and `ship` as
 * distinct elements". An entry carrying no `::` is therefore one segment at one weight.
 *
 * **The weak link in that chain is a version, and it is the same trap as `--style raw` above.** The
 * multi-prompt page scopes itself to "versions 1, 2, 3, 4, Niji 4, 5, Niji 5, 6, Niji 6, and 6.1" —
 * which does not include the `--v 8.2` this wrapper pins. The `--no` page is current for that
 * version and restates the `-0.5` equivalence itself, so the half of the chain that ties `--no` to a
 * multi-prompt segment is version-current; what is not restated anywhere current is `::` as the
 * divider. When `MIDJOURNEY_VERSION` moves, this belongs with the flag syntax that wants
 * re-checking.
 *
 * So `shadow` becomes **`cast shadow`**, the placement section 0 actually forbids, and it does what
 * it claims: read as one concept it negates the placement without touching the form shadow beside
 * it. The moderation reading costs nothing here — neither half of it is a word a filter acts on —
 * but it is the standing constraint on anything added to this list: **every word of a multi-word
 * entry has to be one this app is content to have read alone**, which is the trap that page exists
 * to warn about.
 *
 * `gradient` came out under the earlier reading and stays out under this one, on an argument that had
 * to be replaced rather than restated. The qualifier it needs is `background`, and decomposition is
 * no longer what keeps `gradient background` out: read whole, it would not negate the background at
 * all. What keeps it out is **what the wrong answer would cost**, which is the one thing that sets
 * this entry apart from the rest of the list.
 *
 * The list carries four multi-word entries and none of them is safe read word by word — the rule is
 * not that they are. `cast shadow` decomposes to the bare `shadow` it replaced, which is a wash.
 * `blurred edges` and `anti-aliased edges` decompose to a bare `edges` at -0.5, on exactly the
 * styles whose section 2 line asserts a hard one, and `smooth gradients` to a bare `smooth`. Those
 * three are real, and they are all the **same kind** of wrong: a sheet that argues with its own
 * style statement and comes back softer than it was asked for. That is a degraded sheet, and a
 * degraded sheet can be generated again. `gradient background` decomposed puts -0.5 on the colour
 * the whole sheet is registered against, and an unkeyable sheet is not a worse result but a useless
 * one — the compositing step it exists for cannot be run at all.
 *
 * **So it is the recoverability that decides it, not the balance of evidence**, and that is
 * deliberate. What makes an entry atomic is `::` being the divider rather than the space, which is
 * precisely the statement the version note above finds nowhere current for `--v 8.2`, and the flag
 * is unverifiable without a subscription — so this is a risk the repository cannot retire by
 * testing. Where being wrong degrades a sheet, that is worth accepting for a term that earns its
 * place; where it destroys one, it is not. The word-level ban is therefore **precautionary**, and
 * not a claim about how `--no` reads: better evidence that entries are atomic does not on its own
 * reopen it. What would is that evidence arriving as a page current for the pinned version, or the
 * failure ceasing to be unrecoverable. That decision is recorded in
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
