import { COLOR_HEX_MAP } from '../constants/colors.ts';

/**
 * Inflections a colour name can carry and still name that colour — `rust` also matches "rusty",
 * "rusted" and "rusting", `silver` also matches "silvery".
 *
 * Deliberately short. Each addition is a chance to match something that isn't a colour, and the
 * cost of missing one is a missing swatch, while the cost of a wrong one is a swatch that lies.
 */
const INFLECTIONS = '(?:y|ed|ing|s)?';

/** Escape a map key so it can be embedded in a regular expression. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Where `name` appears in `text` as a whole word, or -1.
 *
 * The boundary assertions are what stop `tan` matching inside "Ti**tan**ium" and "**Tan**k", or
 * `red` inside "Armou**red**" and "Weathe**red**" — all of which previously painted a confidently
 * wrong swatch. `text` is already lower-cased, so only `[a-z0-9]` can be a word character here.
 */
function indexOfColorName(text: string, name: string): number {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeForRegExp(name)}${INFLECTIONS}(?![a-z0-9])`);
  return pattern.exec(text)?.index ?? -1;
}

/**
 * Find a colour in free text, so a swatch can be shown beside a colour field.
 *
 * Users type things like `Matte Charcoal Black & Gunmetal` or `Cyan Neon #06B6D4`, and either
 * form should preview. An explicit hex always wins over a name — if someone has gone to the
 * trouble of writing `#06B6D4`, that is the colour they mean, whatever words surround it.
 *
 * Among names, the **first one mentioned** wins, because these fields are written most-important
 * first ("Deep Obsidian & Gold" is chiefly obsidian). A longer name beats a shorter one starting
 * at the same position, which keeps the result well-defined whatever gets added to
 * `COLOR_HEX_MAP` later.
 *
 * Returns `null` when nothing matches — the common case for non-colour fields, and also for text
 * whose only colour word is buried inside another word. Callers render no swatch at all rather
 * than a fallback, because a wrong swatch is worse than none.
 */
export function parseColorFromText(text: string): string | null {
  if (!text) return null;

  // 6-digit first: with 3 alternatives listed second, `#06b6d4` would otherwise match `#06b`.
  const hexMatch = text.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/);
  if (hexMatch) return hexMatch[0];

  const lower = text.toLowerCase();
  let bestIndex = Number.POSITIVE_INFINITY;
  let bestLength = 0;
  let bestHex: string | null = null;

  for (const [name, hex] of Object.entries(COLOR_HEX_MAP)) {
    const index = indexOfColorName(lower, name);
    if (index === -1) continue;
    if (index < bestIndex || (index === bestIndex && name.length > bestLength)) {
      bestIndex = index;
      bestLength = name.length;
      bestHex = hex;
    }
  }

  return bestHex;
}
