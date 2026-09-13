import { describe, expect, it } from 'vitest';
import type { AssignedSprite } from '../types/spriteAssignment.ts';

import { spriteLabel } from './spriteLabel.ts';

const sprite = (over: Partial<AssignedSprite> = {}): AssignedSprite => ({
  box: { left: 0, top: 0, width: 4, height: 4, pixels: 16 },
  pin: { x: 2, y: 2 },
  piece: 0,
  leads: true,
  joinedTo: null,
  decision: null,
  ...over,
});

describe('spriteLabel', () => {
  it('calls a sprite by the name its piece will be written as', () => {
    expect(spriteLabel(sprite(), 'torso')).toBe('torso');
  });

  it('says a joined sprite is joined rather than repeating the piece’s name', () => {
    // Labelling both halves of a join `sprite-02` puts two chips carrying one name on the artwork,
    // which is indistinguishable from the duplicate-name error the feature exists to reveal. Found
    // by driving the tab in a browser, where the two states looked identical.
    expect(spriteLabel(sprite({ leads: false, joinedTo: 2 }), 'sprite-02')).toBe('joined to 2');
  });

  it('says a sprite is left out where it is in no piece', () => {
    expect(spriteLabel(sprite({ piece: null, leads: false }), null)).toBe('left out');
  });
});
