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
 * The running app never calls these — it arms once and stays armed for as long as the tab is open,
 * which is exactly the lifetime a session has. They exist because a Zustand store is a module
 * singleton: a subscription outlives whatever registered it, so without a way to remove one, a
 * second arming can only ever add to the first.
 */
let unsubscribes: (() => void)[] = [];

/** The studio right now, in the shape storage keeps it. */
function currentSession(): StudioSession {
  const { category, subject } = useSubjectStore.getState();
  return { category, subject, output: useOutputStore.getState().output };
}

function scheduleSave(): void {
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = undefined;
    const session = currentSession();
    void getDatabase()
      .then((database) => database.saveSession(session))
      .catch(() => {
        // Deliberately silent, and one of only two writes in the app that are. A studio that could
        // not be remembered is a worse *next* visit, not a failed action the user took — and the
        // toast for it would fire on a keystroke, repeatedly, about a condition they cannot act on.
      });
  }, SESSION_SAVE_DEBOUNCE_MS);
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
        }
      } catch {
        // An unreadable database costs this visit its restore and nothing else.
      } finally {
        // Armed even when the read failed: a session that could not be *loaded* should still be
        // saved, so the next visit has a chance of coming back.
        unsubscribes = [useSubjectStore.subscribe(scheduleSave), useOutputStore.subscribe(scheduleSave)];
        set({ isRestored: true });
      }
    })();
    await restoring;
  },
}));
