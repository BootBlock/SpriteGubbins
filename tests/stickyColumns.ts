import { relative } from 'node:path';
import { codeOnly } from '../scripts/codeOnly.ts';
import { appMarkup, sourceText } from '../scripts/sourceFiles.ts';
import { classStrings } from './pageWidthClasses.ts';

/**
 * Every sticky column in the app, as `[file, class string]`.
 *
 * Found rather than listed, because a named list is what left the preset library's column carrying a
 * header height of its own after the other two were fixed, and it is the list a fourth column would
 * not be added to. Two suites ask this question — whether a column clears the chrome, and which splits
 * the page-width guard walks — so the walk is shared rather than written into each.
 *
 * The header itself is deliberately outside this: it is `sticky top-0` with no variant prefix,
 * because it *is* the chrome the columns are clearing rather than something that has to clear it.
 * The prefix is what separates the two, so it is what the pattern requires.
 *
 * **Every string literal is read, not only a `className="…"` attribute.** A column whose classes sit
 * in a template literal or in a hoisted constant is still a column, and the attribute pattern this
 * used to match would have skipped it — which, once the page-width guard began choosing its splits
 * from this list, would have left a fourth split unwalked with every floor still satisfied. A constant
 * filed away from its grid is found here and then fails `split-page-width.test.ts`, whose walk starts
 * in the file the classes are written in and asserts that file returns the grid.
 *
 * `appMarkup` is the set walked, because a string in a test is an assertion about a column rather than
 * a column. Comments are blanked, since the reasoning beside a column names its classes.
 */
export function stickyColumns(): readonly (readonly [string, string])[] {
  const found: (readonly [string, string])[] = [];
  for (const file of appMarkup().filter((path) => /\.tsx?$/.test(path))) {
    for (const classes of classStrings(codeOnly(sourceText(file)))) {
      if (/(?:^|\s)[a-z][\w-]*:sticky(?=\s|$)/.test(classes)) {
        found.push([relative(process.cwd(), file).replaceAll('\\', '/'), classes] as const);
      }
    }
  }
  return found;
}
