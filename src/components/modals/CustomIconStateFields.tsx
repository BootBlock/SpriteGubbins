import { CUSTOM_ICON_TOOLTIPS } from '../../constants/iconCatalogue/customIconTooltips.ts';
import type { CustomIconField } from '../../types/customIconDraft.ts';
import type { CustomIconFormValues } from '../../types/customIconFormValues.ts';
import { CheckboxField } from '../common/CheckboxField.tsx';
import { TextField } from '../common/TextField.tsx';

interface CustomIconStateFieldsProps {
  readonly values: CustomIconFormValues;
  /** Why a field cannot be accepted as it stands, or empty — `CustomIconForm` decides when it shows. */
  readonly problem: (field: CustomIconField) => string;
  readonly onChange: (change: Partial<CustomIconFormValues>) => void;
}

/**
 * Whether an icon of the reader's own is a toggle drawn in two states, and the two states' names, shown
 * only while it is. The names typed are kept while the box is cleared, so ticking it again finds them.
 */
export function CustomIconStateFields({ values, problem, onChange }: CustomIconStateFieldsProps) {
  return (
    <>
      <CheckboxField
        label="Two states"
        tooltip={CUSTOM_ICON_TOOLTIPS.twoState}
        checked={values.twoState}
        disabledReason=""
        onChange={(twoState) => {
          onChange({ twoState });
        }}
      />
      {values.twoState && (
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          <TextField
            label="First state"
            tooltip={CUSTOM_ICON_TOOLTIPS.firstState}
            value={values.firstState}
            placeholder="on"
            problem={problem('firstState')}
            onChange={(firstState) => {
              onChange({ firstState });
            }}
          />
          <TextField
            label="Second state"
            tooltip={CUSTOM_ICON_TOOLTIPS.secondState}
            value={values.secondState}
            placeholder="off"
            problem={problem('secondState')}
            onChange={(secondState) => {
              onChange({ secondState });
            }}
          />
        </div>
      )}
    </>
  );
}
