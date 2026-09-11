import type { QuantiseDials } from './quantisePreset.ts';

/** One of the Quantise tab's dials, which is what a gesture is made on. */
export type DialKey = keyof QuantiseDials;

/**
 * The edit the current position is still being made by: which dial, and when it last moved.
 *
 * A slider dragged across its range emits a change per pixel of travel, and a step per pixel would
 * be an undo stack nobody could get back through — so an edit of the same dial inside
 * `DIAL_COALESCE_MS` of this one replaces the current position rather than pushing another.
 */
export interface DialGesture {
  readonly key: DialKey;
  /** When the dial last moved, on {@link performance.now}'s monotonic clock. */
  readonly at: number;
}

/**
 * Every position the dials have been in this session, which of them is current, and whether the
 * edit that produced it can still be extended.
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
  /**
   * Oldest first, and never empty: entry zero is the position the tab opened in.
   *
   * Each is a whole set of positions rather than a patch against the one before it. A patch is
   * smaller and is the wrong shape for what this stack is walked for: every step of an undo has to
   * produce a complete set of dial positions, and rebuilding one by replaying patches from the front
   * makes the cost of a step depend on how long the reader has been tuning. Twenty-five primitives
   * is nothing to copy.
   */
  readonly entries: readonly QuantiseDials[];
  /** Which entry the dials are currently at. Undo moves it down, redo moves it up. */
  readonly index: number;
  /**
   * The gesture the current entry is still being made by, or `null` once nothing may extend it.
   *
   * **It is a fact about the stack, not about an entry**, and that is the whole reason it is held
   * here. Only the position the last edit wrote can be extended, and only until something else
   * happens to the stack — so the opening position, a whole-set write (a preset load, the sweep's
   * answer) and every undo and redo leave it `null`. Kept on each entry instead, a dial and a time
   * outlive the gesture they describe: an undo lands the cursor on an older position whose record
   * still says which dial made it and when, and a quick edit of that dial is folded into the very
   * position the reader stepped back to, taking the one after it with it.
   */
  readonly gesture: DialGesture | null;
}
