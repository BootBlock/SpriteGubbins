import { describe, expect, it } from 'vitest';
import { callSitesOf, literalTextPassed, siteName } from './jsxCallSites.ts';

/**
 * Every action button is a `Button`, and no call site restyles one.
 *
 * Before the primitive, each button re-spelled `rounded-lg border border-foundry-600 …` by hand, and
 * about forty copies had drifted apart: four resting fills, three horizontal paddings, and disabled
 * treatments present on some and missing on others (issue #390). `SectionToggleAll` named “the app's
 * established secondary button” by pointing at three other files, which is a primitive that exists
 * only by convention — nothing held a new button to it, so each new one was a fresh chance to drift.
 *
 * **The hand-styled `<button>`s that remain are pinned by file, each with the reason it is not a
 * `Button`.** A new one fails here until it is either a `Button` or has a reason of its own, which is
 * the decision the drift came from nobody having to make. By file rather than by line, so a docblock
 * gaining a line elsewhere in the file does not fail the suite with a diff that says nothing.
 *
 * **A `Button`'s `className` places it and never paints it.** A call site that passes a fill, an
 * edge, padding, a radius, a weight or a text size is a restyled button by another route, so the
 * literal class text of every call site is read and held to that.
 */

/** A `<button>` that is not a `Button`, and why. */
const HAND_STYLED: Readonly<Record<string, { readonly count: number; readonly reason: string }>> = {
  'src/components/common/Button.tsx': { count: 1, reason: 'The primitive itself.' },
  'src/components/common/ComboBox.tsx': {
    count: 1,
    reason: 'The chevron inside the field’s own box, tinted with the open state it toggles.',
  },
  'src/components/common/ComboBoxOption.tsx': {
    count: 1,
    reason: 'One option of a listbox, styled by its highlight and selection.',
  },
  'src/components/common/SegmentedChoice.tsx': {
    count: 1,
    reason: 'One value of a setting, a pill whose tone is its selected and blocked state.',
  },
  'src/components/common/ToastCard.tsx': {
    count: 1,
    reason: 'The dismiss glyph on the toast’s solid accent fill, which inherits the toast’s ink.',
  },
  'src/components/common/Tooltip.tsx': { count: 1, reason: 'The ⓘ trigger of a guidance card.' },
  'src/components/layout/Header.tsx': {
    count: 4,
    reason: 'The chrome’s toolbar set with its lifting glyphs, and Copy Prompt, the one gradient hero.',
  },
  'src/components/layout/TabSwitcher.tsx': { count: 1, reason: 'A tab, styled by the view it selects.' },
  'src/components/modals/SettingsAccentField.tsx': {
    count: 1,
    reason: 'A colour swatch, painted in the accent it offers.',
  },
  'src/components/projects/ProjectList.tsx': {
    count: 1,
    reason: 'A selectable project chip on its own stop of the hue wheel.',
  },
  'src/components/quantise/SpriteLabelOverlay.tsx': {
    count: 1,
    reason: 'A marker drawn over the user’s image, positioned on a sprite.',
  },
  'src/components/studio/GeneratorSiteLink.tsx': {
    count: 1,
    reason: 'The disabled state of a link, sharing the anchor’s budgeted square class string.',
  },
  'src/components/studio/PromptActionButton.tsx': {
    count: 1,
    reason: 'The prompt preview’s toolbar set, which lifts, carries a glyph and keys on aria-disabled.',
  },
  'src/components/studio/PromptActions.tsx': {
    count: 1,
    reason: 'Generate, the view’s hero action with its shimmer.',
  },
  'src/components/studio/SubjectActions.tsx': {
    count: 1,
    reason: 'Randomise, the one gold action, which spins its glyph.',
  },
  'src/components/tabs/PresetCollectionList.tsx': {
    count: 1,
    reason: 'A navigation row in the collection list, styled by whether it is current.',
  },
};

/**
 * A class that paints or sizes a button rather than placing it, after any variant prefix.
 *
 * `text-` is allowed only for alignment and wrapping, `font-` only for the face.
 */
const PAINTING =
  /^(?:bg-|text-(?!left$|center$|right$|nowrap$|wrap$|balance$)|border|rounded|p[xytrbl]?-|font-(?!mono$|sans$)|shadow|ring|opacity-|action-tab$|size-|duration-|transition)/;

describe('the button primitive', () => {
  it('reads every Button, so the class sweep is not empty', () => {
    // A walk that found none — a renamed component, a changed `cwd` — would pass the sweep below
    // while reading nothing.
    expect(callSitesOf('Button').length).toBeGreaterThan(60);
  });

  it('leaves a hand-styled <button> only where the list above gives a reason', () => {
    const counts = new Map<string, number>();
    for (const site of callSitesOf('button')) counts.set(site.file, (counts.get(site.file) ?? 0) + 1);

    const expected = Object.fromEntries(
      Object.entries(HAND_STYLED).map(([file, { count }]) => [file, count]),
    );
    expect(Object.fromEntries(counts)).toStrictEqual(expected);
  });

  it('never lets a call site paint a Button through its className', () => {
    const painted = literalTextPassed('Button', 'className').flatMap(({ site, text }) =>
      text
        .split(/\s+/)
        .filter((word) => PAINTING.test(word.slice(word.lastIndexOf(':') + 1)))
        .map((word) => `${siteName(site)} passes ${word}`),
    );

    expect(painted).toStrictEqual([]);
  });

  it('recognises a painting class, so the sweep can fail', () => {
    // The floor under the pattern: one that stopped matching would leave the sweep vacuously green.
    const paints = (word: string) => PAINTING.test(word.slice(word.lastIndexOf(':') + 1));

    expect(
      ['bg-rose', 'hover:bg-foundry-700', 'px-3', 'text-xs', 'font-bold', 'rounded-xl'].every(paints),
    ).toBe(true);
    expect(
      ['w-full', 'font-mono', 'hover:rotate-90', 'group/load', 'text-left', 'gap-1.5'].some(paints),
    ).toBe(false);
  });
});
