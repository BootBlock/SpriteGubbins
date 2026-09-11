import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sourceText } from '../scripts/sourceFiles.ts';
import {
  classStrings,
  isPageWidthVariant,
  pageWidthClassesIn,
  pageWidthClassesInSource,
  variantsOf,
} from './pageWidthClasses.ts';
import { stickyColumns } from './stickyColumns.ts';

/**
 * Nothing a split renders may decide its layout by the page's width.
 *
 * The rule CLAUDE.md states as "a panel that becomes a column stops being described by a viewport
 * breakpoint", held for every split rather than for the one panel that was last caught. It was caught
 * twice before this existed: the quantiser's pane grid, which read a 1400px page while its box was
 * 674px, and `PromptPreview`, whose height cap came off at `lg` while the column bounding it appeared
 * at `studio:` — so at 1024px the studio was a 13,421px page (#191). The preset library's card grid
 * was the third, found by this suite's first run.
 *
 * **The splits are found rather than listed**, by their sticky columns: every split in the app has
 * one, its variant prefix is the variant the split engages at, and the file it is written in is the
 * file holding the grid. A split added with a sticky column is covered the moment it is written, in
 * whichever string literal its classes sit — and one whose classes are filed away from its grid fails
 * the grid assertion below rather than being walked from the wrong place.
 */

/** How many splits the app has: the studio, the quantiser and the preset library. A floor, not a census. */
const SPLIT_COUNT = 3;

const SPLITS: ReadonlyMap<string, string> = new Map(
  stickyColumns().map(([file, classes]) => {
    const variant = /\b([a-z][\w-]*):sticky\b/.exec(classes)?.[1];
    if (variant === undefined) throw new Error(`${file}: a sticky column whose prefix this cannot read back`);
    return [file, variant] as const;
  }),
);

/** Every file a named split's walk reaches — and a failure if the suite did not find that split. */
function reachedFrom(file: string): readonly string[] {
  const variant = SPLITS.get(file);
  if (variant === undefined) throw new Error(`${file} is not among the splits this suite found`);
  return pageWidthClassesIn(file, variant).files;
}

/** A class token assembled from halves, so this file does not spell a class the app never wears. */
function cls(...parts: readonly string[]): string {
  return parts.join(':');
}

describe('split page width', () => {
  it('finds every split in the app', () => {
    expect(SPLITS.size, [...SPLITS.keys()].join(', ')).toBeGreaterThanOrEqual(SPLIT_COUNT);
  });

  for (const [file, variant] of SPLITS) {
    describe(file, () => {
      /**
       * The walk's premise. Everything the file imports is rendered inside a column only while the
       * element it returns is the grid, so that is asserted rather than assumed — a wrapper added
       * around the grid would put whatever it renders outside the columns and inside the walk.
       */
      it('returns the grid its columns sit in', () => {
        const source = sourceText(resolve(process.cwd(), file));
        expect(source).toMatch(
          new RegExp(`return \\(\\s*<div className="grid [^"]*\\b${variant}:grid-cols-\\d+`),
        );
      });

      it('lays out nothing it renders by the page’s width', () => {
        expect(pageWidthClassesIn(file, variant).found).toStrictEqual([]);
      });
    });
  }

  /**
   * A walk that stopped short would pass every sweep above, so each is shown reaching the panel that
   * needed it. And one is shown stopping where it should: the quantiser's guide is rendered by the tab
   * above the split, as a full-width panel entitled to the page's breakpoints, and it holds two.
   */
  it('walks each split as far as the panels inside it, and no further', () => {
    expect(reachedFrom('src/components/tabs/StudioTab.tsx')).toContain(
      'src/components/studio/PromptPreview.tsx',
    );
    expect(reachedFrom('src/components/tabs/PresetLibrary.tsx')).toContain(
      'src/components/tabs/PresetCollectionPanel.tsx',
    );
    const quantise = reachedFrom('src/components/quantise/QuantiseWorkspace.tsx');
    expect(quantise).toContain('src/components/quantise/ImageComparison.tsx');
    expect(quantise).not.toContain('src/components/quantise/QuantiseGuide.tsx');
  });

  it('recognises a page breakpoint in every spelling Tailwind emits one for', () => {
    const breakpoints = ['lg', 'quantise'];
    const pageWidth = [
      'lg',
      'min-lg',
      'max-lg',
      'not-lg',
      'not-max-lg',
      'quantise',
      'min-[70rem]',
      'max-[70rem]',
      'not-min-[70rem]',
      '[@media(min-width:70rem)]',
    ];
    for (const variant of pageWidth) {
      expect(isPageWidthVariant(variant, breakpoints), variant).toBe(true);
    }
    const notPageWidth = [
      'studio',
      '@lg',
      '@max-lg',
      '@[34rem]',
      'hover',
      'xlg',
      'flag',
      'not-[.open]',
      '[@media(hover:hover)]',
    ];
    for (const variant of notPageWidth) {
      expect(isPageWidthVariant(variant, breakpoints), variant).toBe(false);
    }
  });

  it('reads a token’s variants without splitting inside brackets', () => {
    expect(variantsOf(cls('group-hover', 'lg', 'flex-1'))).toStrictEqual(['group-hover', 'lg']);
    expect(variantsOf(cls('[&', 'hover]', 'lg', 'flex-1'))).toStrictEqual(['[&:hover]', 'lg']);
    expect(variantsOf('flex-1')).toStrictEqual([]);
  });

  /**
   * The exemption is the part a text search got wrong. A `fixed` elsewhere in a template — on one
   * branch of it, or in a later string the search ran on into — passed a class that was never on a
   * fixed box. The string a class sits in is the unit, and a string inside `${…}` is its own.
   */
  it('passes a page breakpoint only on a string that is unconditionally fixed', () => {
    const breakpoints = ['sm', 'lg'];
    const found = (source: string) => pageWidthClassesInSource(source, breakpoints);

    expect(found(`className="flex ${cls('lg', 'flex-1')}"`)).toStrictEqual([cls('lg', 'flex-1')]);
    expect(found(`className="fixed inset-x-4 ${cls('sm', 'bottom-6')}"`)).toStrictEqual([]);
    expect(found('className={`absolute ' + cls('lg', 'top-0') + " ${pinned ? 'fixed' : ''}`}")).toStrictEqual(
      [cls('lg', 'top-0')],
    );
    expect(
      found('className={`${a ? "b" : "c"} ' + cls('lg', 'top-0') + '`}\nconst x = `fixed`;'),
    ).toStrictEqual([cls('lg', 'top-0')]);
    expect(found("className={`flex ${open ? '" + cls('lg', 'flex-1') + "' : ''}`}")).toStrictEqual([
      cls('lg', 'flex-1'),
    ]);
    expect(found(`className="${cls('@lg', 'flex-1')} ${cls('studio', 'flex-1')}"`)).toStrictEqual([]);
  });

  it('reads a template’s own text and each string inside it apart', () => {
    expect(classStrings("x = `a ${b ? 'c' : `d ${'e'}`} f`")).toStrictEqual(['c', 'e', 'd  ', 'a   f']);
  });
});
