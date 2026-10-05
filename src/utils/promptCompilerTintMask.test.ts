import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import { sectionOf } from '../test/promptSections.ts';
import { ICON_LOOKS } from '../types/iconRoster.ts';
import type { IconColourMode, IconLook } from '../types/iconRoster.ts';
import { TARGET_MODEL_IDS } from '../types/output.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * A roster's colour mode, compiled (audit finding M1).
 *
 * A tint mask reaches an icon sheet in three places — section 1's statement that every colour is drawn
 * as its lightness in grey, the inventory's sentence about an entry's own colour, and the self-audit —
 * and the key it is drawn on, which is never `PURE_WHITE`, and the palette, which is never pinned. This suite holds them to one answer per
 * sheet: all three on every icon sheet of a masked set under both looks, none on its overlay sheet,
 * whose pieces mark a state rather than a side, and none on a set in full colour.
 */

const OUTPUT: OutputConfig = { ...DEFAULT_OUTPUT_CONFIG, directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY' };
const ICON = defaultSubjectFor('ICON');

/** The overlay sheet's index: the icon sheets open an ICON series, from sheet 0, and it closes it. */
function overlaySheetOf(subject: SubjectDefinition): number {
  return sheetSeriesFor('ICON', subject, OUTPUT.directionalMode, OUTPUT.directions).length - 1;
}

function iconSet(look: IconLook, colourMode: IconColourMode): SubjectDefinition {
  return { ...ICON, icons: { look, colourMode, picks: ICON.icons?.picks ?? [] } };
}

const flat = (text: string): string => text.replaceAll(/\s+/g, ' ');

const SUBJECT_MASK =
  '**Every component is a tint mask**, drawn in neutral greys alone with no hue anywhere in it';
const INVENTORY_MASK = 'drawn as its lightness in grey as section 1 states';
const AUDIT_MASK = 'Every component is drawn in neutral greys alone, with no hue anywhere';

describe('a tint-masked icon set in the compiled prompt', () => {
  it.each(ICON_LOOKS)(
    'turns every %s icon sheet to greys in section 1, the inventory and the audit',
    (look) => {
      const raw = generatePrompt('ICON', iconSet(look, 'TINT_MASK'), { ...OUTPUT, sheetIndex: 0 });
      const prompt = flat(raw);
      expect(prompt).toContain(SUBJECT_MASK);
      expect(prompt).toContain(INVENTORY_MASK);
      expect(prompt).toContain(AUDIT_MASK);
      // Section 1 places it after the colours it turns to values.
      const subject = flat(sectionOf(raw, 'SUBJECT DEFINITION'));
      expect(subject.indexOf('(highlights only)')).toBeLessThan(subject.indexOf(SUBJECT_MASK));
    },
  );

  it.each(ICON_LOOKS)('leaves the %s overlay sheet’s pieces in their colours', (look) => {
    const subject = iconSet(look, 'TINT_MASK');
    const prompt = flat(generatePrompt('ICON', subject, { ...OUTPUT, sheetIndex: overlaySheetOf(subject) }));
    expect(prompt).not.toContain('tint mask');
    expect(prompt).not.toContain('lightness in grey');
  });

  it.each(ICON_LOOKS)('says nothing of greys on a %s set in full colour', (look) => {
    const prompt = flat(generatePrompt('ICON', iconSet(look, 'FULL_COLOUR'), { ...OUTPUT, sheetIndex: 0 }));
    expect(prompt).not.toContain('tint mask');
    expect(prompt).not.toContain('lightness in grey');
    expect(prompt).toContain('A colour an entry names is that icon’s own, and outranks');
  });

  it('draws a mask on the first key it can take, wherever a white one is stored', () => {
    const subject = iconSet('ISOLATED_MARK', 'TINT_MASK');
    const white = { ...OUTPUT, sheetIndex: 0, backgroundKey: 'PURE_WHITE' } as const;
    expect(generatePrompt('ICON', subject, white)).toBe(
      generatePrompt('ICON', subject, { ...white, backgroundKey: 'MAGENTA_FF00FF' }),
    );
    expect(generatePrompt('ICON', iconSet('ISOLATED_MARK', 'FULL_COLOUR'), white)).toContain('#FFFFFF');
  });

  it('draws a mask under FREE, wherever a pinned palette is stored', () => {
    // Section 0, section 2 and the self-audit would otherwise ask a grey mask for the Game Boy's four
    // greens, which hold no grey at all.
    const subject = iconSet('ISOLATED_MARK', 'TINT_MASK');
    const pinned = { ...OUTPUT, sheetIndex: 0, palette: 'GAME_BOY_DMG' } as const;
    expect(generatePrompt('ICON', subject, pinned)).toBe(
      generatePrompt('ICON', subject, { ...pinned, palette: 'FREE' }),
    );
    expect(generatePrompt('ICON', iconSet('ISOLATED_MARK', 'FULL_COLOUR'), pinned)).not.toBe(
      generatePrompt('ICON', iconSet('ISOLATED_MARK', 'FULL_COLOUR'), { ...pinned, palette: 'FREE' }),
    );
  });

  it.each(TARGET_MODEL_IDS)('keeps the mask through the %s wrapper', (targetModel) => {
    const prompt = flat(
      generatePrompt('ICON', iconSet('ISOLATED_MARK', 'TINT_MASK'), {
        ...OUTPUT,
        sheetIndex: 0,
        targetModel,
      }),
    );
    expect(prompt).toContain(SUBJECT_MASK);
  });
});
