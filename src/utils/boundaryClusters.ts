import { BOUNDARY_THRESHOLD_OVER_CHANCE } from '../constants/quantiser.ts';

/**
 * The positions on one axis where the art's cell boundaries actually sit.
 *
 * The step profile says how much an image changes at every column and row; this reads the columns
 * that changed *far more than chance* as boundary candidates, and merges the candidates a softened
 * ramp spreads across neighbouring positions into one line each. It is the shared first step of two
 * different questions — `boundaryMesh` asks *where the cells are* for a scale already chosen, and
 * `estimateMeshPeriod` asks *what spacing the lines imply* when no integer period fits — and one
 * implementation is what stops the two disagreeing about the same sheet. The threshold that decides
 * "far more than chance" is `BOUNDARY_THRESHOLD_OVER_CHANCE`, filed with the other calibrated
 * thresholds in `constants/quantiser.ts`.
 */

/** One detected boundary: where it sits, and how much of the axis's change it carries. */
export interface BoundaryLine {
  readonly position: number;
  readonly mass: number;
}

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
