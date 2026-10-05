import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { tintMaskedIconSubject } from '../test/tintMaskedIconSubject.ts';
import { useResolvedBackgroundKey } from './useResolvedBackgroundKey.ts';
import { useResolvedPalette } from './useResolvedPalette.ts';

/**
 * The two hooks every reader outside the compiler takes the key and the palette through, so the
 * Quantise tab keys out and reduces to what the prompt states rather than what a tint mask withdrew
 * (audit finding M1).
 */
beforeEach(() => {
  useOutputStore.setState(useOutputStore.getInitialState());
  useSubjectStore.setState(useSubjectStore.getInitialState());
  useOutputStore.getState().setOutputField('backgroundKey', 'PURE_WHITE');
  useOutputStore.getState().setOutputField('palette', 'GAME_BOY_DMG');
});

describe('useResolvedBackgroundKey and useResolvedPalette', () => {
  it('resolve a tint mask’s stored white key and pinned palette to what its prompt states', () => {
    useSubjectStore.setState({ category: 'ICON', subject: tintMaskedIconSubject() });

    expect(renderHook(() => useResolvedBackgroundKey()).result.current).toBe('MAGENTA_FF00FF');
    expect(renderHook(() => useResolvedPalette()).result.current).toBe('FREE');
  });

  it('hand back the stored values wherever the subject can take them', () => {
    expect(renderHook(() => useResolvedBackgroundKey()).result.current).toBe('PURE_WHITE');
    expect(renderHook(() => useResolvedPalette()).result.current).toBe('GAME_BOY_DMG');
  });
});
