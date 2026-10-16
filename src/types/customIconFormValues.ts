import type { CustomIconVariantDraft } from './customIconDraft.ts';
import type { DamageSchool, IconKind } from './iconCatalogue.ts';

/**
 * What an icon of the reader's own is drawn as: one drawing, a toggle drawn in two states, or a family
 * of variants of one design. The order is the form's control's order.
 */
export const CUSTOM_ICON_SHAPES = ['ONE', 'STATES', 'VARIANTS'] as const;

export type CustomIconShape = (typeof CUSTOM_ICON_SHAPES)[number];

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
  readonly shape: CustomIconShape;
  /** Kept while the shape is not a pair, as the school is, and so are the members below. */
  readonly firstState: string;
  readonly secondState: string;
  /** The family's members as typed, in order, each phrase empty where the reader wrote none. */
  readonly variants: readonly CustomIconVariantDraft[];
  readonly look: string;
}
