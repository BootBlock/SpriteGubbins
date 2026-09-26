import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** A declaration file, in any of the three module flavours a package ships one in. */
const DECLARATION = /\.d\.[cm]?ts$/u;

/** Every declaration file under `directory`, as an absolute path. */
function declarationsUnder(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && DECLARATION.test(entry.name))
    .map((entry) => resolve(entry.parentPath, entry.name));
}

/**
 * Every name the platform and this repository's own dependencies declare, and every word in the
 * root JSON configs — the names a comment can cite that the project's code never spells.
 *
 * The platform is TypeScript's own `lib.*.d.ts`, which is where `toBlob`, `crossOriginIsolated` and
 * `FileSystemFileHandle` are declared. A dependency is one `package.json` names directly, read whole:
 * `vite-plugin-pwa` is where `injectManifest` is declared. A transitive package is left out on
 * purpose, because the whole of `node_modules` declares so many names that a stale one would often
 * find a namesake somewhere in it. The root JSON is read for its keys, such as `tsconfig.json`'s
 * `noEmit`, except the lockfile, which is every transitive package's names again.
 *
 * **Read as words, not parsed.** A declaration file's comments are read with its code, so a name
 * one only mentions counts as declared. That loosens the check only for names a dependency writes
 * about, and parsing 10 MB of declarations to exclude them would cost more than it buys.
 */
export function declaredNames(): ReadonlySet<string> {
  const root = process.cwd();
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
    readonly dependencies?: Record<string, string>;
    readonly devDependencies?: Record<string, string>;
  };
  const packages = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
  const lib = resolve(root, 'node_modules/typescript/lib');
  const files = [
    ...readdirSync(lib)
      .filter((name) => /^lib\..+\.d\.ts$/u.test(name))
      .map((name) => resolve(lib, name)),
    ...packages
      .filter((name) => name !== 'typescript')
      .flatMap((name) => declarationsUnder(resolve(root, 'node_modules', name))),
    ...readdirSync(root)
      .filter((name) => name.endsWith('.json') && name !== 'package-lock.json')
      .map((name) => resolve(root, name)),
  ];

  const names = new Set<string>();
  for (const file of files) {
    for (const word of readFileSync(file, 'utf8').match(/[A-Za-z_$][\w$]*/gu) ?? []) names.add(word);
  }
  return names;
}
