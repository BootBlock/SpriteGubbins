import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scannableSources } from '../scripts/sourceFiles.ts';

/**
 * Every box in the app that scrolls, and whether it is a tab stop the app has named.
 *
 * **Chromium makes a keyboard-scrollable box focusable on its own when nothing inside it is**, so
 * the app does not get to decide whether these are tab stops — only whether they are announced ones.
 * The compiled prompt's `<pre>` was not: one stop out of 123 in the Studio tab, with 15,077px of
 * scroll, no role, no `aria-label` and no `tabindex`, in the middle of the panel that is the app's
 * whole output. The quantiser's two preview panes next door carried all three, which is what showed
 * the app already knew the answer and was not applying it.
 *
 * Nothing under `tests/` checked for that, which is the gap #255 records alongside the defect. This
 * is that check, and it is written as a **source** sweep because the alternative — rendering every
 * component and measuring — cannot work: happy-dom performs no layout, so `scrollHeight` is zero
 * everywhere and no box would ever look like a region at all.
 *
 * The rule it holds: a `className` naming an overflow utility belongs to an element that also
 * spreads a {@link useScrollableRegion} region, **or** to one of the boxes below that hold focusable
 * children. The second is not an exemption from the rule so much as the rule's own condition — a box
 * whose descendants take focus is not made focusable by the engine, and giving it `tabIndex={0}`
 * would add a stop that does nothing.
 */

/** The utilities that make a box scroll, which is what puts it in this suite's scope. */
const OVERFLOW = /(?<![\w-])(?:\w+:)?overflow(?:-[xy])?-(?:auto|scroll)(?![\w-])/;

/** How a call site says it has applied the rule: the props the hook hands back, spread on the box. */
const REGION_SPREAD = /\{\.\.\.\w*[Rr]egion(?:Props)?\}/;

/**
 * The boxes that hold focusable children, with what each of them holds.
 *
 * A count of zero fails, because an exemption list that stops excusing anything has become a hole —
 * the same guard the raw-colour and prose-collision lists carry, and for the same reason.
 */
const HOLDS_FOCUSABLE_CHILDREN: Readonly<Record<string, string>> = {
  'src/components/common/ComboBox.tsx': 'the suggestion list, whose options the field drives by key',
  'src/components/layout/AppOverlays.tsx': 'an overlay panel, which is a dialog full of controls',
  'src/components/modals/PromptHistoryContents.tsx': 'the entry list, three buttons per row',
  'src/components/modals/SheetSplitContents.tsx': 'the run list, a copy button and a disclosure per row',
  'src/components/quantise/QuantiseWorkspace.tsx': 'the sticky control column, ten panels of controls',
  'src/components/tabs/StudioTab.tsx': 'the sticky preview column, the prompt toolbar and its own box',
};

interface Box {
  readonly file: string;
  readonly line: number;
  readonly named: boolean;
}

/**
 * Every element in `src/` whose class string names an overflow utility.
 *
 * The class string and the props are read from the same JSX tag, found by walking back to the `<`
 * that opens it and forward to the `>` that closes it — a `className` and a `{...region}` on one
 * element is the whole of what this has to see, and both are always inside those two characters.
 */
function scrollingBoxes(): readonly Box[] {
  const boxes: Box[] = [];
  for (const path of scannableSources()) {
    const file = relative(process.cwd(), path).split(sep).join('/');
    const source = readFileSync(path, 'utf8');
    // `panelClassName` as well as `className`, because an overlay hands its scrolling panel's class
    // string down to `Modal` — where the element that wears it composes the class at runtime and no
    // source scan could see the overflow at all.
    for (const match of source.matchAll(/\b\w*[Cc]lassName=/g)) {
      const open = source.lastIndexOf('<', match.index);
      if (open === -1) continue;
      const close = source.indexOf('>', match.index);
      if (close === -1) continue;
      const tag = source.slice(open, close);
      if (!OVERFLOW.test(tag)) continue;
      boxes.push({
        file,
        line: source.slice(0, open).split('\n').length,
        named: REGION_SPREAD.test(tag),
      });
    }
  }
  return boxes;
}

describe('a box that scrolls', () => {
  const boxes = scrollingBoxes();

  it('is found at all, so a sweep that stopped matching fails rather than passing', () => {
    // Eleven exist as this is written — four named by the hook, six holding focusable children, and
    // the pan viewport. A regex that stopped matching would empty the sweep and pass it having read
    // no box at all, which is the failure every source sweep in this suite guards against.
    expect(boxes.length).toBeGreaterThan(8);
  });

  it('is either named as a region or holds focusable children', () => {
    const unnamed = boxes
      .filter((box) => !box.named && !(box.file in HOLDS_FOCUSABLE_CHILDREN))
      .map((box) => `${box.file}:${String(box.line)}`);

    expect(unnamed).toStrictEqual([]);
  });

  it('does not claim to hold focusable children when nothing there scrolls any more', () => {
    // An exemption that has stopped excusing anything is a hole, not a permission: it goes on
    // reading as the reason a box needs no name long after that box has gone.
    const scanned = new Set(boxes.map((box) => box.file));
    const stale = Object.keys(HOLDS_FOCUSABLE_CHILDREN).filter((file) => !scanned.has(file));

    expect(stale).toStrictEqual([]);
  });
});
