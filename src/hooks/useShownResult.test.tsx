import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useQuantiseAnswerStore } from '../stores/useQuantiseAnswerStore.ts';
import { useQuantiseStore } from '../stores/useQuantiseStore.ts';
import { showNoResult, showResult } from '../test/shownResult.ts';
import { useShownResult } from './useShownResult.ts';

/**
 * The result the download reads from the stores is the one the pane shows, and no other — so a cell's
 * fit cannot be decided by, nor a press be told about, a result the tab has stopped presenting.
 */

afterEach(showNoResult);

describe('useShownResult', () => {
  it('states the scale and the palette standing of the result on screen', () => {
    showResult(1, true);

    expect(renderHook(useShownResult).result.current).toStrictEqual({ grid: 1, paletted: true });
  });

  it('states nothing once the reader clears the scale, though the last result is still filed', () => {
    showResult(4, false);
    const { result } = renderHook(useShownResult);

    // With no scale in force the pane stops presenting the result, which outlives the scale only
    // while a newer one is coming; a pixel-art scale left here would hold the fit back on nothing.
    act(() => {
      useQuantiseStore.setState({ gridOverride: null });
    });

    expect(useQuantiseAnswerStore.getState().succeeded).not.toBeNull();
    expect(result.current).toBeNull();
  });

  it('adopts an exact reading of the sheet as the scale in force, as the tab does', () => {
    showResult(2, false);
    act(() => {
      useQuantiseStore.setState({ gridOverride: null });
      useQuantiseAnswerStore.getState().surveyed({
        kind: 'facts',
        facts: { scale: { grid: 2, measurement: 'EXACT' }, colors: 1 },
      });
    });

    expect(renderHook(useShownResult).result.current).toStrictEqual({ grid: 2, paletted: false });
  });

  it('states nothing with no sheet loaded', () => {
    showResult(1, false);
    act(() => {
      useQuantiseStore.setState({ source: null });
    });

    expect(renderHook(useShownResult).result.current).toBeNull();
  });
});
