import type { RenderStyleSurface } from '../../types/rendering.ts';

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
 */
export function wrapForFlux(
  prompt: string,
  backgroundKeyDescription: string,
  surface: RenderStyleSurface,
): string {
  return `The sheet shows only disconnected individual parts on a ${backgroundKeyDescription} field, with no cast shadow, no text, and no assembled figure. Every part is drawn ${surface.statement}.

${prompt}`;
}
