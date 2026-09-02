import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MD_BREAKPOINT_PX, readColumnSplit, stickyVariantsOf } from './columnSplit.ts';
import { SELECT_MIN_PX } from './selectLabelBudget.ts';

/**
 * The quantiser's two-column split may not engage before its control column can render a budgeted
 * select — and its preview column may not grow one, nor lose the two panes side by side.
 *
 * The same failure the studio's split was fixed for, in a tab that reaches it a different way. The
 * quantiser is a workspace: ten control panels above the two previews they change, so tuning a dial
 * meant scrolling away from the only thing that says whether the tuning helped. The split is the
 * answer, and it is **5/7 rather than even** because only one column holds a `SelectField`. That
 * asymmetry is what this file has to keep true, in three directions:
 *
 * - the five-track control column still clears {@link SELECT_MIN_PX} at the width it appears, and so
 *   does the `max-w-*` wrapper each of its selects sits in — the wrapper is 6px from binding, and it
 *   is a construct the studio's panels do not have, so the shared derivation cannot see it. *Which*
 *   selects those are is followed from the tab's own imports rather than listed, for the reason the
 *   preview column's assertion is: a list written by hand goes stale in both directions at once;
 * - the seven-track preview column still holds no select, so the width it was given away is width
 *   nothing in it needs. A select added to the comparison toolbar would silently invalidate the
 *   breakpoint rather than fail anywhere, which is why that assertion follows the column's imports
 *   rather than naming the panels it expects to find there;
 * - the two comparison panes still sit side by side in that column. They are laid out by a container
 *   query rather than a viewport one, and its threshold has to stay under the narrowest the column
 *   ever is — otherwise the split silently stacks the very panes it was built to keep in view.
 */
const TAB_FILE = 'src/components/tabs/QuantiseTab.tsx';
/**
 * Where the split itself is written: the grid, both track spans and the sticky column.
 *
 * Not the tab, and the two are named apart on purpose. The import walks start at the tab, because
 * what they ask is whether *anything* either column can render holds a select — a question the
 * workspace's own imports would answer too narrowly the moment a panel moved. The measurements
 * start here, because these are the classes that decide how wide a column is, and a derivation
 * pointed at a file that no longer states them throws rather than measuring the wrong thing.
 */
const SPLIT_FILE = 'src/components/quantise/QuantiseWorkspace.tsx';
const PREVIEW_ROOT = 'src/components/quantise/ImageComparison.tsx';
const SELECT_FIELD = 'src/components/common/SelectField.tsx';

/** The root font size every `rem` resolves against. */
const ROOT_FONT_PX = 16;

/** Tailwind's `max-w-*` container ladder, over the range a control wrapper plausibly sits in. */
const CONTAINER_WIDTHS_PX: Readonly<Record<string, number>> = {
  xs: 320,
  sm: 384,
  md: 448,
  lg: 512,
  xl: 576,
  '2xl': 672,
};

function read(file: string): string {
  return readFileSync(resolve(process.cwd(), file), 'utf8');
}

/**
 * Every file the tab can render, mapped to the file that renders it, through relative imports.
 *
 * The importer is recorded breadth-first, so a file's parent is the shallowest route to it — which
 * is what lets a select nested inside another component be charged to the panel around it.
 */
function importGraph(entry: string): ReadonlyMap<string, string | undefined> {
  const parents = new Map<string, string | undefined>([[entry, undefined]]);
  const queue = [entry];
  for (let index = 0; index < queue.length; index += 1) {
    const file = queue[index];
    if (file === undefined) continue;
    for (const match of read(file).matchAll(/from '(\.[^']*\.tsx?)'/g)) {
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

/**
 * Every file the preview column can render, followed through relative imports from its root.
 *
 * A named list of panels would answer the wrong question: what matters is not which components are
 * in the column today but whether *anything* reachable from it puts a native `<select>` in there.
 */
function reachableFrom(entry: string): readonly string[] {
  return [...importGraph(entry).keys()];
}

const TAB_GRAPH = importGraph(TAB_FILE);

/**
 * Every file the tab reaches that renders a `SelectField`, discovered rather than listed.
 *
 * A hand-kept list is the wrong instrument here for the reason it is wrong for the preview column,
 * and this file already had the proof: the list named `GridControls`, which holds no select at all,
 * and omitted `AntiAliasControls`, which holds two — so a third of the tab's selects had their
 * wrapper priced by nothing, and one of the four iterations ran its body zero times. A panel added
 * to the column now arrives checked, and one that loses its last select stops being iterated.
 *
 * The walk starts at the tab rather than at the control column, which is conservative in the only
 * direction that matters: nothing either column renders is outside it, so a select that turned up
 * in the preview column is caught here too rather than only by the assertion written for it below.
 * What it follows is a static, relative `from '…'` specifier — an aliased or dynamically imported
 * panel would be invisible to it, and neither exists anywhere the tab reaches.
 */
const SELECT_FILES = [...TAB_GRAPH.keys()].filter((file) => /<SelectField\b/.test(read(file))).sort();

/**
 * The panel a select's chrome is charged to: its own file, or the nearest importer holding a
 * `<section>`.
 *
 * `DownscaleControls` is why this climbs rather than taking the file at face value — it is not a
 * panel, it renders inside `GridControls`, and the chrome that matters is the `<section>` around it.
 * A select in no panel at all throws, because `readColumnSplit` would then measure a column whose
 * chrome nothing had accounted for.
 *
 * The climb follows one importer per file, so a select put in a component that several panels share
 * would be charged to whichever reaches it first. Nothing in `src/components/common/` renders one,
 * and the four panels spend identical chrome, so the question does not arise today — but a shared
 * control that grew a select would need a panel apiece rather than a deeper climb.
 */
function panelOf(file: string): string {
  let current: string | undefined = file;
  while (current !== undefined) {
    if (/<section className="/.test(read(current))) return current;
    current = TAB_GRAPH.get(current);
  }
  throw new Error(`${file} renders a SelectField inside no panel whose chrome this can measure`);
}

/** The panels those selects are charged to, each measured on its own by `readColumnSplit`. */
const SELECT_PANEL_FILES = [...new Set(SELECT_FILES.map(panelOf))].sort();

const split = readColumnSplit({
  tabFile: TAB_FILE,
  splitFile: SPLIT_FILE,
  panelFiles: SELECT_PANEL_FILES,
  columns: 2,
});

describe('quantise column width', () => {
  /** The page padding the derivation reads is the `md:` one, which only holds if `md` is in force. */
  it('splits above the breakpoint whose padding the derivation reads', () => {
    expect(split.splitWidthPx).toBeGreaterThanOrEqual(MD_BREAKPOINT_PX);
  });

  /**
   * The narrower column is measured rather than the control column by name, because the two are the
   * same column and only one of those facts can be read out of the classes. Were the spans ever
   * swapped, this measures the preview column instead — a stricter test than the tab needs, never a
   * looser one.
   */
  it('gives the control column its full select budget at the width it first appears', () => {
    const narrowest = Math.min(...split.spans);
    expect(split.contentWidthAt(narrowest, split.splitWidthPx)).toBeGreaterThanOrEqual(SELECT_MIN_PX);
  });

  /**
   * The column is not the last thing between the page and the control. Each of these selects sits in
   * a `max-w-md` wrapper so it does not stretch the width of a stacked panel, and 448px against a
   * 442px budget is six pixels of headroom — the tightest constraint in the tab, and one the shared
   * derivation never sees, because the studio's panels have no such wrapper. Narrowing it to
   * `max-w-sm` would truncate every budgeted label while every other test here stayed green.
   */
  it('gives a select its full budget inside its own wrapper', () => {
    for (const file of SELECT_FILES) {
      const source = read(file);
      const wrappers = [...source.matchAll(/className="([^"]*)">\s*<SelectField/g)].map((m) => m[1] ?? '');
      const selects = [...source.matchAll(/<SelectField\b/g)].length;
      // A select in a wrapper this pattern cannot see would be measured by nothing at all.
      expect(wrappers, `${file}: every SelectField must sit in a wrapper this test can read`).toHaveLength(
        selects,
      );
      for (const classes of wrappers) {
        const token = /\bmax-w-([\w-]+)\b/.exec(classes)?.[1];
        // No cap is not a failure: the select then takes the column, which the assertion above binds.
        if (token === undefined) continue;
        const capPx = CONTAINER_WIDTHS_PX[token];
        if (capPx === undefined) throw new Error(`${file}: unrecognised wrapper cap \`max-w-${token}\``);
        expect(capPx, `${file}: \`max-w-${token}\` is narrower than a budgeted label`).toBeGreaterThanOrEqual(
          SELECT_MIN_PX,
        );
      }
    }
  });

  /**
   * A discovery that found nothing would pass every assertion above it, so it is checked against
   * both shapes it has to find: a panel rendering a select directly, and one rendering it through
   * another component. `AntiAliasControls` is the first — it is also the panel the hand-kept list
   * this replaced left out. `DownscaleControls` is the second, two imports deep, and its chrome is
   * charged to the `GridControls` section around it rather than to a file that has none.
   */
  it('discovers the panels holding a select rather than naming them', () => {
    expect(SELECT_FILES).toContain('src/components/quantise/AntiAliasControls.tsx');
    expect(SELECT_FILES).toContain('src/components/quantise/DownscaleControls.tsx');
    expect(SELECT_PANEL_FILES).toContain('src/components/quantise/GridControls.tsx');
    expect(SELECT_PANEL_FILES).not.toContain('src/components/quantise/DownscaleControls.tsx');
  });

  /** The asymmetry the 5/7 split is spending: the wide column is the one with nothing to truncate. */
  it('keeps every select out of the preview column', () => {
    expect(reachableFrom(PREVIEW_ROOT)).not.toContain(SELECT_FIELD);
  });

  /**
   * A test that cannot fail is worse than no test, so the walk is checked against a column that does
   * reach one. `GridControls` renders `DownscaleControls`, which renders the select — two imports
   * deep, which is also the depth a toolbar select would appear at.
   */
  it('finds a select the control column does reach', () => {
    expect(reachableFrom('src/components/quantise/GridControls.tsx')).toContain(SELECT_FIELD);
  });

  /**
   * The walk is only honest from the right root, and that root is named by hand here. This is what
   * keeps the name true: the sticky column renders one component, and if a second ever joins it the
   * assertion above stops covering the column it claims to.
   */
  it('renders nothing in the preview column but the panel the walk starts from', () => {
    // Anchored on the closing tag's own indent, not `\s*`, and the difference is the whole of what
    // this asserts. The capture is lazy, so a loose anchor stops at the *first* `</div>` inside the
    // column — and since `<ImageComparison` is its first element, a second component added after a
    // nested `<div>` would sit outside the capture and `toStrictEqual(['ImageComparison'])` would
    // still pass. Six spaces because the column moved one component out of the tab, which is one
    // level of indentation less than it had.
    const column = /quantise:sticky[^"]*"[^>]*>([\s\S]*?)\n {6}<\/div>/.exec(read(SPLIT_FILE))?.[1];
    if (column === undefined) throw new Error('could not read the sticky column — its markup has changed');
    const rendered = [...new Set([...column.matchAll(/<([A-Z]\w*)/g)].map((match) => match[1]))];
    expect(rendered).toStrictEqual(['ImageComparison']);
  });

  /**
   * The two panes are laid out by a container query, and the threshold has to clear the narrowest
   * box the split ever hands them: the preview column at the breakpoint itself. A viewport query is
   * what used to decide this, and it stopped describing the box the moment the panel became a
   * column — `lg` reporting a 1400px page while the panel it governed was 674px.
   */
  it('keeps the two comparison panes side by side in the preview column', () => {
    const source = read(PREVIEW_ROOT);
    expect(source, 'the pane grid must be inside a query container').toContain('@container');
    const threshold = /@\[([\d.]+)rem\]:grid-cols-2/.exec(source)?.[1];
    if (threshold === undefined) throw new Error("could not read the pane grid's container threshold");
    const widest = Math.max(...split.spans);
    expect(Number(threshold) * ROOT_FONT_PX).toBeLessThanOrEqual(
      split.contentWidthAt(widest, split.splitWidthPx),
    );
  });

  it('makes the preview sticky on the same condition as the split', () => {
    const sticky = stickyVariantsOf(SPLIT_FILE);
    expect(sticky.sticky).toBe(split.variant);
    expect(sticky.scroll).toBe(split.variant);
  });
});
