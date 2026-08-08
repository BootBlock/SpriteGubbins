import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageBackend } from './localStorageBackend.ts';
import { createMemoryStorage, type WebStorageLike } from './webStorage.ts';
import { createRefusingStorage } from '../test/storageDoubles.ts';
import { HISTORY_LIMIT } from './backend.ts';
import { STORAGE_KEYS } from './schema.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET, PRESETS } from '../constants/presets/index.ts';
import { DEFAULT_SETTINGS } from '../constants/settings.ts';
import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';

/**
 * The localStorage backend is not a safety net — it is the backend the app genuinely runs on
 * wherever OPFS is unavailable, which is an ordinary condition rather than an exotic one. It gets
 * the same scrutiny as the SQLite path.
 */

function log(overrides: Partial<PromptHistoryLog> = {}): PromptHistoryLog {
  return {
    id: 'log-1',
    category: 'CHARACTER',
    promptText: '# MODULAR SPRITE-SHEET PROMPT ARCHITECTURE (CHARACTER)',
    createdAt: 1_000,
    wordCount: 5,
    modelUsed: 'GENERIC',
    subject: DEFAULT_PRESET.subject,
    output: DEFAULT_PRESET.output,
    ...overrides,
  };
}

/** A history row as it was stored before the two payload columns existed. */
function legacyRow(): Record<string, unknown> {
  return {
    id: 'legacy-1',
    category: 'CREATURE',
    prompt_text: '# MODULAR SPRITE-SHEET PROMPT ARCHITECTURE (CREATURE)',
    created_at: 500,
    word_count: 5,
    model_used: 'GENERIC',
  };
}

function customPreset(overrides: Partial<PresetArchetype> = {}): PresetArchetype {
  const base = PRESETS[0];
  if (!base) throw new Error('PRESETS must not be empty.');
  return { ...base, id: 'custom-1', name: 'My Preset', isCustom: true, ...overrides };
}

let storage: WebStorageLike;
let backend: LocalStorageBackend;

beforeEach(() => {
  // Injected rather than the global: there is no `localStorage` in this environment at all, and
  // a fresh store per test is what keeps them independent.
  storage = createMemoryStorage();
  backend = new LocalStorageBackend(storage);
});

describe('LocalStorageBackend — history', () => {
  it('round-trips a log through storage', async () => {
    await backend.addHistoryLog(log());
    expect(await backend.listHistoryLogs()).toEqual([log()]);
  });

  it('keeps a row written before the studio-state columns existed', async () => {
    // Seeded as raw storage, which is exactly what an older build left behind. The prompt is the
    // part worth keeping, so the row is repaired to its category's defaults rather than discarded —
    // it simply restores to a default creature instead of the one it described.
    storage.setItem(STORAGE_KEYS.promptHistory, JSON.stringify([legacyRow()]));

    const [restored] = await backend.listHistoryLogs();
    expect(restored?.id).toBe('legacy-1');
    expect(restored?.promptText).toContain('CREATURE');
    expect(restored?.subject).toEqual(defaultSubjectFor('CREATURE'));
    expect(restored?.output).toEqual(DEFAULT_OUTPUT_CONFIG);
  });

  it('returns logs newest first, whatever order they went in', async () => {
    await backend.addHistoryLog(log({ id: 'old', createdAt: 100 }));
    await backend.addHistoryLog(log({ id: 'new', createdAt: 300 }));
    await backend.addHistoryLog(log({ id: 'mid', createdAt: 200 }));

    expect((await backend.listHistoryLogs()).map((entry) => entry.id)).toEqual(['new', 'mid', 'old']);
  });

  it('replaces rather than duplicates a log with an existing id', async () => {
    await backend.addHistoryLog(log({ id: 'same', wordCount: 1 }));
    await backend.addHistoryLog(log({ id: 'same', wordCount: 99 }));

    const logs = await backend.listHistoryLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.wordCount).toBe(99);
  });

  it('caps the history so it cannot grow without bound across sessions', async () => {
    for (let i = 0; i < HISTORY_LIMIT + 25; i += 1) {
      await backend.addHistoryLog(log({ id: `log-${i}`, createdAt: i }));
    }
    const logs = await backend.listHistoryLogs();
    expect(logs).toHaveLength(HISTORY_LIMIT);
    // The cap must drop the oldest, not the newest.
    expect(logs[0]?.id).toBe(`log-${HISTORY_LIMIT + 24}`);
  });

  it('deletes one entry without touching the others', async () => {
    await backend.addHistoryLog(log({ id: 'a', createdAt: 300 }));
    await backend.addHistoryLog(log({ id: 'b', createdAt: 200 }));
    await backend.addHistoryLog(log({ id: 'c', createdAt: 100 }));

    await backend.deleteHistoryLog('b');

    expect((await backend.listHistoryLogs()).map((entry) => entry.id)).toEqual(['a', 'c']);
  });

  it('keeps a deleted entry gone once storage is re-read', async () => {
    // Read through a second backend over the same storage, which is what a reload amounts to: a
    // delete that only updated an in-memory list would pass the case above and fail here.
    await backend.addHistoryLog(log({ id: 'doomed' }));
    await backend.deleteHistoryLog('doomed');

    expect(await new LocalStorageBackend(storage).listHistoryLogs()).toEqual([]);
  });

  it('survives deleting an id that is not there', async () => {
    await backend.addHistoryLog(log({ id: 'kept' }));
    await backend.deleteHistoryLog('never-existed');

    expect((await backend.listHistoryLogs()).map((entry) => entry.id)).toEqual(['kept']);
  });

  it('preserves the studio state of the entries it keeps', async () => {
    // The delete rewrites the whole collection, so it goes back through `toRow`. A row that lost
    // its payload columns on the way would still list, and would restore to the wrong sprite.
    const subject = { ...DEFAULT_PRESET.subject, species: 'Clockwork Owl' };
    await backend.addHistoryLog(log({ id: 'keep', subject }));
    await backend.addHistoryLog(log({ id: 'drop' }));

    await backend.deleteHistoryLog('drop');

    const [kept] = await backend.listHistoryLogs();
    expect(kept?.subject).toEqual(subject);
    expect(kept?.output).toEqual(DEFAULT_PRESET.output);
  });

  it('clears the history', async () => {
    await backend.addHistoryLog(log());
    await backend.clearHistoryLogs();
    expect(await backend.listHistoryLogs()).toEqual([]);
  });
});

describe('LocalStorageBackend — presets', () => {
  it('round-trips a preset, including its subject and output', async () => {
    const preset = customPreset();
    await backend.savePreset(preset);

    const [stored] = await backend.listPresets();
    expect(stored?.name).toBe('My Preset');
    expect(stored?.subject).toEqual(preset.subject);
    expect(stored?.output).toEqual(preset.output);
    expect(stored?.isCustom).toBe(true);
  });

  it('overwrites a preset saved under the same id', async () => {
    await backend.savePreset(customPreset({ name: 'First' }));
    await backend.savePreset(customPreset({ name: 'Second' }));

    const presets = await backend.listPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]?.name).toBe('Second');
  });

  it('deletes one preset without touching the others', async () => {
    await backend.savePreset(customPreset({ id: 'a', name: 'A' }));
    await backend.savePreset(customPreset({ id: 'b', name: 'B' }));
    await backend.deletePreset('a');

    expect((await backend.listPresets()).map((preset) => preset.id)).toEqual(['b']);
  });

  it('replaces the whole collection on import', async () => {
    await backend.savePreset(customPreset({ id: 'old', name: 'Old' }));
    await backend.replacePresets([customPreset({ id: 'new', name: 'New' })]);

    expect((await backend.listPresets()).map((preset) => preset.id)).toEqual(['new']);
  });
});

describe('LocalStorageBackend — settings', () => {
  it('answers with the defaults before anything has been stored', async () => {
    // The ordinary state of an install whose owner has never opened the dialog, and the reason this
    // read cannot come back empty: "nothing stored" and "the defaults" are the same answer.
    expect(await backend.loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips a changed setting', async () => {
    const settings = { ...DEFAULT_SETTINGS, accentHue: 'jade' as const, ambientBackdrop: false };
    await backend.saveSettings(settings);

    // Read through a second backend over the same storage, which is what a reload amounts to.
    expect(await new LocalStorageBackend(storage).loadSettings()).toEqual(settings);
  });

  it('falls back field by field rather than discarding the set', async () => {
    // One hand-edited value costs that preference and no other. Seeded as raw storage, because that
    // is the only way this state actually arises.
    storage.setItem(
      STORAGE_KEYS.appSettings,
      JSON.stringify({ accentHue: 'not-a-hue', motion: 'reduced', openingView: 'presets' }),
    );

    expect(await backend.loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      motion: 'reduced',
      openingView: 'presets',
    });
  });

  it('reads the defaults rather than throwing when storage holds nonsense', async () => {
    storage.setItem(STORAGE_KEYS.appSettings, 'not json at all');
    expect(await backend.loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('LocalStorageBackend — hostile storage', () => {
  it('reads an empty list rather than throwing when storage holds nonsense', async () => {
    storage.setItem(STORAGE_KEYS.promptHistory, 'not json at all');
    storage.setItem(STORAGE_KEYS.customPresets, '{"not":"an array"}');

    expect(await backend.listHistoryLogs()).toEqual([]);
    expect(await backend.listPresets()).toEqual([]);
  });

  it('drops individual malformed entries but keeps the valid ones', async () => {
    storage.setItem(
      STORAGE_KEYS.promptHistory,
      JSON.stringify([
        {
          id: 'good',
          category: 'CHARACTER',
          prompt_text: 'x',
          created_at: 1,
          word_count: 1,
          model_used: 'GENERIC',
        },
        { id: 'missing-fields' },
        {
          id: 'bad-category',
          category: 'NOPE',
          prompt_text: 'x',
          created_at: 1,
          word_count: 1,
          model_used: 'GENERIC',
        },
        {
          id: 'bad-model',
          category: 'CHARACTER',
          prompt_text: 'x',
          created_at: 1,
          word_count: 1,
          model_used: 'NOPE',
        },
        null,
      ]),
    );

    const logs = await backend.listHistoryLogs();
    expect(logs.map((entry) => entry.id)).toEqual(['good']);
  });

  it('repairs a preset that predates a field rather than discarding the user’s work', async () => {
    storage.setItem(
      STORAGE_KEYS.customPresets,
      JSON.stringify([
        {
          id: 'partial',
          name: 'Partial',
          category: 'CHARACTER',
          subject: { species: 'Android' },
          output: {},
        },
      ]),
    );

    const [preset] = await backend.listPresets();
    expect(preset?.subject.species).toBe('Android');
    // Every other field is filled from the category defaults, so the preset still compiles.
    expect(preset?.subject.materials).not.toBe('');
    expect(preset?.output.targetModel).toBeDefined();
  });

  it('rejects a preset with no usable identity', async () => {
    storage.setItem(
      STORAGE_KEYS.customPresets,
      JSON.stringify([
        { name: 'No id', category: 'CHARACTER' },
        { id: 'no-category', name: 'X' },
      ]),
    );
    expect(await backend.listPresets()).toEqual([]);
  });
});

/**
 * A refused write is an ordinary condition on this backend — an exhausted quota, or Safari's
 * private mode, where `setItem` throws outright. It has to reach the caller: the stores above
 * already raise a toast on a failed write, and a backend that resolved anyway made every one of
 * those handlers unreachable, so the user watched an entry appear and found it gone on reload.
 *
 * Each case holds the promise in a variable before awaiting it. That is the point of the shape,
 * not a stylistic tic: a method that threw *synchronously* would satisfy a bare
 * `expect(...).rejects` written inline, and would break any caller attaching `.catch()` to the
 * `Promise` the interface promises.
 */
describe('LocalStorageBackend — a refused write', () => {
  beforeEach(() => {
    backend = new LocalStorageBackend(createRefusingStorage());
  });

  it('rejects when a history log cannot be stored', async () => {
    const promise = backend.addHistoryLog(log());
    await expect(promise).rejects.toThrow(/refused the write/i);
  });

  it('rejects when a history log cannot be deleted', async () => {
    const promise = backend.deleteHistoryLog('log-1');
    await expect(promise).rejects.toThrow(/refused the write/i);
  });

  it('rejects when the history cannot be cleared', async () => {
    const promise = backend.clearHistoryLogs();
    await expect(promise).rejects.toThrow(/refused the write/i);
  });

  it('rejects when a preset cannot be saved', async () => {
    const promise = backend.savePreset(customPreset());
    await expect(promise).rejects.toThrow(/refused the write/i);
  });

  it('rejects when a preset cannot be deleted', async () => {
    const promise = backend.deletePreset('custom-1');
    await expect(promise).rejects.toThrow(/refused the write/i);
  });

  it('rejects when an imported pack cannot replace the collection', async () => {
    const promise = backend.replacePresets([customPreset()]);
    await expect(promise).rejects.toThrow(/refused the write/i);
  });

  it('rejects when a setting cannot be stored', async () => {
    // The store above keeps the change applied on this rejection rather than reverting it — a
    // preference the user can see working is not a lie the way an unsaved preset would be — but it
    // can only do that, and say so, if the refusal actually reaches it.
    const promise = backend.saveSettings(DEFAULT_SETTINGS);
    await expect(promise).rejects.toThrow(/refused the write/i);
  });

  it('carries the storage error as the cause, rather than discarding why it failed', async () => {
    const error: unknown = await backend.addHistoryLog(log()).catch((reason: unknown) => reason);

    // Narrowed rather than cast: `as Error` would assert the very thing under test.
    if (!(error instanceof Error)) throw new Error('the write should have rejected with an Error.');
    expect(error.cause).toBeInstanceOf(DOMException);
  });

  it('still reads, because it is the write that was refused', async () => {
    // Reading has its own contract — it never throws — and a backend that had quietly broken it
    // would pass every case above for the wrong reason.
    await expect(backend.listHistoryLogs()).resolves.toEqual([]);
    await expect(backend.listPresets()).resolves.toEqual([]);
    await expect(backend.loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });
});
