import type { CustomIconField } from '../types/customIconDraft.ts';
import type { CustomIconFormValues } from '../types/customIconFormValues.ts';

/** A family member's field, by what it holds and the member's position from 0. */
const MEMBER_FIELD = /^variant(Name|Look)(\d+)$/u;

/**
 * What one of the form's fields holds as typed, so its refusal can wait until there is something to
 * refuse. The school always holds a value, and the family's size and the set's room are measured
 * whatever the fields hold, so each answers with a word that is never empty.
 */
export function customIconFieldText(values: CustomIconFormValues, field: CustomIconField): string {
  switch (field) {
    case 'role':
    case 'firstState':
    case 'secondState':
    case 'look':
      return values[field];
    case 'school':
      return values.school;
    case 'variants':
    case 'set':
      return 'measured';
    default: {
      const [, part, at] = MEMBER_FIELD.exec(field) ?? [];
      const member = values.variants[Number(at)];
      if (member === undefined) return '';
      return part === 'Name' ? member.name : member.look;
    }
  }
}
