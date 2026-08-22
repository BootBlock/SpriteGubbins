import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageBackend } from './localStorageBackend.ts';
import { createMemoryStorage, type WebStorageLike } from './webStorage.ts';
import { createBoundedStorage, createRefusingStorage } from '../test/storageDoubles.ts';
import { HISTORY_LIMIT } from './backend.ts';
import { HISTORY_STORAGE_BUDGET } from './historyEviction.ts';
import { STORAGE_KEYS } from './schema.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET, PRESETS } from '../constants/presets/index.ts';
import { DEFAULT_SETTINGS } from '../constants/settings.ts';
import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import type { StudioSession } from '../types/session.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';

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
    output: DEFAULT_OUTPUT_CONFIG,
    ...overrides,
  };
}

function session(overrides: Partial<StudioSession> = {}): StudioSession {
  const category = overrides.category ?? 'CHARACTER';
  return {
    category,
    subject: defaultSubjectFor(category),
    output: DEFAULT_OUTPUT_CONFIG,
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
  return {
    ...base,
    id: 'custom-1',
    name: 'My Preset',
    description: 'A preset of my own.',
    isCustom: true,
    ...overrides,
  };
}

/** A saved set of dial positions, for the quantiser's own collection. */
function quantisePreset(overrides: Partial<QuantisePreset> = {}): QuantisePreset {
  return {
    id: 'quantise-1',
    name: 'Flat sheets',
    description: 'Line art.',
    dials: QUANTISE_DEFAULT_DIALS,
    ...overrides,
  };
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
    expect(kept?.output).toEqual(DEFAULT_OUTPUT_CONFIG);
  });

  it('clears the history', async () => {
    await backend.addHistoryLog(log());
    await backend.clearHistoryLogs();
    expect(await backend.listHistoryLogs()).toEqual([]);
  });
});

/**
 * The history is capped by `HISTORY_LIMIT`, which is a count, while the store is bounded by a
 * quota, which is a size — and a compiled prompt runs to a couple of thousand words. Measured in
 * Edge, the store refused the 179th entry of a limit of 200, and because `slice(0, HISTORY_LIMIT)`
 * was the only trim nothing ever shrank: every copy from then on lost the new prompt and kept all
 * 178 old ones, for as long as the reader kept using the app.
 *
 * `createBoundedStorage` is what makes that reachable without a browser. `createRefusingStorage`
 * cannot: it refuses the first write too, so it models private mode rather than a full store, and
 * a backend that had wedged would pass every case written against it.
 */
describe('LocalStorageBackend — a full store', () => {
  /** A log whose serialised row is roughly `size` characters, as a real compiled prompt is. */
  function bigLog(id: string, createdAt: number, size: number): PromptHistoryLog {
    return log({ id, createdAt, promptText: 'x'.repeat(size) });
  }

  it('keeps accepting prompts once the store is full, rather than wedging', async () => {
    // Room for a handful of these and no more, which is the ~178-of-200 state in miniature.
    backend = new LocalStorageBackend(createBoundedStorage(30_000));

    for (let i = 0; i < 40; i += 1) {
      await backend.addHistoryLog(bigLog(`log-${i}`, i, 4_000));
    }

    const logs = await backend.listHistoryLogs();
    // The newest prompt is the one the reader just asked for, so it is the one that must survive.
    expect(logs[0]?.id).toBe('log-39');
    // Fewer than the count limit, because it is the size that ran out — the defect was that this
    // stayed pinned at whatever fitted first and never took another entry.
    expect(logs.length).toBeGreaterThan(1);
    expect(logs.length).toBeLessThan(HISTORY_LIMIT);
  });

  it('evicts the oldest, not the newest', async () => {
    backend = new LocalStorageBackend(createBoundedStorage(30_000));

    for (let i = 0; i < 20; i += 1) {
      await backend.addHistoryLog(bigLog(`log-${i}`, i, 4_000));
    }

    const ids = (await backend.listHistoryLogs()).map((entry) => entry.id);
    // A contiguous run ending at the newest: nothing from the middle is kept, and nothing new lost.
    expect(ids).toEqual(Array.from({ length: ids.length }, (_, index) => `log-${19 - index}`));
  });

  it('leaves the stored history alone when a prompt is too large to store at any length', async () => {
    backend = new LocalStorageBackend(createBoundedStorage(30_000));
    await backend.addHistoryLog(log({ id: 'kept', createdAt: 1 }));

    const promise = backend.addHistoryLog(bigLog('monstrous', 2, 60_000));
    await expect(promise).rejects.toThrow(/refused the write/i);

    // The eviction runs on the candidate collection, never on storage, so a run that never found a
    // length storage would take has written nothing. Answering an unstorable prompt by emptying the
    // history would be a worse failure than the one being fixed.
    expect((await backend.listHistoryLogs()).map((entry) => entry.id)).toEqual(['kept']);
  });

  it('rejects a prompt larger than the history budget without touching storage', async () => {
    // Distinct from the case above: here the browser would take the write and the budget will not,
    // because the history may not spend the quota the settings and the session also need.
    await backend.addHistoryLog(log({ id: 'kept' }));

    const promise = backend.addHistoryLog(bigLog('vast', 2, HISTORY_STORAGE_BUDGET + 1_000));
    await expect(promise).rejects.toThrow(/exceeds the .*budget/i);

    expect((await backend.listHistoryLogs()).map((entry) => entry.id)).toEqual(['kept']);
  });

  it('leaves room for the settings and the session, which the history may not crowd out', async () => {
    // The reason the budget exists at all. A history allowed to fill the quota takes the app's own
    // preferences down with it, and losing the oldest prompt is recoverable where that is not.
    backend = new LocalStorageBackend(createBoundedStorage(HISTORY_STORAGE_BUDGET + 200_000));

    for (let i = 0; i < 200; i += 1) {
      await backend.addHistoryLog(bigLog(`log-${i}`, i, 30_000));
    }

    await expect(backend.saveSettings(DEFAULT_SETTINGS)).resolves.toBeUndefined();
    await expect(backend.saveSession(session())).resolves.toBeUndefined();
  });
});

describe('LocalStorageBackend — presets', () => {
  it('round-trips a preset, including its subject and output', async () => {
    const preset = customPreset();
    await backend.savePreset(preset);

    const [stored] = await backend.listPresets();
    expect(stored?.name).toBe('My Preset');
    expect(stored?.description).toBe('A preset of my own.');
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

describe('LocalStorageBackend — quantiser presets', () => {
  it('round-trips the dials a preset holds', async () => {
    await backend.saveQuantisePreset(quantisePreset());

    const [stored] = await backend.listQuantisePresets();
    expect(stored?.name).toBe('Flat sheets');
    expect(stored?.description).toBe('Line art.');
    expect(stored?.dials).toEqual(QUANTISE_DEFAULT_DIALS);
  });

  it('overwrites one saved under the same id', async () => {
    await backend.saveQuantisePreset(quantisePreset({ name: 'First' }));
    await backend.saveQuantisePreset(quantisePreset({ name: 'Second' }));

    const presets = await backend.listQuantisePresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]?.name).toBe('Second');
  });

  it('deletes one without touching the others', async () => {
    await backend.saveQuantisePreset(quantisePreset({ id: 'a', name: 'A' }));
    await backend.saveQuantisePreset(quantisePreset({ id: 'b', name: 'B' }));
    await backend.deleteQuantisePreset('a');

    expect((await backend.listQuantisePresets()).map((preset) => preset.id)).toEqual(['b']);
  });

  it('drops a stored entry that has no name rather than showing a nameless row', async () => {
    // A name is the whole of what a reader picks one of these out of the list by, so a row without
    // one is not repairable — see `parseQuantisePresetRow`.
    storage.setItem(
      STORAGE_KEYS.quantisePresets,
      JSON.stringify([{ id: 'a', description: '', dials_json: '{}' }]),
    );

    expect(await backend.listQuantisePresets()).toEqual([]);
  });

  it('repairs a dial it cannot read and keeps the rest of the preset', async () => {
    storage.setItem(
      STORAGE_KEYS.quantisePresets,
      JSON.stringify([
        {
          id: 'a',
          name: 'Flat sheets',
          description: '',
          dials_json: JSON.stringify({ ...QUANTISE_DEFAULT_DIALS, colorMerge: 'lots' }),
        },
      ]),
    );

    const [stored] = await backend.listQuantisePresets();
    expect(stored?.dials).toEqual(QUANTISE_DEFAULT_DIALS);
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
    // A description is optional rather than repaired from anything, so its absence is the empty
    // string — which is exactly what a preset saved with the box left blank stores.
    expect(preset?.description).toBe('');
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

  it('rejects when the studio session cannot be stored', async () => {
    // Unlike the settings, the session store swallows this one — a refusal it reported on every
    // keystroke would be noise about something the user cannot act on. It still has to *reach* the
    // store to be swallowed deliberately rather than never happening at all.
    const promise = backend.saveSession(session());
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
    await expect(backend.loadSession()).resolves.toBeNull();
  });
});

describe('LocalStorageBackend — the studio session', () => {
  let storage: WebStorageLike;
  let backend: LocalStorageBackend;

  beforeEach(() => {
    storage = createMemoryStorage();
    backend = new LocalStorageBackend(storage);
  });

  it('has no session before one is stored', async () => {
    // `null` rather than a default session, and the distinction is the point: a reconstructed
    // default would be indistinguishable from one the user actually left, and restoring it would
    // overwrite the studio's own boot state with a copy of itself.
    await expect(backend.loadSession()).resolves.toBeNull();
  });

  it('round-trips a session', async () => {
    await backend.saveSession(session({ category: 'CREATURE' }));

    const loaded = await backend.loadSession();
    expect(loaded?.category).toBe('CREATURE');
    expect(loaded?.subject).toEqual(defaultSubjectFor('CREATURE'));
    expect(loaded?.output).toEqual(DEFAULT_OUTPUT_CONFIG);
  });

  it('keeps only the newest session', async () => {
    // One studio, so one row — a second save replaces rather than accumulating.
    await backend.saveSession(session({ category: 'ITEM' }));
    await backend.saveSession(session({ category: 'BUILDING' }));

    expect((await backend.loadSession())?.category).toBe('BUILDING');
  });

  it('reads hand-edited storage as no session rather than throwing', async () => {
    storage.setItem(STORAGE_KEYS.studioSession, '{ not json');
    await expect(backend.loadSession()).resolves.toBeNull();
  });

  it('reads a session with an unusable category as no session', async () => {
    storage.setItem(STORAGE_KEYS.studioSession, JSON.stringify({ category: 'SPACESHIP' }));
    await expect(backend.loadSession()).resolves.toBeNull();
  });

  it('repairs a session that lost its payloads rather than discarding it', async () => {
    storage.setItem(STORAGE_KEYS.studioSession, JSON.stringify({ category: 'OBJECT' }));

    const loaded = await backend.loadSession();
    expect(loaded?.category).toBe('OBJECT');
    expect(loaded?.subject).toEqual(defaultSubjectFor('OBJECT'));
    expect(loaded?.output).toEqual(DEFAULT_OUTPUT_CONFIG);
  });

  it('stores the session under its own key, leaving the other collections alone', async () => {
    await backend.savePreset(customPreset());
    await backend.saveSession(session());

    expect(storage.getItem(STORAGE_KEYS.studioSession)).not.toBeNull();
    await expect(backend.listPresets()).resolves.toHaveLength(1);
  });
});
