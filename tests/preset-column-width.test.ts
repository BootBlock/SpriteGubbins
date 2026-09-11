import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sourceText } from '../scripts/sourceFiles.ts';
import { MD_BREAKPOINT_PX, readColumnSplit } from './columnSplit.ts';

/**
 * The preset library's card grid counts its columns off its own box, and both thresholds it switches
 * at have to stay inside the widths the layout gives that box.
 *
 * The grid was on two page breakpoints inside a column that engages at `lg`, which is the failure
 * `split-page-width.test.ts` refuses everywhere (#191). Container queries move the question from how
 * wide the page is to how wide the box is, and that is only an improvement while each threshold is
 * bounded by a width the box really takes. So the widths are derived from the classes that produce
 * them, as the studio's and the quantiser's files derive theirs, and a change to the page gutter, the
 * page cap, the grid or the column span that would push the widest library down to two cards fails
 * here rather than in front of a reader.
 */
const TAB_FILE = 'src/components/tabs/PresetLibrary.tsx';
const PANEL_FILE = 'src/components/tabs/PresetCollectionPanel.tsx';

/** The root font size every `rem` resolves against. */
const ROOT_FONT_PX = 16;

function read(file: string): string {
  return sourceText(resolve(process.cwd(), file));
}

const split = readColumnSplit({ tabFile: TAB_FILE, panelFiles: [PANEL_FILE], columns: 2 });

/** The container width, in px, at which the card grid goes to `columns` across. */
function thresholdFor(columns: number): number {
  const rem = new RegExp(`@\\[([\\d.]+)rem\\]:grid-cols-${String(columns)}\\b`).exec(read(PANEL_FILE))?.[1];
  if (rem === undefined) {
    throw new Error(`could not read the card grid's ${String(columns)}-across container threshold`);
  }
  return Number(rem) * ROOT_FONT_PX;
}

/** How many tracks the column holding the panel spans, read from the element that renders it. */
function panelSpan(): number {
  const span = new RegExp(`${split.variant}:col-span-(\\d+)">\\s*<PresetCollectionPanel\\b`).exec(
    read(TAB_FILE),
  )?.[1];
  if (span === undefined) {
    throw new Error('could not read the span of the column holding the collection panel');
  }
  return Number(span);
}

describe('preset column width', () => {
  /**
   * The derivation measures the box the query container sits in as the column itself, which holds
   * only while nothing between them pads or caps it. `readColumnSplit` reads the panel's own padding;
   * this holds the container to being the next element in, with no classes of its own.
   */
  it('queries a container that is as wide as the column', () => {
    expect(read(PANEL_FILE)).toMatch(/<div className="@container">\s*<ul className="[^"]*\bgrid\b/);
    expect(split.spans).toContain(panelSpan());
  });

  it('keeps the widest column three cards across', () => {
    expect(thresholdFor(3)).toBeLessThanOrEqual(split.contentWidthAt(panelSpan(), Number.POSITIVE_INFINITY));
  });

  /** Two across is what the library has shown at the split's own breakpoint and on a stacked page at `md`. */
  it('keeps the column two across where the split appears, and the stacked page two across from md', () => {
    const wholeGrid = split.spans.reduce((total, span) => total + span, 0);
    expect(thresholdFor(2)).toBeLessThanOrEqual(split.contentWidthAt(panelSpan(), split.splitWidthPx));
    expect(thresholdFor(3)).toBeGreaterThan(split.contentWidthAt(panelSpan(), split.splitWidthPx));
    expect(thresholdFor(2)).toBeLessThanOrEqual(split.contentWidthAt(wholeGrid, MD_BREAKPOINT_PX));
  });
});
