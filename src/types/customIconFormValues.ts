import type { DamageSchool, IconKind } from './iconCatalogue.ts';

/**
 * What the catalogue dialog's form for an icon of the reader's own holds as they type: every control's
 * value, the hidden ones included. `customIconFormDraft` turns it into the draft the check reads.
 */
export interface CustomIconFormValues {
  readonly role: string;
  readonly kind: IconKind;
  /** Kept while the kind is not a spell, so switching back finds the school chosen before. */
  readonly school: DamageSchool;
  readonly figure: boolean;
  readonly twoState: boolean;
  readonly firstState: string;
  readonly secondState: string;
  readonly look: string;
}
