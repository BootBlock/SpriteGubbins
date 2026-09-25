import { beforeEach, describe, expect, it } from 'vitest';
import { useSpriteAssignmentStore } from './useSpriteAssignmentStore.ts';

const FIRST = { x: 2, y: 2 };
const SECOND = { x: 12, y: 2 };

beforeEach(() => {
  useSpriteAssignmentStore.getState().forget();
});

describe('useSpriteAssignmentStore', () => {
  it('records one decision per sprite, and replaces rather than stacking', () => {
    const { decide } = useSpriteAssignmentStore.getState();
    decide(FIRST, { kind: 'NAME', name: 'torso' });
    decide(FIRST, { kind: 'LEAVE_OUT' });

    expect(useSpriteAssignmentStore.getState().edits).toStrictEqual([
      { pin: FIRST, decision: { kind: 'LEAVE_OUT' } },
    ]);
  });

  it('keeps a replaced decision in the place the reader first spoke about that sprite', () => {
    // The list's order is what `shapeSheet` breaks a tie by — two decisions that a later merge lands
    // on one sprite, where the earlier keeps it. Changing one's mind about a name should not move
    // that sprite to the back of the queue and hand the sprite to somebody else's decision.
    const { decide } = useSpriteAssignmentStore.getState();
    decide(FIRST, { kind: 'NAME', name: 'torso' });
    decide(SECOND, { kind: 'LEAVE_OUT' });
    decide(FIRST, { kind: 'NAME', name: 'arm-left' });

    expect(useSpriteAssignmentStore.getState().edits.map((edit) => edit.pin)).toStrictEqual([FIRST, SECOND]);
  });

  it('drops the edit entirely when the reader goes back to the reading order', () => {
    const { decide } = useSpriteAssignmentStore.getState();
    decide(FIRST, { kind: 'NAME', name: 'torso' });
    decide(FIRST, null);

    expect(useSpriteAssignmentStore.getState().edits).toStrictEqual([]);
  });

  it('holds the selection apart from the decisions, so clicking a sprite changes nothing', () => {
    const { decide, select } = useSpriteAssignmentStore.getState();
    decide(FIRST, { kind: 'NAME', name: 'torso' });
    select(SECOND);

    expect(useSpriteAssignmentStore.getState().selected).toStrictEqual(SECOND);
    expect(useSpriteAssignmentStore.getState().edits).toHaveLength(1);
  });

  it('asks for the selected sprite’s row once per selection, and settles when it is shown', () => {
    // The scroll answers the click, so it is filed by `select` alone and a remounted row that is
    // still selected finds nothing owed.
    const { select, revealed } = useSpriteAssignmentStore.getState();
    select(SECOND);
    expect(useSpriteAssignmentStore.getState().reveal).toStrictEqual(SECOND);

    revealed();
    expect(useSpriteAssignmentStore.getState().reveal).toBeNull();
    expect(useSpriteAssignmentStore.getState().selected).toStrictEqual(SECOND);

    select(null);
    expect(useSpriteAssignmentStore.getState().reveal).toBeNull();
  });

  it('forgets the decisions and the selection together', () => {
    // What a new sheet triggers. A pin is a coordinate on one result, so a decision carried over
    // would name whatever the next sheet happens to have drawn there.
    const { decide, select, forget } = useSpriteAssignmentStore.getState();
    decide(FIRST, { kind: 'NAME', name: 'torso' });
    select(FIRST);
    forget();

    expect(useSpriteAssignmentStore.getState().edits).toStrictEqual([]);
    expect(useSpriteAssignmentStore.getState().selected).toBeNull();
    expect(useSpriteAssignmentStore.getState().reveal).toBeNull();
  });
});
