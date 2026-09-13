import type { AssignedSprite } from '../types/spriteAssignment.ts';

/**
 * What one sprite is called on screen: the name it will be written as, or what became of it instead.
 *
 * **One derivation for the preview's chips and the panel's rows**, because the two sit side by side
 * and a reader compares them. Three answers, and the third is the one this exists for: a sprite
 * joined into another's piece is labelled with *what it was joined to* rather than with the piece's
 * name. Labelling both halves of a join `sprite-02` puts two chips carrying one name on the artwork,
 * which is indistinguishable from the duplicate-name error the whole feature exists to reveal —
 * found by driving the tab in a browser, where the two states looked identical.
 *
 * Pure, as everything in this directory is.
 */
export function spriteLabel(sprite: AssignedSprite, pieceName: string | null): string {
  if (sprite.piece === null || pieceName === null) return 'left out';
  if (sprite.joinedTo !== null) return `joined to ${String(sprite.joinedTo)}`;
  return pieceName;
}
