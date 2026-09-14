import type { SpriteNaming, SpritePiece } from '../types/spriteAssignment.ts';
import type { ShapedPiece } from './spritePieces.ts';
import { spriteOrdinal } from './spriteOrdinal.ts';

/**
 * What each piece is called in the file, and whether the sheet counts as named at all.
 *
 * **Named means every inventory name is taken by exactly one piece.** That was always the rule; what
 * is new is that a reader can decide which piece takes which, so the rule now has two routes to the
 * same end and the manifest states which was taken — see `SpriteNaming`. A sheet that satisfies it
 * neither way takes positional names, exactly as it did before.
 *
 * **A sheet that is not fully named takes positional names for *every* piece, the claimed ones
 * included.** That looks harsh beside a reader who has correctly named eleven of twelve, and it is
 * the only honest answer: the preview's whole purpose is to show the name each sprite will be
 * written as, so a chip reading `torso` over a file that is about to be written `sprite-04` would be
 * the defect this feature exists to remove, wearing the fix's clothes. The reader's choice is still
 * on screen in the panel's own control, and the panel says what is missing.
 *
 * **A claim the inventory no longer holds is dropped and counted**, in the same breath as a decision
 * whose sprite has gone. The studio's configuration can change under a sheet — a category swap
 * rewrites the whole inventory — and a name that no longer exists cannot be given to anything.
 *
 * Pure, as everything in this directory is.
 */

/** The named pieces, how they came by their names, and the claims this inventory could not honour. */
export interface NamedPieces {
  readonly pieces: readonly SpritePiece[];
  readonly naming: SpriteNaming | null;
  readonly lost: number;
}

export function namePieces(shaped: readonly ShapedPiece[], inventory: readonly string[]): NamedPieces {
  // A claim is only a claim while the inventory still offers it. Counted as it is dropped, so the
  // panel can say a decision was lost rather than the name quietly reverting.
  const claims = shaped.map((piece) =>
    piece.claimed !== null && inventory.includes(piece.claimed) ? piece.claimed : null,
  );
  const lost = claims.filter((claim, index) => claim === null && shaped[index]?.claimed !== null).length;

  const taken = claims.filter((claim): claim is string => claim !== null);
  const duplicated = new Set(taken).size !== taken.length;
  const named = inventory.length > 0 && shaped.length === inventory.length && !duplicated;

  if (!named) return { pieces: shaped.map(positional(shaped.length)), naming: null, lost };

  // What is left for the pieces nobody named, in the inventory's own order — which is the reading
  // order section 4 of the prompt fixes. Zipped against the unclaimed pieces in *their* reading
  // order, so swapping two names leaves every other piece exactly where reading order had it.
  const spare = inventory.filter((name) => !taken.includes(name));
  let next = 0;
  const pieces = shaped.map((piece, index) => {
    const claim = claims[index];
    if (claim !== null && claim !== undefined) return { box: piece.box, name: claim };
    const name = spare[next] ?? '';
    next += 1;
    return { box: piece.box, name };
  });

  return { pieces, naming: taken.length > 0 ? 'ASSIGNED' : 'READING_ORDER', lost };
}

/**
 * The numbered name a piece takes where the sheet is not named.
 *
 * Padded to the width this sheet's own piece count needs, by the same function the pack's file names
 * take their ordinal from — so a reader matching a manifest entry to the PNG beside it is not
 * reading one piece numbered two ways. See `spriteOrdinal`.
 */
function positional(count: number): (piece: ShapedPiece, index: number) => SpritePiece {
  return (piece, index) => ({ box: piece.box, name: `sprite-${spriteOrdinal(index, count)}` });
}
