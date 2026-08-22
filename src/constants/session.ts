/**
 * How long the studio settles before the session is written.
 *
 * Every keystroke in a subject field is a store change, and each one would otherwise be a database
 * write — a JSON serialisation of the whole studio per character typed. This is long enough that a
 * typed word is one write rather than five, and nothing waits on it.
 *
 * **It is not what keeps a closing tab's last edit**, and no figure could be: a page can be hidden
 * at any moment, so the store flushes a pending write on `visibilitychange` and `pagehide` instead
 * of relying on the window being short. One window stays open regardless: the write is asynchronous
 * whichever backend answers, and a tab that does not survive it loses the edit. Nothing here has
 * measured how long that is.
 */
export const SESSION_SAVE_DEBOUNCE_MS = 400;
