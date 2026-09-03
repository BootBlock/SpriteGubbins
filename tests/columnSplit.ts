import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A tab's two-column split, read out of the classes that actually produce it.
 *
 * Two tabs now split, and both land a `SelectField` in a column — the studio's form and target
 * model, and four of the quantiser's control panels. A native `<select>` sizes
 * its selected option from its container and truncates rather than wrapping, so a column holding
 * one has a hard minimum — `SELECT_MIN_PX` in `selectLabelBudget.ts` — and a split that engages
 * below it creates the control that clips every label `select-option-labels.test.ts` approved. That
 * is not a hypothetical: the studio's split shipped at `lg`, 16px under its own budget.
 *
 * **Everything here is parsed rather than restated**, because a derivation that repeats the numbers
 * only proves the copy inside it is self-consistent. Widening a gutter, moving the page cap,
 * re-spanning a column or re-padding a panel each either recompute the answer or fail loudly.
 *
 * The two tabs differ in *which* column binds — the studio's split is even and both columns hold a
 * select, while the quantiser's is 5/7 and only the narrow one does — so this module stops at
 * measuring a span. Which span has to clear the budget is each tab's own claim, asserted in its own
 * test file.
 */

/** Tailwind's spacing scale: `p-5`, `gap-6` and friends are the step in quarter-rems. */
const SPACING_STEP_PX = 4;

/** The root font size every `rem` in the theme resolves against. */
const ROOT_FONT_PX = 16;

/** The stock breakpoint the page's own padding is prefixed with, and the floor for any split. */
export const MD_BREAKPOINT_PX = 768;

/** Tailwind's `max-w-*` ladder, in px, over the range a page container plausibly sits in. */
const MAX_WIDTHS_PX: Readonly<Record<string, number>> = {
  '3xl': 768,
  '4xl': 896,
  '5xl': 1024,
  '6xl': 1152,
  '7xl': 1280,
};

/** Tailwind's stock responsive variants, for when a split is prefixed with one of them. */
const STOCK_BREAKPOINTS_PX: Readonly<Record<string, number>> = {
  sm: 640,
  md: MD_BREAKPOINT_PX,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

/**
 * The one capture group a pattern must find, or the layout this derivation describes has moved.
 *
 * Throwing rather than falling back is the point: a silent miss would feed the arithmetic a
 * fabricated input and report the result as a pass.
 */
/**
 * The first element a tab's `return (` opens, whatever stands between the two.
 *
 * Whitespace, a block comment and a fragment are all skipped, and nothing else is: a tab whose
 * column content sits under a `<>` beside a page-level surface — `QuantiseTab`, whose drop veil is
 * `position: fixed` and must not take a `space-y-*` margin from the column — still has exactly one
 * element on the path down to the grid, and it is this one. Anything else opening the tree fails the
 * capture rather than being skipped past, because a second element there would be an ancestor this
 * derivation had stopped reading.
 */
const ROOT_ELEMENT = /return \((?:\s|\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}|<>)*<div className="([^"]*)"/;

function capture(source: string, pattern: RegExp, what: string): string {
  const value = pattern.exec(source)?.[1];
  if (value === undefined) throw new Error(`could not read ${what} — what it describes has changed`);
  return value;
}

function spacing(step: string): number {
  return Number(step) * SPACING_STEP_PX;
}

interface ColumnSplitOptions {
  /** The tab component whose grid, page position and column spans are being read. */
  readonly tabFile: string;
  /**
   * Every panel whose chrome a select in the split is charged to.
   *
   * Not the same set as "every file holding a `SelectField`", and the difference is what the
   * quantiser's `GridControls` is: it renders no select itself and wraps a component that renders
   * two, so it is the `<section>` those two are measured inside. A caller that named only the files
   * holding a select would leave that chrome unmeasured.
   *
   * Each is measured on its own, because chrome and any control sharing the select's row belong to
   * one panel apiece and the widest of each need not be the same panel. `contentWidthAt` still
   * charges the widest chrome for the claims that are about a column rather than a control.
   */
  readonly panelFiles: readonly string[];
  /**
   * Where the grid itself is written, when a component below the tab holds it.
   *
   * Defaults to `tabFile`, which is the studio's arrangement: it returns its grid directly, so one
   * file states the tab's position on the page and the split's own classes. The quantiser's grid is
   * in `QuantiseWorkspace`, one component down, because everything the split holds only exists once
   * a sheet is loaded.
   *
   * **Naming it does not move the cap refusal below off the tab.** That check walks from the page
   * container to the grid, so a second component on that path is a second root that could cap the
   * width — which is exactly what a split into two files adds. Both roots are read.
   */
  readonly splitFile?: string;
  /** How many `:col-span-*` children the grid is expected to have. */
  readonly columns: number;
}

/** One panel in the split, and what it spends before a control of its own gets any width. */
interface SplitPanel {
  readonly file: string;
  /** The panel's own padding and border, both sides. */
  readonly chromePx: number;
  /**
   * What a control *sharing a row with the select* takes, or zero.
   *
   * Read from the panel rather than assumed, because it is the one term that belongs to a single
   * panel. Charging it against the tab's **widest** chrome — which is a different panel — overstates
   * the requirement by the difference between the two, and the budget this feeds is exact rather
   * than cushioned: in the studio that mistake was 8px, which is two characters of the 8px mono
   * advance the whole budget rests on.
   */
  readonly actionPx: number;
}

interface ColumnSplit {
  /** The responsive variant the columns engage at, whether stock or a `--breakpoint-*` token. */
  readonly variant: string;
  /** The viewport width that variant turns on at. */
  readonly splitWidthPx: number;
  /** The spans found, in source order. */
  readonly spans: readonly number[];
  /** The panels named, each with what it spends before its own controls. */
  readonly panels: readonly SplitPanel[];
  /** How wide a column of `span` tracks is at a given viewport, before any panel's chrome. */
  readonly columnWidthAt: (span: number, viewportPx: number) => number;
  /**
   * The same column, less the **widest** chrome any of the named panels spends.
   *
   * The conservative column-wide figure, for a claim about the column rather than about one control
   * in it. A budget belonging to a particular control takes `columnWidthAt` and that panel's own two
   * terms instead — see `studio-column-width.test.ts`, where the difference is a real 8px.
   */
  readonly contentWidthAt: (span: number, viewportPx: number) => number;
}

export function readColumnSplit({
  tabFile,
  panelFiles,
  splitFile = tabFile,
  columns,
}: ColumnSplitOptions): ColumnSplit {
  const split = read(splitFile);
  const app = read('src/App.tsx');
  const css = read('src/index.css');

  // The grid: which variant splits it, how many tracks it has, and how wide the gutters are.
  const gridClasses = capture(split, /className="grid ([^"]*)"/, `the grid's classes in ${splitFile}`);
  const variant = capture(gridClasses, /([a-z][\w-]*):grid-cols-\d+/, 'the variant the columns engage at');
  const trackCount = Number(capture(gridClasses, /:grid-cols-(\d+)/, "the grid's track count"));
  const gapPx = spacing(capture(gridClasses, /\bgap-(\d+)\b/, "the grid's gutter"));

  /*
    A column left on a different variant lands here as a missing span rather than a wrong number,
    and a tab that quietly grew a third would be measured against two. Both are the kind of input
    whose absence passes, so both throw.
  */
  const spans = [...split.matchAll(new RegExp(`${variant}:col-span-(\\d+)`, 'g'))].map((match) =>
    Number(match[1]),
  );
  if (spans.length !== columns) {
    throw new Error(
      `expected ${String(columns)} \`${variant}:col-span-*\` columns in ${splitFile}, found ` +
        `${String(spans.length)} — a column on another variant would appear and disappear at a ` +
        'different width from the grid',
    );
  }

  // The page container the grid resolves against.
  const mainClasses = capture(app, /<main[^>]*className="([^"]*)"/, "the page container's classes");
  const capToken = capture(mainClasses, /\bmax-w-([\w-]+)\b/, "the page's width cap");
  const capEntry = MAX_WIDTHS_PX[capToken];
  if (capEntry === undefined) throw new Error(`unrecognised page cap \`max-w-${capToken}\``);
  /*
    Re-bound with the type the check just established, because `columnWidthAt` below reads it and is
    a hoisted `function` declaration. TypeScript carries a `const`'s narrowing into a closure created
    after the narrowing — measured on the repo's own 6.0.3, an arrow reading `capEntry` compiles
    clean — but a hoisted declaration may run before the check, so the narrowing is dropped there and
    the closure sees `number | undefined` again.

    Annotating rather than turning `columnWidthAt` into a `const` arrow, which would also compile:
    the annotation states what the reader needs at the point the value is bound, instead of resting
    the file on a hoisting rule nothing in it mentions. It is not a cast — the compiler still checks
    that `capEntry` is assignable here — and it invents no fallback, which is the fabricated input
    `capture` refuses on the same page.
  */
  const pageCapPx: number = capEntry;
  /*
    The page's padding is `--page-gutter`, not a spacing utility: `<main>` spends it, and so do the
    two sticky preview columns, which leave that much room above and below themselves. It is read
    from the stylesheet's `md` override, because that is the figure in force wherever a split
    engages — both breakpoints sit far above `md`, which each tab asserts about its own.
  */
  if (!/\bp-\[var\(--page-gutter\)\]/.test(mainClasses)) {
    throw new Error(
      'the page container no longer pads itself with `--page-gutter` — this derivation reads that ' +
        'token for the room a column has, so a padding written any other way is unmeasured here',
    );
  }
  const pagePadPx =
    Number(
      capture(
        css,
        /@media \(min-width: 48rem\) \{\s*:root \{\s*--page-gutter:\s*([\d.]+)rem/,
        "the page gutter's `md` value",
      ),
    ) * ROOT_FONT_PX;

  /*
    The page cap is only the grid's cap while nothing between them narrows it. A `max-w-*` anywhere
    on the way down gives every column less than this arithmetic assumes — and the quantiser held
    itself to the 6xl cap until the split arrived, where a 5/7 column could not have reached the
    budget at any viewport. So a cap is refused rather than quietly absorbed.

    **Every root on the way down is read, because they are not one element.** The studio returns its
    grid directly, so reading its root reads the grid; the quantiser's grid is nested inside a
    wrapper, and a cap written on the grid itself would have gone unseen — in exactly the tab this
    guard was written for. A tab whose split lives in a component of its own has **two** such roots,
    and reading only the one holding the grid is the same hole one file down: measured, capping
    `QuantiseTab`'s own root at `max-w-3xl` puts its 5/12 control column at ~300px against a 442px
    budget, and every assertion in that tab's file still passed. So the list is built from the files
    actually on the path, deduplicated where a tab states its own grid.
  */
  const rootsOnThePath = [...new Set([tabFile, splitFile])].map(
    (file) =>
      [`${file}'s root element`, capture(read(file), ROOT_ELEMENT, `${file}'s root element`)] as const,
  );
  for (const [what, classes] of [...rootsOnThePath, [`${splitFile}'s grid`, gridClasses] as const]) {
    if (/\bmax-w-/.test(classes)) {
      throw new Error(
        `${what} caps its own width (\`${classes}\`) — the split's columns are then narrower ` +
          'than the page cap this derivation reads, so the breakpoint stops describing what a select gets',
      );
    }
  }

  /*
    The chrome a panel spends before its controls — the widest of those holding a select binds.

    Empty is refused for the reason the span count is: `Math.max()` of nothing is `-Infinity`, so a
    caller that stopped naming its panels would subtract negative infinity and report every column as
    infinitely wide. That is the second input whose *absence* would sail through the budget.
  */
  if (panelFiles.length === 0) {
    throw new Error(`no panels named for ${tabFile} — a column with no measured chrome clears any budget`);
  }
  const panels: readonly SplitPanel[] = panelFiles.map((file) => {
    const source = read(file);
    const classes = capture(source, /<section className="([^"]*)"/, `${file}'s panel`);
    const padding = spacing(capture(classes, /\bp-(\d+)\b/, `${file}'s panel padding`));
    return {
      file,
      chromePx: 2 * (padding + (/\bborder\b/.test(classes) ? 1 : 0)),
      // Parsed rather than named by the caller, so a second panel putting a control beside its
      // select is charged for it the moment it does, and one that stops stops being charged.
      actionPx: /\baction=\{/.test(source) ? selectActionWidthPx() : 0,
    };
  });
  const panelChromePx = Math.max(...panels.map((panel) => panel.chromePx));

  /** Where the split engages: a stock breakpoint, or a `--breakpoint-*` token in the theme. */
  const splitWidthPx =
    STOCK_BREAKPOINTS_PX[variant] ??
    Number(
      capture(
        css,
        new RegExp(`--breakpoint-${variant}:\\s*([\\d.]+)rem`),
        `the \`--breakpoint-${variant}\` token`,
      ),
    ) * ROOT_FONT_PX;

  function columnWidthAt(span: number, viewportPx: number): number {
    const content = Math.min(pageCapPx, viewportPx) - 2 * pagePadPx;
    const track = (content - (trackCount - 1) * gapPx) / trackCount;
    return span * track + (span - 1) * gapPx;
  }

  return {
    variant,
    splitWidthPx,
    spans,
    panels,
    columnWidthAt,
    contentWidthAt(span, viewportPx) {
      return columnWidthAt(span, viewportPx) - panelChromePx;
    },
  };
}

/**
 * The sticky preview column has to appear on the same condition as the split it sits in.
 *
 * A separate set of classes on a separate element, so nothing but this stops the two drifting
 * apart — and while they disagree there is a band where the columns have stacked but the preview is
 * still capped to the viewport and scrolling inside it.
 */
export function stickyVariantsOf(tabFile: string): { readonly sticky: string; readonly scroll: string } {
  const tab = read(tabFile);
  return {
    sticky: capture(tab, /([a-z][\w-]*):sticky\b/, `the sticky column in ${tabFile}`),
    scroll: capture(tab, /([a-z][\w-]*):overflow-y-auto\b/, `the sticky column's scroll cap in ${tabFile}`),
  };
}

/**
 * What a `SelectField` carrying an action has left over for the control itself — the gutter and the
 * button, in px.
 *
 * One select in the app has a control beside it: the target model's, whose generator has a page the
 * link button opens. A native `<select>` sizes its selected option from its container and truncates
 * the *tail* — the parenthetical marking the standard choice — so those pixels come straight off
 * `SELECT_MIN_PX`, and a row that spends them without saying so is how a label clips at one viewport
 * and not another.
 *
 * **Parsed rather than restated**, like the split above: widening the row's gutter or resizing the
 * button recomputes this, and a rewrite that leaves neither where this can find it throws instead of
 * quietly reporting nothing.
 */
export function selectActionWidthPx(): number {
  const gapPx = spacing(
    capture(
      read('src/components/common/SelectField.tsx'),
      /className="flex items-center gap-(\d+)">\s*<select/,
      "the gutter between a `SelectField`'s control and its action",
    ),
  );
  const buttonPx = spacing(
    capture(
      read('src/components/studio/GeneratorSiteLink.tsx'),
      /const BUTTON =\s*'[^']*?\bw-(\d+)\b/,
      "the generator link button's width",
    ),
  );
  return gapPx + buttonPx;
}
