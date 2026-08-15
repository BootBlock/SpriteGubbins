import type { StyleReference } from '../../types/styleReference.ts';

/**
 * The block a chosen art direction reference adds to section 2 of the prompt.
 *
 * Composed rather than looked up, exactly as `describeHardware` is and for the same reason: the list
 * belongs to the reference, so a fixed map keyed by id would be the same sentences written down
 * twice. The name is not assembled here at all — the template carries it in its own conditional
 * sentence, because whether the game is named is the reader's switch rather than a property of the
 * look. See `nameStyleReference` in `ImageOutputConfig`.
 */

/** The look's characteristics, one per line, as the template's bullet list. */
export function describeStyleReference(reference: StyleReference): string {
  return reference.characteristics.map((characteristic) => `- ${characteristic}`).join('\n');
}
