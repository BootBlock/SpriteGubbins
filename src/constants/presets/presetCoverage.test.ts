import { describe, expect, it } from 'vitest';
import { generatePrompt } from '../../utils/promptCompiler.ts';
import { withCompanionOutputs } from '../../utils/imageConfig.ts';
import { readPromptBudget } from '../../utils/promptBudget.ts';
import {
  ASPECT_RATIOS,
  BACKGROUND_KEYS,
  DIRECTION_SETS,
  DIRECTIONAL_MODES,
  JOINT_CAP_STYLES,
  LIGHTING_MODELS,
  OUTLINE_STYLES,
  OVERLAP_MARGINS,
  PALETTE_LIMITS,
  PROJECTIONS,
  RENDER_STYLES,
  RESOLUTION_PROFILES,
  RIG_MODES,
  SURFACE_DETAILS,
} from '../../types/output.ts';
import type { ImageOutputConfig } from '../../types/output.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import { supportsDirectionSet } from '../categoryDirectionSets.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';
import { DIRECTION_LISTS } from '../promptText/index.ts';
import { supportsMode, supportsRigMode } from '../sheetPlans/index.ts';
import { PRESETS } from './index.ts';

/**
 * The library's coverage contract.
 *
 * The Presets tab is where a first-time user learns what this app can be asked for, and a setting with
 * no preset behind it is effectively undiscoverable: `TRUE_ISOMETRIC` and `CLAY_RENDER` are one line
 * each in a dropdown, and nothing in the interface says which palette, outline or lighting they want
 * alongside them. So the built-ins are required to span the vocabulary — and this is the test that
 * makes adding an option to the studio without demonstrating it a build failure rather than a gap
 * nobody notices for a year.
 *
 * It deliberately does **not** require a preset per `targetModel`. Every other union here is a property
 * of the sheet, and a preset that names one is teaching something about the art; the target is a
 * property of whoever is generating it, and two of the eleven publish prompt budgets this template does
 * not fit inside — so requiring one preset each would mean shipping presets that warn on load by
 * design. The other half of that is checked instead: whatever target a preset *does* name has to be one
 * that will read the prompt the preset compiles to, with enough of the ceiling left unspent for that
 * reading to mean anything — see {@link MAX_BUDGET_SHARE}.
 *
 * **`hardwareProfile` and `palette` are excluded for a different reason**, and it is worth stating
 * rather than leaving as an omission: the argument above turns on a dropdown of bare identifiers
 * teaching nothing about which combinations are coherent, and those two selects are the one place
 * that is not true. Each entry names a real machine, states its own constraints under the control,
 * and *applies* the settings that go with it — the discovery a worked example exists to provide is
 * the control itself. Thirty-seven archetypes to cover eighteen machines and nineteen palettes would
 * demonstrate nothing the user cannot get by opening the list. Their own libraries are held to their
 * own contracts, in `constants/hardware/hardware.test.ts` and `constants/palettes/palettes.test.ts`.
 */

/** The keys whose whole union has to appear somewhere in the library, with that union. */
const COVERED_OPTIONS: readonly (readonly [keyof ImageOutputConfig, readonly string[]])[] = [
  ['renderStyle', RENDER_STYLES],
  ['projection', PROJECTIONS],
  ['directionalMode', DIRECTIONAL_MODES],
  ['directions', DIRECTION_SETS],
  ['surfaceDetail', SURFACE_DETAILS],
  ['resolutionProfile', RESOLUTION_PROFILES],
  ['paletteLimit', PALETTE_LIMITS],
  ['outlineStyle', OUTLINE_STYLES],
  ['lightingModel', LIGHTING_MODELS],
  ['aspectRatio', ASPECT_RATIOS],
  ['backgroundKey', BACKGROUND_KEYS],
  ['rigMode', RIG_MODES],
];

/** The values the library actually uses for one output key. */
function usedValues(key: keyof ImageOutputConfig): ReadonlySet<string> {
  return new Set(PRESETS.map((preset) => String(preset.output[key])));
}

/**
 * How many presets each category needs before its collection is worth browsing.
 *
 * Four rather than one: the tab's whole redesign assumes a collection is a page of cards, and a
 * category holding a single preset would be a list item that opens onto nothing. It is also the floor
 * at which a category can show more than one answer to the same question — one render style, one
 * camera, one sheet mode is not a library, it is an example.
 */
const MINIMUM_PER_CATEGORY = 4;

/**
 * How much of its target's documented ceiling a shipped preset is allowed to actually spend.
 *
 * `used <= limit` is the wrong bar, and the library found both reasons it is. A token reading is the
 * app's ~4-characters-per-token estimate — no tokeniser ships with the app, and every target uses a
 * different one — so a preset landing *on* its ceiling has not been shown to fit anything: the
 * estimate's error is wider than the margin being measured, which is precisely the reading
 * {@link readPromptBudget} disclaims in its own doc comment. And a preset is measured against a
 * template it *shares*, so one with no slack turns the next wording change anywhere in
 * `promptTemplate.ts` into a failure in this file. A §4 rewording with nothing to do with any preset
 * met that against a margin of four estimated tokens: its first draft tripped this test, and the
 * wording that landed had to be measured against the ceiling rather than chosen for the sheet.
 *
 * A fifth of the ceiling answers both: it is wider than the estimate's error against prose this
 * punctuation-dense, and it is room the template can grow into without a preset having to be tuned
 * to the character to stay inside it.
 */
const MAX_BUDGET_SHARE = 0.8;

describe('the built-in library spans the vocabulary', () => {
  it.each(COVERED_OPTIONS)('demonstrates every %s the studio offers', (key, union) => {
    const used = usedValues(key);
    const missing = union.filter((value) => !used.has(value));

    expect(missing, `no shipped preset uses ${key}: ${missing.join(', ')}`).toEqual([]);
  });

  it.each(SUBJECT_CATEGORIES)('gives %s enough presets to be worth opening', (category) => {
    const owned = PRESETS.filter((preset) => preset.category === category);
    expect(owned.length).toBeGreaterThanOrEqual(MINIMUM_PER_CATEGORY);
  });

  it('demonstrates every joint cap and overlap margin on a sheet that is actually rigged', () => {
    // Both only reach the compiled prompt behind `rigMode: CUTOUT_RIG` — section 5 is conditional on
    // it. A `TAPERED` cap on a pose library would satisfy a naive coverage check while teaching
    // nothing, because the prompt it produces never mentions the cap.
    const rigged = PRESETS.filter((preset) => preset.output.rigMode === 'CUTOUT_RIG');
    expect(rigged.length).toBeGreaterThan(0);

    expect(new Set(rigged.map((preset) => preset.output.jointCapStyle))).toEqual(new Set(JOINT_CAP_STYLES));
    expect(new Set(rigged.map((preset) => preset.output.overlapMargin))).toEqual(new Set(OVERLAP_MARGINS));
  });
});

describe('no shipped preset contradicts itself', () => {
  it.each(PRESETS)('$name asks for a sheet its own category can produce', (preset) => {
    // `resolveMode` would silently substitute the category's default, so a mismatch here does not
    // fail — it ships a preset that draws a different sheet from the one it was written for. The
    // library card resolves the mode too, so nothing on screen would report the substitution: this
    // assertion is the only thing that does.
    expect(supportsMode(preset.category, preset.output.directionalMode)).toBe(true);
  });

  it.each(PRESETS)('$name asks for facings its own category can be turned to', (preset) => {
    // `resolveDirectionSet` would silently substitute, exactly as `resolveMode` does above — so a
    // mismatch here does not fail, it ships a preset whose card claims a set the prompt never draws.
    // Every INTERFACE and TERRAIN preset already wrote `SINGLE_FRONT` by hand, which is the
    // workaround this table replaced; this is what keeps the next one from having to know.
    expect(supportsDirectionSet(preset.category, preset.output.directions)).toBe(true);
  });

  it.each(PRESETS)('$name asks for a rig its own category has joints for', (preset) => {
    // The same failure one control down, and it had shipped: `DEFAULT_IMAGE_CONFIG` sets
    // `POSE_LIBRARY`, so a preset that spread it without overriding the rig handed section 5's
    // shared pivots to a building. `resolveRigMode` substitutes silently, which is exactly why the
    // library has to be checked rather than trusted to degrade.
    expect(supportsRigMode(preset.category, preset.output.rigMode)).toBe(true);
  });

  it.each(PRESETS)('$name names a facing its own direction set contains', (preset) => {
    const { primaryDirection, directions } = preset.output;
    if (primaryDirection === null) return;

    expect(DIRECTION_LISTS[directions]).toContain(primaryDirection);
  });

  it.each(PRESETS)('$name compiles to a prompt its own target will actually read', (preset) => {
    // The one invariant the coverage list above cannot express, and the reason it declines to require
    // a preset per target model: Stable Diffusion's documented ceiling is CLIP's 77-token context, and
    // the shortest prompt anything in this library compiles to is over 2,600 tokens — so a preset
    // naming that target ships a card whose only effect on load is a gold notice saying the sheet is
    // at least thirty-four times over budget. A shipped preset is a worked example; an example that
    // arrives already broken for its stated target is not one.
    const reading = readPromptBudget(
      // Compiled the way a reader who has touched nothing else gets it: a preset carries no
      // companion outputs of its own, and both of the studio's default to off.
      generatePrompt(
        preset.category,
        preset.subject,
        withCompanionOutputs(preset.output, DEFAULT_OUTPUT_CONFIG),
      ),
      preset.output.targetModel,
    );
    if (reading === null) return;

    // Multiplied out rather than read off `reading.overBy`, which is this same ratio already: that
    // field guards a `limit` of zero by resolving to 0, and 0 is under every share — so a nonsense
    // budget entry would sail past this assertion instead of failing where someone can read it.
    const allowance = Math.floor(reading.budget.limit * MAX_BUDGET_SHARE);
    expect(
      reading.used,
      `${preset.name} compiles to ${String(reading.used)} ${reading.budget.unit} against ` +
        `${preset.output.targetModel}'s documented ${String(reading.budget.limit)} — past the ` +
        `${String(allowance)} a shipped preset may spend`,
    ).toBeLessThanOrEqual(allowance);
  });

  it.each(PRESETS)('$name gives a CUSTOM resolution something to work to', (preset) => {
    // `CUSTOM` means "work to the target component size". With the size field empty it means nothing
    // at all, and the prompt loses the only statement of scale it had.
    if (preset.output.resolutionProfile !== 'CUSTOM') return;

    expect(preset.output.spriteTargetSize).not.toBe('');
  });
});
