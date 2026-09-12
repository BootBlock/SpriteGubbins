import { existsSync } from 'node:fs';
import { basename, dirname, extname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { scannableSources, sourceText } from '../scripts/sourceFiles.ts';

/**
 * What a shared component owes: a suite of its own, beside it, that renders it.
 *
 * `src/utils/` is well tested because its contents are pure functions, and CLAUDE.md keeps them that
 * way on purpose. The components every view is built from are not pure, so testing one means
 * rendering it — and nothing asked for that, so the shared primitives and the app chrome were the
 * least tested code in the app that is not data (#210). `Modal` was one of them when every overlay
 * it frames dropped the keyboard to `<body>` on closing (#187): the defect is one assertion about
 * when `close()` runs, and `Modal` had no suite of its own to hold it.
 *
 * **These two directories, because of how far a defect in them reaches.** A primitive in `common/`
 * is where the DRY rule sends every other view, so one with no test is a defect at every call site
 * at once; a module in `layout/` is on screen in every view there is. A panel under a view directory
 * reaches only the views that render it, and is not held to this.
 *
 * **Colocated, and importing what it is named for.** A suite anywhere that merely mentions the
 * component is not the same claim: `Toast.test.tsx` imports `Modal` as a boundary to carry a toast
 * across, and asserts nothing of `Modal`'s own. A file named for the module that renders it is where
 * a reader looks first, and where the next defect's test goes without anyone having to decide.
 */
const SHARED_DIRECTORIES = ['src/components/common/', 'src/components/layout/'];

/**
 * The parts: a module lifted out of a shared component, whose behaviour its parents' suites assert.
 *
 * **A part is not a second primitive.** Nothing but the shared components it was lifted from renders
 * it, so a suite for it would render it without the state that gives it any behaviour — the card with
 * no trigger, the option with no list — or duplicate the parents' cases one for one. The guard still
 * checks the claim each entry makes rather than trusting it: the part has no suite of its own, the
 * modules importing it are exactly its named parents, and each of those has a suite.
 *
 * **Not a list of the untested.** A module earns a place here by being rendered only by its parents,
 * never by being small or declarative. A module a panel renders directly is a primitive, even one
 * written to serve a disclosure, as `SectionToggleAll` is.
 */
const PARTS: Readonly<Record<string, { readonly parents: readonly string[]; readonly reason: string }>> = {
  'src/components/common/ComboBoxOption.tsx': {
    parents: ['src/components/common/ComboBox.tsx'],
    reason: 'One row of the list, which has no highlight or selection outside the combo box that owns them.',
  },
  'src/components/common/ToastCard.tsx': {
    parents: ['src/components/common/Toast.tsx'],
    reason:
      'The card keyed per message, whose frozen offset is only observable across the remount Toast drives.',
  },
  'src/components/common/TooltipCard.tsx': {
    parents: ['src/components/common/Tooltip.tsx', 'src/components/common/ControlTooltip.tsx'],
    reason: 'The card both guidance triggers reveal, which exists only while one of them is showing it.',
  },
};

/** A path from the project root, with forward slashes. */
function projectPath(file: string): string {
  return relative(process.cwd(), file).replaceAll('\\', '/');
}

/** Every non-test module under the shared directories. */
function sharedModules(): string[] {
  return scannableSources()
    .map(projectPath)
    .filter((path) => SHARED_DIRECTORIES.some((directory) => path.startsWith(directory)))
    .filter((path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path));
}

/** The colocated suite for `module`, if one exists. */
function suiteFor(module: string): string | undefined {
  const stem = module.slice(0, -extname(module).length);
  return [`${stem}.test.tsx`, `${stem}.test.ts`].find((suite) => existsSync(resolve(process.cwd(), suite)));
}

/**
 * Whether `importer` imports a value from `module` through a relative specifier.
 *
 * A value, because `import type` brings in no component: a suite that only borrowed a prop type
 * would name the module and render nothing of it.
 */
function imports(importer: string, module: string): boolean {
  const specifier = `./${relative(dirname(importer), module).replaceAll('\\', '/')}`.replace(
    /^\.\/\.\.\//,
    '../',
  );
  // A relative path holds no regular-expression syntax but its dots.
  const valueImport = new RegExp(`^import (?!type )[^;]*? from '${specifier.replaceAll('.', '\\.')}';`, 'm');
  return valueImport.test(sourceText(resolve(process.cwd(), importer)));
}

describe('shared component suites', () => {
  it('scanned the directories it is meant to be scanning', () => {
    // A walk that found nothing — a moved directory, a changed `cwd` — would pass every case below
    // while reading no component at all.
    expect(sharedModules().length).toBeGreaterThan(20);
  });

  it('gives every shared component a colocated suite, or names the component it is a part of', () => {
    const missing = sharedModules().filter((module) => suiteFor(module) === undefined && !(module in PARTS));

    expect(missing).toStrictEqual([]);
  });

  it('renders the component each suite is named for', () => {
    const unrelated = sharedModules().flatMap((module) => {
      const suite = suiteFor(module);
      return suite === undefined || imports(suite, module)
        ? []
        : [`${suite} imports no value from ${basename(module)}`];
    });

    expect(unrelated).toStrictEqual([]);
  });

  it.each(Object.entries(PARTS))('holds %s to the part it claims to be', (part, { parents }) => {
    expect(sharedModules()).toContain(part);
    // A part that has grown a suite of its own is a primitive now, and its entry is stale.
    expect(suiteFor(part)).toBeUndefined();

    const importers = scannableSources()
      .map(projectPath)
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file) && file !== part)
      .filter((file) => imports(file, part));
    expect(importers.sort()).toStrictEqual([...parents].sort());

    for (const parent of parents) expect(suiteFor(parent), `${parent} has no suite`).toBeDefined();
  });
});
