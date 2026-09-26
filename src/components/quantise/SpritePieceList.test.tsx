import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SCATTERED_SPRITE_CEILING } from '../../constants/quantiser.ts';
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
function show(inventory: readonly string[] = INVENTORY, boxes: readonly SpriteBox[] = BOXES) {
  const { edits } = useSpriteAssignmentStore.getState();
  render(
    <SpritePieceList
      assignment={resolveAssignment(boxes, edits, inventory)}
      inventory={inventory}
      busy={false}
    />,
  );
}

/** `count` sprites along one row, so each sits in its own place in the reading order. */
function row(count: number): SpriteBox[] {
  return Array.from({ length: count }, (_, index) => boxAt(index * 10));
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

  it('marks the selected sprite’s row as current, not only with a border', () => {
    // A forced palette erases the border and tint, and repaints a selection only where the
    // `index.css` rule finds a marker such as `aria-current`.
    useSpriteAssignmentStore.getState().select({ x: 12, y: 2 });
    show();

    const current = document.querySelectorAll('[aria-current]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute('aria-current', 'true');
    expect(current[0]).toContainElement(screen.getByRole('combobox', { name: 'Sprite 2' }));
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

  it('offers leaving a sprite out from the same control', async () => {
    show();
    const second = screen.getByRole('combobox', { name: 'Sprite 2' });

    // One per row, because every sprite can be left out.
    expect(screen.getAllByRole('option', { name: 'Leave out' })).toHaveLength(BOXES.length);
    await userEvent.selectOptions(second, 'leave-out');

    expect(useSpriteAssignmentStore.getState().edits[0]?.decision).toStrictEqual({ kind: 'LEAVE_OUT' });
  });

  it('joins a sprite to the one whose number the reader types', async () => {
    show();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sprite 2' }), 'join');

    // Choosing to join names no partner yet, so nothing is recorded until one is typed.
    expect(useSpriteAssignmentStore.getState().edits).toStrictEqual([]);
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Sprite 2 joined to' }), '3');

    expect(useSpriteAssignmentStore.getState().edits).toStrictEqual([
      // Pinned to the centre of sprite 3's box, not to the number, so the join survives a re-cut
      // that renumbers the sheet.
      { pin: { x: 12, y: 2 }, decision: { kind: 'JOIN', to: { x: 22, y: 2 } } },
    ]);
  });

  it('shows a join that holds as the join option and its partner’s number', () => {
    useSpriteAssignmentStore.getState().decide({ x: 22, y: 2 }, { kind: 'JOIN', to: { x: 2, y: 2 } });
    show();

    expect(screen.getByRole('combobox', { name: 'Sprite 3' })).toHaveValue('join');
    expect(screen.getByRole('spinbutton', { name: 'Sprite 3 joined to' })).toHaveValue(1);
    // Only the row that holds a join asks for a partner.
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1);
  });

  it('takes the reader to the partner field as soon as they choose to join', async () => {
    show();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sprite 2' }), 'join');

    expect(screen.getByRole('spinbutton', { name: 'Sprite 2 joined to' })).toHaveFocus();
  });

  it('ends a join left with no partner, and shows the decision still in force', async () => {
    // Choosing to join records nothing, so a name or a leave-out stands until a partner is typed. A
    // select still saying “join” after the reader moved on would be describing a decision the
    // download is not applying.
    useSpriteAssignmentStore.getState().decide({ x: 12, y: 2 }, { kind: 'LEAVE_OUT' });
    show();
    const second = screen.getByRole('combobox', { name: 'Sprite 2' });
    await userEvent.selectOptions(second, 'join');
    await userEvent.click(document.body);

    expect(second).toHaveValue('leave-out');
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(useSpriteAssignmentStore.getState().edits[0]?.decision).toStrictEqual({ kind: 'LEAVE_OUT' });
  });

  it('keeps a join waiting while the reader opens the partner field’s own guidance', async () => {
    show();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sprite 2' }), 'join');
    // The ⓘ sits before the field, in its label row.
    await userEvent.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Guidance: Sprite 2 joined to' })).toHaveFocus();
    expect(screen.getByRole('spinbutton', { name: 'Sprite 2 joined to' })).toBeInTheDocument();
  });

  it('refuses a join to the sprite itself, and says why rather than reverting', async () => {
    show();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sprite 2' }), 'join');
    const partner = screen.getByRole('spinbutton', { name: 'Sprite 2 joined to' });
    await userEvent.type(partner, '2');

    expect(useSpriteAssignmentStore.getState().edits).toStrictEqual([]);
    expect(partner).toHaveValue(2);
    expect(partner).toHaveAccessibleDescription('A sprite cannot join itself.');
  });

  it('takes a number whose first digit is the sprite’s own', async () => {
    // A field bound to the stored number refuses the `1` of `15` on sprite 1 as a self-join and
    // snaps back, so the `5` has nothing to follow and sprite 15 can never be typed.
    show(INVENTORY, row(15));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sprite 1' }), 'join');
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Sprite 1 joined to' }), '15');

    expect(useSpriteAssignmentStore.getState().edits).toStrictEqual([
      { pin: { x: 2, y: 2 }, decision: { kind: 'JOIN', to: { x: 142, y: 2 } } },
    ]);
  });

  it('offers no join on a sheet of one sprite', () => {
    show(INVENTORY, row(1));

    expect(screen.queryByRole('option', { name: 'Join to another sprite' })).not.toBeInTheDocument();
  });

  it('mounts options in proportion to the sheet, not to its square', () => {
    // An option per partner in every row put n × (n − 1) join options on the page, 16,256 of them
    // for a 128-sprite sheet, and at the 512-sprite ceiling the test worker ran out of memory. Each
    // row offers reading order, the inventory, leave out and one join, whatever the sheet holds.
    show(INVENTORY, row(SCATTERED_SPRITE_CEILING));

    expect(document.querySelectorAll('option')).toHaveLength(
      SCATTERED_SPRITE_CEILING * (INVENTORY.length + 3),
    );
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
