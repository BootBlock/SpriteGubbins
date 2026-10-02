import { describe, expect, it } from 'vitest';
import { backdropSeries } from '../../test/backdropSeries.ts';
import { DAMAGE_SCHOOLS, LOOK_FAMILIES } from '../../types/iconCatalogue.ts';
import type { Rgba } from '../../types/quantiser.ts';
import { fromHex } from '../../utils/imageData.ts';
import { keyReaches } from '../../utils/keyReach.ts';
import { srgbToOklab } from '../../utils/oklab.ts';
import { pixelDistance } from '../../utils/pixelDistance.ts';
import { BACKGROUND_KEY_COLORS } from '../backgroundKeyColors.ts';
import { DAMAGE_SCHOOL_DEFINITIONS } from './damageSchools.ts';

/**
 * The damage schools' colours against the background keys and against each other (R15 of
 * `docs/todo/icon-catalogue.md`).
 *
 * **Against every key a set can take, not one preset's.** A spell can be ticked into any set, under any
 * key, isolated or full-bleed, so its school colour is held out of reach of every key that names a
 * colour, and along the whole backdrop series a full-bleed square paints from it — the series the
 * presets' keys are measured along too. The transparent key has no colour to reach anything.
 *
 * **And against each other, by the OKLab distance the Quantise tab measures with** (`pixelDistance`).
 * Two schools closer than {@link MIN_SCHOOL_SEPARATION} would be one colour to a player at action-bar
 * size, and the school's colour is the whole of how a player tells the schools apart at a glance. The
 * last check shows the first proposal's kinetic and cryo failing it, so the measurement is known to
 * bite.
 */

/**
 * The least OKLab distance any two school colours keep, on the scaled axes `pixelDistance` reads
 * (0–255 from black to white).
 *
 * Forty on these axes is 0.157 in unscaled OKLab, close to eight times the 0.02 that CSS Color 4 takes
 * as OKLab's just-noticeable difference (the JND its gamut mapping uses, 5.1 here). A school colour
 * is never seen flat: it is shaded into a backdrop, washed into a highlight and averaged down to a
 * 32 px slot, and each of those moves a pixel by more than one just-noticeable step, so two schools
 * need a margin of several steps to stay two colours after it. The first proposal's two closest pairs
 * sat 24 and 28 apart, under five steps each, and the eight colours now keep at least 40.
 */
const MIN_SCHOOL_SEPARATION = 40;

function colourOf(hex: string): Rgba {
  const colour = fromHex(hex);
  if (colour === null) throw new Error(`${hex} is not a colour`);
  return colour;
}

function separation(left: string, right: string): number {
  const a = colourOf(left);
  const b = colourOf(right);
  return pixelDistance(srgbToOklab(a.r, a.g, a.b), a.a, srgbToOklab(b.r, b.g, b.b), b.a);
}

const KEYS = Object.entries(BACKGROUND_KEY_COLORS).flatMap(([name, key]) =>
  key === null ? [] : [[name, key] as const],
);

describe('the damage schools', () => {
  it.each(DAMAGE_SCHOOLS)(
    '%s names a six-digit colour, a colour word and a name in every family',
    (school) => {
      const { label, names, colourName, hex } = DAMAGE_SCHOOL_DEFINITIONS[school];
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(label).toMatch(/^[A-Z][a-z]+$/);
      // Said in the prompt beside the hex, which outranks the set's own colours for the icon.
      expect(colourName).toMatch(/^[a-z]+(?: [a-z]+)?$/);
      expect(colourName).not.toMatch(/magenta/i);
      for (const family of LOOK_FAMILIES) expect(names[family]).toMatch(/^[a-z][a-z-]*$/);
      // The cyberpunk name is the catalogue's own, which the shelves and a typed world's fallback use.
      expect(names.CYBERPUNK).toBe(label.toLowerCase());
    },
  );

  it('measures against every key that names a colour', () => {
    expect(KEYS.map(([name]) => name).sort()).toEqual(['MAGENTA_FF00FF', 'PURE_BLACK', 'PURE_WHITE']);
  });

  it.each(DAMAGE_SCHOOLS)(
    '%s stays out of every key’s reach, shaded and washed as a backdrop is',
    (school) => {
      const colour = colourOf(DAMAGE_SCHOOL_DEFINITIONS[school].hex);
      for (const [name, key] of KEYS) {
        for (const step of backdropSeries(colour)) {
          expect(keyReaches(key, step), `${school} at ${JSON.stringify(step)} under ${name}`).toBe(false);
        }
      }
    },
  );

  it('keeps every pair of schools apart', () => {
    for (const [at, left] of DAMAGE_SCHOOLS.entries()) {
      for (const right of DAMAGE_SCHOOLS.slice(at + 1)) {
        const gap = separation(DAMAGE_SCHOOL_DEFINITIONS[left].hex, DAMAGE_SCHOOL_DEFINITIONS[right].hex);
        expect(gap, `${left} and ${right}`).toBeGreaterThanOrEqual(MIN_SCHOOL_SEPARATION);
      }
    }
  });

  it('bites on the first proposal’s pale kinetic and pale cryo', () => {
    // Slate and sky blue: the pair the separation turned away.
    expect(separation('#CBD5E1', '#7DD3FC')).toBeLessThan(MIN_SCHOOL_SEPARATION);
  });
});
