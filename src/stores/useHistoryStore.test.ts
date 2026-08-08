import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_LIMIT } from '../db/backend.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { createFailingBackend, createHeldDeleteBackend } from '../test/backendDoubles.ts';
import { createRefusingStorage } from '../test/storageDoubles.ts';
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
    output: DEFAULT_OUTPUT_CONFIG,
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
    useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
    useUIStore.setState({ activeTab: 'presets', isHistoryModalOpen: true });

    const creature = { ...defaultSubjectFor('CREATURE'), species: 'Cybernetic Attack Drone' };
    const output = { ...DEFAULT_OUTPUT_CONFIG, targetModel: 'MIDJOURNEY' } as const;
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
    expect(stored?.output).toEqual(DEFAULT_OUTPUT_CONFIG);
  });
});

describe('deleteLog', () => {
  it('removes one entry from the store and from storage, leaving the rest', async () => {
    await useHistoryStore.getState().addLog(entry({ promptText: 'keep me' }));
    await useHistoryStore.getState().addLog(entry({ promptText: 'delete me' }));

    const doomed = useHistoryStore.getState().historyLogs.find((log) => log.promptText === 'delete me');
    if (!doomed) throw new Error('the entry should have been recorded.');
    await useHistoryStore.getState().deleteLog(doomed.id);

    expect(useHistoryStore.getState().historyLogs.map((log) => log.promptText)).toEqual(['keep me']);
    // Asserted against storage as well as the store: an entry removed from only one of the two is
    // the exact failure the drawer would show as gone and a reload would bring back.
    const stored = await backend.listHistoryLogs();
    expect(stored.map((log) => log.promptText)).toEqual(['keep me']);
    expect(useUIStore.getState().toastMessage).toBe('Deleted that prompt');
  });

  it('keeps showing an entry it could not delete', async () => {
    await useHistoryStore.getState().addLog(entry());
    const [log] = useHistoryStore.getState().historyLogs;
    if (!log) throw new Error('the entry should have been recorded.');

    backend = createFailingBackend();
    await useHistoryStore.getState().deleteLog(log.id);

    expect(useHistoryStore.getState().historyLogs).toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('Could not delete that prompt');
  });

  it('does not resurrect an entry recorded while the delete was in flight', async () => {
    await useHistoryStore.getState().addLog(entry({ promptText: 'doomed' }));
    const [doomed] = useHistoryStore.getState().historyLogs;
    if (!doomed) throw new Error('the entry should have been recorded.');

    // The delete is held open so the new prompt is recorded *while it is in flight* and its `set`
    // lands first. A `deleteLog` that filtered a list captured before the await would then write
    // that stale list back over the top, taking 'concurrent' with it.
    const held = createHeldDeleteBackend(backend);
    backend = held.backend;

    const deletion = useHistoryStore.getState().deleteLog(doomed.id);
    await useHistoryStore.getState().addLog(entry({ promptText: 'concurrent' }));
    held.releaseDelete();
    await deletion;

    expect(useHistoryStore.getState().historyLogs.map((log) => log.promptText)).toEqual(['concurrent']);
  });
});

describe('exportHistoryJSON', () => {
  it('serialises every recorded entry, with the studio state that restores it', async () => {
    const creature = { ...defaultSubjectFor('CREATURE'), species: 'Brass Leviathan' };
    await useHistoryStore.getState().addLog(entry({ category: 'CREATURE', subject: creature }));

    const parsed: unknown = JSON.parse(useHistoryStore.getState().exportHistoryJSON());

    expect(parsed).toEqual(useHistoryStore.getState().historyLogs);
    // Not merely a list of prompt strings: what makes the export worth having is that it carries
    // everything a row does, so nothing is lost that the app itself keeps.
    expect(Array.isArray(parsed) && parsed[0]).toMatchObject({
      category: 'CREATURE',
      subject: creature,
    });
  });

  it('is valid JSON for an empty history rather than an empty string', () => {
    const parsed: unknown = JSON.parse(useHistoryStore.getState().exportHistoryJSON());
    expect(parsed).toEqual([]);
  });
});

/**
 * The same failure, on the backend the user is actually running.
 *
 * The cases above reach the error paths through `createFailingBackend`, which proves the store
 * handles a rejection — but not that the fallback can produce one, which is the half that was
 * broken. These run a **real** `LocalStorageBackend` over storage that refuses writes, so what is
 * under test is the whole path: a full quota, through the backend, to the toast.
 */
describe('on a fallback whose storage refuses writes', () => {
  beforeEach(() => {
    backend = new LocalStorageBackend(createRefusingStorage());
  });

  it('reports a prompt it could not record, and does not show it as recorded', async () => {
    await useHistoryStore.getState().addLog(entry());

    expect(useHistoryStore.getState().historyLogs).toHaveLength(0);
    expect(useUIStore.getState().toastMessage).toBe('Could not save this prompt to history');
  });

  it('reports an entry it could not delete, and keeps showing it', async () => {
    useHistoryStore.setState({ historyLogs: [{ ...entry(), id: 'kept', createdAt: 1 }] });
    await useHistoryStore.getState().deleteLog('kept');

    expect(useHistoryStore.getState().historyLogs).toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('Could not delete that prompt');
  });

  it('reports a history it could not clear, and keeps showing what is still stored', async () => {
    useHistoryStore.setState({ historyLogs: [{ ...entry(), id: 'kept', createdAt: 1 }] });
    await useHistoryStore.getState().clearHistory();

    expect(useHistoryStore.getState().historyLogs).toHaveLength(1);
    expect(useUIStore.getState().toastMessage).toBe('Could not clear prompt history');
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
