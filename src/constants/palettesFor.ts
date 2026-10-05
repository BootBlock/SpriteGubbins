import { PALETTE_IDS } from '../types/palette.ts';
import type { PaletteId } from '../types/palette.ts';
import type { SheetSubject } from '../types/subject.ts';

/**
 * The palettes this subject can be drawn under, in the order the control offers them.
 *
 * **A tint mask takes none but `FREE`** (audit finding M1). A pinned palette names the hues every pixel
 * must come from, and a mask is drawn in neutral greys with no hue at all, so the two cannot both hold:
 * the Game Boy's four greens have no grey among them. The engine's tint is the mask's colour, so a set
 * that wants a palette applies it to the tint. Every other subject can take every palette.
 */
export function palettesFor(subject: SheetSubject): readonly PaletteId[] {
  return subject.icons?.colourMode === 'TINT_MASK' ? ['FREE'] : PALETTE_IDS;
}

/**
 * The palette a configuration is drawn under: the stored one where the subject can take it, and
 * otherwise the first the subject is offered.
 *
 * Resolved wherever a stored palette meets a subject, as `resolveBackgroundKey` is for the key — the
 * compiler (`promptFacts`), the studio's digests, the Palette control and the budget it withdraws, the
 * store when a change of colour mode or of subject leaves a palette behind (`outputForRoster`,
 * `resolveOutputForSubject`), and the Quantise tab through `useResolvedPalette` — so the prompt, the
 * controls and the quantiser name one palette.
 */
export function resolvePalette(subject: SheetSubject, palette: PaletteId): PaletteId {
  const offered = palettesFor(subject);
  const [fallback = palette] = offered;
  return offered.includes(palette) ? palette : fallback;
}
