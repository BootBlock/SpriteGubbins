import type { RenderStyleSurface } from '../../types/rendering.ts';
import type { CategoryAssembly } from '../../types/subject.ts';

/**
 * Flux, which is **not** Stable Diffusion for this purpose: Black Forest Labs' own prompting guide
 * states that "FLUX.2 does not support negative prompts. Focus on describing what you want, not what
 * you don't want" — so SD's negative block would be silently discarded, and the same two failures
 * are stated positively instead.
 *
 * **It leads the prompt rather than trailing it, and that is a fix rather than a preference.** On
 * the open-weight target this restatement was unreachable: tokenisation stops at 512 tokens and the
 * specification runs to roughly 3,600, so the one sentence written specifically to survive Flux's
 * missing negative prompt was the one sentence guaranteed to be truncated away first. Leading also
 * matches what Black Forest Labs document about attention: "Word order matters — FLUX.2 pays more
 * attention to what comes first." https://docs.bfl.ai/guides/prompting_guide_flux2
 *
 * **Which is exactly why the second sentence states the style.** Section 2's `Style:` line sits
 * around token 1,070, so on the open-weight tier it is never read — and this wrapper opened by
 * asserting "crisp hard edges" whatever that line said, which made the one statement about the
 * surface the model *did* read the wrong one on eight of the ten styles. `RENDER_STYLE_SURFACE`
 * holds the clause each style completes, in section 2's own words.
 *
 * **"No shadows" is now "no cast shadow" for the same reason**, and it is a narrowing rather than a
 * softening: what section 0 forbids is a cast shadow, a contact shadow and a ground plane, while a
 * form shadow is the shading that gives a component its volume — and it is `RENDERED_3D`'s and
 * `CLAY_RENDER`'s subject. The unqualified plural took both.
 *
 * **`no text` is the sheet's too, and on one category it is the opposite of what the sheet needs.**
 * A glyph set's components *are* lettering, so the strongest position in the strongest sentence this
 * wrapper writes would be spent negating the subject — and Flux has no negative channel to correct it
 * from. `LETTERING_IS_A_COMPONENT` answers, and the clause is replaced rather than dropped: what a
 * font sheet must not carry is the characters *set together*, which is `assembly.statement`'s job on
 * every other category and does the whole of it here.
 *
 * **And the clause that closes the first sentence is the sheet's, from `CATEGORY_ASSEMBLY`.** It
 * read "no assembled figure" whatever the subject was, which put a claim about a figure in the
 * position Black Forest Labs' word-order guidance calls the strongest — on a terrain, building or
 * interface sheet, ahead of everything true about it. This is prose rather than a term list, so the
 * record carries the clause already worded as English rather than the wrapper assembling one.
 */
export function wrapForFlux(
  prompt: string,
  backgroundKeyDescription: string,
  surface: RenderStyleSurface,
  letteringIsAComponent: boolean,
  assembly: CategoryAssembly,
): string {
  const withoutText = letteringIsAComponent ? '' : ' no text,';
  return `The sheet shows only disconnected individual parts on a ${backgroundKeyDescription} field, with no cast shadow,${withoutText} and ${assembly.statement}. Every part is drawn ${surface.statement}.

${prompt}`;
}
