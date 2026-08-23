/**
 * Guidance for the three buttons that write a settled palette to a file.
 *
 * One set rather than one per palette, because the button explains the **file** and the row it sits
 * in names the palette: the same three formats are offered for the machine palette pinned in the
 * studio, for a palette locked across a series, and for the colours a reduction settled on. A
 * paragraph per palette per format would be nine, eight of which would say the same thing about a
 * format and differ in a clause.
 */
export const PALETTE_EXPORT_TOOLTIPS = {
  swatchPng:
    'Saves the colours as a picture — one 16-pixel block per colour, left to right, in the order the row above lists them. This is the form a game engine imports: a pipeline that maps artwork onto a fixed set of colours wants that set as a texture, and Godot will not quantise a rig until one is set. Painting it by hand is where a green one step off the green in your prompt gets into every piece of a character, so the file is written from the colours themselves rather than transcribed. It carries no artwork and changes nothing about the sheet, the prompt or the studio.',

  gpl: 'Saves the colours as a GIMP palette, which is the interchange format Aseprite, Krita, GIMP and most pixel editors open. Loading it puts the palette in the editor beside your artwork, so you can paint in exactly the colours the rest of the series uses rather than picking them off a screenshot. Each entry is named for its own hex value, since colours taken off a returned sheet have no names to carry. Nothing about the sheet or the prompt moves, and the file holds no artwork.',

  hexList:
    'Saves the colours as plain text, one hex value per line and nothing else. This is the form to reach for when the colours are going somewhere that has no importer — a prompt you are writing by hand, a shader constant, a spreadsheet, or another application whose colour field you paste into. There is no header or count to delete first, so the whole file is the list. It carries no artwork and changes nothing here.',
} as const;
