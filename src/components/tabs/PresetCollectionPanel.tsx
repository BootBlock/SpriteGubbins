import { presetCollectionLabel } from '../../constants/presets/collections.ts';
import type { PresetCollectionId } from '../../constants/presets/collections.ts';
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
   * Deriving it here from the query would report a failed search over a collection nothing had
   * filtered, the moment the box held something like `-`.
   */
  readonly narrowedBy: string | null;
}

/** What to say when there is nothing to show, which is a different thing in each case. */
function emptyMessage(narrowedBy: string | null): string {
  if (narrowedBy !== null) return `No preset matches “${narrowedBy}”. Try a shorter search.`;
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
 * entrance animation, lose an open details editor, or drop the pointer's hover as the user types. Keyed
 * by array position it would be the opposite — every card after a removed one would be handed a
 * different preset and re-render its entire contents, which is the "clear the list and repopulate it"
 * behaviour dressed up as reconciliation.
 *
 * Only the active collection is rendered, which is the other half of what makes this cheap: the grid
 * is a dozen cards rather than the whole library, whatever the library grows to.
 */
export function PresetCollectionPanel({ collection, entries, narrowedBy }: PresetCollectionPanelProps) {
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
          {emptyMessage(narrowedBy)}
        </p>
      ) : (
        /*
          The cards each carry their own entrance; this is what makes them arrive as a sweep across
          the row rather than all at once.

          **The column count is a container query, because this grid is inside a column.** The
          library splits at `lg`, and from there the page and this box stop moving together. It was
          on two page breakpoints, and measured in Edge they were counting cards for a box they could
          not see: a 975px grid held two cards at a 1023px page while a 918px grid held three at
          1280px, and a 735px grid held one while a 720px grid held two.

          Both thresholds are bounded by what the layout hands this box rather than picked. Three
          across at 57rem is under the 918px the column reaches once `main`'s `max-w-7xl` cap binds —
          nine of twelve tracks with `gap-6` in 1232px of content — with 6px to spare for the layout
          engine's rounding, so the widest column is three-up as it always was and a card is never
          narrower than 288px. Two across at 44rem is under the 720px the stacked page gives this box
          at `md`, where it has always been two-up, and a card there is never narrower than 340px.
        */
        <div className="@container">
          <ul className="stagger-children grid grid-cols-1 gap-6 @[44rem]:grid-cols-2 @[57rem]:grid-cols-3">
            {entries.map((entry) => (
              <PresetCard key={entry.preset.id} preset={entry.preset} index={entry.index} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
