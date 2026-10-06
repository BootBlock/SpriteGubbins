import { median } from './median.ts';
import { repeatedMedianSlope } from './repeatedMedianSlope.ts';

/**
 * Where the squares of one axis of a placement sheet are centred, line by line (a column across, a row
 * down), from the centres measured on the lines that hold a piece drawn to the whole tile.
 *
 * **A line that holds one is its median centre. A line that holds none is read off the line through
 * those**, since a generator lays its squares at one pitch that is rarely the pitch the gaps between
 * cells describe: on the first real overlay sheet the last column held no such piece, and the middles
 * of two of its cells sat sixteen and seventeen pixels left of where their marks were drawn. The pitch is
 * the repeated median slope and the origin the median of what each line leaves over
 * (`repeatedMedianSlope`, as `fitLattice` fits a strip), so one halo drawn off its square cannot move
 * every unmeasured line. With one line measured the pitch is `step`; with none, every line answers
 * `undefined` and the cell's own middle stands. `latticeBoundaries` reads where a boundary no even gap
 * places should fall the same way. Pure.
 */
export function lineCentres(
  measured: ReadonlyMap<number, readonly number[]>,
  step: number,
): (line: number) => number | undefined {
  const known = [...measured].map(([line, at]) => [line, median(at)] as const);
  const own = new Map(known);
  if (known.length === 0) return () => undefined;
  const pitch = known.length === 1 ? step : repeatedMedianSlope(known);
  const origin = median(known.map(([line, at]) => at - line * pitch));
  return (line) => own.get(line) ?? origin + line * pitch;
}
