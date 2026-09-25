import { describe, expect, it } from 'vitest';
import type { SheetPlan } from '../../types/components.ts';
import { DIRECTIONAL_MODES } from '../../types/output.ts';
import type { DirectionalMode } from '../../types/output.ts';
import type { DirectionSet } from '../../types/rendering.ts';
import { defaultSubjectFor } from '../categories/index.ts';
import { PRACTICAL_COMPONENT_CEILING } from '../promptText/inventory.ts';
import { sheetSeriesFor } from './index.ts';

/**
 * Each declared CHARACTER body, held to the pieces its *Anatomy Base* names (issue #284).
 *
 * The structural sweeps elsewhere — counts, claims, scale examples, labels, the ceiling — walk every
 * plan table without knowing what any of them is for. This is the half they cannot check: that a base
 * called winged draws wings, and that a base standing on a serpent's body draws no pelvis and no legs,
 * on every mode and at both a single-sheet and a split directional set.
 */

const DIRECTION_SETS: readonly DirectionSet[] = ['FIVE_CLASSIC', 'EIGHT_COMPASS'];

/** Every sheet one base compiles on one mode, across both direction sets. */
function sheetsOf(anatomy: string, mode: DirectionalMode): readonly SheetPlan[] {
  const subject = { ...defaultSubjectFor('CHARACTER'), anatomy };
  return DIRECTION_SETS.flatMap((directions) => sheetSeriesFor('CHARACTER', subject, mode, directions));
}

/** Every component name the base's sheets draw on one mode. */
function partsOf(anatomy: string, mode: DirectionalMode): readonly string[] {
  return sheetsOf(anatomy, mode).flatMap((plan) =>
    plan.groups.flatMap((group) => group.entries.flatMap((entry) => entry.parts ?? [entry.label])),
  );
}

/** Every word of prose the base's sheets write on one mode. */
function proseOf(anatomy: string, mode: DirectionalMode): string {
  return sheetsOf(anatomy, mode)
    .flatMap((plan) => [
      plan.assembly,
      ...plan.groups.flatMap((group) => [
        group.heading ?? '',
        group.intro ?? '',
        group.outro ?? '',
        ...group.entries.map((entry) => entry.text),
      ]),
    ])
    .join('\n');
}

/** The pieces a base names, as patterns one of its component names must match on every mode. */
const DRAWN: readonly (readonly [string, readonly RegExp[]])[] = [
  ['Humanoid With Wings', [/^left-wing/, /^right-wing/]],
  ['Tailed Humanoid', [/^tail/]],
  ['Four-Armed Humanoid', [/^left-second-/, /^right-second-/]],
  ['Quadruped Taur', [/^lower-bod(?:y|ies)/, /^left-upper-foreleg/, /^right-hind-leg-hoof/, /^tail/]],
  ['Centaur Lower Body', [/^lower-bod(?:y|ies)/, /^left-upper-foreleg/, /^right-hind-leg-hoof/, /^tail/]],
  ['Serpent Lower Body', [/^rising-section/, /^middle-section/, /^rear-section/, /^tail-tip/]],
];

describe('a declared CHARACTER body', () => {
  it.each(DRAWN)('draws what “%s” names, on every mode', (anatomy, pieces) => {
    for (const mode of DIRECTIONAL_MODES) {
      const parts = partsOf(anatomy, mode);
      if (parts.length === 0) continue;
      for (const piece of pieces) {
        // The directional core draws the trunk alone, so a limb is found on its articulation run.
        expect(
          parts.some((part) => piece.test(part)),
          `${anatomy} / ${mode} draws nothing matching ${String(piece)}`,
        ).toBe(true);
      }
    }
  });

  it.each(['Quadruped Taur', 'Centaur Lower Body', 'Serpent Lower Body'])(
    '“%s” stands on its own lower body, never a pelvis and two legs',
    (anatomy) => {
      for (const mode of DIRECTIONAL_MODES) {
        const parts = partsOf(anatomy, mode);
        expect(parts.filter((part) => /pelvis|(?:^|-)(?:upper|lower)-leg|(?:^|-)foot/.test(part))).toEqual(
          [],
        );
        expect(proseOf(anatomy, mode)).not.toMatch(/\bpelvis/i);
      }
    },
  );

  it('stands a digitigrade figure on its toes, with no heel to strike', () => {
    for (const mode of DIRECTIONAL_MODES) {
      expect(proseOf('Digitigrade Beastfolk Legs', mode)).not.toMatch(/heel-strike/);
    }
    expect(proseOf('Digitigrade Beastfolk Legs', 'CORE_DIRECTIONAL_VARIANTS')).toMatch(/toe-strike/);
    // The standard figure keeps the heel strike the digitigrade one replaces.
    expect(proseOf('Standard Humanoid', 'CORE_DIRECTIONAL_VARIANTS')).toMatch(/heel-strike/);
  });

  it('tells every trunk it ends where the body’s own limbs join it', () => {
    // The closing sentence names each sort of chain the body has, so a wing or a tail arriving on the
    // torso is a merged component rather than an unmentioned one.
    expect(proseOf('Humanoid With Wings', 'CUTOUT_RIG_SINGLE_DIRECTION')).toContain('Every limb and wing is');
    expect(proseOf('Tailed Humanoid', 'CUTOUT_RIG_SINGLE_DIRECTION')).toContain('Every limb and tail is');
    expect(proseOf('Standard Humanoid', 'CUTOUT_RIG_SINGLE_DIRECTION')).toContain('Every limb is');
  });
});

describe('a body too large for one generation', () => {
  it.each(['Four-Armed Humanoid', 'Quadruped Taur'])(
    '“%s” splits its posed sheets rather than passing the ceiling',
    (anatomy) => {
      const subject = { ...defaultSubjectFor('CHARACTER'), anatomy };
      const poseLibrary = sheetSeriesFor(
        'CHARACTER',
        subject,
        'SINGLE_DIRECTION_POSE_LIBRARY',
        'FIVE_CLASSIC',
      );
      const directional = sheetSeriesFor('CHARACTER', subject, 'CORE_DIRECTIONAL_VARIANTS', 'FIVE_CLASSIC');

      expect(poseLibrary).toHaveLength(2);
      // One core sheet at five facings, then the articulation run in two halves.
      expect(directional).toHaveLength(3);
      for (const plan of [...poseLibrary, ...directional]) {
        const count = plan.groups
          .flatMap((group) => group.entries)
          .reduce((total, entry) => total + entry.count, 0);
        expect(count, plan.name).toBeLessThanOrEqual(PRACTICAL_COMPONENT_CEILING);
      }
      // The trunk is drawn once, on the first pose library sheet, which is the one the subject's
      // additional anatomy lands on.
      const [first, second] = poseLibrary;
      expect(first.groups[0]?.entries[0]?.label).toBe('trunk');
      expect(second?.groups.flatMap((group) => group.entries).some((entry) => entry.label === 'trunk')).toBe(
        false,
      );
    },
  );

  it('keeps each chain whole on one sheet, its left and right sides together', () => {
    const subject = { ...defaultSubjectFor('CHARACTER'), anatomy: 'Four-Armed Humanoid' };
    const runs = sheetSeriesFor('CHARACTER', subject, 'CORE_DIRECTIONAL_VARIANTS', 'FIVE_CLASSIC').slice(1);

    expect(runs.map((plan) => plan.groups.map((group) => group.heading))).toEqual([
      ['Left arm', 'Right arm', 'Left second arm', 'Right second arm'],
      ['Left leg', 'Right leg'],
    ]);
  });
});
