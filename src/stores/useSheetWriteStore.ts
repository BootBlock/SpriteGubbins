import { create } from 'zustand';

/**
 * Whether the quantised sheet is being written to a file, which is a fact about the app rather than
 * about a component.
 *
 * It lives here for the reason `useQuantiseAnswerStore` does: the thread doing the work outlives the
 * view that asked for it. `App` swaps the whole view on navigation, so a reader who presses Download
 * and then visits the studio and comes back gets a **fresh** `DownloadControls` — and a flag held in
 * that component's own state comes back `false`, offering a button that is already busy. Pressing it
 * then starts a second thread and writes the same file twice, which is precisely what the flag was
 * added to stop.
 *
 * **The sheet, not files in general.** The app's other downloads — the compiled prompt, the preset
 * pack, the history — are a string in a `Blob` and are finished within the press, so they have no
 * duration to report and do not set this. Naming it for the one write that takes time is what keeps
 * a later reader from assuming it covers the others.
 *
 * One boolean rather than a queue: `pngSession` runs one encode at a time by construction, and what
 * the button needs to know is whether it may start another.
 */
export interface SheetWriteState {
  /** True from the press until the file has been handed to the browser, or the attempt has failed. */
  readonly writing: boolean;
  began(): void;
  ended(): void;
}

export const useSheetWriteStore = create<SheetWriteState>((set) => ({
  writing: false,
  began: () => {
    set({ writing: true });
  },
  ended: () => {
    set({ writing: false });
  },
}));
