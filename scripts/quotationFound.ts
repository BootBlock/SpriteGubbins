import { comparableWords } from './comparableWords.ts';

/** An elision inside a quotation: an ellipsis, three full stops, or either in square brackets. */
const ELISION = /\[?(?:…|\.\.\.)\]?/;

/**
 * Whether one of `pages` carries `quotation`, each page given as {@link comparableWords} reduced it.
 *
 * A quotation that elides part of a sentence is found when every part it keeps is on the same page.
 * One page, because a quotation comes from one place: parts found on two different pages are a
 * sentence nobody published. A quotation with no words in it — `"…"` — is found trivially, since
 * there is nothing in it that could go stale.
 */
export function quotationFound(quotation: string, pages: readonly string[]): boolean {
  const parts = quotation
    .split(ELISION)
    .map(comparableWords)
    .filter((part) => part.trim() !== '');
  return parts.length === 0 || pages.some((page) => parts.every((part) => page.includes(part)));
}
