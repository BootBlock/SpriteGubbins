import { describe, expect, it } from 'vitest';
import { sheetPlanFor } from '../constants/sheetPlans/index.ts';
import { standardSubject } from '../test/sheetSubject.ts';
import type { RigContract } from '../types/rigContract.ts';
import { planSlots } from './componentSlots.ts';
import { planMirrorsPieces } from './planMirroring.ts';
import { rigContractPlan } from './rigContractPlan.ts';

/**
 * The rig sheet's inventory taken from the engine's contract.
 *
 * **This is the seam the whole feature turns on**, so what is checked here is that the four things
 * derived from a plan all move together: the prose section 4 prints, the names a sprite pack is cut
 * under, the count the studio holds a budget against, and the reading order that ties the *n*th
 * sprite to the *n*th manifest entry.
 */

const CONTRACT: RigContract = {
  format: 'unsung-saviour-rig-contract',
  version: 1,
  skeleton_name: 'Humanoid',
  frame_size: { width: 48, height: 96 },
  slots: [
    {
      slot_id: 'pelvis',
      pack_piece_name: 'pelvis',
      parent_slot: '',
      piece_size: { width: 20, height: 12 },
      piece_pivot: { x: 10, y: 6 },
      joint_edge: 'bottom',
      rest_position_in_frame: { x: 0, y: -48 },
    },
    {
      slot_id: 'upper_arm_l',
      pack_piece_name: 'left-upper-arm',
      parent_slot: 'torso',
      piece_size: { width: 8, height: 22 },
      piece_pivot: { x: 4, y: 3 },
      joint_edge: 'top',
      rest_position_in_frame: { x: -11, y: -78 },
    },
  ],
};

/** The shipped rig sheet, which is the plan this override is applied to in the app. */
function rigSheet() {
  return sheetPlanFor('CHARACTER', standardSubject(), 'CUTOUT_RIG_SINGLE_DIRECTION', 'EIGHT_COMPASS', 0);
}

describe('rigContractPlan', () => {
  it('draws one component per slot, named exactly as the engine names it', () => {
    // Verbatim, including a spelling this app would not have chosen: `pack_piece_name` is the key
    // the engine's importer looks a returned piece up by, so a tidier name is a piece with no
    // socket — and the hand-maintained mapping straight back. The two names and nothing else, so this
    // is also what fails if the shipped fifteen were kept and the contract's appended to them.
    const plan = rigContractPlan(rigSheet(), CONTRACT);

    expect(planSlots(plan)).toEqual(['pelvis', 'left-upper-arm']);
  });

  it('keeps the contract’s order, which is what fixes the sheet’s reading order', () => {
    const reversed: RigContract = { ...CONTRACT, slots: [...CONTRACT.slots].reverse() };

    expect(planSlots(rigContractPlan(rigSheet(), reversed))).toEqual(['left-upper-arm', 'pelvis']);
  });

  it('leaves everything the contract has no opinion about', () => {
    // The assembly sentence, the scale example and the posing are statements about how a rig sheet
    // is drawn — and the posing is what said this was a rig sheet in the first place.
    const plan = rigSheet();
    const overridden = rigContractPlan(plan, CONTRACT);

    expect(overridden.name).toBe(plan.name);
    expect(overridden.assembly).toBe(plan.assembly);
    expect(overridden.posing).toBe(plan.posing);
    expect(overridden.targetQuantity).toBe(plan.targetQuantity);
  });

  it('keeps the group’s closing prose, which is about rig pieces rather than about these pieces', () => {
    // The shipped rig plan is a single group, which is why keeping the first one's prose keeps all of it.
    const plan = rigSheet();
    const overridden = rigContractPlan(plan, CONTRACT);

    expect(plan.groups[0]?.outro).toBeDefined();
    expect(overridden.groups[0]?.outro).toBe(plan.groups[0]?.outro);
    expect(overridden.extent).toBe(plan.extent);
  });

  it('keeps where each piece ends, which stands in for section 4’s boundary paragraph', () => {
    // The rig sheet states its joins in the trunk's own words, so the compiler drops the generic
    // paragraph; a rebuild that lost them would leave the sheet with neither statement.
    const plan = rigSheet();
    const overridden = rigContractPlan(plan, CONTRACT);

    expect(plan.groups[0]?.ends).toBeDefined();
    expect(overridden.groups[0]?.ends).toBe(plan.groups[0]?.ends);
  });

  it('names the rig in the line above the list', () => {
    const plan = rigContractPlan(rigSheet(), CONTRACT);

    expect(plan.groups[0]?.intro).toContain('Humanoid');
  });

  it('declares the mirror pairs the engine’s own names carry', () => {
    // Section 5 chooses between two mirroring rules on the entries' own declarations, so a rebuilt
    // inventory with none would tell a rig that plainly has sides that no piece may be mirrored at
    // all. Only the right-hand member declares it, as the shipped plans do.
    const sided: RigContract = {
      ...CONTRACT,
      slots: [
        { ...CONTRACT.slots[0]!, pack_piece_name: 'left-upper-arm' },
        { ...CONTRACT.slots[1]!, pack_piece_name: 'right-upper-arm' },
      ],
    };
    const entries = rigContractPlan(rigSheet(), sided).groups[0]?.entries ?? [];

    expect(entries[0]?.mirrors).toBeUndefined();
    expect(entries[1]?.mirrors).toBe('left-upper-arm');
    expect(planMirrorsPieces(rigContractPlan(rigSheet(), sided))).toBe(true);
  });

  it('claims no mirroring for a rig that has no pair', () => {
    // The object and vehicle rigs are exactly this: a housing and a subassembly, or two views of one
    // machine. Declaring a pair there would order a rule about pieces the sheet does not hold.
    expect(planMirrorsPieces(rigContractPlan(rigSheet(), CONTRACT))).toBe(false);
  });

  it('falls back to a plain phrase for a contract that names no rig', () => {
    const plan = rigContractPlan(rigSheet(), { ...CONTRACT, skeleton_name: '' });

    expect(plan.groups[0]?.intro).toContain('the rig declares them');
  });
});
