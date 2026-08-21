import { useState } from 'react';
import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useQuantisePresetStore } from '../../stores/useQuantisePresetStore.ts';
import type { QuantisePreset } from '../../types/quantisePreset.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

interface QuantisePresetRowProps {
  readonly preset: QuantisePreset;
}

/**
 * One saved set: its name, the sentence under it, and the two things that can be done to it.
 *
 * **Delete confirms in place**, which is `PresetCard`'s arrangement for the studio's own
 * user-created presets and is here for the same reason: the record is the user's, nothing else
 * holds a copy, and there is no undo. A second implementation of that decision — a single press
 * that destroys — would be the app answering the same question two ways depending on which tab you
 * were on. The confirmation replaces the row's buttons rather than opening a dialog, so the name
 * being deleted stays on screen beside it.
 *
 * A component of its own because that confirmation is **state**, and the list around it has none:
 * held in the list, one open confirmation would have to be keyed by id and reset whenever the
 * collection changed under it.
 *
 * Every button names the preset it acts on. Three rows of "Load" and "Delete" are three pairs of
 * identical accessible names, and a screen-reader user moving through them has nothing to tell one
 * from the next — so the visible label stays short and `aria-label` carries the name.
 */
export function QuantisePresetRow({ preset }: QuantisePresetRowProps) {
  const loadQuantisePreset = useQuantisePresetStore((state) => state.loadQuantisePreset);
  const deleteQuantisePreset = useQuantisePresetStore((state) => state.deleteQuantisePreset);
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <li className="animate-pop-in flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-foundry-700 bg-foundry-950 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-ink">{preset.name}</p>
        {preset.description !== '' && (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">{preset.description}</p>
        )}
      </div>

      {isConfirming ? (
        <>
          <ControlTooltip
            hint={`Delete “${preset.name}”`}
            text={QUANTISE_ACTION_TOOLTIPS.confirmDeleteQuantisePreset}
          >
            <button
              type="button"
              aria-label={`Delete the saved settings “${preset.name}”, for good`}
              // The store reports its own failure with a toast and resolves, so there is nothing
              // here to handle — and nothing to await, since the row leaves as soon as it does.
              onClick={() => {
                setIsConfirming(false);
                void deleteQuantisePreset(preset.id);
              }}
              className="rounded-lg bg-rose px-3 py-1 text-xs font-bold text-foundry-950 transition-opacity duration-390 hover:opacity-90"
            >
              Delete
            </button>
          </ControlTooltip>

          <ControlTooltip hint="Cancel" text={QUANTISE_ACTION_TOOLTIPS.cancelDeleteQuantisePreset}>
            <button
              type="button"
              aria-label={`Keep the saved settings “${preset.name}”`}
              onClick={() => {
                setIsConfirming(false);
              }}
              className="rounded-lg border border-foundry-600 px-3 py-1 text-xs font-semibold text-ink-muted transition-colors duration-390 hover:bg-foundry-700 hover:text-ink"
            >
              Cancel
            </button>
          </ControlTooltip>
        </>
      ) : (
        <>
          <ControlTooltip hint="Load" text={QUANTISE_ACTION_TOOLTIPS.loadQuantisePreset}>
            <button
              type="button"
              aria-label={`Load the saved settings “${preset.name}”`}
              onClick={() => {
                loadQuantisePreset(preset);
              }}
              className="action-tab rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-390 active:scale-[0.98]"
            >
              Load
            </button>
          </ControlTooltip>

          <ControlTooltip hint="Delete" text={QUANTISE_ACTION_TOOLTIPS.deleteQuantisePreset}>
            <button
              type="button"
              aria-label={`Delete the saved settings “${preset.name}”`}
              onClick={() => {
                setIsConfirming(true);
              }}
              className="rounded-lg border border-foundry-600 bg-foundry-700 px-3 py-1 text-xs font-semibold text-ink-muted transition-all duration-390 hover:bg-rose/20 hover:text-rose active:scale-[0.98]"
            >
              Delete
            </button>
          </ControlTooltip>
        </>
      )}
    </li>
  );
}
