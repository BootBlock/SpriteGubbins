import { relative } from 'node:path';

import { citedUrls } from './citedUrls.ts';
import { commentRuns } from './commentRuns.ts';
import { quotationsIn } from './quotationsIn.ts';
import { sourceText } from './sourceFiles.ts';

/** One quotation in a comment, and the URLs the same comment run cites as its evidence. */
export interface CitedQuotation {
  /** The file, relative to the root and written with `/`. */
  readonly file: string;
  /** The 1-based line the comment run starts on. */
  readonly line: number;
  readonly quotation: string;
  readonly urls: readonly string[];
}

/**
 * Every quotation in a comment run of `files` that cites at least one URL, paired with those URLs.
 *
 * **The run is the unit, for the reason `commentRuns` gives**: it is one entry's own argument, so a
 * quotation is checked against the pages its own comment cites and never against a URL from the
 * entry above. A quotation in a run that cites nothing has no page to be checked against, and is
 * left out.
 */
export function citedQuotations(files: readonly string[]): CitedQuotation[] {
  return files.flatMap((path) => {
    const file = relative(process.cwd(), path).replaceAll('\\', '/');
    return commentRuns(sourceText(path)).flatMap(({ line, prose }) => {
      const urls = citedUrls(prose);
      if (urls.length === 0) return [];
      return quotationsIn(prose).map((quotation) => ({ file, line, quotation, urls }));
    });
  });
}
