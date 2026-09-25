/**
 * Which blocks that state figures, beyond the three sections Sol always forwards, a prompt carries.
 *
 * `utils/modelWrapperText/sol.ts` names each one it is told is present, so Sol forwards it to the
 * image tool unshortened. Each field is the compiler's own gate answer for its block, never a second
 * derivation, so the wrapper cannot name a block the prompt does not carry.
 */
export interface SolFigureBlocks {
  /** Section 2's native-grid block, which a native scale emits. */
  readonly nativeGrid: boolean;
  /** Section 2's palette block, which a pinned palette emits. */
  readonly palette: boolean;
  /** Section 5's piece-geometry block, which a rig contract emits on the sheet it describes. */
  readonly rigGeometry: boolean;
}
