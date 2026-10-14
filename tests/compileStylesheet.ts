import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { compile } from 'tailwindcss';

const require = createRequire(resolve(process.cwd(), 'package.json'));

/**
 * The stylesheet Tailwind would build from `css` for exactly the `candidates` given.
 *
 * The build answers "what does the app emit" for the classes the content scan happens to find, and
 * Vitest never builds. A guard that has to ask about a class nothing spells — a stock palette
 * probe, a class a component *might* write — needs the compiler itself, fed the same `index.css`
 * and the same `tailwindcss` package the build uses. `@import 'tailwindcss'` is the one import that
 * file makes, and a bare package name resolves through Node as the build's resolver does.
 */
export async function compileStylesheet(css: string, candidates: readonly string[]): Promise<string> {
  const compiler = await compile(css, {
    base: resolve(process.cwd(), 'src'),
    async loadStylesheet(id, base) {
      const path = id.startsWith('.') ? resolve(base, id) : require.resolve(`${id}/index.css`);
      return { path, base: dirname(path), content: await readFile(path, 'utf8') };
    },
  });
  return compiler.build([...candidates]);
}
