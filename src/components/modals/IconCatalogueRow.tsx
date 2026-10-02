import { memo } from 'react';
import type { IconCatalogueEntry } from '../../types/iconCatalogue.ts';
import { iconEntryGuidance } from '../../utils/iconEntryGuidance.ts';
import { iconLookText } from '../../utils/iconLookText.ts';
import { CheckboxField } from '../common/CheckboxField.tsx';

interface IconCatalogueRowProps {
  readonly entry: IconCatalogueEntry;
  /** The subject's *World & Era*, which decides the look the row shows and its card states. */
  readonly world: string;
  readonly checked: boolean;
  /** Why the row cannot be ticked, or empty where it can. */
  readonly disabledReason: string;
  /** Stable across renders, so a tick re-renders the row it changed and not every other row. */
  readonly onToggle: (id: string, on: boolean) => void;
}

/**
 * One catalogue entry as a checkbox: its game role for a label, the look the sheet draws it as under
 * the subject's world for a second line, and a card saying which slots it adds.
 *
 * **Memoised**, because a tick changes one row and the dialog holds every entry in the catalogue: every
 * prop here is a value or a stable callback, so a row whose own state did not move is skipped.
 */
export const IconCatalogueRow = memo(function IconCatalogueRow({
  entry,
  world,
  checked,
  disabledReason,
  onToggle,
}: IconCatalogueRowProps) {
  return (
    <li>
      <CheckboxField
        label={entry.role}
        tooltip={iconEntryGuidance(entry, world)}
        checked={checked}
        description={iconLookText(entry, world)}
        disabledReason={disabledReason}
        onChange={(on) => {
          onToggle(entry.id, on);
        }}
      />
    </li>
  );
});
