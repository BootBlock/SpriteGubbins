import { CUSTOM_ICON_TOOLTIPS } from '../../constants/iconCatalogue/customIconTooltips.ts';
import { ICON_KIND_CHOICES } from '../../constants/iconCatalogue/iconKindChoices.ts';
import type { CustomIconField } from '../../types/customIconDraft.ts';
import type { CustomIconFormValues } from '../../types/customIconFormValues.ts';
import { damageSchoolChoices } from '../../utils/damageSchoolChoices.ts';
import { CheckboxField } from '../common/CheckboxField.tsx';
import { SelectField } from '../common/SelectField.tsx';
import { TextField } from '../common/TextField.tsx';

interface CustomIconIdentityFieldsProps {
  readonly values: CustomIconFormValues;
  /** The subject's *World & Era*, which names each damage school as the line will. */
  readonly world: string;
  /** Why a field cannot be accepted as it stands, or empty — `CustomIconForm` decides when it shows. */
  readonly problem: (field: CustomIconField) => string;
  readonly onChange: (change: Partial<CustomIconFormValues>) => void;
}

/**
 * What an icon of the reader's own is: its role, its kind, its damage school while it is a spell, and
 * whether it shows a figure.
 *
 * **The school is offered only while the kind is a spell**, as the catalogue's school filter is, and the
 * value chosen is kept while it is hidden, so a reader who tries another kind and comes back finds it.
 * Its labels differ from the filters' above the shelves — *Kind of icon*, *Damage school* — so the
 * dialog never has two controls answering to one name.
 */
export function CustomIconIdentityFields({
  values,
  world,
  problem,
  onChange,
}: CustomIconIdentityFieldsProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
      <TextField
        label="Role"
        tooltip={CUSTOM_ICON_TOOLTIPS.role}
        value={values.role}
        placeholder="Keycard to the vault level"
        problem={problem('role')}
        onChange={(role) => {
          onChange({ role });
        }}
      />
      <SelectField
        label="Kind of icon"
        tooltip={CUSTOM_ICON_TOOLTIPS.kind}
        value={values.kind}
        choices={ICON_KIND_CHOICES}
        onChange={(kind) => {
          onChange({ kind });
        }}
      />
      {values.kind === 'SPELL' && (
        <SelectField
          label="Damage school"
          tooltip={CUSTOM_ICON_TOOLTIPS.school}
          value={values.school}
          choices={damageSchoolChoices(world)}
          onChange={(school) => {
            onChange({ school });
          }}
        />
      )}
      <CheckboxField
        label="Shows a figure"
        tooltip={CUSTOM_ICON_TOOLTIPS.figure}
        checked={values.figure}
        disabledReason=""
        onChange={(figure) => {
          onChange({ figure });
        }}
      />
    </div>
  );
}
