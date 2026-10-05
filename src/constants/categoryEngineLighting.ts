import type { SubjectCategory } from '../types/subject.ts';

/**
 * The categories drawn over the game rather than in it, each named as the lighting guidance names it.
 *
 * **A game engine never lights them** (audit finding C4). An engine's lights and its ambient tint fall
 * on the world's sprites, and the interface layer an icon, a button or a glyph is drawn on sits above
 * them, untouched — in Godot a canvas layer above the world takes neither `Light2D` nor
 * `CanvasModulate`. So flat neutral lighting is chosen for these as a look, never so the engine can
 * light them, and a key light baked into them is the only light they will ever show.
 *
 * Every other category draws a sprite that stands in the game's world, where the engine's lighting is
 * what flat neutral lighting leaves room for.
 */
export const DRAWN_OVER_THE_GAME: Readonly<Partial<Record<SubjectCategory, string>>> = {
  ICON: 'an icon set',
  INTERFACE: 'an interface kit',
  FONT: 'a font',
};

/** Whether a game engine lights this category's sprites as it draws them. */
export function litByEngine(category: SubjectCategory): boolean {
  return DRAWN_OVER_THE_GAME[category] === undefined;
}
