import { describe, expect, it } from 'vitest';
import { MD_BREAKPOINT_PX, readColumnSplit, stickyVariantsOf } from './columnSplit.ts';
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
 * The derivation itself is in `columnSplit.ts`, shared with the quantiser's split. What stays here
 * is the claim that is only true of this tab: **both** columns hold a `SelectField` — the form's
 * fifteen and the target model's one — so the narrower of the two is what has to clear the budget,
 * and an even split is what that produces. The target model's is also the one select in the app that
 * shares its row with a control, so this tab's budget is the label's plus that row's, which is why
 * `--breakpoint-studio` sits 5rem above where the labels alone would put it.
 *
 * Measuring the *narrowest* span is measuring every column, and deliberately only one assertion:
 * `contentWidthAt` grows with the span it is given, so a second loop over all of them could not
 * fail while this one passed. The quantiser's file carries the assertions this tab has no equivalent
 * of — a `max-w-*` wrapper inside the panel, and a container-queried grid in the sticky column.
 */
const TAB_FILE = 'src/components/tabs/StudioTab.tsx';

const split = readColumnSplit({
  tabFile: TAB_FILE,
  panelFiles: [
    'src/components/studio/SubjectForm.tsx',
    'src/components/studio/OutputConfig.tsx',
    'src/components/studio/TargetModelSelector.tsx',
    'src/components/studio/PresetSavePanel.tsx',
  ],
  columns: 2,
});

describe('studio column width', () => {
  /** The page padding the derivation reads is the `md:` one, which only holds if `md` is in force. */
  it('splits above the breakpoint whose padding the derivation reads', () => {
    expect(split.splitWidthPx).toBeGreaterThanOrEqual(MD_BREAKPOINT_PX);
  });

  /**
   * The assertion this file exists for. At the moment the columns appear, each must still render a
   * budgeted option whole — or the split has just created the control that truncates every label
   * the sibling test approved.
   *
   * **The action beside the target-model select is part of the budget, not a decoration on top of
   * it.** That select shares its row with the button that opens the chosen generator's own page, so
   * the control is narrower than its panel by the gutter and the button — 48px off the end of the
   * label, which is where the parenthetical is.
   *
   * **Each panel is measured against its own two terms**, rather than the tab's widest chrome
   * against the tab's only action. Those belong to different panels here — the form's are `p-5` and
   * carry no action, the target model's is `p-4` and carries the only one — so the pair exists in
   * no panel in the tab, and pricing it that way put `--breakpoint-studio` 8px above what anything
   * needs. Eight pixels is a character of the mono advance the budget is built from, and the token
   * says of itself that it is exact rather than cushioned.
   */
  it('gives every panel’s select its full budget beside whatever shares its row', () => {
    const narrowest = Math.min(...split.spans);
    const column = split.columnWidthAt(narrowest, split.splitWidthPx);

    for (const panel of split.panels) {
      expect(column - panel.chromePx, panel.file).toBeGreaterThanOrEqual(SELECT_MIN_PX + panel.actionPx);
    }
  });

  it('makes the preview sticky on the same condition as the split', () => {
    const sticky = stickyVariantsOf(TAB_FILE);
    expect(sticky.sticky).toBe(split.variant);
    expect(sticky.scroll).toBe(split.variant);
  });
});
