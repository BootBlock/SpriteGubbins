import { presetCollectionLabel, presetCollectionOf } from '../constants/presets/collections.ts';
import type { PresetCollectionId } from '../constants/presets/collections.ts';
import type { PresetArchetype } from '../types/preset.ts';
import { SUBJECT_FIELD_KEYS } from '../types/subject.ts';

/**
 * Searching the preset library, as a pure function of the library and the query.
 *
 * The library is indexed **once** and matched **per keystroke**, and that split is the whole design:
 * building the text a query is compared against means walking every field of every preset, while
 * answering a query means one `includes` per entry against a string that is already lower-cased and
 * already flattened. The caller memoises the index on the collection and the match on the query, so a
 * keystroke costs one pass over about fifty short strings.
 *
 * Matching returns *the same entry objects* the index holds, filtered — never rebuilt. What preserves a
 * surviving card's DOM node is its `key`, which is the preset's id (see `PresetCollectionPanel`); what
 * this adds is that the props behind that key are referentially identical too, so the card has nothing
 * to re-render even in principle, and its hue-wheel stop cannot shift as the query moves.
 */

/** One preset, with everything the library view needs to place, colour and match it. */
export interface PresetEntry {
  readonly preset: PresetArchetype;
  readonly collection: PresetCollectionId;
  /**
   * Position in the whole library, which fixes this preset's stop on the hue wheel.
   *
   * Deliberately the position *before* filtering. A card that changed colour as the user typed would
   * make the wheel look like a status signal rather than an allocation, and the point of giving each
   * preset a stop is that it keeps the same one wherever it is seen.
   */
  readonly index: number;
  /** Everything a query is compared against: normalised, flattened, and computed once. */
  readonly haystack: string;
}

/**
 * Lower-cased, with every run of non-alphanumeric characters collapsed to a single space.
 *
 * Applied to both sides, which is what makes the identifiers searchable in the words a user would
 * actually type: `TRUE_ISOMETRIC` becomes `true isometric`, so "isometric" finds it, and a query typed
 * as `pixel_art`, `PIXEL ART` or `pixel-art` all normalise to the same two terms. Matching the raw
 * identifiers instead would mean the underscore had to be typed, and matching only the display labels
 * would mean the term the prompt is written against — the one a user comparing two generations has in
 * front of them — found nothing.
 */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * The searchable text for one preset.
 *
 * The output configuration is read by *walking its values* rather than by naming the interesting
 * fields. Every string in there is a term the prompt is written against, so an output setting added to
 * the app becomes searchable without a second edit here — and the alternative, a hand-kept list of
 * keys, is the copy that silently stops covering the thing it names. Numbers and booleans are skipped
 * because neither is something anyone types into a search box.
 */
function haystackFor(preset: PresetArchetype, collection: PresetCollectionId): string {
  const subject = SUBJECT_FIELD_KEYS.map((key) => preset.subject[key]);
  const output = Object.values(preset.output).filter((value): value is string => typeof value === 'string');

  return normalise(
    [preset.name, preset.category, presetCollectionLabel(collection), ...subject, ...output].join(' '),
  );
}

/** Index the library for searching. Call once per library, not once per keystroke. */
export function indexPresetLibrary(presets: readonly PresetArchetype[]): readonly PresetEntry[] {
  return presets.map((preset, index) => {
    const collection = presetCollectionOf(preset);
    return { preset, collection, index, haystack: haystackFor(preset, collection) };
  });
}

/**
 * The entries matching `query` — every term of it, in any order and any position.
 *
 * Every term rather than any, so a query narrows as it grows: "iso rig" is the isometric rig and not
 * everything isometric plus everything rigged. Substrings rather than whole words, because the terms
 * being searched are half identifier — someone looking for the tileset presets types "tile", and
 * `TILESET_MODULAR` is not a word boundary away from it.
 *
 * An empty query returns the array it was given, unchanged and by reference, so the un-filtered list is
 * not a new array on every render.
 */
export function matchPresetEntries(entries: readonly PresetEntry[], query: string): readonly PresetEntry[] {
  const terms = normalise(query).split(' ').filter(Boolean);
  if (terms.length === 0) return entries;

  return entries.filter((entry) => terms.every((term) => entry.haystack.includes(term)));
}

/** How many of `entries` fall in each collection. Collections with no entries are absent. */
export function countByCollection(entries: readonly PresetEntry[]): ReadonlyMap<PresetCollectionId, number> {
  const counts = new Map<PresetCollectionId, number>();
  for (const entry of entries) counts.set(entry.collection, (counts.get(entry.collection) ?? 0) + 1);
  return counts;
}
