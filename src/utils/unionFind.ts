/** A disjoint set over `0 .. count - 1`: which group each member is in, and how two are joined. */
export interface DisjointSet {
  /** The group's representative, which is always the **lowest** index in it. */
  find: (index: number) => number;
  /** Put two members in one group. A no-op where they already share one. */
  union: (left: number, right: number) => void;
}

/**
 * Union-find over a fixed number of members, with path compression and the lowest index as root.
 *
 * Two passes in this codebase group boxes by a relation that is *not transitive* — sprites within a
 * colour tolerance of one another, and boxes within a gap of one another — where a chain of three
 * each close to the next has to come back as one group even though its ends are far apart. That is
 * what union-find settles, and both had their own copy of the same eight-line `find`.
 *
 * **The lowest index wins, and that is a property callers rely on rather than an implementation
 * detail.** `duplicateSprites` names each group after its canonical sprite, and the canonical is the
 * earliest of the group in the box list — which `spriteSegments` returns topmost-first. So rooting at
 * the lowest index means a group's root *is* its canonical, with no second pass to find it, and it
 * is a property of the list rather than one re-derived from coordinates, so the two cannot disagree.
 * Union by size would be asymptotically better and is not available here for that reason; the sets
 * are bounded by `SCATTERED_SPRITE_CEILING` at 512 members, where path compression alone is ample.
 *
 * **The connected-component labelling in `spriteSegments` deliberately does not use this**, and
 * should not be made to. It unions by size over `Int32Array`s that double as a sheet needs more
 * labels — millions of them on a fringed sheet — so its roots are chosen for tree depth and its
 * storage for allocation, neither of which this shape can offer. One abstraction covering both would
 * have to give up the lowest-index guarantee above, which is the whole reason its callers need it.
 */
export function disjointSet(count: number): DisjointSet {
  const parent = new Array<number>(count);
  for (let index = 0; index < count; index += 1) parent[index] = index;

  const find = (index: number): number => {
    let root = index;
    while ((parent[root] ?? root) !== root) root = parent[root] ?? root;
    // The compression walk, done separately so the search above stays a plain loop: every member on
    // the path is re-pointed at the root it has just resolved to, which keeps the next search from
    // repeating this one.
    let walk = index;
    while (walk !== root) {
      const above = parent[walk] ?? walk;
      parent[walk] = root;
      walk = above;
    }
    return root;
  };

  const union = (left: number, right: number): void => {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft < rootRight) parent[rootRight] = rootLeft;
    else if (rootRight < rootLeft) parent[rootLeft] = rootRight;
  };

  return { find, union };
}
