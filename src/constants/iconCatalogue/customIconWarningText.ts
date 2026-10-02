import { BACKGROUND_KEY_TEXT } from '../promptText/sheet.ts';
import type { BackgroundKey } from '../../types/rendering.ts';

/**
 * What the catalogue dialog's form says when an entry of the reader's own names something the sheet's
 * own rules will overrule. `customIconWarnings` decides which apply; this is only the words.
 *
 * Each names the word it found and what the prompt will do with it, and leaves the choice with the
 * reader: the entry is saved as written either way.
 */
export const CUSTOM_ICON_WARNING_TEXT = {
  keyColour: (word: string, key: BackgroundKey): string =>
    `“${word}” is the colour of your background key, ${BACKGROUND_KEY_TEXT[key]}, and keying the sheet cuts that colour out of the icon. Name another colour, or choose another key.`,

  lettering: (word: string): string =>
    `“${word}” invites lettering, and the sheet forbids any text, so the generator either leaves it blank or letters it against the rules. Describe a blank or closed object instead.`,

  figure: (word: string): string =>
    `“${word}” puts a person or part of one in the drawing. The sheet draws a hand or figure an entry names, but a hand holding an object crowds a small icon, so the catalogue draws its objects on their own. Tick “Shows a figure” if the icon is meant to show one.`,
} as const;
