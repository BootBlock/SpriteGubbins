import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteDecision, SpriteEdit, SpritePin } from '../types/spriteAssignment.ts';
import { locateSprite } from './spritePin.ts';
import { disjointSet } from './unionFind.ts';

/**
 * The sheet's sprites grouped into the pieces a download writes, by what the reader said about them.
 *
 * The half of an assignment that is about *shape* rather than about names: which sprites are one
 * drawing, which are left out, and what the resulting box is. `pieceNames.ts` is the other half, and
 * `spriteAssignment.ts` puts the two together — kept apart because a reader who only joins two
 * fragments has changed the pieces without touching a single name, and the naming rule has to run
 * over whatever this produces rather than beside it.
 *
 * **A decision is matched to a sprite by its own pin first and by containment second**, and claims
 * that sprite so no later decision can take it — see `locateSprite`, which is where that ordering is
 * argued. Everything unmatched is counted into `lost` and dropped: a join whose partner has gone, a
 * decision whose sprite has gone, and the second of two decisions that a merge has landed on one
 * sprite.
 *
 * **Joins are transitive**, through the same `disjointSet` the duplicate and gap passes use. Three
 * fragments of one blade joined in a chain come back as one piece, and the group's root is its
 * lowest index, which is its earliest sprite in reading order.
 *
 * Pure, as everything in this directory is.
 */

/** One piece before it has a name: what it is cut to, what it is made of, and what it may be called. */
export interface ShapedPiece {
  readonly box: SpriteBox;
  /** The index of each member in the segmentation's own list, in reading order. */
  readonly memberIndices: readonly number[];
  /** The inventory name a member claimed, or `null` where nobody claimed one. */
  readonly claimed: string | null;
}

/** The grouping, the decision that survived for each sprite, and what did not survive at all. */
export interface ShapedSheet {
  readonly pieces: readonly ShapedPiece[];
  /** One entry per sprite: its piece as an index into {@link pieces}, or `null` where it is left out. */
  readonly pieceOf: readonly (number | null)[];
  /** One entry per sprite: the decision that reached it, or `null` where reading order decides. */
  readonly decisions: readonly (SpriteDecision | null)[];
  /**
   * One entry per sprite: the pin its surviving decision is filed under, or `null` where it has none.
   *
   * **What a reader has to hand back to change their mind.** The store files an edit under the pin
   * the sprite had when the decision was made, and a dial that re-cut the sheet moves the sprite's
   * current pin away from it — so a second decision sent under the *current* pin was filed as a
   * second edit, and resolution then dropped it as a decision with no sprite left to claim. The
   * reader's new choice vanished and the panel blamed them for it. See `useSpriteAssignmentStore`,
   * which replaces by this pin.
   */
  readonly decidedAt: readonly (SpritePin | null)[];
  /**
   * One entry per sprite: which sprite it is directly joined to now, or `null` where it is not.
   *
   * Resolved rather than left to the caller to re-derive from the decision's stored pin, for the
   * reason above: that pin is where the partner *was*. A control offering a choice per sprite has to
   * be able to say which of the sprites on screen this one points at.
   */
  readonly joinTarget: readonly (number | null)[];
  readonly lost: number;
}

export function shapeSheet(boxes: readonly SpriteBox[], edits: readonly SpriteEdit[]): ShapedSheet {
  const decisions: (SpriteDecision | null)[] = boxes.map(() => null);
  const decidedAt: (SpritePin | null)[] = boxes.map(() => null);
  const claimed = new Set<number>();
  let lost = 0;

  for (const edit of edits) {
    const index = locateSprite(boxes, edit.pin, claimed);
    // A decision that can claim no sprite of its own is the sprite it was made on having gone — or
    // having been merged into one an earlier decision already holds. Either way it is counted lost
    // rather than overwriting a decision the panel and the preview have been showing.
    if (index === null) {
      lost += 1;
      continue;
    }
    claimed.add(index);
    decisions[index] = edit.decision;
    decidedAt[index] = edit.pin;
  }

  const groups = disjointSet(boxes.length);
  const joinTarget: (number | null)[] = boxes.map(() => null);
  for (const [index, decision] of decisions.entries()) {
    if (decision?.kind !== 'JOIN') continue;
    // No `claimed` here: a sprite may be the target of a join without that spending it, and several
    // fragments may point at the same one. What is exclusive is holding a decision, not being named
    // by one.
    const partner = locateSprite(boxes, decision.to);
    // A join to a sprite that is no longer there, or to itself, is a decision that now says nothing.
    // It is dropped whole — the sprite goes back to being its own piece — rather than left as a
    // grouping of one, which would read on screen as a join that had worked.
    if (partner === null || partner === index) {
      decisions[index] = null;
      decidedAt[index] = null;
      lost += 1;
      continue;
    }
    joinTarget[index] = partner;
    groups.union(index, partner);
  }

  return buildPieces(boxes, decisions, decidedAt, joinTarget, groups, lost);
}

/** The grouping turned into pieces, in reading order of each piece's earliest surviving member. */
function buildPieces(
  boxes: readonly SpriteBox[],
  decisions: readonly (SpriteDecision | null)[],
  decidedAt: readonly (SpritePin | null)[],
  joinTarget: readonly (number | null)[],
  groups: ReturnType<typeof disjointSet>,
  lost: number,
): ShapedSheet {
  // Keyed by the group's root, which `disjointSet` guarantees is its lowest index — so walking the
  // sprites in index order inserts the pieces in reading order too, and each piece's members arrive
  // in it. A root that is itself left out still keys its group; what orders the pieces is the first
  // *surviving* member, which is the one the panel numbers them by.
  const byRoot = new Map<number, number[]>();
  for (const [index] of boxes.entries()) {
    if (decisions[index]?.kind === 'LEAVE_OUT') continue;
    const root = groups.find(index);
    const members = byRoot.get(root);
    if (members === undefined) byRoot.set(root, [index]);
    else members.push(index);
  }

  const pieceOf: (number | null)[] = boxes.map(() => null);
  const pieces = [...byRoot.values()].map((memberIndices, piece) => {
    for (const index of memberIndices) pieceOf[index] = piece;
    const members = memberIndices.map((index) => boxes[index]).filter(isBox);
    return {
      box: joinBoxes(members),
      memberIndices,
      claimed: claimedName(memberIndices, decisions),
    };
  });

  return { pieces, pieceOf, decisions, decidedAt, joinTarget, lost };
}

/** The earliest member's chosen name, which is the one the piece answers to. */
function claimedName(
  memberIndices: readonly number[],
  decisions: readonly (SpriteDecision | null)[],
): string | null {
  for (const index of memberIndices) {
    const decision = decisions[index];
    if (decision?.kind === 'NAME') return decision.name;
  }
  return null;
}

/**
 * The bounding box of a group, carrying the artwork of all of it.
 *
 * The pixel counts are summed rather than re-measured because the segmentation's pieces are
 * connected components of one pass — no two of them hold the same pixel — so the sum is exact and
 * not an estimate. It is what the speck floor and the panel's largest-sprite reading are stated in.
 */
function joinBoxes(members: readonly SpriteBox[]): SpriteBox {
  const left = Math.min(...members.map((box) => box.left));
  const top = Math.min(...members.map((box) => box.top));
  return {
    left,
    top,
    width: Math.max(...members.map((box) => box.left + box.width)) - left,
    height: Math.max(...members.map((box) => box.top + box.height)) - top,
    pixels: members.reduce((total, box) => total + box.pixels, 0),
  };
}

/** Narrows away the `undefined` an index lookup admits; every index here came from the list itself. */
function isBox(box: SpriteBox | undefined): box is SpriteBox {
  return box !== undefined;
}
