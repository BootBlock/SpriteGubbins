import { slugify } from './slugify.ts';

/**
 * The filename a downloaded prompt arrives as, from the subject's own name.
 *
 * A folder of these is the deliverable's index — eight sheets of a split rig, or a season's worth of
 * subjects — so `sprite-prompt.md (3)` is the outcome to avoid. The subject is what distinguishes
 * one prompt from another, and it is the only thing the studio holds that a reader would recognise.
 *
 * Lower-cased and reduced to `a-z0-9-` because this crosses a filesystem: a species field is free
 * text and may hold a slash, a colon or a quotation mark, each of which is illegal on at least one
 * platform. That reduction is `slugify`, which the sprite pack's entry names take too — one answer
 * to "this phrase as an identifier", rather than two spellings of one regular expression that could
 * come to disagree about a character. An empty stem — a blank species, or one written entirely in
 * punctuation — falls back to `sprite` rather than producing a file called `-prompt.md`.
 */
export function promptFileName(species: string): string {
  return `${slugify(species) || 'sprite'}-prompt.md`;
}
