import { create } from 'zustand';
import { SESSION_SAVE_DEBOUNCE_MS } from '../constants/session.ts';
import { getDatabase } from '../db/database.ts';
import type { StudioSession } from '../types/session.ts';
import { useOutputStore } from './useOutputStore.ts';
import { useSubjectStore } from './useSubjectStore.ts';

/**
 * Keeping the studio between visits.
 *
 * Everything on the Studio tab was lost on close — the category, every subject answer, and the whole
 * output configuration including the target model. Saving a preset was the only way to keep any of
 * it, which made a deliberate, named act the price of not losing an afternoon's work. This reads the
 * last state back on boot and keeps it written as it changes.
 *
 * **The second store that reaches into others**, and for the same reason `usePresetStore` does: a
 * session *is* the subject, its category and the output configuration together, so restoring one is
 * writing all three. It goes through each store's own actions rather than their internals, so their
 * invariants hold — the category and subject arrive in a single `setSubject` call, because a subject
 * only means anything against the category it was written for.
 *
 * Restoring raises no toast. It is not a preset load and not a merge: it is the studio being put
 * back as it was, so nothing was chosen and there is nothing to confirm.
 */
export interface SessionState {
  /**
   * Whether last session's state has been read back.
   *
   * Set in the same step that arms the writes, so it is an accurate answer to "is what I am looking
   * at last session's studio, or the defaults?". What actually stops the boot defaults overwriting a
   * stored session is the *ordering* — the subscriptions are wired after the read resolves — rather
   * than anything reading this flag.
   */
  readonly isRestored: boolean;

  /** Read last session's studio back, then keep it written. Safe to call more than once. */
  restoreSession(): Promise<void>;
}

/**
 * The restore in flight, so a second call joins the first rather than starting another.
 *
 * React 19 Strict Mode invokes every effect twice in development and `App` starts this from one.
 * Without the memo the second run would race the first, and could apply the stored session on top of
 * changes the user had already made in between.
 */
let restoring: Promise<void> | null = null;

/** The pending write. One timer for both stores, because one row holds both halves. */
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * How to stop listening, held so the arming can be undone.
 *
 * Two store subscriptions and the page-hidden flush's pair of DOM listeners, which come off
 * together because they are armed together. The running app never calls any of them — it arms once
 * and stays armed for as long as the tab is open, which is exactly the lifetime a session has. They
 * exist because a Zustand store is a module singleton: a subscription outlives whatever registered
 * it, so without a way to remove one, a second arming can only ever add to the first.
 */
let unsubscribes: (() => void)[] = [];

/** The studio right now, in the shape storage keeps it. */
function currentSession(): StudioSession {
  const { category, subject } = useSubjectStore.getState();
  return { category, subject, output: useOutputStore.getState().output };
}

/** Write the studio as it stands, now. */
function writeSession(): void {
  const session = currentSession();
  void getDatabase()
    .then((database) => database.saveSession(session))
    .catch(() => {
      // Deliberately silent, and one of only two writes in the app that are. A studio that could
      // not be remembered is a worse *next* visit, not a failed action the user took — and the
      // toast for it would fire on a keystroke, repeatedly, about a condition they cannot act on.
    });
}

function scheduleSave(): void {
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = undefined;
    writeSession();
  }, SESSION_SAVE_DEBOUNCE_MS);
}

/**
 * Write a pending save now, because the page may not be here when its timer fires.
 *
 * The debounce is what stops a keystroke being a database write, and it is also a window in which
 * everything typed since the last quiet moment exists only in the store. A tab that goes away in
 * that window loses it, and the figure cannot be tuned small enough to close it — so the events that
 * mean *going away* end it instead. Does nothing when no write is pending, so a page hidden and
 * shown again costs nothing.
 */
function flushSave(): void {
  if (saveTimer === undefined) return;
  clearTimeout(saveTimer);
  saveTimer = undefined;
  writeSession();
}

/**
 * The two events a page actually leaves by, and why both are needed.
 *
 * `beforeunload` is not among them: a mobile browser may freeze or discard a backgrounded tab
 * without ever unloading it, and this app is a PWA, so being switched away from is the ordinary way
 * it stops being on screen rather than the awkward one. `visibilitychange` is what fires there, and
 * `pagehide` is what fires on a close — including one that enters the back/forward cache, where no
 * unload happens either. They overlap on some paths, which costs nothing: the second call finds no
 * pending write and returns.
 *
 * `pagehide` flushes without reading the visibility state, because the document is not required to
 * be hidden by the time it fires.
 */
function armPageHiddenFlush(): () => void {
  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') flushSave();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', flushSave);
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', flushSave);
  };
}

/**
 * Disarm the writes and drop the pending one, so the next arming starts from nothing.
 *
 * For tests, which need each case to begin from a known state; the running app has no moment at
 * which it should stop remembering the studio.
 */
export function resetSessionForTests(): void {
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = undefined;
  restoring = null;
  for (const unsubscribe of unsubscribes) unsubscribe();
  unsubscribes = [];
}

export const useSessionStore = create<SessionState>((set, get) => ({
  isRestored: false,

  restoreSession: async () => {
    if (get().isRestored) return;
    restoring ??= (async () => {
      try {
        const stored = await getDatabase().then((database) => database.loadSession());
        // A first visit has no row, and the studio's own boot state is already the right answer for
        // it — the default preset, which is what it opens on.
        if (stored !== null) {
          useSubjectStore.getState().setSubject(stored.category, stored.subject);
          useOutputStore.getState().setOutputConfig(stored.output);
          // The restored studio is the position this visit *starts* from, so the stack opens there
          // rather than recording a step into it. Without this the two writes above would leave one
          // step behind, and the reader's first Undo would take them to a default studio they had
          // never seen — the opposite of what the control is for. After both writes, because an
          // opening position is the pair and not the subject half of it.
          useSubjectStore.getState().openStudio();
        }
      } catch {
        // An unreadable database costs this visit its restore and nothing else.
      } finally {
        // Armed even when the read failed: a session that could not be *loaded* should still be
        // saved, so the next visit has a chance of coming back.
        unsubscribes = [
          useSubjectStore.subscribe(scheduleSave),
          useOutputStore.subscribe(scheduleSave),
          armPageHiddenFlush(),
        ];
        set({ isRestored: true });
      }
    })();
    await restoring;
  },
}));
