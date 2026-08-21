import { create } from 'zustand';
import type { TuneOutcome } from '../types/autoTune.ts';

/**
 * Whether a sweep is running, and what the last one found.
 *
 * A store rather than the panel's own state, for the reason `useSheetWriteStore` is one: the thread
 * doing the work outlives the view that asked for it. `App` swaps the whole view on navigation, so a
 * reader who presses Auto and then goes to the studio to change the colour budget gets a **fresh**
 * panel on the way back — and a flag held in that panel's own state comes back `false`, offering a
 * button that is already busy. Pressing it then starts a second sweep beside the first.
 *
 * **The run number is what keeps a finished sweep honest about which sheet it was about.** A sweep
 * takes seconds, and a reader can drop the next sheet of a series inside that window. Its dials
 * would still be reasonable — the tab carries dials across a new sheet on purpose, because they are
 * workflow intent — but the *report* would not: a crop count, a fidelity figure and six stage lines
 * describing a sheet that is no longer on screen. So {@link forget} moves the number on, and an
 * answer arriving under the old one is dropped rather than filed.
 */
export interface AutoTuneState {
  /**
   * Which sweep the tab is waiting on, counting from the tab's first.
   *
   * Moved on by both {@link began} and {@link forget}, so it separates "a newer sweep started" from
   * "a newer sheet arrived" without needing to know which happened.
   */
  readonly run: number;
  /** True from the press until the sweep answers, fails, or is disowned. */
  readonly tuning: boolean;
  /** What the last sweep found, or `null` before the first and after a new sheet. */
  readonly outcome: TuneOutcome | null;
  /** Why the last sweep produced nothing, in a sentence the panel shows. */
  readonly error: string | null;

  /** Start a sweep, and answer with the run number its reply must carry back. */
  began(): number;
  settled(outcome: TuneOutcome): void;
  failed(reason: string): void;
  /** Whether the sweep that took this run number is still the one the tab is waiting on. */
  owns(run: number): boolean;
  /**
   * Drop the report, because the dials have moved since it was written.
   *
   * Every line of a report is a statement about where the dials stand — the stage list says so
   * literally, and the paragraph beside it says they have just moved and that one undo puts them
   * back. A reader who presses Undo, or drags a slider, makes all of that false while it is still on
   * screen. So any dial write that is not the sweep's own clears it; see `project` in
   * `useQuantiseStore`, which is the one funnel every dial write goes through.
   *
   * Deliberately narrower than {@link forget}: the run number does not move and a sweep in flight is
   * left alone, because moving an unrelated dial while one runs is not a reason to throw the sweep
   * away.
   */
  stale(): void;
  /** Drop the report and disown any sweep in flight, because a different sheet is being loaded. */
  forget(): void;
}

export const useAutoTuneStore = create<AutoTuneState>((set, get) => ({
  run: 0,
  tuning: false,
  outcome: null,
  error: null,

  // The previous report goes at the press rather than when the new one lands: it describes dials
  // that are about to move, and leaving it up beside a running sweep says the sweep has finished.
  began: () => {
    const run = get().run + 1;
    set({ run, tuning: true, outcome: null, error: null });
    return run;
  },

  settled: (outcome) => {
    set({ tuning: false, outcome });
  },

  failed: (error) => {
    set({ tuning: false, error });
  },

  owns: (run) => get().run === run,

  stale: () => {
    set({ outcome: null, error: null });
  },

  // `tuning` falls with the report, and the thread that flag was about is ended by `abandonSweep`
  // in `autoTuneSession` — which is what calls this, and is the only thing that should. Clearing the
  // flag without ending the thread re-enables the button beside a sweep that is still running, and a
  // second press then starts a second thread beside the first.
  forget: () => {
    set({ run: get().run + 1, tuning: false, outcome: null, error: null });
  },
}));
