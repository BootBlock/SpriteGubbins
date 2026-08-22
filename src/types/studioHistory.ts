import type { OutputConfig } from './output.ts';
import type { SubjectCategory, SubjectDefinition } from './subject.ts';

/**
 * Everything the studio's three destructive acts throw away, held as one value.
 *
 * The output configuration is in here beside the subject because `setCategory` rewrites both: the
 * mode, the rig, the direction set, the projection, the elevation, the style reference, the pinned
 * facing and the sheet index are all re-resolved against the category being switched to. An undo
 * that put the sixteen answers back and left those where the switch moved them would leave the tab
 * in a state it had never been in, which is a worse answer than no undo at all.
 *
 * Held whole rather than as a patch against the position before it, for the reason
 * `DialHistoryEntry` gives in ./quantiseHistory.ts: every step has to produce a complete studio, and a set of
 * seventeen strings beside a configuration of thirty is nothing to copy.
 */
export interface StudioPosition {
  readonly category: SubjectCategory;
  readonly subject: SubjectDefinition;
  readonly output: OutputConfig;
}

/**
 * The positions the studio has been in, and which of them it is at.
 *
 * A cursor into one list, the shape `DialHistory` in ./quantiseHistory.ts uses, and for the same reasons — a new act
 * truncates whatever was ahead of the cursor, so a redo means the branch just undone.
 *
 * **What is on the stack is deliberately not every edit.** A field edit is reversible by typing the
 * old value back; the three acts that replace all sixteen answers at once are not, and they are the
 * only things recorded here. That leaves the entry under the cursor able to go stale — a reader
 * switches category, then edits four fields — so every move re-reads the live studio into that slot
 * before it steps. See {@link recordStudio}.
 */
export interface StudioHistory {
  /** Oldest first, and never empty: entry zero is the position the studio opened in. */
  readonly entries: readonly StudioPosition[];
  /** Which entry the studio is currently at. Undo moves it down, redo moves it up. */
  readonly index: number;
}
