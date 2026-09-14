import { describe, expect, it } from 'vitest';
import type { SheetPlan } from '../../types/components.ts';
import { DIRECTIONAL_MODES } from '../../types/output.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../categories/index.ts';
import { DIRECTION_LISTS } from '../promptText/camera.ts';
import { plansFor } from './modes.ts';

/**
 * Every *Drive & Assembly Base* VEHICLE offers, against the drive its own sheets draw (issue #288).
 *
 * **The defect, written out.** Section 1 carries the base verbatim and every VEHICLE sheet drew a
 * near-side drive unit and a far-side one at rest and at mid-travel, so `Rotor-Borne Airframe` stated a
 * rotor over an inventory with no rotor in it, `Two-Wheel Frame & Forks` stated two centreline wheels
 * over a left one and a right one, `Hull With Towed Implement` named an implement nothing drew, and
 * `Single Rigid Hull` said one piece over fifteen. Nothing could catch it, because the plans were a
 * function of the mode and the facings alone and the base reached no part of them.
 *
 * **A record rather than a derivation, for the reason `categoryAssembly.ts` keeps one.** Whether a
 * sheet draws the thing its base names is a judgement about words — `Main rotor or lift fan` answers
 * `Rotor-Borne Airframe` and `Near-side drive unit` does not — and a rule inferring it from the value
 * would pass on any inventory sharing a stem with it. So each row is the audit the issue opened with:
 * what this base's sheets have to draw, and what its own value rules out of them.
 *
 * It reads the *compiled* text of every sheet the base can be asked for, across every mode and every
 * direction set, so a row is a claim about what a reader is actually sent.
 */

/** One pooled base, with the words its sheets must write and the words its value forbids them. */
interface BaseAudit {
  readonly base: string;
  readonly draws: readonly string[];
  readonly never: readonly string[];
}

/** What a side-paired ground base draws, and what naming a hull, wheels or legs rules out. */
const SIDE_PAIRED = {
  draws: ['near-side drive unit', 'far-side drive unit', 'turret, weapon or working mount'],
  never: ['rotor', 'thruster', 'screw or propeller', 'towed implement', 'front wheel'],
} as const;

const AUDIT: readonly BaseAudit[] = [
  {
    base: 'Single Rigid Hull',
    // One piece, so the only pieces are the vehicle: no drive to cut off it, nothing to open, and no
    // cladding drawn apart from what it clads.
    draws: ['the vehicle at rest', 'the vehicle under power', 'vehicles:'],
    never: ['near-side', 'far-side', 'drive unit', 'turret', 'crew hatch', 'cladding', 'drawbar'],
  },
  { base: 'Hull With Rotating Turret', ...SIDE_PAIRED },
  { base: 'Wheeled Chassis & Axles', ...SIDE_PAIRED },
  { base: 'Tracked Chassis & Road Wheels', ...SIDE_PAIRED },
  { base: 'Articulated Walker Legs', ...SIDE_PAIRED },
  {
    base: 'Rotor-Borne Airframe',
    // A rotor turns; it does not travel, and it has no far side to be the other one of.
    draws: ['main rotor or lift fan', 'tail or secondary rotor', 'rotor assembly'],
    never: ['near-side', 'far-side', 'at mid-travel'],
  },
  {
    base: 'Thruster-Borne Airframe',
    // A thruster fires; a pylon extends rather than traverses.
    draws: ['main thruster or engine', 'manoeuvring thruster', 'thruster cluster'],
    never: ['near-side', 'far-side', 'at mid-travel', 'traversed'],
  },
  {
    base: 'Hull With Screw & Rudder',
    draws: ['screw or propeller', 'rudder or steering gear', 'deck gun, crane or working mount'],
    never: ['near-side', 'far-side'],
  },
  { base: 'Half-Track Chassis', ...SIDE_PAIRED },
  {
    base: 'Hull With Towed Implement',
    // The side-paired division and the two pieces its own value names, which nothing drew before.
    draws: ['drawbar or hitch', 'towed implement', 'near-side drive unit'],
    never: ['rotor', 'thruster', 'screw or propeller'],
  },
  {
    base: 'Two-Wheel Frame & Forks',
    // Both wheels on the centreline, and a rider who sits on the frame rather than inside it.
    draws: ['front wheel & forks', 'rear wheel & final drive', 'wheels and forks'],
    never: ['near-side', 'far-side', 'crew hatch', 'canopy', 'turret'],
  },
];

/** Everything a reader choosing this base is sent: each sheet's assembly promise and its inventory. */
function drawnTextOf(base: string): string {
  const subject = { ...defaultSubjectFor('VEHICLE'), anatomy: base };
  const plans = plansFor('VEHICLE', subject);
  const sheets = DIRECTIONAL_MODES.flatMap((mode) => {
    const seriesFor = plans[mode];
    if (seriesFor === undefined) return [];
    return Object.values(DIRECTION_LISTS).flatMap((facings) => seriesFor(facings));
  });

  return sheets
    .flatMap((plan: SheetPlan) => [
      plan.assembly,
      ...plan.groups.flatMap((group) => group.entries.map((entry) => entry.text)),
    ])
    .join('\n')
    .toLowerCase();
}

describe('every VEHICLE base draws the drive its own value names', () => {
  it('audits the whole pool, and nothing the pool does not offer', () => {
    // A row for a renamed value would assert against a base no reader can pick, and a value with no row
    // is one this audit says nothing about — which is the state the defect was found in.
    const pool = CATEGORY_OPTIONS.VEHICLE.fields.find((field) => field.key === 'anatomy')?.options ?? [];
    expect(AUDIT.map(({ base }) => base)).toEqual([...pool]);
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
