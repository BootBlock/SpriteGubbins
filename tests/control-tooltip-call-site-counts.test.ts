import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { callSitesPassing, callSitesWrappingAttribute, siteName } from './jsxCallSites.ts';

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
 * pinned by file and line as well as by length, so a control swapped for one that cannot be disabled
 * fails here even where the total does not move.
 */

/** Every `<ControlTooltip>` the app renders, counted through the `text` its props type requires. */
const CALL_SITE_COUNT = 79;

/**
 * Where the wrapped control is written with `disabled`, as `file:line`.
 *
 * Every one of them is a `<button>`, and every value is an expression bar `GeneratorSiteLink`’s,
 * which writes the bare attribute. That is why the walk parses rather than matches: a regular
 * expression looking for `disabled=` returns eighteen of these nineteen and reports a figure that is
 * almost right.
 */
const DISABLED_CAPABLE = [
  'src/components/common/HistoryControls.tsx:60',
  'src/components/common/HistoryControls.tsx:66',
  'src/components/common/JsonPackTransfer.tsx:98',
  'src/components/common/JsonPackTransfer.tsx:118',
  'src/components/common/SheetStepButtons.tsx:55',
  'src/components/common/SheetStepButtons.tsx:71',
  'src/components/modals/HistoryFooter.tsx:46',
  'src/components/modals/HistoryFooter.tsx:88',
  'src/components/projects/PresetDetailsForm.tsx:107',
  'src/components/projects/ProjectCreateForm.tsx:74',
  'src/components/projects/ProjectDetailsForm.tsx:104',
  'src/components/quantise/AutoTuneControls.tsx:105',
  'src/components/quantise/DownloadControls.tsx:167',
  'src/components/quantise/PaletteLockControls.tsx:110',
  'src/components/quantise/QuantisePresetControls.tsx:126',
  'src/components/studio/GeneratorSiteLink.tsx:36',
  'src/components/studio/PresetSavePanel.tsx:175',
  'src/components/studio/QuantisedSheetCaptureButton.tsx:86',
  'src/components/tabs/PresetCollectionList.tsx:48',
].sort((left, right) => left.localeCompare(right));

describe('the call-site counts ControlTooltip’s docblock states', () => {
  it(`wraps ${String(CALL_SITE_COUNT)} controls`, () => {
    // Counted through `text`, which the props type requires, so this is every call site rather than
    // every one that happens to pass an optional prop.
    expect(callSitesPassing('ControlTooltip', 'text')).toHaveLength(CALL_SITE_COUNT);
  });

  it(`wraps a control that can be disabled at ${String(DISABLED_CAPABLE.length)} of them`, () => {
    expect(callSitesWrappingAttribute('ControlTooltip', 'disabled').map(siteName)).toEqual(DISABLED_CAPABLE);
  });

  it('states both figures in the prose they are the argument for, here and in CLAUDE.md', () => {
    // The prose is what goes stale, so each figure is read back out of the sentence it belongs to.
    // Both files wrap their prose, and a wrap falls wherever the sentence happens to reach the
    // margin — so the comment leaders and the line breaks come out before the search, or the
    // assertion is really about where the text was last reflowed.
    const flowed = (path: string): string =>
      readFileSync(path, 'utf8')
        .replace(/^\s*(?:\*|\/\/|\/\*\*)/gm, ' ')
        .replace(/\s+/g, ' ');

    const component = flowed('src/components/common/ControlTooltip.tsx');

    expect(component).toContain('There are seventy-nine of those');
    expect(component).toContain('seventy-nine more targets');
    expect(component).toContain('nineteen of these wrap a control that can be disabled');
    expect(component).toContain('two of the nineteen disabled-capable controls');
    expect(flowed('CLAUDE.md')).toContain('seventy-nine of them');
  });
});
