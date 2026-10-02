import type { CustomIconDraft } from '../types/customIconDraft.ts';
import type { CustomIconFormValues } from '../types/customIconFormValues.ts';

/**
 * What the form's values ask for, with the hidden controls' values left out: a school only for a spell,
 * and states only while the entry is two-state.
 */
export function customIconFormDraft(values: CustomIconFormValues): CustomIconDraft {
  return {
    role: values.role,
    kind: values.kind,
    school: values.kind === 'SPELL' ? values.school : null,
    figure: values.figure,
    states: values.twoState ? [values.firstState, values.secondState] : null,
    look: values.look,
  };
}
