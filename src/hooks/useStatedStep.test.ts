import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useQuantiseStore } from '../stores/useQuantiseStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { createImage } from '../utils/imageData.ts';
import { useStatedStep } from './useStatedStep.ts';

describe('useStatedStep', () => {
  beforeEach(() => {
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY', sheetIndex: 0 },
    });
    useQuantiseStore.setState({ source: { name: 'sheet.png', image: createImage(1024, 768) } });
  });

  it('reads an icon sheet’s cell as a quarter of the sheet’s width each way, for a sheet of one icon too', () => {
    useSubjectStore.setState({
      category: 'ICON',
      subject: {
        ...defaultSubjectFor('ICON'),
        icons: { look: 'ISOLATED_MARK', colourMode: 'FULL_COLOUR', picks: cataloguePicks(['heal-minor']) },
      },
    });

    expect(renderHook(() => useStatedStep()).result.current).toStrictEqual({ x: 256, y: 256 });
  });

  it('reads the overlay sheet’s cell as the icon sheets’ cell, since it lays one piece to a cell of their grid', () => {
    useSubjectStore.setState({
      category: 'ICON',
      subject: {
        ...defaultSubjectFor('ICON'),
        icons: { look: 'ISOLATED_MARK', colourMode: 'FULL_COLOUR', picks: cataloguePicks(['heal-minor']) },
      },
    });
    useOutputStore.setState({ output: { ...useOutputStore.getState().output, sheetIndex: 1 } });
    expect(renderHook(() => useStatedStep()).result.current).toStrictEqual({ x: 256, y: 256 });
  });

  it('states no step for a sheet whose plan states no grid, or where no sheet is loaded', () => {
    // A character's sheet draws its pieces in the grid they fill, not in cells stated in advance.
    useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
    expect(renderHook(() => useStatedStep()).result.current).toBeNull();

    useSubjectStore.setState({ category: 'ICON', subject: defaultSubjectFor('ICON') });
    useQuantiseStore.setState({ source: null });
    expect(renderHook(() => useStatedStep()).result.current).toBeNull();
  });
});
