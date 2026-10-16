import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { codeOnly } from '../scripts/codeOnly.ts';
import { scannableSources, sourceText } from '../scripts/sourceFiles.ts';

/**
 * Where an easing curve or a keyframe may be written in `src/`: in `src/index.css`, and nowhere else.
 *
 * CLAUDE.md's design-token rule bans an inline `cubic-bezier` and inline `@keyframes`, and nothing
 * enforced either. Both render exactly as written — an arbitrary easing value compiles to a working
 * rule, and a `style` prop or an injected `<style>` is read by the browser directly — so a component
 * that wanted a curve the `--ease-*` tokens do not offer could simply take one, and the motion layer
 * would stop describing the app with the whole gate green. The ladder test in
 * `design-tokens.test.ts` holds the *durations* to the tokens. This holds the curves and the
 * keyframes.
 *
 * `linear()` and `steps()` are here beside `cubic-bezier()` because each is an easing curve written
 * out by hand, which is the thing the rule is about. Tailwind's stock linear easing utility names no
 * curve of its own, and is untouched.
 *
 * Comments are blanked first, as the colour scan does, because the prose explaining a token's curve
 * quotes it. A colocated test is left out for the reason it is left out there: nothing it writes
 * renders.
 */
const MOTION_LITERAL = /\b(?:cubic-bezier|linear|steps)\(|@keyframes\b/;

/** The one file an easing curve or a keyframe may be written in. */
const STYLESHEET = 'src/index.css';

/** The file's path from the project root, in the spelling `STYLESHEET` is written in. */
function sourcePath(file: string): string {
  return relative(process.cwd(), file).replaceAll('\\', '/');
}

/** Every line of `file` outside a comment that writes a curve or a keyframe, as `path:line`. */
function offendingLines(file: string): string[] {
  return codeOnly(sourceText(file))
    .split('\n')
    .map((line, index) => (MOTION_LITERAL.test(line) ? `${sourcePath(file)}:${index + 1}` : ''))
    .filter(Boolean);
}

describe('raw motion literals', () => {
  it('still finds the curves and keyframes the stylesheet is exempt for holding', () => {
    // A scan that read nothing, or a `codeOnly` that blanked too much, would pass the guard below
    // for the best possible reason. The stylesheet defines every curve and keyframe the app has.
    const stylesheet = scannableSources().find((file) => sourcePath(file) === STYLESHEET);

    expect(stylesheet).not.toBeUndefined();
    expect(offendingLines(stylesheet ?? '').length).toBeGreaterThan(5);
  });

  it('leaves no curve or keyframe under src/ outside the stylesheet', () => {
    const offenders = scannableSources()
      .filter((file) => !/\.test\.tsx?$/.test(file))
      .filter((file) => sourcePath(file) !== STYLESHEET)
      .flatMap(offendingLines);

    expect(offenders).toStrictEqual([]);
  });
});
