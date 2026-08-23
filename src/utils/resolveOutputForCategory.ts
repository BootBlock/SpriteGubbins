import { resolveDirectionSet } from '../constants/categoryDirectionSets.ts';
import { resolveProjection } from '../constants/categoryProjections.ts';
import { resolveStyleReference } from '../constants/categoryStyleReferences.ts';
import { resolveCameraElevation } from '../constants/promptText/index.ts';
import { resolveMode, resolveRigMode } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectCategory } from '../types/subject.ts';

/**
 * The output configuration a category switch leaves behind: every claim the new subject cannot
 * honour, resolved against what it can.
 *
 * Returns the configuration it was handed, unchanged and by identity, where the new category can
 * honour all of it *and* the series is already on its first sheet — the sheet index travels with a
 * switch whether or not anything else moved, and the reason is at the guard below. Callers rely on
 * that identity: writing a structurally identical configuration back into the store would replace
 * the object and make every selector re-render for a switch that decided nothing.
 *
 * A pure function rather than a step inside `useSubjectStore.setCategory`, because it is a fact
 * about the category table rather than about the store: the compiler resolves the same pairings
 * again on every compile, so the *prompt* is safe either way, and what this protects is a store left
 * holding a claim its own category cannot produce — which is the state a saved preset would then
 * persist.
 */
export function resolveOutputForCategory(category: SubjectCategory, output: OutputConfig): OutputConfig {
  // The sheet mode does not survive a category change unchanged: the modes are category-scoped, and
  // a stale one is how a character came to be described by a tileset's inventory. `resolveMode`
  // keeps the current mode wherever the new category also supports it — switching CHARACTER →
  // CREATURE should not silently reset a cut-out rig — and falls back to that category's default
  // only where it genuinely cannot be honoured.
  const directionalMode = resolveMode(category, output.directionalMode);
  // The rig travels with it, for the same reason and against the same table: a rig is a claim about
  // how the subject is built, so it does not survive becoming a different kind of subject.
  // `resolveRigMode` keeps a cut-out rig across CHARACTER → CREATURE and drops it to `NONE` on the
  // five categories that articulate about nothing — which is what stops a preset saved after such a
  // switch persisting a rig its own category has no joints for. It reads the mode resolved on the
  // line above rather than the stored one, because the cut-out rig *sheet* decides the rig outright:
  // a switch that keeps that sheet keeps the rig its inventory is made of, and one that loses it
  // hands the choice back.
  const rigMode = resolveRigMode(category, directionalMode, output.rigMode);
  // And the direction set, the third of these and the last one that used to survive untouched:
  // switching to INTERFACE re-resolved the mode and left `directions` on `THREE_CLASSIC`, so the
  // panel offered "Split into 3 sheets" and the first of those asked for a button at object yaw 45°.
  // `resolveDirectionSet` keeps the set wherever the new subject can be turned to it — seven of the
  // thirteen categories can be turned to all of them — and falls back only where it cannot.
  const directions = resolveDirectionSet(category, output.directions);
  // And the projection, the fourth and last of the claims a category can refuse. It is the one that
  // failed loudest: an INTERFACE arriving from a default session kept `THREE_QUARTER_TOPDOWN` and
  // compiled `Angled overhead … the vertical screen axis carries both height and depth` above an
  // inventory of button states, which is a prompt contradicting itself rather than merely asking for
  // a degenerate batch. `resolveProjection` keeps the camera wherever the new subject can be drawn
  // under it — nine of the thirteen categories can be drawn under all of them — and falls back only
  // where it cannot.
  const projection = resolveProjection(category, output.projection);
  // The elevation follows the *resolved* projection rather than the stored one, because the two are
  // one statement about one camera: a projection narrowed to `ORTHOGRAPHIC_FRONT` beside a stored
  // 35° is exactly the disagreement `elevation.ts` exists to end.
  const cameraElevation = resolveCameraElevation(projection, output.cameraElevation);
  // And the art style reference, which is the projection's second door: a reference states the
  // camera it was rendered under and carries it into section 2 as a measurement, so a look the new
  // subject cannot be drawn to goes rather than standing over a camera that contradicts it.
  const styleReference = resolveStyleReference(category, output.styleReference);

  // The sheet of the series goes back to the first whether or not the mode survives, because the
  // series is keyed on the *pairing*: a category the mode still supports can have a shorter series,
  // so a CHARACTER left on sheet two and switched to an OBJECT would hold an index that pairing does
  // not have. The compiler resolves such an index rather than trusting it, so this is not what makes
  // the prompt correct — it is what stops a saved preset persisting a sheet nobody can select, since
  // the sheet control is hidden for a single-sheet series and could not put it back.
  if (
    directionalMode === output.directionalMode &&
    rigMode === output.rigMode &&
    directions === output.directions &&
    projection === output.projection &&
    cameraElevation === output.cameraElevation &&
    styleReference === output.styleReference &&
    output.sheetIndex === 0
  ) {
    return output;
  }

  return {
    ...output,
    directionalMode,
    rigMode,
    directions,
    projection,
    cameraElevation,
    styleReference,
    // Cleared with the set exactly as the control clears it, and only then: a facing pinned against
    // `THREE_CLASSIC` is one `SINGLE_FRONT` never turns to, and leaving it behind would let a preset
    // saved from here persist a facing its own set does not contain.
    primaryDirection: directions === output.directions ? output.primaryDirection : null,
    sheetIndex: 0,
  };
}
