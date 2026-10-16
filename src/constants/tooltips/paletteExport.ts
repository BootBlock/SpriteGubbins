import { MAX_PALETTE_ENTRIES } from '../../utils/pngPalette.ts';

/**
 * Guidance for the three buttons that write a settled palette to a file.
 *
 * One set rather than one per palette, because the button explains the **file** and the row it sits
 * in names the palette: the same three formats are offered for the machine palette pinned in the
 * studio, for a palette locked across a series, and for the colours a reduction settled on. A
 * paragraph per palette per format would be nine, eight of which would say the same thing about a
 * format and differ in a clause.
 *
 * **So nothing here may describe what is beside it.** Only one of the three rows shows the colours
 * as swatches, and a sentence pointing at that strip reads as a promise the other two do not keep.
 */
export const PALETTE_EXPORT_TOOLTIPS = {
  swatchPng:
    'Saves the colours as a picture: one 16-pixel block per colour, left to right, in the palette’s own order. This is the form an engine importer reads when it maps artwork onto a fixed set of colours.\n\n' +
    `The file is written from the colours themselves, so no swatch painted by hand can drift a step off. It is offered up to ${String(MAX_PALETTE_ENTRIES)} colours, holds no artwork and changes nothing about the sheet, the prompt or the studio.`,

  gpl:
    'Saves the colours as a GIMP palette, a `.gpl` file that Aseprite, Krita, GIMP and most pixel editors open. Load it to paint in exactly the colours the rest of the series uses, rather than picking them off a screenshot.\n\n' +
    'Each entry is named for its own hex value. The file holds no artwork and changes nothing about the sheet or the prompt.',

  hexList:
    'Saves the colours as plain text, one hex value per line, with no header or count to delete. Use it where the colours are going somewhere without an importer: a prompt you write by hand, a shader constant, a spreadsheet or another application’s colour field. It carries no artwork and changes nothing here.',
} as const;
