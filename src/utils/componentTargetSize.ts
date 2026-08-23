import { fixedRigMode } from '../constants/sheetPlans/index.ts';
import type { DirectionalMode, StatedTargetSize, TargetSize } from '../types/output.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { parseTargetSize } from './targetSize.ts';

/**
 * Which quantity `spriteTargetSize` states, and the per-component size where it states one.
 *
 * **The field means two different things depending on the sheet, and nothing said which.** On most
 * sheet plans its components are whole deliverable units — a tile, an icon cell, a frame, a façade
 * bay — so "component size" and the size a reader has in mind are the same number and the
 * difference never showed. `CUTOUT_RIG_SINGLE_DIRECTION` is where they separate hardest: its
 * inventory is a head, a torso, a pelvis and twelve limb segments, and the size stated for it is the
 * figure those assemble into. Eight of the eleven shipped rig presets say so in the value itself —
 * `48 × 96 px assembled` — and every preset in the library whose value says `assembled` is one of
 * them. Meanwhile the label above it, the prompt line carrying it and five readers downstream all
 * called it a component size.
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
 * **The app can already tell the two apart, so a second field would be a sixth thing that can
 * disagree.** The sheet plan answers it, and every reader comes through here rather than parsing the
 * field for itself.
 *
 * **The question is the sheet's, not the rig field's**, which `fixedRigMode` is the difference
 * between. `resolveRigMode` also answers `CUTOUT_RIG` for a pose-library sheet with a cut-out rig
 * *requested* — a legal configuration, and one whose sizes are still stated per unit: the shipped
 * pose-library presets write `32 × 48 px per frame cell` and `96 × 128 px per bay`. `fixedRigMode`
 * answers only where the sheet's own inventory *is* the rig, which is the sheet those presets are
 * describing.
 *
 * **This is not the whole of what a "component" is on this sheet plan or that one.** A CHARACTER
 * pose library draws a head, a torso, a pelvis and limb variants too, and the articulation sheet
 * draws thirty-four limbs — so those components are parts as well, and their presets still state a
 * size per figure or per frame cell. Whether the field means the same thing on those sheets is a
 * wider question about the plans than this function settles; what it settles is the one place the
 * *value itself* says which quantity it is.
 */

/**
 * Whether this **sheet's** target size names the whole figure rather than one component.
 *
 * A cut-out rig sheet's components are the parts a figure is assembled from, so a size stated for it
 * is a statement about the assembly. The stored rig field is deliberately not an argument: this is a
 * question about which sheet is being drawn, and `fixedRigMode` resolves the sheet mode first — so
 * an ITEM carrying `CUTOUT_RIG_SINGLE_DIRECTION` from an older build, which draws a directional core
 * instead, states a component size like any other directional sheet.
 *
 * **It says nothing about whether a size has actually been stated**, which is what makes it the
 * right answer for the studio's label and for the prompt's own gate — both describe what the box is
 * *for*, and both have to be right while it is empty. A caller asserting that the reader *has* named
 * an assembly wants {@link statedTargetSize} instead, or it will describe a size that is not there.
 */
export function statesAssembledSize(category: SubjectCategory, mode: DirectionalMode): boolean {
  return fixedRigMode(category, mode) === 'CUTOUT_RIG';
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
  spriteTargetSize: string,
): StatedTargetSize | null {
  const size = parseTargetSize(spriteTargetSize);
  if (size === null) return null;
  return { quantity: statesAssembledSize(category, mode) ? 'ASSEMBLED' : 'COMPONENT', size };
}

/**
 * The size of **one component**, or `null` where this configuration states no such thing.
 *
 * `null` covers both ways there is none: a field holding no `W × H` pair at all, and a field whose
 * pair names the assembled figure. Both are the same answer to the question these callers are
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
  spriteTargetSize: string,
): TargetSize | null {
  const stated = statedTargetSize(category, mode, spriteTargetSize);
  return stated === null || stated.quantity === 'ASSEMBLED' ? null : stated.size;
}
