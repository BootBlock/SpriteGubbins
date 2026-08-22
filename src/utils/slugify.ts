/**
 * A phrase as an identifier: lower case, hyphen-separated, and safe in a file name.
 *
 * One implementation because the two callers have to agree. `viewsOf` and `atEachYaw` slug the label
 * they are handed so a directional entry's identifier is the same word the inventory calls it, and
 * `componentSlots` slugs the subject's own additional anatomy, which a reader types free-hand and
 * may spell with anything at all — `Demon Horn ×2` reaching a `.zip` entry name unslugged is a file
 * whose name carries a space and a multiplication sign.
 *
 * Every character outside `a–z` and `0–9` becomes a separator, runs of separators collapse, and the
 * ends are trimmed — so a phrase of punctuation alone comes back empty rather than as a string of
 * hyphens, and the caller decides what to do with that. Accented letters go the same way: `façade`
 * slugs to `fa-ade`, which is why the plans spell their labels in plain ASCII rather than relying on
 * this to transliterate.
 *
 * Pure, as everything in this directory is.
 */
export function slugify(phrase: string): string {
  return phrase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
