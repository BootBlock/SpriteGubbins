import { ICON_KIND_FILTER_CHOICES } from '../../constants/iconCatalogue/iconKindFilterChoices.ts';
import { ICON_PICKER_TOOLTIPS } from '../../constants/iconCatalogue/iconPickerTooltips.ts';
import type { IconCatalogueFilter } from '../../types/iconCatalogue.ts';
import { iconSchoolFilterChoices } from '../../utils/iconSchoolFilterChoices.ts';
import { CheckboxField } from '../common/CheckboxField.tsx';
import { SelectField } from '../common/SelectField.tsx';
import { TextField } from '../common/TextField.tsx';

interface IconCatalogueFiltersProps {
  readonly filter: IconCatalogueFilter;
  /** The subject's *World & Era*, which names the school filter's options. */
  readonly world: string;
  readonly onChange: (filter: IconCatalogueFilter) => void;
}

/**
 * The catalogue dialog's search box, kind filter, school filter and ticked-only filter, above the list
 * they narrow.
 *
 * None of them touches the roster: they decide which rows the dialog shows, and each card says so. The
 * search is first in the dialog's tab order after the close button, so a reader who opens the
 * catalogue knowing what they want types it straight away.
 *
 * **The school filter is shown only while the kind is `SPELL`**, the one kind whose entries carry a
 * school, and moving the kind off it sets the school back to every school in the same change — so a
 * school chosen earlier can never go on hiding rows once its control has gone.
 */
export function IconCatalogueFilters({ filter, world, onChange }: IconCatalogueFiltersProps) {
  const bySchool = filter.kind === 'SPELL';
  return (
    <div
      className={`grid grid-cols-1 items-end gap-3 border-b border-foundry-700 px-6 py-4 ${bySchool ? 'sm:grid-cols-[1fr_auto_auto_auto]' : 'sm:grid-cols-[1fr_auto_auto]'}`}
    >
      <TextField
        label="Search the catalogue"
        tooltip={ICON_PICKER_TOOLTIPS.search}
        value={filter.query}
        placeholder="Role, slot name, group or look"
        onChange={(query) => {
          onChange({ ...filter, query });
        }}
      />
      <SelectField
        label="Kind"
        tooltip={ICON_PICKER_TOOLTIPS.kind}
        value={filter.kind}
        choices={ICON_KIND_FILTER_CHOICES}
        onChange={(kind) => {
          onChange({ ...filter, kind, school: kind === 'SPELL' ? filter.school : 'ALL' });
        }}
      />
      {bySchool && (
        <SelectField
          label="School"
          tooltip={ICON_PICKER_TOOLTIPS.school}
          value={filter.school}
          choices={iconSchoolFilterChoices(world)}
          onChange={(school) => {
            onChange({ ...filter, school });
          }}
        />
      )}
      <CheckboxField
        label="Ticked only"
        tooltip={ICON_PICKER_TOOLTIPS.tickedOnly}
        checked={filter.tickedOnly}
        disabledReason=""
        onChange={(tickedOnly) => {
          onChange({ ...filter, tickedOnly });
        }}
      />
    </div>
  );
}
