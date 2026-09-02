import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scannableSources } from '../scripts/sourceFiles.ts';

/**
 * No sticky column may state how tall the header is.
 *
 * `Header` measures its own bar and publishes it as `--header-height`, and the reason it measures
 * rather than declares is written out beside the `scroll-padding-top` rule that consumes it: the bar
 * is `flex-wrap`, so it is genuinely two or three rows tall on a narrow viewport, and a figure
 * written down is wrong at every width but one — and stale the first time a control joins the bar.
 *
 * Every sticky column then wrote one down anyway. Four figures between the two preview columns, the
 * second of each pair prefixed with a *page* width standing in for the width at which the bar stops
 * wrapping, so the column either overlapped the chrome or floated a gap below it and nothing
 * rendered wrong enough to fail anything. The preset library carried a fifth, in a tab nobody was
 * looking at while the other two were being fixed.
 *
 * **So the columns are found rather than listed.** A named list is what left that fifth figure
 * behind, and it is the same list a sixth column would not be added to. Anything under `src/` whose
 * class string carries a variant-prefixed `:sticky` is swept, and the sweep fails if it finds fewer
 * than the three that exist — so a column that stops being recognised is a failure rather than a
 * silent gap in the coverage.
 *
 * Each is asserted negatively as well as positively: not only that the derived properties are used,
 * but that the element carries no length of its own for the browser to prefer.
 */
const CSS_FILE = 'src/index.css';
const APP_FILE = 'src/App.tsx';
const DETACHED_FILE = 'src/components/quantise/DetachedPreview.tsx';

/**
 * How many sticky columns the app has: the studio's preview, the quantiser's, and the preset
 * library's sidebar. The floor exists so a column the sweep can no longer see fails here instead of
 * quietly dropping out of the coverage — which is exactly how the fifth figure survived.
 */
const STICKY_COLUMN_COUNT = 3;

/** The root font size every `rem` in the theme resolves against. */
const ROOT_FONT_PX = 16;

/**
 * The taller of the two heights the bar has been measured at in Edge — two rows, at 130px.
 *
 * It is here only to bound the fallback below, which is the one figure in this arrangement that is
 * still written down. Nothing else may consult it: the whole point of the measurement is that the
 * app never needs to know the number.
 */
const MEASURED_TWO_ROW_HEADER_PX = 130;

function read(file: string): string {
  return readFileSync(resolve(process.cwd(), file), 'utf8');
}

/**
 * Every sticky column in the app, as `[file, class string]`.
 *
 * The header itself is deliberately outside this: it is `sticky top-0` with no variant prefix,
 * because it *is* the chrome the columns are clearing rather than something that has to clear it.
 * The prefix is what separates the two, so it is what the pattern requires.
 *
 * `scannableSources` is the walk the other guard suites share, rather than another answer to what
 * counts as source — and it reaches `.ts` as well as `.tsx`, so a class string hoisted into a
 * constant is swept along with the JSX. Its own docblock names who else calls it; a count kept here
 * as well would be a second census, and the stale one is always the one being read.
 */
/**
 * The two arbitrary values a sticky column has to carry, held apart from the utility they belong to.
 *
 * Written whole they would be class names, and Tailwind reads this file as markup — so the suite
 * asserting that no column states a length of its own would put two unprefixed lengths into the
 * bundle for nothing to wear. The utility half is assembled at the call site with the column's own
 * variant prefix in front of it, which is where the two become a class again.
 */
const OFFSET_VALUE = '[var(--sticky-column-top)]';
const CAP_VALUE = '[var(--sticky-column-height)]';

function stickyColumns(): readonly (readonly [string, string])[] {
  const found: (readonly [string, string])[] = [];
  for (const file of scannableSources()) {
    for (const match of readFileSync(file, 'utf8').matchAll(
      /className="([^"]*\b[a-z][\w-]*:sticky\b[^"]*)"/g,
    )) {
      const classes = match[1];
      if (classes !== undefined) {
        found.push([relative(process.cwd(), file).replaceAll('\\', '/'), classes] as const);
      }
    }
  }
  return found;
}

describe('sticky column offset', () => {
  const columns = stickyColumns();

  /**
   * A sweep that finds nothing passes every assertion below it, so the count is asserted first —
   * and asserted as a floor rather than an equality, because a fourth sticky column is a thing to
   * cover, not a thing to fail.
   */
  it('finds every sticky column in the app', () => {
    expect(
      columns.length,
      `found ${String(columns.length)}: ${columns.map(([file]) => file).join(', ')}`,
    ).toBeGreaterThanOrEqual(STICKY_COLUMN_COUNT);
  });

  for (const [file, classes] of columns) {
    describe(file, () => {
      /**
       * The cap is conditional and the offset is not. Every sticky column has to clear the chrome;
       * only a column holding something that can outgrow the viewport needs capping, which the two
       * previews do and the preset library's handful of rows does not.
       */
      it('takes its offset from the measured header', () => {
        // Asserted with the column's own variant prefix in front of it, which is two things at
        // once. It is the stronger claim — an offset applying at every width would clear a
        // chrome the column is not yet sticky beneath — and it keeps this file from spelling a
        // whole class name, since the unprefixed forms are worn by nothing and Tailwind would
        // emit a rule for each of them from the assertion alone.
        const prefix = /\b([a-z][\w-]*):sticky\b/.exec(classes)?.[1] ?? '';
        expect(prefix, 'the sweep matched a prefixed `:sticky` this cannot read back').not.toBe('');
        expect(classes).toContain(`${prefix}:top-` + OFFSET_VALUE);
        if (/\bmax-h-/.test(classes)) expect(classes).toContain(`${prefix}:max-h-` + CAP_VALUE);
      });

      it('states no length of its own', () => {
        // A spacing step is a header height written down, and both retired offsets were one.
        // Spelling either of them here would be worse than useless: Tailwind scans comments, so
        // the file whose purpose is that no figure survives would keep them alive in the bundle.
        expect(classes, 'a numeric `top-*` is a header height in disguise').not.toMatch(/\btop-\d/);
        // Nothing here has ever worn a numeric `max-h-` step, and this is what keeps it that way:
        // the cap is the same figure from the other end, and a spacing step states it just as
        // firmly.
        expect(classes, 'a numeric `max-h-*` is the same figure from the other end').not.toMatch(
          /\bmax-h-\d/,
        );
        // An arbitrary length is the shape the two removed caps actually had.
        expect(classes, 'an arbitrary `top-*`/`max-h-*` may only be one of the two properties').not.toMatch(
          /\b(?:top|max-h)-\[(?!var\(--sticky-column-(?:top|height)\)\])/,
        );
      });

      /**
       * The `xl:` half is the part worth naming separately. It was not merely a second number, it
       * was the *approximation*: a page breakpoint chosen because the bar happens to stop wrapping
       * near it. With the height measured there is nothing left for it to approximate, and a class
       * inside a split column that measures the page is the mistake CLAUDE.md already names. Only
       * the two properties are held to this — a span or a gap may be prefixed however it likes.
       */
      it('decides neither offset nor cap by page width', () => {
        expect(classes).not.toMatch(/\bxl:(?:top|max-h)-/);
      });
    });
  }

  it('derives both properties from the height the header publishes', () => {
    const css = read(CSS_FILE);
    const top = /--sticky-column-top:\s*([^;]+);/.exec(css)?.[1];
    const height = /--sticky-column-height:\s*([^;]+);/.exec(css)?.[1];
    if (top === undefined || height === undefined) {
      throw new Error('could not read the two sticky column properties — three columns consume them');
    }
    expect(top).toContain('var(--header-height');
    expect(top).toContain('var(--page-gutter)');
    // The cap gives the offset back, so the two cannot drift: it is stated in terms of the offset.
    expect(height).toContain('var(--sticky-column-top)');
    expect(height).toContain('var(--page-gutter)');
  });

  /**
   * A sticky column at `top: 0` for a frame paints underneath the chrome, where its top is
   * unreachable rather than merely ugly — which is the one way this differs from
   * `scroll-padding-top`, where `0px` for a frame costs nothing. The fallback therefore errs large:
   * an over-estimate opens a gap that the first measurement closes, and an under-estimate hides the
   * column behind the bar.
   */
  it('falls back to a header height rather than to nothing', () => {
    const declaration = /--sticky-column-top:[^;]+;/.exec(read(CSS_FILE))?.[0];
    if (declaration === undefined) throw new Error('`--sticky-column-top` is not declared');
    const fallback = /--header-height,\s*([\d.]+)(rem|px)\)/.exec(declaration);
    if (fallback === null) throw new Error('the sticky offset names no fallback for `--header-height`');
    const px = Number(fallback[1]) * (fallback[2] === 'rem' ? ROOT_FONT_PX : 1);
    expect(px).toBeGreaterThanOrEqual(MEASURED_TWO_ROW_HEADER_PX);
  });

  /**
   * The gutter is the only part of the arithmetic that legitimately varies by viewport, so it is
   * declared once and spent everywhere — the page's padding, the room above each of the three
   * columns, the room below the two that are capped, and the detached window's own padding.
   * Reading it back out of `<main>` is what stops a copy of it appearing there.
   *
   * **The page container may name no padding but the token.** A second padding utility beside it
   * wins or loses by where the two land in the generated stylesheet, which no call site can see, and
   * `tests/columnSplit.ts` would go on deriving both column widths from the token's figure while the
   * page actually spent another. So every `p*-` utility is refused, not only the `p-4` this replaced.
   */
  it('spends one gutter on the page and on the columns alike', () => {
    const main = /<main[^>]*className="([^"]*)"/.exec(read(APP_FILE))?.[1];
    if (main === undefined) throw new Error("could not read the page container's classes");
    expect(main).toContain('p-[var(--page-gutter)]');
    const padding = main
      .split(/\s+/)
      .filter((token) => /^(?:[a-z][\w-]*:)?p[xytrbles]?-/.test(token) && token !== 'p-[var(--page-gutter)]');
    expect(padding, 'a second padding utility is a second statement of the gutter').toStrictEqual([]);
  });

  /**
   * Both halves of the gutter are asserted separately, because the `md` pattern alone is satisfied
   * by a stylesheet that declares the wider figure and nothing else. That state renders: every
   * viewport under 768px resolves `p-[var(--page-gutter)]` to nothing and the page loses its padding
   * on a phone, which is the one width the token was introduced to keep right.
   */
  it('declares the gutter at both widths, the narrower one first', () => {
    const css = read(CSS_FILE);
    const base = /:root \{[^}]*?--page-gutter:\s*([\d.]+)rem;/.exec(css)?.[1];
    const wide = /@media \(min-width: 48rem\) \{\s*:root \{\s*--page-gutter:\s*([\d.]+)rem;/.exec(css)?.[1];
    if (base === undefined) {
      throw new Error('`--page-gutter` has no base value — the page pads by nothing under `md`');
    }
    if (wide === undefined) {
      throw new Error('the gutter no longer steps at `md`, as the padding it replaced did');
    }
    expect(Number(base)).toBeLessThan(Number(wide));
  });

  /**
   * The detached window has no header at all, so its pane cap subtracts a different thing that
   * happened to be spelled the same — `100dvh - 10rem`, which is exactly what the two columns
   * carried. Copying a figure across a boundary like that is how one of them gets corrected and the
   * other does not, so this pins what it may name: the gutter, and its own panel's chrome.
   */
  it('leaves the detached window out of the header arithmetic', () => {
    const paneHeight = /\[--pane-height:([^\]]*)\]/.exec(read(DETACHED_FILE))?.[1];
    if (paneHeight === undefined) throw new Error("could not read the detached window's pane cap");
    expect(paneHeight).toContain('var(--page-gutter)');
    expect(paneHeight, 'the detached window has no chrome to clear').not.toContain('--header-height');
    expect(paneHeight, 'the sticky columns’ offset is not this window’s').not.toContain('--sticky-column');
  });
});
