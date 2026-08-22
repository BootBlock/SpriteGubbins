import { BACKGROUND_KEY_COLORS } from '../../constants/backgroundKeyColors.ts';
import { STUDIO_ACTION_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useFileDropTarget } from '../../hooks/useFileDropTarget.ts';
import { useImageFile } from '../../hooks/useImageFile.ts';
import { useShowToast } from '../../hooks/useShowToast.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { FilePickerField } from '../common/FilePickerField.tsx';
import type { ImportedImage } from '../../types/quantiser.ts';
import { withPaletteSegment } from '../../utils/identityDigest.ts';
import { identityPalette } from '../../utils/identityPalette.ts';

/**
 * Reads an accepted sheet's colours into the identity lock above it.
 *
 * The palette is the one line of `baseline-prompt-new.md` §5's digest that does not need a pair of
 * eyes on the image — and the one nobody writes accurately by hand, because eyeballing hex codes off
 * a sheet is guesswork. Nothing here touches the prose lines: `IdentitySubjectDigest` beside it
 * offers a starting point for those from the studio's own fields, and this only ever adds or
 * replaces the `Palette:` segment.
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
  const setOutputField = useOutputStore((state) => state.setOutputField);
  const showToast = useShowToast();

  function handleImport({ name, image }: ImportedImage) {
    // Read at call time, not at render time. Decoding awaits `createImageBitmap`, and the lock's
    // own text field sits directly above this control — so a value captured when the file was
    // chosen would discard whatever the user typed while the image was still decoding, and would
    // key the palette against a background the prompt no longer states.
    const { backgroundKey, identityLock } = useOutputStore.getState().output;

    const palette = identityPalette(image, BACKGROUND_KEY_COLORS[backgroundKey]);

    // A sheet with nothing but its key field leaves the lock alone rather than clearing its palette.
    // A generation that came back blank is the likeliest way to get here, and silently deleting a
    // good palette because a *failed* sheet was dropped is a worse outcome than doing nothing.
    if (palette.length === 0) {
      showToast(`${name} has nothing on it but its background key — the identity lock is unchanged`);
      return;
    }

    setOutputField('identityLock', withPaletteSegment(identityLock, palette));
    showToast(
      `Read ${String(palette.length)} ${palette.length === 1 ? 'colour' : 'colours'} from ${name} into the identity lock`,
    );
  }

  const acceptFile = useImageFile(handleImport);
  const { isDraggedOver, dropHandlers } = useFileDropTarget(acceptFile);

  return (
    <section
      {...dropHandlers}
      className={`rounded-xl border border-dashed p-3 transition-colors ${
        isDraggedOver ? 'border-tab bg-tab/10' : 'border-foundry-600 bg-foundry-800/60'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <FilePickerField
          label="Read the palette from an accepted sheet"
          tooltip={STUDIO_ACTION_TOOLTIPS.readPalette}
          acceptFile={acceptFile}
        />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-ink-faint">
        Drop one here, or choose it. Its dominant colours are added to the lock above as a{' '}
        <span className="font-mono">Palette</span> line, most-used first, with the background key excluded. A
        sheet with anti-aliased edges carries blends of that key, which can fill the tail of the list —
        quantise it first for a clean read. Nothing is uploaded — the image is read in this tab and never
        leaves it.
      </p>
    </section>
  );
}
