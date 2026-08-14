import { describe, expect, it } from 'vitest';
import { ACCENT_HUES } from '../../types/settings.ts';
import { accentSwatchGuidance } from '../settings.ts';
import { APP_TAB_CHOICES } from '../ui.ts';
import { CHROME_TOOLTIPS } from './chrome.ts';
import { DIALOG_TOOLTIPS } from './dialogs.ts';
import { HISTORY_ACTION_TOOLTIPS } from './history.ts';
import { PRESET_ACTION_TOOLTIPS, presetCollectionGuidance } from './presets.ts';
import { QUANTISE_ACTION_TOOLTIPS } from './quantise.ts';
import { STUDIO_ACTION_TOOLTIPS } from './studio.ts';

/**
 * Every piece of guidance in the app, gathered under the name a failure should report.
 *
 * The two functions are here as their arguments' worth of entries rather than as one sample: a
 * template with a name substituted into it is exactly the shape that reads fine in the abstract and
 * produces "Shows the built-in presets written for the  category" on the one input nobody tried.
 */
const GUIDANCE: readonly (readonly [string, string])[] = [
  ...records({
    CHROME_TOOLTIPS,
    DIALOG_TOOLTIPS,
    HISTORY_ACTION_TOOLTIPS,
    PRESET_ACTION_TOOLTIPS,
    QUANTISE_ACTION_TOOLTIPS,
    STUDIO_ACTION_TOOLTIPS,
  }),
  ...APP_TAB_CHOICES.map((tab) => [`APP_TAB_CHOICES.${tab.id}`, tab.guidance] as const),
  ...ACCENT_HUES.map((hue) => [`accentSwatchGuidance(${hue})`, accentSwatchGuidance(hue)] as const),
  ['presetCollectionGuidance(built-in)', presetCollectionGuidance('Humanoid Character', false)],
  ['presetCollectionGuidance(custom)', presetCollectionGuidance('Your presets', true)],
];

/** Flattens the records into `NAME.key` pairs, so a failure names the entry rather than a position. */
function records(sets: Record<string, Readonly<Record<string, string>>>): (readonly [string, string])[] {
  return Object.entries(sets).flatMap(([setName, set]) =>
    Object.entries(set).map(([key, text]) => [`${setName}.${key}`, text] as const),
  );
}

/**
 * The shortest a piece of guidance may be and still have said anything.
 *
 * Not a target — several of these are one sentence about a Cancel button, and padding those out
 * would be worse writing, not better guidance. It is a floor against the failure this whole feature
 * exists to fix: a control that carries a tooltip prop filled in with three words, which looks
 * covered from the outside and explains nothing.
 */
const SHORTEST_USEFUL = 60;

describe('control guidance', () => {
  it.each(GUIDANCE)('%s says enough to be worth reading', (_name, text) => {
    expect(text.length).toBeGreaterThanOrEqual(SHORTEST_USEFUL);
  });

  it.each(GUIDANCE)('%s is written as prose', (_name, text) => {
    // A capital and a full stop, because these are sentences shown to strangers rather than labels.
    expect(text).toMatch(/^[A-Z“]/);
    expect(text.endsWith('.')).toBe(true);
    expect(text).not.toMatch(/ {2}/);
    expect(text.trim()).toBe(text);
  });

  it.each(GUIDANCE)('%s uses typographic punctuation', (_name, text) => {
    // The app's copy is set with real apostrophes and quotes throughout; a straight one is the tell
    // that a line was pasted in from somewhere else rather than written here.
    expect(text).not.toContain("'");
    expect(text).not.toContain('"');
  });

  it('never repeats itself', () => {
    // Two controls sharing a sentence is the copy-paste that leaves one of them describing the
    // other — and it is invisible in review, because each call site reads correctly on its own.
    const byText = new Map<string, string[]>();
    for (const [name, text] of GUIDANCE) byText.set(text, [...(byText.get(text) ?? []), name]);

    expect([...byText.values()].filter((names) => names.length > 1)).toEqual([]);
  });
});
