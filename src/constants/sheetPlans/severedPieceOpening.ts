/**
 * The sentence every jointed body's termination opens with: the rule, before the joins it names.
 *
 * **It is the one statement of the rule on a trunk sheet** (issue #402). The termination is its
 * group's `ends`, so section 4's generic boundary paragraph gives way to it — and that group holds the
 * limb segments as well as the trunk on a pose library's first sheet and on the rig, while the joins
 * the termination goes on to name are the trunk's alone. So the opening states what the generic
 * paragraph did for every entry: no piece carries its neighbour past the join. Written once because
 * every jointed body's termination opens with it, and a rule reworded in one of them is a sheet that
 * says less.
 *
 * `noun` is what the pieces are pieces of — `figure`, `animal`, `growth`. The sentence ends at a full
 * stop and a line break, so the termination's first join follows on a line of its own.
 */
export function severedPieceOpening(noun: string): string {
  return `Each of these is a severed, isolated piece of one ${noun} — never the whole ${noun} with the other
parts faded or hidden, and never carrying a neighbouring piece past the join where the two meet.
`;
}
