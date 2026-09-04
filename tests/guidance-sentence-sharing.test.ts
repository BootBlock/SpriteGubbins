import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import * as SHARED_SENTENCES from '../src/constants/guidanceSentences.ts';
import { codeOnly } from '../scripts/codeOnly.ts';
import { scannableSources } from '../scripts/sourceFiles.ts';

/**
 * The one file allowed to write a shared guidance sentence out in full.
 *
 * Every other card that states one imports it, which is what makes the sharing a fact about the app
 * rather than a fact about a test's exemption list.
 */
const DEFINITION = 'src/constants/guidanceSentences.ts';

/** The file's path from the project root, in the spelling above. */
function sourcePath(file: string): string {
  return relative(process.cwd(), file).replaceAll('\\', '/');
}

/**
 * The half of the sharing rule that the guidance suite cannot state.
 *
 * `constants/tooltips/tooltips.test.ts` reads the *values*, so it recognises a shared sentence by
 * its text — and a text match cannot tell an imported sentence from one somebody typed out again.
 * That gap is not academic: `REDO_KEYBOARD_SHORTCUTS` pasted onto the Undo button beside Redo says
 * something untrue about that control, and folds to the same origin, so the check named for exactly
 * this copy-paste would report nothing. The suite's own docblock claimed otherwise until this file
 * existed.
 *
 * So the source is read here instead, with comments blanked as the other five sweeps do — a docblock
 * quoting one of these sentences to explain it is prose, not a second copy in the bundle. What is
 * left is a rule with no list in it: a shared sentence reaches a card by being imported, or it does
 * not reach it at all.
 */
describe('shared guidance sentences', () => {
  it.each(Object.entries(SHARED_SENTENCES))(
    '%s is written out only where it is defined',
    (_name, sentence) => {
      const offenders = scannableSources()
        .map(sourcePath)
        .filter((path) => path !== DEFINITION)
        .filter((path) => codeOnly(readFileSync(path, 'utf8')).includes(sentence));

      expect(offenders).toEqual([]);
    },
  );
});
