/**
 * A text reduced to its words, lower-cased and separated by single spaces, with a space at each end
 * so that one reduction can be searched for inside another on whole words only.
 *
 * **Punctuation, markup and case are not compared, and that is the point.** A comment quotes a page
 * with its own conventions laid over the vendor's: backticks around a model id, `**` for emphasis,
 * a typographic `’` where the page has `'`. The page side has worse: an inline `<code>` element
 * becomes a space before the comma that follows it once the markup is stripped. What is left after
 * all of that is the sequence of words, and a vendor rewording a sentence changes that sequence.
 * NFKC folds the compatibility forms a page may use for a letter or a digit into the plain one.
 */
export function comparableWords(text: string): string {
  const words =
    text
      .normalize('NFKC')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? [];
  return ` ${words.join(' ')} `;
}
