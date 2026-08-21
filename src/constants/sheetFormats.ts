import type { SheetFormat } from '../types/sheetFormat.ts';

/**
 * What each download format is called, what it is saved as, and what the browser is told it is.
 *
 * Beside the tab's other user-facing copy in spirit but not in file, and the reason is a type
 * import: `constants/quantiser.ts` is read by the Node-side suites under `tests/`, whose program
 * carries no DOM library. This one names a union that has nothing to do with `ImageData`, so it
 * could sit there — it is here instead so that the three facts about a format stay in one record,
 * keyed by the union, where a third format fails to compile until all three have been answered.
 * That is the same property `PREVIEW_MODE_LABELS` is a separate file to keep.
 *
 * **The label is the reader's word, not the identifier.** `Aseprite` rather than `ASEPRITE`, because
 * it is the name of an application and that is how the application spells it.
 */
export interface SheetFormatFile {
  /** What the pill reads, and what the button names. */
  readonly label: string;
  /** The extension a saved file takes, without its dot. */
  readonly extension: string;
  /**
   * What the `Blob` is labelled with.
   *
   * `.aseprite` has no registered media type — it is one application's own document format — so it
   * takes the generic byte-stream type rather than an invented `image/*` one, which some browsers
   * act on by trying to display the file rather than save it.
   */
  readonly mediaType: string;
}

export const SHEET_FORMAT_FILES: Readonly<Record<SheetFormat, SheetFormatFile>> = {
  PNG: { label: 'PNG', extension: 'png', mediaType: 'image/png' },
  ASEPRITE: { label: 'Aseprite', extension: 'aseprite', mediaType: 'application/octet-stream' },
};
