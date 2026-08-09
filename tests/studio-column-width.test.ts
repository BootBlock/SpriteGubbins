import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SELECT_MIN_PX } from './selectLabelBudget.ts';

/**
 * The studio's two-column split may not engage before its columns can render a budgeted select.
 *
 * `select-option-labels.test.ts` holds every option label to 50 characters; this holds the layout to
 * the 442px those characters need. Only the first of the two ever existed, which is how the split
 * came to start at `lg` (1024px) while the column it produced there was 434px — every select in the
 * tab 8px short of its own longest option, at the exact viewport where the second column first
 * appears. A budget nothing is measured against does not stop that, because the labels were never
 * what was wrong.
 *
 * **Everything below is read out of the source rather than restated**, because a test that repeats
 * the numbers only proves the copy inside it is self-consistent. The classes are parsed from the
 * files that carry them, and every parse throws when it finds nothing — so widening the gutter,
 * moving the page cap, re-spanning a column or re-padding a panel each either recompute the answer
 * or fail loudly, rather than passing on a derivation that has stopped describing the app.
 */

/** Tailwind's spacing scale: `p-5`, `gap-6` and friends are the step in quarter-rems. */
const SPACING_STEP_PX = 4;

/** The root font size every `rem` in the theme resolves against. */
const ROOT_FONT_PX = 16;

/** The stock breakpoint the page's own padding is prefixed with, and the floor for the split. */
const MD_BREAKPOINT_PX = 768;

/** Tailwind's `max-w-*` ladder, in px, over the range a page container plausibly sits in. */
const MAX_WIDTHS_PX: Readonly<Record<string, number>> = {
  '3xl': 768,
  '4xl': 896,
  '5xl': 1024,
  '6xl': 1152,
  '7xl': 1280,
};

/** Tailwind's stock responsive variants, for when the split is prefixed with one of them. */
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
function capture(source: string, pattern: RegExp, what: string): string {
  const value = pattern.exec(source)?.[1];
  if (value === undefined) throw new Error(`could not read ${what} — what it describes has changed`);
  return value;
}

function spacing(step: string): number {
  return Number(step) * SPACING_STEP_PX;
}

const studioTab = read('src/components/tabs/StudioTab.tsx');
const app = read('src/App.tsx');
const css = read('src/index.css');

// The grid: which variant splits it, how many tracks it has, and how wide the gutters are.
const gridClasses = capture(studioTab, /className="grid ([^"]*)"/, "the studio grid's classes");
const splitVariant = capture(
  gridClasses,
  /([a-z][\w-]*):grid-cols-\d+/,
  "the variant the studio's columns engage at",
);
const trackCount = Number(capture(gridClasses, /:grid-cols-(\d+)/, "the grid's track count"));
const gapPx = spacing(capture(gridClasses, /\bgap-(\d+)\b/, "the grid's gutter"));

/**
 * The narrower of the two columns, because both carry a `SelectField` — the form's fifteen and the
 * target-model select — so the even split is what has to clear the minimum, not the form alone.
 *
 * A column left on a different variant lands here as a missing span rather than a wrong number, and
 * `Math.min()` of nothing is `Infinity`, which would sail through the budget assertion. Hence the
 * throw: this is the one input whose absence would pass.
 */
const spans = [...studioTab.matchAll(new RegExp(`${splitVariant}:col-span-(\\d+)`, 'g'))].map((match) =>
  Number(match[1]),
);
if (spans.length !== 2) {
  throw new Error(
    `expected two \`${splitVariant}:col-span-*\` columns in the studio grid, found ${String(spans.length)} — ` +
      'a column on another variant would appear and disappear at a different width from the grid',
  );
}
const narrowestSpan = Math.min(...spans);

// The page container the grid resolves against.
const mainClasses = capture(app, /<main[^>]*className="([^"]*)"/, "the page container's classes");
const capToken = capture(mainClasses, /\bmax-w-([\w-]+)\b/, "the page's width cap");
const pageCapPx = MAX_WIDTHS_PX[capToken];
if (pageCapPx === undefined) throw new Error(`unrecognised page cap \`max-w-${capToken}\``);
const pagePadPx = spacing(capture(mainClasses, /\bmd:p-(\d+)\b/, "the page's padding"));

/**
 * The chrome a panel spends before its controls, taken across every studio panel that holds a
 * select — the widest binds, and today that is the form's two at `p-5` rather than the target
 * model's `p-4`.
 */
const PANEL_FILES = [
  'src/components/studio/SubjectForm.tsx',
  'src/components/studio/OutputConfig.tsx',
  'src/components/studio/TargetModelSelector.tsx',
];
const panelChromePx = Math.max(
  ...PANEL_FILES.map((file) => {
    const classes = capture(read(file), /<section className="([^"]*)"/, `${file}'s panel`);
    const padding = spacing(capture(classes, /\bp-(\d+)\b/, `${file}'s panel padding`));
    return 2 * (padding + (/\bborder\b/.test(classes) ? 1 : 0));
  }),
);

/** Where the split engages: a stock breakpoint, or a `--breakpoint-*` token in the theme. */
const splitWidthPx =
  STOCK_BREAKPOINTS_PX[splitVariant] ??
  Number(
    capture(
      css,
      new RegExp(`--breakpoint-${splitVariant}:\\s*([\\d.]+)rem`),
      `the \`--breakpoint-${splitVariant}\` token`,
    ),
  ) * ROOT_FONT_PX;

/** The width a select in the narrower column is laid out at, for a given viewport. */
function selectWidthAt(viewportPx: number): number {
  const content = Math.min(pageCapPx, viewportPx) - 2 * pagePadPx;
  const track = (content - (trackCount - 1) * gapPx) / trackCount;
  return narrowestSpan * track + (narrowestSpan - 1) * gapPx - panelChromePx;
}

describe('studio column width', () => {
  /** The page padding read above is the `md:` one, which only holds if `md` is already in force. */
  it('splits above the breakpoint whose padding the derivation reads', () => {
    expect(splitWidthPx).toBeGreaterThanOrEqual(MD_BREAKPOINT_PX);
  });

  /**
   * The assertion this file exists for. At the moment the columns appear, each must still render a
   * budgeted option whole — or the split has just created the control that truncates every label
   * the sibling test approved.
   */
  it('gives a select its full budget at the width the columns first appear', () => {
    expect(selectWidthAt(splitWidthPx)).toBeGreaterThanOrEqual(SELECT_MIN_PX);
  });

  /**
   * The sticky column has to appear on the same condition. It is a separate set of classes on a
   * separate element, so nothing but this stops the two drifting apart — and while they disagree
   * there is a band where the columns have stacked but the preview is still capped to the viewport
   * and scrolling inside it.
   */
  it('makes the preview sticky on the same condition as the split', () => {
    expect(capture(studioTab, /([a-z][\w-]*):sticky\b/, 'the sticky preview column')).toBe(splitVariant);
    expect(capture(studioTab, /([a-z][\w-]*):overflow-y-auto\b/, "the preview's scroll cap")).toBe(
      splitVariant,
    );
  });
});
