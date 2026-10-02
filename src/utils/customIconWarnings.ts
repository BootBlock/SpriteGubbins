import { letteringTermIn } from '../constants/categories/letteringMarks.ts';
import { CUSTOM_ICON_WARNING_TEXT } from '../constants/iconCatalogue/customIconWarningText.ts';
import {
  ACRONYM,
  FIGURE_WORDS,
  KEY_COLOUR_WORDS,
  LETTERING_OBJECTS,
  ROLLED,
  SCROLL,
  wordNamed,
} from '../constants/iconCatalogue/iconLookRules.ts';
import type { CustomIconDraft } from '../types/customIconDraft.ts';
import type { BackgroundKey } from '../types/rendering.ts';

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
 * - **The key's colour**, under the background key in force: keying cuts it out of the icon. Pink on a
 *   netrun spell is spared, as in the catalogue, because the line pins the school's pink by hex clear of
 *   every key.
 * - **Lettering**: a word that asks for it, an object that carries it — a dial, a rune, a keypad, an
 *   unrolled scroll — or a capitalised acronym, which a model letters onto the object.
 * - **A person or part of one** on an entry not declaring `figure`.
 *
 * The role, the look and the states are all read, since all three reach the inventory line.
 */
export function customIconWarnings(draft: CustomIconDraft, key: BackgroundKey): readonly string[] {
  const text = [draft.role, draft.look, ...(draft.states ?? [])].join(' ');
  const warnings: string[] = [];

  const spared = draft.kind === 'SPELL' && draft.school === 'NETRUN' ? ['pink'] : [];
  const colour = wordNamed(
    text,
    KEY_COLOUR_WORDS[key].filter((word) => !spared.includes(word)),
  );
  if (colour !== undefined) warnings.push(CUSTOM_ICON_WARNING_TEXT.keyColour(colour, key));

  const lettering = letteringIn(text);
  if (lettering !== undefined) warnings.push(CUSTOM_ICON_WARNING_TEXT.lettering(lettering));

  const figure = FIGURE_WORDS.exec(text)?.[0];
  if (!draft.figure && figure !== undefined) warnings.push(CUSTOM_ICON_WARNING_TEXT.figure(figure));

  return warnings;
}

/** The first word in `text` that asks for lettering or brings it with it, as the reader wrote it. */
function letteringIn(text: string): string | undefined {
  const term = letteringTermIn(text);
  if (term !== undefined) return term;
  const found = LETTERING_OBJECTS.exec(text)?.[0] ?? ACRONYM.exec(text)?.[0];
  if (found !== undefined) return found;
  return ROLLED.test(text) ? undefined : SCROLL.exec(text)?.[0];
}
