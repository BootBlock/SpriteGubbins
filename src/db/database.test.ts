import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDatabaseWorker } from '../test/fakeDatabaseWorker.ts';
import { HELD_ELSEWHERE_REFUSAL } from './heldElsewhereBackend.ts';
import { getDatabase, resetDatabaseForTests } from './database.ts';
import { parseSettings } from './settingsParser.ts';
import type { DatabaseRefusal } from './workerProtocol.ts';

/**
 * Which backend the app lands on, and what a second tab of the same origin gets.
 *
 * **The defect this file exists for was a `??`.** `openBackend` read
 * `sqlite ?? new LocalStorageBackend()`, which answers every failed open the same way — and one of
 * them is not like the others. OPFS being absent means this browser cannot store a database, and
 * localStorage is right for it. Another tab of this origin holding the SAH pool's access handles
 * means the database is present, holds the reader's work, and is one tab away — and localStorage
 * there is a *second, empty library*. Driven in Edge before the fix, the second tab opened its
 * Projects panel on `Default 0` over a library that was not empty, wrote a fresh Default project
 * into a store the first tab could not see, saved a preset into it, and lost that preset the moment
 * the first tab closed and the second reloaded onto the real database.
 *
 * **So the assertion is which backend, not whether one arrived.** A test that only asked
 * `getDatabase()` to resolve passed before the fix and passes after it; what tells the two apart is
 * `kind`, which is also the one thing above `database.ts` that is allowed to read it.
 *
 * **And that the held backend never writes.** The Default project is the specific write that forked
 * the library — `useProjectStore.fetchProjects` answers an empty `listProjects` by creating one,
 * which is right on a first visit and is exactly how the second library got started. It is asserted
 * here rather than in the store because the store must not know which backend it got: the refusal
 * is what stops it, and the store needs no branch at all.
 */

/** The fake thread this run started, or a failure that says none was. */
function thread(): FakeDatabaseWorker {
  const [started] = FakeDatabaseWorker.started;
  if (started === undefined) throw new Error('no worker was started');
  return started;
}

/** Bring the app's one backend up against a worker that refuses, and say which refusal. */
async function backendAfterRefusal(refusal: DatabaseRefusal) {
  const opening = getDatabase();
  thread().handshake(false, refusal);
  return opening;
}

beforeEach(() => {
  resetDatabaseForTests();
  FakeDatabaseWorker.started = [];
  vi.stubGlobal('Worker', FakeDatabaseWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetDatabaseForTests();
});

describe('getDatabase', () => {
  it('takes the SQLite backend when the worker has one', async () => {
    const opening = getDatabase();
    thread().handshake(true);

    expect((await opening).kind).toBe('sqlite-opfs');
  });

  it('falls back to localStorage where there is no database to open', async () => {
    expect((await backendAfterRefusal('ABSENT')).kind).toBe('localstorage');
  });

  it('does not fall back to localStorage where another tab holds the database', async () => {
    // The assertion the `??` failed: a second library is the wrong answer here, not a lesser one.
    expect((await backendAfterRefusal('HELD_ELSEWHERE')).kind).toBe('held-elsewhere');
  });
});

describe('the backend for a database another tab holds', () => {
  it('reads an empty library rather than refusing every hydration on boot', async () => {
    const database = await backendAfterRefusal('HELD_ELSEWHERE');

    // Empty rather than a rejection: every store hydrates at once, and refusing each would open the
    // app under a stack of notifications describing one condition six times over.
    await expect(database.listProjects()).resolves.toEqual([]);
    await expect(database.listPresets()).resolves.toEqual([]);
    await expect(database.listQuantisePresets()).resolves.toEqual([]);
    await expect(database.listHistoryLogs()).resolves.toEqual([]);
    await expect(database.loadSession()).resolves.toBeNull();
  });

  it('refuses to write the Default project that forked the library', async () => {
    const database = await backendAfterRefusal('HELD_ELSEWHERE');

    await expect(
      database.saveProject({
        id: 'default',
        name: 'Default',
        description: '',
        createdAt: 0,
        updatedAt: 0,
      }),
    ).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
  });

  it('refuses every other write too, so nothing a reader does here is silently dropped', async () => {
    const database = await backendAfterRefusal('HELD_ELSEWHERE');

    // Listed one by one rather than swept, because a write added to the interface and left
    // resolving here is exactly the silent no-op this backend exists to prevent.
    await expect(database.savePreset({} as never)).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
    await expect(database.deletePreset('x')).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
    await expect(database.saveQuantisePreset({} as never)).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
    await expect(database.deleteQuantisePreset('x')).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
    await expect(database.deleteProject('x')).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
    await expect(database.addHistoryLog({} as never)).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
    await expect(database.deleteHistoryLog('x')).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
    await expect(database.clearHistoryLogs()).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
    await expect(database.replaceLibrary({} as never)).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
    await expect(database.saveSettings({} as never)).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
    await expect(database.saveSession({} as never)).rejects.toThrow(HELD_ELSEWHERE_REFUSAL);
  });

  it('answers the app’s own default settings, so the page still renders', async () => {
    const database = await backendAfterRefusal('HELD_ELSEWHERE');

    // The one read that is not empty, and the reason is at the top of `heldElsewhereBackend.ts`:
    // these decide how the page draws rather than what it holds, and a tab with no accent and no
    // motion setting would be reporting this condition by breaking rather than by describing it.
    // Compared against the shared parser's own answer for "nothing stored", which is what the
    // interface documents every backend to give — so this cannot drift from the other two.
    await expect(database.loadSettings()).resolves.toEqual(parseSettings(undefined));
  });
});
