import { relative, sep } from 'node:path';
import * as ts from 'typescript';
import { scannableSources, sourceText } from '../scripts/sourceFiles.ts';

/**
 * Finding where the app renders a given component, parsed rather than matched.
 *
 * Two suites re-count a primitive's call sites because its docblock argues a design decision by
 * counting them — `SelectField`'s two optional props, and `ControlTooltip`'s two paragraphs about
 * how many glyphs an ⓘ apiece would add and how many of its wrapped controls can be disabled. Both
 * ask the same question of the same tree, so they ask it through one walk: a second copy would be a
 * second answer to "is this a call site", and the one that went stale would answer *almost* right,
 * which is the failure mode the docblock below describes.
 *
 * **Parsed with the compiler, for the reason `interface-punctuation.test.ts` parses.** A JSX opening
 * tag cannot be delimited by hand: its attribute values are arbitrary expressions, so the `>` that
 * closes the tag is indistinguishable from the `>` of a nested element, a comparison or an arrow —
 * and a scanner that balances brackets and skips string literals still runs to the end of the file
 * the moment an apostrophe appears in a line comment between two attributes, which several of these
 * call sites have.
 *
 * That failure is silent and answers *almost* right, which is what makes it worth naming: the
 * over-long slice swallows whatever follows the tag, so it reports the true figure until the day a
 * second call site downstream of the comment starts passing the same prop, and then counts that one
 * twice. Reading the attributes off the parsed node also settles the half no slice can — a call site
 * may pass an element of its own as a prop, and only the compiler knows that child's attributes
 * belong to the child.
 */

/** One rendered element, as the file and line a failure has to send a reader to. */
export interface CallSite {
  /** Repository-relative and forward-slashed, so a failure reads the same on either platform. */
  readonly file: string;
  /** One-based, as an editor counts. */
  readonly line: number;
}

/** `file:line`, which is what a pinned list is written as and what an editor links from. */
export function siteName(site: CallSite): string {
  return `${site.file}:${String(site.line)}`;
}

/** Every element the app renders under `tag`, in the order the walk reaches them. */
function elementsNamed(tag: string): { site: CallSite; node: ts.JsxElement | ts.JsxSelfClosingElement }[] {
  const found: { site: CallSite; node: ts.JsxElement | ts.JsxSelfClosingElement }[] = [];

  for (const path of scannableSources()) {
    if (!path.endsWith('.tsx') || path.includes('.test.')) continue;

    const source = sourceText(path);
    if (!source.includes(`<${tag}`)) continue;

    const file = relative(process.cwd(), path).split(sep).join('/');
    const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const visit = (node: ts.Node): void => {
      const opening = ts.isJsxElement(node)
        ? node.openingElement
        : ts.isJsxSelfClosingElement(node)
          ? node
          : undefined;
      if (opening !== undefined && opening.tagName.getText(tree) === tag) {
        const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
        found.push({ site: { file, line }, node: node as ts.JsxElement | ts.JsxSelfClosingElement });
      }
      ts.forEachChild(node, visit);
    };

    visit(tree);
  }

  return found;
}

/** Whether `element` is written with an attribute of that name, however its value is spelled. */
function passes(element: ts.JsxOpeningLikeElement, attribute: string): boolean {
  return element.attributes.properties.some(
    (property) =>
      ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === attribute,
  );
}

/**
 * Where the app renders `<tag …>` passing `attribute`, sorted, one entry per call site.
 *
 * Counted through a prop the component's own props type *requires* where the question is "how many
 * are there" — that is every call site rather than every one that happens to pass an optional prop.
 */
export function callSitesPassing(tag: string, attribute: string): CallSite[] {
  return elementsNamed(tag)
    .filter(({ node }) => passes(ts.isJsxElement(node) ? node.openingElement : node, attribute))
    .map(({ site }) => site)
    .sort((left, right) => siteName(left).localeCompare(siteName(right)));
}

/**
 * Where the app renders `<tag>`'s single element child passing `attribute` — `disabled`, in
 * practice.
 *
 * A wrapper's argument about what it can and cannot reach is about the control *inside* it, so the
 * question is asked of the child rather than of the wrapper. A `{expression}` child is unwrapped,
 * because a call site is free to write one and the element inside it is still the control; a
 * self-closing wrapper has no child and answers no.
 */
export function callSitesWrappingAttribute(tag: string, attribute: string): CallSite[] {
  const found: CallSite[] = [];

  for (const { site, node } of elementsNamed(tag)) {
    if (!ts.isJsxElement(node)) continue;

    for (const child of node.children) {
      if (ts.isJsxText(child) && child.getText().trim() === '') continue;
      const inner = ts.isJsxExpression(child) ? child.expression : child;
      if (inner === undefined) continue;
      const opening = ts.isJsxElement(inner)
        ? inner.openingElement
        : ts.isJsxSelfClosingElement(inner)
          ? inner
          : undefined;
      if (opening !== undefined && passes(opening, attribute)) found.push(site);
    }
  }

  return found.sort((left, right) => siteName(left).localeCompare(siteName(right)));
}
