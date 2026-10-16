import type { DamageSchool, IconKind } from './iconCatalogue.ts';
import type { CustomIconEntry } from './iconRoster.ts';

/**
 * An entry of the reader's own as they have written it, before `checkCustomIcon` has vouched for it —
 * what the catalogue dialog's form holds, and what the roster parser reads out of storage.
 *
 * Every text is as typed; the check collapses its whitespace, derives the slot name and slugs the states.
 */
export interface CustomIconDraft {
  readonly role: string;
  readonly kind: IconKind;
  /** The damage school, or `null`: the check requires one exactly when `kind` is `SPELL`. */
  readonly school: DamageSchool | null;
  readonly figure: boolean;
  /** The two states of a toggle as typed, or `null` for one drawing. */
  readonly states: readonly [string, string] | null;
  /** The members of a family as typed, or `null` for an entry that is not one. */
  readonly variants: readonly CustomIconVariantDraft[] | null;
  readonly look: string;
}

/** One member of a family as typed: its name, and its own phrase, empty where it has none. */
export interface CustomIconVariantDraft {
  readonly name: string;
  readonly look: string;
}

/**
 * Which part of a draft a refusal is about: one of the form's fields, a family member's name or phrase
 * by its position from 0, `variants` for the family as a whole, or `set` for the roster as a whole,
 * which has no room for it.
 */
export type CustomIconField =
  | 'role'
  | 'school'
  | 'firstState'
  | 'secondState'
  | 'variants'
  | `variantName${number}`
  | `variantLook${number}`
  | 'look'
  | 'set';

/** One reason a draft cannot join the roster, said to the reader beside the field it is about. */
export interface CustomIconRefusal {
  readonly field: CustomIconField;
  readonly message: string;
}

/** A draft checked: the entry it makes, or `null` with every reason it cannot be one. */
export interface CustomIconCheck {
  readonly entry: CustomIconEntry | null;
  readonly refusals: readonly CustomIconRefusal[];
}
