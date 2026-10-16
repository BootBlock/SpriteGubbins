import { CUSTOM_ICON_LIMITS } from '../constants/iconCatalogue/customIconLimits.ts';
import { CUSTOM_ICON_REFUSALS } from '../constants/iconCatalogue/customIconRefusals.ts';
import type { CustomIconText } from '../constants/iconCatalogue/customIconRefusals.ts';
import { COUNT_MARKER, LINE_SEPARATOR } from '../constants/iconCatalogue/iconLookRules.ts';
import type { CustomIconField, CustomIconRefusal } from '../types/customIconDraft.ts';

/**
 * The rules every text of an entry of the reader's own is held to on its own, whichever field it is:
 * shared by `checkCustomIcon` and the family's check (`checkIconVariants`), so a variant's name is held
 * to exactly what a state is, and its phrase to what a look is.
 */

/** A text with every run of whitespace, line breaks included, made one space, and its ends trimmed. */
export function collapsed(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}

/**
 * A text with the punctuation it ends on taken off — the full stop, comma, semicolon, colon, question or
 * exclamation mark or ellipsis a reader closes a phrase with — since the line it joins supplies its own.
 */
export function unclosed(text: string): string {
  return text.replace(/[\s.,;:!?…]+$/u, '');
}

/**
 * The refusals any one text earns on its own: its length, its brackets, a count, and a long dash in
 * anything but the look, which is the one text that follows the line's own dash.
 */
export function textRefusals(
  field: CustomIconField,
  text: string,
  what: CustomIconText,
): readonly CustomIconRefusal[] {
  const found: CustomIconRefusal[] = [];
  if (text.length > CUSTOM_ICON_LIMITS[what]) {
    found.push({ field, message: CUSTOM_ICON_REFUSALS.tooLong(what, text.length) });
  }
  if (/[[\]]/.test(text)) found.push({ field, message: CUSTOM_ICON_REFUSALS.brackets(what) });
  if (COUNT_MARKER.test(text)) found.push({ field, message: CUSTOM_ICON_REFUSALS.countMarker(what) });
  if (what !== 'look' && LINE_SEPARATOR.test(text)) {
    found.push({ field, message: CUSTOM_ICON_REFUSALS.separator(what) });
  }
  return found;
}

/**
 * The refusals a text that names a slot earns as typed — a role, a state or a variant's name — and a
 * count its slug alone shows: the slug is the slot and file name, and a state's or a variant's is what
 * is stored and read back, so dropping a letter the slug cannot hold must not leave a count the check
 * would refuse on reload (`éx5` is stored as `x5`).
 */
export function namedRefusals(
  field: CustomIconField,
  text: string,
  slug: string,
  what: 'role' | 'state' | 'variantName',
): readonly CustomIconRefusal[] {
  const found = textRefusals(field, text, what);
  const counted = found.some((refusal) => refusal.message === CUSTOM_ICON_REFUSALS.countMarker(what));
  return counted || !COUNT_MARKER.test(slug)
    ? found
    : [...found, { field, message: CUSTOM_ICON_REFUSALS.countMarker(what) }];
}
