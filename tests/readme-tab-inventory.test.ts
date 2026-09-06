import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_TAB_CHOICES } from '../src/constants/ui.ts';

/**
 * The tab set the README states, read back off the table the switcher is built from.
 *
 * The README enumerates the app's views in prose, and that enumeration has now been wrong twice for
 * the same reason: it named three while Quantise shipped (issue #101), and four while Projects
 * shipped (issue #262) — the view where every preset a reader saves is filed, and the only place
 * the library leaves the app as a file. Both times the sentence was true when it was last read and
 * was overtaken by a commit that had no reason to open a README.
 *
 * Correcting the sentence a second time would buy nothing a third tab could not undo. This is what
 * makes the next one fail instead: `APP_TAB_CHOICES` is the ordered list the header switcher and
 * the settings dialog's opening-view field are both built from, so a view that reaches the app
 * reaches this assertion, and a view that never does is not a tab.
 *
 * **One claim, asserted in two steps, because the steps say different things when they break.**
 * Naming every view in the Status inventory already implies naming every view somewhere, so a
 * document-wide sweep is not a second constraint and is deliberately not written as a second test —
 * a case that cannot fail while its neighbour passes reads as coverage it is not providing. It is
 * still worth asserting *first*, because its message names the view that is missing outright, which
 * is the #262 shape ("Projects" appeared zero times); the inventory comparison that follows reports
 * the whole sentence, which is what a reader needs when the list is merely out of order or short.
 *
 * **It pins the sentence, not its wording**, in the sense `tests/architecture-figures.test.ts`
 * means: the inventory may be rewritten freely as long as it still opens "The app carries the …
 * tabs" and still names every view in switcher order. An author who has to restore that phrase is
 * an author reading the list as they go, which is the step that was skipped twice.
 */

/** The Status paragraph's inventory, by the words it opens and closes the tab list with. */
const INVENTORY_OPENS = 'The app carries the ';
const INVENTORY_CLOSES = ' tabs,';

/** `a, b, c and d` — how the document's own prose joins a list, with no serial comma. */
function asProse(names: readonly string[]): string {
  if (names.length < 2) {
    return names.join('');
  }

  return `${names.slice(0, -1).join(', ')} and ${String(names.at(-1))}`;
}

/**
 * The document as one line, because both of its sentences are hard-wrapped and Prettier rewraps
 * them. An assertion that breaks when a paragraph reflows is an assertion someone deletes.
 */
const README = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8').replace(/\s+/g, ' ');
const LABELS = APP_TAB_CHOICES.map((tab) => tab.label);

describe('the views the README says the app has', () => {
  it('names every one of them, in the Status inventory', () => {
    const missing = LABELS.filter((label) => !README.includes(label));

    expect(
      missing,
      `README.md never mentions ${asProse(missing)}. Every view in APP_TAB_CHOICES is a surface a ` +
        'reader arriving from GitHub will find in the app, so the document has to name it.',
    ).toEqual([]);

    const expected = asProse(LABELS);
    const opens = README.indexOf(INVENTORY_OPENS);

    expect(
      opens,
      `No sentence in README.md opens “${INVENTORY_OPENS}”. That is the Status inventory, and ` +
        'this assertion is anchored to it — restore the phrase rather than removing the check.',
    ).toBeGreaterThanOrEqual(0);

    const from = opens + INVENTORY_OPENS.length;
    const closes = README.indexOf(INVENTORY_CLOSES, from);

    expect(
      closes,
      `The Status inventory opens but never reaches “${INVENTORY_CLOSES.trim()}”.`,
    ).toBeGreaterThanOrEqual(0);

    expect(
      README.slice(from, closes),
      `The Status inventory does not name the views the app has. APP_TAB_CHOICES is ${expected}, ` +
        'in the order the switcher shows them.',
    ).toBe(expected);
  });
});
