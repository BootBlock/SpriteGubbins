import { STUDIO_HISTORY_LIMIT } from '../constants/studioHistory.ts';
import { SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { StudioHistory, StudioPosition } from '../types/studioHistory.ts';

/**
 * The undo stack for the Studio tab's destructive acts: a pure function of what is on it and what
 * has just happened, with no knowledge of the stores that keep it.
 *
 * The same arrangement as `dialHistory.ts`, and the same reason for it — the rule about when the
 * cursor slot is refreshed is the part of this that is easy to get subtly wrong, and it is only
 * testable at all while it is a transform from one {@link StudioHistory} to another.
 */

/** The stack the studio opens on: one entry, nothing to undo, nothing to redo. */
export function openStudioHistory(position: StudioPosition): StudioHistory {
  return { entries: [position], index: 0 };
}

/** The position the cursor is at, which is what an undo or a redo projects into the stores. */
export function currentStudioPosition(history: StudioHistory): StudioPosition {
  return entryAt(history, history.index);
}

/** Whether there is a position behind the current one. */
export function canUndoStudio(history: StudioHistory): boolean {
  return history.index > 0;
}

/** Whether a position was stepped back from and not yet written over. */
export function canRedoStudio(history: StudioHistory): boolean {
  return history.index < history.entries.length - 1;
}

/** How many steps back are available, which is what the panel reports. */
export function studioUndoDepth(history: StudioHistory): number {
  return history.index;
}

/**
 * Record one of the acts that replaces the whole subject: where the studio was, and where it landed.
 *
 * Three things happen here, and each answers a way the naive stack goes wrong:
 *
 * - **`before` is written into the cursor slot rather than assumed to be already there.** Field
 *   edits move the studio without recording, so between two acts the entry under the cursor is
 *   whatever the earlier act produced and not what the reader actually has. Taking the live position
 *   as an argument is what stops those edits being the thing an undo throws away.
 * - **An act that changed nothing is not recorded**, so choosing the category that is already
 *   selected, or resetting a subject already at its defaults, leaves the stack alone. An entry for
 *   it would be an undo press that visibly does nothing, which reads as a broken button.
 * - **Anything after the cursor is dropped**, which is what makes a redo mean the branch just
 *   undone rather than some other branch from earlier.
 *
 * There is deliberately no coalescing. Every act on this stack is a press or a select, so there is
 * no gesture to merge — which is the whole difference between this stack and the dials'.
 */
export function recordStudio(
  history: StudioHistory,
  before: StudioPosition,
  after: StudioPosition,
): StudioHistory {
  if (samePosition(before, after)) return syncStudio(history, before);

  const entries = [...history.entries.slice(0, history.index), before, after];
  const dropped = Math.max(0, entries.length - STUDIO_HISTORY_LIMIT);
  return { entries: entries.slice(dropped), index: entries.length - 1 - dropped };
}

/**
 * Write the live position into the cursor slot without moving the cursor.
 *
 * The other half of the rule above, and the half that is invisible until it is missing: a reader who
 * switches category, edits four fields and then presses Undo has to be able to press Redo and get
 * those four edits back. They were never recorded, so the only place they can come from is the live
 * studio at the moment the cursor moves.
 */
export function syncStudio(history: StudioHistory, live: StudioPosition): StudioHistory {
  if (samePosition(entryAt(history, history.index), live)) return history;
  const entries = history.entries.map((entry, at) => (at === history.index ? live : entry));
  return { entries, index: history.index };
}

/** Step back one position, or stay where we are if this is the oldest one kept. */
export function undoStudio(history: StudioHistory, live: StudioPosition): StudioHistory {
  const synced = syncStudio(history, live);
  if (!canUndoStudio(synced)) return synced;
  return { entries: synced.entries, index: synced.index - 1 };
}

/** Step forward into a position stepped back from, or stay where we are if there is none. */
export function redoStudio(history: StudioHistory, live: StudioPosition): StudioHistory {
  const synced = syncStudio(history, live);
  if (!canRedoStudio(synced)) return synced;
  return { entries: synced.entries, index: synced.index + 1 };
}

/**
 * The entry at an index, with the emptiness `noUncheckedIndexedAccess` insists on ruled out here
 * rather than at each of the call sites above.
 *
 * A history is never empty and its cursor is never out of range — every function here preserves
 * both — so reaching this throw means one of them stopped doing so, which is worth being told about
 * loudly rather than papering over with the opening position.
 */
function entryAt(history: StudioHistory, index: number): StudioPosition {
  const entry = history.entries[index];
  if (entry === undefined) throw new Error(`the studio history has no entry at ${String(index)}`);
  return entry;
}

/**
 * Whether two positions describe the same studio.
 *
 * The category and the sixteen answers are compared value by value, because a preset load and a
 * category switch both hand over a freshly built subject whose values may be exactly the ones
 * already in force — an identity check would call those changes and record a step for each.
 *
 * **The output configuration is compared by identity**, which is exact here rather than a shortcut:
 * `useOutputStore` replaces the whole object on every write and never mutates one, so two positions
 * share an `output` reference if and only if nothing has written to that store between them. It is
 * also the only comparison that stays right when a setting is added to `OutputConfig`, which a
 * hand-kept key list would not.
 */
function samePosition(a: StudioPosition, b: StudioPosition): boolean {
  if (a === b) return true;
  if (a.category !== b.category || a.output !== b.output) return false;
  return SUBJECT_FIELD_KEYS.every((key) => a.subject[key] === b.subject[key]);
}
