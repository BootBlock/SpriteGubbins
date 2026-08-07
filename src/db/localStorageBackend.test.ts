import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageBackend } from './localStorageBackend.ts';
import { createMemoryStorage, type WebStorageLike } from './webStorage.ts';
import { HISTORY_LIMIT } from './backend.ts';
import { STORAGE_KEYS } from './schema.ts';
import { PRESETS } from '../constants/presets.ts';
import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';

/**
 * The localStorage backend is not a safety net — on a static host it is the backend the app
 * genuinely starts on, before the service worker has made the page cross-origin isolated. It
 * gets the same scrutiny as the SQLite path.
 */

function log(overrides: Partial<PromptHistoryLog> = {}): PromptHistoryLog {
  return {
    id: 'log-1',
    category: 'CHARACTER',
    promptText: '# MODULAR SPRITE-SHEET PROMPT ARCHITECTURE (CHARACTER)',
    createdAt: 1_000,
    wordCount: 5,
    modelUsed: 'GENERIC',
    ...overrides,
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
