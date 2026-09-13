import type { SpriteBox } from '../types/quantiser.ts';
import type { AssignedSprite, SpriteAssignment, SpriteEdit } from '../types/spriteAssignment.ts';
import { namePieces } from './pieceNames.ts';
import { shapeSheet } from './spritePieces.ts';
import { spritePin } from './spritePin.ts';

/**
 * The one reading of which sprite is which component — what the preview labels and what the file
 * records, from a single call.
 *
 * The whole feature's join: `shapeSheet` decides what the pieces *are* from the reader's joins and
 * exclusions, `namePieces` decides what they are *called*, and this puts a sprite-shaped answer back
 * beside a piece-shaped one so a panel listing sprites and a writer taking pieces are reading the
 * same result. Two derivations would agree in every state the app can reach and would be a
 * coincidence of two copies on exactly the pair this issue was about — the same argument
 * `useSheetIdentity` makes for being a hook rather than two store reads.
 *
 * Pure, as everything in this directory is; `useSpriteAssignment` is the React half that feeds it.
 */
export function resolveAssignment(
  boxes: readonly SpriteBox[],
  edits: readonly SpriteEdit[],
  inventory: readonly string[],
): SpriteAssignment {
  const shaped = shapeSheet(boxes, edits);
  const named = namePieces(shaped.pieces, inventory);

  // The first member of each piece, so the preview knows which sprite carries the label and the
  // others can say what they were joined to. Read off the pieces rather than searched for per
  // sprite, which would be quadratic on a sheet the ceiling allows 512 of.
  const leaders = new Set(shaped.pieces.map((piece) => piece.memberIndices[0]));

  const sprites: readonly AssignedSprite[] = boxes.map((box, index) => ({
    box,
    pin: spritePin(box),
    piece: shaped.pieceOf[index] ?? null,
    leads: leaders.has(index),
    decision: shaped.decisions[index] ?? null,
  }));

  return {
    sprites,
    pieces: named.pieces,
    naming: named.naming,
    // Both passes drop what the present state cannot honour, and the panel reports one figure: a
    // reader wants to know that decisions were lost, not which of two internal passes lost them.
    lost: shaped.lost + named.lost,
  };
}
