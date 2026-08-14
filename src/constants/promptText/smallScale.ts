import type { ResolutionProfile } from '../../types/output.ts';
import { parseTargetSize } from '../../utils/targetSize.ts';

/**
 * The bullets section 2's pixel discipline adds when the stated component is sprite-sized.
 *
 * Below a few dozen pixels the craft inverts: silhouette carries the identity, interior detail is
 * what gets sacrificed, and the generic pixel-discipline rules — placed clusters, clean staircases,
 * no microtexture — say nothing about that inversion. A generator asked for a 16 × 16 icon under
 * the generic rules alone returns a miniature illustration: correct pixels, unreadable sprite.
 *
 * The gate mirrors `minFeatureSize`'s reasoning exactly: only `CUSTOM` consults the free-text size,
 * because the other three profiles *are* a scale and state their own figure — and the coarsest of
 * those, `RETRO_16_BIT` at 64–96 pixels per figure, is well past sprite scale, so none of them can
 * ever need these bullets.
 */

/**
 * The largest smaller-edge that still counts as sprite-sized, keyed on the smaller edge for the
 * reason `minFeatureSize` is: that is the edge detail runs out on.
 *
 * 32 because it is the coarsest size at which the silhouette still is the identity — the classic
 * console sprite — and twice the 16 px floor of the inventory icons this scale exists for. At 33
 * and above a figure has room for interior forms to read on their own, which is the generic
 * discipline's territory.
 */
const SPRITE_SCALE_EDGE = 32;

/**
 * The extra bullets, or `''` where the configuration is not sprite-scale — which is what makes the
 * template's `[OPTIONAL:SMALL_SCALE_DISCIPLINE | …]` line disappear rather than arrive blank.
 *
 * Every word here is checked against what section 2 can say beside it, and four collisions shaped
 * the wording:
 *
 * - **The bullets never restate the size.** The target names a typical whole figure, not a hard
 *   per-component dimension — a hand drawn beside a torso is in proportion to it, per section 0's
 *   scale rule — so a bullet claiming each component *is* W × H would contradict that rule on every
 *   multi-part sheet. The target-size line directly above already states the figure, in the field's
 *   own words. (The bullets can still say "above": they only fire when the field is non-empty,
 *   which is exactly when that line survives its own `[OPTIONAL:…]`.)
 * - **"Silhouette", never "outline"** — `OUTLINE_LESS_ALBEDO` puts "No outline" a few lines up, and
 *   an "outline shape" bullet under it hands the generator a contradiction. "Recognisable" rather
 *   than "identifies", because section 4 defines identification as grid position.
 * - **No blanket ban on per-pixel variation** — `TEXTURED` surface detail requests controlled
 *   texturing in the same section, and a sentence calling that noise asks the generator to discard
 *   one of the pair. The microtexture bullet above already names the specific techniques banned.
 * - **Properties, not deliberation.** "Judge every component before finishing it" is a
 *   verify-before-delivering instruction, and those are gated on a target's declared capabilities —
 *   so each bullet states what is true of the finished sheet, as the 1:1 inspection bullet beside
 *   it does.
 */
export function smallScaleDiscipline(profile: ResolutionProfile, spriteTargetSize: string): string {
  if (profile !== 'CUSTOM') return '';

  const target = parseTargetSize(spriteTargetSize);
  if (target === null || Math.min(target.width, target.height) > SPRITE_SCALE_EDGE) return '';

  return [
    '- The target component size above is sprite scale, so every component is designed silhouette-first: its silhouette alone makes it recognisable before any interior detail is added, and where the two compete the silhouette wins.',
    '- Prefer one large readable feature to several small ones.',
    '- Every component reads at 1:1 against the background field. A component that is only legible magnified is not legible.',
  ].join('\n');
}
