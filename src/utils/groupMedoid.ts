import type { SpriteBox } from '../types/quantiser.ts';
import { spriteDistance } from './spriteEquality.ts';

/**
 * The member of a duplicate group that every other member is folded onto: its medoid, the member
 * whose summed distance to the rest of the group is least.
 *
 * **The source is chosen by consensus, not by position.** Folding from the group's earliest sprite
 * made that sprite's flaws everyone's: four copies of one frame, the first carrying a one-pixel
 * defect, came out of the fold as four defective frames. The medoid is the copy the others agree
 * with most, so a flaw only one copy carries leaves that copy furthest from the rest and out of the
 * running. It also answers the chaining the grouping allows — a chain of three each within the
 * tolerance of the next can span twice it, and the medoid of such a chain is its middle rather than
 * one of its ends.
 *
 * **A real member rather than a per-pixel vote.** A vote builds a drawing no copy holds, over boxes
 * that need not share an extent, and it has no answer at all where every copy came back a shade
 * apart — every cell is then a tie, which is the near-duplicate case the tolerance exists for. The
 * medoid is always artwork the sheet already holds, measured in the same distance the group was
 * formed by.
 *
 * **Ties go to the earliest member**, so a group of two, which has no majority either way, folds
 * onto its first sprite as it always did, and two runs at the same settings agree.
 *
 * **A byte-identical class is measured once and weighted by its size**, since every one of its
 * members stands at the same distance from everything else. A strip of twenty repeats and one stray
 * frame is therefore one measurement rather than two hundred and ten, and the twenty win. The worst
 * case is a group whose members all differ, where this is a full distance for every pair: at
 * `SCATTERED_SPRITE_CEILING` that is the same order of work as the grouping walk at its dearest
 * rung, which `duplicateSprites` records.
 *
 * Pure. `members` are indices into `boxes` in reading order, and `identical` maps each index to the
 * first index of its byte-identical class, as `duplicateSprites` builds it. Returns an index from
 * `members`.
 */
export function groupMedoid(
  image: ImageData,
  boxes: readonly SpriteBox[],
  members: readonly number[],
  identical: readonly number[],
): number {
  // Each class once, in reading order: a class is named after its earliest member, and every member
  // of a class is in the same group, so the first time a class appears is at that member.
  const weight = new Map<number, number>();
  for (const member of members) {
    const kind = identical[member] ?? member;
    weight.set(kind, (weight.get(kind) ?? 0) + 1);
  }
  const classes = [...weight.keys()];
  const totals = classes.map(() => 0);

  for (const [position, left] of classes.entries()) {
    for (let step = position + 1; step < classes.length; step += 1) {
      const right = classes[step];
      if (right === undefined) continue;
      const distance = spriteDistance(image, boxes[left], boxes[right]);
      totals[position] = (totals[position] ?? 0) + distance * (weight.get(right) ?? 0);
      totals[step] = (totals[step] ?? 0) + distance * (weight.get(left) ?? 0);
    }
  }

  // Strictly less, so a tie keeps the earlier class — see the docblock.
  let best = 0;
  for (let position = 1; position < classes.length; position += 1) {
    if ((totals[position] ?? Infinity) < (totals[best] ?? Infinity)) best = position;
  }
  return classes[best] ?? members[0] ?? 0;
}
