import { useId } from 'react';
import type { CustomIconEntry } from '../../types/iconRoster.ts';
import type { CustomIconShelf } from '../../utils/customIconShelves.ts';
import { CustomIconRow } from './CustomIconRow.tsx';

interface CustomIconShelfSectionProps {
  /** The reader's own entries of one kind, as the dialog's filters leave them. */
  readonly shelf: CustomIconShelf;
  readonly world: string;
  readonly onEdit: (entry: CustomIconEntry) => void;
  readonly onRemove: (entry: CustomIconEntry) => void;
}

/**
 * The reader's own icons of one kind, shelved after the catalogue's last shelf of that kind — where the
 * roster draws them — under a heading saying they are the reader's.
 *
 * No Tick all or Untick all: every entry here is on the set already, and each leaves it through its own
 * Remove.
 */
export function CustomIconShelfSection({ shelf, world, onEdit, onRemove }: CustomIconShelfSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 border-b border-tab/40 pb-2">
        <h3 id={headingId} className="text-xs font-bold tracking-wide text-tab uppercase">
          {shelf.label}{' '}
          <span className="font-mono font-normal tracking-normal text-ink-faint normal-case">
            {shelf.entries.length} on your set
          </span>
        </h3>
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        {shelf.entries.map((entry) => (
          <CustomIconRow key={entry.id} entry={entry} world={world} onEdit={onEdit} onRemove={onRemove} />
        ))}
      </ul>
    </section>
  );
}
