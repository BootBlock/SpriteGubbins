import { DIAL_COALESCE_MS, DIAL_HISTORY_LIMIT } from '../constants/dialHistory.ts';
import { QUANTISE_DIAL_KEYS } from '../constants/quantiseDials.ts';
import type { DialGesture, DialHistory, DialKey } from '../types/quantiseHistory.ts';
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

/** The stack a tab opens with: one entry, nothing to undo, nothing to redo, nothing to extend. */
export function openHistory(dials: QuantiseDials): DialHistory {
  return { entries: [dials], index: 0, gesture: null };
}

/**
 * Where the dials are now, which is the position every write path projects into the store.
 *
 * The emptiness `noUncheckedIndexedAccess` insists on is ruled out here, because this is the one
 * place an entry is read. A history is never empty and its cursor is never out of range — every
 * function here preserves both — so reaching this throw means one of them stopped doing so, which
 * is worth being told about loudly rather than papering over with the defaults.
 */
export function currentDials(history: DialHistory): QuantiseDials {
  const entry = history.entries[history.index];
  if (entry === undefined) throw new Error(`the dial history has no entry at ${String(history.index)}`);
  return entry;
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
 *   pushing one**, so a drag is one step. The gesture's timestamp is refreshed as it extends, so
 *   the window measures the gap between two events of a gesture rather than the length of the
 *   gesture — a slow drag stays one step. Only while the gesture is still open: see
 *   {@link DialHistory.gesture} for what closes one, and why an undo has to.
 * - **Anything after the cursor is dropped**, which is what makes a redo mean the branch just
 *   undone. See {@link DialHistory}.
 *
 * Extending never reaches entry zero, which is the oldest position still reachable and the one an
 * undo has to be able to get back to. That needs no guard of its own: a gesture is only ever opened
 * by pushing onto a stack at least one entry deep, the cap keeps at least two, and nothing that
 * moves the cursor leaves one open.
 */
export function recordDials(
  history: DialHistory,
  dials: QuantiseDials,
  key: DialKey | null,
  at: number,
): DialHistory {
  if (sameDials(currentDials(history), dials)) return history;

  const gesture = key === null ? null : { key, at };

  if (extendsGesture(history.gesture, key, at)) {
    return { entries: [...history.entries.slice(0, history.index), dials], index: history.index, gesture };
  }

  const entries = [...history.entries.slice(0, history.index + 1), dials];
  const dropped = Math.max(0, entries.length - DIAL_HISTORY_LIMIT);
  return { entries: entries.slice(dropped), index: entries.length - 1 - dropped, gesture };
}

/**
 * Step back one position, or stay where we are if this is the oldest one kept.
 *
 * Either move closes the gesture: an undo is a deliberate act between two edits, so the edit after
 * it starts a step of its own however quickly it follows.
 */
export function undoDials(history: DialHistory): DialHistory {
  return canUndoDials(history) ? { ...history, index: history.index - 1, gesture: null } : history;
}

/** Step forward into the branch an undo stepped out of, or stay if nothing was undone. */
export function redoDials(history: DialHistory): DialHistory {
  return canRedoDials(history) ? { ...history, index: history.index + 1, gesture: null } : history;
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
 * Whether an edit belongs to the gesture still open on the current entry.
 *
 * A `null` key never matches, because no gesture is ever made under one: a whole-set write is one
 * deliberate act, and the position before it is exactly what a reader wants back.
 */
function extendsGesture(gesture: DialGesture | null, key: DialKey | null, at: number): boolean {
  return gesture !== null && gesture.key === key && at - gesture.at < DIAL_COALESCE_MS;
}
