import { describe, expect, it, vi } from 'vitest';
import { OVER_BUDGET_EXPLANATION } from './componentBudget.ts';
import { OUTPUT_TOOLTIPS } from './output/tooltips.ts';
import { PALETTE_EXPORT_GUIDANCE } from './paletteExport.ts';
import { PALETTE_EXPORT_TOOLTIPS } from './tooltips/paletteExport.ts';
import { QUANTISE_ACTION_TOOLTIPS } from './tooltips/quantise.ts';
import { STUDIO_ACTION_TOOLTIPS } from './tooltips/studio.ts';

/**
 * That a card stating a figure the app holds as a constant reads it from that constant.
 *
 * Several cards typed the figure out — “256 colours”, “Set `0`”, “around forty” — so a change to the
 * constant would have left each one stating the old figure beside a control that acts on the new
 * one. **Reading the card back against the constant cannot catch that**, because a typed-out figure
 * equals the constant until the day it does not. So each constant is moved here to a figure no card
 * would type, and every card that states it must move with it and stop stating the figure it held.
 *
 * A moved figure has to differ from the real one and appear in no card already: the PNG card's
 * “128 px across” would satisfy a ceiling moved to 128 whatever the card said about the ceiling.
 * Every module that reads a constant sees the moved one, so the cards and the controls still agree
 * with each other, which is the claim under test. The over-budget notice's paragraph is held to
 * the same check, which is why it is kept in `componentBudget.ts` rather than in its markup.
 */
const figures = vi.hoisted(() => ({
  paletteEntries: { moved: 173, real: 0 },
  componentCeiling: { moved: 57, real: 0 },
  noBudget: { moved: -1, real: 0 },
}));

vi.mock('../utils/pngPalette.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/pngPalette.ts')>();
  figures.paletteEntries.real = actual.MAX_PALETTE_ENTRIES;
  return { ...actual, MAX_PALETTE_ENTRIES: figures.paletteEntries.moved };
});

vi.mock('./promptText/inventory.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./promptText/inventory.ts')>();
  figures.componentCeiling.real = actual.PRACTICAL_COMPONENT_CEILING;
  return { ...actual, PRACTICAL_COMPONENT_CEILING: figures.componentCeiling.moved };
});

vi.mock('./componentBudget.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./componentBudget.ts')>();
  figures.noBudget.real = actual.NO_COMPONENT_BUDGET;
  return { ...actual, NO_COMPONENT_BUDGET: figures.noBudget.moved };
});

/** Whether the figure stands alone in the card, rather than as part of a longer number. */
function states(card: string, figure: number): boolean {
  return new RegExp(`(?<![\\d-])${String(figure)}(?!\\d)`).test(card);
}

describe('the palette ceiling in guidance', () => {
  it.each([
    ['reduceCustomPalette', STUDIO_ACTION_TOOLTIPS.reduceCustomPalette],
    ['swatchPng', PALETTE_EXPORT_TOOLTIPS.swatchPng],
    ['the palette export panel', PALETTE_EXPORT_GUIDANCE.available],
    ['downloadAseprite', QUANTISE_ACTION_TOOLTIPS.downloadAseprite],
    ['downloadPNG', QUANTISE_ACTION_TOOLTIPS.downloadPNG],
    ['lockPalette', QUANTISE_ACTION_TOOLTIPS.lockPalette],
  ])('%s reads it from MAX_PALETTE_ENTRIES', (_name, card) => {
    const { moved, real } = figures.paletteEntries;

    expect(states(card, moved)).toBe(true);
    expect(states(card, real)).toBe(false);
  });

  it('states a keyed PNG’s ceiling as one entry short of it', () => {
    const { moved, real } = figures.paletteEntries;

    expect(states(QUANTISE_ACTION_TOOLTIPS.downloadPNG, moved - 1)).toBe(true);
    expect(states(QUANTISE_ACTION_TOOLTIPS.downloadPNG, real - 1)).toBe(false);
  });
});

describe('the component budget guidance', () => {
  it.each([
    ['componentBudget', OUTPUT_TOOLTIPS.componentBudget],
    ['the over-budget notice', OVER_BUDGET_EXPLANATION],
  ])('%s reads the practical ceiling from PRACTICAL_COMPONENT_CEILING', (_name, text) => {
    const { moved, real } = figures.componentCeiling;

    expect(states(text, moved)).toBe(true);
    expect(states(text, real)).toBe(false);
  });

  it('reads the no-cap value from NO_COMPONENT_BUDGET', () => {
    const { moved, real } = figures.noBudget;

    expect(OUTPUT_TOOLTIPS.componentBudget).toContain(`\`${String(moved)}\``);
    expect(OUTPUT_TOOLTIPS.componentBudget).not.toContain(`\`${String(real)}\``);
  });
});
