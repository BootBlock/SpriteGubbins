/**
 * Read back every vendor page a comment under `src/` cites, and report each quotation in that
 * comment that none of its pages carries any longer.
 *
 *   npm run check:vendor-quotes
 *
 * Almost everything this app says about another company's product is a quotation in a comment
 * beside a URL, and nothing else ever reads those pages again. When a vendor edits a page the
 * quotation stays, and it is false from that day until somebody happens to re-read the page. That
 * happened to the ChatGPT target three times, once a sentence that had already been rewritten
 * twice. The offline citation suites under `tests/` check hosts, names and section numbers; this is
 * the half they cannot reach. Run it before changing a target model, and from time to time.
 *
 * **It is a script and not a test, deliberately.** It needs the network, and a vendor page changes
 * without notice, so a test built on it would fail unrelated work on the day a vendor rewords a
 * sentence. The app makes no outbound request, and nothing here ships in it.
 *
 * What it reads is the app's own source and nothing else: `docs/todo/` holds the record of what a
 * page said when a plan was written, which is evidence and is never rewritten, and tests quote
 * placeholder pages on purpose. A quotation that is not meant to be on its run's pages — one quoting
 * a sentence a page used to carry, or this app's own wording — is listed with its reason in
 * `quotedFromElsewhere.ts`.
 *
 * Prints every page that failed to load and every quotation not found, then exits 1, or exits 0
 * when there is nothing to report. A failure on one run is not proof the page is gone: a vendor's
 * front end may refuse one client on one day, which is why a failure is reported with its status,
 * and a quotation its run's failed page might carry is reported as unchecked rather than missing.
 */
import { citedQuotations, type CitedQuotation } from './citedQuotations.ts';
import { comparableWords } from './comparableWords.ts';
import { fetchableUrl, fetchPage, type FetchedPage } from './fetchPage.ts';
import { judgeQuotations, type ReadPage } from './judgeQuotations.ts';
import { pageText } from './pageText.ts';
import { QUOTED_FROM_ELSEWHERE } from './quotedFromElsewhere.ts';
import { appMarkup } from './sourceFiles.ts';

/** How many pages are fetched at once: enough to finish in seconds, few enough to look like a reader. */
const CONCURRENCY = 6;

/** Fetch every one of `urls`, {@link CONCURRENCY} at a time. */
async function fetchAll(urls: readonly string[]): Promise<Map<string, FetchedPage>> {
  const fetched = new Map<string, FetchedPage>();
  const queue = [...urls];
  const worker = async (): Promise<void> => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      fetched.set(url, await fetchPage(url));
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return fetched;
}

/** Whether a fetched page is one this check can read. */
function loaded(page: FetchedPage): boolean {
  return page.status !== null && page.status >= 200 && page.status < 300;
}

/** One quotation as a report line: where its comment starts, and the start of what it quotes. */
function located({ file, line, quotation }: CitedQuotation): string {
  const shown = quotation.length > 110 ? `${quotation.slice(0, 109)}…` : quotation;
  return `  ${file}:${String(line)}  “${shown}”`;
}

const quotations = citedQuotations(appMarkup());
const urls = [...new Set(quotations.flatMap(({ urls: cited }) => cited))];
const fetched = await fetchAll(urls);

const pages = new Map<string, ReadPage>(
  [...fetched].map(([url, page]) => [
    url,
    { words: loaded(page) ? comparableWords(pageText(page.body)) : null },
  ]),
);
const { missing, unchecked, unneeded } = judgeQuotations(quotations, pages, QUOTED_FROM_ELSEWHERE);
const failed = [...fetched].filter(([, page]) => !loaded(page));

for (const [url, page] of failed) {
  console.log(
    `Could not read ${url}: ${page.status === null ? (page.error ?? 'no response') : `HTTP ${String(page.status)}`}`,
  );
}
if (missing.length > 0) {
  console.log(`\n${String(missing.length)} quotations are on none of the pages their comment cites:`);
  for (const cited of missing) {
    console.log(located(cited));
    for (const url of cited.urls) {
      const page = fetched.get(url);
      const moved =
        page !== undefined && page.finalUrl !== fetchableUrl(url).replace(/#.*/, '')
          ? ` → ${page.finalUrl}`
          : '';
      console.log(`      ${url}${moved}`);
    }
  }
}
if (unchecked.length > 0) {
  console.log(`
${String(unchecked.length)} quotations could not be checked, because a page they cite did not load:`);
  for (const cited of unchecked) console.log(located(cited));
}
if (unneeded.length > 0) {
  console.log(`\n${String(unneeded.length)} entries in quotedFromElsewhere.ts are on a cited page now:`);
  for (const cited of unneeded) console.log(located(cited));
}

console.log(
  `\nChecked ${String(quotations.length)} quotations against ${String(urls.length)} pages: ` +
    `${String(failed.length)} unreadable, ${String(missing.length)} missing, ` +
    `${String(unchecked.length)} unchecked, ${String(unneeded.length)} unneeded.`,
);
process.exitCode = failed.length + missing.length + unneeded.length > 0 ? 1 : 0;
