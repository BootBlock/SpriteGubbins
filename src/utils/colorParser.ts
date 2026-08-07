import { COLOR_HEX_MAP } from '../constants/colors.ts';

/**
 * Find a colour in free text, so a swatch can be shown beside a colour field.
 *
 * Users type things like `Matte Charcoal Black & Gunmetal` or `Cyan Neon #06B6D4`, and either
 * form should preview. An explicit hex always wins over a name — if someone has gone to the
 * trouble of writing `#06B6D4`, that is the colour they mean, whatever words surround it.
 *
 * Returns `null` when nothing matches, which is the common case for non-colour fields; callers
 * render no swatch at all rather than a fallback colour, because a wrong swatch is worse than
 * none.
 *
 * Name matching is a plain substring scan in `COLOR_HEX_MAP` order, carried over unchanged from
 * the application being migrated. That has two visible quirks — earlier names shadow later ones
 * ("Plasma Cyan" resolves to plain cyan) and names match inside words ("Titanium" contains
 * "tan") — which are documented on the map itself and pinned by this module's tests. They are
 * preserved deliberately: the map is the vocabulary users' saved presets were written against.
 */
export function parseColorFromText(text: string): string | null {
  if (!text) return null;

  // 6-digit first: with 3 alternatives listed second, `#06b6d4` would otherwise match `#06b`.
  const hexMatch = text.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/);
  if (hexMatch) return hexMatch[0];

  const lower = text.toLowerCase();
  for (const [name, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (lower.includes(name)) return hex;
  }
  return null;
}
