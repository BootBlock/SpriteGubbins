import {
  ENDERS,
  IRREGULAR_PARTICIPLES,
  PARTICIPLE_SPELLED_NOUNS,
  PARTICLES,
  PREPOSITIONS,
  QUANTITIES,
  STATES,
} from './lookObjectWords.ts';

/**
 * The object a catalogue look is drawn as — its head noun — read off the look's words: `injector` from
 * “a slim red stim-pack auto-injector, needle capped, …”, `sabre` from “a pair of crossed steel sabres
 * with gold hilts”.
 *
 * **What the silhouette check compares** (audit findings C1 and C2). A player tells an action bar's
 * icons apart by outline before hue, and a red–green colour-blind player by outline alone, so two
 * entries of one shelf drawn as one object in two colours fail them. Every look is written to one
 * grammar — an article, the object's modifiers, the object, then what it carries or does — so the object
 * is the last word before the first comma, preposition or trailing clause, taken from its last hyphen
 * part and in the singular.
 *
 * A participle ends the object only where a clause follows it (“a pod releasing a ring”, “a joint
 * clamped in a vice”, “a mask painted red”), so one that modifies the noun after it (“a small wrapped
 * parcel”) is read as a modifier. A noun spelled like a participle — a ring, a bed — is listed. The
 * reading is a guard, not a parser: `iconCatalogue.test.ts` shows it on each case it decides.
 */
export function lookObject(look: string): string {
  const words = (look.replace(/^an? /u, '').split(',')[0] ?? '').split(/\s+/u).filter((word) => word !== '');
  if (words.length === 0) throw new Error(`No object in “${look}”`);
  return objectOf(words);
}

/** The object of a phrase's words, reading past a quantity (“a short stack of coins”) to what it counts. */
function objectOf(words: readonly string[]): string {
  const end = words.findIndex((word, at) => at > 0 && endsTheObject(word, words[at + 1], words[at + 2]));
  const object = singular(((end === -1 ? words : words.slice(0, end)).at(-1) ?? '').split('-').at(-1) ?? '');
  const rest = words.slice(end + 1);
  return end !== -1 && words[end] === 'of' && QUANTITIES.has(object) && rest.length > 0
    ? objectOf(rest)
    : object;
}

/** Whether a word is a participle rather than a noun spelled like one. */
function isParticiple(word: string): boolean {
  if (word.includes('-') || PARTICIPLE_SPELLED_NOUNS.has(word)) return false;
  return /(?:ing|ed)$/u.test(word) || IRREGULAR_PARTICIPLES.has(word);
}

/** Whether `word`, followed by `next` and `after`, is where the object's own words stop. */
function endsTheObject(word: string, next: string | undefined, after: string | undefined): boolean {
  if (PREPOSITIONS.has(word) || ENDERS.has(word)) return true;
  // An adverb ending in -ly, before the participle it qualifies: “a bolt slowly dissolving”.
  if (word.endsWith('ly') && next !== undefined && isParticiple(next)) return true;
  if (!isParticiple(word)) return false;
  if (next === undefined || ENDERS.has(next) || PREPOSITIONS.has(next) || PARTICLES.has(next)) return true;
  if (/^\w+(?:ly|wards?)$/u.test(next) || next.startsWith('mid-')) return true;
  // A hyphenated state, “cross-legged” or “point-down”, and a closing colour, “painted red”.
  const last = next.split('-').at(-1) ?? next;
  if (next.includes('-') && (last.endsWith('ed') || PARTICLES.has(last))) return true;
  return STATES.test(next) && (after === undefined || PREPOSITIONS.has(after) || ENDERS.has(after));
}

/** A plural object named in the singular, so “sabres” and “sabre” are one object. */
function singular(word: string): string {
  if (/(?:ss|us|is)$/u.test(word)) return word;
  if (/(?:ches|shes|xes)$/u.test(word)) return word.slice(0, -2);
  return word.replace(/s$/u, '');
}
