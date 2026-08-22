/**
 * How long the studio settles before the session is written.
 *
 * Every keystroke in a subject field is a store change, and each one would otherwise be a database
 * write — a JSON serialisation of the whole studio per character typed. This is long enough that a
 * typed word is one write rather than five, and nothing waits on it.
 *
 * **It is not what keeps a closing tab's last edit**, and no figure could be: a page can be hidden
 * at any moment, so the store flushes a pending write on `visibilitychange` and `pagehide` instead
 * of relying on the window being short. One window stays open regardless — the write crosses a
 * `postMessage` to the SQLite worker, and a tab that does not survive that round trip loses the
 * edit. That is the residue, and it is smaller than the debounce window this figure sets.
 */
export const SESSION_SAVE_DEBOUNCE_MS = 400;
