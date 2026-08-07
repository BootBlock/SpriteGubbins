import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_LIMIT } from '../db/backend.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_PRESET } from '../constants/presets.ts';
import { createFailingBackend } from '../test/backendDoubles.ts';
import type { NewPromptHistoryLog } from '../types/history.ts';
import { useHistoryStore } from './useHistoryStore.ts';
import { useOutputStore } from './useOutputStore.ts';
import { useSubjectStore } from './useSubjectStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * As with the preset store: a real `LocalStorageBackend` over in-memory storage, with only the
 * backend *choice* mocked. What matters here is that the store never shows an entry the database
 * doesn't hold — so every assertion about the store is paired with one about storage.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

function entry(overrides: Partial<NewPromptHistoryLog> = {}): NewPromptHistoryLog {
  return {
    category: 'CHARACTER',
    promptText: '# MODULAR SPRITE-SHEET PROMPT ARCHITECTURE (CHARACTER)',
    wordCount: 6,
    modelUsed: 'CHATGPT_5_6_SOL',
    subject: DEFAULT_PRESET.subject,
    output: DEFAULT_PRESET.output,
    ...overrides,
  };
}

beforeEach(() => {
  backend = new LocalStorageBackend(createMemoryStorage());
  useHistoryStore.setState({ historyLogs: [], isLoading: false });
  useUIStore.getState().dismissToast();
});

afterEach(() => {
  useUIStore.getState().dismissToast();
});

describe('addLog', () => {
  it('mints an id and a timestamp the caller did not supply', async () => {
    const before = Date.now();
    await useHistoryStore.getState().addLog(entry());

    const [log] = useHistoryStore.getState().historyLogs;
    expect(log?.id).toMatch(/[0-9a-f-]{36}/);
    expect(log?.createdAt).toBeGreaterThanOrEqual(before);
    expect(log?.promptText).toBe(entry().promptText);
  });

  it('gives every entry its own id', async () => {
    await useHistoryStore.getState().addLog(entry());
    await useHistoryStore.getState().addLog(entry());

    const ids = new Set(useHistoryStore.getState().historyLogs.map((log) => log.id));
    expect(ids.size).toBe(2);
  });

  it('puts the newest entry first', async () => {
    await useHistoryStore.getState().addLog(entry({ promptText: 'older' }));
    await useHistoryStore.getState().addLog(entry({ promptText: 'newer' }));

    expect(useHistoryStore.getState().historyLogs.map((log) => log.promptText)).toEqual(['newer', 'older']);
  });

  it('writes through to storage', async () => {
    await useHistoryStore.getState().addLog(entry());
    await expect(backend.listHistoryLogs()).resolves.toHaveLength(1);
  });

  it('reports a failed write and shows nothing that was not stored', async () => {
    backend = createFailingBackend();
    await useHistoryStore.getState().addLog(entry());

    expect(useHistoryStore.getState().historyLogs).toHaveLength(0);
    expect(useUIStore.getState().toastMessage).toBe('Could not save this prompt to history');
  });

  it('never holds more entries than the backends keep', async () => {
    // Seeded directly so the store's own trim is what is under test, not the backend's.
    useHistoryStore.setState({
      historyLogs: Array.from({ length: HISTORY_LIMIT }, (_, index) => ({
        ...entry(),
        id: `seed-${index}`,
        createdAt: index,
      })),
    });

    await useHistoryStore.getState().addLog(entry({ promptText: 'newest' }));

    const { historyLogs } = useHistoryStore.getState();
    expect(historyLogs).toHaveLength(HISTORY_LIMIT);
    expect(historyLogs[0]?.promptText).toBe('newest');
    expect(historyLogs.some((log) => log.id === `seed-${HISTORY_LIMIT - 1}`)).toBe(false);
  });
});

describe('fetchHistory', () => {
  it('loads what a previous session stored, newest first', async () => {
    await backend.addHistoryLog({ ...entry(), id: 'a', createdAt: 1_000, promptText: 'older' });
    await backend.addHistoryLog({ ...entry(), id: 'b', createdAt: 2_000, promptText: 'newer' });

    await useHistoryStore.getState().fetchHistory();

    expect(useHistoryStore.getState().historyLogs.map((log) => log.promptText)).toEqual(['newer', 'older']);
    expect(useHistoryStore.getState().isLoading).toBe(false);
  });

  it('clears the loading flag even when the read fails', async () => {
    backend = createFailingBackend();
    await useHistoryStore.getState().fetchHistory();

    expect(useHistoryStore.getState().isLoading).toBe(false);
    expect(useUIStore.getState().toastMessage).toBe('Could not load prompt history');
  });
});

describe('restoreLog', () => {
  it('puts the recorded studio state back and shows it', async () => {
    useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
    useOutputStore.setState({ output: DEFAULT_PRESET.output });
    useUIStore.setState({ activeTab: 'presets', isHistoryModalOpen: true });

    const creature = { ...defaultSubjectFor('CREATURE'), species: 'Cybernetic Attack Drone' };
    const output = { ...DEFAULT_PRESET.output, targetModel: 'MIDJOURNEY' } as const;
    await useHistoryStore.getState().addLog(entry({ category: 'CREATURE', subject: creature, output }));

    const [log] = useHistoryStore.getState().historyLogs;
    if (!log) throw new Error('the entry should have been recorded.');
    useHistoryStore.getState().restoreLog(log);

    expect(useSubjectStore.getState().category).toBe('CREATURE');
    expect(useSubjectStore.getState().subject.species).toBe('Cybernetic Attack Drone');
    expect(useOutputStore.getState().output.targetModel).toBe('MIDJOURNEY');
    expect(useUIStore.getState().isHistoryModalOpen).toBe(false);
    expect(useUIStore.getState().activeTab).toBe('studio');
  });

  it('restores state that survived a round trip through storage', async () => {
    const creature = { ...defaultSubjectFor('CREATURE'), species: 'Mechanical Automaton' };
    await useHistoryStore.getState().addLog(entry({ category: 'CREATURE', subject: creature }));

    // Read back from the backend rather than from the store, so what is asserted is what the row
    // actually holds — the studio state has to survive being serialised into the payload columns.
    const [stored] = await backend.listHistoryLogs();
    expect(stored?.subject).toEqual(creature);
    expect(stored?.output).toEqual(DEFAULT_PRESET.output);
  });
});

describe('clearHistory', () => {
  it('empties the store and the table', async () => {
    await useHistoryStore.getState().addLog(entry());
    await useHistoryStore.getState().clearHistory();

    expect(useHistoryStore.getState().historyLogs).toHaveLength(0);
    await expect(backend.listHistoryLogs()).resolves.toHaveLength(0);
  });

  it('leaves the store alone when the clear fails', async () => {
    await useHistoryStore.getState().addLog(entry());
    backend = createFailingBackend();
    await useHistoryStore.getState().clearHistory();

    expect(useHistoryStore.getState().historyLogs).toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('Could not clear prompt history');
  });
});
