import { describe, expect, it } from 'vitest';
import { parseRigContract, RIG_CONTRACT_FORMAT, RIG_CONTRACT_VERSION } from './parseRigContract.ts';

/**
 * A slot whose numbers describe no figure, refused through the one reader that runs on a dropped
 * file and a stored row alike.
 *
 * **Each case here used to parse with no problems**, and section 5 then read the numbers out as the
 * figure's proportions: a joint below the base as one *above* it, and a 900 px piece in a 48 px
 * frame as the piece the native grid is sized from.
 */

/** A one-slot document, valid as it stands, with `changes` written over its one slot. */
function withSlot(changes: Record<string, unknown>, frame: unknown = { width: 48, height: 96 }) {
  return {
    format: RIG_CONTRACT_FORMAT,
    version: RIG_CONTRACT_VERSION,
    skeleton_name: 'Humanoid',
    frame_size: frame,
    slots: [
      {
        slot_id: 'upper_arm_l',
        pack_piece_name: 'left-upper-arm',
        parent_slot: '',
        piece_size: { width: 8, height: 22 },
        piece_pivot: { x: 4, y: 3 },
        joint_edge: 'top',
        rest_position_in_frame: { x: -11, y: -78 },
        ...changes,
      },
    ],
  };
}

function refusal(changes: Record<string, unknown>): string {
  const { contract, problems } = parseRigContract(withSlot(changes));
  expect(contract).toBeNull();
  return problems.join(' ');
}

describe('rigSlotGeometryProblems, through parseRigContract', () => {
  it('accepts a piece at the frame’s edges, a pivot on its own corner, and a joint on the base', () => {
    const { problems } = parseRigContract(
      withSlot({
        piece_size: { width: 48, height: 96 },
        piece_pivot: { x: 48, y: 96 },
        joint_edge: 'bottom',
        rest_position_in_frame: { x: 24, y: 0 },
      }),
    );

    expect(problems).toEqual([]);
  });

  it('refuses a joint below the base, which section 5 would call one above it', () => {
    expect(refusal({ rest_position_in_frame: { x: 0, y: 20 } })).toContain('20 px below the base');
  });

  it('refuses a joint higher than the frame, or wider of centre than it', () => {
    expect(refusal({ rest_position_in_frame: { x: 0, y: -97 } })).toContain('higher than the 48 × 96');
    expect(refusal({ rest_position_in_frame: { x: -25, y: -78 } })).toContain('25 px left of centre');
  });

  it('refuses a pivot outside its own piece, on either side', () => {
    expect(refusal({ piece_pivot: { x: 500, y: 3 } })).toContain('outside its own 8 × 22 px piece');
    expect(refusal({ piece_pivot: { x: 4, y: -3 } })).toContain('piece_pivot at 4, -3');
  });

  it('refuses a piece larger than the frame it is a share of', () => {
    expect(refusal({ piece_size: { width: 900, height: 10 }, piece_pivot: { x: 4, y: 3 } })).toContain(
      '900 × 10 px piece, larger than the 48 × 96 px frame',
    );
  });

  it('refuses a joint edge the pivot disagrees with, counting dead centre as the bottom', () => {
    // The writer's own rule: strictly less than half the height is the top edge.
    expect(refusal({ joint_edge: 'bottom' })).toContain('puts it at the top');
    expect(refusal({ piece_pivot: { x: 4, y: 11 } })).toContain('puts it at the bottom');
  });

  it('states each problem once, and measures nothing against a frame the contract lacks', () => {
    const { problems } = parseRigContract(
      withSlot({ piece_size: { width: 900, height: 10 }, rest_position_in_frame: { x: 0, y: 20 } }, null),
    );

    expect(problems).toEqual([
      'The contract states no assembled frame, so no piece size is a share of anything.',
      'Slot 1 puts its joint 20 px below the base, which no piece of a figure standing on it reaches.',
    ]);
  });
});
