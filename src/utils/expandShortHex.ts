/**
 * A three-digit hex colour written out as the six digits it stands for — `#F0A` as `#FF00AA` — and
 * any other text returned as it is.
 *
 * `fromHex` reads `#RRGGBB` and nothing else, so a caller that accepts the CSS shorthand says so here,
 * where the leniency is applied, rather than `fromHex` growing a second spelling for every caller. The
 * reader's own words are the case: a custom icon's look may write `#FFF`, and the key-colour warning
 * measures it as `#FFFFFF`.
 */
export function expandShortHex(hex: string): string {
  return /^#[0-9a-f]{3}$/iu.test(hex) ? hex.replaceAll(/[0-9a-f]/giu, '$&$&') : hex;
}
