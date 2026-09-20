import { useState } from 'react';
import { CUSTOM_PALETTE_ACCEPT, CUSTOM_PALETTE_NAME_LIMIT } from '../../constants/customPalette.ts';
import { OUTPUT_TOOLTIPS } from '../../constants/output/index.ts';
import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useCustomPaletteIntake } from '../../hooks/useCustomPaletteIntake.ts';
import { useFileDropTarget } from '../../hooks/useFileDropTarget.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { MAX_PALETTE_ENTRIES } from '../../utils/pngPalette.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';
import { FilePickerField } from '../common/FilePickerField.tsx';
import { TextAreaField } from '../common/TextAreaField.tsx';
import { TextField } from '../common/TextField.tsx';

/** How many lines of a pasted list the box shows before it scrolls. */
const PASTE_ROWS = 4;

/**
 * Where a palette of the reader's own gets in, under the control that pins it.
 *
 * **Only under `CUSTOM`.** Every other entry in that list is a machine whose colours this app ships,
 * and a file chooser standing under a Game Boy would be offering to edit something that is not the
 * reader's to edit. `PaletteField` renders this on the choice alone rather than on whether anything
 * is loaded, because the moment a reader picks the option is exactly the moment they need to be
 * shown how to fill it.
 *
 * **Three ways in, because a palette leaves this app three ways.** The picture, the `.gpl` and the
 * hex list are what `PaletteDownload` writes, so anything the Quantise tab settled can be pinned
 * back here without passing through another program. The drag is answered on this element rather
 * than on the window, as `IdentityPaletteCapture` answers its own: this is one control among a
 * form's many, and a window listener here would take a file meant for somewhere else entirely.
 *
 * **What was read is stated where it was read**, rather than through a notification: the colours
 * appear as swatches directly below, under `PaletteField`'s own strip, and anything that would not
 * read is announced here beside the control that failed to read it.
 *
 * **Every write to the field goes through `useCustomPaletteIntake`**, the rename included. Nothing
 * here reaches `setOutputField` directly, so there is one place to read to know what can be written
 * to a pinned palette and what each route does to it.
 */
export function CustomPaletteField() {
  const customPalette = useOutputStore((state) => state.output.customPalette);
  const { problems, oversized, acceptFile, acceptPaste, reduceOversized, rename, clear } =
    useCustomPaletteIntake();
  const { isDraggedOver, dropHandlers } = useFileDropTarget(acceptFile);

  // The box's own text, and the one piece of state here that is not the configuration's. What was
  // pasted is not part of the sheet — the colours taken out of it are — so it has no business
  // surviving a preset save, a history entry or a tab change.
  const [pasted, setPasted] = useState('');

  return (
    <section
      {...dropHandlers}
      className={`mt-2 flex flex-col gap-2 rounded-xl border border-dashed p-3 transition-colors duration-585 ${
        isDraggedOver ? 'border-tab bg-tab/10' : 'border-foundry-600 bg-foundry-800/60'
      }`}
    >
      <FilePickerField
        label="Palette file"
        tooltip={STUDIO_ACTION_TOOLTIPS.loadCustomPalette}
        acceptFile={acceptFile}
        accept={CUSTOM_PALETTE_ACCEPT}
      />

      <TextAreaField
        label="Or paste the colours"
        tooltip={OUTPUT_TOOLTIPS.customPalettePaste}
        value={pasted}
        placeholder="#RRGGBB, one a line"
        rows={PASTE_ROWS}
        onChange={(value) => {
          setPasted(value);
          acceptPaste(value);
        }}
      />

      {customPalette !== null && (
        <>
          <TextField
            label="Palette name"
            tooltip={OUTPUT_TOOLTIPS.customPaletteName}
            value={customPalette.name}
            placeholder="Dusk Harbour"
            maxLength={CUSTOM_PALETTE_NAME_LIMIT}
            onChange={rename}
          />

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs leading-relaxed text-ink-muted">
              {customPalette.entries.length} {customPalette.entries.length === 1 ? 'colour' : 'colours'}{' '}
              pinned. The prompt states every one of them, and the Quantise tab maps a returned sheet onto
              them.
            </p>
            <ControlTooltip hint="Remove" text={STUDIO_ACTION_TOOLTIPS.removeCustomPalette}>
              <button
                type="button"
                className="rounded-lg border border-foundry-600 px-3 py-1 text-xs font-semibold text-rose transition-colors hover:border-rose/50 hover:bg-foundry-700"
                onClick={() => {
                  setPasted('');
                  clear();
                }}
              >
                Remove
              </button>
            </ControlTooltip>
          </div>
        </>
      )}

      {/*
        A live region, because every answer this panel gives arrives after a file has been read
        rather than in response to the press: nothing moves on screen at the moment the reader acts,
        so a screen reader would otherwise announce nothing at all.

        **Rendered always, with only its contents conditional** — the rule `RigContractField` and
        `SpriteCellControls` state at their own call sites: a region inserted into the document in
        the same commit as its text is not reliably announced, so a region that appears with the
        first refusal announces nothing, which is the whole of what it was added for. Empty it costs
        nothing: it has no padding and no children.

        One region for both answers, because they are the same event to the reader — what happened
        to the file they just handed over — and two live regions announcing in an order neither
        controls is worse than one.
      */}
      <div aria-live="polite" className="flex flex-col gap-2">
        {oversized !== null && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs leading-relaxed text-ink-muted">
              {oversized.name} holds {oversized.colors} colours, which is more than the {MAX_PALETTE_ENTRIES}{' '}
              a palette can carry, so nothing has been pinned. It is a sheet rather than a swatch — reduce it
              if those are the colours you meant.
            </p>
            <ControlTooltip hint="Reduce" text={STUDIO_ACTION_TOOLTIPS.reduceCustomPalette}>
              <button
                type="button"
                className="rounded-lg border border-foundry-600 px-3 py-1 text-xs font-semibold text-ink transition-colors hover:border-accent/50 hover:bg-foundry-700"
                onClick={reduceOversized}
              >
                Reduce to {MAX_PALETTE_ENTRIES}
              </button>
            </ControlTooltip>
          </div>
        )}

        <ul className="flex flex-col gap-1 text-xs leading-relaxed text-rose">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
