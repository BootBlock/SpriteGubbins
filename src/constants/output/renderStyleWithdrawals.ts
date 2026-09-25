import { OUTLINE_STYLES, PALETTE_LIMITS } from '../../types/output.ts';
import type { RenderStyle } from '../../types/rendering.ts';
import { lightingModelsFor, outlinesFor, paletteLimitsFor, validationPassFor } from '../promptText/index.ts';

/**
 * What the render style's controls say about the settings a style has taken off them.
 *
 * Each sentence is shown under the control it explains, so it is plain text rather than card markup,
 * and each is built from the lookups the controls are filtered by — `outlinesFor`,
 * `lightingModelsFor`, `paletteLimitsFor` and `validationPassFor` — so a sentence cannot name a
 * setting that is still offered or miss one that has gone. An option that disappears without a word
 * reads as a control that failed to render, which is the reason `SheetFields` names the sheet modes
 * an assembly base withholds.
 */

/** Joins two or more names as a sentence lists them: “a”, “a and b”, “a, b and c”. */
function listed(names: readonly string[]): string {
  return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1) ?? ''}`;
}

/**
 * What the Render Style control says once the chosen style has withdrawn controls below it, or `''`
 * for a style that withdraws none.
 *
 * Two causes, which can stack: a validation pass states the surface itself, so surface detail, the
 * colour budget and the outline system withdraw — and the lighting model too, for the silhouette, which
 * has no surface for a light to land on. And a style whose shading falls from a directional light
 * offers one lighting model, so that control withdraws and the prompt states the one it offers.
 */
export function renderStyleWithdrawal(style: RenderStyle): string {
  const lighting = lightingModelsFor(style);
  const sentences: string[] = [];

  if (validationPassFor(style) !== null) {
    const withdrawn = ['surface detail', 'the colour budget', 'the outline system'];
    if (lighting.length === 0) withdrawn.push('the lighting model');
    sentences.push(
      `A validation pass: it states the surface itself, so ${listed(withdrawn)} withdraw, and the prompt carries what the pass withholds in their place.`,
    );
  }
  if (lighting.length === 1) {
    sentences.push(
      `Its shading falls from a directional light, so the lighting model withdraws and the prompt states ${lighting[0] ?? ''}.`,
    );
  }
  return sentences.join(' ');
}

/**
 * What the Outline System control says where the style offers fewer outlines than the app has.
 *
 * Only a style that names its own contour offers fewer, because `OUTLINE_TEXT` gives that kind of
 * contour no words for drawing without one — so the reason this states is the only one there is.
 */
export function outlineWithdrawal(style: RenderStyle): string {
  const offered = outlinesFor(style);
  // A validation pass offers none, and withdraws the whole control; `renderStyleWithdrawal` says so.
  if (offered.length === 0) return '';
  const withheld = OUTLINE_STYLES.filter((outline) => !offered.includes(outline));
  if (withheld.length === 0) return '';
  return `${style} names its own contour line, so this chooses the colour of that line, and ${listed(withheld)} ${withheld.length === 1 ? 'is' : 'are'} not offered.`;
}

/**
 * What the Palette Limit control says where the style offers fewer budgets than the app has.
 *
 * A style offers fewer only where its own description names a colour range — `RETRO_PIXEL_ART`'s
 * “small palette” — which is what `RENDER_STYLE_TRAITS` records.
 */
export function paletteLimitWithdrawal(style: RenderStyle): string {
  const withheld = PALETTE_LIMITS.filter((limit) => !paletteLimitsFor(style).includes(limit));
  if (withheld.length === 0) return '';
  return `${style} names its colour range in its own description, so ${listed(withheld)} ${withheld.length === 1 ? 'is' : 'are'} not offered.`;
}
