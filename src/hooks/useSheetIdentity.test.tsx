import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { useSheetIdentity } from './useSheetIdentity.ts';

/**
 * What a downloaded manifest says the sheet is.
 *
 * The two halves are pinned separately — `utils/componentSlots.test.ts` for the names,
 * `utils/sheetBatch.test.ts` for the batch — and what can only be checked here is that they are read
 * off the *same* sheet: a manifest whose names came from one position in the batch and whose ordinal
 * came from another would be wrong in a way nothing on screen shows.
 */

describe('useSheetIdentity', () => {
  beforeEach(() => {
    useSubjectStore.getState().resetSubject();
    useOutputStore.getState().applyOutputPatch(DEFAULT_OUTPUT_CONFIG);
  });

  it('names the sheet the studio is composing, and its place in the batch', () => {
    useSubjectStore.getState().setCategory('CHARACTER');
    useOutputStore.getState().applyOutputPatch({ directions: 'EIGHT_COMPASS', sheetIndex: 0 });

    const { result } = renderHook(() => useSheetIdentity());

    expect(result.current.sheet).toMatchObject({
      category: 'CHARACTER',
      ordinal: 1,
      // Two core sheets and one articulation run per facing: the eight-compass character is the
      // batch this whole feature is measured against.
      total: 10,
      components: 12,
    });
    expect(result.current.sheet?.facings).toStrictEqual(['south', 'west', 'north', 'east']);
  });

  it('gives one name per component, in the inventory’s own order', () => {
    useSubjectStore.getState().setCategory('CHARACTER');
    useOutputStore.getState().applyOutputPatch({ directions: 'EIGHT_COMPASS', sheetIndex: 0 });

    const { result } = renderHook(() => useSheetIdentity());

    // The property a manifest's naming rests on: as many names as the prompt asked for components.
    expect(result.current.names).toHaveLength(result.current.sheet?.components ?? -1);
    expect(result.current.names.slice(0, 2)).toStrictEqual(['heads-south', 'heads-west']);
  });

  it('follows the studio to the next sheet of the batch', () => {
    useSubjectStore.getState().setCategory('CHARACTER');
    useOutputStore.getState().applyOutputPatch({ directions: 'EIGHT_COMPASS', sheetIndex: 1 });

    const { result } = renderHook(() => useSheetIdentity());

    expect(result.current.sheet).toMatchObject({ ordinal: 2, components: 12 });
    // The diagonal half of the core, which is the sheet the studio is now on.
    expect(result.current.names.slice(0, 1)).toStrictEqual(['heads-south-west']);
  });

  it('counts the subject’s own anatomy, which the sheet contracts for too', () => {
    useSubjectStore.getState().setCategory('CREATURE');
    useSubjectStore.getState().setField('additional_anatomy', 'Tail ×1');
    useOutputStore.getState().applyOutputPatch({ directions: 'FOUR_CARDINAL', sheetIndex: 0 });

    const { result } = renderHook(() => useSheetIdentity());

    expect(result.current.names).toContain('tail-south');
    expect(result.current.names).toHaveLength(result.current.sheet?.components ?? -1);
  });
});
