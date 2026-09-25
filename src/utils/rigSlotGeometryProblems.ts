import type { JointEdge, RigSize, RigSlot } from '../types/rigContract.ts';

/**
 * Why one slot's geometry cannot be a piece of the figure it claims to belong to, or nothing.
 *
 * **Section 5 states these numbers as the figure's proportions**, so a slot whose numbers describe
 * no figure is a slot the prompt would misdescribe rather than merely quote. A joint below the base
 * would be read out as *above* it, a pivot outside its piece names a joint the art cannot have, and
 * a piece larger than the frame it is a share of sizes the whole native grid from the one piece
 * that cannot fit in it.
 *
 * **The joint edge is held to the writer's own rule.** The writer derives `joint_edge` from the
 * pivot — strictly less than half the height is the top edge, and a pivot dead centre counts as the
 * bottom — so an edge that disagrees is a document edited by hand after export, and the prompt
 * would ask for the joint cap at the end the engine's importer does not register against.
 *
 * `frame` is `null` where the contract states none, which is refused on its own, and the checks
 * that measure against it are then skipped rather than reported a second time.
 */
export function rigSlotGeometryProblems(slot: RigSlot, where: string, frame: RigSize | null): string[] {
  const problems: string[] = [];
  const { width, height } = slot.piece_size;
  const pivot = slot.piece_pivot;
  const joint = slot.rest_position_in_frame;
  const piece = `${String(width)} × ${String(height)} px`;

  if (pivot.x < 0 || pivot.y < 0 || pivot.x > width || pivot.y > height) {
    problems.push(
      `${where} puts its piece_pivot at ${String(pivot.x)}, ${String(pivot.y)}, outside its own ` +
        `${piece} piece.`,
    );
  } else {
    const derived: JointEdge = pivot.y * 2 < height ? 'top' : 'bottom';
    if (slot.joint_edge !== derived) {
      problems.push(
        `${where} says its joint is at the ${slot.joint_edge} edge, but a pivot ` +
          `${String(pivot.y)} px down a ${String(height)} px piece puts it at the ${derived}.`,
      );
    }
  }

  if (joint.y > 0) {
    problems.push(
      `${where} puts its joint ${String(joint.y)} px below the base, which no piece of a figure ` +
        'standing on it reaches.',
    );
  }

  if (frame === null) return problems;
  const whole = `${String(frame.width)} × ${String(frame.height)} px`;

  if (width > frame.width || height > frame.height) {
    problems.push(`${where} declares a ${piece} piece, larger than the ${whole} frame it is a share of.`);
  }
  if (-joint.y > frame.height) {
    problems.push(
      `${where} puts its joint ${String(-joint.y)} px above the base, higher than the ${whole} frame.`,
    );
  }
  if (Math.abs(joint.x) * 2 > frame.width) {
    const side = joint.x < 0 ? 'left' : 'right';
    problems.push(
      `${where} puts its joint ${String(Math.abs(joint.x))} px ${side} of centre, outside the ` +
        `${whole} frame.`,
    );
  }
  return problems;
}
