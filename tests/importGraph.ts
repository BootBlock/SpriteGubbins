import { dirname, relative, resolve } from 'node:path';
import { sourceText } from '../scripts/sourceFiles.ts';

/**
 * Every file `entry` can render, mapped to the file that imports it, through relative imports.
 *
 * The importer is recorded breadth-first, so a file's parent is the shallowest route to it — which
 * is what lets a select nested inside another component be charged to the panel around it.
 *
 * Two guards follow a split's imports for different questions — whether a column can hold a select,
 * and whether anything a split renders decides its layout by the page's width — so the walk is shared
 * rather than written into each. What it follows is a static, relative `from '…'` specifier: an
 * aliased or dynamically imported component would be invisible to it, and neither exists anywhere a
 * split reaches.
 */
export function importGraph(entry: string): ReadonlyMap<string, string | undefined> {
  const parents = new Map<string, string | undefined>([[entry, undefined]]);
  const queue = [entry];
  for (let index = 0; index < queue.length; index += 1) {
    const file = queue[index];
    if (file === undefined) continue;
    for (const match of sourceText(resolve(process.cwd(), file)).matchAll(/from '(\.[^']*\.tsx?)'/g)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      const imported = relative(process.cwd(), resolve(dirname(file), specifier)).replaceAll('\\', '/');
      if (parents.has(imported)) continue;
      parents.set(imported, file);
      queue.push(imported);
    }
  }
  return parents;
}
