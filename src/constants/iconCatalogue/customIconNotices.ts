/**
 * What the catalogue dialog says about an icon of the reader's own outside its form: under its row, and
 * after it is removed.
 */
export const CUSTOM_ICON_NOTICES = {
  /**
   * Under every row of the reader's own, in place of the reason a catalogue row gives when it cannot be
   * ticked: why its box is ticked and cannot be unticked.
   */
  yours: 'You wrote this icon, so it stays on your set until you remove it with Remove below.',

  /** After a removal, which Undo takes back. */
  removed: (role: string): string => `Removed “${role}” from your set. Undo brings it back.`,
} as const;
