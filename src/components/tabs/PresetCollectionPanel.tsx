import { CUSTOM_COLLECTION_ID, presetCollectionLabel } from '../../constants/presets/collections.ts';
import type { PresetCollectionId } from '../../constants/presets/collections.ts';
import type { PresetArchetype } from '../../types/preset.ts';
import type { PresetEntry } from '../../utils/presetSearch.ts';
import { PresetCard } from './PresetCard.tsx';

interface PresetCollectionPanelProps {
  readonly collection: PresetCollectionId;
  /** This collection's presets, already narrowed by whatever query is live. */
  readonly entries: readonly PresetEntry[];
  /**
   * The query that narrowed the library, or `null` if none did — which decides which of the two empty
   * states applies.
   *
   * One nullable prop rather than a query string this panel re-tests, because "there is text in the
   * box" and "the library was narrowed" are different facts and only the matcher knows the second.
   * Deriving it here from the query would have an empty "Your presets" report a failed search instead
   * of explaining how to save a preset, the moment the box held something like `-`.
   */
  readonly narrowedBy: string | null;
  readonly onLoad: (preset: PresetArchetype) => void;
  readonly onRename: (preset: PresetArchetype, name: string) => Promise<boolean>;
  readonly onDelete: (preset: PresetArchetype) => void;
}

/** What to say when there is nothing to show, which is a different thing in each case. */
function emptyMessage(collection: PresetCollectionId, narrowedBy: string | null): string {
  if (narrowedBy !== null) return `No preset matches “${narrowedBy}”. Try a shorter search.`;
  if (collection === CUSTOM_COLLECTION_ID) {
    return 'Nothing saved yet. Set the studio up how you want it, then name it and press Save above — it will appear here.';
  }
  // Not reachable while the coverage suite holds: it requires four presets per category, and every
  // built-in is filed under its own. Kept so the function is total rather than as a state to expect —
  // the invariant lives in a test, and a message is a better answer than a blank panel if it ever moves.
  return 'This collection is empty.';
}

/**
 * One collection's cards.
 *
 * **The `key` is the preset's id and that is load-bearing.** It is what makes filtering a *diff*: a
 * card whose preset still matches keeps the DOM node it already had, so it does not replay its
 * entrance animation, lose an open rename editor, or drop the pointer's hover as the user types. Keyed
 * by array position it would be the opposite — every card after a removed one would be handed a
 * different preset and re-render its entire contents, which is the "clear the list and repopulate it"
 * behaviour dressed up as reconciliation.
 *
 * Only the active collection is rendered, which is the other half of what makes this cheap: the grid
 * is a dozen cards rather than the whole library, whatever the library grows to.
 */
export function PresetCollectionPanel({
  collection,
  entries,
  narrowedBy,
  onLoad,
  onRename,
  onDelete,
}: PresetCollectionPanelProps) {
  return (
    <section className="space-y-4" aria-label={presetCollectionLabel(collection)}>
      <div className="flex items-baseline gap-2">
        <h3 className="text-base font-bold text-tab">{presetCollectionLabel(collection)}</h3>
        <span className="font-mono text-2xs text-ink-faint">
          {entries.length} preset{entries.length === 1 ? '' : 's'}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="glass-panel rounded-2xl border border-foundry-700 p-6 text-xs text-ink-muted">
          {emptyMessage(collection, narrowedBy)}
        </p>
      ) : (
        /*
          The cards each carry their own entrance; this is what makes them arrive as a sweep across
          the row rather than all at once.

          Three columns from `xl` and not from `2xl`, because `xl` is where the page's own
          `max-w-7xl` cap engages: past 1280px this panel stops widening, so a later breakpoint
          would switch the column count at a width where nothing about the available space changed.
        */
        <ul className="stagger-children grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <PresetCard
              key={entry.preset.id}
              preset={entry.preset}
              index={entry.index}
              onLoad={onLoad}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
