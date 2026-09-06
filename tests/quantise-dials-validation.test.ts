import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { parseQuantiseDials } from '../src/db/quantiseDialsParser.ts';

/**
 * The rule `parseQuantiseDials` states about which unions storage validates, asserted as a rule.
 *
 * A string-literal union in `types/quantiser.ts` is checked on the way out of storage exactly when
 * it is a field of `QuantiseDials`, because that is what a saved quantiser preset carries. Two
 * docblocks in that file said otherwise for months — each claiming its own dial was never persisted
 * and never validated — and the neighbouring ones were written against them, comparing themselves to
 * a claim that was false, because each stated a per-union verdict and nothing recomputed any of them
 * (issue #258). The commit that made a preset carry the whole tuning set added the two parser
 * entries and left the two sentences behind.
 *
 * **It asserts the rule, not the list**, which is the difference that makes it durable: the union
 * fields are read off `QuantiseDials` with the compiler rather than named here, so a seventh dial
 * given a union is covered by the edit that gives it one, and one whose parser entry is dropped
 * fails here rather than in a docblock nobody re-reads. Parsed rather than matched for the reason
 * `select-call-site-counts.test.ts` parses: a field's type is an identifier that has to be resolved
 * back to its `as const` array, which a regular expression cannot do.
 *
 * The stored value each field is offered is a string no build of this app ever wrote, so a field
 * that comes back holding it is a field nothing checked.
 */

/** A value no member of any union in this app spells, so surviving the parse is the failure. */
const IMPOSSIBLE = 'NOT_A_MEMBER_OF_ANY_UNION';

const TYPES = resolve(process.cwd(), 'src/types/quantiser.ts');
const PRESET_TYPES = resolve(process.cwd(), 'src/types/quantisePreset.ts');

/** The `as const` arrays declared in `types/quantiser.ts`, by the name each is exported under. */
function declaredUnions(): Map<string, readonly string[]> {
  const source = readFileSync(TYPES, 'utf8');
  const tree = ts.createSourceFile(TYPES, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found = new Map<string, readonly string[]>();

  for (const statement of tree.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const initialiser = declaration.initializer;
      if (!ts.isIdentifier(declaration.name) || initialiser === undefined) continue;
      if (!ts.isAsExpression(initialiser) || !ts.isArrayLiteralExpression(initialiser.expression)) continue;
      const members = initialiser.expression.elements.filter(ts.isStringLiteral).map((each) => each.text);
      if (members.length === initialiser.expression.elements.length && members.length > 0) {
        found.set(declaration.name.text, members);
      }
    }
  }

  return found;
}

/**
 * Every field of the two interfaces a `QuantiseDials` is made of, with the type each is written as.
 *
 * Both, because `QuantiseDials extends QuantiseTuning` and the pipeline's own dials are the larger
 * half — reading only the extending interface would cover the three the tab adds and miss the
 * twenty-three this rule was broken on.
 */
function dialFields(): Map<string, string> {
  const fields = new Map<string, string>();

  for (const path of [TYPES, PRESET_TYPES]) {
    const source = readFileSync(path, 'utf8');
    const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const statement of tree.statements) {
      if (!ts.isInterfaceDeclaration(statement)) continue;
      if (statement.name.text !== 'QuantiseTuning' && statement.name.text !== 'QuantiseDials') continue;
      for (const member of statement.members) {
        if (!ts.isPropertySignature(member) || !ts.isIdentifier(member.name)) continue;
        if (member.type === undefined) continue;
        fields.set(member.name.text, member.type.getText(tree));
      }
    }
  }

  return fields;
}

/**
 * The dial fields whose type is one of this file's `as const` unions, as `[field, array name]`.
 *
 * A union type is declared as `(typeof ARRAY)[number]` and used on the field under its own alias, so
 * the alias is resolved back to the array by reading the `type X = (typeof ARRAY)[number]`
 * declarations rather than by assuming the two names match — `vote` is a `VoteMethod` and the array
 * is `VOTE_METHODS`.
 */
function unionDials(): [field: string, array: string][] {
  const source = readFileSync(TYPES, 'utf8');
  const tree = ts.createSourceFile(TYPES, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const aliasToArray = new Map<string, string>();

  for (const statement of tree.statements) {
    if (!ts.isTypeAliasDeclaration(statement)) continue;
    const written = statement.type.getText(tree);
    const named = /^\(typeof (\w+)\)\[number\]$/.exec(written);
    if (named?.[1] !== undefined) aliasToArray.set(statement.name.text, named[1]);
  }

  const unions = declaredUnions();
  return [...dialFields()]
    .map(([field, written]) => [field, aliasToArray.get(written)] as const)
    .filter((pair): pair is readonly [string, string] => pair[1] !== undefined && unions.has(pair[1]))
    .map(([field, array]) => [field, array]);
}

/**
 * A dial whose written type *looks* like a string-literal union but which the walk could not resolve
 * to an `as const` array in `types/quantiser.ts`.
 *
 * The rule below is asserted over what `unionDials` finds, so a dial the walk cannot see is a dial
 * this suite silently stops covering — the same fail-open a hand-kept list has. An inline
 * `'A' | 'B'`, or an alias declared in another file, is exactly that, and it is also a departure
 * from the convention `configParsers.ts` states: the `as const` array is a union's single
 * definition. Either way the answer is to look, not to skip.
 */
function unresolvedUnionDials(): string[] {
  const resolved = new Set(unionDials().map(([field]) => field));
  return [...dialFields()]
    .filter(([field, written]) => !resolved.has(field) && written.includes("'"))
    .map(([field]) => field);
}

/**
 * What each field's `pick(value, 'field', default, ARRAY)` in the parser names as its fourth
 * argument, by field.
 *
 * Only an identifier counts. An inline array literal is the thing the parser's docblock forbids —
 * a list restated where the check happens rather than read from where the union is defined — and it
 * lands here as an absent entry, which fails the comparison against `unionDials()`.
 */
function pickedAgainst(): Map<string, string> {
  const path = resolve(process.cwd(), 'src/db/quantiseDialsParser.ts');
  const source = readFileSync(path, 'utf8');
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found = new Map<string, string>();

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'pick' &&
      node.arguments.length === 4
    ) {
      const [, key, , against] = node.arguments;
      if (key !== undefined && ts.isStringLiteral(key) && against !== undefined && ts.isIdentifier(against)) {
        found.set(key.text, against.text);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(tree);

  // The two ladders are `pick`ed too — `keyTolerance` and `silhouetteThreshold` are numbers checked
  // for membership rather than unions — so they are dropped here rather than being counted as a
  // union the walk missed.
  return new Map([...found].filter(([field]) => new Map(unionDials()).has(field)));
}

describe('which unions storage validates', () => {
  it('finds every dial field whose type is a union, without being handed a list', () => {
    const found = unionDials()
      .map(([field]) => field)
      .sort();

    // **An exact set, not a floor.** A floor stood here and could not ratchet: a seventh dial given
    // a union the walk cannot resolve leaves the count where it was, the floor satisfied, and the
    // new dial unchecked — which is the fail-open this suite exists to close rather than reproduce.
    // Failing on a *seventh* is the point: whoever adds one has to come and read this file.
    expect(found).toEqual(['antiAlias', 'antiAliasPalette', 'dither', 'frameAlignment', 'symmetry', 'vote']);

    // And the other half of the same fail-open: a union-shaped field the walk could not resolve at
    // all, which would otherwise drop out of every case below without a word.
    expect(unresolvedUnionDials()).toEqual([]);
  });

  it.each(unionDials())('refuses a stored %s outside %s', (field) => {
    const parsed = parseQuantiseDials({ ...QUANTISE_DEFAULT_DIALS, [field]: IMPOSSIBLE });

    expect(parsed[field as keyof typeof parsed]).toBe(
      QUANTISE_DEFAULT_DIALS[field as keyof typeof QUANTISE_DEFAULT_DIALS],
    );
  });

  it('checks each against the array that defines it, not a list restated in the parser', () => {
    // Parsed, not searched. Two `toContain`s stood here and were satisfied by the import line alone,
    // so a parser that restated `['DOMINANT', 'INK_WEIGHTED', 'K_CENTROID']` inline while keeping the
    // import would have passed the case named for forbidding exactly that. What the claim needs is
    // the *fourth argument of the `pick` call* for that field, which is the identifier the parser's
    // own docblock promises: "Every check is against the constant that defines the dial, never a
    // list restated here."
    expect(pickedAgainst()).toEqual(new Map(unionDials()));
  });

  it('leaves a valid member of every union alone', () => {
    const unions = declaredUnions();

    for (const [field, array] of unionDials()) {
      const members = unions.get(array) ?? [];
      for (const member of members) {
        const parsed = parseQuantiseDials({ ...QUANTISE_DEFAULT_DIALS, [field]: member });
        expect(parsed[field as keyof typeof parsed]).toBe(member);
      }
    }
  });
});
