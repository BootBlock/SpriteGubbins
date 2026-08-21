import type { TuneReading } from '../types/autoTune.ts';

/**
 * Which of a stage's candidates to take: the elbow of the trade between fidelity and colour count.
 *
 * **Why an elbow rather than a weighted sum.** The two figures pull opposite ways — a candidate that
 * spends more colours reproduces the crop more closely — so a score of `fidelity − λ × colours`
 * decides the whole feature by the value of `λ`, and there is no measurement anywhere that says what
 * `λ` should be. An elbow needs no such number: it asks where the curve stops paying, which is a
 * property of the candidates themselves.
 *
 * The method is the standard chord construction. Take the Pareto frontier — the candidates no other
 * candidate beats on both counts — normalise it into the unit square so its two ends sit at opposite
 * corners, and choose the point standing furthest above the chord between them. That point is where
 * one more colour starts buying least, which is exactly the "colour-count elbow" the quantiser
 * roadmap named.
 *
 * **Three degenerate shapes fall back to plain fidelity, and each is a real case on this tab.** A
 * frontier of one or two points has no interior for a knee to be in. A frontier whose candidates all
 * spend the same colour count — which is every sheet where the studio's palette budget is in force,
 * since the reduction pins the answer — has no trade to make. And a frontier that curves the other
 * way, where each extra colour buys *more* than the last, has no point of diminishing returns to
 * find: there the right answer is to spend them, which is the highest fidelity.
 *
 * Ties are settled by the earliest candidate, and every ladder in `constants/autoTune.ts` opens at
 * the dial's off or opening position — so a stage that genuinely cannot tell its candidates apart
 * leaves the dial where a reader would have left it, rather than somewhere arbitrary.
 *
 * Takes a non-empty list in the type rather than checking for one, so there is no branch here
 * claiming to handle a case no caller can produce.
 */
export function chooseByElbow(readings: readonly [TuneReading, ...TuneReading[]]): number {
  const frontier = paretoFrontier(readings);
  const first = frontier[0];
  const last = frontier[frontier.length - 1];
  // Neither can be missing: the list is non-empty by its own type, so the frontier holds at least the
  // cheapest candidate. The checks are what `noUncheckedIndexedAccess` asks of an index rather than a
  // case that arises, and answering with the first candidate is the same thing every tie here does.
  if (first === undefined || last === undefined) return 0;
  if (frontier.length < 3) return last.index;

  const colorSpan = last.reading.colors - first.reading.colors;
  const claritySpan = last.reading.fidelity - first.reading.fidelity;
  if (colorSpan <= 0 || claritySpan <= 0) return last.index;

  let knee = -1;
  let above = 0;
  for (const point of frontier) {
    const x = (point.reading.colors - first.reading.colors) / colorSpan;
    const y = (point.reading.fidelity - first.reading.fidelity) / claritySpan;
    // The chord runs corner to corner, so its height at `x` is `x` itself — and `y − x` is how far
    // the point stands above it, up to the constant every perpendicular distance here shares.
    if (y - x > above) {
      above = y - x;
      knee = point.index;
    }
  }

  return knee === -1 ? last.index : knee;
}

/** One frontier member: its reading, and where it sits in the caller's own list. */
interface FrontierPoint {
  readonly index: number;
  readonly reading: TuneReading;
}

/**
 * The candidates nothing else beats on both counts, cheapest first.
 *
 * Sorted by colour count and then by fidelity, so one sweep answers it: a candidate joins the
 * frontier when it is more faithful than everything cheaper. Strictly more, so two candidates that
 * reproduce the crop equally well leave only the cheaper of them — which is the whole point of
 * ranking on both figures at once.
 *
 * The frontier therefore rises as it spends, which is what lets the caller read its last member as
 * the most faithful candidate of the whole set without looking again.
 */
function paretoFrontier(readings: readonly TuneReading[]): readonly FrontierPoint[] {
  const order = readings.map((reading, index) => ({ reading, index }));
  order.sort(
    (a, b) =>
      a.reading.colors - b.reading.colors || b.reading.fidelity - a.reading.fidelity || a.index - b.index,
  );

  const frontier: FrontierPoint[] = [];
  let best = -Infinity;
  for (const entry of order) {
    if (entry.reading.fidelity <= best) continue;
    best = entry.reading.fidelity;
    frontier.push(entry);
  }
  return frontier;
}
