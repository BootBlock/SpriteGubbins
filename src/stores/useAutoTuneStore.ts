import { create } from 'zustand';
import type { TuneOutcome } from '../types/autoTune.ts';
import type { QuantiseSurroundings } from '../types/quantiser.ts';

/**
 * What one press of Auto produced, and the surroundings it produced it in.
 *
 * The shape `useQuantiseAnswerStore`'s `Attempt` already has, for the reason it has it: an answer and
 * the exact question it answered, kept together so staleness is decidable. Every figure on a settled
 * report — the two likeness numbers, the two colour counts, the crop cost and the nine stage lines —
 * is a measurement taken at one grid, against one background key, inside one colour budget. A
 * refusal is the same statement with nothing to show for it. So neither is meaningful on its own, and
 * neither is filed on its own.
 *
 * Local, as `Attempt` is: `AutoTuneState` refers to it and a consumer can hold one without being able
 * to write its type down.
 */
type TuneReport =
  | {
      readonly kind: 'settled';
      readonly surroundings: QuantiseSurroundings;
      readonly outcome: TuneOutcome;
    }
  | { readonly kind: 'failed'; readonly surroundings: QuantiseSurroundings; readonly reason: string };

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
 *
 * **The surroundings on {@link report} are what keep it honest about the settings it was measured
 * in**, which is the same question asked of the sheet's *dials* rather than of the sheet itself. See
 * {@link TuneReport}, and `sameSurroundings`, which is what decides it.
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
  /**
   * What the last press produced and the surroundings it was produced in, or `null` before the first
   * press and after a new sheet.
   *
   * **It is filed, not shown.** Whether it still applies is a question about the settings in force,
   * which this store does not hold and cannot watch — the grid comes from the reader's override or
   * the worker's own reading of the sheet, and the colour budget from the studio, on another tab. So
   * the panel asks `sameSurroundings` against what the pipeline is being handed right now. A report
   * that stops applying is withdrawn from the screen and left here, which is what lets it come back
   * whole if the reader puts the grid back where it was.
   */
  readonly report: TuneReport | null;

  /** Start a sweep, and answer with the run number its reply must carry back. */
  began(): number;
  settled(outcome: TuneOutcome, surroundings: QuantiseSurroundings): void;
  failed(reason: string, surroundings: QuantiseSurroundings): void;
  /** Whether the sweep that took this run number is still the one the tab is waiting on. */
  owns(run: number): boolean;
  /**
   * Drop the report, because the dials it is about have moved since it was written.
   *
   * A report is a set of statements about where the dials stand — the stage list says so literally,
   * and the paragraph beside it says they have just moved and that one undo puts them back. A reader
   * who presses Undo, or drags a slider, makes all of that false while it is still on screen. So any
   * dial write that is not the sweep's own clears it; see `project` in `useQuantiseStore`, which is
   * the one funnel every dial write goes through.
   *
   * **The dials are the only thing retired this way, and that is the line rather than an omission.**
   * They are what the report is *about*, and they move through one funnel this store can be called
   * from. Everything the report was measured *inside* — the grid, the key, the colour budget — moves
   * through three stores and one worker reading, so it is decided by comparison instead: the report
   * carries the surroundings it was taken in, and the panel withdraws it when they no longer hold.
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
  report: null,

  // The previous report goes at the press rather than when the new one lands: it describes dials
  // that are about to move, and leaving it up beside a running sweep says the sweep has finished.
  began: () => {
    const run = get().run + 1;
    set({ run, tuning: true, report: null });
    return run;
  },

  // One action each rather than one with a flag, unlike `attempted` next door: there the difference
  // between the two outcomes is which fields are written, and here it is only which arm is built.
  settled: (outcome, surroundings) => {
    set({ tuning: false, report: { kind: 'settled', surroundings, outcome } });
  },

  failed: (reason, surroundings) => {
    set({ tuning: false, report: { kind: 'failed', surroundings, reason } });
  },

  owns: (run) => get().run === run,

  stale: () => {
    set({ report: null });
  },

  // `tuning` falls with the report, and the thread that flag was about is ended by `abandonSweep`
  // in `autoTuneSession` — which is what calls this, and is the only thing that should. Clearing the
  // flag without ending the thread re-enables the button beside a sweep that is still running, and a
  // second press then starts a second thread beside the first.
  forget: () => {
    set({ run: get().run + 1, tuning: false, report: null });
  },
}));
