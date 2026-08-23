import { sheetPlanFor } from '../constants/sheetPlans/index.ts';
import type { DirectionalMode, StatedTargetSize, TargetSize } from '../types/output.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { parseTargetSize } from './targetSize.ts';

/**
 * Which quantity `spriteTargetSize` states, and the per-component size where it states one.
 *
 * **The field means two different things depending on the sheet, and nothing said which.** On a
 * sheet whose components are whole deliverable units — a tile, an icon cell, a glyph, a frame, a
 * façade bay, a parallax band — "component size" and the size a reader has in mind are the same
 * number, and the difference never showed. On a sheet whose components are the parts one subject is
 * cut into, they are not: a cut-out rig's inventory is a head, a torso, a pelvis and twelve limb
 * segments, and the size stated for it is the figure those assemble into. Meanwhile the label above
 * the box, the prompt line carrying it and five readers downstream all called it a component size.
 *
 * Three of those readers are unconditional and all three were wrong there. The Sprites panel
 * compared the largest segmented piece against the assembled figure, so its *within the target*
 * carried whatever slack separates a torso from a whole body — a number nothing in the app knows,
 * which is what makes the reading worthless rather than merely loose. The quantiser's grid candidate
 * seated one cell per component at that size, pricing a canvas of fifteen whole characters. The
 * atlas calculator checked a texture cell against a 48 × 96 component on a sheet whose components
 * are pieces of one.
 *
 * The other two — the pixel-discipline floor and the sprite-scale bullets — are gated on the
 * `CUSTOM` resolution profile, which three of the eleven rig presets carry, so they were live there
 * too. The gate decides which profile states a scale of its own and has nothing to say about which
 * quantity the size names.
 *
 * **The sheet plan declares the answer, so a second field would be a sixth thing that can
 * disagree.** `SheetPlan.targetQuantity` is where it is written down, one plan at a time, and every
 * reader comes through here rather than parsing the field for itself.
 *
 * **The question is the sheet's, and it takes the whole address to ask.** The rig is where the two
 * quantities separate hardest, but it is not where they separate: a CHARACTER pose library draws a
 * head, a torso, a pelvis and limb variants, the articulation sheet draws thirty-four limbs, and an
 * ITEM part library draws a grip, a shaft and a working end. Every one of those states the assembled
 * subject, which is what their own presets already write — `32 × 48 px per figure` on a directional
 * core, `32 × 48 px per frame cell` on a pose library, `64 × 64 px per icon cell` on a part library. So the resolved *sheet* answers it, not
 * the category, not the mode and not the stored rig field: `SINGLE_DIRECTION_POSE_LIBRARY` draws
 * parts for a CHARACTER and whole glyphs for a FONT, and an ITEM carrying
 * `CUTOUT_RIG_SINGLE_DIRECTION` from an older build is drawn a directional core instead, which
 * `sheetPlanFor` resolves before the question is asked.
 */

/**
 * Whether this **sheet's** target size names the whole subject rather than one component.
 *
 * **It says nothing about whether a size has actually been stated**, which is what makes it the
 * right answer for the studio's label and for the prompt's own gate — both describe what the box is
 * *for*, and both have to be right while it is empty. A caller asserting that the reader *has* named
 * an assembly wants {@link statedTargetSize} instead, or it will describe a size that is not there.
 */
export function statesAssembledSize(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
): boolean {
  return sheetPlanFor(category, mode, directions, sheetIndex).targetQuantity === 'ASSEMBLED';
}

/**
 * The size in the field with the quantity it is a size of, or `null` where the field states none.
 *
 * The full answer, for the two readers that have something to say about an assembly rather than
 * nothing: `minFeatureSize`, whose floor must not be keyed off a figure no component has, and the
 * atlas panel, which has to say why it is not checking a fit instead of asking for a size that is
 * already on screen.
 */
export function statedTargetSize(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
  spriteTargetSize: string,
): StatedTargetSize | null {
  const size = parseTargetSize(spriteTargetSize);
  if (size === null) return null;
  // The plan's own value, not a ternary rebuilding it from the boolean above — that would be the
  // enumeration written a second time, and the two spellings could then disagree.
  return { quantity: sheetPlanFor(category, mode, directions, sheetIndex).targetQuantity, size };
}

/**
 * The size of **one component**, or `null` where this configuration states no such thing.
 *
 * `null` covers both ways there is none: a field holding no `W × H` pair at all, and a field whose
 * pair names the assembled subject. Both are the same answer to the question these callers are
 * asking — *how big is a component meant to be* — and every one of them already handles it, because
 * an empty field has always been a possibility. The Sprites panel renders no comparison clause, the
 * grid candidate is not offered, and the native-grid enlargement is not derived.
 *
 * **It deliberately does not guess a per-piece size from the assembled one.** The app holds no
 * per-piece geometry and should not: which piece is what fraction of a figure belongs to the rig
 * contract the art is authored against, which is outside this app entirely.
 */
export function componentTargetSize(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
  spriteTargetSize: string,
): TargetSize | null {
  const stated = statedTargetSize(category, mode, directions, sheetIndex, spriteTargetSize);
  return stated === null || stated.quantity === 'ASSEMBLED' ? null : stated.size;
}
