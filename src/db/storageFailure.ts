import { HELD_ELSEWHERE_REFUSAL } from './heldElsewhereBackend.ts';

/**
 * What to tell the reader when a storage operation failed — their own words where the app has them.
 *
 * **Every store already had a sentence for this, and every one of them was a shrug.** "Could not
 * save that preset" is the right thing to say when a write failed for a reason nobody can name: an
 * exhausted quota, a corrupt row, a thread that died. It is the wrong thing to say in the one case
 * where the app knows exactly what happened and exactly what the reader should do — a second tab of
 * this origin, where the database is one tab away and *every* write will fail until they close it.
 * A reader told "Could not save that preset" there tries again, and again, and concludes the app is
 * broken.
 *
 * So the fallback stays for everything unexplained, and the one refusal the app can explain replaces
 * it. Matched against {@link HELD_ELSEWHERE_REFUSAL} by value rather than by type: it is the app's
 * own constant, thrown from one file, and comparing the message keeps this a plain string question
 * with nothing to keep in step.
 *
 * **It deliberately does not surface an arbitrary `Error.message`.** `sqliteBackend.ts` rejects with
 * things like "the database is not open" and "A database reply could not be read back from its
 * thread", which are true, useful in a bug report and meaningless in a notification. Naming the one
 * message the app wrote for a reader is the whole of what this does.
 */
export function storageFailure(fallback: string, error: unknown): string {
  return isHeldElsewhere(error) ? HELD_ELSEWHERE_REFUSAL : fallback;
}

/**
 * Whether this failure is the one the app can explain.
 *
 * Exported for the one caller that has to *compose* rather than substitute. `useSettingsStore` keeps
 * a setting applied when its write is refused — the accent is on screen and works for the session,
 * so reverting it would undo a click the reader watched take effect — and the sentence saying that
 * is the half they most need. It appends the reason instead of replacing the message, which is a
 * question about the error rather than a request for a sentence, and asking it through
 * {@link storageFailure} would mean passing an empty fallback as a sentinel: a contract that
 * function does not have, and one nothing else could rely on.
 */
export function isHeldElsewhere(error: unknown): boolean {
  return error instanceof Error && error.message === HELD_ELSEWHERE_REFUSAL;
}
