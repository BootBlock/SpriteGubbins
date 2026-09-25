/**
 * Assemble a credential-shaped value at run time.
 *
 * Nothing in a test file may be credential-shaped **as written**. The scanner is what the
 * pre-commit hook runs over every staged diff and what the CI gate runs over the whole tree and
 * every pushed commit, so a fixture spelled out in full would block the commit that introduced it
 * and every publish afterwards. Joining the pieces here keeps the shape out of the source line and
 * puts it back in the value, and `the files that describe credential shapes` in
 * `secret-scan.test.ts` is what proves the arrangement actually holds rather than being asserted.
 */
export function shape(...pieces: string[]): string {
  return pieces.join('');
}
