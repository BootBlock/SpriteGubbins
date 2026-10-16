import { useId } from 'react';
import { ICON_CAPACITY_NOTICES } from '../../constants/iconCatalogue/iconCapacityNotices.ts';
import { iconComponentCount } from '../../constants/iconCatalogue/index.ts';
import type { CustomIconEntry } from '../../types/iconRoster.ts';
import type { CustomIconShelf, CustomIconShelfRow } from '../../utils/customIconShelves.ts';
import { CustomIconRow } from './CustomIconRow.tsx';

interface CustomIconShelfSectionProps {
  /** The reader's own rows of one kind, as the dialog's filters leave them. */
  readonly shelf: CustomIconShelf;
  readonly world: string;
  /** How many components the set has room for, which decides whether an unticked row can be ticked. */
  readonly left: number;
  readonly onToggle: (row: CustomIconShelfRow, on: boolean) => void;
  readonly onEdit: (entry: CustomIconEntry) => void;
  readonly onKeep: (entry: CustomIconEntry) => void;
}

/**
 * The reader's own icons of one kind — on the set, in the chosen project's library, or both — shelved
 * after the catalogue's last shelf of that kind, where the roster draws them, under a heading saying
 * they are the reader's and how many are ticked.
 *
 * No Tick all or Untick all: each row is a decision about the reader's own words, and an untick of an
 * icon the library does not hold takes it away, which a group press should not do to several at once.
 * A row the set has no room for says why under its label, as a catalogue row does.
 */
export function CustomIconShelfSection({
  shelf,
  world,
  left,
  onToggle,
  onEdit,
  onKeep,
}: CustomIconShelfSectionProps) {
  const headingId = useId();
  const ticked = shelf.rows.filter((row) => row.ticked).length;
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 border-b border-tab/40 pb-2">
        <h3 id={headingId} className="text-xs font-bold tracking-wide text-tab uppercase">
          {shelf.label}{' '}
          <span className="font-mono font-normal tracking-normal text-ink-faint normal-case">
            {ticked} of {shelf.rows.length} ticked
          </span>
        </h3>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {shelf.rows.map((row) => {
          const needed = iconComponentCount(row.entry);
          return (
            <CustomIconRow
              key={row.entry.id}
              row={row}
              world={world}
              disabledReason={!row.ticked && needed > left ? ICON_CAPACITY_NOTICES.row(needed, left) : ''}
              onToggle={onToggle}
              onEdit={onEdit}
              onKeep={onKeep}
            />
          );
        })}
      </ul>
    </section>
  );
}
