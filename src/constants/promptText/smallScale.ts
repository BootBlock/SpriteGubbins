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
 * The dimensions and the pixel count are derived from the parsed target rather than written twice,
 * per the rule that two places stating one fact must share a source. Every bullet holds under every
 * outline, palette and lighting choice the studio can pair it with: none of them names a colour
 * count or bans an outline, because section 2 states those beside this and the prompt may not
 * disagree with itself.
 */
export function smallScaleDiscipline(profile: ResolutionProfile, spriteTargetSize: string): string {
  if (profile !== 'CUSTOM') return '';

  const target = parseTargetSize(spriteTargetSize);
  if (target === null || Math.min(target.width, target.height) > SPRITE_SCALE_EDGE) return '';

  const pixels = target.width * target.height;
  return [
    `- A component here is ${String(target.width)} × ${String(target.height)} px — ${String(pixels)} pixels in all — so design it silhouette-first: the outline shape alone identifies the component before any interior detail is added, and where the two compete the silhouette wins.`,
    '- Prefer one large readable feature to several small ones. Flat colour areas read at this size; per-pixel variation reads as noise.',
    '- Judge every component at 1:1 against the background field before finishing it. A component that only reads magnified does not read.',
  ].join('\n');
}
