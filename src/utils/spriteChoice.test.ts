import { describe, expect, it } from 'vitest';
import type { SpriteDecision } from '../types/spriteAssignment.ts';
import {
  joinChoice,
  LEAVE_OUT_CHOICE,
  nameChoice,
  READING_ORDER_CHOICE,
  spriteChoiceOf,
  spriteDecisionOf,
} from './spriteChoice.ts';

describe('spriteChoiceOf and spriteDecisionOf', () => {
  const decisions: readonly (SpriteDecision | null)[] = [
    null,
    { kind: 'LEAVE_OUT' },
    { kind: 'NAME', name: 'arm-left' },
    { kind: 'JOIN', to: { x: 12, y: 34 } },
  ];

  it.each(decisions)('round-trips %j through the value a select can hold', (decision) => {
    expect(spriteDecisionOf(spriteChoiceOf(decision))).toStrictEqual(decision);
  });

  it('tells the reading order apart from an unknown value', () => {
    // `null` is the reader taking their decision back, which the store records by dropping the edit.
    // `undefined` is a value the select never offered. The caller acts on both, differently.
    expect(spriteDecisionOf(READING_ORDER_CHOICE)).toBeNull();
    expect(spriteDecisionOf('something else')).toBeUndefined();
  });

  it('refuses a join whose coordinates are not numbers', () => {
    expect(spriteDecisionOf('join:left,top')).toBeUndefined();
    expect(spriteDecisionOf('join:12')).toBeUndefined();
  });

  it('keeps a name whole rather than splitting it', () => {
    // Slugged inventory names hold no colon today. Splitting on every colon would truncate the
    // first one that did, and the truncated name would name the wrong component in a written file.
    expect(spriteDecisionOf(nameChoice('head:south'))).toStrictEqual({
      kind: 'NAME',
      name: 'head:south',
    });
  });

  it('gives the four kinds four distinct values', () => {
    const values = new Set([
      READING_ORDER_CHOICE,
      LEAVE_OUT_CHOICE,
      nameChoice('torso'),
      joinChoice({ x: 1, y: 2 }),
    ]);

    expect(values.size).toBe(4);
  });
});
