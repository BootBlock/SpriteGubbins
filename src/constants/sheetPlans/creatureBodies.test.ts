import { describe, expect, it } from 'vitest';
import { DIRECTIONAL_MODES } from '../../types/output.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../categories/index.ts';
import { DIRECTION_LISTS } from '../promptText/camera.ts';
import { planProseFor } from '../../test/categoryProse.ts';
import { CATEGORY_ASSEMBLY_BASES } from './assemblyBases.ts';
import { plansFor } from './modes.ts';

/**
 * Every CREATURE *Anatomy Base*, against the body its own sheets draw (issues #285 and #286).
 *
 * **The defect, written out.** Section 1 carries the base verbatim and every CREATURE sheet drew a head,
 * a body, a hindquarters and a left and right forelimb and hindlimb, so `Serpentine Tailless` stated a
 * limbless animal over four limbs, `Octopus Tentacled` eight tentacles over none, `Finned Aquatic Body`
 * fins over feet, `Rooted Stationary Growth` a stalk over legs, and `Amorphous — No Fixed Limbs` no
 * fixed limb over thirty-four limb variants. The limbed values were the same defect with legs:
 * `Hexapod Insect` six legs over four, `Centipede Multi-Segment` a chain of segments over a
 * hindquarters, `Multi-Headed Hydra Stems` many heads over one and no neck, and both bipeds a forelimb
 * ending in a foot where a hand or a wing belongs.
 *
 * **A record rather than a derivation, for the reason `vehicleDivision.test.ts` keeps one.** Whether a
 * sheet draws the body its base names is a judgement about words — `Tentacle` answers `Octopus
 * Tentacled` and `Left forelimb` does not — so each row is what that base's sheets have to write, and
 * what its own value rules out of them.
 *
 * It reads every sheet the base can be asked for, across every mode and every direction set, so a row
 * is a claim about what a reader is actually sent.
 */

/** One pooled base, with the words its sheets must write and the words its value forbids them. */
interface BaseAudit {
  readonly base: string;
  readonly draws: readonly string[];
  readonly never: readonly string[];
}

/** What a body with no fore and hind limbs may never be handed. */
const FOUR_LIMBED = ['forelimb', 'hindlimb', 'hindquarters', 'upper limb', 'foot or claw'];

const AUDIT: readonly BaseAudit[] = [
  {
    // The standard sheets, which are this base's alone.
    base: 'Quadruped Beast',
    draws: ['left forelimb', 'right hindlimb', 'hindquarters'],
    never: ['tentacle', 'pseudopod', 'segment', 'upper neck', 'clawed hand'],
  },
  {
    base: 'Hexapod Insect',
    // Every leg of the three pairs is drawn, which is why its pose library and articulation split.
    draws: ['thorax', 'left front leg', 'right middle leg', 'left hind leg', 'pose library — hind legs'],
    never: ['forelimb', 'hindlimb', 'hindquarters', 'foot or claw', 'second leg'],
  },
  {
    base: 'Eight-Legged Arachnid',
    draws: ['cephalothorax', 'left front leg', 'right second leg', 'left third leg', 'right hind leg'],
    never: ['forelimb', 'hindlimb', 'hindquarters', 'foot or claw', 'middle leg'],
  },
  {
    base: 'Bipedal Beast',
    // The quadruped's trunk and hindlimb, with a forelimb that ends in a hand rather than a foot.
    draws: ['left forelimb', 'clawed hand', 'two-legged walking gait', 'hindquarters'],
    never: ['spread/grip-ready', 'walking gait with opposing limbs', 'inner wing'],
  },
  {
    base: 'Winged Biped — Avian',
    draws: ['left wing', 'outer wing', 'feet or talons', 'tail fan'],
    never: ['forelimb', 'hindlimb', 'hindquarters', 'foot or claw'],
  },
  {
    base: 'Centipede Multi-Segment',
    // The octopus's answer for the legs: every pair is the same leg, so each side is drawn once.
    draws: ['fore segment', 'every leg on the left side', 'as many mid segments'],
    never: ['forelimb', 'hindlimb', 'hindquarters', 'foot or claw'],
  },
  {
    base: 'Multi-Headed Hydra Stems',
    draws: ['upper neck', 'every one of the necks', 'left forelimb', 'right hindlimb'],
    never: ['tentacle', 'segment', 'clawed hand'],
  },
  {
    base: 'Serpentine Tailless',
    // Tailless is the base's own word: the body closes in a taper, and a tail is the reader's to add.
    draws: ['fore segment', 'tapered end', 'no tail'],
    never: [...FOUR_LIMBED, 'tail end'],
  },
  {
    base: 'Octopus Tentacled',
    draws: ['mantle', 'tentacle', 'every one of the eight tentacles'],
    never: FOUR_LIMBED,
  },
  {
    base: 'Rooted Stationary Growth',
    draws: ['crown', 'root mass', 'lower section'],
    never: [...FOUR_LIMBED, 'gait'],
  },
  {
    base: 'Amorphous — No Fixed Limbs',
    // Nothing on it is fixed and nothing turns about a pivot, so no sheet draws a rig piece.
    draws: ['body masses', 'pseudopods'],
    never: [...FOUR_LIMBED, 'rig pieces', 'segment'],
  },
  {
    base: 'Burrowing Segmented Worm',
    // It crawls by bunching and stretching, which is what sets it apart from the serpent.
    draws: ['fore segment', 'tail end', 'bunched'],
    never: [...FOUR_LIMBED, 'tightly coiled'],
  },
  {
    base: 'Finned Aquatic Body',
    draws: ['left pectoral fin', 'dorsal fin', 'tail fin'],
    never: FOUR_LIMBED,
  },
];

/** Everything a reader choosing this base is sent, in every sheet's own words — see `planProseFor`. */
function drawnTextOf(base: string): string {
  const subject = { ...defaultSubjectFor('CREATURE'), anatomy: base };
  const plans = plansFor('CREATURE', subject);
  return DIRECTIONAL_MODES.flatMap((mode) => {
    const seriesFor = plans[mode];
    if (seriesFor === undefined) return [];
    return Object.values(DIRECTION_LISTS).flatMap((facings) => seriesFor(facings));
  })
    .map(planProseFor)
    .join('\n')
    .toLowerCase();
}

describe('every declared CREATURE base draws the body its own value names', () => {
  it('audits every declared base and the standard one', () => {
    // A declared base with no row is one this audit says nothing about, which is the state the defect
    // was found in — and so is a pooled value neither declared nor the standard sheets' own.
    const bases = AUDIT.map(({ base }) => base);
    expect([...bases].sort()).toEqual(
      ['Quadruped Beast', ...Object.keys(CATEGORY_ASSEMBLY_BASES.CREATURE ?? {})].sort(),
    );
    const pool = CATEGORY_OPTIONS.CREATURE.fields.find((field) => field.key === 'anatomy')?.options ?? [];
    expect([...pool].sort()).toEqual([...bases].sort());
  });

  it.each(AUDIT)('$base', ({ base, draws, never }) => {
    const drawn = drawnTextOf(base);
    for (const phrase of draws) {
      expect(drawn, `${base} draws ${phrase}`).toContain(phrase.toLowerCase());
    }
    for (const phrase of never) {
      expect(drawn, `${base} never draws ${phrase}`).not.toContain(phrase.toLowerCase());
    }
  });
});
