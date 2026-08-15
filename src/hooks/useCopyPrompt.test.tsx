import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { useHistoryStore } from '../stores/useHistoryStore.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { useUIStore } from '../stores/useUIStore.ts';
import { sheetRunCount } from '../utils/sheetBatch.ts';
import { useCopyPrompt } from './useCopyPrompt.ts';

/**
 * What the confirmation says, which is the half of this hook nothing else can reach.
 *
 * The split drawer's own test covers copying a *run*, because that is the only branch a drawer can
 * exercise. Every other caller — the header's Copy Prompt and the preview's — omits the run, and
 * neither has a test of its own, so both the single-sheet wording and the studio's mid-batch wording
 * were assertable nowhere: deleting the `sheets.length < 2` guard put "Copied sheet 1 of 1" on every
 * ordinary copy in the app with the suite still green.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  useHistoryStore.setState({ historyLogs: [], isLoading: false });
  useUIStore.setState({ toastMessage: null });
  vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
});

/** Copy whatever the studio currently holds, exactly as the header and the preview button do. */
async function copyTheStudio(): Promise<void> {
  const { result } = renderHook(() => useCopyPrompt());
  await act(async () => {
    await result.current();
  });
}

describe('useCopyPrompt', () => {
  it('says the plain thing for a configuration that is a single generation', async () => {
    // An interface widget is one sheet, so there is no position to report — and "sheet 1 of 1" is a
    // count nobody was keeping.
    useSubjectStore.setState({ category: 'INTERFACE', subject: defaultSubjectFor('INTERFACE') });
    useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
    expect(sheetRunCount('INTERFACE', DEFAULT_OUTPUT_CONFIG)).toBe(1);

    await copyTheStudio();

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe('Prompt copied to the clipboard');
    });
  });

  it('names the sheet when the studio is mid-batch and no run was handed in', async () => {
    // The case the change exists for: the header's Copy Prompt is reachable from every view, so it
    // is the button most likely to be pressed mid-batch — and it hands in no run at all.
    useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
    useOutputStore.setState({
      output: {
        ...DEFAULT_OUTPUT_CONFIG,
        directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
        directions: 'FIVE_CLASSIC',
        sheetIndex: 1,
        primaryDirection: 'right side',
      },
    });

    await copyTheStudio();

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe('Copied sheet 4 of 6 — Articulation · right side');
    });
  });

  it('records nothing when the clipboard refused, whatever the confirmation would have said', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('not focused'));
    useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
    useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });

    await copyTheStudio();

    await waitFor(() => {
      expect(useUIStore.getState().toastMessage).toBe('Could not copy to the clipboard');
    });
    expect(useHistoryStore.getState().historyLogs).toHaveLength(0);
  });
});
