import { describe, expect, it } from 'vitest';
import { COMPONENT_BUDGET_RANGE, NO_COMPONENT_BUDGET } from '../constants/componentBudget.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { parseOutputConfig } from './configParsers.ts';

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
