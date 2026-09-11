import { relative } from 'node:path';
import { scannableSources, sourceText } from '../scripts/sourceFiles.ts';

/**
 * Every sticky column in the app, as `[file, class string]`.
 *
 * Found rather than listed, because a named list is what left the preset library's column carrying a
 * header height of its own after the other two were fixed, and it is the list a fourth column would
 * not be added to. Two suites ask this question — whether a column clears the chrome, and whether a
 * split lays anything out by the page's width — so the walk is shared rather than written into each.
 *
 * The header itself is deliberately outside this: it is `sticky top-0` with no variant prefix,
 * because it *is* the chrome the columns are clearing rather than something that has to clear it.
 * The prefix is what separates the two, so it is what the pattern requires.
 *
 * `scannableSources` is the walk the other guard suites share, rather than another answer to what
 * counts as source — and it reaches `.ts` as well as `.tsx`, so a class string hoisted into a
 * constant is swept along with the JSX.
 */
export function stickyColumns(): readonly (readonly [string, string])[] {
  const found: (readonly [string, string])[] = [];
  for (const file of scannableSources()) {
    for (const match of sourceText(file).matchAll(/className="([^"]*\b[a-z][\w-]*:sticky\b[^"]*)"/g)) {
      const classes = match[1];
      if (classes !== undefined) {
        found.push([relative(process.cwd(), file).replaceAll('\\', '/'), classes] as const);
      }
    }
  }
  return found;
}
