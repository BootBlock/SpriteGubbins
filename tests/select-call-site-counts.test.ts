import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { scannableSources } from './sourceFiles.ts';

/**
 * The call-site counts `SelectField`’s docblock states, re-counted from the components themselves.
 *
 * That docblock argues its two optional props into existence by counting: `description` is optional
 * because only five of the app’s selects have a table behind them to read out, and `disabledReason`
 * because exactly one has a setting above it that takes its value over. The counts *are* the
 * argument — at one exception, the claim that a permanently-empty string everywhere else would bury
 * it is self-evident, and at half the call sites it would be false — so a figure that has drifted is
 * not a stale number beside a live argument. It is a live argument resting on a false premise.
 *
 * Nothing recomputed them, so one drifted a long way without moving: the docblock described a
 * single `description` call site while five passed one. The total beside it is the same failure
 * caught three times already, and corrected by hand on each — twenty-four, then twenty-six, then
 * thirty. Nothing failed on any of the four: a reader adding two selects for something else
 * noticed the arithmetic. This suite is what fails instead.
 *
 * **It pins the counts, not the prose.** Whoever makes it fail has to go and restate the two
 * paragraphs, which is the step that was being skipped; whether the restated argument still holds at
 * the new figure is a judgement no assertion can make. The two exception lists are pinned by name as
 * well as by length, so a select that swaps one exception for another — leaving the totals alone —
 * fails here too, and the docblock’s account of *which* five they are stays true with them.
 */

/** Every `<SelectField>` the app renders. */
const CALL_SITE_COUNT = 30;

/** Where a `description` is passed: the docblock’s five, by the file that renders each. */
const DESCRIPTION_CALL_SITES = [
  'src/components/studio/PaletteField.tsx',
  'src/components/studio/RenderStyleFields.tsx',
  'src/components/studio/StyleReferenceField.tsx',
  'src/components/studio/SystemProfileField.tsx',
  'src/components/studio/TargetModelSelector.tsx',
];

/** Where a `disabledReason` is passed: the rig mode, which the sheet contents can fix. */
const DISABLED_REASON_CALL_SITES = ['src/components/studio/RiggingFields.tsx'];

/**
 * The files that render a `<SelectField>` passing `attribute`, one entry per call site.
 *
 * Parsed with the compiler rather than matched, for the reason `interface-punctuation.test.ts`
 * parses rather than matching: a JSX opening tag cannot be delimited by hand. Its attribute values
 * are arbitrary expressions, so the `>` that closes the tag is indistinguishable from the `>` of a
 * nested element, a comparison or an arrow — and a scanner that balances brackets and skips string
 * literals still runs to the end of the file the moment an apostrophe appears in a line comment
 * between two attributes, which two of these thirty call sites have.
 *
 * That failure is silent and answers *almost* right, which is what makes it worth naming: the
 * over-long slice swallows whatever follows the tag, so it reports the true figure until the day a
 * second select downstream of the comment starts passing the same prop, and then counts that one
 * twice. Reading the attributes off the parsed node also settles the half no slice can —
 * `TargetModelSelector` passes an `action` holding an element of its own, and only the compiler
 * knows that child’s attributes belong to the child.
 */
function callSitesPassing(attribute: string): string[] {
  const found: string[] = [];

  for (const path of scannableSources()) {
    if (!path.endsWith('.tsx') || path.includes('.test.')) continue;

    const source = readFileSync(path, 'utf8');
    if (!source.includes('<SelectField')) continue;

    const file = relative(process.cwd(), path).split(sep).join('/');
    const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const visit = (node: ts.Node): void => {
      if (
        (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
        node.tagName.getText(tree) === 'SelectField' &&
        node.attributes.properties.some(
          (property) =>
            ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === attribute,
        )
      ) {
        found.push(file);
      }

      ts.forEachChild(node, visit);
    };

    visit(tree);
  }

  return found.sort();
}

describe('the call-site counts SelectField’s docblock states', () => {
  it(`renders ${String(CALL_SITE_COUNT)} selects`, () => {
    // Counted through `label`, which the props type requires, so this is every call site rather
    // than every one that happens to pass an optional prop.
    expect(callSitesPassing('label')).toHaveLength(CALL_SITE_COUNT);
  });

  it(`passes a description at ${String(DESCRIPTION_CALL_SITES.length)} of them`, () => {
    expect(callSitesPassing('description')).toEqual(DESCRIPTION_CALL_SITES);
  });

  it(`passes a disabledReason at ${String(DISABLED_REASON_CALL_SITES.length)} of them`, () => {
    expect(callSitesPassing('disabledReason')).toEqual(DISABLED_REASON_CALL_SITES);
  });
});
