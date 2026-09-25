import { resolveDirectionSet } from '../constants/categoryDirectionSets.ts';
import { resolveProjection } from '../constants/categoryProjections.ts';
import { resolveStyleReference } from '../constants/categoryStyleReferences.ts';
import { resolveCameraElevation } from '../constants/promptText/index.ts';
import { plansFor, resolveMode, resolveRigMode, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SheetSubject, SubjectCategory } from '../types/subject.ts';

/**
 * The output configuration a change of subject leaves behind: every claim the new subject cannot
 * honour, resolved against what it can.
 *
 * **Two changes reach it, and they differ only in how much each can move.** A category switch can
 * move all seven claims below, because the modes, the facings, the cameras and the looks are all
 * category-scoped, and because a rig contract is a document loaded for one subject. A change of
 * assembly base can move four — the sheet mode, the rig, the contract that rig carries and the sheet
 * index — because a base chooses the plans its category draws from (issue #283): a rigid object has
 * no rig sheet, and a nine-slice frame has no state library. The other three are functions of the
 * category alone and come back unchanged, so one function serves both rather than two that would have
 * to agree about the three they share. `useSubjectStore` asks it about a base only where the edit
 * changes the plans, which is what leaves a reader's sheet index alone when they retype a value that
 * draws the same sheets.
 *
 * **`from` is the subject the configuration was composed under**, and it is the one thing here that
 * cannot be read off the arguments. Every other claim is judged against a table that says which
 * subjects can honour it; a contract is judged only by whether this is still the body it was loaded
 * for, and that question needs both ends. The body is the plan table, because a contract replaces the
 * inventory those plans draw: a category switch always changes the table, and so does a base that
 * draws a body of its own (issue #286) — a quadruped's skeleton loaded under `Quadruped Beast` is not a
 * claim about an octopus, however well the octopus's sheets would take a rig.
 *
 * **That makes the contract rule a fact about a CHANGE, and the boundary is worth stating.** A
 * session row, a history entry, a saved preset and an imported pack each restore a configuration
 * without passing through here, deliberately: a position on the stack is a studio that existed and is
 * replayed rather than recomputed. So a row written *before* this rule existed can still carry a
 * humanoid contract under a creature, and come back that way. It cannot be caught at the parse
 * boundary either — a `RigContract` names a skeleton and not a body, so nothing there can tell a
 * stranded humanoid from a legitimate creature rig. The durable fix is to store the category and base
 * a contract was loaded for beside it, at which point this rule holds on every path and needs no
 * `from` at all; that is a change to the shape `ImageOutputConfig` persists, and it is not made here.
 *
 * Returns the configuration it was handed, unchanged and by identity, where the subject can honour
 * all of it *and* the series is already on its first sheet — the sheet index goes back to the first
 * whether or not anything else moved, and the reason is at the guard below. Callers rely on that
 * identity: writing a structurally identical configuration back into the store would replace the
 * object and make every selector re-render for a change that decided nothing.
 *
 * A pure function rather than a step inside `useSubjectStore`, because it is a fact about the plan
 * tables rather than about the store: the compiler resolves the same pairings again on every compile,
 * so the *prompt* is safe either way, and what this protects is a store left holding a claim its own
 * subject cannot produce — which is the state a saved preset would then persist.
 */
export function resolveOutputForSubject(
  category: SubjectCategory,
  subject: SheetSubject,
  output: OutputConfig,
  from: { readonly category: SubjectCategory; readonly subject: SheetSubject },
): OutputConfig {
  // The sheet mode does not survive a change of subject unchanged: the modes are category-scoped and
  // then narrowed by the base, and a stale one is how a character came to be described by a tileset's
  // inventory. `resolveMode` keeps the current mode wherever the new subject also supports it —
  // switching CHARACTER → CREATURE should not silently reset a cut-out rig — and falls back only
  // where it genuinely cannot be honoured.
  const directionalMode = resolveMode(category, subject, output.directionalMode);
  // The direction set, which used to survive untouched: switching to INTERFACE re-resolved the mode
  // and left `directions` on `THREE_CLASSIC`, so the panel offered "Split into 3 sheets" and the
  // first of those asked for a button at object yaw 45°. `resolveDirectionSet` keeps the set
  // wherever the new subject can be turned to it — seven of the thirteen categories can be turned to
  // all of them — and falls back only where it cannot.
  //
  // It is resolved before the rig rather than after it because the rig now reads the pairing's own
  // *sheets*, and which sheets a pairing has is a property of the chosen set as well as of the
  // pairing.
  const directions = resolveDirectionSet(category, output.directions);
  // The rig travels with the mode, for the same reason and against the same table: a rig is a claim
  // about how the subject is built, so it does not survive becoming a different kind of subject.
  // `resolveRigMode` keeps a cut-out rig across CHARACTER → CREATURE and drops it to `NONE` on the
  // nine categories that articulate about nothing, and on a base that has no pivot — which is what
  // stops a preset saved after such a change persisting a rig its own subject has no joints for. It
  // reads the sheets resolved from the two lines above rather than the stored fields, because they
  // decide the rig outright in both directions: a change that keeps the cut-out rig sheet keeps the
  // rig its inventory is made of, and one that lands on a pairing of posed variants drops a cut-out
  // rig those variants forbid.
  const rigMode = resolveRigMode(
    category,
    subject,
    sheetSeriesFor(category, subject, directionalMode, directions),
    output.rigMode,
  );
  // And the projection, the fourth of the claims a category can refuse. It is the one that failed
  // loudest: an INTERFACE arriving from a default session kept `THREE_QUARTER_TOPDOWN` and compiled
  // `Angled overhead … the vertical screen axis carries both height and depth` above an inventory of
  // button states, which is a prompt contradicting itself rather than merely asking for a degenerate
  // batch. `resolveProjection` keeps the camera wherever the new subject can be drawn under it — nine
  // of the thirteen categories can be drawn under all of them — and falls back only where it cannot.
  const projection = resolveProjection(category, output.projection);
  // The elevation follows the *resolved* projection rather than the stored one, because the two are
  // one statement about one camera: a projection narrowed to `ORTHOGRAPHIC_FRONT` beside a stored
  // 35° is exactly the disagreement `elevation.ts` exists to end.
  const cameraElevation = resolveCameraElevation(projection, output.cameraElevation);
  // And the art style reference, which is the projection's second door: a reference states the
  // camera it was rendered under and carries it into section 2 as a measurement, so a look the new
  // subject cannot be drawn to goes rather than standing over a camera that contradicts it.
  const styleReference = resolveStyleReference(category, output.styleReference);
  // The rig CONTRACT, which is the seventh claim and the only one that is a document rather than a
  // choice between values this app offers. It names one skeleton — these fifteen slots, at these
  // sizes, jointed at these ends — so unlike the rig MODE it cannot survive becoming another kind of
  // subject. `resolveRigMode` deliberately keeps a cut-out rig across CHARACTER → CREATURE, and a
  // contract carried along with it hands a quadruped a human skeleton: section 4 lists
  // `left-upper-arm` directly above a plan whose own prose ends a body "at the neck join, the two
  // forelimb shoulder joins and the join to the hindquarters". Nothing downstream reports it, because
  // a contract replaces the inventory outright and fifteen pieces is fifteen pieces to every counter
  // this app has.
  //
  // So it survives exactly two things: staying on the plans it was loaded under, and a rig still cut
  // out. It is dropped rather than re-resolved because no table here could judge it — this app
  // cannot tell a humanoid contract from a creature's, and both are valid documents. A reader who
  // wants theirs on the new subject loads it again, which is the one act that says which subject it
  // is for.
  const samePlans = plansFor(from.category, from.subject) === plansFor(category, subject);
  const rigContract = samePlans && rigMode === 'CUTOUT_RIG' ? output.rigContract : null;

  // The sheet of the series goes back to the first whether or not the mode survives, because the
  // series is keyed on the *pairing* and the base: a subject the mode still supports can have a
  // shorter series, so a CHARACTER left on sheet two and switched to an OBJECT would hold an index that
  // pairing does not have. The compiler resolves such an index rather than trusting it, so this is not
  // what makes the prompt correct — it is what stops a saved preset persisting a sheet nobody can
  // select, since the sheet control is hidden for a single-sheet series and could not put it back.
  if (
    directionalMode === output.directionalMode &&
    rigMode === output.rigMode &&
    directions === output.directions &&
    projection === output.projection &&
    cameraElevation === output.cameraElevation &&
    styleReference === output.styleReference &&
    rigContract === output.rigContract &&
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
    rigContract,
    // Cleared with the set exactly as the control clears it, and only then: a facing pinned against
    // `THREE_CLASSIC` is one `SINGLE_FRONT` never turns to, and leaving it behind would let a preset
    // saved from here persist a facing its own set does not contain.
    primaryDirection: directions === output.directions ? output.primaryDirection : null,
    sheetIndex: 0,
  };
}
