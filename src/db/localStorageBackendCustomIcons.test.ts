import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../constants/projects.ts';
import { PRESETS } from '../constants/presets/index.ts';
import { customIconSubject, hostileStoredSubject } from '../test/customIcons.ts';
import type { CustomArchetype } from '../types/preset.ts';
import { generatePrompt } from '../utils/promptCompiler.ts';
import { parseLibraryPack, serialiseLibraryPack } from '../utils/libraryPack.ts';
import { LocalStorageBackend } from './localStorageBackend.ts';
import { STORAGE_KEYS } from './schema.ts';
import { createMemoryStorage, type WebStorageLike } from './webStorage.ts';

/**
 * The reader's own icons on the localStorage fallback: through the session, the prompt history, a saved
 * preset and the library pack, and a hand-edited entry the compiler would throw on dropped on the way in.
 *
 * `sqliteBackendCustomIcons.test.ts` holds the same on the other backend.
 */

let storage: WebStorageLike;
let backend: LocalStorageBackend;

beforeEach(() => {
  storage = createMemoryStorage();
  backend = new LocalStorageBackend(storage);
});

function iconPreset(): CustomArchetype {
  const base = PRESETS[0];
  if (base === undefined) throw new Error('PRESETS must not be empty.');
  return {
    ...base,
    id: 'own-icons',
    projectId: DEFAULT_PROJECT_ID,
    name: 'My relics',
    description: 'A set with icons of my own.',
    category: 'ICON',
    subject: customIconSubject(),
    output: DEFAULT_OUTPUT_CONFIG,
    isCustom: true,
  };
}

describe('LocalStorageBackend — icons of the reader’s own', () => {
  it('round-trips them through the session', async () => {
    await backend.saveSession({
      category: 'ICON',
      subject: customIconSubject(),
      output: DEFAULT_OUTPUT_CONFIG,
    });
    expect((await backend.loadSession())?.subject).toEqual(customIconSubject());
  });

  it('round-trips them through the prompt history', async () => {
    await backend.addHistoryLog({
      id: 'log-icons',
      category: 'ICON',
      promptText: '# MODULAR SPRITE-SHEET PROMPT ARCHITECTURE (ICON)',
      createdAt: 1_000,
      wordCount: 5,
      modelUsed: 'CHATGPT_5_6_SOL',
      subject: customIconSubject(),
      output: DEFAULT_OUTPUT_CONFIG,
    });
    const [log] = await backend.listHistoryLogs();
    expect(log?.subject).toEqual(customIconSubject());
  });

  it('round-trips them through a saved preset', async () => {
    await backend.savePreset(iconPreset());
    const [preset] = await backend.listPresets();
    expect(preset?.subject).toEqual(customIconSubject());
  });

  it('round-trips them through an exported and imported library pack', async () => {
    const text = serialiseLibraryPack({
      projects: [createDefaultProject(1_000)],
      presets: [iconPreset()],
      quantisePresets: [],
      customIcons: [],
    });
    const pack = parseLibraryPack(text, 2_000);
    if (pack === null) throw new Error('the pack did not parse');
    expect(pack.presets[0]?.subject).toEqual(customIconSubject());

    await backend.replaceLibrary(pack);
    const [preset] = await backend.listPresets();
    expect(preset?.subject).toEqual(customIconSubject());
  });

  it('drops a stored entry citing a section, so the restored set compiles', async () => {
    storage.setItem(
      STORAGE_KEYS.studioSession,
      JSON.stringify({ category: 'ICON', subject: hostileStoredSubject(), output: DEFAULT_OUTPUT_CONFIG }),
    );

    const subject = (await backend.loadSession())?.subject;
    expect(subject).toEqual(customIconSubject());
    if (subject === undefined) throw new Error('the session did not load');
    const prompt = generatePrompt('ICON', subject, { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1 });
    expect(prompt).not.toContain('[SEC:');
    expect(prompt).toContain('Nightcity Keycard Relic ×1');
  });
});
