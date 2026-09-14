import { useMemo } from 'react';
import { useSpriteAssignmentStore } from '../stores/useSpriteAssignmentStore.ts';
import type { SpriteSegmentation } from '../types/quantiser.ts';
import type { SpriteAssignment } from '../types/spriteAssignment.ts';
import { resolveAssignment } from '../utils/spriteAssignment.ts';
import { useSheetIdentity } from './useSheetIdentity.ts';

/**
 * Which sprite is which component, read from the stores, in one place.
 *
 * **Three call sites, and they must not be able to disagree.** The preview labels each sprite with
 * the name it will be written as, the Sprites panel lists the same pieces with the controls that
 * change them, and the download writes them — which is the whole point of the feature, since a
 * preview that named a sprite one way and a manifest that named it another would be the defect
 * wearing the fix's clothes. `useSheetIdentity` is a hook for this exact argument, and this is that
 * argument over a second derivation that now sits on top of it.
 *
 * The derivation itself stays pure in `src/utils/spriteAssignment.ts`; what needs React is the store
 * reads and the memo.
 */
export function useSpriteAssignment(sprites: SpriteSegmentation | null): SpriteAssignment {
  const edits = useSpriteAssignmentStore((state) => state.edits);
  // The inventory the names come out of — the same reading the identity panel and the download take,
  // through the one hook, so a name the reader picks is a name the file can hold.
  const inventory = useSheetIdentity().names;
  // A solid or scattered sheet has no boxes at all, and both reach here as the empty list rather
  // than as a state this has to know about — see `SpriteSegmentation`, which is boxless in both.
  const boxes = sprites?.kind === 'SEGMENTED' ? sprites.boxes : EMPTY;

  return useMemo(() => resolveAssignment(boxes, edits, inventory), [boxes, edits, inventory]);
}

/** One empty list rather than a fresh one per render, so the memo above is not defeated by it. */
const EMPTY: readonly [] = [];
