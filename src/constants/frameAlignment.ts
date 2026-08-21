/**
 * What the frame-alignment panel says about what the pass found, keyed to the state it found it in.
 *
 * Filed beside `spriteSymmetry.ts` and for the same reason that set is filed apart from
 * `constants/tooltips/`: these describe the state of the reader's own sheet, where a *control's*
 * guidance describes the control. The panel's two controls each have their own entry in
 * `QUANTISE_TOOLTIPS`.
 *
 * None of them names a figure. The badges beside the paragraph state the counts and the list under
 * it states each frame's drift, so a third copy in prose would be one more place for them to
 * disagree.
 */
export const FRAME_ALIGNMENT_GUIDANCE = {
  /**
   * The pass is not running, which is how the tab opens.
   *
   * The paragraph a first-time reader meets, so it has to say what the control is *for* — and say,
   * before anyone turns it on, that a row of sprites is not always a run of frames.
   */
  off: 'Frames of one animation are laid out in a row at an even spacing, and a generator returns them very nearly so — seven frames on the beat and one sitting two pixels to the left, which is invisible on the sheet and a limp when the row plays. This gathers the sprites that share a horizontal band, works out the spacing that row actually keeps to, and reports how far each frame sits from the slot that spacing gives it. Each frame is found by its own coverage rather than by the box around it, so a pose that reaches further is not mistaken for a frame that moved. A row is not always an animation, though: four facings sit on a spacing too, and one drawn wider on one side belongs where it is. Read the sheet before moving anything.',

  /**
   * The pass is on and no reading is on screen — no result yet, or a newer one on its way.
   *
   * Its own paragraph rather than a fall-back to one of the others, for the reason
   * `SYMMETRY_GUIDANCE.pending` is: every other paragraph here is wrong in this state, and the two
   * findings are the worst of them, since a reading taken under the previous setting would be
   * asserting an outcome the pass has not reached.
   */
  pending:
    'The sheet is being read. The sprites are being gathered into the rows they sit in, each row’s own spacing fitted from where its frames actually are, and every frame registered against the first of its row by the coverage the two share. The drifts appear here as soon as the reading settles.',

  /**
   * Nothing was segmented, so there are no sprites to gather into rows — about the *keying*.
   *
   * It points at the sprite panel rather than restating that panel's own diagnosis: the sheet may be
   * solid, scattered, or empty, and each of those already has a paragraph there saying which.
   */
  none: 'No sprite was found on this sheet, so there is no row to fit a spacing to. Alignment is read per row of sprites, over the pieces the sheet was separated into — the sprite panel above says why it separated into none, and this fills in as soon as it does.',

  /**
   * Sprites were found, but none of the rows they form holds enough frames to fit a spacing to.
   *
   * A finding rather than a failure, and the one state that most reads as a broken control: a sheet
   * of single subjects, or one whose sprites sit in twos, is a perfectly ordinary sheet with nothing
   * here to say about it. So the paragraph says what a strip needs and why a pair cannot be one.
   */
  short:
    'No row on this sheet holds three sprites, so there is no strip to align. Two frames sit at some spacing by definition — the spacing is simply the distance between them — so a pair can never be found to have drifted off it, and reading one would report every sheet as perfect. Three is the shortest row with a frame the outer two can disagree about. Raise the sprite gap above if a row is being counted as separate pieces, or lower it if two rows are being read as one.',

  /** Reported and nothing moved, which is what `CHECK` always does. */
  read: 'Each row has been fitted to the spacing its own frames keep to, and every frame is listed below with how far it sits from the slot that spacing gives it. Zero across a row means the run holds still. A frame or two out on one axis is the drift this exists to find; a whole row of large and unrelated figures usually means the sprites in it are not frames of one thing at all. Nothing has been changed — the sheet, the download and everything stored are exactly as the dials above left them.',

  /** `SNAP`, and at least one frame was moved. */
  moved:
    'The frames marked below sat further from their slot than the tolerance allows, so each has been carried onto it. Nothing about the artwork changed — every pixel of a moved frame is the same pixel in the same colour, in a different place — and the box it left behind is now empty. A move that would have brought a frame against its neighbour was refused rather than made, so a row with no gutter keeps its drift instead of losing a sprite. Switch the preview to Onion skin to see the row laid over itself.',

  /** `SNAP`, and nothing qualified — the state that reads as a broken feature and is not. */
  refused:
    'No frame on this sheet sits further from its slot than the tolerance allows, so none has been moved. On a row that came back evenly spaced that is the whole answer and the right one. It is also what a sheet looks like when the tolerance is set above the drift it holds, or when every drifting frame sits too close to a neighbour for the move to be made without reaching it — the drifts listed below say which of the three is in front of you.',
} as const;
