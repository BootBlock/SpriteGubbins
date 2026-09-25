import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageBackend } from './localStorageBackend.ts';
import { STORAGE_KEYS } from './schema.ts';
import { toProjectRow } from './localStorageRows.ts';
import {
  createMemoryStorage,
  isMemoryStorage,
  resolveWebStorage,
  type WebStorageLike,
} from './webStorage.ts';
import { createDefaultProject } from '../constants/projects.ts';
import { createBoundedStorage, createRefusingStorage } from '../test/storageDoubles.ts';

/**
 * Which store the fallback backend is given, and whether it says so.
 *
 * The case these exist for is a `localStorage` at its quota: it refuses every write and still reads.
 * A probe that wrote answered that store with an empty one in memory, so the reader's library stayed
 * where nothing read it and every save of the session went to a Map a reload discarded — while the
 * Architecture tab went on naming the browser's local storage.
 */

/** A `localStorage` that holds `entries`, reads them, and throws on every write, as one at its quota does. */
function fullStorage(entries: Record<string, string>): Storage {
  const held = new Map(Object.entries(entries));
  const refuse = (): never => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  };
  return {
    getItem: (key: string) => held.get(key) ?? null,
    setItem: refuse,
    removeItem: refuse,
    clear: refuse,
    key: () => null,
    get length() {
      return held.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveWebStorage', () => {
  it('keeps a full localStorage, and the library it holds stays readable', async () => {
    const harbour = { ...createDefaultProject(1_000), id: 'harbour', name: 'Harbour' };
    const full = fullStorage({ [STORAGE_KEYS.projects]: JSON.stringify([toProjectRow(harbour)]) });
    vi.stubGlobal('localStorage', full);

    const backend = new LocalStorageBackend();

    expect(resolveWebStorage()).toBe(full);
    expect(backend.kind).toBe('localstorage');
    expect(await backend.listProjects()).toEqual([harbour]);
  });

  it('reports a refused write on that store rather than keeping it somewhere a reload discards', async () => {
    vi.stubGlobal('localStorage', fullStorage({}));

    await expect(new LocalStorageBackend().saveProject(createDefaultProject(1_000))).rejects.toThrow(
      /Storage refused the write/,
    );
  });

  it('falls back to memory where localStorage cannot be read', () => {
    vi.stubGlobal('localStorage', {
      ...fullStorage({}),
      getItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });

    expect(isMemoryStorage(resolveWebStorage())).toBe(true);
    expect(new LocalStorageBackend().kind).toBe('memory');
  });

  it('falls back to memory where there is no localStorage at all', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(new LocalStorageBackend().kind).toBe('memory');
  });
});

describe('isMemoryStorage', () => {
  it('knows the stores it made from every other kind', () => {
    const lookalike: WebStorageLike = { getItem: () => null, setItem: () => undefined };

    expect(isMemoryStorage(createMemoryStorage())).toBe(true);
    expect(isMemoryStorage(lookalike)).toBe(false);
    expect(isMemoryStorage(createRefusingStorage())).toBe(false);
    expect(isMemoryStorage(createBoundedStorage(100))).toBe(false);
  });
});
