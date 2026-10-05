import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { ICON_SET_PRESETS } from '../constants/presets/iconSets.ts';
import { ICON_OVERLAY_PLANS } from '../constants/sheetPlans/iconOverlaySheet.ts';
import { renderContractOf, sectionOf } from '../test/promptSections.ts';
import { reachableSheets } from '../test/reachableSheets.ts';
import type { OutputConfig } from '../types/output.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * The overlay sheet's translucent pieces are drawn opaque, and the engine applies their opacity (audit
 * finding P8).
 *
 * It asked for a highlight halo "a glow", a rarity glow "the aura", a dimming veil and a dark cooldown
 * wedge — all translucent in use — on the opaque `PURE_WHITE` key both full-bleed cyberpunk presets
 * use, beside section 0's rule that no part of a component comes near the key. A glow fading into white
 * cannot keep clear of white, and nothing said the engine applies the opacity.
 */

const OPAQUE = 'Every component is drawn opaque at full strength, including one that is translucent in use';
const AUDIT = 'Every component is opaque at full strength — a veil or a wedge one solid shape';

function overlaySheet(output: Partial<OutputConfig> = {}): string {
  const found = ICON_SET_PRESETS.find((candidate) => candidate.id === 'cyberpunk-action-bar-consumables');
  if (found === undefined) throw new Error('No cyberpunk action bar preset.');
  return generatePrompt('ICON', found.subject, {
    ...DEFAULT_OUTPUT_CONFIG,
    ...found.output,
    ...output,
    sheetIndex: 0,
  });
}

describe('the overlay sheet’s opacity', () => {
  it('is declared by the overlay sheet under both looks', () => {
    for (const plan of Object.values(ICON_OVERLAY_PLANS)) expect(plan.opacity).toBe('ENGINE_APPLIED');
  });

  it('asks for every piece opaque on the key, and checks it in the self-audit', () => {
    const prompt = overlaySheet();
    expect(prompt).toContain('flat pure white #FFFFFF');
    const contract = renderContractOf(prompt);
    expect(contract).toContain(OPAQUE);
    expect(contract).toContain('a glow or a halo is two or three stepped bands of solid colour');
    expect(contract).toContain('Every band keeps clear of the key colour');
    expect(sectionOf(prompt, 'LAYOUT AND SELF-AUDIT')).toContain(AUDIT);
  });

  it('allows no partial alpha on a transparent background either', () => {
    const contract = renderContractOf(overlaySheet({ backgroundKey: 'TRANSPARENT' }));
    expect(contract).toContain(OPAQUE);
    expect(contract).toContain('with\n   no partial alpha anywhere');
    expect(contract).not.toContain('Every band keeps clear of the key colour');
  });

  // 30 seconds, as `tests/resolution-profile-fit.test.ts` budgets its own sweep: this compiles every
  // reachable sheet, and can run past the 5,000ms default under full-suite contention.
  it('reaches no sheet that does not declare it', () => {
    for (const { where, category, subject, output, plan } of reachableSheets()) {
      if (plan.opacity === 'ENGINE_APPLIED') continue;
      const prompt = generatePrompt(category, subject, output);
      expect(prompt, where).not.toContain(OPAQUE);
      expect(prompt, where).not.toContain(AUDIT);
    }
  }, 30_000);
});
