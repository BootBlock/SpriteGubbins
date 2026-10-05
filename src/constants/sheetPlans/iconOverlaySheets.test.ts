import { describe, expect, it } from 'vitest';
import { ICON_SET_PRESETS } from '../presets/iconSets.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';
import { parseAdditionalAnatomy } from '../../utils/additionalAnatomy.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { planSlots } from '../../utils/componentSlots.ts';
import { generatePrompt } from '../../utils/promptCompiler.ts';
import { sheetFacts } from '../../utils/promptFacts.ts';
import { planViolations } from '../../utils/sheetPlanValidation.ts';
import { ICON_LOOKS } from '../../types/iconRoster.ts';
import type { SheetPlan } from '../../types/components.ts';
import { ICON_CELL_SENTENCE } from './iconCellSentence.ts';
import { iconOverlaySheets } from './iconOverlaySheets.ts';
import { sheetSeriesFor } from './index.ts';

/** Every line one overlay sheet lists, across its groups. */
function entriesOf(plan: SheetPlan) {
  return plan.groups.flatMap((group) => group.entries);
}

describe('the overlay sheets', () => {
  it.each(ICON_LOOKS)('draws the library alone on one sheet of the icon sheets’ grid under %s', (look) => {
    const [sheet, ...rest] = iconOverlaySheets(look, []);
    expect(rest).toEqual([]);
    expect(sheet.name).toBe('Overlay pieces');
    expect(componentTotal(entriesOf(sheet))).toBe(14);
    expect(sheet.cellGrid).toBe(4);
    expect(sheet.placement).toBe(look === 'FULL_BLEED_TILE' ? 'WITHIN_TILE' : 'WITHIN_CELL');
    expect(sheet.anatomy).toBe('ELSEWHERE');
    expect(sheet.opening).toContain('Fourteen drawings, four across and four down');
    expect(sheet.opening).toContain(ICON_CELL_SENTENCE);
    expect(sheet.opening).toContain('stands where it sits over');
  });

  it('keeps two extra pieces on the one sheet, which then fills its sixteen cells', () => {
    const sheets = iconOverlaySheets('ISOLATED_MARK', parseAdditionalAnatomy('Favourite Star ×2'));
    expect(sheets).toHaveLength(1);
    expect(componentTotal(sheets.flatMap(entriesOf))).toBe(16);
  });

  it('cuts a seventeenth piece onto a second overlay sheet, evenly, each sheet named for what it holds', () => {
    const sheets = iconOverlaySheets(
      'FULL_BLEED_TILE',
      parseAdditionalAnatomy('Favourite Star ×1, Hostile Chevron ×2'),
    );
    expect(sheets.map((sheet) => sheet.name)).toEqual(['Overlay pieces 1–9', 'Overlay pieces 10–17']);
    expect(sheets.map((sheet) => componentTotal(entriesOf(sheet)))).toEqual([9, 8]);
    for (const sheet of sheets) {
      // Every sheet states its own grid and cell, and closes on the lettering ban.
      expect(sheet.opening).toContain(ICON_CELL_SENTENCE);
      expect(sheet.groups.at(-1)?.outro).toContain('No piece carries a letter');
    }
    expect(sheets[1]?.opening).toContain('Eight drawings, four across and two down');
    const yours = sheets[1]?.groups.at(-1);
    expect(yours?.heading).toBe('Extra Overlay Pieces');
    expect(yours?.additional).toBe(true);
    expect(yours?.entries.map((entry) => entry.text)).toEqual(['Favourite Star ×1', 'Hostile Chevron ×2']);
  });

  it('has no cap: forty extra pieces are four sheets', () => {
    const extras = Array.from({ length: 40 }, (_, at) => `Mark ${String(at)} ×1`).join(', ');
    const sheets = iconOverlaySheets('ISOLATED_MARK', parseAdditionalAnatomy(extras));
    expect(sheets).toHaveLength(4);
    expect(componentTotal(sheets.flatMap(entriesOf))).toBe(54);
  });

  it('names a reader’s piece clear of every drawing the library names, on any overlay sheet', () => {
    // The library's ring is on the first sheet and the reader's lands on the second, where a sheet's own
    // numbering would not see it.
    const sheets = iconOverlaySheets(
      'ISOLATED_MARK',
      parseAdditionalAnatomy('Favourite Star ×8, Selected Ring ×1, Tier Mark ×1'),
    );
    expect(sheets).toHaveLength(2);
    const slots = sheets.flatMap((sheet) => planSlots(sheet));
    expect(new Set(slots).size).toBe(slots.length);
    expect(slots).toContain('selected-ring-2');
    // `tier-mark-2` to `tier-mark-4` are the library's own tier marks.
    expect(slots).toContain('tier-mark-5');
  });

  it('labels pieces named in a script with no Latin letters apart, across every overlay sheet', () => {
    const sheets = iconOverlaySheets(
      'ISOLATED_MARK',
      parseAdditionalAnatomy('Favourite Star ×8, 星 ×1, 月 ×1'),
    );
    expect(sheets).toHaveLength(2);
    const slots = sheets.flatMap((sheet) => planSlots(sheet));
    expect(new Set(slots).size).toBe(slots.length);
    expect(slots).toEqual(expect.arrayContaining(['extra-overlay-piece', 'extra-overlay-piece-2']));
    expect(slots).not.toContain('');
  });

  it('lays a piece worth more than a sheet across the fewest sheets, naming its drawings in turn', () => {
    const sheets = iconOverlaySheets('ISOLATED_MARK', parseAdditionalAnatomy('Mark ×99'));
    // Fourteen library pieces and ninety-nine marks are 113 drawings, which eight sheets hold.
    expect(sheets).toHaveLength(8);
    for (const sheet of sheets) expect(componentTotal(entriesOf(sheet))).toBeLessThanOrEqual(16);
    const marks = sheets.flatMap((sheet) => entriesOf(sheet).filter((entry) => entry.label === 'mark'));
    expect(marks.flatMap((entry) => entry.parts ?? [])).toEqual(
      Array.from({ length: 99 }, (_, at) => `mark-${String(at + 1)}`),
    );
    for (const entry of marks) expect(entry.text).toMatch(/^Mark ×\d+: drawings? \d+( to \d+)? of the 99$/);
  });

  it('splits a reader’s piece only where keeping it whole would cost a sheet', () => {
    // Whole, a `Mark ×17` behind the library's fourteen is a third sheet of one drawing.
    const split = iconOverlaySheets('ISOLATED_MARK', parseAdditionalAnatomy('Mark ×17'));
    expect(split.map((sheet) => componentTotal(entriesOf(sheet)))).toEqual([16, 15]);
    expect(
      split
        .flatMap(entriesOf)
        .filter((entry) => entry.label === 'mark')
        .map((entry) => entry.text),
    ).toEqual(['Mark ×2: drawings 1 to 2 of the 17', 'Mark ×15: drawings 3 to 17 of the 17']);
    // Thirty-three drawings need three sheets however they are cut, so every line stays whole.
    const whole = iconOverlaySheets('ISOLATED_MARK', parseAdditionalAnatomy('Mark ×2, Glyph ×16, Rune ×1'));
    expect(
      whole.flatMap(entriesOf).every((entry) => entry.parts === undefined || entry.label !== 'glyph'),
    ).toBe(true);
    expect(whole.map((sheet) => componentTotal(entriesOf(sheet)))).toEqual([16, 16, 1]);
  });

  it('states the first cell on a sheet of one piece, where the Quantise tab reads it', () => {
    const sheets = iconOverlaySheets(
      'FULL_BLEED_TILE',
      parseAdditionalAnatomy('Mark ×2, Glyph ×16, Rune ×1'),
    );
    expect(sheets.at(-1)?.opening?.split('\n')[0]).toBe(
      'One drawing, in the first cell, at the top left of the sheet.',
    );
    expect(sheets.at(-1)?.opening).toContain(ICON_CELL_SENTENCE);
  });

  it('lets a wrapper negate a frame only on a sheet that draws no edge round a square', () => {
    const sheets = iconOverlaySheets('ISOLATED_MARK', parseAdditionalAnatomy('Favourite Star ×20'));
    expect(sheets.map((sheet) => sheet.frames)).toEqual(['DRAWN', undefined, undefined]);
  });

  it('is held to the rule that a place in a cell needs a stated cell', () => {
    const [sheet] = iconOverlaySheets('ISOLATED_MARK', []);
    expect(planViolations('ICON', 'SINGLE_DIRECTION_POSE_LIBRARY', sheet, ['front'])).toEqual([]);
    const { cellGrid: _dropped, ...gridless } = sheet;
    expect(planViolations('ICON', 'SINGLE_DIRECTION_POSE_LIBRARY', gridless, ['front'])).toEqual([
      {
        category: 'ICON',
        mode: 'SINGLE_DIRECTION_POSE_LIBRARY',
        message: 'sheet “Overlay pieces” places its pieces in cells but states no cell grid',
      },
    ]);
  });
});

describe('the overlay sheet’s cells in the compiled prompt', () => {
  it.each(ICON_SET_PRESETS.map((preset) => [preset.id, preset] as const))(
    'states the cell and the exact share on every sheet of %s, for two targets',
    (_id, preset) => {
      for (const targetModel of ['CHATGPT_5_6_SOL', 'MIDJOURNEY'] as const) {
        const output = { ...DEFAULT_OUTPUT_CONFIG, ...preset.output, targetModel };
        const series = sheetSeriesFor('ICON', preset.subject, output.directionalMode, output.directions);
        for (const sheetIndex of series.keys()) {
          const prompt = generatePrompt('ICON', preset.subject, { ...output, sheetIndex });
          expect(prompt).toContain('Each drawing sits in a cell 1/4 of the sheet’s width each way');
          expect(prompt).toMatch(
            /that square occupies exactly \d+% of its cell’s width and height, centred in the cell/,
          );
        }
        const last = generatePrompt('ICON', preset.subject, { ...output, sheetIndex: series.length - 1 });
        expect(last).toContain('Inside its cell, every piece');
      }
    },
  );

  it('draws the overlay sheet at the icon sheets’ native scale', () => {
    const pixel = ICON_SET_PRESETS.find((preset) => preset.output.renderStyle === 'PIXEL_ART');
    if (pixel === undefined) throw new Error('A pixel-art icon set preset is the fixture.');
    const { directionalMode, directions } = pixel.output;
    const { length } = sheetSeriesFor('ICON', pixel.subject, directionalMode, directions);
    const scaleAt = (sheetIndex: number) =>
      sheetFacts('ICON', pixel.subject, { ...DEFAULT_OUTPUT_CONFIG, ...pixel.output, sheetIndex }).sizing
        .nativeScale;
    expect(scaleAt(0)).not.toBeNull();
    expect(scaleAt(length - 1)).toBe(scaleAt(0));
  });

  it('states the same share on the overlay sheet as on the icon sheets under every profile', () => {
    const subject = ICON_SET_PRESETS[0]?.subject;
    if (subject === undefined) throw new Error('An icon set preset is the fixture.');
    const profiles = ['HIGH_RESOLUTION', 'MID_RESOLUTION', 'RETRO_16_BIT', 'CUSTOM'] as const;
    for (const resolutionProfile of profiles) {
      const output = {
        ...DEFAULT_OUTPUT_CONFIG,
        directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY' as const,
        resolutionProfile,
      };
      const { length } = sheetSeriesFor('ICON', subject, output.directionalMode, output.directions);
      const shareOf = (sheetIndex: number) =>
        /exactly (\d+)% of its cell/.exec(generatePrompt('ICON', subject, { ...output, sheetIndex }))?.[1];
      expect(shareOf(0)).toBeDefined();
      expect(shareOf(length - 1)).toBe(shareOf(0));
    }
  });
});
