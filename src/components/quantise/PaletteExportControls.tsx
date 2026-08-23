import { PALETTE_EXPORT_GUIDANCE } from '../../constants/paletteExport.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { Rgba } from '../../types/quantiser.ts';
import { Badge } from '../common/Badge.tsx';
import { PaletteDownload } from '../common/PaletteDownload.tsx';

interface PaletteExportControlsProps {
  /**
   * The colours the sheet on screen is made of, or `null` while there is no result.
   *
   * The transform’s own answer, carried on the result rather than measured here — see
   * `QuantiseResult.paletteEntries`, which also says why its length and the colour count in the
   * caption need not agree.
   */
  readonly resultPalette: readonly Rgba[] | null;
  /** The dropped file’s name, which is what a palette taken off this sheet is named after. */
  readonly sheetName: string;
}

/**
 * The palettes this tab has settled, offered as files.
 *
 * Until this existed nothing could take a list of colours out of the app: the four sheet downloads
 * carry artwork, and only the Aseprite document holds a palette at all — embedded in a format most
 * tools will not read one out of. So a pipeline that needs the swatch as a texture had one painted
 * by hand, one colour at a time, which is the step that puts a green nobody chose into every piece
 * of a character.
 *
 * **Two rows, because this tab settles two palettes and they are not the same list.** The sheet’s
 * own colours are what a reduction arrived at and change with every dial; a locked palette is what
 * the *series* is being held to, and it goes on holding colours this sheet may not have used. A
 * single row would have to pick one of them, and either choice makes the other unreachable.
 *
 * Directly under the lock panel, whose colours are the second of those rows — and separate from it
 * because that panel is about what a lock *does to the next sheet*, which a download does not touch.
 * A third palette is offered in the studio, beside the control that pins it, since a machine palette
 * is settled before any image exists.
 *
 * **The counts say “entries”, not “colours”, and the word is doing real work** — the same distinction
 * the sheet download’s confirmation makes. An entry is one colour however many coverages it appears
 * at, while the caption beside the preview counts distinct pixel values, so the two figures part
 * company on any sheet with a soft edge. Two numbers for one thing on one screen is what the wording
 * avoids, and the panel’s paragraph says which is which.
 *
 * **Not gated on a recompute being in flight**, unlike the lock beside it. A download states what is
 * on screen, which is what the preview is also still showing, and that is the footing
 * `DownloadControls` has always stood on. A lock is different because it feeds back into the
 * pipeline: holding the colours of a sheet the dials have already moved past changes the next
 * result, where writing a file of it changes nothing.
 */
export function PaletteExportControls({ resultPalette, sheetName }: PaletteExportControlsProps) {
  const lock = useQuantiseStore((state) => state.lockedPalette);
  const sheetColors = resultPalette ?? [];
  const offered = sheetColors.length > 0 || lock !== null;

  return (
    <section className="glass-panel rounded-2xl border border-foundry-700 p-4 shadow-lg transition-colors duration-585 hover:border-tab/40">
      <p className="text-xs font-semibold text-ink-muted">Palette export</p>

      {sheetColors.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge tone="valid">
            {sheetColors.length} {sheetColors.length === 1 ? 'entry' : 'entries'} in this sheet
          </Badge>
          <PaletteDownload
            palette={{ name: sheetName, entries: sheetColors }}
            subject="the colours of this sheet"
          />
        </div>
      )}

      {lock !== null && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge tone="valid">
            {lock.entries.length} {lock.entries.length === 1 ? 'entry' : 'entries'} held from {lock.sheetName}
          </Badge>
          {/* Named apart from the row above, and it has to be: a lock taken off the sheet on
              screen would otherwise write both palettes under one file name, and they are not the
              same list — the lock goes on holding colours this sheet may not have used. */}
          <PaletteDownload
            palette={{ name: `Locked from ${lock.sheetName}`, entries: lock.entries }}
            subject="the locked palette"
          />
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        {offered ? PALETTE_EXPORT_GUIDANCE.available : PALETTE_EXPORT_GUIDANCE.open}
      </p>
    </section>
  );
}
