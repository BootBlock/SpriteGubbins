/** Shell-level UI constants — the timings the chrome shares with the stores. */

/**
 * How long a toast stays on screen before dismissing itself.
 *
 * The original app's own timing. Long enough to read a short confirmation, short enough that it is
 * gone before the user's next action — and the toast stays dismissible, so this is a ceiling
 * rather than something to wait out.
 */
export const TOAST_DURATION_MS = 3000;
