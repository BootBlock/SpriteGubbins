import { MAX_PALETTE_ENTRIES } from '../../utils/pngPalette.ts';
import { REDO_KEYBOARD_SHORTCUTS, WRITE_UNAVAILABLE_UNTIL_SETTLED } from '../guidanceSentences.ts';

/**
 * Guidance for the Quantise tab's actions.
 *
 * Beside `constants/quantiser.ts`'s own `QUANTISE_TOOLTIPS` rather than inside it, and the split is
 * the same one the studio makes: that object explains the tab's three *settings* — the pixel grid,
 * the zoom and the keying — and sits with the numbers those settings are drawn from. These are the
 * buttons, and what a reader needs from one of those is what pressing it does to the sheet in front
 * of them.
 */
export const QUANTISE_ACTION_TOOLTIPS = {
  chooseImage:
    'Opens a file picker for the sheet your generator returned. You can also drop the file anywhere on this tab, or paste one from the clipboard while this tab is open.\n\n' +
    'The image is decoded and transformed in this tab and never leaves it: there is no server to send it to.',

  clearImage:
    'Unloads the sheet and puts every control on this tab back to its default, so the next image is read fresh rather than through the grid and tolerance the last one needed.\n\n' +
    'It discards only this tab’s working state: the file on disk, the studio configuration and your downloads are untouched. You do not need it to load another sheet, since dropping a new file replaces the old one.',

  detachPreview:
    'Moves both previews, the layout choice and the zoom into a window of their own, so they stay in view while you scroll through the dials. You can drag the window to a second display and make it as large as you like, and the previews keep following every change you make here.\n\n' +
    'It changes where the preview is shown and nothing else. A browser set to block popups can refuse it, and this panel says so if that happens.',

  reattachPreview:
    'Closes the separate window and puts both previews back into this page, where the panel came from. Closing that window yourself, or leaving this tab, does the same, so nothing is stranded.\n\n' +
    'The zoom, the layout and the position you had panned to all come back with it.',

  downloadAseprite:
    'Saves the quantised sheet as an Aseprite document at the Save At magnification, with the animation already laid out.\n\n' +
    '- Each piece the Sprites panel resolved is one frame, in reading order. A sprite you left out has no frame, and two you joined share one.\n' +
    '- Each row of pieces is tagged as its own run.\n' +
    '- Frames are centred across, but each sprite keeps its height, so a bob or a crouch carries through.\n' +
    '- Where the colours fit, the document is indexed with the palette as its own, so a palette swap works. Past 256 colours it is RGB, and the confirmation says which.\n\n' +
    WRITE_UNAVAILABLE_UNTIL_SETTLED +
    ' In a batch, the document’s name adds the sheet’s facing, or its number where no facing tells it apart.',

  downloadPNG:
    'Saves the quantised sheet as a PNG at the Save At magnification, whatever the preview shows. At 1× it is the sheet’s true size, one file pixel per drawn pixel, which is what an engine wants: a 1024 px sheet read at a grid of 8 is 128 px across.\n\n' +
    'Where the colours fit, it is an indexed PNG carrying its palette, which a game pipeline or palette-swap shader can read. That is 255 colours for a keyed sheet and 256 for an opaque one; past that it is an ordinary PNG, and the confirmation says which. A keyed background stays transparent.\n\n' +
    WRITE_UNAVAILABLE_UNTIL_SETTLED +
    ' The name follows the file you dropped, adding the sheet’s facing or number in a batch.',

  downloadSpritePack:
    'Saves a ZIP of the artwork already cut into pieces:\n\n' +
    '- The quantised sheet, as the PNG button saves it.\n' +
    '- One PNG per piece, cut as the Cut control states at the Save At magnification. Joined sprites share a file, and one you left out has none.\n' +
    '- A manifest naming them.\n\n' +
    'Pieces take the inventory’s names or the ones you assigned, and are numbered where the two cannot be matched, which the confirmation says. File names lead with the reading order, so a listing sorts correctly. A piece that does not fit a fixed cell refuses the download and is named.\n\n' +
    WRITE_UNAVAILABLE_UNTIL_SETTLED +
    ' In a batch, each part is named for its sheet, such as `south/01-head.png`, so the archives unzip into one folder without overwriting each other.',

  downloadManifest:
    'Saves the manifest on its own as JSON, for an importer, a packer or a script of your own. It carries no artwork; take the sprite pack if you want the pieces as files. For each piece it records:\n\n' +
    '- Where it sits, as a rect on the PNG this panel would save at the Save At magnification, plus its cell where the Cut control states one.\n' +
    '- What the inventory calls it, and how that name was reached.\n' +
    '- Its pivot: the bottom centre of its box, unless you named an anchor.\n' +
    '- Which pieces are the same drawing twice.\n\n' +
    'It also records the rig the sheet was asked for, which sheet of the batch this is and, on the sheet that draws the pieces, any rig contract you loaded. It is not the component map a generator can return, though the two number their entries the same way.',

  keyTheBackground:
    'Turns background keying on at the tolerance this tab already holds, and the tolerance control appears in the keying row. The tab offers this when the sheet’s border is the key colour the studio asked for, which means the background came back painted rather than transparent.\n\n' +
    'It changes the result, not your file: the background becomes transparent, and the sprite, duplicate, symmetry and frame readings start reporting. Untick the checkbox it turns on to switch it off. The prompt and the studio are untouched.',

  lockPalette:
    'Holds the colours of the quantised sheet beside this, so the next sheet you bring in is drawn in the same ones. Without it, each sheet of a series picks its own near-identical colours, and a character’s armour changes shade between the walk sheet and the run sheet.\n\n' +
    `A held palette overrides the studio’s colour setting and survives dropping a new sheet; it changes nothing about the prompt, the studio or your downloads. It is unavailable until a sheet is quantised, while a newer result is still being worked out, when the result has no colours left, and when it has more than ${String(MAX_PALETTE_ENTRIES)}.`,

  unlockPalette:
    'Discards the held palette, so this sheet and the next are coloured by the studio’s own setting again. The sheet on screen is quantised again straight away, and nothing already downloaded changes. Take a new palette from whichever result you would rather the series followed.',

  relockPalette:
    'Replaces the held palette with the colours of the sheet beside this one. Use it after changing the studio’s colour setting, since a palette taken under the old one is still being applied, or when a different sheet’s colours should lead the series.',

  saveQuantisePreset:
    'Stores every dial on this tab under the name in the box, so you can bring the same settings back on the next sheet. The pixel scale, the sheet and any locked palette are left out, since each belongs to one image.\n\n' +
    'Typing a name that is already in the list updates that entry instead, and the button says so before you press it.',
  loadQuantisePreset:
    'Moves every dial on this tab to the positions saved under this name, and re-reads the sheet on screen at those settings. **The current positions are replaced outright**, so save them first if you want them back.',
  deleteQuantisePreset:
    'Asks to remove this saved set of dial positions. The row turns into a confirmation first, so this press changes nothing on its own, and the sheet on screen is unaffected either way.',
  confirmDeleteQuantisePreset:
    'Removes this saved set of dial positions for good. **There is no undo**, so cancel and save it under a second name first if you may want it again. The dials themselves stay where they are.',
  cancelDeleteQuantisePreset:
    'Leaves the saved set where it is and puts the row back to its ordinary buttons. Nothing was removed, and the dials on this tab were never touched.',
  undoDials:
    'Puts the dials back where they were before your last change, one change at a time; a whole slider drag counts as one. The sheet is read again at the positions you step back to.\n\n' +
    'Only the dials move: the sheet stays loaded, the pixel grid stays set and a held palette stays held. Ctrl+Z does the same, except while you are typing in a box.',
  redoDials:
    'Steps forward again into a position you have just stepped back from, for when you pressed undo once too often. Moving any dial after stepping back discards what was ahead, so this is offered only until you do. ' +
    REDO_KEYBOARD_SHORTCUTS,
  autoTune:
    'Sweeps the dials that decide how this sheet is read and puts them where the sheet says they belong, judged on five busy crops of your image. It can take a minute or two on a large sheet.\n\n' +
    'It moves the cell reading, outline expansion, ink blend, ink threshold, colour merge, fill cleanup, cleanup passes and the four dials that shape the anti-aliasing pass. The pixel scale, keying, hardening, dither, palette snap and sprite settings stay put, since a likeness score cannot judge them.\n\n' +
    'One undo puts every dial back. Treat the result as a starting point, and let your own eye on the preview settle it.',
  candidateFromSheet:
    'Puts the scale read out of this sheet into the grid box. The badge above says which kind of reading produced the number.\n\n' +
    '- A _measured_ reading is exact, because the sheet’s colours change only every so many pixels. It is already in force, so this is the way back after you type over it.\n' +
    '- An _estimated_ reading is inferred from what a softened sheet still repeats at, such as the spacing of its edges, so it is offered rather than applied.\n\n' +
    'Judge an edge at 4× or 8× after taking it.',

  candidateFromTarget:
    'Puts the scale implied by the studio’s target component size into the grid box. It is an upper bound, not a reading of this image: at any coarser scale the sheet could not hold as many components as the prompt asked for.\n\n' +
    'Try it when no reading of the sheet found a scale, and check it against the preview either way.',

  clearAssignments:
    'Discards every name you set, every sprite you left out and every pair you joined, and goes back to reading the sheet in the order the prompt fixes. The artwork, the dials and the palette are untouched.\n\n' +
    'Dropping a different sheet clears these for you, since each describes a place on one image.',

  selectSprite:
    'Selects this sprite and scrolls the list beside the preview to its row, where you can name it, leave it out or join it to another. The label is the name the sprite pack’s file and the manifest’s entry will use. An Aseprite document carries no names, but holds the same frames your choices make.\n\n' +
    'A sprite left out stays marked on the preview, so you can put it back.',
} as const;
