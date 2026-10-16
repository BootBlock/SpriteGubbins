import { CUSTOM_ICON_SHAPE_CHOICES } from '../../constants/iconCatalogue/customIconShapeChoices.ts';
import { CUSTOM_ICON_TOOLTIPS } from '../../constants/iconCatalogue/customIconTooltips.ts';
import type { CustomIconField } from '../../types/customIconDraft.ts';
import type { CustomIconFormValues } from '../../types/customIconFormValues.ts';
import { SelectField } from '../common/SelectField.tsx';
import { TextField } from '../common/TextField.tsx';
import { CustomIconVariantFields } from './CustomIconVariantFields.tsx';

interface CustomIconShapeFieldsProps {
  readonly values: CustomIconFormValues;
  /** Why a field cannot be accepted as it stands, or empty — `CustomIconForm` decides when it shows. */
  readonly problem: (field: CustomIconField) => string;
  readonly onChange: (change: Partial<CustomIconFormValues>) => void;
}

/**
 * What an icon of the reader's own is drawn as — one drawing, a toggle in two states, or a family of
 * variants of one design — and, below it, the two states' names or the family's members, shown only
 * while that shape is chosen.
 *
 * **One control for the three, because they exclude each other**: an entry is a pair or a family, never
 * both, which `checkCustomIcon` holds. What was typed under a shape is kept while another is chosen, so
 * a reader who tries a pair and comes back to a family finds the members they wrote.
 */
export function CustomIconShapeFields({ values, problem, onChange }: CustomIconShapeFieldsProps) {
  return (
    <>
      <SelectField
        label="Drawn as"
        tooltip={CUSTOM_ICON_TOOLTIPS.shape}
        value={values.shape}
        choices={CUSTOM_ICON_SHAPE_CHOICES}
        onChange={(shape) => {
          onChange({ shape });
        }}
      />
      {values.shape === 'STATES' && (
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
      {values.shape === 'VARIANTS' && (
        <CustomIconVariantFields
          variants={values.variants}
          problem={problem}
          onChange={(variants) => {
            onChange({ variants });
          }}
        />
      )}
    </>
  );
}
