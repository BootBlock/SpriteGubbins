import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { scannableSources } from '../scripts/sourceFiles.ts';

/**
 * Hosts that publish a machine-generated reading of a public repository, and may not be cited as
 * though they were one.
 *
 * Almost every claim this app makes about somebody else's product is a URL in a comment, and
 * `constants/models.ts` says so where `TARGET_MODELS` opens: each capability and ceiling carries its
 * source. Nothing has ever read those back, so the one way a citation fails silently is by naming a
 * page that is not the evidence the sentence beside it claims — and that is what happened. The
 * `FLUX` entry's note read “Black Forest Labs’ own FLUX.2 inference code” while its only URL was a
 * deepwiki page. The figure turned out to be right, which is exactly the problem: nothing about the
 * citation being second-hand was visible, and a note asserting a primary source made it less so.
 *
 * These hosts are banned rather than discouraged because of what they are — a model's summary of a
 * repository anyone can fetch. Citing one asserts the code while showing something else's reading of
 * it, and that reading can be wrong in a way no reader of this repository could catch. Cite the file
 * instead, as `github.com/<owner>/<repo>/blob/<ref>/<path>`, which is no harder to write and is the
 * thing the claim is about.
 *
 * **This is not a rule against third-party sources.** The Seedream entry cites fal deliberately and
 * at length, because fal host the model and ByteDance publish nothing equivalent — and that comment
 * says in words that it is not a vendor statement, which is all this repository asks of a
 * second-hand source. A host joining this list has to fail a different test from that one: it has to
 * be a generated substitute for a primary source that is itself public.
 */
const GENERATED_WIKIS = ['deepwiki.com', 'zread.ai'];

/** The file's path from the project root, in the spelling the failure message should print. */
function sourcePath(file: string): string {
  return relative(process.cwd(), file).replaceAll('\\', '/');
}

describe('where the app’s claims about other products are cited from', () => {
  it.each(GENERATED_WIKIS)('nothing under src/ cites %s', (host) => {
    const citing = scannableSources()
      .filter((file) => readFileSync(file, 'utf8').includes(host))
      .map(sourcePath);

    expect(
      citing,
      `${host} reads a repository rather than being one. Cite the file on github.com that the ` +
        `claim is actually about.`,
    ).toEqual([]);
  });

  // **What this cannot check is whether a cited page says what the sentence beside it says**, which
  // is the other half of the same defect and the half that took someone reading the page to find:
  // Black Forest Labs' prompting guide is titled for FLUX.2 [pro] and [max], and both Flux entries
  // had stretched it over the open weights as well. No sweep can catch that. What those entries do
  // instead is state the scope in the comment — the guide's own title, and which of the claims are
  // this app's reading of an unscoped page — so the next reader is checking a stated claim rather
  // than reconstructing one.
});
