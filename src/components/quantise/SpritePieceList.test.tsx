import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SPRITE_ASSIGNMENT_GUIDANCE } from '../../constants/spriteAssignment.ts';
import { useSpriteAssignmentStore } from '../../stores/useSpriteAssignmentStore.ts';
import type { SpriteBox } from '../../types/quantiser.ts';
import { resolveAssignment } from '../../utils/spriteAssignment.ts';
import { SpritePieceList } from './SpritePieceList.tsx';

/**
 * The panel half of which-sprite-is-which: the name each piece will be written as, and the control
 * that changes it.
 *
 * The resolution itself is pinned in `utils/spriteAssignment.test.ts`. What can only be checked here
 * is that the control actually reaches the store and that what the row *shows* is the name the file
 * will carry — which is the whole claim the feature makes, and the one a pure test cannot make.
 */

function boxAt(left: number): SpriteBox {
  return { left, top: 0, width: 4, height: 4, pixels: 16 };
}

const BOXES = [boxAt(0), boxAt(10), boxAt(20)];
const INVENTORY = ['arm-left', 'arm-right', 'torso'];

/** The list over the current store state, re-resolved exactly as `useSpriteAssignment` does. */
function show(inventory: readonly string[] = INVENTORY) {
  const { edits } = useSpriteAssignmentStore.getState();
  render(<SpritePieceList assignment={resolveAssignment(BOXES, edits, inventory)} inventory={inventory} />);
}

beforeEach(() => {
  useSpriteAssignmentStore.getState().forget();
});

describe('SpritePieceList', () => {
  it('shows each sprite the name the download will write for it', () => {
    show();

    // `ignore: 'option'` because every inventory name is also an option in every row's select. What
    // is being checked is the chip — the name this sprite's piece will actually be written as.
    expect(screen.getByText('arm-left', { ignore: 'option' })).toBeInTheDocument();
    expect(screen.getByText('torso', { ignore: 'option' })).toBeInTheDocument();
    expect(screen.getByText('named in reading order')).toBeInTheDocument();
  });

  it('names each row for its sprite, so fifteen controls are fifteen names', () => {
    // Repeating one label down a list leaves a screen-reader user hearing the same name at every
    // row with nothing saying which sprite each would change.
    show();

    expect(screen.getByRole('combobox', { name: 'Sprite 1' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sprite 3' })).toBeInTheDocument();
  });

  it('records a name the reader chooses against that sprite', async () => {
    show();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sprite 2' }), 'name:torso');

    expect(useSpriteAssignmentStore.getState().edits).toStrictEqual([
      // Pinned to the centre of the box it was made on, so the decision survives a dial that re-cuts
      // the sheet — see `spritePin`.
      { pin: { x: 12, y: 2 }, decision: { kind: 'NAME', name: 'torso' } },
    ]);
  });

  it('offers leaving a sprite out and joining it to another from the same control', async () => {
    show();
    const second = screen.getByRole('combobox', { name: 'Sprite 2' });

    // One per row, because every sprite can be left out.
    expect(screen.getAllByRole('option', { name: 'Leave out' })).toHaveLength(BOXES.length);
    await userEvent.selectOptions(second, 'leave-out');

    expect(useSpriteAssignmentStore.getState().edits[0]?.decision).toStrictEqual({ kind: 'LEAVE_OUT' });
  });

  it('never offers joining a sprite to itself', () => {
    show();

    // Three sprites, so two of the three rows offer a join to sprite 2 and the sprite-2 row does not.
    expect(screen.getAllByRole('option', { name: 'Join to sprite 2' })).toHaveLength(BOXES.length - 1);
  });

  it('says what is standing between the sheet and its names', () => {
    show(['arm-left', 'arm-right']);

    expect(screen.getByText(SPRITE_ASSIGNMENT_GUIDANCE.over)).toBeInTheDocument();
    expect(screen.getByText('numbered — the pieces do not match the inventory')).toBeInTheDocument();
  });

  it('numbers every piece where one name reached two of them, and says why', () => {
    const { decide } = useSpriteAssignmentStore.getState();
    decide({ x: 2, y: 2 }, { kind: 'NAME', name: 'torso' });
    decide({ x: 12, y: 2 }, { kind: 'NAME', name: 'torso' });
    show();

    expect(screen.getByText(SPRITE_ASSIGNMENT_GUIDANCE.duplicated)).toBeInTheDocument();
    // The chips show what will actually be written, not the choice that cannot be honoured. The
    // choice itself is still in the list, as the value of the two selects that carry it.
    expect(screen.getByText('sprite-1', { ignore: 'option' })).toBeInTheDocument();
    expect(screen.queryByText('torso', { ignore: 'option' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sprite 1' })).toHaveValue('name:torso');
  });

  it('offers nothing to clear until there is something to take back', async () => {
    show();
    expect(screen.queryByRole('button', { name: 'Clear the choices' })).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sprite 1' }), 'leave-out');
    show();
    await userEvent.click(screen.getAllByRole('button', { name: 'Clear the choices' })[0] as HTMLElement);

    expect(useSpriteAssignmentStore.getState().edits).toStrictEqual([]);
  });
});
