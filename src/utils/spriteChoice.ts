import type { SpriteDecision, SpritePin } from '../types/spriteAssignment.ts';

/**
 * One row's decision as the string a `<select>` can hold, and back again.
 *
 * A `<select>` trades in strings, and the decision it stands for is a tagged union carrying a name
 * or a point. Something has to encode one as the other, and doing it here rather than in the row
 * keeps the parsing testable and keeps the component down to rendering: the failure this guards
 * against is a value read back out of the DOM being widened with a cast, which is how a decision
 * about the wrong sprite would get into the store with nothing complaining.
 *
 * **Every value round-trips**, and `spriteDecisionOf` returns `undefined` rather than a guess for
 * anything that does not — an option the select never offered, which is a caller error rather than a
 * state to interpret. `SelectField` resolves the chosen option back to its own value before calling
 * on, so the undefined branch is unreachable through the UI and is still the honest return.
 *
 * Pure, as everything in this directory is.
 */

/** The value of the option that leaves this sprite to the reading order — the default. */
export const READING_ORDER_CHOICE = 'reading-order';

/** The value of the option that keeps this sprite out of the download. */
export const LEAVE_OUT_CHOICE = 'leave-out';

/** The choice the row shows for a decision — the select's current value. */
export function spriteChoiceOf(decision: SpriteDecision | null): string {
  if (decision === null) return READING_ORDER_CHOICE;
  if (decision.kind === 'LEAVE_OUT') return LEAVE_OUT_CHOICE;
  if (decision.kind === 'NAME') return `name:${decision.name}`;
  return `join:${String(decision.to.x)},${String(decision.to.y)}`;
}

/** The choice that joins this sprite to the one pinned at `to`. */
export function joinChoice(to: SpritePin): string {
  return `join:${String(to.x)},${String(to.y)}`;
}

/** The choice that names this sprite for an inventory entry. */
export function nameChoice(name: string): string {
  return `name:${name}`;
}

/**
 * The decision a choice stands for: `null` for the reading order, `undefined` for nothing at all.
 *
 * The two are different answers and the caller acts on both — `null` is the reader taking their
 * decision back, which the store records by dropping the edit.
 */
export function spriteDecisionOf(choice: string): SpriteDecision | null | undefined {
  if (choice === READING_ORDER_CHOICE) return null;
  if (choice === LEAVE_OUT_CHOICE) return { kind: 'LEAVE_OUT' };
  // A name is taken whole after the prefix rather than split on every colon: an inventory name is
  // slugged and holds none today, and splitting would quietly truncate the first one that did.
  if (choice.startsWith('name:')) return { kind: 'NAME', name: choice.slice('name:'.length) };
  if (!choice.startsWith('join:')) return undefined;

  const [x, y] = choice.slice('join:'.length).split(',').map(Number);
  if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return { kind: 'JOIN', to: { x, y } };
}
