import type { QuantiseDials } from './quantisePreset.ts';

/** Which dial an entry was produced by, or `null` where the whole set was written at once. */
export type DialKey = keyof QuantiseDials;

/**
 * One position the dials have been in, and enough about how they got there to coalesce a drag.
 *
 * The dials are held as a whole value rather than as a patch against the entry before it. A patch
 * is smaller and is the wrong shape for what this stack is walked for: every step of an undo has to
 * produce a complete set of dial positions, and rebuilding one by replaying patches from the front
 * makes the cost of a step depend on how long the reader has been tuning. Thirteen primitives is
 * nothing to copy.
 */
export interface DialHistoryEntry {
  readonly dials: QuantiseDials;
  /**
   * The dial whose edit produced this position, or `null` for a write that moved the whole set —
   * the opening position, and a preset being loaded.
   *
   * Kept for coalescing rather than for display: a slider dragged across its range emits a change
   * per pixel of travel, and a step per pixel would be an undo stack nobody could get back through.
   * `null` never coalesces, because a preset load is one deliberate act and the position before it
   * is exactly what a reader wants back.
   */
  readonly key: DialKey | null;
  /** When the edit arrived, on {@link performance.now}'s monotonic clock, for the same purpose. */
  readonly at: number;
}

/**
 * Every position the dials have been in this session, and which of them is current.
 *
 * A cursor into one list rather than the two stacks undo is often written as, because the two
 * shapes differ in what they make cheap and this one is read far more often than it is written:
 * `entries[index]` is the current dial set, so the store projects its dial fields straight out of
 * it and no code path can hold a position the history does not know about.
 *
 * **A new edit truncates the entries after the cursor**, which is what makes redo mean "the branch
 * I have just undone" rather than "some other branch from earlier". That is the behaviour every
 * editor has, and the alternative — keeping both branches — needs a way to say which one a redo
 * follows, which is a tree and a second control.
 */
export interface DialHistory {
  /** Oldest first, and never empty: entry zero is the position the tab opened in. */
  readonly entries: readonly DialHistoryEntry[];
  /** Which entry the dials are currently at. Undo moves it down, redo moves it up. */
  readonly index: number;
}
