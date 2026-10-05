import { describe, expect, it } from 'vitest';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { ICON_SET_PRESETS } from '../constants/presets/iconSets.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * That a pixel-art icon set is enlarged by one scale on every icon sheet, fitted to the grid each sheet
 * states rather than to the drawings it holds (audit finding T5, `SheetPlan.cells`).
 *
 * Fitted to its drawings, a sheet of two 24 px badges asked for 14× or more — 336 px, wider than the
 * 256 px cell the same prompt fixes — while a full sheet asked for 7×.
 */
const PRESET = ICON_SET_PRESETS.find((preset) => preset.id === 'pixel-status-badge-set');

function scaleFor(ids: readonly string[]): string | undefined {
  if (PRESET === undefined) throw new Error('the pixel status badge set should ship.');
  const subject = { ...PRESET.subject, icons: { ...PRESET.subject.icons!, picks: cataloguePicks(ids) } };
  const prompt = generatePrompt('ICON', subject, { ...PRESET.output, sheetIndex: 0 } as never);
  return /\*\*(\d+)× or more\*\*/.exec(prompt)?.[1];
}

describe('the native-grid scale on an icon sheet', () => {
  it('is the same on a sheet of two as on a full sheet', () => {
    const full = (PRESET?.subject.icons?.picks ?? []).flatMap((pick) =>
      pick.source === 'CATALOGUE' ? [pick.id] : [],
    );
    expect(full.length).toBeGreaterThanOrEqual(2);
    const scale = scaleFor(full.slice(0, 16));
    expect(scale).toBeDefined();
    expect(scaleFor(full.slice(0, 2))).toBe(scale);
    expect(scaleFor(full.slice(0, 1))).toBe(scale);
  });
});
