import { memo } from 'react';
import { CUSTOM_ICON_NOTICES } from '../../constants/iconCatalogue/customIconNotices.ts';
import { ICON_CATALOGUE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import type { CustomIconEntry } from '../../types/iconRoster.ts';
import { iconEntryGuidance } from '../../utils/iconEntryGuidance.ts';
import { iconLookText } from '../../utils/iconLookText.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { CheckboxField } from '../common/CheckboxField.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

interface CustomIconRowProps {
  readonly entry: CustomIconEntry;
  /** The subject's *World & Era*, which names a spell's school in the row's second line and its card. */
  readonly world: string;
  /** Stable across renders, as `IconCatalogueRow`'s toggle is. */
  readonly onEdit: (entry: CustomIconEntry) => void;
  readonly onRemove: (entry: CustomIconEntry) => void;
}

/**
 * One icon of the reader's own, on its shelf beside the catalogue's rows: ticked, marked as theirs, and
 * with an Edit and a Remove of its own.
 *
 * **Its box is ticked and cannot be unticked**, because the roster is the only place the entry exists:
 * an untick would be a removal with a checkbox's lightness, so it says under the label that the entry
 * stays until removed, and the box keeps its place in the tab order for a keyboard user to hear why, as
 * every refused tick does. Removing is the Remove button's, which Undo takes back.
 */
export const CustomIconRow = memo(function CustomIconRow({
  entry,
  world,
  onEdit,
  onRemove,
}: CustomIconRowProps) {
  return (
    <li className="space-y-1.5">
      <CheckboxField
        label={entry.role}
        tooltip={iconEntryGuidance(entry, world)}
        checked
        description={iconLookText(entry, world)}
        disabledReason={CUSTOM_ICON_NOTICES.yours}
        onChange={() => undefined}
      />
      <div className="ml-6 flex flex-wrap items-center gap-2">
        <Badge tone="view">Your own</Badge>
        <ControlTooltip hint={`Edit ${entry.role}`} text={ICON_CATALOGUE_ACTION_TOOLTIPS.editOwn}>
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Edit ${entry.role}`}
            onClick={() => {
              onEdit(entry);
            }}
          >
            Edit
          </Button>
        </ControlTooltip>
        <ControlTooltip hint={`Remove ${entry.role}`} text={ICON_CATALOGUE_ACTION_TOOLTIPS.removeOwn}>
          <Button
            variant="danger"
            size="sm"
            aria-label={`Remove ${entry.role}`}
            onClick={() => {
              onRemove(entry);
            }}
          >
            Remove
          </Button>
        </ControlTooltip>
      </div>
    </li>
  );
});
