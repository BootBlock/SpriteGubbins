import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { parseSession } from './sessionParser.ts';

/**
 * A stored session comes back from browser storage, which is hand-editable and can be truncated —
 * so every field has to survive being absent or wrong. This is *not* a compatibility layer: nothing
 * here translates a retired value into a current one, it only repairs from defaults.
 */

describe('parseSession', () => {
  it('reads a well-formed session back unchanged', () => {
    const subject = { ...defaultSubjectFor('CREATURE'), species: 'Direwolf' };
    const output = { ...DEFAULT_OUTPUT_CONFIG, targetModel: 'MIDJOURNEY' as const };

    const parsed = parseSession({ category: 'CREATURE', subject, output });

    expect(parsed?.category).toBe('CREATURE');
    expect(parsed?.subject.species).toBe('Direwolf');
    expect(parsed?.output.targetModel).toBe('MIDJOURNEY');
  });

  it('rejects a session whose category is missing or unrecognised', () => {
    // The one field nothing can be repaired without: the answers are written against a category's
    // option pool, so without it there is no way to know what they mean.
    expect(parseSession({ subject: {}, output: {} })).toBeNull();
    expect(parseSession({ category: 'SPACESHIP', subject: {}, output: {} })).toBeNull();
    expect(parseSession({ category: 42, subject: {}, output: {} })).toBeNull();
  });

  it('rejects anything that is not an object', () => {
    expect(parseSession(null)).toBeNull();
    expect(parseSession(undefined)).toBeNull();
    expect(parseSession('CHARACTER')).toBeNull();
    expect(parseSession([])).toBeNull();
  });

  it('repairs a missing subject and output rather than rejecting the session', () => {
    // The category survived, so the session is interpretable; the rest falls back to that
    // category's defaults exactly as a half-written imported preset does.
    const parsed = parseSession({ category: 'BUILDING' });

    expect(parsed?.category).toBe('BUILDING');
    expect(parsed?.subject).toEqual(defaultSubjectFor('BUILDING'));
    expect(parsed?.output).toEqual(DEFAULT_OUTPUT_CONFIG);
  });

  it('repairs individual bad fields without discarding the rest', () => {
    const parsed = parseSession({
      category: 'ITEM',
      subject: { ...defaultSubjectFor('ITEM'), species: 'Warhammer', role: 42 },
      output: { ...DEFAULT_OUTPUT_CONFIG, targetModel: 'NOT_A_MODEL' },
    });

    expect(parsed?.subject.species).toBe('Warhammer');
    expect(parsed?.subject.role).toBe(defaultSubjectFor('ITEM').role);
    expect(parsed?.output.targetModel).toBe(DEFAULT_OUTPUT_CONFIG.targetModel);
  });

  it('reads a subject stored against a different category through the stored one', () => {
    // Not a migration: the category column is authoritative, so answers are interpreted against the
    // pool the session says they were written for, and anything that does not fit falls back.
    const parsed = parseSession({
      category: 'VEHICLE',
      subject: defaultSubjectFor('CHARACTER'),
      output: DEFAULT_OUTPUT_CONFIG,
    });

    expect(parsed?.category).toBe('VEHICLE');
    expect(parsed?.subject).toBeDefined();
  });
});
