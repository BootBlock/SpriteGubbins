import type { SectionDefinition } from '../types/ui.ts';

/** The studio's icon roster section: its disclosure, and the heading it is folded under. */
export interface IconRosterSection extends SectionDefinition {
  readonly heading: string;
}

/**
 * The Subject Definition panel's sixth group, shown only for a category that declares an icon roster.
 *
 * **Not one of `SUBJECT_FIELD_GROUPS`**, because it holds no field: those five name the sixteen keys
 * every category has, and `subjectGroups.test.ts` holds each key to appearing exactly once across them.
 * This one holds the roster, which is the inventory a sheet draws rather than an answer the prompt's
 * first section states. It shares their open-set and their expand-all control all the same, so the
 * panel folds as one.
 *
 * Open by default for the reason the field groups are: what the set draws is the creative work.
 */
export const ICON_ROSTER_SECTION: IconRosterSection = {
  id: 'subject:icons',
  heading: 'Icons on this set',
  defaultOpen: true,
};
