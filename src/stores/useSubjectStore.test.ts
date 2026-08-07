import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import { useSubjectStore } from './useSubjectStore.ts';

/**
 * The subject store's one piece of real logic is that a category and its answers move together —
 * every route into the store either sets both or leaves the category alone. A subject holding
 * another category's values is the failure this file exists to catch.
 */

beforeEach(() => {
  useSubjectStore.setState({
    category: DEFAULT_PRESET.category,
    subject: DEFAULT_PRESET.subject,
  });
});

afterEach(() => {
  // Restores `Math.random` where a test pinned it.
  vi.restoreAllMocks();
});

describe('useSubjectStore', () => {
  it('opens on the default preset', () => {
    const { category, subject } = useSubjectStore.getState();
    expect(category).toBe(DEFAULT_PRESET.category);
    expect(subject).toEqual(DEFAULT_PRESET.subject);
  });

  it('replaces the whole subject when the category changes', () => {
    useSubjectStore.getState().setCategory('BUILDING');

    const { category, subject } = useSubjectStore.getState();
    expect(category).toBe('BUILDING');
    expect(subject).toEqual(defaultSubjectFor('BUILDING'));
    // Specifically not carrying the character's answers over into a building's fields.
    expect(subject.species).not.toBe(DEFAULT_PRESET.subject.species);
  });

  it('sets one field without disturbing the others', () => {
    useSubjectStore.getState().setField('role', 'Bartender');

    const { subject } = useSubjectStore.getState();
    expect(subject.role).toBe('Bartender');
    expect(subject.species).toBe(DEFAULT_PRESET.subject.species);
  });

  it('accepts a value that is not in the field pool', () => {
    // The combo box is unfiltered by design — the pool suggests, it does not constrain.
    useSubjectStore.getState().setField('species', 'Sentient Filing Cabinet');
    expect(useSubjectStore.getState().subject.species).toBe('Sentient Filing Cabinet');
  });

  it('randomises every field to the top of its pool when the draw is high', () => {
    useSubjectStore.getState().setCategory('CREATURE');

    // `Math.random` is pinned so the expected result is exact rather than merely plausible. A high
    // draw selects each pool's *last* option, which is not the value the field already holds — the
    // category's defaults are every pool's *first* option — so a `randomizeSubject` that quietly
    // did nothing, or whose `undefined` guard never let an assignment through, fails here.
    // Asserting pool *membership* instead would not: the defaults are in the pool too.
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    useSubjectStore.getState().randomizeSubject();

    const { subject } = useSubjectStore.getState();
    expect(Object.keys(subject).sort()).toEqual([...SUBJECT_FIELD_KEYS].sort());
    for (const field of CATEGORY_OPTIONS.CREATURE.fields) {
      expect(subject[field.key]).toBe(field.options.at(-1));
    }
  });

  it('randomises every field to the bottom of its pool when the draw is low', () => {
    useSubjectStore.getState().setCategory('ITEM');

    // The other end of the index arithmetic: `Math.floor(0 * length)` must land on the first
    // option, never below it.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useSubjectStore.getState().randomizeSubject();

    const { subject } = useSubjectStore.getState();
    for (const field of CATEGORY_OPTIONS.ITEM.fields) {
      expect(subject[field.key]).toBe(field.options[0]);
    }
  });

  it('randomising does not change the category', () => {
    useSubjectStore.getState().setCategory('ITEM');
    useSubjectStore.getState().randomizeSubject();
    expect(useSubjectStore.getState().category).toBe('ITEM');
  });

  it('resets to the current category defaults, not the boot category', () => {
    useSubjectStore.getState().setCategory('OBJECT');
    useSubjectStore.getState().setField('role', 'Something else');
    useSubjectStore.getState().resetSubject();

    const { category, subject } = useSubjectStore.getState();
    expect(category).toBe('OBJECT');
    expect(subject).toEqual(defaultSubjectFor('OBJECT'));
  });

  it('sets a category and subject together', () => {
    const creature = defaultSubjectFor('CREATURE');
    useSubjectStore.getState().setSubject('CREATURE', creature);

    const { category, subject } = useSubjectStore.getState();
    expect(category).toBe('CREATURE');
    expect(subject).toEqual(creature);
  });
});
