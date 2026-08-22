import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { SESSION_SAVE_DEBOUNCE_MS } from '../constants/session.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { LocalStorageBackend } from '../db/localStorageBackend.ts';
import { createMemoryStorage } from '../db/webStorage.ts';
import { createFailingBackend } from '../test/backendDoubles.ts';
import { resetSessionForTests, useSessionStore } from './useSessionStore.ts';
import { useOutputStore } from './useOutputStore.ts';
import { canUndoStudio } from '../utils/studioHistory.ts';
import { useSubjectStore } from './useSubjectStore.ts';

/**
 * The session store restores the studio and then keeps it written, and the interesting part is the
 * *ordering*: the boot defaults sit in the subject and output stores until the read resolves, so a
 * subscription armed too early would save those defaults over the session being restored. Every case
 * below is really about that, or about what happens when storage says no.
 *
 * Backed by a real `LocalStorageBackend` over an in-memory store, as the other store tests are —
 * only the module that *chooses* a backend is mocked, because that choice needs a browser.
 */
let backend: PersistenceBackend = new LocalStorageBackend(createMemoryStorage());

vi.mock('../db/database.ts', () => ({
  getDatabase: () => Promise.resolve(backend),
}));

/** Let the debounced write fire and its promise chain settle. */
async function flushSave(): Promise<void> {
  await vi.advanceTimersByTimeAsync(SESSION_SAVE_DEBOUNCE_MS);
  await Promise.resolve();
}

/** Hide the page, as a tab being switched away from does. */
function hidePage(): void {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  backend = new LocalStorageBackend(createMemoryStorage());
  resetSessionForTests();
  useSessionStore.setState({ isRestored: false });
  useSubjectStore.getState().setStudio(DEFAULT_PRESET.category, DEFAULT_PRESET.subject, () => {
    useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  });
  useOutputStore.getState().setOutputConfig(DEFAULT_OUTPUT_CONFIG);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  // `document.visibilityState` is a getter, and a spy on one outlives the case that installed it —
  // which would leave every later case running against a permanently hidden page.
  vi.restoreAllMocks();
});

describe('useSessionStore — restoring', () => {
  it('puts a stored session back into the subject and output stores', async () => {
    const subject = { ...defaultSubjectFor('CREATURE'), species: 'Direwolf' };
    await backend.saveSession({
      category: 'CREATURE',
      subject,
      output: { ...DEFAULT_OUTPUT_CONFIG, targetModel: 'MIDJOURNEY' },
    });

    await useSessionStore.getState().restoreSession();

    expect(useSubjectStore.getState().category).toBe('CREATURE');
    expect(useSubjectStore.getState().subject.species).toBe('Direwolf');
    expect(useOutputStore.getState().output.targetModel).toBe('MIDJOURNEY');
    expect(useSessionStore.getState().isRestored).toBe(true);
  });

  it('opens the undo stack on the restored studio rather than recording a step into it', async () => {
    // The restored session is the position this visit starts from. The two writes that apply it
    // would otherwise leave a step behind, and the reader's first Undo would take them to a default
    // studio they had never seen — the opposite of what the control is for.
    await backend.saveSession({
      category: 'CREATURE',
      subject: defaultSubjectFor('CREATURE'),
      output: { ...DEFAULT_OUTPUT_CONFIG, targetModel: 'MIDJOURNEY' },
    });

    await useSessionStore.getState().restoreSession();

    expect(canUndoStudio(useSubjectStore.getState().history)).toBe(false);
    useSubjectStore.getState().undoStudio();
    expect(useSubjectStore.getState().category).toBe('CREATURE');
    expect(useOutputStore.getState().output.targetModel).toBe('MIDJOURNEY');
  });

  it('leaves the studio alone on a first visit', async () => {
    // No row stored. The studio's own boot state is already the right answer, and overwriting it
    // with a reconstructed default would be indistinguishable from restoring a real session.
    await useSessionStore.getState().restoreSession();

    expect(useSubjectStore.getState().category).toBe(DEFAULT_PRESET.category);
    expect(useSubjectStore.getState().subject).toEqual(DEFAULT_PRESET.subject);
    expect(useSessionStore.getState().isRestored).toBe(true);
  });

  it('restores the category and subject together', async () => {
    // Through `setStudio`, in one call: a subject only means anything against its category, so a
    // restore that set them separately would leave a frame in which the wrong pool was in force —
    // and the output has to land inside the same call, or the undo stack records half a studio.
    const setStudio = vi.spyOn(useSubjectStore.getState(), 'setStudio');
    await backend.saveSession({
      category: 'BUILDING',
      subject: defaultSubjectFor('BUILDING'),
      output: DEFAULT_OUTPUT_CONFIG,
    });

    await useSessionStore.getState().restoreSession();

    // Both arguments pinned: `expect.objectContaining({})` would match any object at all, so it
    // would pass even if the subject arrived empty — which is the failure this case is here for.
    expect(setStudio).toHaveBeenCalledTimes(1);
    expect(setStudio).toHaveBeenCalledWith('BUILDING', defaultSubjectFor('BUILDING'), expect.any(Function));
    setStudio.mockRestore();
  });

  it('still finishes, and still arms the writes, when the read fails', async () => {
    backend = createFailingBackend();

    await useSessionStore.getState().restoreSession();
    expect(useSessionStore.getState().isRestored).toBe(true);

    // A session that could not be loaded should still be saved — otherwise one unreadable read
    // costs the user every future visit as well as this one.
    backend = new LocalStorageBackend(createMemoryStorage());
    useSubjectStore.getState().setCategory('ITEM');
    await flushSave();

    expect(await backend.loadSession()).not.toBeNull();
  });

  it('joins a second call to the first rather than restoring twice', async () => {
    // React 19 Strict Mode double-invokes every effect in development, and `App` starts this from
    // one. Two concurrent restores could apply the stored session over edits made in between.
    const loadSession = vi.spyOn(backend, 'loadSession');

    await Promise.all([
      useSessionStore.getState().restoreSession(),
      useSessionStore.getState().restoreSession(),
    ]);

    expect(loadSession).toHaveBeenCalledTimes(1);
  });

  it('does nothing on a later call once it has restored', async () => {
    await useSessionStore.getState().restoreSession();
    const loadSession = vi.spyOn(backend, 'loadSession');

    await useSessionStore.getState().restoreSession();

    expect(loadSession).not.toHaveBeenCalled();
  });
});

describe('useSessionStore — saving', () => {
  it('writes the studio after a change settles', async () => {
    await useSessionStore.getState().restoreSession();

    useSubjectStore.getState().setCategory('ITEM');
    await flushSave();

    expect((await backend.loadSession())?.category).toBe('ITEM');
  });

  it('writes once for a burst of changes', async () => {
    await useSessionStore.getState().restoreSession();
    const saveSession = vi.spyOn(backend, 'saveSession');

    // Five edits inside the debounce window — a typed word, in effect.
    for (const species of ['A', 'Ax', 'Axe', 'Axe ', 'Axe H']) {
      useSubjectStore.getState().setStudio('ITEM', { ...defaultSubjectFor('ITEM'), species }, () => {});
    }
    await flushSave();

    expect(saveSession).toHaveBeenCalledTimes(1);
    expect((await backend.loadSession())?.subject.species).toBe('Axe H');
  });

  it('writes output changes as well as subject ones', async () => {
    await useSessionStore.getState().restoreSession();

    useOutputStore.getState().setOutputConfig({ ...DEFAULT_OUTPUT_CONFIG, targetModel: 'FLUX' });
    await flushSave();

    expect((await backend.loadSession())?.output.targetModel).toBe('FLUX');
  });

  it('does not write before the session has been restored', async () => {
    // The ordering this store exists to get right: the subject store holds boot defaults until the
    // read resolves, so a subscription armed before it would save those over the stored session.
    const saveSession = vi.spyOn(backend, 'saveSession');

    useSubjectStore.getState().setCategory('OBJECT');
    await flushSave();

    expect(saveSession).not.toHaveBeenCalled();
  });

  it('writes a pending save when the page is hidden', async () => {
    // The debounce window is also a window in which the edit exists only in the store, and a tab
    // switched away from on a phone may never come back — so being hidden ends the wait early.
    await useSessionStore.getState().restoreSession();

    useSubjectStore.getState().setCategory('ITEM');
    hidePage();
    await Promise.resolve();

    expect((await backend.loadSession())?.category).toBe('ITEM');
  });

  it('writes a pending save when the page goes away', async () => {
    // `pagehide` rather than `beforeunload`, because that is the event a mobile browser and the
    // back/forward cache both fire — and it does not require the document to be hidden yet.
    await useSessionStore.getState().restoreSession();

    useSubjectStore.getState().setCategory('OBJECT');
    window.dispatchEvent(new Event('pagehide'));
    await Promise.resolve();

    expect((await backend.loadSession())?.category).toBe('OBJECT');
  });

  it('writes once when a flush and the timer both come due', async () => {
    // The flush clears the timer it pre-empts. Without that the same session would be written a
    // second time on return, and a page hidden and shown again would cost a write per trip.
    await useSessionStore.getState().restoreSession();
    const saveSession = vi.spyOn(backend, 'saveSession');

    useSubjectStore.getState().setCategory('ITEM');
    hidePage();
    await flushSave();

    expect(saveSession).toHaveBeenCalledTimes(1);
  });

  it('does not write when the page is hidden with nothing pending', async () => {
    // Hiding is not itself a reason to write: a reader switching tabs with no unsaved edit would
    // otherwise pay a whole-studio serialisation per trip.
    await useSessionStore.getState().restoreSession();
    const saveSession = vi.spyOn(backend, 'saveSession');

    hidePage();
    window.dispatchEvent(new Event('pagehide'));
    await Promise.resolve();

    expect(saveSession).not.toHaveBeenCalled();
  });

  it('ignores the page becoming visible again', async () => {
    // `visibilitychange` fires on the way back too, and the state is what tells the two apart.
    await useSessionStore.getState().restoreSession();
    const saveSession = vi.spyOn(backend, 'saveSession');

    useSubjectStore.getState().setCategory('ITEM');
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();

    expect(saveSession).not.toHaveBeenCalled();
  });

  it('takes the flush listeners off with the store subscriptions', async () => {
    // Asserted through the registrations rather than through a write, because a leaked listener has
    // no observable one: it calls the same module-level flush, which is idempotent. What can go
    // wrong is the *identity* — a remover passed a differently-bound function removes nothing, and
    // the listeners then accumulate on every re-arm for as long as the module is loaded.
    const documentAdd = vi.spyOn(document, 'addEventListener');
    const documentRemove = vi.spyOn(document, 'removeEventListener');
    const windowAdd = vi.spyOn(window, 'addEventListener');
    const windowRemove = vi.spyOn(window, 'removeEventListener');

    await useSessionStore.getState().restoreSession();
    const visibilityHandler = documentAdd.mock.calls.find(([type]) => type === 'visibilitychange')?.[1];
    // `String(type)`, because `vi.spyOn(window, 'addEventListener')` resolves to the worker-scope
    // overload under this project's libs, and comparing its narrower event-name union against
    // 'pagehide' is a type error rather than a false test.
    const pageHideHandler = windowAdd.mock.calls.find(([type]) => String(type) === 'pagehide')?.[1];
    expect(visibilityHandler).toBeTypeOf('function');
    expect(pageHideHandler).toBeTypeOf('function');

    resetSessionForTests();

    expect(documentRemove).toHaveBeenCalledWith('visibilitychange', visibilityHandler);
    expect(windowRemove).toHaveBeenCalledWith('pagehide', pageHideHandler);
  });

  it('stays silent when the write is refused', async () => {
    await useSessionStore.getState().restoreSession();
    backend = createFailingBackend();

    useSubjectStore.getState().setCategory('ITEM');

    // The rejection is swallowed on purpose — it would otherwise fire on a keystroke, repeatedly,
    // about something the user cannot act on. What must not happen is an unhandled rejection.
    await expect(flushSave()).resolves.toBeUndefined();
  });
});
