import type { CitedQuotation } from './citedQuotations.ts';
import { quotationFound } from './quotationFound.ts';

/** One cited page as the judgement needs it: whether it loaded, and its words if it did. */
export interface ReadPage {
  /** The page's text as `comparableWords` reduced it, or `null` when the page did not load. */
  readonly words: string | null;
}

/** What {@link judgeQuotations} found wrong. */
export interface QuotationVerdict {
  /** Quotations no page in their run carries, every page having loaded, that the list does not excuse. */
  readonly missing: readonly CitedQuotation[];
  /** Quotations no loaded page carries while another page in the run did not load, so unsettled. */
  readonly unchecked: readonly CitedQuotation[];
  /** Listed quotations that a page in their run now carries, so the entry excuses nothing. */
  readonly unneeded: readonly CitedQuotation[];
}

/**
 * Check each quotation against the pages its own run cites, as `pages` holds them by URL.
 *
 * A quotation one loaded page carries is found. One that no page carries is missing only when every
 * page in its run loaded. While a page in the run did not load, the quotation may be on that page,
 * so it is unchecked rather than missing: a vendor's front end refusing one client on one day must
 * not read as a stale quotation.
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
  const unchecked: CitedQuotation[] = [];
  const unneeded: CitedQuotation[] = [];

  for (const cited of quotations) {
    const loaded = cited.urls.flatMap((url) => pages.get(url)?.words ?? []);
    const found = quotationFound(cited.quotation, loaded);
    const listed = Object.hasOwn(quotedFromElsewhere, cited.quotation);
    if (found && listed) unneeded.push(cited);
    else if (!found && !listed) (loaded.length === cited.urls.length ? missing : unchecked).push(cited);
  }

  return { missing, unchecked, unneeded };
}
