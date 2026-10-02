import { describe, expect, it } from 'vitest';
import { iconCatalogueEntry } from '../constants/iconCatalogue/index.ts';
import type { IconCatalogueEntry } from '../types/iconCatalogue.ts';
import { iconLookText } from './iconLookText.ts';

function entry(id: string): IconCatalogueEntry {
  const found = iconCatalogueEntry(id);
  if (found === undefined) throw new Error(`No catalogue entry ${id}`);
  return found;
}

describe('iconLookText', () => {
  it('draws an entry as the look its world’s family writes for it', () => {
    const heal = entry('heal-minor');
    expect(iconLookText(heal, 'Near-Future Cyberpunk')).toBe(heal.looks.CYBERPUNK);
    expect(iconLookText(heal, 'Cosy Storybook')).toBe(heal.looks.FANTASY);
    expect(iconLookText(heal, 'Deep Ocean Voyage')).toBe(heal.looks.AGE_OF_STEAM);
    expect(iconLookText(heal, 'Post-Apocalyptic Salvage')).toBe(heal.looks.MODERN);
    expect(iconLookText(heal, 'Far-Future Space Opera')).toBe(heal.looks.SPACE_OPERA);
  });

  it('reads a typed world however it is cased and spaced', () => {
    const heal = entry('heal-minor');
    expect(iconLookText(heal, '  near-future CYBERPUNK ')).toBe(heal.looks.CYBERPUNK);
  });

  it('hands a world no family names to the role, drawn as that world would make it', () => {
    const fallback = 'minor healing consumable, drawn as the stated World & Era would make it';
    expect(iconLookText(entry('heal-minor'), 'Dieselpunk Sky Pirates')).toBe(fallback);
    // A cleared world is the same case: there is nothing to choose a family by.
    expect(iconLookText(entry('heal-minor'), '')).toBe(fallback);
  });
});
