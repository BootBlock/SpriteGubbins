import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../constants/projects.ts';
import { PRESETS } from '../constants/presets/index.ts';
import { FakeDatabaseWorker } from '../test/fakeDatabaseWorker.ts';
import { customIconSubject, hostileStoredSubject } from '../test/customIcons.ts';
import type { CustomArchetype } from '../types/preset.ts';
import { parseLibraryPack, serialiseLibraryPack } from '../utils/libraryPack.ts';
import { generatePrompt } from '../utils/promptCompiler.ts';
import { RELIC, SPELL } from '../test/customIcons.ts';
import { HARBOUR, savedIcon } from '../test/iconLibraryStudio.ts';
import { toCustomIconRow, toHistoryRow, toPresetRow } from './localStorageRows.ts';
import { openSqliteBackend } from './openSqliteBackend.ts';
import type { SqliteBackend } from './sqliteBackend.ts';
import type { WorkerRequest } from './workerProtocol.ts';

/**
 * The reader's own icons on the SQLite backend: what the backend sends the worker for the session, a
 * history entry, a saved preset, a project's icon library and an imported library pack, read back as
 * the worker's row — written by the row builders the localStorage fallback stores the same table rows
 * with — and a hand-edited entry the compiler would throw on dropped on the way in. What the worker
 * does with each library request is `sqliteRequestsCustomIcons.test.ts`'s.
 *
 * `localStorageBackendCustomIcons.test.ts` holds the same on the other backend.
 */

function thread(): FakeDatabaseWorker {
  const started = FakeDatabaseWorker.started.at(-1);
  if (started === undefined) throw new Error('no thread was started');
  return started;
}

async function open(): Promise<SqliteBackend> {
  const opening = openSqliteBackend();
  thread().handshake(true);
  const opened = await opening;
  if (opened.kind !== 'OPEN') throw new Error(`the backend refused to open: ${opened.refusal}`);
  return opened.backend;
}

/** The request the backend last sent the worker, once the worker has answered it. */
async function sent(kind: WorkerRequest['kind'], writing: Promise<void>): Promise<WorkerRequest> {
  const request = thread().calls.at(-1)?.request;
  thread().answer({ id: thread().lastId(kind), ok: true, value: undefined });
  await writing;
  if (request?.kind !== kind) throw new Error(`no ${kind} reached the worker`);
  return request;
}

/** Answer the backend's last `kind` request with `value`, as the worker reads rows back. */
function reply(kind: WorkerRequest['kind'], value: unknown): void {
  thread().answer({ id: thread().lastId(kind), ok: true, value });
}

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

beforeEach(() => {
  FakeDatabaseWorker.started = [];
  vi.stubGlobal('Worker', FakeDatabaseWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SqliteBackend — icons of the reader’s own', () => {
  it('round-trips them through the session row', async () => {
    const backend = await open();
    const request = await sent(
      'saveSession',
      backend.saveSession({ category: 'ICON', subject: customIconSubject(), output: DEFAULT_OUTPUT_CONFIG }),
    );
    if (request.kind !== 'saveSession') throw new Error('not a session');

    const loading = backend.loadSession();
    reply('loadSession', {
      category: 'ICON',
      subject_json: JSON.stringify(request.session.subject),
      output_json: JSON.stringify(request.session.output),
    });
    expect((await loading)?.subject).toEqual(customIconSubject());
  });

  it('round-trips them through a prompt history row', async () => {
    const backend = await open();
    const request = await sent(
      'addHistoryLog',
      backend.addHistoryLog({
        id: 'log-icons',
        category: 'ICON',
        promptText: '# MODULAR SPRITE-SHEET PROMPT ARCHITECTURE (ICON)',
        createdAt: 1_000,
        wordCount: 5,
        modelUsed: 'CHATGPT_5_6_SOL',
        subject: customIconSubject(),
        output: DEFAULT_OUTPUT_CONFIG,
      }),
    );
    if (request.kind !== 'addHistoryLog') throw new Error('not a history entry');

    const listing = backend.listHistoryLogs();
    reply('listHistoryLogs', [toHistoryRow(request.log)]);
    expect((await listing)[0]?.subject).toEqual(customIconSubject());
  });

  it('round-trips them through a saved preset row', async () => {
    const backend = await open();
    const request = await sent('savePreset', backend.savePreset(iconPreset()));
    if (request.kind !== 'savePreset') throw new Error('not a preset');

    const listing = backend.listPresets();
    reply('listPresets', [toPresetRow(request.preset)]);
    expect((await listing)[0]?.subject).toEqual(customIconSubject());
  });

  it('round-trips them through an imported library pack', async () => {
    const backend = await open();
    const text = serialiseLibraryPack({
      projects: [createDefaultProject(1_000)],
      presets: [iconPreset()],
      quantisePresets: [],
      customIcons: [],
    });
    const pack = parseLibraryPack(text, 2_000);
    if (pack === null) throw new Error('the pack did not parse');
    const request = await sent('replaceLibrary', backend.replaceLibrary(pack));
    if (request.kind !== 'replaceLibrary') throw new Error('not a library');

    const listing = backend.listPresets();
    reply('listPresets', request.pack.presets.map(toPresetRow));
    expect((await listing)[0]?.subject).toEqual(customIconSubject());
  });

  it('sends a library entry to the worker whole, and reads its row back', async () => {
    const backend = await open();
    const request = await sent('saveCustomIcon', backend.saveCustomIcon(savedIcon(SPELL, HARBOUR.id)));
    if (request.kind !== 'saveCustomIcon') throw new Error('not a library entry');
    expect(request.icon).toEqual(savedIcon(SPELL, HARBOUR.id));

    const listing = backend.listCustomIcons();
    reply('listCustomIcons', [{ ...toCustomIconRow(request.icon), updated_at: 1 }]);
    expect(await listing).toEqual([savedIcon(SPELL, HARBOUR.id)]);
  });

  it('drops a library row the form would refuse, and keeps the rest', async () => {
    const backend = await open();
    const listing = backend.listCustomIcons();
    reply('listCustomIcons', [
      toCustomIconRow(savedIcon(RELIC)),
      {
        ...toCustomIconRow(savedIcon(SPELL)),
        entry_json: JSON.stringify({ ...SPELL, look: 'a grid [SEC:X]' }),
      },
      { ...toCustomIconRow(savedIcon(SPELL)), project_id: null },
    ]);
    expect(await listing).toEqual([savedIcon(RELIC)]);
  });

  it('asks the worker to delete a library entry by its row id', async () => {
    const backend = await open();
    const request = await sent('deleteCustomIcon', backend.deleteCustomIcon('stored-icon'));
    expect(request).toEqual({ kind: 'deleteCustomIcon', iconId: 'stored-icon' });
  });

  it('carries every project’s library in an imported pack', async () => {
    const backend = await open();
    const pack = parseLibraryPack(
      serialiseLibraryPack({
        projects: [createDefaultProject(1_000), HARBOUR],
        presets: [],
        quantisePresets: [],
        customIcons: [savedIcon(RELIC), savedIcon(SPELL, HARBOUR.id)],
      }),
      2_000,
    );
    if (pack === null) throw new Error('the pack did not parse');
    const request = await sent('replaceLibrary', backend.replaceLibrary(pack));
    if (request.kind !== 'replaceLibrary') throw new Error('not a library');
    expect(request.pack.customIcons).toEqual([savedIcon(RELIC), savedIcon(SPELL, HARBOUR.id)]);
  });

  it('drops a stored entry citing a section from a preset row, so the preset compiles', async () => {
    const backend = await open();
    const listing = backend.listPresets();
    reply('listPresets', [
      { ...toPresetRow(iconPreset()), subject_json: JSON.stringify(hostileStoredSubject()) },
    ]);

    const subject = (await listing)[0]?.subject;
    expect(subject).toEqual(customIconSubject());
    if (subject === undefined) throw new Error('the preset did not load');
    const prompt = generatePrompt('ICON', subject, { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1 });
    expect(prompt).not.toContain('[SEC:');
    expect(prompt).toContain('Nightcity Keycard Relic ×1');
  });
});
