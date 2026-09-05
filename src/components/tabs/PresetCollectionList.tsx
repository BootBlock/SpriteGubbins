import { PRESET_COLLECTION_IDS, presetCollectionLabel } from '../../constants/presets/collections.ts';
import type { PresetCollectionId } from '../../constants/presets/collections.ts';
import { presetCollectionGuidance } from '../../constants/tooltips/index.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

interface PresetCollectionListProps {
  /** How many presets each collection currently holds — the filtered count while a query is live. */
  readonly counts: ReadonlyMap<PresetCollectionId, number>;
  readonly active: PresetCollectionId;
  /** Whether a query is narrowing the library, which is what makes an empty collection unreachable. */
  readonly isFiltering: boolean;
  readonly onSelect: (collection: PresetCollectionId) => void;
}

/**
 * Which part of the library the panel beside this is showing.
 *
 * A `<nav>` of buttons marked with `aria-current`, not an ARIA tablist — the same choice the header's
 * view switcher makes, and for the same reason: these replace the panel's contents rather than
 * revealing one of several panels that all exist at once, so claiming a tabpanel relationship would
 * promise assistive technology a structure the page does not have.
 *
 * **An empty collection is only unreachable while a query is live.** Every collection here holds
 * built-in presets and none of them is empty with no query running, so the rule has nothing to act
 * on in that case; while filtering, a collection with no matches has nothing to show and selecting
 * it would blank the panel.
 */
export function PresetCollectionList({ counts, active, isFiltering, onSelect }: PresetCollectionListProps) {
  return (
    <nav aria-label="Preset collections">
      <ul className="space-y-1">
        {PRESET_COLLECTION_IDS.map((collection) => {
          const count = counts.get(collection) ?? 0;
          const isActive = collection === active;
          // The collection being *shown* is never disabled, even at zero matches. A query that matches
          // nothing anywhere leaves the panel on the chosen collection with an explanation in it, and
          // disabling every row there would take the whole list out of the tab order — while the one
          // row describing what is already on screen would be announced as both current and
          // unavailable. Selecting it is a no-op, which is the right outcome for a destination the
          // user is already at.
          const isUnreachable = isFiltering && count === 0 && !isActive;
          const label = presetCollectionLabel(collection);

          return (
            <li key={collection}>
              {/* The row is the whole width of the sidebar, so the wrapper is what fills it and the
                  button is told to fill the wrapper. */}
              <ControlTooltip
                hint={label}
                text={presetCollectionGuidance(label)}
                className="relative flex w-full"
              >
                <button
                  type="button"
                  disabled={isUnreachable}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => {
                    onSelect(collection);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors duration-390 ${
                    isActive
                      ? // Near-black on the view's own stop. Every stop on the wheel is a *light* colour
                        // — they share one lightness precisely so they are interchangeable — so ink on
                        // one would be two light tones a shade apart.
                        'bg-tab text-foundry-950'
                      : isUnreachable
                        ? 'cursor-not-allowed text-ink-faint'
                        : 'text-ink-muted hover:bg-foundry-700 hover:text-ink'
                  }`}
                >
                  <span className="truncate">{label}</span>
                  <span
                    className={`font-mono text-2xs ${isActive ? 'text-foundry-950/70' : 'text-ink-faint'}`}
                  >
                    {count}
                  </span>
                </button>
              </ControlTooltip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
