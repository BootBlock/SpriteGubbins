/**
 * How long the studio settles before the session is written.
 *
 * Every keystroke in a subject field is a store change, and each one would otherwise be a database
 * write — a JSON serialisation of the whole studio per character typed. Long enough that a typed
 * word is one write rather than five; short enough that a tab closed straight after an edit still
 * has it. Nothing waits on this figure, so a save that has not fired yet costs the last moment of
 * typing and nothing else.
 */
export const SESSION_SAVE_DEBOUNCE_MS = 400;
