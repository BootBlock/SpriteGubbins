import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useQuantisePresetStore } from '../../stores/useQuantisePresetStore.ts';
import type { QuantisePreset } from '../../types/quantisePreset.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

interface QuantisePresetListProps {
  readonly presets: readonly QuantisePreset[];
}

/**
 * The saved sets, each with the two things that can be done to it.
 *
 * A list rather than the studio library's cards, and the difference is what there is to show. An
 * archetype card carries the subject it describes — a category, a render style, a camera — which is
 * worth a tile the eye can scan. A set of dial positions is thirteen numbers, and a card showing
 * them would be a table nobody reads: what a reader picks one of these out of the list by is the
 * *name they gave it*, which is why the name and the sentence under it are the whole row.
 *
 * Split out of `QuantisePresetControls` because that panel's job is putting settings *into* the
 * collection and this one's is taking them out — the same division the Presets tab makes between
 * its save panel and its library.
 */
export function QuantisePresetList({ presets }: QuantisePresetListProps) {
  const loadQuantisePreset = useQuantisePresetStore((state) => state.loadQuantisePreset);
  const deleteQuantisePreset = useQuantisePresetStore((state) => state.deleteQuantisePreset);

  return (
    <ul className="stagger-children mt-4 space-y-2">
      {presets.map((preset) => (
        <li
          key={preset.id}
          className="animate-pop-in flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-foundry-700 bg-foundry-950 px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">{preset.name}</p>
            {preset.description !== '' && (
              <p className="mt-0.5 text-2xs leading-relaxed text-ink-faint">{preset.description}</p>
            )}
          </div>

          <ControlTooltip hint="Load" text={QUANTISE_ACTION_TOOLTIPS.loadQuantisePreset}>
            <button
              type="button"
              onClick={() => {
                loadQuantisePreset(preset);
              }}
              className="action-tab rounded-lg px-3 py-1 text-2xs font-semibold transition-all duration-390 active:scale-[0.98]"
            >
              Load
            </button>
          </ControlTooltip>

          <ControlTooltip hint="Delete" text={QUANTISE_ACTION_TOOLTIPS.deleteQuantisePreset}>
            <button
              type="button"
              // The store reports its own failure with a toast and resolves, so there is nothing
              // here to handle — and nothing to await, since the row leaves as soon as it does.
              onClick={() => {
                void deleteQuantisePreset(preset.id);
              }}
              className="rounded-lg border border-foundry-600 bg-foundry-700 px-3 py-1 text-2xs font-semibold text-ink-muted transition-all duration-390 hover:bg-rose/20 hover:text-rose active:scale-[0.98]"
            >
              Delete
            </button>
          </ControlTooltip>
        </li>
      ))}
    </ul>
  );
}
