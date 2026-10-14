import { ASPECT_RATIOS } from '../types/output.ts';
import type { AspectRatio } from '../types/output.ts';
import type { SubjectCategory } from '../types/subject.ts';

/**
 * Which sheet canvas each category's sheets can honestly be drawn on.
 *
 * **The fifth claim a category can refuse**, after the mode, the rig, the direction set and the
 * projection, and the reason it joined them is ICON's grid. An icon sheet states its layout — sixteen
 * icons, four across and four down, each a square 128 px cell — and a wide or tall canvas cannot hold
 * a square grid of square cells without leaving a band of it empty or squeezing the cells: the prompt
 * would state one grid and the canvas would ask for another. So ICON is drawn on `SQUARE_1_1` alone.
 *
 * **The twelve unbound categories take `ASPECT_RATIOS` entire**, so a ratio added to the union reaches
 * every sheet that can use it in one edit — and the bound category stays bound.
 *
 * **The first entry of each list is load-bearing**: it is what {@link resolveAspectRatio} degrades a
 * stored ratio the category cannot honour to, the way `CATEGORY_PROJECTIONS` answers for a camera.
 */
export const CATEGORY_ASPECT_RATIOS: Readonly<
  Record<SubjectCategory, readonly [AspectRatio, ...AspectRatio[]]>
> = {
  CHARACTER: ASPECT_RATIOS,
  CREATURE: ASPECT_RATIOS,
  OBJECT: ASPECT_RATIOS,
  ITEM: ASPECT_RATIOS,
  BUILDING: ASPECT_RATIOS,
  VEHICLE: ASPECT_RATIOS,
  EFFECT: ASPECT_RATIOS,
  INTERFACE: ASPECT_RATIOS,
  TERRAIN: ASPECT_RATIOS,
  PORTRAIT: ASPECT_RATIOS,
  ICON: ['SQUARE_1_1'],
  BACKGROUND: ASPECT_RATIOS,
  FONT: ASPECT_RATIOS,
};

/** Whether this category's sheets can be drawn on a canvas of this shape. */
export function supportsAspectRatio(category: SubjectCategory, aspectRatio: AspectRatio): boolean {
  return CATEGORY_ASPECT_RATIOS[category].includes(aspectRatio);
}

/**
 * The canvas actually used for this category — the one asked for where its sheets can be drawn on it,
 * the category's own fallback otherwise.
 *
 * The studio prevents the mismatch, and this is not defence in depth for its own sake — it is the
 * argument `resolveProjection` makes: a preset, a history row or a hand-edited export can arrive
 * carrying a ratio that was legal when it was saved. Every reader of `aspectRatio` goes through here —
 * the compiler, the model wrappers, the native-grid arithmetic, the studio digest, the atlas and the
 * control itself — so a stale value degrades to one answer rather than to six.
 */
export function resolveAspectRatio(category: SubjectCategory, aspectRatio: AspectRatio): AspectRatio {
  const offered = CATEGORY_ASPECT_RATIOS[category];
  const [fallback] = offered;
  return offered.includes(aspectRatio) ? aspectRatio : fallback;
}
