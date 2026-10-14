import { describe, expect, it } from 'vitest';
import type { SpriteDecision } from '../types/spriteAssignment.ts';
import {
  JOIN_CHOICE,
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
  ];

  it.each(decisions)('round-trips %j through the value a select can hold', (decision) => {
    expect(spriteDecisionOf(spriteChoiceOf(decision))).toStrictEqual(decision);
  });

  it('shows every join as the one join option, whichever sprite it names', () => {
    // The partner is chosen by number beside the select, so the select's value cannot depend on it:
    // an option per partner is what put n × (n − 1) options on the page.
    expect(spriteChoiceOf({ kind: 'JOIN', to: { x: 12, y: 34 } })).toBe(JOIN_CHOICE);
    expect(spriteChoiceOf({ kind: 'JOIN', to: { x: 1, y: 2 } })).toBe(JOIN_CHOICE);
  });

  it('tells the reading order apart from a choice that is not a whole decision', () => {
    // `null` is the reader taking their decision back, which the store records by dropping the edit.
    // `undefined` is a value the select never offered, or the join, which still needs its partner.
    expect(spriteDecisionOf(READING_ORDER_CHOICE)).toBeNull();
    expect(spriteDecisionOf(JOIN_CHOICE)).toBeUndefined();
    expect(spriteDecisionOf('something else')).toBeUndefined();
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
    const values = new Set([READING_ORDER_CHOICE, LEAVE_OUT_CHOICE, nameChoice('torso'), JOIN_CHOICE]);

    expect(values.size).toBe(4);
  });

  it('cannot mistake an inventory name for the join', () => {
    // An inventory slug `join` would otherwise collide with the join option's value.
    expect(nameChoice('join')).not.toBe(JOIN_CHOICE);
  });
});
