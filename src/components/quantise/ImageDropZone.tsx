import { QUANTISE_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { FilePickerField } from '../common/FilePickerField.tsx';

interface ImageDropZoneProps {
  readonly acceptFile: (file: File | null | undefined) => void;
  /** The image currently loaded, or `null` before anything has been brought in. */
  readonly currentName: string | null;
  /** Drop the sheet and put every control on the tab back to its default. */
  readonly onClear: () => void;
}

/**
 * The three ways an image gets into this tab: dropped, pasted, or chosen.
 *
 * Rendered whether or not an image is already loaded, because replacing one is the common case — a
 * split rig is eight sheets, worked through one after another, and hiding the way in behind an empty
 * state would make the second sheet harder to load than the first.
 *
 * **Neither the drop nor the paste is registered here**, and the panel draws no drag state of its
 * own. Both are window listeners the tab adds — `useImageDrop` and `useImagePaste` — because this
 * tab's only input is an image, so either gesture anywhere in it is meant for this panel. What
 * answers a file in the air is `ImageDropVeil`, over the whole viewport; a bloom on this panel
 * beside it would be a second signal for one gesture, and a wrong one whenever the panel had been
 * scrolled off the screen. Both routes are named in the copy, which is the only way anyone would
 * know they exist.
 *
 * **Clear appears only once there is something to clear**, beside the way in rather than beside the
 * previews, because it is the opposite of the control next to it: this panel is where the sheet
 * arrives, so it is where the sheet leaves.
 */
export function ImageDropZone({ acceptFile, currentName, onClear }: ImageDropZoneProps) {
  return (
    // The base rung rather than the 585 a drop zone used to take here: that figure was the panel
    // answering a drag, and the answer moved to the veil. What is left is an ordinary hover.
    <section className="relative overflow-hidden rounded-2xl border-2 border-dashed border-foundry-600 bg-foundry-800/60 p-6 text-center transition-all hover:border-tab/50 hover:bg-foundry-800/80">
      <p className="text-sm font-bold text-ink">
        {currentName === null ? 'Drop the sheet your model returned' : 'Drop another sheet to replace it'}
      </p>
      <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">
        Drop it anywhere on this tab, paste one from the clipboard, or choose a file. Nothing is uploaded —
        the image is decoded in this tab, transformed here, and never leaves it.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <FilePickerField
          label="Choose an image"
          tooltip={QUANTISE_ACTION_TOOLTIPS.chooseImage}
          acceptFile={acceptFile}
          tone="faint"
        />

        {currentName !== null && (
          // `rose` because it discards, and outlined rather than filled because what it discards is
          // one tab's working state — nothing saved, nothing that cannot be dropped in again. The
          // filled treatment belongs to an action that deletes something the user would miss.
          <ControlTooltip hint="Clear" text={QUANTISE_ACTION_TOOLTIPS.clearImage}>
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-rose/40 bg-rose/10 px-3 py-1.5 text-xs font-semibold text-rose transition-all hover:border-rose hover:bg-rose/20 active:scale-[0.98]"
            >
              <span aria-hidden="true">✕</span> Clear
            </button>
          </ControlTooltip>
        )}
      </div>

      {currentName !== null && (
        <p className="mt-3 font-mono text-2xs text-ink-faint">Loaded: {currentName}</p>
      )}
    </section>
  );
}
