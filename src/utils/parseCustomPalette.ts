import { CUSTOM_PALETTE_NAME_LIMIT } from '../constants/customPalette.ts';
import type { CustomPalette } from '../types/customPalette.ts';
import { fromHex, toHex } from './imageData.ts';
import { MAX_PALETTE_ENTRIES } from './pngPalette.ts';

/**
 * What a custom palette has to be, wherever one arrives from.
 *
 * Every set of colours that reaches `OutputConfig.customPalette` comes through here: the studio's
 * own intake, which has just read a file or a paste, and the storage layer, which is handed whatever
 * a database row holds. One gate rather than two, so a palette restored from a preset is the same
 * object the reader loaded and neither route can admit something the other would refuse.
 *
 * **Renaming a loaded palette does not pass through it**, and that is the division rather than a
 * hole: the question here is which *colours* may be pinned, and a name the reader is typing is not a
 * colour. Trimming it on the way past would be a control that fights back. `useCustomPaletteIntake`
 * owns that route and says so at it.
 *
 * **It answers `null` rather than repairing.** An empty list is not a palette, and a list past the
 * ceiling is not one either — keeping the first 256 of 900 colours would pin a palette nobody chose
 * while the studio said it was theirs. The studio's intake reports the count before it gets here and
 * offers to reduce the image instead, which is the same choice made deliberately.
 *
 * Pure, as everything in this directory is. `parseRigContract` beside it is the same shape of reader
 * for the other file the studio takes in.
 */
export function parseCustomPalette(value: unknown): CustomPalette | null {
  if (typeof value !== 'object' || value === null) return null;

  const source: Record<string, unknown> = { ...value };
  const stated = typeof source['name'] === 'string' ? source['name'].trim() : '';
  const entries = colorsIn(source['entries']);

  if (entries === null) return null;
  // A nameless palette stays nameless here. What it is *called* with no name is a question only the
  // prompt asks, and `pinnedPalette` answers it there — so the stored value is what the reader
  // typed, and emptying the name field is not a control that fights back. The cap is this layer's,
  // because a `.gpl` header is free text a writing tool may have filled with a path or a sentence.
  return { name: stated.slice(0, CUSTOM_PALETTE_NAME_LIMIT), entries };
}

/**
 * The colours in a stored list, or `null` where there is no usable palette in it.
 *
 * Deduplicated and re-spelled through `toHex`, so the entries read the way every other colour in the
 * app is written whatever spelling the file used. Order is the list's own, because it is the
 * author's: see {@link CustomPalette}.
 *
 * An entry that is not a colour drops out rather than failing the whole palette — a single mangled
 * line in a file the reader has otherwise read correctly should not lose them the other forty — but
 * a list with nothing left in it is `null`, because a pinned palette of no colours would be a claim
 * the quantiser could not honour and the prompt could not state.
 */
function colorsIn(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null;

  const seen = new Set<string>();
  for (const entry of value) {
    const color = typeof entry === 'string' ? fromHex(entry) : null;
    if (color !== null) seen.add(toHex(color));
  }

  return seen.size === 0 || seen.size > MAX_PALETTE_ENTRIES ? null : [...seen];
}
