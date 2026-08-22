import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROMPT_TEMPLATE } from '../src/constants/promptTemplate.ts';

/**
 * §3 of `docs/todo/baseline-prompt-new.md` is a verbatim copy of `PROMPT_TEMPLATE`, and this suite
 * is what keeps it one.
 *
 * The document's banner tells a reader that §3 tracks the code rather than recording a moment, and
 * `constants/promptTemplate.ts` cites §3 back — so each is written as if the other were true.
 * Nothing checked that they agreed, and they never did: a ~400-line second copy maintained by hand
 * diverged the moment it was transcribed, then fell further behind each time the template changed.
 * The document went on stating the older wording in the exact section someone would be sent to edit,
 * with no way to tell which of the two was stale — which is how a drift gets copied back into the
 * template rather than out of the document.
 *
 * Comparing the fence against the exported constant makes that impossible rather than merely fixed.
 * The failure names the first line that differs, because a raw diff of two ~400-line strings says
 * only that they are not the same string.
 *
 * It lives under `tests/` rather than beside the template because it reads a file off disk: that is
 * the Node-side program (`tsconfig.node.json`, which carries the `node` types), where the
 * design-token contract lives for the same reason.
 */
const DOC = 'docs/todo/baseline-prompt-new.md';
const HEADING = '## 3. The template';

/**
 * A fence line: three or more backticks, and whatever info string the opener carries.
 *
 * **Read as a run rather than as the literal three backticks, because the template now contains a
 * fence of its own.** Section [SECTION:COMPONENT_MAP] fences the JSON it asks a model to reproduce,
 * so a mirror delimited by exactly three ends at that example — which makes §3 unmirrorable rather
 * than merely stale: the block stops short of the constant, the comparison below fails on the first
 * line past the fence, and no wording of the document can get it green again. CommonMark's own
 * answer is to open the outer fence with a longer run, which closes only on a run at least as long,
 * so §3 opens with four and this reads whatever it finds.
 */
const FENCE_LINE = /^(`{3,})(.*)$/;

/**
 * The first fenced block under §3's heading, or `null` if the document no longer has one.
 *
 * Line endings are normalised on the way in so that a failure is always about content. `.gitattributes`
 * pins the checkout to LF, and a template literal's cooked value is `\n` whatever its source file
 * holds, so the two sides already agree — what this defends against is an editor writing CRLF back
 * into the working tree, where the comparison would otherwise fail on line breaks git normalises away
 * again at commit, reporting the first line of a 425-line block as the culprit.
 */
function mirroredTemplate(markdown: string): string | null {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const heading = lines.indexOf(HEADING);
  if (heading < 0) return null;
  const open = lines.findIndex((line, index) => index > heading && FENCE_LINE.test(line));
  if (open < 0) return null;
  const opener = FENCE_LINE.exec(lines[open] ?? '')?.[1] ?? '';
  // Closes on a bare run at least as long as the opener, which is CommonMark's rule and the reason a
  // shorter fence inside the block is content rather than the end of it.
  const close = lines.findIndex((line, index) => {
    if (index <= open) return false;
    const run = FENCE_LINE.exec(line);
    return run !== null && (run[1] ?? '').length >= opener.length && (run[2] ?? '').trim() === '';
  });
  if (close < 0) return null;
  return lines.slice(open + 1, close).join('\n');
}

/** Where two texts first disagree, as a 1-based line number, or 0 when they never do. */
function firstDifferingLine(left: string, right: string): number {
  const a = left.split('\n');
  const b = right.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) return i + 1;
  }
  return 0;
}

const mirror = mirroredTemplate(readFileSync(resolve(process.cwd(), DOC), 'utf8'));

describe('the baseline-prompt document mirrors the template', () => {
  it('still has a fenced block under §3 to compare against', () => {
    // Guards the suite itself: a renamed heading or a restructured §3 would otherwise make the
    // comparison below vacuous, and the mirror would silently stop being checked at all.
    expect(mirror, `${DOC} has no fenced block under "${HEADING}"`).not.toBeNull();
  });

  it('reproduces PROMPT_TEMPLATE character for character', () => {
    // The assertion above has already failed the suite if this doesn't hold; the guard is what
    // narrows `string | null` without asserting it.
    if (mirror === null) return;
    expect(
      mirror,
      `${DOC} §3 first differs from PROMPT_TEMPLATE at line ${firstDifferingLine(
        mirror,
        PROMPT_TEMPLATE,
      )} of the fence. The constant is what the app emits, so copy it over the block — never the other way.`,
    ).toBe(PROMPT_TEMPLATE);
  });
});
