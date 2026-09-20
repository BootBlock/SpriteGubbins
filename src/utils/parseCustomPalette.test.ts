import { describe, expect, it } from 'vitest';
import { CUSTOM_PALETTE_NAME_LIMIT } from '../constants/customPalette.ts';
import { parseCustomPalette } from './parseCustomPalette.ts';
import { MAX_PALETTE_ENTRIES } from './pngPalette.ts';

/**
 * The one gate a palette of the reader's own passes through, whichever route it arrived by.
 *
 * Two of them reach it: the studio's intake, which has just read a file, and the storage layer,
 * which is handed whatever a row holds. The cases below are written from the second, because it is
 * the one that can be handed anything at all — and a palette the intake builds is the same object,
 * so the first is checked by the same assertions.
 */

describe('parseCustomPalette', () => {
  it('keeps a well-formed palette as it stands', () => {
    expect(parseCustomPalette({ name: 'Dusk Harbour', entries: ['#102030', '#405060'] })).toEqual({
      name: 'Dusk Harbour',
      entries: ['#102030', '#405060'],
    });
  });

  it('spells every entry the way the rest of the app writes a colour', () => {
    // A file may write its colours however it likes. Downstream, a swatch title, a prompt entry and
    // a `.gpl` written back out all have to say the same thing about one colour.
    expect(parseCustomPalette({ name: '', entries: ['#9fd3c7'] })?.entries).toEqual(['#9FD3C7']);
  });

  it('keeps the list’s own order, which is the author’s', () => {
    const entries = ['#FFFFFF', '#102030', '#405060'];

    expect(parseCustomPalette({ name: '', entries })?.entries).toEqual(entries);
  });

  it('drops a mangled entry rather than losing the palette with it', () => {
    expect(parseCustomPalette({ name: '', entries: ['#102030', 'rust', '', '#405060'] })?.entries).toEqual([
      '#102030',
      '#405060',
    ]);
  });

  it('keeps one entry for a colour listed twice', () => {
    expect(parseCustomPalette({ name: '', entries: ['#102030', '#102030'] })?.entries).toEqual(['#102030']);
  });

  it('leaves a nameless palette nameless, since only the prompt has to call it something', () => {
    // The stored value is what the reader typed, so emptying the name field is not a control that
    // fights back. `pinnedPalette` is where a name is supplied for the sentence that needs one.
    expect(parseCustomPalette({ name: '   ', entries: ['#102030'] })?.name).toBe('');
  });

  it('clips a name long enough to become a paragraph in the middle of the prompt', () => {
    const long = 'a'.repeat(CUSTOM_PALETTE_NAME_LIMIT + 40);

    expect(parseCustomPalette({ name: long, entries: ['#102030'] })?.name).toHaveLength(
      CUSTOM_PALETTE_NAME_LIMIT,
    );
  });

  it('answers nothing for a palette with no colours left in it', () => {
    // An empty list is not a palette: pinning one would have the studio claim a palette the
    // quantiser could not honour and the prompt could not state.
    expect(parseCustomPalette({ name: 'Empty', entries: [] })).toBeNull();
    expect(parseCustomPalette({ name: 'Empty', entries: ['rust', 'orange'] })).toBeNull();
  });

  it('answers nothing past the ceiling rather than keeping the first 256', () => {
    const many = Array.from(
      { length: MAX_PALETTE_ENTRIES + 1 },
      (_, at) => `#${at.toString(16).padStart(6, '0')}`,
    );

    expect(parseCustomPalette({ name: 'Too many', entries: many })).toBeNull();
    expect(
      parseCustomPalette({ name: 'Exactly', entries: many.slice(0, MAX_PALETTE_ENTRIES) }),
    ).not.toBeNull();
  });

  it('answers nothing for anything that is not a palette at all', () => {
    // What a damaged or hand-edited row holds. None of these is repaired into a palette.
    expect(parseCustomPalette(null)).toBeNull();
    expect(parseCustomPalette(undefined)).toBeNull();
    expect(parseCustomPalette('#102030')).toBeNull();
    expect(parseCustomPalette({ entries: ['#102030'] })?.name).toBe('');
    expect(parseCustomPalette({ name: 'No list', entries: '#102030' })).toBeNull();
    expect(parseCustomPalette({ name: 42, entries: ['#102030'] })?.name).toBe('');
  });
});
