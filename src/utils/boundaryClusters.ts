/**
 * The positions on one axis where the art's cell boundaries actually sit.
 *
 * The step profile says how much an image changes at every column and row; this reads the columns
 * that changed *far more than chance* as boundary candidates, and merges the candidates a softened
 * ramp spreads across neighbouring positions into one line each. It is the shared first step of two
 * different questions — `boundaryMesh` asks *where the cells are* for a scale already chosen, and
 * `estimateMeshPeriod` asks *what spacing the lines imply* when no integer period fits — and one
 * implementation is what stops the two disagreeing about the same sheet.
 */

/** One detected boundary: where it sits, and how much of the axis's change it carries. */
export interface BoundaryLine {
  readonly position: number;
  readonly mass: number;
}

/**
 * How many times chance a position's change must be before it reads as a boundary.
 *
 * A structureless axis spreads its change evenly, handing every position `total / usable` of it —
 * so a boundary is a position carrying a *multiple* of that, and 2 is the smallest multiple that
 * separates the two populations on the sheets measured: a softened boundary's centre column carries
 * about half its step, which is many times chance on any sheet with real cells, while noise and
 * gradient columns sit at chance by definition. Weak genuine boundaries that fall under it are not
 * lost — the mesh completes a missing line at the expected spacing, which is where a boundary too
 * faint to detect almost certainly is.
 */
export const BOUNDARY_THRESHOLD_OVER_CHANCE = 2;

/**
 * The boundary lines on one axis, ascending.
 *
 * Candidates above the chance threshold that touch — neighbouring positions, which is what a
 * three-tap ramp turns one boundary into — merge into a single line at their mass-weighted centre,
 * so a softened boundary reads as one line where it actually is rather than as two or three a pixel
 * apart. Position 0 is never a candidate: the first pixel has nothing before it to differ from.
 */
export function boundaryClusters(axis: Float64Array): readonly BoundaryLine[] {
  const usable = axis.length - 1;
  if (usable < 1) return [];
  let total = 0;
  for (const step of axis) total += step;
  if (total === 0) return [];
  const threshold = BOUNDARY_THRESHOLD_OVER_CHANCE * (total / usable);

  const lines: BoundaryLine[] = [];
  let clusterMass = 0;
  let clusterMoment = 0;
  let previous = -2;

  const close = () => {
    if (clusterMass > 0) lines.push({ position: Math.round(clusterMoment / clusterMass), mass: clusterMass });
    clusterMass = 0;
    clusterMoment = 0;
  };

  for (let position = 1; position < axis.length; position += 1) {
    const mass = axis[position] ?? 0;
    if (mass <= threshold) continue;
    if (position > previous + 1) close();
    clusterMass += mass;
    clusterMoment += mass * position;
    previous = position;
  }
  close();

  return lines;
}
