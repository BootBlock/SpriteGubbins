import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { ICON_CATALOGUE_GROUPS } from '../constants/iconCatalogue/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useQuantiseStore } from '../stores/useQuantiseStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { createImage } from '../utils/imageData.ts';
import { useSuggestedGrid } from './useSuggestedGrid.ts';

/** `count` one-component catalogue ids, in catalogue order. */
const singles = (count: number): readonly string[] =>
  ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries)
    .filter((entry) => entry.states === undefined)
    .slice(0, count)
    .map((entry) => entry.id);

/** The grid suggested for a 1024 px sheet of an ICON set holding `count` icons, on its first sheet. */
function suggestedFor(count: number): number | null {
  useSubjectStore.setState({
    category: 'ICON',
    subject: {
      ...defaultSubjectFor('ICON'),
      icons: { look: 'ISOLATED_MARK', colourMode: 'FULL_COLOUR', picks: cataloguePicks(singles(count)) },
    },
  });
  return renderHook(() => useSuggestedGrid()).result.current;
}

describe('useSuggestedGrid', () => {
  beforeEach(() => {
    useOutputStore.setState({
      output: {
        ...DEFAULT_OUTPUT_CONFIG,
        directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
        resolutionProfile: 'CUSTOM',
        spriteTargetSize: '24 × 24 px',
        sheetIndex: 0,
      },
    });
    useQuantiseStore.setState({ source: { name: 'sheet.png', image: createImage(1024, 1024) } });
  });

  it('seats the sixteen cells an icon sheet states, however few icons the sheet draws', () => {
    // An icon sheet states one cell, 1/4 of its width, on every sheet of a set (audit finding T5), so a
    // sheet of two is drawn at the scale of a sheet of sixteen and has to be read at it.
    const full = suggestedFor(16);

    expect(full).not.toBeNull();
    expect(suggestedFor(2)).toBe(full);
    expect(suggestedFor(1)).toBe(full);
  });
});
