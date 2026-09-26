import { describe, expect, it } from 'vitest';
import type { SpriteBox } from '../types/quantiser.ts';
import { sameBox } from './sameBox.ts';

const BOX: SpriteBox = { left: 4, top: 6, width: 10, height: 12, pixels: 80 };

describe('sameBox', () => {
  it('matches a copy of a box, which is what a structured clone hands back', () => {
    expect(sameBox(BOX, structuredClone(BOX))).toBe(true);
  });

  it('tells apart boxes that differ in any one field', () => {
    for (const change of [{ left: 5 }, { top: 7 }, { width: 11 }, { height: 13 }, { pixels: 81 }]) {
      expect(sameBox(BOX, { ...BOX, ...change })).toBe(false);
    }
  });
});
