import { describe, expect, it } from 'vitest';
import { CATEGORY_OPTIONS } from './categories/index.ts';
import { SUBJECT_FIELD_GROUPS } from './subjectGroups.ts';
import { SUBJECT_CATEGORIES, SUBJECT_FIELD_KEYS } from '../types/subject.ts';

/**
 * The grouping's coverage contract.
 *
 * `SubjectForm` renders fields *through* these groups rather than straight off the category's own
 * list, which is what gives the panel its hierarchy — and which means a key missing from here
 * disappears from the UI **silently**. Nothing else catches it: the store still holds the value, the
 * compiler still substitutes it into the template, and the prompt still reads correctly, so the only
 * symptom is a control nobody can find. These tests are that symptom, made loud.
 */
const groupedKeys = SUBJECT_FIELD_GROUPS.flatMap((group) => group.keys);

describe('SUBJECT_FIELD_GROUPS', () => {
  it('covers every subject field exactly once', () => {
    expect([...groupedKeys].sort()).toStrictEqual([...SUBJECT_FIELD_KEYS].sort());
  });

  it('names no field twice', () => {
    expect(new Set(groupedKeys).size).toBe(groupedKeys.length);
  });

  it('gives every group a unique, namespaced id', () => {
    const ids = SUBJECT_FIELD_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Both studio panels write into one `openSections` record, so a bare `sheet` or `colour` here
    // could one day be linked to an unrelated disclosure without either call site changing.
    for (const id of ids) expect(id.startsWith('subject:')).toBe(true);
  });

  /**
   * The headings describe the *slot*, not the character category — `clothing` is "Clothing / Armour"
   * for a character and "Awning & Addons" for a building. That only works if every category actually
   * defines every key, which is the assumption `SubjectForm`'s lookup is built on.
   */
  it('resolves to a defined field in every category', () => {
    for (const category of SUBJECT_CATEGORIES) {
      const defined = new Set(CATEGORY_OPTIONS[category].fields.map((field) => field.key));
      for (const key of groupedKeys) {
        expect(defined.has(key), `${category} is missing ${key}`).toBe(true);
      }
    }
  });

  it('starts every group open — these sixteen fields are the studio’s primary task', () => {
    for (const group of SUBJECT_FIELD_GROUPS) expect(group.defaultOpen).toBe(true);
  });
});
