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
 * `background` is absent from `--no` on purpose: the sheet needs a *keyable* background, and
 * excluding "background" risks losing the key colour with it.
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
 * the image or around a component", which is annotation; `--no` takes bare concepts and cannot carry
 * that qualifier, so on an INTERFACE sheet the flag would suppress the panel edges the inventory
 * asks for. The caller answers from `FRAME_IS_A_COMPONENT`. This is the same judgement the doc
 * comment above already records for `background` — a term stays out of `--no` where excluding it
 * would take the sheet's own subject with it.
 *
 * **`shadow` and `gradient` were the third instance of that judgement, and they resolve two
 * different ways.** Bare, each negates something a render style requires: "material shading and soft
 * form shadow" is `RENDERED_3D`'s own section 2 line, and a gradient across a form is what that
 * shadow is made of.
 *
 * What decides the two differently is that **Midjourney documents `--no` as a comma-separated list
 * of things to avoid and does not document how it reads a multi-word entry** — so the honest
 * position is that a phrase may be taken whole or may be taken word by word, and each term is chosen
 * to be acceptable either way. `shadow` becomes **`cast shadow`**, the placement section 0 actually
 * forbids: read whole it stops negating the form shadow, and read word by word it is no worse than
 * the bare term that shipped, so it is a gain or a wash and never a loss. `gradient` cannot take the
 * qualifier it needs, because that word is `background` — and read word by word that would put the
 * one term the paragraph above keeps out of this list at any width straight back into it, against a
 * sheet built around a keyable background. A loss there is unrecoverable rather than a wash, so the
 * term comes out and the gradient claim becomes the sheet's own instead, spliced in from
 * `RENDER_STYLE_SURFACE`: `smooth gradients` where the style states flat fills, and nothing at all
 * where it asks for soft blended forms. Section 0's uniform key field is stated in the prompt body,
 * which Midjourney reads in full; the `--no` list was never what carried it.
 */
export function wrapForMidjourney(
  prompt: string,
  aspectRatio: AspectRatio,
  frameIsAComponent: boolean,
  surface: RenderStyleSurface,
): string {
  const negatives = [
    'text',
    'labels',
    'cast shadow',
    ...surface.negatives,
    ...(frameIsAComponent ? [] : ['frame', 'border']),
  ];
  return `${prompt}\n\n${ASPECT_FLAGS[aspectRatio]} ${MIDJOURNEY_VERSION} --raw --s 50 --no ${negatives.join(', ')}`;
}
