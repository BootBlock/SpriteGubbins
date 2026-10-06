import { median } from './median.ts';

/**
 * Siegel's repeated median slope through `[x, y]` points: per point, the middle of the slopes from it
 * to every other point, and then the middle of those.
 *
 * Half the points have to be wrong before the answer moves, so one stray measurement cannot drag a
 * lattice toward itself as a least-squares line would; and, unlike a walk of the neighbouring gaps,
 * every long baseline is in the vote, which is what recovers a spacing that is not a whole number of
 * pixels. Shared by `fitLattice`, whose frames stand at the slots they were numbered with, and
 * `lineCentres`, whose measured columns or rows stand wherever they were found. Points sharing an
 * `x` give no slope between them, which is how two pieces numbered into one slot count. Pure, and
 * `0` for fewer than two points.
 */
export function repeatedMedianSlope(points: readonly (readonly [number, number])[]): number {
  const slopes = points.flatMap(([x, y], index) => {
    const fromHere = points.flatMap(([otherX, otherY], at) =>
      at === index || otherX === x ? [] : [(otherY - y) / (otherX - x)],
    );
    return fromHere.length === 0 ? [] : [median(fromHere)];
  });
  return slopes.length === 0 ? 0 : median(slopes);
}
