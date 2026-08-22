/**
 * How one collection's members are named in the sentences that talk about a whole pack.
 *
 * Importing a pack replaces a collection outright, so both the confirmation the reader answers and
 * the toast that reports what happened have to count things — "4 custom presets, replacing 11". The
 * two collections call their members different words, and that word is the only part of either
 * sentence that differs between them, so it travels as data rather than as two copies of the
 * wording.
 */
export interface PackItemNoun {
  /** What one member is called: “custom preset”. */
  readonly singular: string;
  /** What several are called: “custom presets”. */
  readonly plural: string;
}
