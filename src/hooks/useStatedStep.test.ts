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

  it('reads an icon sheet’s cell as a quarter of the sheet each way, for a sheet of one icon too', () => {
    useSubjectStore.setState({
      category: 'ICON',
      subject: {
        ...defaultSubjectFor('ICON'),
        icons: { look: 'ISOLATED_MARK', colourMode: 'FULL_COLOUR', picks: cataloguePicks(['heal-minor']) },
      },
    });

    expect(renderHook(() => useStatedStep()).result.current).toStrictEqual({ x: 256, y: 192 });
  });

  it('states no step for a sheet whose plan states no grid, or where no sheet is loaded', () => {
    useSubjectStore.setState({
      category: 'ICON',
      subject: {
        ...defaultSubjectFor('ICON'),
        icons: { look: 'ISOLATED_MARK', colourMode: 'FULL_COLOUR', picks: cataloguePicks(['heal-minor']) },
      },
    });
    useOutputStore.setState({ output: { ...useOutputStore.getState().output, sheetIndex: 1 } });
    // The second sheet of a one-icon set is the overlay sheet, which lays out no grid of cells.
    expect(renderHook(() => useStatedStep()).result.current).toBeNull();

    useQuantiseStore.setState({ source: null });
    useOutputStore.setState({ output: { ...useOutputStore.getState().output, sheetIndex: 0 } });
    expect(renderHook(() => useStatedStep()).result.current).toBeNull();
  });
});
