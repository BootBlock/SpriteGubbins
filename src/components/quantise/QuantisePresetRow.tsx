import { PROJECT_ACTION_TOOLTIPS, QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useConfirmInPlace } from '../../hooks/useConfirmInPlace.ts';
import { useQuantisePresetStore } from '../../stores/useQuantisePresetStore.ts';
import type { QuantisePreset } from '../../types/quantisePreset.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { ProjectSelectField } from '../projects/ProjectSelectField.tsx';

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
 * **The project dropdown is on a line of its own**, not in the row of buttons. A native `<select>`
 * truncates an option its container cannot fit, and a control squeezed between a name, a sentence
 * and three buttons would have clipped every project name in the app; given the row's whole width
 * it clears the option budget with room to spare.
 *
 * The same row is rendered in two places — the Quantise tab's own list of saved sets, and the
 * Projects view's panel for one project — which is why the dropdown is here rather than in either
 * of them. A set is re-filed the same way wherever it is seen.
 *
 * Every control names the preset it acts on. Three rows of "Load" and "Delete" are three pairs of
 * identical accessible names, and a screen-reader user moving through them has nothing to tell one
 * from the next — so the visible label stays short and `aria-label` carries the name. The project
 * dropdown is held to the same rule through `nameQualifier`, which names the dropdown and its ⓘ
 * together, and which keeps the visible `Project` at the front of both.
 */
export function QuantisePresetRow({ preset }: QuantisePresetRowProps) {
  const loadQuantisePreset = useQuantisePresetStore((state) => state.loadQuantisePreset);
  const deleteQuantisePreset = useQuantisePresetStore((state) => state.deleteQuantisePreset);
  const moveQuantisePreset = useQuantisePresetStore((state) => state.moveQuantisePreset);
  // The confirmation replaces this row's buttons, so it takes the keyboard with it at each of its
  // three edges — see `useConfirmInPlace`, which is where all five of the app's confirmations live.
  const { isConfirming, attachAsk, attachCancel, ask, cancel, confirm } = useConfirmInPlace();

  return (
    <li className="animate-pop-in space-y-2 rounded-xl border border-foundry-700 bg-foundry-950 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
                // here to handle. It is awaited all the same: until the write lands the row is still
                // on screen, and where the keyboard goes next is read off the page as it is after.
                onClick={() => {
                  void confirm(() => deleteQuantisePreset(preset.id));
                }}
                className="rounded-lg bg-rose px-3 py-1 text-xs font-bold text-foundry-950 transition-opacity duration-390 hover:opacity-90"
              >
                Delete
              </button>
            </ControlTooltip>

            <ControlTooltip hint="Cancel" text={QUANTISE_ACTION_TOOLTIPS.cancelDeleteQuantisePreset}>
              <button
                ref={attachCancel}
                type="button"
                aria-label={`Keep the saved settings “${preset.name}”`}
                onClick={cancel}
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
                ref={attachAsk}
                type="button"
                aria-label={`Delete the saved settings “${preset.name}”`}
                onClick={ask}
                className="rounded-lg border border-foundry-600 bg-foundry-700 px-3 py-1 text-xs font-semibold text-ink-muted transition-all duration-390 hover:bg-rose/20 hover:text-rose active:scale-[0.98]"
              >
                Delete
              </button>
            </ControlTooltip>
          </>
        )}
      </div>

      <ProjectSelectField
        label="Project"
        tooltip={PROJECT_ACTION_TOOLTIPS.moveQuantiseProject}
        value={preset.projectId}
        nameQualifier={`for the saved settings “${preset.name}”`}
        onChange={(projectId) => {
          void moveQuantisePreset(preset.id, projectId);
        }}
      />
    </li>
  );
}
