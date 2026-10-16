import type { CitedQuotation } from './citedQuotations.ts';
import { quotationFound } from './quotationFound.ts';

/** One cited page as the judgement needs it: whether it loaded, and its words if it did. */
export interface ReadPage {
  /** The page's text as `comparableWords` reduced it, or `null` when the page did not load. */
  readonly words: string | null;
}

/** What {@link judgeQuotations} found wrong. */
export interface QuotationVerdict {
  /** Quotations no loaded page in their run carries, and that the list does not excuse. */
  readonly missing: readonly CitedQuotation[];
  /** Listed quotations that a page in their run now carries, so the entry excuses nothing. */
  readonly unneeded: readonly CitedQuotation[];
}

/**
 * Check each quotation against the pages its own run cites, as `pages` holds them by URL.
 *
 * A quotation is checked against the pages that loaded. When none of them carries it, it is missing
 * whether or not another URL in the run failed: a failed page cannot vouch for anything, and the
 * failure is reported on its own beside the miss.
 *
 * `quotedFromElsewhere` names the quotations that are deliberately on none of their run's pages,
 * with the reason. A listed quotation that a page does carry is reported as well, since an entry
 * that excuses nothing would also excuse the next real miss of the same words.
 */
export function judgeQuotations(
  quotations: readonly CitedQuotation[],
  pages: ReadonlyMap<string, ReadPage>,
  quotedFromElsewhere: Readonly<Record<string, string>>,
): QuotationVerdict {
  const missing: CitedQuotation[] = [];
  const unneeded: CitedQuotation[] = [];

  for (const cited of quotations) {
    const loaded = cited.urls.flatMap((url) => pages.get(url)?.words ?? []);
    const found = quotationFound(cited.quotation, loaded);
    const listed = Object.hasOwn(quotedFromElsewhere, cited.quotation);
    if (found && listed) unneeded.push(cited);
    if (!found && !listed) missing.push(cited);
  }

  return { missing, unneeded };
}
