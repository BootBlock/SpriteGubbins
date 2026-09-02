import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * The two TypeScript programs must be checked to the same standard.
 *
 * `tsconfig.app.json` covers `src/`; `tsconfig.node.json` covers `vite.config.ts`, `scripts/` and
 * the whole of `tests/`. They were configured independently, and only the first ever gained
 * `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` — so `tests/`, which CLAUDE.md names
 * as the place the app's correctness is established, was checked more loosely than the code it
 * tests. A guard that indexes an array wrongly asserts the wrong thing quietly, and that is the one
 * failure a suite cannot report on itself.
 *
 * The gap read as no gap because both files declare `"strict": true`, and the difference was two
 * lines present in one and absent from the other. Nothing related the two, so nothing could notice.
 *
 * This suite relates them: every boolean option either file declares must be declared, with the
 * same value, in the other. Booleans rather than the strictness family alone, because "strictness"
 * is a taxonomy somebody would have to keep, and a flag left off that list is precisely the drift
 * being guarded against. The options that legitimately differ are named in {@link PROGRAM_SHAPE},
 * each with the reason it belongs to one program and not the other.
 *
 * What it cannot judge is whether a flag *should* be set at all. Adding one to both files satisfies
 * this suite whatever it does; that stays a decision.
 */
const APP_CONFIG = 'tsconfig.app.json';
const NODE_CONFIG = 'tsconfig.node.json';

/**
 * The boolean options that describe one program's *shape* rather than how hard it is checked, and
 * so are correctly set in `tsconfig.app.json` alone.
 *
 * Both are properties of the code each program holds. `useDefineForClassFields` picks the class
 * field semantics `src/` is compiled under, and it is Vite that compiles `src/` into the browser
 * bundle — neither config emits anything, both being `noEmit`, so emission is not what separates
 * them. `resolveJsonModule` lets `src/` import a `.json` file as a module, which nothing under
 * `tests/` or `scripts/` does — those read JSON off disk and parse it, as this file does.
 *
 * An entry that has stopped describing a real difference fails below, so the list cannot rot into a
 * blanket permission: setting one of these in `tsconfig.node.json` means deleting its entry here.
 */
const PROGRAM_SHAPE: readonly string[] = ['useDefineForClassFields', 'resolveJsonModule'];

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

const app = booleanOptions(APP_CONFIG);
const node = booleanOptions(NODE_CONFIG);

describe('tsconfig strictness', () => {
  it('compares two configs that declare their own options, rather than inheriting any', () => {
    // The comparison reads what each file declares, because `parseConfigFileTextToJson` does not
    // resolve `extends` — an inherited flag would be invisible to it, and a base config setting one
    // config's strictness would take the comparison green while saying nothing about the other.
    // Neither file extends anything today; the day one does, this suite has to learn to resolve it
    // rather than go on reporting a pass it can no longer support.
    for (const file of [APP_CONFIG, NODE_CONFIG]) {
      expect(declaration(file)['extends'], `${file} must declare its own options`).toBeUndefined();
    }
  });

  it('reads both configs rather than agreeing perfectly on nothing', () => {
    expect(app.size).toBeGreaterThan(0);
    expect(node.size).toBeGreaterThan(0);
    // The substantive floor: the three the asymmetry was found on, named outright, so a comparison
    // that stayed green while both files dropped them is still a failure.
    for (const [file, options] of [
      [APP_CONFIG, app],
      [NODE_CONFIG, node],
    ] as const) {
      expect(options.get('strict'), `${file} must set strict`).toBe(true);
      expect(options.get('noUncheckedIndexedAccess'), `${file} must set noUncheckedIndexedAccess`).toBe(true);
      expect(options.get('exactOptionalPropertyTypes'), `${file} must set exactOptionalPropertyTypes`).toBe(
        true,
      );
    }
  });

  it('sets every boolean option in both programs, or names it a shape difference', () => {
    const shared = [...new Set([...app.keys(), ...node.keys()])]
      .filter((name) => !PROGRAM_SHAPE.includes(name))
      .sort();
    expect(
      shared.filter((name) => !app.has(name)),
      `${APP_CONFIG} is missing options ${NODE_CONFIG} sets`,
    ).toStrictEqual([]);
    expect(
      shared.filter((name) => !node.has(name)),
      `${NODE_CONFIG} is missing options ${APP_CONFIG} sets`,
    ).toStrictEqual([]);
    for (const name of shared) {
      expect(node.get(name), `${name} is set differently in the two programs`).toBe(app.get(name));
    }
  });

  it('keeps no shape exemption that has stopped describing a difference', () => {
    // A name here suppresses a real comparison, so one covering nothing is a hole rather than an
    // untidiness: it would go on excusing the option the day someone set it in both files.
    const stale = PROGRAM_SHAPE.filter((name) => app.has(name) === node.has(name));
    expect(stale, 'these are set the same way in both programs and need no exemption').toStrictEqual([]);
  });
});
