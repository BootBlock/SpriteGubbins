import { BACKGROUND_KEY_COLORS } from '../constants/backgroundKeyColors.ts';
import { letteringTermIn } from '../constants/categories/letteringMarks.ts';
import { CUSTOM_ICON_WARNING_TEXT } from '../constants/iconCatalogue/customIconWarningText.ts';
import {
  ACRONYM,
  FIGURE_WORDS,
  HEX_COLOUR,
  KEY_COLOUR_WORDS,
  LETTERING_OBJECTS,
  UNWRITTEN,
  WRITING_SURFACE,
  redCrossIn,
  wordNamed,
} from '../constants/iconCatalogue/iconLookRules.ts';
import type { CustomIconDraft } from '../types/customIconDraft.ts';
import type { BackgroundKey } from '../types/rendering.ts';
import { expandShortHex } from './expandShortHex.ts';
import { fromHex } from './imageData.ts';
import { keyReaches } from './keyReach.ts';

/**
 * What an entry of the reader's own names that the sheet's own rules will overrule, said as warnings —
 * the catalogue's content rules (`iconLookRules.ts`) held against the reader's words.
 *
 * **Warned, never refused, and never rewritten.** Each rule is a word match standing in for a judgement
 * the reader can make better: “black” is a hole on a black key and a fine colour on a white one, the key
 * can change after the entry is saved, a rune may be exactly the carved ornament they want, and a hand
 * may be the point of the icon. So the form names the word and what the prompt does with it, and saves
 * the entry as written. What breaks the output whatever the reader means is `checkCustomIcon`'s, which
 * refuses.
 *
 * - **The key's colour**, under the background key in force: keying cuts it out of the icon. A colour
 *   named in words is matched by name (`KEY_COLOUR_WORDS`), and one written by hex is measured by the
 *   Quantise tab's own test (`keyReaches`), so `#FAFAFA` warns on a white key and `#F97316` does not.
 *   Pink on a netrun spell is spared, as in the catalogue, because the line pins the school's pink by
 *   hex clear of every key.
 * - **Lettering**: a word that asks for it, an object that carries it — a dial, a rune, a keypad — a
 *   writing surface the text does not call blank, closed or rolled, or a capitalised acronym, which a
 *   model letters onto the object. A hex colour is not an acronym, so it is taken out of the text before
 *   the lettering is read.
 * - **A red cross not called diagonal** (`redCrossIn`), which may be drawn as the protected emblem.
 * - **A person or part of one** on an entry not declaring `figure`.
 *
 * The role, the look and the states are all read, since all three reach the inventory line.
 */
export function customIconWarnings(draft: CustomIconDraft, key: BackgroundKey): readonly string[] {
  const text = [draft.role, draft.look, ...(draft.states ?? [])].join(' ');
  const warnings: string[] = [];

  const spared = draft.kind === 'SPELL' && draft.school === 'NETRUN' ? ['pink'] : [];
  const colour =
    wordNamed(
      text,
      KEY_COLOUR_WORDS[key].filter((word) => !spared.includes(word)),
    ) ?? hexWithinReach(text, key);
  if (colour !== undefined) warnings.push(CUSTOM_ICON_WARNING_TEXT.keyColour(colour, key));

  const lettering = letteringIn(text.replaceAll(HEX_COLOUR, ' '));
  if (lettering !== undefined) warnings.push(CUSTOM_ICON_WARNING_TEXT.lettering(lettering));

  // Each part on its own, so a red in the role is not read as the colour of a cross in the look.
  const cross = [draft.role, draft.look, ...(draft.states ?? [])]
    .map(redCrossIn)
    .find((found) => found !== undefined);
  if (cross !== undefined) warnings.push(CUSTOM_ICON_WARNING_TEXT.redCross(cross));

  const figure = FIGURE_WORDS.exec(text)?.[0];
  if (!draft.figure && figure !== undefined) warnings.push(CUSTOM_ICON_WARNING_TEXT.figure(figure));

  return warnings;
}

/**
 * The first hex colour in `text` the key takes with it, as the reader wrote it; a three-digit hex is
 * measured as the six digits it stands for (`expandShortHex`). None on a transparent key, which takes
 * no colour.
 */
function hexWithinReach(text: string, key: BackgroundKey): string | undefined {
  const keyColour = BACKGROUND_KEY_COLORS[key];
  if (keyColour === null) return undefined;
  return [...text.matchAll(HEX_COLOUR)]
    .map(([hex]) => hex)
    .find((hex) => {
      const colour = fromHex(expandShortHex(hex));
      return colour !== null && keyReaches(keyColour, colour);
    });
}

/** The first word in `text` that asks for lettering or brings it with it, as the reader wrote it. */
function letteringIn(text: string): string | undefined {
  const term = letteringTermIn(text);
  if (term !== undefined) return term;
  const found = LETTERING_OBJECTS.exec(text)?.[0] ?? ACRONYM.exec(text)?.[0];
  if (found !== undefined) return found;
  return UNWRITTEN.test(text) ? undefined : WRITING_SURFACE.exec(text)?.[0];
}
