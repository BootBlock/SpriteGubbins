import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TARGET_MODELS } from '../src/constants/models.ts';

/**
 * Every field a target-model entry declares has to be read by something the app ships.
 *
 * `TargetModel.description` was called `tooltip` and rendered nowhere for the whole life of the
 * selector. Nothing could catch it: the interface obliged every entry to fill the field, all eleven
 * did, and the compiler is satisfied by a property being *written*. So eleven researched
 * explanations — which flags Midjourney gets, why Flux takes prose instead of a negative block —
 * shipped in the bundle where no user could reach them, and the only evidence was that no consumer
 * happened to mention the name.
 *
 * That absence is exactly what this checks, and it is why the check is a text scan rather than a
 * type assertion: a field nothing reads is indistinguishable, to `tsc`, from one everything reads.
 *
 * **The field list comes from the data, not from the source text.** Parsing the interface out of
 * `src/types/output.ts` would mean a regex that quietly stops finding fields the first time one is
 * given an inline object type — a guard that fails open, which is the failure this file exists to
 * prevent. The entries are object literals of a type with no optional members, so their own keys are
 * the declared fields, and TypeScript's excess-property check is what keeps them from being more.
 */

/** The files a field could be read in: the app's own sources, minus the entries themselves. */
const ENTRY_DATA = resolve(process.cwd(), 'src/constants/models.ts');

/**
 * Every field name the entries carry, across all of them.
 *
 * The union rather than the first entry's keys, so a field that is ever optional is still covered by
 * whichever entries do declare it.
 */
const FIELDS = [...new Set(TARGET_MODELS.flatMap((model) => Object.keys(model)))].sort();

/**
 * The shipped sources that consume `TARGET_MODELS`.
 *
 * Narrowed to the files that actually name the table, because the field names are ordinary words: a
 * scan of all of `src/` would have found `field.tooltip` in `SubjectForm` — a different type's
 * property entirely — and passed the very bug this file is named for.
 *
 * **Tests are not consumers.** A field read only by `targetCapabilities.test.ts` is still a field
 * the user never sees, and counting one would let an assertion stand in for a rendering.
 */
function consumerFiles(): readonly string[] {
  const root = resolve(process.cwd(), 'src');
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
    .map((entry) => resolve(entry.parentPath, entry.name))
    .filter((path) => path !== ENTRY_DATA)
    .filter((path) => readFileSync(path, 'utf8').includes('TARGET_MODELS'));
}

const CONSUMERS = consumerFiles().map((path) => ({ path, source: readFileSync(path, 'utf8') }));

/**
 * Whether a file reads that field off something.
 *
 * Two spellings, because only one of them is in use today and a test that fails on a legitimate
 * refactor is worse than no test: `model.description` is how every current consumer reads an entry,
 * and the destructuring form is what a future one might write instead. Both over-match — an object
 * literal with a key of the same name counts — which is the deliberate trade. This is a check that
 * the name is *mentioned as a property* by something that handles target models; a tighter one would
 * need the type-checker, and the bug it exists to catch is the total absence of any mention at all.
 */
function readsField(source: string, field: string): boolean {
  return (
    new RegExp(String.raw`\.${field}\b`).test(source) ||
    new RegExp(String.raw`[{,]\s*${field}\s*[,}:=]`).test(source)
  );
}

describe('target model entry fields', () => {
  it('finds the sources that consume the table', () => {
    // Without this the whole file passes vacuously the moment `TARGET_MODELS` is renamed or the
    // selector stops importing it — every field would be unread by nothing, which is not a pass.
    expect(CONSUMERS.map((consumer) => consumer.path)).not.toHaveLength(0);
    expect(FIELDS).not.toHaveLength(0);
  });

  for (const field of FIELDS) {
    it(`${field} is read by something the app ships`, () => {
      const readers = CONSUMERS.filter((consumer) => readsField(consumer.source, field)).map(
        (consumer) => consumer.path,
      );
      expect(readers, `TargetModel.${field} is declared on every entry and read by nothing`).not.toHaveLength(
        0,
      );
    });
  }
});
