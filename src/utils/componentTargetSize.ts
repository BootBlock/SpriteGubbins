import { fixedRigMode } from '../constants/sheetPlans/index.ts';
import type { DirectionalMode, TargetSize } from '../types/output.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { parseTargetSize } from './targetSize.ts';

/**
 * Which quantity `spriteTargetSize` states, and the per-component size where it states one.
 *
 * **The field means two different things depending on the sheet, and nothing said which.** On every
 * sheet plan but the cut-out rig ones the component *is* the figure — a pose library's components
 * are whole characters, a tileset's are tiles — so "component size" and "assembled size" are the
 * same number and the difference never showed. `CUTOUT_RIG_SINGLE_DIRECTION` is where they separate:
 * its inventory is a head, a torso, a pelvis and twelve limb segments, and none of them is the
 * figure. The shipped rig presets say so in the value itself — *"48 × 96 px assembled"* — while the
 * label above it, the prompt line carrying it and five readers downstream all called it a component
 * size.
 *
 * Five readers took it as one component's size and all five were wrong there. Two are unconditional:
 * the Sprites panel compared the largest segmented piece against the assembled figure, so its
 * *within the target* carried whatever slack separates a torso from a whole body — a number nothing
 * in the app knows, which is what makes the reading worthless rather than merely loose. The atlas
 * calculator checked a texture cell against a 48 × 96 component on a sheet whose components are
 * pieces of one. The other three — the pixel-discipline floor, the sprite-scale bullets and the
 * native-grid enlargement — are gated on the `CUSTOM` resolution profile and so return early on the
 * shipped rig presets, which is coincidence rather than protection: the gate is about which profile
 * states a scale, and has nothing to say about which quantity the size names.
 *
 * **The app can already tell the two apart, so a second field would be a fifth thing that can
 * disagree.** The sheet plan answers it, and every reader that wants a per-component size comes
 * through here rather than parsing the field for itself.
 *
 * **The question is the sheet's, not the rig field's**, which `fixedRigMode` is the difference
 * between. `resolveRigMode` also answers `CUTOUT_RIG` for a pose-library sheet with a cut-out rig
 * *requested* — a legal configuration, and one whose sizes are still stated per unit: the shipped
 * pose-library presets write `32 × 48 px per frame cell` and `32 × 48 px per figure`, where every
 * rig preset writes `assembled`. `fixedRigMode` answers only where the sheet's own inventory *is*
 * the rig, which is the sheet those presets are describing.
 */

/**
 * Whether this sheet's target size names the whole figure rather than one component.
 *
 * A cut-out rig sheet's components are the parts a figure is assembled *from*, so a size stated for
 * it is a statement about the assembly. The stored rig field is deliberately not an argument: this
 * is a question about which sheet is being drawn, and `fixedRigMode` resolves the sheet mode first —
 * so an ITEM carrying `CUTOUT_RIG_SINGLE_DIRECTION` from an older build, which draws a directional
 * core instead, states a component size like any other directional sheet.
 */
export function statesAssembledSize(category: SubjectCategory, mode: DirectionalMode): boolean {
  return fixedRigMode(category, mode) === 'CUTOUT_RIG';
}

/**
 * The size of **one component**, or `null` where this configuration states no such thing.
 *
 * `null` covers both ways there is none: a field holding no `W × H` pair at all, and a field whose
 * pair names the assembled figure. Both are the same answer to the question every caller is asking —
 * *how big is a component meant to be* — and every caller already handles it, because an empty field
 * has always been a possibility. The Sprites panel renders no comparison clause, the atlas
 * calculator checks no fit, and the prompt's pixel discipline falls back to the rung it uses when
 * there is no scale to reason from.
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
  if (statesAssembledSize(category, mode)) return null;
  return parseTargetSize(spriteTargetSize);
}
