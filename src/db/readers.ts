/**
 * Reading single values out of untrusted data.
 *
 * Everything crossing the storage boundary — a SQLite result row, a localStorage string, an imported
 * JSON file — is `unknown`, and the app's types are strict. These are the narrowing primitives the
 * parsers are built from: each answers "is this the type I need?" with a real check rather than an
 * assertion.
 */
import { isOnStep } from '../utils/isOnStep.ts';

/**
 * Whether this is a JSON **object** — the shape every parser here means by "a record".
 *
 * **An array is excluded, and that is the whole reason this is not a bare `typeof` test.**
 * `typeof [] === 'object'` and an array is not null, so without the last clause every caller
 * treats `[]` as a record with no keys — and a parser that repairs field by field then returns a
 * complete set of defaults for it. That is how `parseImportedQuantisePreset` came to accept
 * `{ dials: [] }` as a preset carrying twenty settings nobody chose: the check meant to refuse a
 * foreign file passed, because the foreign value happened to be an array.
 *
 * Every caller wants an object and none of them wants an array — the rows, the session, the
 * settings and the two config parsers all read named fields — so the exclusion belongs here rather
 * than beside one call.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

export function readNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Read one field, accepting it only if it is one of `allowed`.
 *
 * Numbers as well as strings, because a setting whose control offers a **ladder** rather than a
 * range is a membership question however its rungs are spelled: the quantiser's key tolerance
 * offers six figures, and a stored value between two of them is one this app never wrote. Reading
 * it with a range check would admit it and hand a slider position to a control that has no such
 * position.
 */
export function pick<T extends string | number>(
  source: Record<string, unknown>,
  key: string,
  fallback: T,
  allowed: readonly T[],
): T {
  const value = source[key];
  return allowed.find((candidate) => candidate === value) ?? fallback;
}

/**
 * Read a finite number, accepting it only within `[min, max]`.
 *
 * **Bounds alone, for the one kind of value that is on no grid this layer could check it against.**
 * The camera elevation is the case: the app itself writes 35.26° for `TRUE_ISOMETRIC`, which is off
 * the 1° grid its control declares, and the bounds it is legal within are the projection's — a
 * field this parser is not given. Anything read from a range constant that carries a `step` takes
 * {@link pickSteppedNumber} instead: the range declares three numbers, and checking two of them
 * admits positions the control cannot produce.
 */
export function pickNumber(
  source: Record<string, unknown>,
  key: string,
  fallback: number,
  range: { readonly min: number; readonly max: number },
): number {
  const value = readNumber(source, key);
  if (value === null || value < range.min || value > range.max) return fallback;
  return value;
}

/**
 * Read a finite number within `[min, max]` that also sits on the range's own step grid.
 *
 * The third check the bounds read above does not make, and the one every `*_RANGE` in
 * `constants/quantiser.ts` already carries the number for. Bounds alone admit a position the
 * slider cannot produce and the panel then cannot show: an imported preset pack naming a line
 * strength of 2.34567 was read back verbatim on a control that moves in tenths, so the readout
 * said `2.3×` while the pipeline ran at 2.34567 — and the reader could not get back to it, because
 * dragging the thumb snaps to the grid.
 *
 * **Rejected rather than snapped**, as everything here is: snapping would be a translation, and a
 * value this layer cannot vouch for becomes the default rather than the nearest thing to itself.
 * The grid question is `isOnStep`, shared with `NumberField`, which asks it of what a reader types.
 */
export function pickSteppedNumber(
  source: Record<string, unknown>,
  key: string,
  fallback: number,
  range: { readonly min: number; readonly max: number; readonly step: number },
): number {
  const value = pickNumber(source, key, fallback, range);
  return isOnStep(value, range.min, range.step) ? value : fallback;
}

/**
 * Read a whole number within `[min, max]`. A fractional value is **rejected, never rounded**.
 *
 * Rounding would be a translation, which this layer's contract forbids — and for a count it is
 * actively unsafe: a stored `0.5` floored to `0` becomes `NO_COMPONENT_BUDGET`, silently switching
 * a cap off rather than falling back to it.
 *
 * **For a count whose range declares no step of its own**, which today is the component budget and
 * the sheet index. That is the whole criterion, and the bounds have nothing to do with it: a range
 * that grows a `step` moves to {@link pickSteppedNumber} in the same edit, which subsumes this
 * check when that step is 1. Both controls hard-code a `step={1}` their range does not carry, so
 * the number to move there is written at the call site rather than beside the bounds.
 */
export function pickWholeNumber(
  source: Record<string, unknown>,
  key: string,
  fallback: number,
  range: { readonly min: number; readonly max: number },
): number {
  const value = readNumber(source, key);
  if (value === null || !Number.isInteger(value)) return fallback;
  return pickNumber(source, key, fallback, range);
}

/** Read a boolean. Anything that is not one — including `'true'` — falls back. */
export function pickBoolean(source: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = source[key];
  return typeof value === 'boolean' ? value : fallback;
}

/** `JSON.parse` that yields `undefined` instead of throwing — stored payloads are untrusted. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
