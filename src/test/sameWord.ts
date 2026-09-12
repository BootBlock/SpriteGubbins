/**
 * Whether two words are the same word, singular and plural — or a past tense — counted as one.
 *
 * Crude on purpose: every pairing the suites sharing it have to catch differs by an `s`, an `es` or an
 * `-ed`, and a stemmer would be machinery spent on none of them. `stacked layers` against the
 * *Secondary Layer* field is the case `categoryAssembly.test.ts` was written around, and `bands`
 * against `Far band ×2` is the one `sheetPlans/sheetClaims.test.ts` exists for — a generator reads the
 * stem, not the inflection.
 *
 * **Each word is read with every ending taken off, not the longest one.** Stripping the first ending a
 * pattern matches turned `tiles` into `til`, which `tile` never reaches, so a plural whose singular ends
 * in `e` was a different word from it — `tiles`, `pieces`, `frames`. Two words are the same when any
 * reading of one is a reading of the other.
 */
export function sameWord(left: string, right: string): boolean {
  const readings = (word: string): readonly string[] => [
    word,
    word.replace(/s$/, ''),
    word.replace(/es$/, ''),
    word.replace(/ed$/, ''),
  ];
  const ours = readings(left);
  return readings(right).some((reading) => ours.includes(reading));
}
