import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * The TypeScript programs must be checked to the same standard.
 *
 * `tsconfig.app.json` covers `src/`; `tsconfig.node.json` covers `vite.config.ts`, `scripts/` and
 * the whole of `tests/`; `tsconfig.public.json` covers the scripts in `public/`, which the host
 * serves as written (issue #449). The first two were configured independently, and only the first
 * ever gained `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` — so `tests/`, which
 * CLAUDE.md names as the place the app's correctness is established, was checked more loosely than
 * the code it tests. A guard that indexes an array wrongly asserts the wrong thing quietly, and that
 * is the one failure a suite cannot report on itself.
 *
 * The gap read as no gap because both files declare `"strict": true`, and the difference was two
 * lines present in one and absent from the other. Nothing related the two, so nothing could notice.
 *
 * This suite relates them: every boolean option any program declares must be declared, with the
 * same value, in every other. Booleans rather than the strictness family alone, because
 * "strictness" is a taxonomy somebody would have to keep, and a flag left off that list is
 * precisely the drift being guarded against. The options that legitimately differ are named in
 * {@link PROGRAM_SHAPE}, each with the reason it belongs to some programs and not the others.
 *
 * What it cannot judge is whether a flag *should* be set at all. Adding one to every file satisfies
 * this suite whatever it does; that stays a decision.
 */
const APP_CONFIG = 'tsconfig.app.json';
const NODE_CONFIG = 'tsconfig.node.json';
const PUBLIC_CONFIG = 'tsconfig.public.json';
const CONFIGS: readonly string[] = [APP_CONFIG, NODE_CONFIG, PUBLIC_CONFIG];

/**
 * The boolean options that describe a program's *shape* rather than how hard it is checked, each
 * with the programs that correctly set it.
 *
 * All are properties of the code each program holds. `useDefineForClassFields` picks the class
 * field semantics `src/` is compiled under, and it is Vite that compiles `src/` into the browser
 * bundle — no config emits anything, every one being `noEmit`, so emission is not what separates
 * them. `resolveJsonModule` lets `src/` import a `.json` file as a module, which nothing under
 * `tests/` or `scripts/` does — those read JSON off disk and parse it, as this file does. `allowJs`
 * and `checkJs` are how `public/` is checked at all: the host serves its scripts as written, so they
 * are JavaScript, where every other program holds TypeScript alone.
 *
 * An entry that has stopped describing a real difference fails below, so the list cannot rot into a
 * blanket permission: setting one of these in another program means changing its entry here.
 */
const PROGRAM_SHAPE: ReadonlyMap<string, readonly string[]> = new Map([
  ['useDefineForClassFields', [APP_CONFIG]],
  ['resolveJsonModule', [APP_CONFIG]],
  ['allowJs', [PUBLIC_CONFIG]],
  ['checkJs', [PUBLIC_CONFIG]],
]);

/** Narrowed rather than cast, because a cast here would assert the shape this suite is reading. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

/** One config's whole object, as written — the file is JSONC, so it is parsed as such. */
function declaration(file: string): Readonly<Record<string, unknown>> {
  const parsed = ts.parseConfigFileTextToJson(file, readFileSync(resolve(process.cwd(), file), 'utf8'));
  if (parsed.error) {
    throw new Error(
      `${file} does not parse: ${ts.flattenDiagnosticMessageText(parsed.error.messageText, ' ')}`,
    );
  }
  const config: unknown = parsed.config;
  if (!isRecord(config)) throw new Error(`${file} is not a JSON object`);
  return config;
}

/** One config's `compilerOptions`, which is where every flag this suite compares is declared. */
function compilerOptions(file: string): Readonly<Record<string, unknown>> {
  const options: unknown = declaration(file)['compilerOptions'];
  if (!isRecord(options)) throw new Error(`${file} declares no compilerOptions object`);
  return options;
}

/** The options whose values are booleans, which is where every strictness flag lives. */
function booleanOptions(file: string): Map<string, boolean> {
  const entries = Object.entries(compilerOptions(file));
  return new Map(entries.filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'));
}

/** The configs `tsconfig.json` references, which are the programs `tsc -b` checks. */
function referencedConfigs(): string[] {
  const references: unknown = declaration('tsconfig.json')['references'];
  if (!Array.isArray(references)) throw new Error('tsconfig.json declares no references array');
  return references.map((reference: unknown) => {
    const path = isRecord(reference) ? reference['path'] : undefined;
    if (typeof path !== 'string') throw new Error('tsconfig.json holds a reference with no path');
    return resolve(process.cwd(), path);
  });
}

const programs: ReadonlyMap<string, Map<string, boolean>> = new Map(
  CONFIGS.map((file) => [file, booleanOptions(file)]),
);

describe('tsconfig strictness', () => {
  it('compares every program the build checks, and no other', () => {
    // A program referenced from `tsconfig.json` and missing here would be checked to whatever
    // standard it happened to declare, with this suite green.
    expect(referencedConfigs().sort()).toStrictEqual(
      CONFIGS.map((file) => resolve(process.cwd(), file)).sort(),
    );
  });

  it('compares configs that declare their own options, rather than inheriting any', () => {
    // The comparison reads what each file declares, because `parseConfigFileTextToJson` does not
    // resolve `extends` — an inherited flag would be invisible to it, and a base config setting one
    // config's strictness would take the comparison green while saying nothing about the others.
    // No file extends anything today; the day one does, this suite has to learn to resolve it
    // rather than go on reporting a pass it can no longer support.
    for (const file of CONFIGS) {
      expect(declaration(file)['extends'], `${file} must declare its own options`).toBeUndefined();
    }
  });

  it('reads every config rather than agreeing perfectly on nothing', () => {
    // The substantive floor: the three the asymmetry was found on, named outright, so a comparison
    // that stayed green while every file dropped them is still a failure.
    for (const [file, options] of programs) {
      expect(options.get('strict'), `${file} must set strict`).toBe(true);
      expect(options.get('noUncheckedIndexedAccess'), `${file} must set noUncheckedIndexedAccess`).toBe(true);
      expect(options.get('exactOptionalPropertyTypes'), `${file} must set exactOptionalPropertyTypes`).toBe(
        true,
      );
    }
  });

  it('sets every boolean option in every program, or names it a shape difference', () => {
    const shared = [...new Set([...programs.values()].flatMap((options) => [...options.keys()]))]
      .filter((name) => !PROGRAM_SHAPE.has(name))
      .sort();
    for (const [file, options] of programs) {
      expect(
        shared.filter((name) => !options.has(name)),
        `${file} is missing options another program sets`,
      ).toStrictEqual([]);
    }
    for (const name of shared) {
      const values = new Set([...programs.values()].map((options) => options.get(name)));
      expect([...values], `${name} is set differently across the programs`).toHaveLength(1);
    }
  });

  it('keeps no shape exemption that has stopped describing a difference', () => {
    // An entry here suppresses a real comparison, so one naming the wrong programs is a hole rather
    // than an untidiness: it would go on excusing the option the day someone set it everywhere.
    for (const [name, owners] of PROGRAM_SHAPE) {
      expect(
        CONFIGS.filter((file) => programs.get(file)?.has(name)),
        `${name} is not set by exactly the programs its exemption names`,
      ).toStrictEqual(owners);
    }
  });
});
