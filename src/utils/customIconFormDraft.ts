import type { CustomIconDraft } from '../types/customIconDraft.ts';
import type { CustomIconFormValues } from '../types/customIconFormValues.ts';

/**
 * What the form's values ask for, with the hidden controls' values left out: a school only for a spell,
 * states only while the entry is a pair, and members only while it is a family.
 */
export function customIconFormDraft(values: CustomIconFormValues): CustomIconDraft {
  return {
    role: values.role,
    kind: values.kind,
    school: values.kind === 'SPELL' ? values.school : null,
    figure: values.figure,
    states: values.shape === 'STATES' ? [values.firstState, values.secondState] : null,
    variants: values.shape === 'VARIANTS' ? values.variants : null,
    look: values.look,
  };
}
