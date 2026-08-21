import { DIAL_COALESCE_MS, DIAL_HISTORY_LIMIT } from '../constants/dialHistory.ts';
import { QUANTISE_DIAL_KEYS } from '../constants/quantiseDials.ts';
import type { DialHistory, DialHistoryEntry, DialKey } from '../types/quantiseHistory.ts';
import type { QuantiseDials } from '../types/quantisePreset.ts';

/**
 * The undo stack for the Quantise tab's dials: a pure function of what is on it and what has just
 * happened, with no knowledge of the store that keeps it.
 *
 * Everything here is a plain transform of a {@link DialHistory} into another one, which is what
 * makes the coalescing rule testable at all — the alternative is asserting against a store while
 * driving a clock, and the rule is the part of this that is easy to get subtly wrong. The clock is
 * an argument for the same reason: `record` is handed the moment an edit arrived rather than
 * reading one, so a test states the timing instead of arranging it.
 */

/** The stack a tab opens with: one entry, nothing to undo, nothing to redo. */
export function openHistory(dials: QuantiseDials): DialHistory {
  return { entries: [{ dials, key: null, at: 0 }], index: 0 };
}

/** Where the dials are now, which is the position every write path projects into the store. */
export function currentDials(history: DialHistory): QuantiseDials {
  return entryAt(history, history.index).dials;
}

/** Whether there is a position behind the current one. */
export function canUndoDials(history: DialHistory): boolean {
  return history.index > 0;
}

/** Whether a position was stepped back from and not yet written over. */
export function canRedoDials(history: DialHistory): boolean {
  return history.index < history.entries.length - 1;
}

/** How many steps back are available, which is what the panel reports. */
export function undoDepth(history: DialHistory): number {
  return history.index;
}

/**
 * Record a new position, or extend the one the reader is still making.
 *
 * Three things happen here and each answers a way the naive stack goes wrong:
 *
 * - **A position identical to the current one is not recorded at all.** Re-choosing the reading a
 *   sheet is already being read with is a change event and not a change, and an entry for it is an
 *   undo press that visibly does nothing — which reads as a broken button rather than as a
 *   no-op.
 * - **Consecutive edits of one dial inside {@link DIAL_COALESCE_MS} replace the entry rather than
 *   pushing one**, so a drag is one step. The current entry's own timestamp is refreshed as it
 *   extends, so the window measures the gap between two events of a gesture rather than the length
 *   of the gesture — a slow drag stays one step. Never at entry zero, whose dials are the position
 *   the reader started from and the one an undo has to be able to reach.
 * - **Anything after the cursor is dropped**, which is what makes a redo mean the branch just
 *   undone. See {@link DialHistory}.
 */
export function recordDials(
  history: DialHistory,
  dials: QuantiseDials,
  key: DialKey | null,
  at: number,
): DialHistory {
  const current = entryAt(history, history.index);
  if (sameDials(current.dials, dials)) return history;

  const kept = history.entries.slice(0, history.index + 1);
  const entry: DialHistoryEntry = { dials, key, at };

  if (history.index > 0 && extendsCurrent(current, key, at)) {
    return { entries: [...kept.slice(0, -1), entry], index: history.index };
  }

  const entries = [...kept, entry];
  const dropped = Math.max(0, entries.length - DIAL_HISTORY_LIMIT);
  return { entries: entries.slice(dropped), index: entries.length - 1 - dropped };
}

/** Step back one position, or stay where we are if this is the oldest one kept. */
export function undoDials(history: DialHistory): DialHistory {
  return canUndoDials(history) ? { ...history, index: history.index - 1 } : history;
}

/** Step forward into the branch an undo stepped out of, or stay if nothing was undone. */
export function redoDials(history: DialHistory): DialHistory {
  return canRedoDials(history) ? { ...history, index: history.index + 1 } : history;
}

/**
 * Whether two sets of dial positions are the same set of positions.
 *
 * Walks {@link QUANTISE_DIAL_KEYS} rather than comparing references, because a preset load hands
 * over a freshly parsed object whose values may be exactly the ones already in force.
 */
export function sameDials(a: QuantiseDials, b: QuantiseDials): boolean {
  return QUANTISE_DIAL_KEYS.every((key) => a[key] === b[key]);
}

/**
 * Whether an edit belongs to the gesture that produced the current entry.
 *
 * Called only above entry zero, and the guard is at the call site because it is a statement about
 * the *stack* rather than about the gesture: entry zero is the oldest position still reachable, and
 * once the cap has dropped the opening position off the front it is a real edit with a real key
 * that a drag could otherwise extend into oblivion.
 */
function extendsCurrent(current: DialHistoryEntry, key: DialKey | null, at: number): boolean {
  return key !== null && current.key === key && at - current.at < DIAL_COALESCE_MS;
}

/**
 * The entry at an index, with the emptiness `noUncheckedIndexedAccess` insists on ruled out here
 * rather than at each of the four call sites above.
 *
 * A history is never empty and its cursor is never out of range — every function here preserves
 * both — so reaching this throw means one of them stopped doing so, which is worth being told about
 * loudly rather than papering over with the defaults.
 */
function entryAt(history: DialHistory, index: number): DialHistoryEntry {
  const entry = history.entries[index];
  if (entry === undefined) throw new Error(`the dial history has no entry at ${String(index)}`);
  return entry;
}
