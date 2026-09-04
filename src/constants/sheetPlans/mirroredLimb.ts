import type { ComponentEntry } from '../../types/components.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { spellNumber } from '../../utils/numberWords.ts';

/**
 * The second side of a limb pair, as one entry counting the side it mirrors.
 *
 * A character's articulation sheet draws the left arm as three entries — upper arm, lower arm,
 * hand — and the right arm as a single line saying it is the same again. That line carried its own
 * total in words: `The same eight variants as the left arm, redrawn for the right side`, written out
 * beside a `count: 8` and three entries summing to eight. Three statements of one figure, none of
 * them derived, and the same sentence again for the leg and twice more in the creature spelling. A
 * fourth upper-arm variant would have made every one of them false, and no test read the words.
 *
 * **The sentence is now a function of the entries it mirrors**, so the four wordings move with the
 * side they describe or they do not move at all. The four call sites differ only in the limb noun,
 * which is what makes one builder right here rather than four near-copies: `arm` and `leg` on the
 * character, `forelimb` and `hindlimb` on the creature — the creature vocabulary being its own for
 * the reason `creature.ts` records, that a beast asked for a hand gets a humanoid one.
 *
 * **`parts` stays authored**, as {@link ComponentEntry.parts} requires and for the reason it gives:
 * mirroring the names by substituting the side into them would put the sprite manifest at the mercy
 * of a naming convention nobody stated. The loop still closes, because `sheetPlans.test.ts` already
 * holds `parts` to exactly `count` — so a variant added to the left side makes the derived count
 * disagree with the authored names, and the suite says so.
 */
export function mirroredLimb(options: {
  /** The identifier this line carries in the manifest — `right-arm`. */
  readonly label: string;
  /** The side being mirrored, as the sentence names it — `the left arm`. */
  readonly mirrors: string;
  /** The entries that side is drawn as, which is where the count comes from. */
  readonly of: readonly ComponentEntry[];
  /** What each component of this line is called, one name per component. */
  readonly parts: readonly string[];
}): ComponentEntry {
  const count = componentTotal(options.of);
  return {
    label: options.label,
    parts: options.parts,
    text: `The same ${spellNumber(count)} variants as ${options.mirrors}, redrawn for the right side`,
    count,
    kind: 'anatomy',
  };
}
