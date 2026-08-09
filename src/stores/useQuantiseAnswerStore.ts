import { create } from 'zustand';
import type { QuantiseResult, QuantiseSettings, SheetFacts } from '../types/quantiser.ts';

/**
 * What the worker made of the sheet it was handed, or why it could not.
 *
 * Local, as are the two below: they are the shape of this store's own state and nothing outside reads
 * them by name. `QuantiseAnswerState` is exported and refers to them, which TypeScript is content
 * with — a consumer can hold one without being able to write its type down.
 */
type Survey =
  | { readonly kind: 'facts'; readonly facts: SheetFacts }
  | { readonly kind: 'failed'; readonly reason: string };

/** An answer, and the exact question it answered — kept together so staleness is decidable. */
type Attempt =
  | {
      readonly kind: 'quantised';
      readonly settings: QuantiseSettings;
      readonly result: QuantiseResult;
    }
  | { readonly kind: 'failed'; readonly settings: QuantiseSettings; readonly reason: string };

/** A transform that produced a sheet, and the settings it was computed at. */
interface Succeeded {
  readonly settings: QuantiseSettings;
  readonly result: QuantiseResult;
}

/**
 * Everything the quantiser's worker has said about the sheet in hand.
 *
 * **A store rather than the tab's own state, for the same reason the sheet itself is one** — see
 * `useQuantiseStore`, which holds the questions this holds the answers to. `App` swaps the whole view
 * on navigation, so the tab is unmounted every time the user goes to the studio to change the colour
 * budget the quantiser reads, which is the ordinary way this feature is used. While these lived in the
 * tab's own `useState` that trip discarded every one of them: coming back re-sent a sheet of up to 67
 * megabytes to a brand-new thread, re-measured it, and re-ran a transform of up to 16.8 million pixels
 * whose inputs had not changed — seconds of work, and two structured clones of the sheet on the main
 * thread, to arrive back at the answer that had just been thrown away.
 *
 * **Every answer here is about whichever sheet is loaded now.** Nothing carries the image it was
 * about, because nothing has to: `quantiseSession` drops replies to jobs it has abandoned, and the two
 * store actions that change the sheet — `setSource` and `clear` — call {@link QuantiseAnswerState.forget}
 * in the same breath. So a stale answer is never filed, rather than being filed and guarded against.
 */
export interface QuantiseAnswerState {
  /** Detection and the source colour count, or `null` while the worker is still looking. */
  readonly survey: Survey | null;
  /** The latest reply of any kind, which is what decides whether the tab is up to date. */
  readonly attempt: Attempt | null;
  /**
   * The latest reply that produced a sheet, which is what stays on screen.
   *
   * Separate from {@link attempt} because a transform that runs out of memory at a grid of 1 should
   * report itself without also wiping the perfectly good result the user was looking at.
   */
  readonly succeeded: Succeeded | null;
  /**
   * The worker itself failed to start or died.
   *
   * Terminal for the **session** rather than for the sheet, which is the distinction the other three
   * do not need: both causes are properties of the browser — the worker module would not evaluate,
   * or module workers are unsupported — so dropping a new image meets the same failure, and
   * {@link forget} deliberately leaves this in place. A job that *failed* is a different matter
   * entirely, because the worker survives its own `catch`; those are filed against the settings they
   * were about, and stop applying when those change.
   *
   * {@link reset} is the only thing that clears it, and `quantiseSession`'s `releaseSheet` is the
   * only thing that lets a thread be built again — the two are called together, from `clear`, so the
   * app can never claim the quantiser could not start while a working thread is answering.
   */
  readonly fatal: string | null;

  surveyed(survey: Survey): void;
  attempted(attempt: Attempt): void;
  died(reason: string): void;
  /** Drop every answer about the sheet, because a different one is being loaded. */
  forget(): void;
  /** Drop everything, because the session itself is over. */
  reset(): void;
}

export const useQuantiseAnswerStore = create<QuantiseAnswerState>((set) => ({
  survey: null,
  attempt: null,
  succeeded: null,
  fatal: null,

  surveyed: (survey) => {
    set({ survey });
  },

  // One action for both outcomes, because the difference between them is exactly one field: a
  // transform that produced a sheet is also the sheet the tab keeps showing, and a transform that
  // failed is not. Splitting them into two actions would let a caller file the success and forget the
  // half that puts it on screen.
  attempted: (attempt) => {
    set(attempt.kind === 'quantised' ? { attempt, succeeded: attempt } : { attempt });
  },

  died: (fatal) => {
    set({ fatal });
  },

  // `fatal` deliberately survives, and it is the only thing that does. A dead thread is not a fact
  // about the sheet that was loaded when it died, so a new sheet does not repair it — while every
  // other answer here is about that sheet and means nothing without it. Leaving them in place would
  // also keep the old sheet's pixels reachable long after the store let go of them, which for a
  // 4096 × 4096 result is the memory the user pressed Clear to be rid of.
  forget: () => {
    set({ survey: null, attempt: null, succeeded: null });
  },

  // What `forget` leaves behind, and the reason the two are separate rather than one action with a
  // flag: they answer different questions. A new sheet asks "is any of this still about the image on
  // screen?"; ending the session asks "is any of this still true at all?" — and after Clear the
  // answer to the second includes `fatal`, because `releaseSheet` will build a new thread for the
  // next sheet dropped.
  reset: () => {
    set({ survey: null, attempt: null, succeeded: null, fatal: null });
  },
}));
