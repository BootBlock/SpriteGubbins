import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../constants/settings.ts';
import { FakeDatabaseWorker } from '../test/fakeDatabaseWorker.ts';
import { openSqliteBackend } from './sqliteBackend.ts';
import type { SqliteBackend } from './sqliteBackend.ts';

/** The thread the backend started, which every test here has to have got one of. */
function thread(): FakeDatabaseWorker {
  const started = FakeDatabaseWorker.started.at(-1);
  if (started === undefined) throw new Error('no thread was started');
  return started;
}

/** An open backend, with the handshake answered as the real worker answers it — unprompted. */
async function open(): Promise<SqliteBackend> {
  const opening = openSqliteBackend();
  thread().handshake(true);
  const backend = await opening;
  if (backend === null) throw new Error('the backend refused to open');
  return backend;
}

beforeEach(() => {
  FakeDatabaseWorker.started = [];
  vi.stubGlobal('Worker', FakeDatabaseWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openSqliteBackend', () => {
  it('resolves to null when the worker reports no database', async () => {
    const opening = openSqliteBackend();
    thread().handshake(false);

    expect(await opening).toBeNull();
    expect(thread().terminated).toBe(true);
  });

  it('resolves to null when the thread dies during the handshake', async () => {
    const opening = openSqliteBackend();
    thread().die();

    expect(await opening).toBeNull();
  });

  it('resolves to null when the handshake itself will not deserialise', async () => {
    // The worst place in the file for a promise to hang: `getDatabase` memoises this one, so every
    // store's hydration awaits it for the session and the localStorage fallback is never reached.
    const opening = openSqliteBackend();
    thread().garble();

    expect(await opening).toBeNull();
    expect(thread().terminated).toBe(true);
  });
});

describe('SqliteBackend', () => {
  it('settles a call with the answer that came back', async () => {
    const backend = await open();
    const listing = backend.listPresets();
    thread().answer({ id: thread().lastId('listPresets'), ok: true, value: [] });

    await expect(listing).resolves.toEqual([]);
  });

  it('rejects everything in flight when the thread dies', async () => {
    // The failure this whole file is about. Every caller awaits and every one has a `catch` that
    // raises a toast — but a promise that never settles reaches neither that `catch` nor the
    // `finally` beside it, so the spinner never stops and nothing is ever said.
    const backend = await open();
    const listing = backend.listPresets();
    const saving = backend.saveSettings(DEFAULT_SETTINGS);

    thread().die();

    await expect(listing).rejects.toThrow('The database thread stopped answering');
    await expect(saving).rejects.toThrow('The database thread stopped answering');
    expect(thread().terminated).toBe(true);
  });

  it('refuses a call made after the thread died, rather than posting into the void', async () => {
    const backend = await open();
    thread().die();
    const posted = thread().calls.length;

    await expect(backend.listPresets()).rejects.toThrow('The database thread stopped answering');
    expect(thread().calls).toHaveLength(posted);
  });

  it('rejects everything in flight when a reply will not deserialise', async () => {
    // `messageerror` carries no correlation id, so there is no telling which call it answered — and
    // no `message` follows it. Every call in flight is therefore one whose answer may never come.
    const backend = await open();
    const listing = backend.listPresets();

    thread().garble();

    await expect(listing).rejects.toThrow('A database reply could not be read back from its thread');
  });

  it('keeps the thread after an unreadable reply, and takes the next call', async () => {
    // Unlike a thread that died: the database is still open on the other side, and the realistic
    // cause is room on one large listing, which says nothing about the next call.
    const backend = await open();
    await expect(
      (async () => {
        const listing = backend.listPresets();
        thread().garble();
        await listing;
      })(),
    ).rejects.toThrow('A database reply could not be read back from its thread');

    const again = backend.listPresets();
    thread().answer({ id: thread().lastId('listPresets'), ok: true, value: [] });

    expect(thread().terminated).toBe(false);
    await expect(again).resolves.toEqual([]);
  });
});
