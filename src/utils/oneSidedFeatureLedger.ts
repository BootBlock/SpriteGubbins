import { signedObjectYaw } from '../constants/promptText/index.ts';
import type { Direction } from '../types/rendering.ts';

/**
 * What each of the subject's one-sided features does at each yaw this sheet covers.
 *
 * The rule it replaces asked the model to choose: *pick one feature the subject carries on one side
 * and not the other — its chirality witness — and trace that one feature through every view*. That is
 * a delegation and a prohibition at once, and measured across 27 real GPT-5.6 Sol sheets it fails in
 * both halves. It picks one, so a subject with two one-sided attributes leaves the second free — the
 * holstered sidearm held the torso and the pelvis while the head reflected, on sheet after sheet. And
 * a prohibition is a rule with the figure taken out of it: the object yaws survive the hand-off
 * because they carry degrees, and `modelWrapperText/sol.ts` records what happens to the ones that do
 * not. One composition in the pack named the undercut unprompted, in its own words, and the delivered
 * heads were a reflection with a flipped luminance difference of 10 out of 255. **Naming the witness
 * is necessary and is not sufficient.**
 *
 * What this states instead is a fact per feature per view, in the same vocabulary `FACING_TEXT` uses
 * for the same yaw — so a finished sheet can be held to it cell by cell, and section 9 asks for that
 * rather than for a choice.
 *
 * **Every feature is on the subject's left, and that is section 3's rule rather than this file's
 * guess.** Section 3 settles an unstated side before anything is drawn — "put it on the subject's
 * left — a fixed default, not a choice, because a side each sheet picks for itself is a side they
 * pick differently" — and section 6 requires the answer to hold across a whole series. None of the
 * declared pool values names a side of its own, so there is nothing here to override it. A pool value
 * that did would need this function to take the side, not a new default.
 *
 * **Two features on one flank get two identical per-facing lists, and that repetition is the
 * point.** Every declared feature is on the subject's left, so the visibility is the same for all of
 * them and the lists could be stated once for the set. They are not, because the measured failure is
 * exactly a rule stated once and applied to one feature: `S1-cardinals` carried the holster and the
 * undercut, section 9 asked for one witness, the model traced the holster and the head went on
 * reflecting. A paragraph each makes each one a thing section 9 can be asked to trace separately,
 * and OpenAI's own image guidance — quoted in `modelWrapperText/sol.ts` — is to repeat any
 * requirement that must stay fixed. The cost is measured rather than assumed: the widest shipped
 * preset that declares two features spends 482 characters on this and keeps 1,118 of its target's
 * allowance.
 *
 * **A consequence worth knowing before reading a sheet:** the classic five-view set turns the
 * subject's *right* towards the camera at every yaw it holds, so a left-sided feature is edge-on,
 * largely hidden, completely hidden, largely hidden and edge-on across those five views and is never
 * fully presented. That is true of the sheet rather than a fault in the ledger, and stating it is the
 * point — it is exactly the situation in which a generator invents a second copy on the other flank,
 * which section 3 bans in as many words.
 */
export function oneSidedFeatureLedger(
  features: readonly string[],
  covered: readonly [Direction, ...Direction[]],
  planView: boolean,
): string {
  return features.map((feature) => featureParagraph(feature, covered, planView)).join('\n\n');
}

/**
 * One feature: where it sits, and — below the vertical — what each covered yaw leaves of it.
 *
 * **The sentence is about the subject rather than about the feature, and that is what makes it
 * grammatical.** Five of the twenty declared phrases are plural compounds — `holstered sidearm and
 * pouch`, `chrome optic implant and undercut`, `cheap prosthetic eye and scarred cheek`,
 * `ink stains at the temple`, `bandages over one eye` — so a sentence whose verb agreed with the
 * *phrase* wrote "The holstered sidearm and pouch **is** on the subject's left" into the prompt on
 * CHARACTER's own default. Putting the subject in the subject position fixes the verb at `carries`
 * for all twenty, and it does so without this file having to know which phrases are plural, which
 * would be a second thing the pools had to declare and get right.
 *
 * **The opening says what no *component* carries rather than that the feature is drawn once.** A
 * draft read "it is drawn once, and never mirrored onto the other flank", which is true of the
 * subject and false of the sheet: a directional core draws the pelvis at every facing, so the
 * holster appears in as many cells as the yaw leaves it visible in. Section 5's mirroring rule is
 * the other half of the same claim — "a fitting carried on one side does not change sides between
 * the left and right sets" — and `S3-cutout-rig` failed it by duplicating the holster onto both
 * thighs, which is the reading this sentence has to close.
 */
function featureParagraph(
  feature: string,
  covered: readonly [Direction, ...Direction[]],
  planView: boolean,
): string {
  const opening = `**The subject carries the ${feature} on its left, and nowhere on its right.** No component of its right flank carries a copy of it, in any view.`;
  // A plan view occludes nothing, so there is no visibility to enumerate — what varies is where each
  // flank lands in the frame, which `PLAN_FACING_TEXT` already states per facing and section 3's own
  // plan-view bullet turns into the anti-mirroring rule. Naming the feature still matters there: the
  // reflection it forbids is the one that leaves a left-sided feature on the wrong side of the body.
  if (planView) return opening;

  const lines = covered.map((direction) => `- **${direction}** — ${visibilityAt(direction)}`);
  return `${opening}\n\n${lines.join('\n')}`;
}

/**
 * What the yaw leaves of a feature on the subject's left, in that yaw's own terms.
 *
 * Integer arithmetic on the signed yaw, as `leadingSide` is and for the same reason: at 0° and 180°
 * both flanks are edge-on and equally far, and a trigonometric test would make one of them "leading"
 * by a rounding error. The four answers are the four things a yaw can do to one flank, and each is
 * worded to agree with what `FACING_TEXT` says about that same yaw — "the left side is largely
 * hidden" at 45° off, "completely hidden" at 90° off, "squarely faces the camera" at 90° towards.
 * `oneSidedFeatureLedger.test.ts` parses those sentences and fails if the two ever part company.
 */
function visibilityAt(direction: Direction): string {
  const yaw = ((signedObjectYaw(direction) % 360) + 360) % 360;
  if (yaw === 0 || yaw === 180) {
    return 'both flanks are edge-on, so it reads only as a profile edge on the silhouette.';
  }
  if (yaw === 90) {
    return 'its own side squarely faces the camera: fully presented, and at its largest on this sheet.';
  }
  if (yaw === 270) {
    return 'its own side is turned completely away: none of it is visible. Leave it out.';
  }
  if (yaw < 180) {
    return 'its own side leads, so it reads in full, foreshortened by the turn.';
  }
  return 'its own side is largely hidden, so at most an edge of it reads.';
}
