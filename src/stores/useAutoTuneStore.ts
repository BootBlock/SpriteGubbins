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
  /** Drop the report, because it describes a sheet that is no longer loaded. */
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

  // `tuning` falls with the report, and that is not tidying: the thread is disowned rather than
  // stopped from here, so a sweep still running for the old sheet must not leave a button reading
  // "Tuning…" for a sheet it was never about. `autoTuneSession` terminates the thread when its
  // answer arrives and finds itself disowned.
  forget: () => {
    set({ run: get().run + 1, tuning: false, outcome: null, error: null });
  },
}));
