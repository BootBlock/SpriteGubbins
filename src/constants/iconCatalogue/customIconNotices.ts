/**
 * What the catalogue dialog says about an icon of the reader's own outside its form: under its row, and
 * after it is unticked, kept, deleted or could not be stored.
 *
 * Each says what happened to the set and what happened to the project's library, because the two hold
 * separate copies (`SavedCustomIcon`) and a reader cannot see from a tick which of them moved.
 */
export const CUSTOM_ICON_NOTICES = {
  /**
   * Under a row whose entry is on the set but in no library of this project — a set loaded from another
   * project's preset, or an entry deleted from the library: why its untick is a removal.
   */
  setOnly:
    'This icon is on your set but not in this project’s library, so unticking it takes it away. Save to library keeps a copy to tick again.',

  /** Under a ticked row whose set copy is not the library's copy of the same slot. */
  differs:
    'Your set holds a different copy of this icon from your library’s. Untick it and tick it again to draw your library’s copy, or use Edit to save this one over it.',

  /** After a set-only entry is unticked, which Undo takes back. */
  removed: (role: string): string =>
    `Took “${role}” off your set. It is not in your library, so Undo is the way to bring it back.`,

  /** After a set-only entry is saved into the library. */
  kept: (role: string): string => `Saved “${role}” to this project’s library.`,

  /** After an entry is deleted from the library. */
  deleted: (role: string): string =>
    `Deleted “${role}” from your library. Any set that holds a copy of it keeps that copy.`,

  /** When an icon reached the set and the library refused it; a held-elsewhere reason follows it. */
  setOnlyAfterRefusal: 'Your set has the icon, but it could not be saved to your library.',
} as const;
