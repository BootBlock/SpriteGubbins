import type { ComponentOrientation } from './components.ts';

/**
 * Which gated blocks, beyond the sections Sol always forwards, a prompt carries.
 *
 * `utils/modelWrapperText/sol.ts` names each one it is told is present, so Sol forwards it to the
 * image tool unshortened. Each field is the compiler's own gate answer for its block, never a second
 * derivation, so the wrapper cannot name a block the prompt does not carry.
 */
export interface SolGatedBlocks {
  /** Section 2's native-grid block, which a native scale emits. */
  readonly nativeGrid: boolean;
  /** Section 2's palette block, which a pinned palette emits. */
  readonly palette: boolean;
  /** Section 5's piece-geometry block, which a rig contract emits on the sheet it describes. */
  readonly rigGeometry: boolean;
  /** Section 3's ledger of the one-sided features this subject carries, from `ONE_SIDED_FEATURES`. */
  readonly oneSidedFeatures: boolean;
  /**
   * How the sheet's components are oriented, from the plan's own `orientation` — which decides whether
   * section 3 states object yaws, a camera every subject is posed beneath, or flat pieces under none.
   */
  readonly orientation: ComponentOrientation;
  /**
   * Section 1's colour lines, which a stated *Primary Colours* or *Accent Colours* emits. A colour is
   * a figure the hand-off can shorten to a mood — “cool tones” for `Slate #1E293B & Pale Ice #BFD7E6`
   * — so it is protected with the inventory (audit finding T3).
   */
  readonly colours: boolean;
  /** Section 2's target size line, which a stated *Target Size* emits (audit finding T3). */
  readonly targetSize: boolean;
  /** Section 2's smallest display size line, which a stated display size emits (audit finding T3). */
  readonly displaySize: boolean;
  /**
   * Whether section 2's resolution profile line states the sheet's one square at an exact share of its
   * cell (`statesTileShare`), which the Quantise tab finds the square again by. A hand-off that rounds
   * it to "most of the cell" leaves an overlay piece placed against a square of the wrong size.
   */
  readonly tileShare: boolean;
  /**
   * Whether section 0 asks for a transparent background, which the image tool returns only when its
   * call sets the tool's `background` option (audit finding T1, `AlphaDelivery`'s `TOOL_CALL`).
   */
  readonly transparent: boolean;
}
