import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import type { PresetArchetype } from '../types/preset.ts';
import { findPresetByName } from './presetNames.ts';

function preset(id: string, name: string): PresetArchetype {
  return {
    id,
    name,
    category: 'CHARACTER',
    subject: defaultSubjectFor('CHARACTER'),
    output: DEFAULT_PRESET.output,
    isCustom: true,
  };
}

const library = [preset('a', 'My Knight'), preset('b', 'Brass Leviathan')];

describe('findPresetByName', () => {
  it('finds the preset a name names', () => {
    expect(findPresetByName(library, 'Brass Leviathan')?.id).toBe('b');
  });

  it('returns undefined for a name nothing holds', () => {
    expect(findPresetByName(library, 'Nobody')).toBeUndefined();
  });

  it('ignores surrounding whitespace, which the save box does not trim for the user', () => {
    expect(findPresetByName(library, '  My Knight  ')?.id).toBe('a');
  });

  it('ignores case, so a near-duplicate is treated as the same name', () => {
    // The whole point: "my knight" saved beside "My Knight" is two cards the user cannot tell
    // apart, which is the confusion this rule exists to prevent.
    expect(findPresetByName(library, 'my knight')?.id).toBe('a');
    expect(findPresetByName(library, 'MY KNIGHT')?.id).toBe('a');
  });

  it('matches a stored name that itself carries whitespace', () => {
    expect(findPresetByName([preset('c', '  Padded  ')], 'Padded')?.id).toBe('c');
  });

  it('treats a blank name as naming nothing, rather than matching a blank-named preset', () => {
    // A blank name is refused upstream, but this must not be the thing that decides it: returning
    // the first preset for '' would make an empty box silently overwrite something.
    expect(findPresetByName(library, '')).toBeUndefined();
    expect(findPresetByName(library, '   ')).toBeUndefined();
    expect(findPresetByName([preset('blank', '   ')], '  ')).toBeUndefined();
  });

  it('finds nothing in an empty library', () => {
    expect(findPresetByName([], 'My Knight')).toBeUndefined();
  });
});
