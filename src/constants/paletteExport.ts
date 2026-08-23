/**
 * What the palette export panel says about the state it is in.
 *
 * Beside `paletteLock.ts` rather than in `constants/tooltips/`, for the reason that file gives: this
 * is the paragraph under a panel rather than the card behind a control. Unlike the lock panel’s copy
 * it reports no reading of the reader’s image — both entries are a function of what is on offer, and
 * what they explain is the buttons — so both are held to the guidance rules, which
 * `tooltips.test.ts` names them for.
 */
export const PALETTE_EXPORT_GUIDANCE = {
  /** Nothing to export yet: what would be on offer, and what has to happen first. */
  open: 'A palette is the thing two applications have to agree on, so it is the thing that most wants to be a file. Nothing here yet — the colours of a quantised sheet appear once a grid is settled, and a locked palette appears once you take one. A machine palette pinned in the studio is offered beside the control that pins it, on the Studio tab.',

  /** Something is on offer: what the three formats are for, what an entry is, and what is untouched. */
  available:
    'Each row is a list of colours this app has settled, offered as the three files other tools read: a swatch picture for an engine importer, a GIMP palette for a pixel editor, and a plain hex list for everything else. An entry is one colour however many coverages it appears at, so these counts can sit below the colour count in the caption beside the preview, which counts a soft edge’s every step separately. Past 256 entries only the two text forms are offered, since that is as many as an image can carry as a palette rather than as ordinary pixels. Downloading changes nothing: the sheet, the dials, the lock and the studio are all where you left them.',
} as const;
