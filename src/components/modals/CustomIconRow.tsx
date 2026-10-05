import { memo, useRef } from 'react';
import { CUSTOM_ICON_NOTICES } from '../../constants/iconCatalogue/customIconNotices.ts';
import { DEFAULT_ICON_COLOUR_MODE } from '../../constants/iconCatalogue/defaultIconColourMode.ts';
import { ICON_CATALOGUE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useConfirmInPlace } from '../../hooks/useConfirmInPlace.ts';
import { useCustomIconLibraryStore } from '../../stores/useCustomIconLibraryStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import type { CustomIconEntry } from '../../types/iconRoster.ts';
import type { CustomIconShelfRow } from '../../utils/customIconShelves.ts';
import { iconEntryGuidance } from '../../utils/iconEntryGuidance.ts';
import { iconLookText } from '../../utils/iconLookText.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { CheckboxField } from '../common/CheckboxField.tsx';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

interface CustomIconRowProps {
  readonly row: CustomIconShelfRow;
  /** The subject's *World & Era*, which names a spell's school in the row's second line and its card. */
  readonly world: string;
  /** Why the row cannot be ticked — the set has no room for it — or empty where it can. */
  readonly disabledReason: string;
  /** Stable across renders, as `IconCatalogueRow`'s toggle is. */
  readonly onToggle: (row: CustomIconShelfRow, on: boolean) => void;
  readonly onEdit: (entry: CustomIconEntry) => void;
  readonly onKeep: (entry: CustomIconEntry) => void;
}

/**
 * One icon of the reader's own, on its shelf beside the catalogue's rows: a box that ticks it onto the
 * set and unticks it off, a badge marking it as theirs, and an Edit beside a Delete or a Save to library.
 *
 * **Unticking takes the set's copy away and leaves the library's**, so a library entry ticks back as it
 * was. Where the set alone holds the entry, the untick is a removal Undo alone brings back, and the row
 * says so under its look; it offers Save to library in place of Delete, since there is nothing to delete.
 *
 * **Delete confirms in place**, as a saved preset's row does: the library entry is stored data with no
 * undo, and the confirmation keeps the role on screen beside the question. A ticked copy stays on the
 * set, so the row remains, now offering Save to library, and the keyboard lands on that button. The
 * question is about one library row, so it drops when the row shows another project's.
 */
export const CustomIconRow = memo(function CustomIconRow({
  row,
  world,
  disabledReason,
  onToggle,
  onEdit,
  onKeep,
}: CustomIconRowProps) {
  const deleteCustomIcon = useCustomIconLibraryStore((state) => state.deleteCustomIcon);
  const colourMode = useSubjectStore((state) => state.subject.icons?.colourMode ?? DEFAULT_ICON_COLOUR_MODE);
  const { entry, saved } = row;
  // Keyed to the library row, so a question asked of one project's icon drops when the dialog shows
  // another project's under the same slot, rather than deleting that one.
  const { isConfirming, attachAsk, attachCancel, ask, cancel, confirm } = useConfirmInPlace(saved?.id);
  const keepButton = useRef<HTMLButtonElement>(null);
  const note = row.differs
    ? CUSTOM_ICON_NOTICES.differs
    : row.ticked && saved === undefined
      ? CUSTOM_ICON_NOTICES.setOnly
      : '';

  return (
    <li className="space-y-1.5">
      <CheckboxField
        label={entry.role}
        tooltip={iconEntryGuidance(entry, world, colourMode, saved !== undefined)}
        checked={row.ticked}
        description={iconLookText(entry, world)}
        note={note}
        disabledReason={disabledReason}
        onChange={(on) => {
          onToggle(row, on);
        }}
      />
      {isConfirming && saved !== undefined ? (
        <div className="ml-6 flex flex-wrap items-center gap-2">
          <ControlTooltip
            hint={`Delete “${entry.role}”`}
            text={ICON_CATALOGUE_ACTION_TOOLTIPS.confirmDeleteOwn}
          >
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                // A ticked row stays, now offering Save to library, which is where the keyboard goes.
                void confirm(
                  () => deleteCustomIcon(saved.id),
                  () => keepButton.current,
                );
              }}
            >
              Delete “{entry.role}”
            </Button>
          </ControlTooltip>
          <ControlTooltip hint="Cancel" text={ICON_CATALOGUE_ACTION_TOOLTIPS.cancelDeleteOwn}>
            <Button
              variant="secondary"
              size="sm"
              ref={attachCancel}
              aria-label={`Cancel — keep ${entry.role} in your library`}
              onClick={cancel}
            >
              Cancel
            </Button>
          </ControlTooltip>
        </div>
      ) : (
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
          {saved === undefined ? (
            <ControlTooltip
              hint={`Save ${entry.role} to library`}
              text={ICON_CATALOGUE_ACTION_TOOLTIPS.keepOwn}
            >
              <Button
                ref={keepButton}
                variant="view"
                size="sm"
                aria-label={`Save ${entry.role} to library`}
                onClick={() => {
                  onKeep(entry);
                }}
              >
                Save to library
              </Button>
            </ControlTooltip>
          ) : (
            <ControlTooltip
              hint={`Delete ${entry.role} from library`}
              text={ICON_CATALOGUE_ACTION_TOOLTIPS.deleteOwn}
            >
              <Button
                variant="danger"
                size="sm"
                ref={attachAsk}
                aria-label={`Delete ${entry.role} from library`}
                onClick={ask}
              >
                Delete
              </Button>
            </ControlTooltip>
          )}
        </div>
      )}
    </li>
  );
});
