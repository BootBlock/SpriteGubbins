import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { callSitesPassing, callSitesWrappingAttribute } from './jsxCallSites.ts';

/**
 * The call-site counts `ControlTooltip`’s docblock states, re-counted from the components
 * themselves.
 *
 * That docblock argues two things by counting. The first is why an action takes this trigger rather
 * than an ⓘ of its own: an ⓘ apiece would put that many more glyphs into rows that are already full,
 * so the figure is the size of the cost. The second is why the wrapper takes the pointer events off
 * a `disabled` child: a disabled control dispatches none and is out of the tab order, so every card
 * hung off one is unreachable by both routes, and the figure is the size of what that recovers.
 *
 * Both counts had drifted a long way and nothing recomputed either (issue #199): the file said
 * around fifty call sites where there are **79**, and seven disabled-capable ones where there are
 * **19** — with CLAUDE.md repeating the fifty twice in one sentence. Neither argument breaks at the
 * true figure; both get stronger, which is what makes this a live argument on a false premise rather
 * than a stale number beside a live one.
 *
 * This is the treatment `SelectField` was given for the same defect, in #139, and never extended to
 * here. The two suites share one walk — see `jsxCallSites.ts` — because a second answer to "is this
 * a call site" is exactly what this family of defects is made of.
 *
 * **It pins the figures, not the prose.** Whoever makes it fail has to go and restate the two
 * paragraphs and the `className` comment that cites the second; whether the restated argument still
 * holds at the new figure is a judgement no assertion can make. The disabled-capable sites are
 * pinned by **file**, one entry per call site, so a control swapped for one that cannot be disabled
 * fails here even where the total does not move, and so does a file losing or gaining one. By line
 * as well, which this list first carried, every entry in a fifteen-file list moves whenever a
 * docblock in one of them gains a line — and the suite then fails with a diff that says nothing
 * about the property under test. `select-call-site-counts.test.ts` pins by file for the same reason.
 */

/** Every `<ControlTooltip>` the app renders, counted through the `text` its props type requires. */
const CALL_SITE_COUNT = 79;

/**
 * Where the wrapped control is written with `disabled`, by the file that renders each.
 *
 * Every one of them is a `<button>`, and every value is an expression bar `GeneratorSiteLink`’s,
 * which writes the bare attribute. That is why the walk parses rather than matches: a regular
 * expression looking for `disabled=` returns eighteen of these nineteen and reports a figure that is
 * almost right.
 */
const DISABLED_CAPABLE = [
  'src/components/common/HistoryControls.tsx',
  'src/components/common/HistoryControls.tsx',
  'src/components/common/JsonPackTransfer.tsx',
  'src/components/common/JsonPackTransfer.tsx',
  'src/components/common/SheetStepButtons.tsx',
  'src/components/common/SheetStepButtons.tsx',
  'src/components/modals/HistoryFooter.tsx',
  'src/components/modals/HistoryFooter.tsx',
  'src/components/projects/PresetDetailsForm.tsx',
  'src/components/projects/ProjectCreateForm.tsx',
  'src/components/projects/ProjectDetailsForm.tsx',
  'src/components/quantise/AutoTuneControls.tsx',
  'src/components/quantise/DownloadControls.tsx',
  'src/components/quantise/PaletteLockControls.tsx',
  'src/components/quantise/QuantisePresetControls.tsx',
  'src/components/studio/GeneratorSiteLink.tsx',
  'src/components/studio/PresetSavePanel.tsx',
  'src/components/studio/QuantisedSheetCaptureButton.tsx',
  'src/components/tabs/PresetCollectionList.tsx',
];

/**
 * A whole number under a hundred, spelled the way this repository's prose spells one.
 *
 * The house voice writes a figure of this size as words, so an assertion looking for the digits
 * would find nothing — and one looking for a hand-typed “seventy-nine” beside a `79` above is two
 * literals free to part company: the count moves, the first case fails, whoever fixes it edits the
 * constant, and the prose case goes on passing against a sentence that still says the old number.
 * That is this suite reproducing inside itself the drift it exists to stop. Throws rather than
 * guessing past 99, since a count that reaches a hundred wants the sentences re-read anyway.
 */
function inWords(value: number): string {
  const units = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
  ];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if (!Number.isInteger(value) || value < 0 || value > 99) {
    throw new Error(`no spelling for ${String(value)} — extend inWords, and re-read the sentences`);
  }

  const under20 = units[value];
  if (under20 !== undefined) return under20;

  const ten = tens[Math.floor(value / 10)] ?? '';
  const unit = units[value % 10] ?? '';
  return value % 10 === 0 ? ten : `${ten}-${unit}`;
}

describe('the call-site counts ControlTooltip’s docblock states', () => {
  it(`wraps ${String(CALL_SITE_COUNT)} controls`, () => {
    // Counted through `text`, which the props type requires, so this is every call site rather than
    // every one that happens to pass an optional prop.
    expect(callSitesPassing('ControlTooltip', 'text')).toHaveLength(CALL_SITE_COUNT);
  });

  it(`wraps a control that can be disabled at ${String(DISABLED_CAPABLE.length)} of them`, () => {
    expect(callSitesWrappingAttribute('ControlTooltip', 'disabled').map((site) => site.file)).toEqual(
      DISABLED_CAPABLE,
    );
  });

  it('states both figures in the prose they are the argument for', () => {
    // The prose is what goes stale, so each figure is read back out of the sentence it belongs to.
    // The docblock wraps its prose, and a wrap falls wherever the sentence happens to reach the
    // margin — so the comment leaders and the line breaks come out before the search, or the
    // assertion is really about where the text was last reflowed.
    const flowed = (path: string): string =>
      readFileSync(path, 'utf8')
        .replace(/^\s*(?:\*|\/\/|\/\*\*)/gm, ' ')
        .replace(/\s+/g, ' ');

    // Spelled from the constants above rather than written out beside them — see `inWords`.
    const total = inWords(CALL_SITE_COUNT);
    const disabled = inWords(DISABLED_CAPABLE.length);

    const component = flowed('src/components/common/ControlTooltip.tsx');

    expect(component).toContain(`There are ${total} of those`);
    expect(component).toContain(`${total} more targets`);
    expect(component).toContain(`${disabled} of these wrap a control that can be disabled`);
    expect(component).toContain(`two of the ${disabled} disabled-capable controls`);
  });
});
