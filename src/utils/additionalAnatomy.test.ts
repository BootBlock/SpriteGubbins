import { describe, expect, it } from 'vitest';
import { MAX_ANATOMY_MULTIPLIER, NO_ADDITIONAL_ANATOMY } from '../constants/anatomy.ts';
import {
  countAnatomyComponents,
  formatAnatomyComponent,
  parseAdditionalAnatomy,
} from './additionalAnatomy.ts';

/**
 * The parse is what makes the exact-count contract survive additional anatomy. Every case below is
 * one a wrong answer turns into a sheet asking for a number of pieces it does not draw.
 */

describe('parseAdditionalAnatomy', () => {
  it('reads nothing from an empty field or the NONE sentinel', () => {
    // Two different statements — "you decide" and "there is none" — with the same consequence for
    // the count, and neither may add a component.
    expect(parseAdditionalAnatomy('')).toEqual([]);
    expect(parseAdditionalAnatomy('   ')).toEqual([]);
    expect(parseAdditionalAnatomy(NO_ADDITIONAL_ANATOMY)).toEqual([]);
    expect(parseAdditionalAnatomy('none')).toEqual([]);
  });

  it('still reads nothing when the sentinel carries a multiplier', () => {
    // Reachable by typing: every pool ships `NONE` beside `×N` options, so a user editing the field
    // from one to the other passes through `NONE ×2`. Testing the sentinel before the multiplier
    // came off would have made that two components named "NONE".
    expect(parseAdditionalAnatomy('NONE ×2')).toEqual([]);
    expect(parseAdditionalAnatomy('none x3, NONE')).toEqual([]);
  });

  it('counts an unqualified name as one component', () => {
    expect(parseAdditionalAnatomy('Serpentine Tail')).toEqual([{ name: 'Serpentine Tail', count: 1 }]);
  });

  it('reads a trailing multiplier as the count, and keeps the name clean', () => {
    expect(parseAdditionalAnatomy('Mechanical Wing ×2')).toEqual([{ name: 'Mechanical Wing', count: 2 }]);
    expect(parseAdditionalAnatomy('Mechanical Wing x2')).toEqual([{ name: 'Mechanical Wing', count: 2 }]);
    expect(parseAdditionalAnatomy('Mechanical Wing *2')).toEqual([{ name: 'Mechanical Wing', count: 2 }]);
    expect(parseAdditionalAnatomy('Insectoid Wing×4')).toEqual([{ name: 'Insectoid Wing', count: 4 }]);
  });

  it('does not read a trailing letter of a name as a multiplier', () => {
    // A bare `x` needs whitespace in front of it, or `Vortex 2` and every other name ending in x
    // would silently lose its last character.
    expect(parseAdditionalAnatomy('Vortex')).toEqual([{ name: 'Vortex', count: 1 }]);
    expect(parseAdditionalAnatomy('Phalanx 2')).toEqual([{ name: 'Phalanx 2', count: 1 }]);
  });

  it('splits a comma-separated list in the order it is written', () => {
    // Order is load-bearing: these are appended to the inventory, and reading order is the only
    // thing that identifies a cell on a sheet that may carry no labels.
    expect(parseAdditionalAnatomy('Demon Horn ×2, Tail ×1')).toEqual([
      { name: 'Demon Horn', count: 2 },
      { name: 'Tail', count: 1 },
    ]);
  });

  it('drops empty entries and a NONE mixed into a list', () => {
    expect(parseAdditionalAnatomy('Tail ×1, , NONE, Wing ×2')).toEqual([
      { name: 'Tail', count: 1 },
      { name: 'Wing', count: 2 },
    ]);
  });

  it('always takes an unusable multiplier off the name', () => {
    // The entry text the generator reads must never carry two different counts. `- Tail ×007 ×1.`
    // is an instruction to draw seven and an instruction to draw one, in one line — precisely the
    // silently-wrong sheet the component count exists to catch.
    expect(parseAdditionalAnatomy('Tail ×007')).toEqual([{ name: 'Tail', count: 7 }]);
    expect(parseAdditionalAnatomy('Tail ×0')).toEqual([{ name: 'Tail', count: 1 }]);
  });

  it('names nothing, and so counts nothing, for a bare multiplier', () => {
    expect(parseAdditionalAnatomy('×3')).toEqual([]);
    expect(parseAdditionalAnatomy('Tail ×1, ×3')).toEqual([{ name: 'Tail', count: 1 }]);
  });

  it('drops a bare `x`-form count too, which the multiplier pattern cannot see', () => {
    // `x3` alone never matches `MULTIPLIER` — that pattern demands whitespace before a bare `x` so
    // `Vortex` keeps its last letter — so without a second check it survived as a component named
    // `x3`, raising the sheet's stated count by one for a piece with no described shape.
    expect(parseAdditionalAnatomy('x3')).toEqual([]);
    expect(parseAdditionalAnatomy('*3')).toEqual([]);
    expect(parseAdditionalAnatomy('3')).toEqual([]);
    expect(parseAdditionalAnatomy('Tail ×1, x3')).toEqual([{ name: 'Tail', count: 1 }]);
    // And a real name that merely contains digits is untouched.
    expect(parseAdditionalAnatomy('Arm 2')).toEqual([{ name: 'Arm 2', count: 1 }]);
  });

  it('holds the count inside a range a sheet can actually be drawn to', () => {
    // The atlas preview allocates one cell per component, so an unbounded multiplier turns a typo
    // into a frozen tab — and a large enough one into an `Array.from` that throws during render,
    // with no error boundary above it.
    expect(parseAdditionalAnatomy('Tail ×5000000000')).toEqual([
      { name: 'Tail', count: MAX_ANATOMY_MULTIPLIER },
    ]);
    // 309-plus digits overflow to Infinity, which would otherwise reach the prompt as
    // "Exactly Infinity components".
    const overflow = parseAdditionalAnatomy(`Tail ×${'9'.repeat(400)}`);
    expect(overflow).toEqual([{ name: 'Tail', count: MAX_ANATOMY_MULTIPLIER }]);
    expect(Number.isSafeInteger(countAnatomyComponents(overflow))).toBe(true);
  });

  it('never produces an entry that draws nothing', () => {
    for (const component of parseAdditionalAnatomy('Tail ×0, ×3, Wing ×2, Horn')) {
      expect(component.count).toBeGreaterThan(0);
      expect(component.name).not.toBe('');
    }
  });
});

describe('countAnatomyComponents', () => {
  it('sums the multipliers rather than the entries', () => {
    // The distinction the whole feature turns on: "Demon Horn ×2, Tail ×1" is two entries and three
    // components, and it is the three that section 0 must state.
    expect(countAnatomyComponents(parseAdditionalAnatomy('Demon Horn ×2, Tail ×1'))).toBe(3);
    expect(countAnatomyComponents(parseAdditionalAnatomy(NO_ADDITIONAL_ANATOMY))).toBe(0);
  });
});

describe('formatAnatomyComponent', () => {
  it('states the count it was given, and leaves the name alone', () => {
    // Section 1's line and section 4's entries both render through this, which is what stops the
    // prompt describing one set of anatomy at the top and another in the inventory.
    expect(formatAnatomyComponent({ name: 'Demon Horn', count: 2 })).toBe('Demon Horn ×2');
    // Re-casing free text would corrupt it for no gain: `toUpperCase` is a full case fold, so a
    // leading ß would come back as SS.
    expect(formatAnatomyComponent({ name: 'ßody plate', count: 1 })).toBe('ßody plate ×1');
  });
});
