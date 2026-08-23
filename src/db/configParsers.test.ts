import { describe, expect, it } from 'vitest';
import { COMPONENT_BUDGET_RANGE, NO_COMPONENT_BUDGET } from '../constants/componentBudget.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { resolveSheetIndex, SHEET_INDEX_RANGE } from '../constants/sheetPlans/index.ts';
import { parseImageConfig, parseOutputConfig } from './configParsers.ts';

/**
 * The component budget crossing the storage boundary.
 *
 * It is the only numeric member of `OutputConfig` that is not bounded by a physical quantity the way
 * the camera's elevation is, and the number is *read back into a comparison the user acts on* — a
 * budget that survives storage as `NaN`, `-1` or `42.7` produces a warning that either never fires
 * or reads "against a budget of 42.7". The guard is deliberately not a compatibility layer: a value
 * that fails its check is dropped for the default, never translated.
 */
function budgetFrom(stored: unknown): number {
  return parseOutputConfig({ componentBudget: stored }).componentBudget;
}

describe('parseOutputConfig — componentBudget', () => {
  it('keeps a whole budget inside the range', () => {
    expect(budgetFrom(20)).toBe(20);
    expect(budgetFrom(COMPONENT_BUDGET_RANGE.min)).toBe(NO_COMPONENT_BUDGET);
    expect(budgetFrom(COMPONENT_BUDGET_RANGE.max)).toBe(COMPONENT_BUDGET_RANGE.max);
  });

  it('drops anything that is not a budget back to the default', () => {
    for (const stored of [
      undefined,
      null,
      '43',
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -1,
      COMPONENT_BUDGET_RANGE.max + 1,
    ]) {
      expect(budgetFrom(stored), `${String(stored)} should not have been accepted`).toBe(
        DEFAULT_OUTPUT_CONFIG.componentBudget,
      );
    }
  });

  it('rejects a fractional budget rather than rounding it', () => {
    // Rounding would be a translation, which this layer does not do. `0.5` is the case that makes
    // it more than tidiness: floored, it becomes `NO_COMPONENT_BUDGET` and the cap silently stops
    // applying at all, which is the least conservative recovery available.
    expect(budgetFrom(42.7)).toBe(DEFAULT_OUTPUT_CONFIG.componentBudget);
    expect(budgetFrom(0.5)).toBe(DEFAULT_OUTPUT_CONFIG.componentBudget);
    expect(budgetFrom(0.5)).not.toBe(NO_COMPONENT_BUDGET);
  });
});

/**
 * The primary facing is the one field whose validity depends on another field's value, so it cannot
 * be checked against a flat union the way every other identifier here is.
 */
describe('parseOutputConfig — primaryDirection', () => {
  it('keeps a facing the stored direction set actually contains', () => {
    expect(parseOutputConfig({ directions: 'EIGHT_COMPASS', primaryDirection: 'north-west' })).toMatchObject({
      directions: 'EIGHT_COMPASS',
      primaryDirection: 'north-west',
    });
  });

  it('drops a facing that set never turns to', () => {
    // `north` is a perfectly good `Direction` and still wrong on a `THREE_CLASSIC` sheet. Accepted,
    // it would name an assembly direction and a depth order the prompt's own "directions required"
    // line does not list.
    expect(
      parseOutputConfig({ directions: 'THREE_CLASSIC', primaryDirection: 'north' }).primaryDirection,
    ).toBeNull();
  });

  it('drops anything that is not a facing at all', () => {
    for (const stored of [undefined, null, 42, 'NORTH', 'sideways']) {
      expect(
        parseOutputConfig({ directions: 'EIGHT_COMPASS', primaryDirection: stored }).primaryDirection,
        `${String(stored)} should not have been accepted`,
      ).toBeNull();
    }
  });

  it('validates against the set as stored, not against the default set', () => {
    // The two fields are read in order for this reason. A corrupt `directions` falls back to the
    // default first, and the facing is then checked against *that* — never against a set the
    // configuration does not have.
    const parsed = parseOutputConfig({ directions: 'nonsense', primaryDirection: 'south-east' });
    expect(parsed.directions).toBe(DEFAULT_OUTPUT_CONFIG.directions);
    expect(parsed.primaryDirection).toBeNull();
  });
});

/**
 * The sheet of the series, which is the *other* field whose validity depends on something outside
 * this function — and, unlike the primary facing, on something outside the configuration entirely.
 *
 * Which indices are real depends on the subject's category, which `parseOutputConfig` is not given,
 * so this layer bounds the value and `sheetPlanFor` resolves it. The division matters: bounding it
 * here to the longest series the plan table holds is what stops a stored `9999` reaching the studio's
 * sheet control, while leaving the per-pairing question to the one place that can answer it.
 */
describe('parseOutputConfig — sheetIndex', () => {
  const sheetFrom = (stored: unknown): number => parseOutputConfig({ sheetIndex: stored }).sheetIndex;

  it('keeps an index the longest series in the table actually holds', () => {
    expect(sheetFrom(0)).toBe(0);
    expect(sheetFrom(SHEET_INDEX_RANGE.max)).toBe(SHEET_INDEX_RANGE.max);
  });

  it('is bounded by the plan table rather than by a number written down here', () => {
    // Derived, so a pairing that grows a sheet admits one in the same edit. Four sheets is the most
    // any pairing takes today — FONT's glyph set, which is four because printable ASCII does not fit
    // one generation — and an index past that is corrupt storage rather than a choice. It moved from
    // three when that category landed, which is the derivation doing its job: the eight-compass
    // character series is still the longest *directional* one.
    expect(SHEET_INDEX_RANGE.min).toBe(0);
    expect(SHEET_INDEX_RANGE.max).toBe(3);
  });

  it('falls back for anything outside that, fractional, or not a number', () => {
    for (const stored of [undefined, null, -1, 1.5, SHEET_INDEX_RANGE.max + 1, 9999, '1', NaN]) {
      expect(sheetFrom(stored), `${String(stored)} should not have been accepted`).toBe(
        DEFAULT_OUTPUT_CONFIG.sheetIndex,
      );
    }
  });

  it('leaves the per-pairing question to the plan table, which is the only place that knows', () => {
    // In range here, and still not a sheet an OBJECT has — its five directional views fit one image.
    // Resolving that here would need the category, and inventing one is how a configuration would be
    // rewritten by the layer that only had to read it.
    expect(sheetFrom(1)).toBe(1);
    expect(resolveSheetIndex('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', 'FIVE_CLASSIC', 1)).toBe(1);
    expect(resolveSheetIndex('OBJECT', 'CORE_DIRECTIONAL_VARIANTS', 'FIVE_CLASSIC', 1)).toBe(0);
  });
});

/**
 * The two parsers differ in exactly one thing, and it is the thing that decides whether a stored
 * preference belongs to the user or to whatever wrote the row.
 *
 * A preset is read with `parseImageConfig`, so a `custom_presets` row that somehow carries the
 * companion outputs cannot deliver them into the studio; a history entry is read whole, because it
 * records the configuration a prompt was actually composed from.
 */
describe('parseImageConfig against parseOutputConfig', () => {
  const STORED = { emitComponentMap: true, emitPromptFeedback: true, renderStyle: 'CEL_SHADED' };

  it('reads the image alone, ignoring stored companion outputs', () => {
    const image = parseImageConfig(STORED);

    expect(image.renderStyle).toBe('CEL_SHADED');
    expect(Object.keys(image)).not.toContain('emitComponentMap');
    expect(Object.keys(image)).not.toContain('emitPromptFeedback');
  });

  it('reads them for a history entry, which is what produced the prompt', () => {
    expect(parseOutputConfig(STORED)).toMatchObject({ emitComponentMap: true, emitPromptFeedback: true });
  });

  it('agrees with the defaults on a payload it cannot read at all', () => {
    // Non-record inputs take no shortcut through the parser: every field falls back on its own, so
    // these are the defaults rather than a second copy of them that could drift.
    for (const stored of [undefined, null, 'not a config', 42]) {
      expect(parseOutputConfig(stored), `${String(stored)} should have defaulted`).toEqual(
        DEFAULT_OUTPUT_CONFIG,
      );
    }
  });
});

describe('parseOutputConfig — the machine and its palette', () => {
  it('keeps a stored machine and palette that still exist', () => {
    const parsed = parseOutputConfig({ hardwareProfile: 'MEGA_DRIVE', palette: 'MEGA_DRIVE' });
    expect(parsed.hardwareProfile).toBe('MEGA_DRIVE');
    expect(parsed.palette).toBe('MEGA_DRIVE');
  });

  it('falls back to no machine and no palette rather than to some other one', () => {
    // The two fields where a *wrong* fallback would be worse than none: a stored `SATURN` becoming
    // `GAME_BOY` would put a hardware contract in the prompt for a machine nobody named. Both
    // defaults add nothing to the prompt, which is the only honest answer to a value this layer
    // cannot vouch for.
    for (const stored of [undefined, null, 42, 'SATURN', 'game_boy', {}]) {
      const parsed = parseOutputConfig({ hardwareProfile: stored, palette: stored });
      expect(parsed.hardwareProfile, `${String(stored)} should not have been accepted`).toBe('NONE');
      expect(parsed.palette, `${String(stored)} should not have been accepted`).toBe('FREE');
    }
  });

  it('keeps a stored art style reference and its naming switch', () => {
    const parsed = parseOutputConfig({ styleReference: 'CELESTE', nameStyleReference: true });
    expect(parsed.styleReference).toBe('CELESTE');
    expect(parsed.nameStyleReference).toBe(true);
  });

  it('falls back to no reference rather than to some other game', () => {
    // The same failure the machine and the palette guard against, one control along: a stored
    // `CHRONO_TRIGGER` becoming `CELESTE` would put another game's measurements into the prompt, and
    // would name that game to any reader who had the switch on. `NONE` adds nothing, which is the
    // only honest answer to a value this layer cannot vouch for.
    for (const stored of ['CHRONO_TRIGGER', 'stardew_valley', 42, null, {}]) {
      const parsed = parseOutputConfig({ styleReference: stored });
      expect(parsed.styleReference, `${String(stored)} should not have been accepted`).toBe('NONE');
    }
  });

  it('reads the naming switch as off unless it is stored as a boolean', () => {
    // Not salvaged from a truthy value: `'true'` is a string somebody hand-edited, and reading it as
    // consent would name a commercial title in a prompt the reader never asked to have it in.
    for (const stored of ['true', 1, 'yes', null]) {
      const parsed = parseOutputConfig({ styleReference: 'CELESTE', nameStyleReference: stored });
      expect(parsed.nameStyleReference, `${String(stored)} should not have been accepted`).toBe(false);
    }
  });

  it('does not require the two to agree, because the user is free to disagree', () => {
    // A machine's geometry with another machine's colours is a legitimate request the studio can
    // express, so storage must round-trip it rather than "correcting" one to match the other.
    const parsed = parseOutputConfig({ hardwareProfile: 'MEGA_DRIVE', palette: 'GAME_BOY_DMG' });
    expect(parsed.hardwareProfile).toBe('MEGA_DRIVE');
    expect(parsed.palette).toBe('GAME_BOY_DMG');
  });
});
