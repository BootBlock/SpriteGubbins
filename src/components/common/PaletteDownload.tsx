import { PALETTE_FILE_TYPES } from '../../constants/paletteFiles.ts';
import { PALETTE_EXPORT_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { usePaletteDownload } from '../../hooks/usePaletteDownload.ts';
import { PALETTE_FILE_FORMATS } from '../../types/paletteFile.ts';
import type { PaletteFileFormat, SettledPalette } from '../../types/paletteFile.ts';
import { ControlTooltip } from './ControlTooltip.tsx';

interface PaletteDownloadProps {
  /** The colours to write, and the name the file is called after. */
  readonly palette: SettledPalette;
  /**
   * Which palette this is, as a phrase mid-sentence — `the locked palette`, `the Game Boy palette`.
   *
   * The buttons read `Swatch PNG`, `.gpl` and `Hex list` wherever they appear, so on a page offering
   * two palettes there would otherwise be two controls with the same accessible name and nothing to
   * tell them apart. This is what distinguishes them, and it is a phrase rather than the palette’s
   * own name because it is read inside a sentence.
   */
  readonly subject: string;
}

/**
 * The three files a settled palette can leave as, as a row of buttons.
 *
 * **One implementation, three call sites**, which is the point of it being here rather than in
 * either tab’s folder. The app settles an exact list of colours in three places — a machine palette
 * pinned in the studio, a palette locked across a series, and the colours a reduction arrived at —
 * and a download offered at only one of them would leave the other two unreachable, while three
 * separate rows would be three chances for one of them to write a different file.
 *
 * **Three buttons rather than a format choice and a Download button**, unlike the sheet’s own
 * download. That control holds a magnification as well, so it has a setting to sit beside anyway;
 * here the format is the only decision, a press is instant, and a reader taking the swatch and the
 * hex list wants two presses rather than four. Each button says which file it writes, so nothing
 * about the press is hidden behind a pill somewhere else in the row.
 *
 * **A format is offered only where the palette fits it**, which today withholds the swatch picture
 * from a palette of more than `MAX_PALETTE_ENTRIES` colours — see `PaletteFileType.maxEntries`,
 * which says why that is the honest ceiling rather than a convenience. Withheld rather than
 * disabled: a control that can never become available on this palette is not a state the reader can
 * get out of, and the panel’s own paragraph says where the whole list still goes.
 *
 * Renders nothing for a palette with no colours in it. There is no file to write, and a swatch
 * picture cannot be zero pixels wide — see `swatchImage`.
 */
export function PaletteDownload({ palette, subject }: PaletteDownloadProps) {
  const download = usePaletteDownload();
  if (palette.entries.length === 0) return null;

  const offered = PALETTE_FILE_FORMATS.filter((format) => {
    const limit = PALETTE_FILE_TYPES[format].maxEntries;
    return limit === null || palette.entries.length <= limit;
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {offered.map((format) => (
        <ControlTooltip key={format} hint={PALETTE_FILE_TYPES[format].label} text={FORMAT_GUIDANCE[format]}>
          <button
            type="button"
            aria-label={`Download ${subject} as ${PALETTE_FILE_TYPES[format].phrase}`}
            onClick={() => {
              download(palette, format);
            }}
            className="rounded-lg border border-foundry-600 bg-foundry-700 px-3 py-1 text-xs font-semibold text-ink-muted transition-all hover:bg-foundry-600 hover:text-ink active:scale-[0.98]"
          >
            <span aria-hidden="true">⬇</span> {PALETTE_FILE_TYPES[format].label}
          </button>
        </ControlTooltip>
      ))}
    </div>
  );
}

/**
 * The card behind each button.
 *
 * A record keyed by the union rather than a lookup by name, so a fourth format fails to compile
 * until it has been given the paragraph a reader needs — the property the sheet download’s own
 * guidance record exists for.
 */
const FORMAT_GUIDANCE: Readonly<Record<PaletteFileFormat, string>> = {
  SWATCH_PNG: PALETTE_EXPORT_TOOLTIPS.swatchPng,
  GPL: PALETTE_EXPORT_TOOLTIPS.gpl,
  HEX_LIST: PALETTE_EXPORT_TOOLTIPS.hexList,
};
