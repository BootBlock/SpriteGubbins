import type { ComponentEntry, ComponentKind } from '../../types/components.ts';
import type { Direction } from '../../types/rendering.ts';
import { OBJECT_YAW } from '../promptText/rotation.ts';

/** The facings one directional sheet draws, in the order its inventory and section 3 list them. */
export type FacingTuple = readonly [Direction, ...Direction[]];

/**
 * The entry shapes and the sheet split every `CORE_DIRECTIONAL_VARIANTS` plan is built from,
 * written against the facings the user actually chose.
 *
 * All six categories with a directional plan describe the same thing in the same two ways — a piece
 * drawn once per facing, either spelling the facings out or referring to them — and every one of
 * them used to write the count and the facing names by hand, against one fixed set. That is three
 * spellings of one fact, and it is also why the Directions control was discarded: a plan whose
 * entries name five facings cannot be steered to eight. Deriving the entries from the chosen
 * facings leaves one spelling *and* makes the control real — the plans are now functions of the
 * set, so the inventory, the count and section 3's yaw list move together.
 */

/**
 * A piece drawn at each facing, with the facings named — `Heads: front, front-three-quarter, …`.
 *
 * Used for the pieces that carry the sheet's identity, where naming the views is what stops a
 * generator returning the same drawing several times over with the details moved.
 */
export function viewsOf(label: string, kind: ComponentKind, facings: FacingTuple): ComponentEntry {
  return { text: `${label}: ${facings.join(', ')}`, count: facings.length, kind };
}

/**
 * A piece drawn at each facing, referring to them rather than repeating them — `Handle, at each of
 * the yaws section 3 lists`.
 *
 * Used for the secondary pieces, where a second full list of facings on every bullet costs tokens in
 * the section a model is already reading as a list.
 */
export function atEachYaw(label: string, kind: ComponentKind, facings: FacingTuple): ComponentEntry {
  return { text: `${label}, at each of the yaws section 3 lists`, count: facings.length, kind };
}

/**
 * How a directional core divides the chosen facings across sheets: one sheet for up to five views,
 * and two — the cardinals, then the diagonals — for the eight-compass set.
 *
 * The split is not only a component-count matter, though it is that too (six pieces at eight views
 * is forty-eight, past `PRACTICAL_COMPONENT_CEILING`). Eight views of one piece on one page are
 * eight *nearly adjacent* yaws, and adjacent yaws are exactly what a generator blurs together — the
 * reported failure being three views that came back at the same angle. Four orthogonal yaws per
 * sheet put 90° between neighbours, which is the most distinct any two views on the page can be,
 * and each sheet gets twice the canvas per component. The two sheets share the identity lock, as
 * any series does.
 *
 * Divided by **yaw arithmetic** rather than by list position, so the rule is what it says it is: a
 * cardinal is a multiple of 90°. Every yaw in `EIGHT_COMPASS` is one or the other, and the two
 * halves partition the set — `sheetPlans.test.ts` pins both.
 */
export function coreFacingChunks(facings: FacingTuple): readonly [FacingTuple, ...FacingTuple[]] {
  if (facings.length <= 5) return [facings];

  const isCardinal = (facing: Direction) => OBJECT_YAW[facing] % 90 === 0;
  const cardinals = facings.filter(isCardinal);
  const diagonals = facings.filter((facing) => !isCardinal(facing));
  // Unreachable while every set past five facings mixes the two parities, as the eight-compass set
  // does — but a hypothetical all-one-parity set must degrade to itself rather than to a lie.
  if (!isFacingTuple(cardinals) || !isFacingTuple(diagonals)) return [facings];
  return [cardinals, diagonals];
}

/**
 * `Directional core`, or `Directional core — cardinal facings` where the chunking above split it.
 *
 * The suffix is what tells the two halves of a split core apart everywhere a sheet is named: the
 * sheet-of-series select, the split drawer's rows, and the inventory heading the prompt itself
 * carries — a reader handed one of two sheets both titled "Directional core" cannot tell which
 * half of the set it owes.
 */
export function chunkName(base: string, chunk: FacingTuple, chunks: readonly FacingTuple[]): string {
  if (chunks.length === 1) return base;
  const every90 = chunk.every((facing) => OBJECT_YAW[facing] % 90 === 0);
  return `${base} — ${every90 ? 'cardinal' : 'diagonal'} facings`;
}

/** Narrows a filtered facing list back to the non-empty tuple every sheet requires. */
function isFacingTuple(facings: readonly Direction[]): facings is FacingTuple {
  return facings.length > 0;
}
