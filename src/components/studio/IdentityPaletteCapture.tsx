import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useFileDropTarget } from '../../hooks/useFileDropTarget.ts';
import { useIdentityPaletteCapture } from '../../hooks/useIdentityPaletteCapture.ts';
import { useImageFile } from '../../hooks/useImageFile.ts';
import { FilePickerField } from '../common/FilePickerField.tsx';
import { QuantisedSheetCaptureButton } from './QuantisedSheetCaptureButton.tsx';

/**
 * Reads an accepted sheet's colours into the identity lock above it.
 *
 * The palette is the one line of `baseline-prompt-new.md` §5's digest that does not need a pair of
 * eyes on the image — and the one nobody writes accurately by hand, because eyeballing hex codes off
 * a sheet is guesswork. Nothing here touches the prose lines: `IdentitySubjectDigest` beside it
 * offers a starting point for those from the studio's own fields, and this only ever adds or
 * replaces the `Palette:` segment.
 *
 * **Two ways in, and the button is the one to reach for.** The sheet whose palette a reader wants is
 * almost always the one they have just cleaned in the Quantise tab, so `QuantisedSheetCaptureButton`
 * takes it straight from there — see that file for what asking them to find the file again was
 * costing. The picker and the drop target stay for the sheet that is not in the tab: one from last
 * week, or one somebody else generated. Both routes end in `useIdentityPaletteCapture`, so they
 * cannot disagree about what they read.
 *
 * **Nothing is uploaded.** The image is decoded here, measured here, and never leaves the tab. That
 * is what separates this from §10.3's captured digest, which is removed rather than merely unbuilt:
 * describing what a sheet *depicts* needs an outbound vision call, while its colours are simply in
 * the pixels.
 *
 * No paste route, unlike the Quantise tab: this is one control among a form's many, and a window
 * listener here would rewrite the lock when the user pasted a screenshot meant for somewhere else.
 */
export function IdentityPaletteCapture() {
  const capture = useIdentityPaletteCapture();
  const acceptFile = useImageFile(capture);
  const { isDraggedOver, dropHandlers } = useFileDropTarget(acceptFile);

  return (
    <section
      {...dropHandlers}
      // 585 rather than the layer default, which is the control rung: this is a drop *zone*, and the
      // quantiser's takes the same figure for the same reason — the surface answering a drag is the
      // panel, not a button on it.
      className={`rounded-xl border border-dashed p-3 transition-colors duration-585 ${
        isDraggedOver ? 'border-tab bg-tab/10' : 'border-foundry-600 bg-foundry-800/60'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <QuantisedSheetCaptureButton />

        <FilePickerField
          label="Read the palette from an accepted sheet"
          tooltip={STUDIO_ACTION_TOOLTIPS.readPalette}
          acceptFile={acceptFile}
        />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-ink-faint">
        Take it from the Quantise tab, drop one here, or choose it. Its dominant colours are added to the lock
        above as a <span className="font-mono">Palette</span> line, most-used first, with the background key
        excluded. A file dropped here is read exactly as it arrived, so a sheet with anti-aliased edges
        carries blends of that key into the tail of the list — the button reads the quantised result instead,
        which is the clean list and the one the next sheet will be drawn in. Nothing is uploaded — the image
        is read in this tab and never leaves it.
      </p>
    </section>
  );
}
