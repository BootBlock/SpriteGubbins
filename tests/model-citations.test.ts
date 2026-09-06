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
 *
 * **The sweep stops at `src/`, and the one file outside it that still carries such a link is why.**
 * `docs/todo/baseline-prompt-new.md` records the change that first wrote the deepwiki citation, and
 * a plan's record of what it did is evidence — CLAUDE.md forbids rewriting one to match current
 * practice. So the correction is written beside it rather than over it, which leaves the retired URL
 * in the document on purpose. Widening this walk to `docs/` would fail on exactly the thing that is
 * supposed to still be there.
 */
const GENERATED_WIKIS = ['deepwiki.com', 'zread.ai'];

/** The file's path from the project root, in the spelling the failure message should print. */
function sourcePath(file: string): string {
  return relative(process.cwd(), file).replaceAll('\\', '/');
}

/**
 * Every contiguous run of comment prose in a module — one docblock, or one unbroken block of `//`
 * lines, blank comment lines included.
 *
 * **Deliberately the whole run rather than the paragraph inside it**, and that was measured rather
 * than assumed. A paragraph-scoped version of the check below passes or fails on whether the author
 * left a bare `//` before the closing URL, which is a formatting choice this repository makes both
 * ways — and Prettier will insert one. Reformatting a comment must not change what a guard says
 * about it. The run is the smallest unit that is stable against that and still narrow enough to
 * mean something: it is one entry's own argument, so a URL from the entry above cannot satisfy it.
 */
function commentRuns(source: string): string[] {
  return [
    ...[...source.matchAll(/\/\*[\s\S]*?\*\//g)].map((match) => match[0]),
    ...[...source.matchAll(/(?:^|\n)(?:[ \t]*\/\/[^\n]*\n?)+/g)].map((match) => match[0]),
  ];
}

/** The first line with anything on it, for a failure message that names the comment. */
function firstLine(run: string): string {
  const line = run
    .split('\n')
    .map((entry) => entry.replace(/^[ \t]*(?:\*|\/\/)[ \t]?/, '').trim())
    .find(Boolean);

  return (line ?? '').slice(0, 95);
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
  //
  // **One corner of it is checkable, and the rule below is that corner.** Two rounds of findings
  // (issues #228 and #232) went past the sweep above, and re-reading them for a shape a test could
  // hold turned up exactly one. Three candidates were measured against the tree before this was
  // written, and the two that were rejected are recorded here so a third round starts from the
  // measurement rather than repeating it:
  //
  // - **"A quoted sentence must carry a URL in its own paragraph"** reports 18 of the 39 quoted
  //   paragraphs in `models.ts` and `modelWrapperText/`, and nearly all 18 are correct as written —
  //   a docblock legitimately quotes a page it cited three paragraphs above, and each wrapper file
  //   carries a Sources list at the end. It would also have caught **none** of #228's three sites,
  //   because every one of them *had* a URL in the paragraph. It was the wrong URL, which is the
  //   thing no offline check can see.
  // - **"A negative claim must carry the date it was checked"** has the better argument — an
  //   absence decays without anything here changing, so it is the half that rots fastest — and it
  //   fails on its trigger. Matching prose for an asserted absence catches 8 paragraphs and cannot
  //   tell "the page does not state X" from "there is no page to cite", which the Stable Diffusion
  //   entry says and which is not a claim about any page's contents. A date would also only make
  //   staleness visible rather than catching it. Left undone deliberately.
  it('cites a repository when it claims a repository', () => {
    // **The one shape that is mechanical: a comment that names somebody else's source file as its
    // evidence, beside a URL that is not that repository.** This is `GENERATED_WIKIS` above
    // generalised. That rule bans two hosts because they publish a reading *of* code while a note
    // claims the code; the same defect wears other clothes. `GPT_IMAGE`'s ceiling said the figure
    // was taken "from OpenAI's own published OpenAPI description of the `prompt` field rather than
    // from the rendered reference page" — and cited the rendered reference page, which by then
    // redirected to a landing page carrying neither the sentence nor the figure. The comment named
    // its own source and the link pointed somewhere the comment explicitly disclaims.
    //
    // **The trigger is a file extension this repository does not itself use.** A path ending `.ts`
    // is almost always one of ours, and matching those buries the signal — measured, it turns three
    // correct comments into failures purely because they mention `models.ts` or `qwen.ts`. The
    // extensions below are foreign by construction, so a comment naming one is talking about
    // somebody else's tree; `OpenAPI` is here because the file that carries it is a `.yaml` a
    // comment can name without spelling.
    //
    // **What it does not reach is worth stating, because a guard that oversells itself is the
    // problem this file exists about.** A vendor whose evidence is a `.ts` or `.js` file is invisible
    // to it, and it cannot tell whether the repository cited is the *right* one — only that a claim
    // about code is answered by a link to code rather than to documentation.
    const CLAIMS_FOREIGN_CODE = /\bOpenAPI\b|[\w/.-]+\.(?:py|yaml|yml|rs|go|rb|java|cpp|toml)\b/;
    const CODE_HOST = /https?:\/\/(?:github\.com|raw\.githubusercontent\.com)\//;
    const ANY_URL = /https?:\/\/\S+/;

    const offenders = scannableSources().flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return commentRuns(source)
        .filter((run) => ANY_URL.test(run) && CLAIMS_FOREIGN_CODE.test(run) && !CODE_HOST.test(run))
        .map((run) => `${sourcePath(file)}: ${firstLine(run)}`);
    });

    expect(
      offenders,
      'A comment claiming a source file as its evidence has to cite that file on github.com, not ' +
        'a documentation page that draws from it. Cite the file, or stop naming it as the source.',
    ).toEqual([]);
  });
});
